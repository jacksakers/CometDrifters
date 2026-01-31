import * as C from '../config/constants.js';
import Projectile from '../entities/Projectile.js';

// Playroom Kit is loaded globally via UMD bundle in game.html
const { insertCoin, onPlayerJoin, myPlayer, isHost, getState, setState, Joystick } = window.Playroom;

/**
 * MultiplayerManager - Handles Playroom Kit integration
 * Manages lobby, player synchronization, and network state
 */
export default class MultiplayerManager {
    constructor(scene) {
        this.scene = scene;
        this.players = new Map(); // Map of playerId -> { ship, playerState, isLocal }
        this.localPlayerId = null;
        this.isInitialized = false;
        this.updateInterval = null;
        
        // Track processed alien kills to prevent duplicate processing
        this.processedAlienKills = new Set();
        
        // Random name generation
        this.nameAdjectives = [
            'Swift', 'Brave', 'Clever', 'Daring', 'Bold', 'Quick', 
            'Bright', 'Sharp', 'Fierce', 'Noble', 'Wise', 'Silent',
            'Cosmic', 'Stellar', 'Lunar', 'Solar', 'Nova', 'Nebula'
        ];
        this.nameNouns = [
            'Pilot', 'Explorer', 'Voyager', 'Navigator', 'Captain', 'Commander',
            'Ranger', 'Scout', 'Ace', 'Hunter', 'Rider', 'Chaser',
            'Star', 'Comet', 'Rocket', 'Phoenix', 'Eagle', 'Hawk'
        ];
    }
    
    /**
     * Initialize Playroom Kit and lobby
     */
    async initialize() {
        try {
            console.log('[Multiplayer] Initializing Playroom Kit...');
            
            // Start Playroom - players join directly without lobby
            await insertCoin({
                skipLobby: true,
                maxPlayersPerRoom: 8,
                defaultPlayerStates: {
                    x: C.GAME_WIDTH / 2,
                    y: C.GAME_HEIGHT - 150,
                    angle: 0,
                    score: 0,
                    health: C.SHIP_START_HEALTH,
                    fuel: C.SHIP_START_FUEL,
                    alive: true
                    // name is set per-player in handlePlayerJoin
                }
            });
            
            console.log('[Multiplayer] Lobby initialized!');
            
            // Get local player
            const me = myPlayer();
            this.localPlayerId = me.id;
            
            // Set random name for local player (always generate fresh)
            me.setState('name', this.generateRandomName(), true);
            console.log('[Multiplayer] Local player name set to:', me.getState('name'));
            
            // Set up host migration listener
            this.setupHostMigration();
            
            // Listen for players joining
            onPlayerJoin((playerState) => {
                this.handlePlayerJoin(playerState);
            });
            
            this.isInitialized = true;
            
            // Start periodic peer-to-peer sync for all players
            this.startPeerSync();
            
            console.log('[Multiplayer] Multiplayer manager ready (peer-to-peer mode)!');
            
        } catch (error) {
            console.error('[Multiplayer] Failed to initialize:', error);
            // Fall back to single-player mode
            this.isInitialized = false;
        }
    }
    
    /**
     * Generate a random player name
     */
    generateRandomName() {
        const adj = this.nameAdjectives[Math.floor(Math.random() * this.nameAdjectives.length)];
        const noun = this.nameNouns[Math.floor(Math.random() * this.nameNouns.length)];
        return `${adj} ${noun}`;
    }
    
    /**
     * Setup host migration handling
     * In peer-to-peer mode, host is just the first player and handles world constants
     */
    setupHostMigration() {
        // Initialize world constants if we're the first host
        if (isHost()) {
            console.log('[Multiplayer] We are the host - setting up world constants');
            
            // Set world center (galactic origin) - only done once by first host
            const worldCenterX = getState('worldCenterX');
            const worldCenterY = getState('worldCenterY');
            
            if (worldCenterX === undefined || worldCenterY === undefined) {
                // First host sets the world center
                const centerX = this.scene.worldCenterX || 0;
                const centerY = this.scene.worldCenterY || 0;
                setState('worldCenterX', centerX, true);
                setState('worldCenterY', centerY, true);
                console.log('[Multiplayer] Set world center:', centerX, centerY);
            } else {
                // Not the first host - use existing world center
                this.scene.worldCenterX = worldCenterX;
                this.scene.worldCenterY = worldCenterY;
                console.log('[Multiplayer] Using existing world center:', worldCenterX, worldCenterY);
            }
        } else {
            // Client - get world center from state
            const worldCenterX = getState('worldCenterX');
            const worldCenterY = getState('worldCenterY');
            
            if (worldCenterX !== undefined && worldCenterY !== undefined) {
                this.scene.worldCenterX = worldCenterX;
                this.scene.worldCenterY = worldCenterY;
                console.log('[Multiplayer] Client using world center:', worldCenterX, worldCenterY);
            }
        }
        
        // Note: Playroom Kit handles host migration automatically
        // When the host leaves, the next player becomes host
        // Our peer-to-peer architecture means this transition is seamless
        // since each player is already managing their own entities
    }
    
