import * as C from '../config/constants.js';

/**
 * Projectile Entity - Laser beams and alien weapons
 * Travels in straight line and damages on impact
 */
export default class Projectile {
    constructor(scene, x, y, angle, config) {
        this.scene = scene;
        this.config = config;
        
        // Projectile properties
        this.damage = config.damage || 10;
        this.speed = config.speed || 10;
        this.lifetime = config.lifetime || 120;
        this.color = config.color || 0xffffff;
        this.owner = config.owner || 'player'; // 'player' or 'alien'
        this.age = 0;
        this.alive = true;
        
        // Create projectile body
        this.body = scene.matter.add.circle(x, y, 4, {
            isSensor: true, // Pass through but detect collisions
            friction: 0,
            frictionAir: 0,
            collisionFilter: {
                category: this.owner === 'player' ? 
                    C.COLLISION_CATEGORIES.PROJECTILE : 
                    C.COLLISION_CATEGORIES.ALIEN_PROJECTILE,
                mask: this.owner === 'player' ? 
                    C.COLLISION_CATEGORIES.ALIEN : 
                    C.COLLISION_CATEGORIES.SHIP
            }
        });
        
        // Set velocity based on angle
        const vx = Math.cos(angle) * this.speed;
        const vy = Math.sin(angle) * this.speed;
        scene.matter.body.setVelocity(this.body, { x: vx, y: vy });
        
        // Store reference on body
        this.body.projectileRef = this;
        
        // Visual
        this.graphics = scene.add.graphics();
        
        // Trail effect
        this.trail = [];
        this.maxTrailLength = 8;
    }
    
    /**
     * Update projectile
     */
    update() {
        if (!this.alive) return;
        
        this.age++;
        
        // Add to trail
        this.trail.push({
            x: this.body.position.x,
            y: this.body.position.y
        });
        
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // Check lifetime
        if (this.age > this.lifetime) {
            this.destroy();
            return;
        }
        
        // Check if way off screen
        const pos = this.body.position;
        const cam = this.scene.cameras.main;
        const buffer = 1000;
        
        if (pos.x < cam.scrollX - buffer || 
            pos.x > cam.scrollX + cam.width + buffer ||
            pos.y < cam.scrollY - buffer || 
            pos.y > cam.scrollY + cam.height + buffer) {
            this.destroy();
            return;
        }
        
        this.draw();
    }
    
    /**
     * Draw projectile with trail
     */
    draw() {
        if (!this.alive) return;
        
        this.graphics.clear();
        
        const x = this.body.position.x;
        const y = this.body.position.y;
        
        // Draw trail
        if (this.trail.length > 1) {
            this.graphics.lineStyle(3, this.color, 0.6);
            this.graphics.beginPath();
            this.graphics.moveTo(this.trail[0].x, this.trail[0].y);
            
            for (let i = 1; i < this.trail.length; i++) {
                const alpha = i / this.trail.length;
                this.graphics.lineStyle(3 * alpha, this.color, 0.6 * alpha);
                this.graphics.lineTo(this.trail[i].x, this.trail[i].y);
            }
            
            this.graphics.strokePath();
        }
        
        // Draw main projectile
        this.graphics.fillStyle(this.color, 1);
        this.graphics.fillCircle(x, y, 5);
        
        // Glow effect
        this.graphics.fillStyle(this.color, 0.4);
        this.graphics.fillCircle(x, y, 8);
    }
    
    /**
     * Handle hit
     */
    hit(target) {
        if (!this.alive) return;
        
        // Create impact effect
        this.createImpactEffect();
        
        // Destroy projectile
        this.destroy();
    }
    
    /**
     * Create impact particle effect
     */
    createImpactEffect() {
        const x = this.body.position.x;
        const y = this.body.position.y;
        
        // Create small explosion particles
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const speed = 2 + Math.random() * 3;
            
            const particle = this.scene.add.circle(
                x, y, 2, this.color, 1
            );
            
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            // Animate particle
            this.scene.tweens.add({
                targets: particle,
                x: x + vx * 10,
                y: y + vy * 10,
                alpha: 0,
                scale: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }
    
    /**
     * Destroy projectile
     */
    destroy() {
        if (!this.alive) return;
        
        this.alive = false;
        
        if (this.body && this.scene.matter.world) {
            this.scene.matter.world.remove(this.body);
        }
        
        if (this.graphics) {
            this.graphics.destroy();
        }
    }
}
