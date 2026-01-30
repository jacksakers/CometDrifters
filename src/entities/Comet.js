import * as C from '../config/constants.js';

/**
 * Comet Entity - Physics body with gravity well
 * Drifts diagonally (top-left to bottom-right)
 * Emits gravitational pull to nearby objects
 */
export default class Comet {
    constructor(scene, x, y, size, velocity) {
        this.scene = scene;
        this.radius = size;
        
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
            friction: 0,
            frictionAir: 0,
            restitution: 0.8,
            isStatic: false,
            collisionFilter: {
                category: C.COLLISION_CATEGORIES.COMET,
                mask: C.COLLISION_CATEGORIES.SHIP
            }
        });
        
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
        
        // Check if off screen
        const pos = this.body.position;
        const bounds = this.scene.cameras.main.getBounds();
        
        if (!this.hasLeftScreen) {
            // Check if completely visible first
            if (pos.x > bounds.x && pos.y > bounds.y) {
                // Now check if it left
                if (pos.x > bounds.right + 100 || 
                    pos.y > bounds.bottom + 100 ||
                    pos.x < bounds.x - 100 ||
                    pos.y < bounds.y - 100) {
                    this.hasLeftScreen = true;
                }
            }
        }
        
        this.draw();
    }
    
    /**
     * Draw the comet
     */
    draw() {
        this.graphics.clear();
        
        const x = this.body.position.x;
        const y = this.body.position.y;
        
        // Debug: Draw gravity well (optional - comment out for production)
        // this.graphics.lineStyle(1, 0x4ade80, 0.2);
        // this.graphics.strokeCircle(x, y, this.gravityWellRadius);
        
        // Draw comet body
        this.graphics.save();
        this.graphics.translateCanvas(x, y);
        this.graphics.rotateCanvas(this.rotation);
        
        // Main body
        this.graphics.fillStyle(C.COMET_COLOR, 1);
        this.graphics.lineStyle(2, C.COMET_STROKE_COLOR, 1);
        
        this.graphics.beginPath();
        if (this.vertices.length > 0) {
            this.graphics.moveTo(this.vertices[0].x, this.vertices[0].y);
            for (let i = 1; i < this.vertices.length; i++) {
                this.graphics.lineTo(this.vertices[i].x, this.vertices[i].y);
            }
        }
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();
        
        // Crater details
        this.graphics.fillStyle(0x000000, 0.3);
        this.graphics.fillCircle(
            this.radius * 0.3, 
            this.radius * 0.2, 
            this.radius * 0.2
        );
        this.graphics.fillCircle(
            -this.radius * 0.2, 
            -this.radius * 0.3, 
            this.radius * 0.15
        );
        
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