    /**
     * Handle a player joining
     */
    handlePlayerJoin(playerState) {
        const playerId = playerState.id;
        const isLocal = playerId === this.localPlayerId;
        
        console.log('[Multiplayer] Player joined:', playerId, isLocal ? '(local)' : '(remote)');
        
        // Set unique name for each player if not already set
        if (!playerState.getState('name')) {
            const newName = this.generateRandomName();
            playerState.setState('name', newName, true);
            console.log('[Multiplayer] Set name for player', playerId, ':', newName);
        }
        
        // Notify UI of player join
        if (!isLocal) {
            const playerName = playerState.getState('name');
            console.log('[Multiplayer] Remote player name:', playerName);
            this.scene.events.emit('playerJoined', playerName);
        }
        
        // Get spawn position from player state or use default
        const x = playerState.getState('x') || C.GAME_WIDTH / 2;
        const y = playerState.getState('y') || C.GAME_HEIGHT - 150;
        
        // Create ship for this player
        const ship = this.scene.createPlayerShip(x, y, isLocal, playerState);
        
        // Create Playroom joystick for this player (will only show UI for local player)
        const joystick = new Joystick(playerState, {
            type: "angular", // or "dpad" - angular is better for space games
            buttons: [
                { id: "shoot", label: "Shoot" },
                { id: "lockOn", label: "Lock-On" }
            ]
        });
        
        // If this is the local player, give joystick to InputManager
        if (isLocal) {
            this.scene.inputManager.setJoystick(joystick);
            console.log('[Multiplayer] Joystick created for local player');
        }
        
        // Store player data
        this.players.set(playerId, {
            ship,
            playerState,
            isLocal,
            joystick
        });
        
        // Listen for player quitting
        playerState.onQuit(() => {
            this.handlePlayerQuit(playerId);
        });
        
        // For local player, set as the main ship
        if (isLocal) {
            this.scene.ship = ship;
            console.log('[Multiplayer] Local player ship set');
        }
        
        // Update leaderboard
        this.updateLeaderboard();
    }
    
    /**
     * Handle a player quitting
     */
    handlePlayerQuit(playerId) {
        console.log('[Multiplayer] Player quit:', playerId);
        
        const playerData = this.players.get(playerId);
        if (playerData) {
            // Destroy ship
            if (playerData.ship) {
                playerData.ship.destroy('Player Left');
            }
            
            // Clean up entities owned by this player
            this.cleanupPlayerEntities(playerId);
            
            this.players.delete(playerId);
        }
        
        // Update leaderboard
        this.updateLeaderboard();
    }
    
    /**
     * Clean up entities owned by a player who left
     */
    cleanupPlayerEntities(playerId) {
        console.log('[Multiplayer] Cleaning up entities for player:', playerId);
        
        // Remove comets owned by this player
        const cometsToRemove = this.scene.cometManager.comets.filter(
            c => c.ownerId === playerId
        );
        for (const comet of cometsToRemove) {
            const index = this.scene.cometManager.comets.indexOf(comet);
            if (index > -1) {
                this.scene.cometManager.comets.splice(index, 1);
                comet.destroy();
            }
        }
        
        // Remove aliens owned by this player
        const aliensToRemove = this.scene.alienManager.aliens.filter(
            a => a.ownerId === playerId
        );
        for (const alien of aliensToRemove) {
            const index = this.scene.alienManager.aliens.indexOf(alien);
            if (index > -1) {
                this.scene.alienManager.aliens.splice(index, 1);
                alien.destroy();
            }
        }
        
        console.log('[Multiplayer] Cleaned up:', cometsToRemove.length, 'comets,', aliensToRemove.length, 'aliens');
    }
    
