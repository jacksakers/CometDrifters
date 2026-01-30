import Comet from '../entities/Comet.js';
import * as C from '../config/constants.js';

/**
 * CometManager - Handles comet spawning and lifecycle
 * Spawns comets from top-left moving to bottom-right ("The Rain")
 */
export default class CometManager {
    constructor(scene) {
        this.scene = scene;
        this.comets = [];
        this.score = 0;
        this.spawnRate = C.COMET_BASE_SPAWN_RATE;
    }
    
    /**
     * Spawn a new comet from the top-left
     */
    spawnComet() {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        
        // Spawn position: somewhere along the top-left edge
        // Either from top edge (moving right) or left edge (moving down)
        let x, y;
        
        if (Math.random() < 0.5) {
            // Spawn from top edge
            x = Math.random() * width * 0.7; // Left 70% of screen
            y = C.COMET_SPAWN_OFFSET;
        } else {
            // Spawn from left edge
            x = C.COMET_SPAWN_OFFSET;
            y = Math.random() * height * 0.7; // Top 70% of screen
        }
        
        // Random size
        const size = C.COMET_MIN_SIZE + 
                     Math.random() * (C.COMET_MAX_SIZE - C.COMET_MIN_SIZE);
        
        // Velocity: always moving toward bottom-right
        const velocity = {
            x: C.COMET_MIN_VELOCITY_X + 
               Math.random() * (C.COMET_MAX_VELOCITY_X - C.COMET_MIN_VELOCITY_X),
            y: C.COMET_MIN_VELOCITY_Y + 
               Math.random() * (C.COMET_MAX_VELOCITY_Y - C.COMET_MIN_VELOCITY_Y)
        };
        
        const comet = new Comet(this.scene, x, y, size, velocity);
        this.comets.push(comet);
    }
    
    /**
     * Update all comets and handle spawning
     */
    update(ship) {
        // Dynamic spawn rate based on score
        this.spawnRate = C.COMET_BASE_SPAWN_RATE + 
                        (this.score * C.COMET_SPAWN_INCREASE_RATE);
        
        // Spawn new comets
        if (Math.random() < this.spawnRate) {
            this.spawnComet();
        }
        
        // Update existing comets
        for (let i = this.comets.length - 1; i >= 0; i--) {
            const comet = this.comets[i];
            comet.update();
            
            // Apply gravity to ship
            if (ship) {
                comet.applyGravity(ship);
            }
            
            // Remove comets that have left the screen
            if (comet.isOffScreen()) {
                // Award points for successfully dodging
                this.score += C.COMET_DODGE_SCORE;
                this.scene.events.emit('scoreChanged', this.score);
                
                comet.destroy();
                this.comets.splice(i, 1);
            }
        }
    }
    
    /**
     * Get all active comets
     */
    getComets() {
        return this.comets;
    }
    
    /**
     * Get current score
     */
    getScore() {
        return this.score;
    }
    
    /**
     * Reset manager state
     */
    reset() {
        // Destroy all comets
        for (let comet of this.comets) {
            comet.destroy();
        }
        
        this.comets = [];
        this.score = 0;
        this.spawnRate = C.COMET_BASE_SPAWN_RATE;
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.reset();
    }
}
