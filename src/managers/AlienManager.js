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
     * Spawn alien near active players
     */
    spawnAlien() {
        // Don't spawn if at max
        if (this.aliens.length >= C.MAX_ALIENS) return;
        
        // Get all active player positions
        const playerPositions = [];
        
        if (this.scene.multiplayerManager && this.scene.multiplayerManager.isMultiplayerActive()) {
            // Get all ships (local + remote)
            const allShips = this.scene.multiplayerManager.getAllShips();
            for (const ship of allShips) {
                if (ship.alive) {
                    playerPositions.push({
                        x: ship.body.position.x,
                        y: ship.body.position.y
                    });
                }
            }
        } else if (this.scene.ship && this.scene.ship.alive) {
            // Single player mode
            playerPositions.push({
                x: this.scene.ship.body.position.x,
                y: this.scene.ship.body.position.y
            });
        }
        
        // If no players, use world center
        if (playerPositions.length === 0) {
            playerPositions.push({ 
                x: this.scene.worldCenterX || 0, 
                y: this.scene.worldCenterY || 0 
            });
        }
        
        // Pick a random player to spawn near
        const targetPlayer = playerPositions[Math.floor(Math.random() * playerPositions.length)];
        const centerX = targetPlayer.x;
        const centerY = targetPlayer.y;
        
        // Spawn at random angle around player
        const spawnDistance = 800;
        const angle = Math.random() * Math.PI * 2;
        
        const x = centerX + Math.cos(angle) * spawnDistance;
        const y = centerY + Math.sin(angle) * spawnDistance;
        
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
            
            // Check if way off from world center
            const pos = alien.body.position;
            const centerX = this.scene.worldCenterX || 0;
            const centerY = this.scene.worldCenterY || 0;
            
            const buffer = 2000; // Large buffer
            const dx = pos.x - centerX;
            const dy = pos.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > buffer * 2) {
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
    
    /**
     * Serialize aliens for network sync
     */
    serializeAliens() {
        return this.aliens.map((alien, index) => ({
            id: index,
            x: alien.body.position.x,
            y: alien.body.position.y,
            vx: alien.body.velocity.x,
            vy: alien.body.velocity.y,
            rotation: alien.body.angle,
            health: alien.health,
            isDocked: alien.isDocked,
            aiState: alien.aiState
        }));
    }
    
    /**
     * Sync aliens from network data (clients only)
     */
    syncFromNetwork(alienData) {
        // Remove aliens that no longer exist
        for (let i = this.aliens.length - 1; i >= 0; i--) {
            if (i >= alienData.length) {
                this.aliens[i].destroy();
                this.aliens.splice(i, 1);
            }
        }
        
        // Update or create aliens
        for (let i = 0; i < alienData.length; i++) {
            const data = alienData[i];
            
            if (i < this.aliens.length) {
                // Update existing alien
                const alien = this.aliens[i];
                this.scene.matter.body.setPosition(alien.body, { x: data.x, y: data.y });
                this.scene.matter.body.setVelocity(alien.body, { x: data.vx, y: data.vy });
                this.scene.matter.body.setAngle(alien.body, data.rotation);
                alien.health = data.health;
                alien.isDocked = data.isDocked;
                alien.aiState = data.aiState;
            } else {
                // Create new alien
                const alien = new Alien(this.scene, data.x, data.y);
                alien.health = data.health;
                alien.isDocked = data.isDocked;
                alien.aiState = data.aiState;
                this.scene.matter.body.setAngle(alien.body, data.rotation);
                this.aliens.push(alien);
            }
        }
    }
}