    /**
     * Start peer sync loop - all players sync their owned entities
     */
    startPeerSync() {
        // All players sync their owned entities every 200ms
        this.updateInterval = setInterval(() => {
            this.syncOwnedEntities();
        }, 200);
        
        // Listen for entity spawn events from other players
        this.setupEntitySpawnListeners();
    }
    
    /**
     * Sync entities owned by this player
     * Each player is authoritative for entities they spawned
     */
    syncOwnedEntities() {
        if (!this.localPlayerId) return;
        
        // Check if managers are ready
        if (!this.scene.cometManager || !this.scene.alienManager) {
            return;
        }
        
        // Get only comets owned by this player
        const ownedComets = this.scene.cometManager.comets.filter(
            c => c.ownerId === this.localPlayerId
        );
        
        // Get only aliens owned by this player
        const ownedAliens = this.scene.alienManager.aliens.filter(
            a => a.ownerId === this.localPlayerId
        );
        
        // Serialize only owned entities
        const cometData = ownedComets.map((comet) => ({
            id: comet.id,
            ownerId: comet.ownerId,
            x: comet.body.position.x,
            y: comet.body.position.y,
            vx: comet.body.velocity.x,
            vy: comet.body.velocity.y,
            radius: comet.radius,
            depth: comet.depth,
            rotation: comet.rotation,
            rotationSpeed: comet.rotationSpeed
        }));
        
        const alienData = ownedAliens.map((alien) => ({
            id: alien.id,
            ownerId: alien.ownerId,
            x: alien.body.position.x,
            y: alien.body.position.y,
            vx: alien.body.velocity.x,
            vy: alien.body.velocity.y,
            rotation: alien.body.angle,
            health: alien.health,
            isDocked: alien.isDocked,
            aiState: alien.aiState
        }));
        
        // Broadcast owned entities via player state
        if (myPlayer()) {
            myPlayer().setState('ownedComets', cometData, false); // Unreliable for fast updates
            myPlayer().setState('ownedAliens', alienData, false);
        }
        
        // Debug log less rarely to help troubleshoot
        if (Math.random() < 0.01) {
            console.log('[Peer] Syncing owned entities - playerId:', this.localPlayerId, 'comets:', cometData.length, 'aliens:', alienData.length);
        }
    }
    
    /**
     * Setup listeners for entity spawn events from other players
     */
    setupEntitySpawnListeners() {
        // Listen for comet spawn events (set up per player in handlePlayerJoin)
        // Listen for alien spawn events (set up per player in handlePlayerJoin)
    }
    
    /**
     * Broadcast comet spawn to other players
     * Note: Spawns are automatically synced via regular entity sync cycle
     */
    broadcastCometSpawn(comet) {
        // New comets will be synced automatically in the next sync cycle
        // No need for immediate broadcast
    }
    
    /**
     * Broadcast alien spawn to other players
     * Note: Spawns are automatically synced via regular entity sync cycle
     */
    broadcastAlienSpawn(alien) {
        // New aliens will be synced automatically in the next sync cycle
        // No need for immediate broadcast
    }
    
    /**
     * Broadcast alien kill to all players
     * This ensures that when one peer kills an alien, it's removed from all peers
     */
    broadcastAlienKill(alienId) {
        if (!this.isMultiplayerActive()) return;
        
        const me = myPlayer();
        if (!me) return;
        
        // Get current killed aliens list
        const killedAliens = me.getState('killedAliens') || [];
        
        // Add this alien to the killed list with timestamp
        const killData = {
            alienId: alienId,
            timestamp: Date.now()
        };
        
        // Add to list and limit to last 100 kills to prevent unbounded growth
        const updatedKills = [...killedAliens, killData].slice(-100);
        
        // Broadcast reliably to all peers
        me.setState('killedAliens', updatedKills, true);
        
        console.log('[Multiplayer] Broadcasting alien kill:', alienId);
    }
    
