import * as C from '../config/constants.js';

/**
 * Comet Entity - Physics body with gravity well
 * Drifts diagonally (top-left to bottom-right)
 * Emits gravitational pull to nearby objects
 */
export default class Comet {
    constructor(scene, x, y, size, velocity, depth = null) {
        this.scene = scene;
        this.radius = size;
        
        // Generate unique ID for network sync
        this.id = `comet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Depth for visual layering (1.0 = near, 0.4 = far)
        this.depth = depth !== null ? depth : 
            (Math.random() < 0.3 ? C.DEPTH_NEAR : 
             Math.random() < 0.6 ? C.DEPTH_MID : C.DEPTH_FAR);
        
        // Create irregular shape for visual variety
        this.createIrregularShape(x, y);
        
        // Set initial velocity (diagonal drift)
        this.scene.matter.body.setVelocity(this.body, velocity);
        
        // Create gravity well sensor (invisible circle that attracts ships)
        this.gravityWellRadius = this.radius * C.GRAVITY_WELL_MULTIPLIER;
        this.gravitySensor = scene.matter.add.circle(
            x, y, 
            this.gravityWellRadius,
            {
                isSensor: true,
                collisionFilter: {
                    category: C.COLLISION_CATEGORIES.SENSOR,
                    mask: C.COLLISION_CATEGORIES.SHIP
                }
            }
        );
        
        // Link sensor to this comet
        this.gravitySensor.cometRef = this;
        
        // Visual properties
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        
        this.graphics = scene.add.graphics();
        
        // Track if off-screen
        this.hasLeftScreen = false;
    }
    
    /**
     * Create irregular polygon shape for visual variety
     */
    createIrregularShape(x, y) {
        const segments = 8 + Math.floor(Math.random() * 4);
        const vertices = [];
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const r = this.radius * (0.7 + Math.random() * 0.5);
            vertices.push({
                x: Math.cos(angle) * r,
                y: Math.sin(angle) * r
            });
        }
        
        this.body = this.scene.matter.add.fromVertices(x, y, vertices, {
            friction: C.COMET_COLLISION_FRICTION,
            frictionAir: 0,
            restitution: C.COMET_COLLISION_RESTITUTION,
            isStatic: false,
            collisionFilter: {
                category: C.COLLISION_CATEGORIES.COMET,
                mask: C.COLLISION_CATEGORIES.SHIP | C.COLLISION_CATEGORIES.COMET | C.COLLISION_CATEGORIES.PROJECTILE | C.COLLISION_CATEGORIES.ALIEN_PROJECTILE
            }
        });
        
        // Store reference on body for collision detection
        this.body.cometRef = this;
        
        // Store vertices for drawing
        this.vertices = vertices;
    }
    
    /**
     * Apply gravity pull to nearby ships
     */
    applyGravity(ship) {
        if (!ship.alive || ship.isDocked) return;
        
        const dx = this.body.position.x - ship.body.position.x;
        const dy = this.body.position.y - ship.body.position.y;
        const distanceSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distanceSquared);
        
        // Only apply if within gravity well
        if (distance < this.gravityWellRadius && distance > C.GRAVITY_MIN_DISTANCE) {
            // Inverse square law (simplified)
            const forceMagnitude = C.GRAVITY_STRENGTH * (this.radius / distance);
            
            const force = {
                x: (dx / distance) * forceMagnitude,
                y: (dy / distance) * forceMagnitude
            };
            
            this.scene.matter.applyForce(ship.body, force);
        }
    }
    
    /**
     * Update comet state
     */
    update() {
        // Keep gravity sensor synchronized with comet body
        this.scene.matter.body.setPosition(
            this.gravitySensor, 
            this.body.position
        );
        
        // Update rotation
        this.rotation += this.rotationSpeed;
        
        // Check if way off screen (with large buffer)
        const pos = this.body.position;
        const cam = this.scene.cameras.main;
        const buffer = C.COMET_REMOVAL_BUFFER || 400; // Large buffer so comets last longer
        const bounds = {
            left: cam.scrollX - buffer,
            right: cam.scrollX + cam.width + buffer,
            top: cam.scrollY - buffer,
            bottom: cam.scrollY + cam.height + buffer
        };
        
        if (!this.hasLeftScreen) {
            // Only mark as off-screen when way outside the visible area
            if (pos.x < bounds.left || pos.x > bounds.right ||
                pos.y < bounds.top || pos.y > bounds.bottom) {
                this.hasLeftScreen = true;
            }
        }
        
        this.draw();
    }
    
    /**
     * Draw the comet with depth-based shadows and visual cues
     */
    draw() {
        this.graphics.clear();
        
        const x = this.body.position.x;
        const y = this.body.position.y;
        
        // Calculate visual properties based on depth
        const scale = 0.7 + (this.depth * 0.3); // Near objects appear slightly bigger
        const alpha = 0.6 + (this.depth * 0.4);  // Near objects are brighter
        const strokeAlpha = 0.5 + (this.depth * 0.5);
        
        // Draw shadow for near objects
        if (this.depth >= C.DEPTH_MID) {
            const shadowOffsetX = C.SHADOW_OFFSET_X * this.depth;
            const shadowOffsetY = C.SHADOW_OFFSET_Y * this.depth;
            const shadowAlpha = C.SHADOW_ALPHA * this.depth;
            
            this.graphics.save();
            this.graphics.translateCanvas(x + shadowOffsetX, y + shadowOffsetY);
            this.graphics.rotateCanvas(this.rotation);
            
            // Shadow shape
            this.graphics.fillStyle(0x000000, shadowAlpha);
            this.graphics.beginPath();
            if (this.vertices.length > 0) {
                const sx = this.vertices[0].x * scale;
                const sy = this.vertices[0].y * scale;
                this.graphics.moveTo(sx, sy);
                for (let i = 1; i < this.vertices.length; i++) {
                    const vx = this.vertices[i].x * scale;
                    const vy = this.vertices[i].y * scale;
                    this.graphics.lineTo(vx, vy);
                }
            }
            this.graphics.closePath();
            this.graphics.fillPath();
            
            this.graphics.restore();
        }
        
        // Draw comet body
        this.graphics.save();
        this.graphics.translateCanvas(x, y);
        this.graphics.rotateCanvas(this.rotation);
        
        // Main body with depth-based alpha
        this.graphics.fillStyle(C.COMET_COLOR, alpha);
        this.graphics.lineStyle(2, C.COMET_STROKE_COLOR, strokeAlpha);
        
        this.graphics.beginPath();
        if (this.vertices.length > 0) {
            const vx = this.vertices[0].x * scale;
            const vy = this.vertices[0].y * scale;
            this.graphics.moveTo(vx, vy);
            for (let i = 1; i < this.vertices.length; i++) {
                const sx = this.vertices[i].x * scale;
                const sy = this.vertices[i].y * scale;
                this.graphics.lineTo(sx, sy);
            }
        }
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();
        
        // Crater details (more visible on near objects)
        const craterAlpha = 0.2 + (this.depth * 0.15);
        this.graphics.fillStyle(0x000000, craterAlpha);
        this.graphics.fillCircle(
            this.radius * 0.3 * scale, 
            this.radius * 0.2 * scale, 
            this.radius * 0.2 * scale
        );
        this.graphics.fillCircle(
            -this.radius * 0.2 * scale, 
            -this.radius * 0.3 * scale, 
            this.radius * 0.15 * scale
        );
        
        // Highlight for near objects (adds rim lighting effect)
        if (this.depth >= C.DEPTH_NEAR) {
            this.graphics.lineStyle(1, 0xffffff, 0.3);
            this.graphics.strokeCircle(
                -this.radius * 0.2 * scale,
                -this.radius * 0.2 * scale,
                this.radius * 0.4 * scale
            );
        }
        
        this.graphics.restore();
    }
    
    /**
     * Check if comet has left the screen
     */
    isOffScreen() {
        return this.hasLeftScreen;
    }
    
    /**
     * Destroy comet and cleanup
     */
    destroy() {
        this.graphics.destroy();
        this.scene.matter.world.remove(this.body);
        this.scene.matter.world.remove(this.gravitySensor);
    }
    
    /**
     * Create explosion on collision
     */
    explode() {
        // Create explosion particles (Phaser 3.60+ API)
        this.scene.add.particles(this.body.position.x, this.body.position.y, 'particle', {
            speed: { min: 50, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            blendMode: 'ADD',
            lifespan: 500,
            tint: [C.COMET_COLOR, C.COMET_STROKE_COLOR],
            quantity: 15
        });
        
        this.destroy();
    }
}
