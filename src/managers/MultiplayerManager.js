import * as C from '../config/constants.js';

// Playroom Kit is loaded globally via UMD bundle in game.html
const { insertCoin, onPlayerJoin, myPlayer, isHost, getState, setState } = window.Playroom;

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
            
            // Listen for players joining
            onPlayerJoin((playerState) => {
                this.handlePlayerJoin(playerState);
            });
            
            this.isInitialized = true;
            
            // Start periodic sync for host
            if (isHost()) {
                this.startHostSync();
            }
            
            console.log('[Multiplayer] Multiplayer manager ready!');
            
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
        
        // Store player data
        this.players.set(playerId, {
            ship,
            playerState,
            isLocal
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
            
            this.players.delete(playerId);
        }
        
        // Update leaderboard
        this.updateLeaderboard();
    }
    
    /**
     * Start host sync loop - host is authoritative for game state
     */
    startHostSync() {
        // Host syncs game state every 100ms
        this.updateInterval = setInterval(() => {
            this.syncHostState();
        }, 100);
    }
    
    /**
     * Sync game state (host only)
     */
    syncHostState() {
        if (!isHost()) return;
        
        // Serialize all comets
        const cometData = this.scene.cometManager.serializeComets();
        setState('comets', cometData, false); // Use unreliable for faster sync
        
        // Debug log occasionally
        if (Math.random() < 0.01) { // 1% chance to log
            console.log('[Host] Syncing:', cometData.length, 'comets,', this.scene.alienManager.getAliens().length, 'aliens,', this.scene.projectiles.length, 'projectiles');
        }
        
        // Serialize all aliens
        const alienData = this.scene.alienManager.serializeAliens();
        setState('aliens', alienData, false);
        
        // Serialize all projectiles
        const projectileData = this.scene.projectiles.map((proj, index) => ({
            id: index,
            x: proj.body.position.x,
            y: proj.body.position.y,
            vx: proj.body.velocity.x,
            vy: proj.body.velocity.y,
            color: proj.color,
            owner: proj.owner,
            age: proj.age
        }));
        setState('projectiles', projectileData, false);
        
        // Sync world center
        setState('worldCenterX', this.scene.worldCenterX || 0, false);
        setState('worldCenterY', this.scene.worldCenterY || 0, false);
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
                
                const lerpFactor = 0.3; // Smooth interpolation
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
        
        // Sync comets from host (clients only)
        if (!isHost()) {
            const cometData = getState('comets');
            if (cometData && Array.isArray(cometData)) {
                // Debug log occasionally
                if (Math.random() < 0.01) { // 1% chance to log
                    console.log('[Client] Received:', cometData.length, 'comets from host');
                }
                this.scene.cometManager.syncFromNetwork(cometData);
            }
            
            // Sync aliens from host
            const alienData = getState('aliens');
            if (alienData && Array.isArray(alienData)) {
                this.scene.alienManager.syncFromNetwork(alienData);
            }
            
            // Sync projectiles from host
            const projectileData = getState('projectiles');
            if (projectileData && Array.isArray(projectileData)) {
                this.scene.syncProjectilesFromNetwork(projectileData);
            }
            
            // Sync world center from host
            const worldCenterX = getState('worldCenterX');
            const worldCenterY = getState('worldCenterY');
            if (worldCenterX !== undefined && worldCenterY !== undefined) {
                this.scene.worldCenterX = worldCenterX;
                this.scene.worldCenterY = worldCenterY;
            }
        }
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
     */
    isMultiplayerActive() {
        return this.isInitialized && this.players.size > 1;
    }
    
    /**
     * Update - called every frame
     */
    update() {
        if (!this.isInitialized) return;
        
        // Update local player state
        const localPlayer = this.getLocalPlayer();
        if (localPlayer && localPlayer.ship && localPlayer.ship.alive) {
            this.updatePlayerState(localPlayer.ship, localPlayer.playerState);
        }
        
        // Update remote players from network
        this.updateRemotePlayers();
        
        // Update leaderboard periodically
        if (this.scene.time.now % 1000 < 20) { // Roughly once per second
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
