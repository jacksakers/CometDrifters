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
     * Comets spawn around ALL active players
     */
    spawnComet() {
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
        
        // Pick a random player to spawn around
        const targetPlayer = playerPositions[Math.floor(Math.random() * playerPositions.length)];
        const centerX = targetPlayer.x;
        const centerY = targetPlayer.y;
        
        // Spawn distance from center (far enough to not pop in)
        const spawnDistance = 1500;
        
        // Random angle around center (all directions)
        const angle = Math.random() * Math.PI * 2;
        
        // Spawn position at distance from center in world coordinates
        const x = centerX + Math.cos(angle) * spawnDistance;
        const y = centerY + Math.sin(angle) * spawnDistance;
        
        // Determine if this should be a planet (large comet)
        const isPlanet = Math.random() < C.PLANET_SPAWN_CHANCE;
        
        // Random size (planet or regular comet)
        const size = isPlanet ? 
                     C.PLANET_MIN_SIZE + Math.random() * (C.PLANET_MAX_SIZE - C.PLANET_MIN_SIZE) :
                     C.COMET_MIN_SIZE + Math.random() * (C.COMET_MAX_SIZE - C.COMET_MIN_SIZE);
        
        // Random depth layer (30% near, 30% mid, 40% far)
        let depth;
        const depthRoll = Math.random();
        if (depthRoll < 0.3) {
            depth = C.DEPTH_NEAR;
        } else if (depthRoll < 0.6) {
            depth = C.DEPTH_MID;
        } else {
            depth = C.DEPTH_FAR;
        }
        
        // Velocity: aim toward center with slight variation
        const angleToCenter = Math.atan2(centerY - y, centerX - x);
        const randomness = (Math.random() - 0.5) * 0.6; // +/- 0.3 radians variation
        const velocityAngle = angleToCenter + randomness;
        
        // Planets move slower than regular comets
        const speed = isPlanet ?
                     C.PLANET_MIN_VELOCITY + Math.random() * (C.PLANET_MAX_VELOCITY - C.PLANET_MIN_VELOCITY) :
                     C.COMET_MIN_VELOCITY_X + Math.random() * (C.COMET_MAX_VELOCITY_X - C.COMET_MIN_VELOCITY_X);
        
        const velocity = {
            x: Math.cos(velocityAngle) * speed,
            y: Math.sin(velocityAngle) * speed
        };
        
        const comet = new Comet(this.scene, x, y, size, velocity, depth);
        this.comets.push(comet);
    }
    
    /**
     * Spawn comets ahead of player's direction of travel
     * Ensures there are obstacles when player jets forward quickly
     */
    spawnAheadOfPlayer(ship) {
        if (!ship || !ship.alive) return;
        
        // Only spawn ahead if player is moving fast enough
        const speed = Math.sqrt(
            ship.body.velocity.x * ship.body.velocity.x + 
            ship.body.velocity.y * ship.body.velocity.y
        );
        
        if (speed < 1) return; // Not moving fast enough to need ahead spawning
        
        // Calculate player's direction of travel
        const travelAngle = Math.atan2(ship.body.velocity.y, ship.body.velocity.x);
        
        // Spawn 2-3 comets ahead of player
        const spawnCount = 2 + Math.floor(Math.random() * 2); // 2-3 comets
        
        for (let i = 0; i < spawnCount; i++) {
            // Spawn distance: far ahead (1500-2500 pixels)
            const spawnDistance = 1500 + Math.random() * 1000;
            
            // Add some spread angle to create a "field" ahead
            const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.8; // +/- 72 degrees
            const finalAngle = travelAngle + spreadAngle;
            
            // Spawn position ahead of player
            const x = ship.body.position.x + Math.cos(finalAngle) * spawnDistance;
            const y = ship.body.position.y + Math.sin(finalAngle) * spawnDistance;
            
            // Random comet properties
            const isPlanet = Math.random() < C.PLANET_SPAWN_CHANCE;
            const size = isPlanet ? 
                         C.PLANET_MIN_SIZE + Math.random() * (C.PLANET_MAX_SIZE - C.PLANET_MIN_SIZE) :
                         C.COMET_MIN_SIZE + Math.random() * (C.COMET_MAX_SIZE - C.COMET_MIN_SIZE);
            
            // Random depth
            let depth;
            const depthRoll = Math.random();
            if (depthRoll < 0.3) {
                depth = C.DEPTH_NEAR;
            } else if (depthRoll < 0.6) {
                depth = C.DEPTH_MID;
            } else {
                depth = C.DEPTH_FAR;
            }
            
            // Velocity: mostly stationary or slow drift to create obstacles
            // Some chance of moving toward player path for intersect
            let velocity;
            if (Math.random() < 0.4) {
                // Stationary/slow drift
                velocity = {
                    x: (Math.random() - 0.5) * 1,
                    y: (Math.random() - 0.5) * 1
                };
            } else {
                // Moving to intersect player's path
                const angleToPlayer = Math.atan2(
                    ship.body.position.y - y,
                    ship.body.position.x - x
                );
                const speed = isPlanet ?
                             C.PLANET_MIN_VELOCITY + Math.random() * (C.PLANET_MAX_VELOCITY - C.PLANET_MIN_VELOCITY) :
                             1 + Math.random() * 2;
                velocity = {
                    x: Math.cos(angleToPlayer) * speed,
                    y: Math.sin(angleToPlayer) * speed
                };
            }
            
            const comet = new Comet(this.scene, x, y, size, velocity, depth);
            this.comets.push(comet);
        }
    }
    
    /**
     * Update all comets and handle spawning
     */
    update(ship) {
        // Dynamic spawn rate based on score
        this.spawnRate = C.COMET_BASE_SPAWN_RATE + 
                        (this.score * C.COMET_SPAWN_INCREASE_RATE);
        
        // Only spawn new comets if we're under the limit
        if (this.comets.length < C.MAX_COMETS_ON_SCREEN && Math.random() < this.spawnRate) {
            this.spawnComet();
        }
        
        // Spawn comets ahead of all fast-moving players (less frequently)
        // Check every 30 frames to avoid over-spawning
        if (this.scene.game.loop.frame % 30 === 0 && this.comets.length < C.MAX_COMETS_ON_SCREEN - 2) {
            // Get all active players
            let playersToCheck = [];
            if (this.scene.multiplayerManager && this.scene.multiplayerManager.isMultiplayerActive()) {
                playersToCheck = this.scene.multiplayerManager.getAllShips().filter(s => s.alive);
            } else if (ship && ship.alive) {
                playersToCheck = [ship];
            }
            
            // Spawn ahead of a random fast-moving player
            if (playersToCheck.length > 0) {
                const randomPlayer = playersToCheck[Math.floor(Math.random() * playersToCheck.length)];
                this.spawnAheadOfPlayer(randomPlayer);
            }
        }
        
        // Update existing comets
        for (let i = this.comets.length - 1; i >= 0; i--) {
            const comet = this.comets[i];
            comet.update();
            
            // Apply gravity to ship
            if (ship) {
                comet.applyGravity(ship);
            }
            
            // Remove comets that are very far from world center
            const centerX = this.scene.worldCenterX || 0;
            const centerY = this.scene.worldCenterY || 0;
            
            const dx = comet.body.position.x - centerX;
            const dy = comet.body.position.y - centerY;
            const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
            
            // Only remove when VERY far (3000 pixels from center)
            if (distanceFromCenter > 3000) {
                // No points awarded for dodging - points come from docking now
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
    
    /**
     * Serialize comets for network sync
     */
    serializeComets() {
        return this.comets.map((comet) => ({
            id: comet.id,
            x: comet.body.position.x,
            y: comet.body.position.y,
            vx: comet.body.velocity.x,
            vy: comet.body.velocity.y,
            radius: comet.radius,
            depth: comet.depth,
            rotation: comet.rotation,
            rotationSpeed: comet.rotationSpeed
        }));
    }
    
    /**
     * Sync comets from network data (clients only)
     */
    syncFromNetwork(cometData) {
        // Create a map of existing comets by ID
        const existingComets = new Map();
        for (const comet of this.comets) {
            existingComets.set(comet.id, comet);
        }
        
        const newComets = [];
        
        // Update or create comets from network data
        for (const data of cometData) {
            if (existingComets.has(data.id)) {
                // Update existing comet with smooth interpolation
                const comet = existingComets.get(data.id);
                
                // Interpolate position for smooth movement
                const currentX = comet.body.position.x;
                const currentY = comet.body.position.y;
                const lerpFactor = 0.15;
                const targetX = currentX + (data.x - currentX) * lerpFactor;
                const targetY = currentY + (data.y - currentY) * lerpFactor;
                
                this.scene.matter.body.setPosition(comet.body, { x: targetX, y: targetY });
                this.scene.matter.body.setVelocity(comet.body, { x: data.vx, y: data.vy });
                
                // Smoothly interpolate rotation to avoid jumps
                let rotationDiff = data.rotation - comet.rotation;
                // Normalize to -PI to PI range
                while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
                while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
                comet.rotation += rotationDiff * 0.1; // Smooth rotation interpolation
                comet.rotationSpeed = data.rotationSpeed;
                
                // Also sync gravity sensor
                this.scene.matter.body.setPosition(comet.gravitySensor, { x: targetX, y: targetY });
                
                newComets.push(comet);
                existingComets.delete(data.id);
            } else {
                // Create new comet
                const velocity = { x: data.vx, y: data.vy };
                const comet = new Comet(this.scene, data.x, data.y, data.radius, velocity, data.depth);
                comet.id = data.id; // Use network ID
                comet.rotation = data.rotation;
                comet.rotationSpeed = data.rotationSpeed;
                newComets.push(comet);
            }
        }
        
        // Remove comets that no longer exist
        for (const [id, comet] of existingComets) {
            comet.destroy();
        }
        
        this.comets = newComets;
    }
}
