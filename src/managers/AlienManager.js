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
     * Each player spawns their own aliens and broadcasts to others
     */
    spawnAlien(ownerId = null) {
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
        
        const alien = new Alien(this.scene, x, y, ownerId);
        this.aliens.push(alien);
        
        // Broadcast alien spawn to other players if in multiplayer
        if (this.scene.multiplayerManager && this.scene.multiplayerManager.isMultiplayerActive()) {
            this.scene.multiplayerManager.broadcastAlienSpawn(alien);
        }
        
        return alien;
    }
    
    /**
     * Update all aliens
     * In multiplayer, only spawn aliens for local player
     */
    update(player, comets) {
        // Get local player ID if in multiplayer
        const isMultiplayer = this.scene.multiplayerManager && this.scene.multiplayerManager.isMultiplayerActive();
        const localPlayerId = isMultiplayer ? this.scene.multiplayerManager.localPlayerId : null;
        
        // Debug log occasionally
        if (isMultiplayer && Math.random() < 0.001) {
            console.log('[AlienManager] Update - localPlayerId:', localPlayerId, 'alien count:', this.aliens.length);
        }
        
        // Update spawn timer - only spawn for local player in multiplayer
        // In single player, player is the local ship
        const shouldSpawn = !isMultiplayer || (player && player.isLocal);
        
        if (shouldSpawn) {
            this.spawnTimer++;
            
            if (this.spawnTimer >= this.nextSpawnTime) {
                this.spawnAlien(localPlayerId);
                this.spawnTimer = 0;
                this.nextSpawnTime = this.getNextSpawnTime();
            }
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
        return this.aliens.map((alien) => ({
            id: alien.id,
            ownerId: alien.ownerId,
            x: alien.body.position.x,
            y: alien.body.position.y,
            vx: alien.body.velocity.x,
            vy: alien.body.velocity.y,
            rotation: alien.body.angle,
            health: alien.health,
            alive: alien.health > 0,
            isDocked: alien.isDocked,
            aiState: alien.aiState
        }));
    }
    
    /**
     * Create an alien from network data (when remote player spawns one)
     */
    createAlienFromNetwork(data) {
        // Don't create aliens that are already dead
        if (data.health <= 0) {
            return null;
        }
        
        // Check if alien already exists
        const existingAlien = this.aliens.find(a => a.id === data.id);
        if (existingAlien) return;
        
        const alien = new Alien(this.scene, data.x, data.y, data.ownerId);
        
        // Set network ID and properties
        alien.id = data.id;
        alien.health = data.health;
        alien.isDocked = data.isDocked;
        alien.aiState = data.aiState;
        this.scene.matter.body.setAngle(alien.body, data.rotation);
        this.scene.matter.body.setVelocity(alien.body, { x: data.vx, y: data.vy });
        
        this.aliens.push(alien);
        return alien;
    }
    
    /**
     * Sync aliens from network data (clients only)
     */
    syncFromNetwork(alienData) {
        // Create a map of existing aliens by ID
        const existingAliens = new Map();
        for (const alien of this.aliens) {
            existingAliens.set(alien.id, alien);
        }
        
        const newAliens = [];
        
        // Update or create aliens from network data
        for (const data of alienData) {
            if (existingAliens.has(data.id)) {
                // Update existing alien with smooth interpolation
                const alien = existingAliens.get(data.id);
                
                // Interpolate position for smooth movement
                const currentX = alien.body.position.x;
                const currentY = alien.body.position.y;
                const lerpFactor = 0.15;
                const targetX = currentX + (data.x - currentX) * lerpFactor;
                const targetY = currentY + (data.y - currentY) * lerpFactor;
                
                this.scene.matter.body.setPosition(alien.body, { x: targetX, y: targetY });
                this.scene.matter.body.setVelocity(alien.body, { x: data.vx, y: data.vy });
                
                // Smoothly interpolate rotation to avoid jumps
                let angleDiff = data.rotation - alien.body.angle;
                // Normalize to -PI to PI range
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                const newAngle = alien.body.angle + angleDiff * 0.15; // Smooth rotation interpolation
                this.scene.matter.body.setAngle(alien.body, newAngle);
                
                alien.health = data.health;
                alien.isDocked = data.isDocked;
                alien.aiState = data.aiState;
                
                newAliens.push(alien);
                existingAliens.delete(data.id);
            } else {
                // Don't create aliens that are already dead
                if (data.health <= 0) {
                    continue;
                }
                
                // Create new alien
                const alien = new Alien(this.scene, data.x, data.y);
                alien.id = data.id; // Use network ID
                alien.health = data.health;
                alien.isDocked = data.isDocked;
                alien.aiState = data.aiState;
                this.scene.matter.body.setAngle(alien.body, data.rotation);
                newAliens.push(alien);
            }
        }
        
        // Remove aliens that no longer exist
        for (const [id, alien] of existingAliens) {
            alien.destroy();
        }
        
        this.aliens = newAliens;
    }
}
