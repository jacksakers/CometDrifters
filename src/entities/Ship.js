import * as C from '../config/constants.js';

/**
 * Ship Entity - Player-controlled ship with zero-g physics
 * Handles thrust, rotation, fuel management, and docking
 */
export default class Ship {
    constructor(scene, x, y) {
        this.scene = scene;
        
        console.log('[Ship] Creating ship at:', { x, y });
        
        // Create ship body with Matter.js
        this.body = scene.matter.add.circle(x, y, C.SHIP_SIZE, {
            friction: C.SHIP_FRICTION,
            frictionAir: C.SHIP_FRICTIONAIR,
            restitution: C.SHIP_RESTITUTION,
            mass: C.SHIP_MASS,
            collisionFilter: {
                category: C.COLLISION_CATEGORIES.SHIP,
                mask: C.COLLISION_CATEGORIES.COMET
            }
        });
        
        console.log('[Ship] Ship body created:', this.body.position);
        
        // Create visual graphics
        this.graphics = scene.add.graphics();
        
        // Ship state
        this.fuel = C.SHIP_START_FUEL;
        this.isDocked = false;
        this.dockedComet = null;
        this.alive = true;
        
        // Thrust particles trail (Phaser 3.60+ API)
        this.thrustEmitter = null; // Will be created when needed
    }
    
    /**
     * Apply thrust in the direction the ship is facing
     * Consumes fuel and applies force to the Matter.js body
     */
    thrust(inputState) {
        if (!this.alive || this.isDocked) return;
        
        if (inputState.thrust && this.fuel > 0) {
            const angle = this.body.angle;
            const force = {
                x: Math.cos(angle) * C.SHIP_THRUST_FORCE,
                y: Math.sin(angle) * C.SHIP_THRUST_FORCE
            };
            
            this.scene.matter.applyForce(this.body, force);
            this.fuel = Math.max(0, this.fuel - C.SHIP_FUEL_CONSUMPTION);
            
            // Create thrust particles (Phaser 3.60+ API)
            if (Math.random() < 0.3) { // Emit occasionally
                const emitter = this.scene.add.particles(this.body.position.x, this.body.position.y, 'particle', {
                    speed: { min: 50, max: 150 },
                    angle: { min: Phaser.Math.RadToDeg(angle) + 160, max: Phaser.Math.RadToDeg(angle) + 200 },
                    scale: { start: 0.4, end: 0 },
                    blendMode: 'ADD',
                    lifespan: 300,
                    quantity: 2,
                    tint: 0xf9cb28
                });
                // Stop and destroy the emitter after particles are emitted
                this.scene.time.delayedCall(350, () => {
                    emitter.destroy();
                });
            }
            
            return true; // Was thrusting
        }
        
        return false; // Not thrusting
    }
    
    /**
     * Rotate ship left or right
     * Uses "snappy" rotation (not physics-based) for easier control
     */
    rotate(inputState) {
        if (!this.alive) return;
        
        if (inputState.rotateLeft) {
            this.scene.matter.body.setAngle(
                this.body, 
                this.body.angle - C.SHIP_ROTATION_SPEED
            );
        }
        
        if (inputState.rotateRight) {
            this.scene.matter.body.setAngle(
                this.body, 
                this.body.angle + C.SHIP_ROTATION_SPEED
            );
        }
    }
    
    /**
     * Enforce maximum velocity cap
     */
    limitVelocity() {
        if (!this.alive) return;
        
        const velocity = this.body.velocity;
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        
        if (speed > C.SHIP_MAX_VELOCITY) {
            const scale = C.SHIP_MAX_VELOCITY / speed;
            this.scene.matter.body.setVelocity(this.body, {
                x: velocity.x * scale,
                y: velocity.y * scale
            });
        }
    }
    
    /**
     * Attempt to dock with a nearby comet
     * Auto-rotates ship to face outward from comet surface
     */
    attemptDock(inputState, comets) {
        if (!this.alive || this.isDocked) return;
        
        // Check if close enough to any comet and moving slow enough
        for (let comet of comets) {
            const dx = comet.body.position.x - this.body.position.x;
            const dy = comet.body.position.y - this.body.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Get relative velocity
            const relVelX = this.body.velocity.x - comet.body.velocity.x;
            const relVelY = this.body.velocity.y - comet.body.velocity.y;
            const relSpeed = Math.sqrt(relVelX * relVelX + relVelY * relVelY);
            
            // Calculate if in docking range
            const inDockRange = distance < C.DOCK_DISTANCE + comet.radius;
            const slowEnough = relSpeed < C.DOCK_MAX_VELOCITY;
            const verySlowForAutoDock = relSpeed < C.AUTO_DOCK_VELOCITY;
            
            // Auto-dock if very slow and close, or manual dock with button
            if (inDockRange && slowEnough && (inputState.dock || verySlowForAutoDock)) {
                // Rotate ship to face away from comet center (outward landing)
                const angleToComet = Math.atan2(dy, dx);
                const landingAngle = angleToComet + Math.PI; // Face outward
                this.scene.matter.body.setAngle(this.body, landingAngle);
                
                this.dock(comet);
                return;
            }
        }
    }
    
    /**
     * Dock to a comet (lock position relative to comet)
     * Maintains orientation facing away from comet
     */
    dock(comet) {
        this.isDocked = true;
        this.dockedComet = comet;
        
        // Match comet velocity
        this.scene.matter.body.setVelocity(this.body, {
            x: comet.body.velocity.x,
            y: comet.body.velocity.y
        });
        
        // Store offset from comet center and angle
        this.dockOffsetX = this.body.position.x - comet.body.position.x;
        this.dockOffsetY = this.body.position.y - comet.body.position.y;
        this.dockAngleOffset = this.body.angle - Math.atan2(this.dockOffsetY, this.dockOffsetX);
        
        // Rotate ship to face outward from comet center
        const angleToCenter = Math.atan2(
            comet.body.position.y - this.body.position.y,
            comet.body.position.x - this.body.position.x
        );
        // Face opposite direction (outward)
        const outwardAngle = angleToCenter + Math.PI;
        this.scene.matter.body.setAngle(this.body, outwardAngle);
    }
    
