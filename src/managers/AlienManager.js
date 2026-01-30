import * as C from '../config/constants.js';
import Alien from '../entities/Alien.js';

/**
 * AlienManager - Handles alien spawning and lifecycle
 */
export default class AlienManager {
    constructor(scene) {
        this.scene = scene;
        this.aliens = [];
        this.spawnTimer = 0;
        this.nextSpawnTime = this.getNextSpawnTime();
    }
    
    /**
     * Calculate next spawn time with variance
     */
    getNextSpawnTime() {
        return C.ALIEN_SPAWN_INTERVAL + 
               (Math.random() - 0.5) * C.ALIEN_SPAWN_VARIANCE;
    }
    
    /**
     * Spawn alien at edge of screen
     */
    spawnAlien() {
        // Don't spawn if at max
        if (this.aliens.length >= C.MAX_ALIENS) return;
        
        // Get camera position
        const cam = this.scene.cameras.main;
        const camX = cam.scrollX + cam.width / 2;
        const camY = cam.scrollY + cam.height / 2;
        
        // Spawn at random edge, far from camera
        const spawnDistance = 800;
        const angle = Math.random() * Math.PI * 2;
        
        const x = camX + Math.cos(angle) * spawnDistance;
        const y = camY + Math.sin(angle) * spawnDistance;
        
        const alien = new Alien(this.scene, x, y);
        this.aliens.push(alien);
    }
    
    /**
     * Update all aliens
     */
    update(player, comets) {
        // Update spawn timer
        this.spawnTimer++;
        
        if (this.spawnTimer >= this.nextSpawnTime) {
            this.spawnAlien();
            this.spawnTimer = 0;
            this.nextSpawnTime = this.getNextSpawnTime();
        }
        
        // Update each alien
        for (let i = this.aliens.length - 1; i >= 0; i--) {
            const alien = this.aliens[i];
            
            if (!alien.alive) {
                // Remove dead aliens
                this.aliens.splice(i, 1);
                continue;
            }
            
            // Check if way off screen
            const pos = alien.body.position;
            const cam = this.scene.cameras.main;
            const buffer = 2000; // Large buffer
            
            if (pos.x < cam.scrollX - buffer || 
                pos.x > cam.scrollX + cam.width + buffer ||
                pos.y < cam.scrollY - buffer || 
                pos.y > cam.scrollY + cam.height + buffer) {
                alien.destroy();
                this.aliens.splice(i, 1);
                continue;
            }
            
            alien.update(player, comets);
        }
    }
    
    /**
     * Get all active aliens
     */
    getAliens() {
        return this.aliens;
    }
    
    /**
     * Reset manager
     */
    reset() {
        for (let alien of this.aliens) {
            alien.destroy();
        }
        
        this.aliens = [];
        this.spawnTimer = 0;
        this.nextSpawnTime = this.getNextSpawnTime();
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.reset();
    }
}
