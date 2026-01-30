import Comet from '../entities/Comet.js';
import * as C from '../config/constants.js';

/**
 * CometManager - Handles comet spawning and lifecycle
 * Spawns comets from all directions moving in random trajectories
 */
export default class CometManager {
    constructor(scene) {
        this.scene = scene;
        this.comets = [];
        this.score = 0;
        this.spawnRate = C.COMET_BASE_SPAWN_RATE;
    }
    
    /**
     * Spawn a new comet from all directions
     * Comets pass through the camera view
     */
    spawnComet() {
        // Get camera center position
        const camX = this.scene.cameras.main.scrollX + this.scene.cameras.main.width / 2;
        const camY = this.scene.cameras.main.scrollY + this.scene.cameras.main.height / 2;
        
        // Spawn distance from camera (far enough to not pop in)
        const spawnDistance = 1500;
        
        // Random angle around camera (all directions)
        const angle = Math.random() * Math.PI * 2;
        
        // Spawn position at distance from camera
        const x = camX + Math.cos(angle) * spawnDistance;
        const y = camY + Math.sin(angle) * spawnDistance;
        
        // Random size
        const size = C.COMET_MIN_SIZE + 
                     Math.random() * (C.COMET_MAX_SIZE - C.COMET_MIN_SIZE);
        
        // Velocity: aim toward camera center with slight variation
        const angleToCamera = Math.atan2(camY - y, camX - x);
        const randomness = (Math.random() - 0.5) * 0.6; // +/- 0.3 radians variation
        const velocityAngle = angleToCamera + randomness;
        
        const speed = C.COMET_MIN_VELOCITY_X + 
                     Math.random() * (C.COMET_MAX_VELOCITY_X - C.COMET_MIN_VELOCITY_X);
        
        const velocity = {
            x: Math.cos(velocityAngle) * speed,
            y: Math.sin(velocityAngle) * speed
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
            
            // Remove comets that are very far from camera
            const camX = this.scene.cameras.main.scrollX + this.scene.cameras.main.width / 2;
            const camY = this.scene.cameras.main.scrollY + this.scene.cameras.main.height / 2;
            const dx = comet.body.position.x - camX;
            const dy = comet.body.position.y - camY;
            const distanceFromCamera = Math.sqrt(dx * dx + dy * dy);
            
            // Only remove when VERY far (3000 pixels from camera)
            if (distanceFromCamera > 3000) {
                // Award points for comet passing by
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