    /**
     * Update player state in network
     */
    updatePlayerState(ship, playerState) {
        if (!playerState) return;
        
        // Sync position, angle, and stats (use unreliable for fast updates)
        playerState.setState('x', ship.body.position.x, false);
        playerState.setState('y', ship.body.position.y, false);
        playerState.setState('angle', ship.body.angle, false);
        playerState.setState('vx', ship.body.velocity.x, false);
        playerState.setState('vy', ship.body.velocity.y, false);
        
        // Sync stats reliably (less frequent updates)
        playerState.setState('score', this.scene.cometManager.score, true);
        playerState.setState('health', ship.health, true);
        playerState.setState('fuel', ship.fuel, true);
        playerState.setState('alive', ship.alive, true);
    }
    
    /**
     * Update remote player ships from network state
     */
    updateRemotePlayers() {
        for (const [playerId, playerData] of this.players) {
            if (playerData.isLocal) continue; // Skip local player
            
            const { ship, playerState } = playerData;
            if (!ship || !ship.alive) continue;
            
            // Check for shoot events
            const lastShot = playerState.getState('lastShot');
            if (lastShot && (!playerData.lastProcessedShot || lastShot.timestamp > playerData.lastProcessedShot)) {
                // Create local projectile from remote player's shoot event
                this.createRemotePlayerProjectile(ship, lastShot);
                playerData.lastProcessedShot = lastShot.timestamp;
            }
            
            // Get network state
            const netX = playerState.getState('x');
            const netY = playerState.getState('y');
            const netAngle = playerState.getState('angle');
            const netVx = playerState.getState('vx');
            const netVy = playerState.getState('vy');
            const netHealth = playerState.getState('health');
            const netFuel = playerState.getState('fuel');
            const netAlive = playerState.getState('alive');
            
            // Interpolate position for smooth movement
            if (netX !== undefined && netY !== undefined) {
                const currentX = ship.body.position.x;
                const currentY = ship.body.position.y;
                
                // Use lower lerp factor for smoother interpolation
                const lerpFactor = 0.2;
                const newX = currentX + (netX - currentX) * lerpFactor;
                const newY = currentY + (netY - currentY) * lerpFactor;
                
                this.scene.matter.body.setPosition(ship.body, { x: newX, y: newY });
            }
            
            // Update angle
            if (netAngle !== undefined) {
                this.scene.matter.body.setAngle(ship.body, netAngle);
            }
            
            // Update velocity
            if (netVx !== undefined && netVy !== undefined) {
                this.scene.matter.body.setVelocity(ship.body, { x: netVx, y: netVy });
            }
            
            // Update stats
            if (netHealth !== undefined) ship.health = netHealth;
            if (netFuel !== undefined) ship.fuel = netFuel;
            if (netAlive !== undefined && !netAlive && ship.alive) {
                ship.destroy('Destroyed');
            }
        }
        
        // Sync entities from all players (peer-to-peer)
        // Each player syncs entities owned by other players
        for (const [playerId, playerData] of this.players) {
            if (playerData.isLocal) continue; // Skip local player's entities (we own those)
            
            const { playerState } = playerData;
            
            // Sync comets owned by this remote player
            const ownedComets = playerState.getState('ownedComets');
            if (ownedComets && Array.isArray(ownedComets)) {
                // Debug log occasionally
                if (Math.random() < 0.01) {
                    // console.log('[Peer] Receiving from player', playerId, '- comets:', ownedComets.length);
                }
                this.syncRemotePlayerComets(ownedComets);
            }
            
            // Sync aliens owned by this remote player
            const ownedAliens = playerState.getState('ownedAliens');
            if (ownedAliens && Array.isArray(ownedAliens)) {
                // Debug log occasionally
                if (Math.random() < 0.01) {
                    // console.log('[Peer] Receiving from player', playerId, '- aliens:', ownedAliens.length);
                }
                this.syncRemotePlayerAliens(ownedAliens);
            }
            
            // Listen for alien shoot events from this remote player
            const alienShots = playerState.getState('alienShots');
            if (alienShots && Array.isArray(alienShots)) {
                // Track processed shots per player
                if (!playerData.processedAlienShots) {
                    playerData.processedAlienShots = new Set();
                }
                
                for (const shot of alienShots) {
                    const shotKey = `${shot.alienId}_${shot.timestamp}`;
                    if (!playerData.processedAlienShots.has(shotKey)) {
                        // Create local projectile from remote alien's shoot event
                        this.createAlienProjectile(shot.alienId, shot);
                        playerData.processedAlienShots.add(shotKey);
                        
                        // Clean up old processed shots (keep last 50)
                        if (playerData.processedAlienShots.size > 50) {
                            const shotsArray = Array.from(playerData.processedAlienShots);
                            playerData.processedAlienShots = new Set(shotsArray.slice(-50));
                        }
                    }
                }
            }
            
            // Listen for alien kill events from this remote player
            const killedAliens = playerState.getState('killedAliens');
            if (killedAliens && Array.isArray(killedAliens)) {
                for (const killData of killedAliens) {
                    const killKey = `${killData.alienId}_${killData.timestamp}`;
                    if (!this.processedAlienKills.has(killKey)) {
                        // Remove this alien from our local game
                        this.handleAlienKillFromNetwork(killData.alienId);
                        this.processedAlienKills.add(killKey);
                        
                        // Clean up old processed kills (keep last 100)
                        if (this.processedAlienKills.size > 100) {
                            const killsArray = Array.from(this.processedAlienKills);
                            this.processedAlienKills = new Set(killsArray.slice(-100));
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Sync comets from a remote player
     */
    syncRemotePlayerComets(cometData) {
        const existingComets = new Map();
        for (const comet of this.scene.cometManager.comets) {
            existingComets.set(comet.id, comet);
        }
        
        // Update or create comets from remote player
        for (const data of cometData) {
            if (existingComets.has(data.id)) {
                // Update existing comet with smooth interpolation
                const comet = existingComets.get(data.id);
                
                const currentX = comet.body.position.x;
                const currentY = comet.body.position.y;
                const lerpFactor = 0.15;
                const targetX = currentX + (data.x - currentX) * lerpFactor;
                const targetY = currentY + (data.y - currentY) * lerpFactor;
                
                this.scene.matter.body.setPosition(comet.body, { x: targetX, y: targetY });
                this.scene.matter.body.setVelocity(comet.body, { x: data.vx, y: data.vy });
                
                comet.rotation = data.rotation;
                comet.rotationSpeed = data.rotationSpeed;
                
                existingComets.delete(data.id);
            } else {
                // Create new comet from remote player
                this.scene.cometManager.createCometFromNetwork(data);
            }
        }
    }
    
    /**
     * Sync aliens from a remote player
     */
    syncRemotePlayerAliens(alienData) {
        const existingAliens = new Map();
        for (const alien of this.scene.alienManager.aliens) {
            existingAliens.set(alien.id, alien);
        }
        
        // Update or create aliens from remote player
        for (const data of alienData) {
            if (existingAliens.has(data.id)) {
                // Update existing alien with smooth interpolation
                const alien = existingAliens.get(data.id);
                
                const currentX = alien.body.position.x;
                const currentY = alien.body.position.y;
                const lerpFactor = 0.15;
                const targetX = currentX + (data.x - currentX) * lerpFactor;
                const targetY = currentY + (data.y - currentY) * lerpFactor;
                
                this.scene.matter.body.setPosition(alien.body, { x: targetX, y: targetY });
                this.scene.matter.body.setVelocity(alien.body, { x: data.vx, y: data.vy });
                
                let angleDiff = data.rotation - alien.body.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                const newAngle = alien.body.angle + angleDiff * 0.15;
                this.scene.matter.body.setAngle(alien.body, newAngle);
                
                alien.health = data.health;
                alien.isDocked = data.isDocked;
                alien.aiState = data.aiState;
                
                // If alien health is 0 or negative, destroy it
                if (data.health <= 0 && alien.alive) {
                    alien.destroy();
                }
                
                existingAliens.delete(data.id);
            } else {
                // Don't create aliens that are already dead
                if (data.health <= 0) {
                    continue;
                }
                
                // Create new alien from remote player
                this.scene.alienManager.createAlienFromNetwork(data);
            }
        }
    }
    
    /**
     * Create projectile from remote player's shoot event
     */
    createRemotePlayerProjectile(ship, shotData) {
        const { x, y, angle, color } = shotData;
        
        const projectile = new Projectile(
            this.scene,
            x, y,
            angle,
            {
                damage: C.PROJECTILE_DAMAGE,
                speed: C.PROJECTILE_SPEED,
                lifetime: C.PROJECTILE_LIFETIME,
                color: color || C.PROJECTILE_COLOR,
                owner: 'player'
            }
        );
        
        this.scene.projectiles.push(projectile);
    }
    
    /**
     * Handle alien kill event from network
     * Remove the alien from our local game when another peer kills it
     */
    handleAlienKillFromNetwork(alienId) {
        const alienManager = this.scene.alienManager;
        if (!alienManager) return;
        
        // Find the alien with this ID
        const alienIndex = alienManager.aliens.findIndex(a => a.id === alienId);
        
        if (alienIndex !== -1) {
            const alien = alienManager.aliens[alienIndex];
            console.log('[Multiplayer] Removing alien killed by remote peer:', alienId);
            
            // Destroy the alien (without broadcasting again to avoid loops)
            // We need to avoid calling alien.destroy() which would re-broadcast
            // So we manually clean it up
            alien.alive = false;
            
            // Create explosion for visual feedback
            alien.createExplosion();
            
            // Remove body
            if (alien.body && this.scene.matter.world) {
                this.scene.matter.world.remove(alien.body);
            }
            
            // Remove graphics
            if (alien.graphics) {
                alien.graphics.destroy();
            }
            
            // Remove from manager's array
            alienManager.aliens.splice(alienIndex, 1);
        }
    }
    
    /**
     * Create projectile from alien shoot event
     */
    createAlienProjectile(alienId, shotData) {
        const { x, y, angle } = shotData;
        
        const projectile = new Projectile(
            this.scene,
            x, y,
            angle,
            {
                damage: C.ALIEN_PROJECTILE_DAMAGE,
                speed: C.ALIEN_PROJECTILE_SPEED,
                lifetime: C.ALIEN_PROJECTILE_LIFETIME,
                color: C.ALIEN_PROJECTILE_COLOR,
                owner: 'alien'
            }
        );
        
        this.scene.projectiles.push(projectile);
    }
    
    /**
     * Update leaderboard
     */
    updateLeaderboard() {
        const leaderboardData = [];
        
        for (const [playerId, playerData] of this.players) {
            const { playerState } = playerData;
            const name = playerState.getState('name') || 'Unknown';
            const score = playerState.getState('score') || 0;
            const alive = playerState.getState('alive') !== false;
            
            leaderboardData.push({
                playerId,
                name,
                score,
                alive,
                isLocal: playerData.isLocal
            });
        }
        
        // Sort by score
        leaderboardData.sort((a, b) => b.score - a.score);
        
        // Send to UI
        this.scene.events.emit('updateLeaderboard', leaderboardData);
    }
    
    /**
     * Get all player ships
     */
    getAllShips() {
        const ships = [];
        for (const playerData of this.players.values()) {
            if (playerData.ship && playerData.ship.alive) {
                ships.push(playerData.ship);
            }
        }
        return ships;
    }
    
    /**
     * Get remote player ships (excluding local player)
     */
    getRemoteShips() {
        const ships = [];
        for (const playerData of this.players.values()) {
            if (!playerData.isLocal && playerData.ship && playerData.ship.alive) {
                ships.push(playerData.ship);
            }
        }
        return ships;
    }
    
    /**
     * Get local player data
     */
    getLocalPlayer() {
        return this.players.get(this.localPlayerId);
    }
    
    /**
     * Check if multiplayer is active
     * Returns true if multiplayer mode is enabled, even with only 1 player
     */
    isMultiplayerActive() {
        return this.isInitialized;
    }
    
    /**
     * Update - called every frame
     */
    update() {
        if (!this.isInitialized) return;
        
        // Update local player state (every 3 frames for performance)
        if (this.scene.game.loop.frame % 3 === 0) {
            const localPlayer = this.getLocalPlayer();
            if (localPlayer && localPlayer.ship && localPlayer.ship.alive) {
                this.updatePlayerState(localPlayer.ship, localPlayer.playerState);
            }
        }
        
        // Update remote players from network
        this.updateRemotePlayers();
        
        // Update leaderboard less frequently (every 2 seconds)
        if (this.scene.time.now % 2000 < 20) {
            this.updateLeaderboard();
        }
    }
    
    /**
     * Cleanup
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Destroy all ships
        for (const playerData of this.players.values()) {
            if (playerData.ship) {
                playerData.ship.destroy('Game Ended');
            }
        }
        
        this.players.clear();
    }
}