    /**
     * Undock from comet
     */
    undock() {
        if (!this.isDocked) return;
        
        // Inherit comet's velocity plus a small push
        const pushAngle = this.body.angle;
        this.scene.matter.body.setVelocity(this.body, {
            x: this.dockedComet.body.velocity.x + Math.cos(pushAngle) * 2,
            y: this.dockedComet.body.velocity.y + Math.sin(pushAngle) * 2
        });
        
        this.isDocked = false;
        this.dockedComet = null;
    }
    
    /**
     * Maintain docked position and orientation
     */
    updateDocking() {
        if (this.isDocked && this.dockedComet) {
            // Keep ship at fixed offset from comet
            const targetX = this.dockedComet.body.position.x + this.dockOffsetX;
            const targetY = this.dockedComet.body.position.y + this.dockOffsetY;
            
            this.scene.matter.body.setPosition(this.body, { x: targetX, y: targetY });
            this.scene.matter.body.setVelocity(this.body, this.dockedComet.body.velocity);
            
            // Maintain orientation facing outward from comet center
            // dockOffsetX/Y is already the vector from comet to ship (outward)
            const angleToCenter = Math.atan2(this.dockOffsetY, this.dockOffsetX);
            this.scene.matter.body.setAngle(this.body, angleToCenter);
            
            // Refuel while docked
            this.fuel = Math.min(C.SHIP_MAX_FUEL, this.fuel + C.SHIP_FUEL_REGEN_RATE);
        }
    }
    
    /**
     * Main update loop
     */
    update(inputState, comets) {
        if (!this.alive) return;
        
        // Handle docking state
        if (this.isDocked) {
            this.updateDocking();
            
            // Allow undocking
            if (inputState.thrust) {
                this.undock();
            }
        } else {
            // Normal flight
            this.rotate(inputState);
            const wasThrusting = this.thrust(inputState);
            this.limitVelocity();
            this.attemptDock(inputState, comets);
            
            // Passive fuel drain when moving fast
            if (!wasThrusting) {
                const speed = Math.sqrt(
                    this.body.velocity.x ** 2 + this.body.velocity.y ** 2
                );
                if (speed < 0.5) {
                    // Very slow regeneration when drifting slowly
                    this.fuel = Math.min(C.SHIP_MAX_FUEL, this.fuel + 0.02);
                }
            }
        }
        
        // Check fuel depletion
        if (this.fuel <= 0 && !this.isDocked) {
            this.destroy('Out of Fuel');
        }
        
        // Draw ship
        this.draw();
    }
    
    /**
     * Draw the ship sprite
     */
    draw() {
        if (!this.alive) return;
        
        this.graphics.clear();
        this.graphics.save();
        
        const x = this.body.position.x;
        const y = this.body.position.y;
        const angle = this.body.angle;
        
        // Debug: Log ship position every 60 frames
        if (this.scene.game.loop.frame % 60 === 0) {
            console.log('[Ship] Position:', { x, y, angle });
        }
        
        this.graphics.translateCanvas(x, y);
        this.graphics.rotateCanvas(angle);
        
        // Main body - triangle pointing right (0 radians)
        this.graphics.fillStyle(C.SHIP_COLOR, 1);
        this.graphics.lineStyle(2, C.SHIP_STROKE_COLOR, 1);
        
        this.graphics.beginPath();
        this.graphics.moveTo(C.SHIP_SIZE, 0); // Nose
        this.graphics.lineTo(-C.SHIP_SIZE, -C.SHIP_SIZE * 0.7); // Top wing
        this.graphics.lineTo(-C.SHIP_SIZE * 0.5, 0); // Rear center
        this.graphics.lineTo(-C.SHIP_SIZE, C.SHIP_SIZE * 0.7); // Bottom wing
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();
        
        // Cockpit
        this.graphics.fillStyle(0xbae6fd, 1);
        this.graphics.fillCircle(C.SHIP_SIZE * 0.3, 0, C.SHIP_SIZE * 0.3);
        
        // Docking indicator
        if (this.isDocked) {
            this.graphics.lineStyle(3, 0x4ade80, 1);
            this.graphics.strokeCircle(0, 0, C.SHIP_SIZE * 1.5);
        }
        
        this.graphics.restore();
    }
    
    /**
     * Destroy ship with explosion
     */
    destroy(reason = 'Destroyed') {
        if (!this.alive) return;
        
        this.alive = false;
        this.scene.events.emit('shipDestroyed', reason);
        
        // Create explosion
        this.createExplosion();
        
        // Hide graphics
        this.graphics.clear();
        this.scene.matter.world.remove(this.body);
    }
    
    /**
     * Create explosion effect
     */
    createExplosion() {
        // Create explosion particles (Phaser 3.60+ API)
        const emitter = this.scene.add.particles(this.body.position.x, this.body.position.y, 'particle', {
            speed: { min: 100, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 600,
            tint: [0xff4d4d, 0xf9cb28, 0x3b82f6],
            quantity: C.EXPLOSION_PARTICLE_COUNT
        });
        
        // Destroy emitter after particles die
        this.scene.time.delayedCall(650, () => {
            emitter.destroy();
        });
    }
    
    /**
     * Get fuel percentage
     */
    getFuelPercent() {
        return (this.fuel / C.SHIP_MAX_FUEL) * 100;
    }
}
