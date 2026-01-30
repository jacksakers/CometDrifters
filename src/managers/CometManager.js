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
        
        // Velocity: aim toward camera center with slight variation
        const angleToCamera = Math.atan2(camY - y, camX - x);
        const randomness = (Math.random() - 0.5) * 0.6; // +/- 0.3 radians variation
        const velocityAngle = angleToCamera + randomness;
        
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
        
        // Spawn comets ahead of fast-moving player (less frequently)
        // Check every 30 frames to avoid over-spawning
        if (ship && this.scene.game.loop.frame % 30 === 0 && this.comets.length < C.MAX_COMETS_ON_SCREEN - 2) {
            this.spawnAheadOfPlayer(ship);
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
}
