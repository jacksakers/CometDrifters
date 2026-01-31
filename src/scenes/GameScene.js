import Ship from '../entities/Ship.js';
import Projectile from '../entities/Projectile.js';
import CometManager from '../managers/CometManager.js';
import AlienManager from '../managers/AlienManager.js';
import InputManager from '../managers/InputManager.js';
import MultiplayerManager from '../managers/MultiplayerManager.js';
import * as C from '../config/constants.js';

/**
 * GameScene - Main game loop
 * Handles physics simulation, collision detection, and game state
 */
export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }
    
    preload() {
        // Create simple particle texture
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('particle', 8, 8);
        graphics.destroy();
    }
    
    async create() {
        // Setup Matter.js physics world with expanded bounds
        this.matter.world.setGravity(C.GRAVITY_X, C.GRAVITY_Y);
        
        // Create starfield background
        this.createStarfield();
        
        // Initialize managers
        this.inputManager = new InputManager(this);
        this.cometManager = new CometManager(this);
        this.alienManager = new AlienManager(this);
        this.multiplayerManager = new MultiplayerManager(this);
        
        // Projectile list
        this.projectiles = [];
        
        // Player name text objects (for remote players)
        this.playerNameTexts = new Map();
        
        // Initialize multiplayer (will create ships)
        console.log('[GameScene] Initializing multiplayer...');
        await this.multiplayerManager.initialize();
        
        // Ship will be set by MultiplayerManager
        // this.ship = ... (set in handlePlayerJoin via multiplayerManager)
        
        console.log('[GameScene] Ship created, setting up camera');
        console.log('[GameScene] Ship body position:', this.ship.body.position);
        console.log('[GameScene] Camera bounds before:', this.cameras.main.getBounds());
        
        // No camera bounds - infinite world
        // Remove world bounds too - no boundaries
        
        // Center camera on ship initially (use actual screen dimensions)
        this.cameras.main.scrollX = this.ship.body.position.x - this.scale.width / 2;
        this.cameras.main.scrollY = this.ship.body.position.y - this.scale.height / 2;
        
        console.log('[GameScene] Camera scroll set to:', this.cameras.main.scrollX, this.cameras.main.scrollY);
        
        // Setup collision detection
        this.setupCollisions();
        
        // Game state
        this.gameActive = true;
        
        // World center tracking (persistent origin for spawning)
        // Initialize to starting position, then track average of all players
        this.worldCenterX = C.GAME_WIDTH / 2;
        this.worldCenterY = C.GAME_HEIGHT - 150;
        
        // Start UI scene if not already started
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }
        
        // Listen for ship destruction
        this.events.on('shipDestroyed', this.onShipDestroyed, this);
        
        // Listen for alien destruction (award points)
        this.events.on('alienDestroyed', (points) => {
            const newScore = this.cometManager.score + points;
            this.cometManager.score = newScore;
            this.events.emit('updateScore', newScore);
        });
        
        // Listen for score changes from docking
        this.events.on('dockedScore', (points) => {
            const newScore = this.cometManager.score + points;
            this.cometManager.score = newScore;
            this.events.emit('updateScore', newScore);
        });
        
        // Emit initial fuel update
        this.time.addEvent({
            delay: 100,
            callback: () => {
                this.events.emit('updateFuel', this.ship.getFuelPercent());
            },
            loop: true
        });
    }
    
    /**
     * Create parallax starfield - infinite generation
     */
    createStarfield() {
        this.stars = [];
        this.starGrid = {}; // Track which grid cells have stars
        this.gridSize = 400; // Size of grid cells for star generation
        
        // Generate initial stars around starting position
        this.generateStarsAroundCamera();
    }
    
    /**
     * Create a player ship (called by MultiplayerManager)
     */
    createPlayerShip(x, y, isLocal, playerState) {
        const ship = new Ship(this, x, y, isLocal, playerState);
        
        // Create name text for remote players
        if (!isLocal && playerState) {
            const playerName = playerState.getState('name') || 'Player';
            
            // Safely get player color with fallback
            let color = '#3b82f6';
            try {
                const profile = playerState.getProfile();
                if (profile && profile.color && profile.color.hexString) {
                    color = profile.color.hexString;
                }
            } catch (e) {
                console.warn('[GameScene] Could not get player color for name text, using default');
            }
            
            const nameText = this.add.text(0, 0, playerName, {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '12px',
                color: color,
                stroke: '#000000',
                strokeThickness: 3,
                align: 'center'
            }).setOrigin(0.5, 0.5).setDepth(1000);
            
            this.playerNameTexts.set(ship, nameText);
        }
        
        return ship;
    }
    
    /**
     * Setup collision handlers
     */
    setupCollisions() {
        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;
                
                // Check player-player projectile collision
                if ((bodyA.projectileRef && bodyB.shipRef) || (bodyB.projectileRef && bodyA.shipRef)) {
                    this.handleProjectileShipCollision(bodyA, bodyB);
                }
                
                // Check ship-comet collision (non-lethal now)
                if (this.isShipCometCollision(bodyA, bodyB)) {
                    this.handleShipCometCollision();
                }
                
                // Check projectile-alien collisions
                this.handleProjectileAlienCollision(bodyA, bodyB);
                
                // Check alien projectile-ship collisions
                this.handleAlienProjectileShipCollision(bodyA, bodyB);
                
                // Check projectile-comet collisions
                this.handleProjectileCometCollision(bodyA, bodyB);
            });
        });
    }
    
    /**
     * Handle projectile hitting ship (player vs player or alien)
     */
    handleProjectileShipCollision(bodyA, bodyB) {
        const projectile = bodyA.projectileRef || bodyB.projectileRef;
        const ship = bodyA.shipRef || bodyB.shipRef;
        
        if (projectile && ship && ship.alive) {
            // Don't hit your own ship or if friendly fire is disabled
            if (projectile.owner === 'player' && ship.isLocal) return;
            if (projectile.owner === 'alien' && !ship.isLocal) return; // Aliens only hit players
            
            ship.takeDamage(projectile.damage);
            projectile.hit(ship);
        }
    }
    
    /**
     * Handle projectile hitting alien
     */
    handleProjectileAlienCollision(bodyA, bodyB) {
        const projectile = bodyA.projectileRef || bodyB.projectileRef;
        const alien = bodyA.alienRef || bodyB.alienRef;
        
        if (projectile && alien && projectile.owner === 'player' && alien.alive) {
            alien.takeDamage(projectile.damage);
            projectile.hit(alien);
        }
    }
    
    /**
     * Handle alien projectile hitting ship
     */
    handleAlienProjectileShipCollision(bodyA, bodyB) {
        const projectile = bodyA.projectileRef || bodyB.projectileRef;
        const ship = bodyA.shipRef || bodyB.shipRef;
        
        if (projectile && ship && projectile.owner === 'alien' && ship.alive) {
            ship.takeDamage(projectile.damage);
            projectile.hit(ship);
        }
    }
    
    /**
     * Handle projectile hitting comet
     */
    handleProjectileCometCollision(bodyA, bodyB) {
        const projectile = bodyA.projectileRef || bodyB.projectileRef;
        const comet = bodyA.cometRef || bodyB.cometRef;
        
        if (projectile && comet && projectile.alive) {
            // Projectile is blocked by comet
            projectile.hit(comet);
        }
    }
    
    /**
     * Check if collision is between ship and comet
     */
    isShipCometCollision(bodyA, bodyB) {
        if (!this.ship || !this.ship.alive) return false;
        
        const shipBody = this.ship.body;
        const comets = this.cometManager.getComets();
        
        for (let comet of comets) {
            if ((bodyA === shipBody && bodyB === comet.body) ||
                (bodyB === shipBody && bodyA === comet.body)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Handle ship-comet collision
     */
    handleShipCometCollision() {
        // Comets no longer kill the player
        // Player can land on them safely
        return;
    }
    
    /**
     * Handle ship destruction
     */
    onShipDestroyed(data) {
        const { ship, reason } = data;
        
        // In multiplayer, respawn after a delay
        if (this.multiplayerManager && this.multiplayerManager.isMultiplayerActive()) {
            console.log('[GameScene] Ship destroyed in multiplayer, respawning...', reason);
            
            // Show death message briefly
            if (ship.isLocal) {
                this.events.emit('showDeathMessage', reason);
            }
            
            // Respawn after 2 seconds
            this.time.delayedCall(2000, () => {
                if (ship && !ship.alive) {
                    ship.respawn();
                    
                    // Update health and fuel UI
                    if (ship.isLocal) {
                        this.events.emit('updateHealth', ship.getHealthPercent());
                        this.events.emit('updateFuel', ship.getFuelPercent());
                        this.events.emit('hideDeathMessage');
                    }
                }
            });
        } else {
            // Single player - game over
            this.gameActive = false;
            
            this.time.delayedCall(1000, () => {
                this.events.emit('gameOver', {
                    reason: reason,
                    score: this.cometManager.getScore()
                });
            });
        }
    }
    
    /**
     * Main update loop
     */
    update(time, delta) {
        if (!this.gameActive) return;
        
        // Update world center based on active players
        this.updateWorldCenter();
        
        // Update starfield with parallax effect
        this.updateStarfield();
        
        // Update multiplayer state
        if (this.multiplayerManager) {
            this.multiplayerManager.update();
        }
        
        // Get input state (only for local player)
        const inputState = this.ship ? this.inputManager.update(this.ship) : null;
        
        // Update local ship
        if (this.ship && this.ship.alive && this.ship.isLocal) {
            this.ship.update(inputState, this.cometManager.getComets(), this.alienManager.getAliens());
            
            // Manually update camera to follow ship with smooth lerp
            const targetX = this.ship.body.position.x - this.scale.width / 2;
            const targetY = this.ship.body.position.y - this.scale.height / 2;
            
            // Smooth camera movement with lerp
            this.cameras.main.scrollX += (targetX - this.cameras.main.scrollX) * 0.1;
            this.cameras.main.scrollY += (targetY - this.cameras.main.scrollY) * 0.1;
            
            // Update fuel UI
            this.events.emit('updateFuel', this.ship.getFuelPercent());
            this.events.emit('updateDockStatus', this.ship.isDocked);
        }
        
        // Update remote players (just draw, state comes from network)
        if (this.multiplayerManager) {
            const remotePlayers = this.multiplayerManager.getRemoteShips();
            for (const remoteShip of remotePlayers) {
                if (remoteShip.alive) {
                    remoteShip.draw();
                    
                    // Update name text position
                    const nameText = this.playerNameTexts.get(remoteShip);
                    if (nameText) {
                        nameText.setPosition(
                            remoteShip.body.position.x,
                            remoteShip.body.position.y - C.SHIP_SIZE - 15
                        );
                    }
                }
            }
        }
        
        // Host spawns new comets/aliens, but all clients update and draw them
        const { isHost } = window.Playroom;
        
        // Update comets - each player spawns their own in distributed mode
        this.cometManager.update(this.ship);
        
        // Update aliens - each player spawns their own
        if (this.ship && this.ship.alive) {
            this.alienManager.update(this.ship, this.cometManager.getComets());
        }
        
        // Update projectiles (all clients - update calls draw internally)
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update();
            
            if (!projectile.alive) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    /**
     * Generate stars around current camera position
     */
    generateStarsAroundCamera() {
        const camX = this.cameras.main.scrollX + this.scale.width / 2;
        const camY = this.cameras.main.scrollY + this.scale.height / 2;
        
        // Determine which grid cells are visible
        const minGridX = Math.floor((camX - C.GAME_WIDTH) / this.gridSize);
        const maxGridX = Math.floor((camX + C.GAME_WIDTH) / this.gridSize);
        const minGridY = Math.floor((camY - C.GAME_HEIGHT) / this.gridSize);
        const maxGridY = Math.floor((camY + C.GAME_HEIGHT) / this.gridSize);
        
        // Generate stars for visible grid cells
        for (let gx = minGridX; gx <= maxGridX; gx++) {
            for (let gy = minGridY; gy <= maxGridY; gy++) {
                const gridKey = `${gx},${gy}`;
                
                if (!this.starGrid[gridKey]) {
                    // Generate stars for this grid cell
                    this.starGrid[gridKey] = [];
                    const starsInCell = 20 + Math.floor(Math.random() * 10);
                    
                    for (let i = 0; i < starsInCell; i++) {
                        const star = this.add.circle(
                            gx * this.gridSize + Math.random() * this.gridSize,
                            gy * this.gridSize + Math.random() * this.gridSize,
                            Math.random() * 1.5 + 0.3,
                            0xffffff,
                            Math.random() * 0.6 + 0.3
                        );
                        star.setDepth(-1); // Behind everything
                        this.starGrid[gridKey].push(star);
                    }
                }
            }
        }
        
        // Clean up stars that are far from camera
        const removeDistance = this.gridSize * 3;
        for (const gridKey in this.starGrid) {
            const [gx, gy] = gridKey.split(',').map(Number);
            const gridCenterX = gx * this.gridSize + this.gridSize / 2;
            const gridCenterY = gy * this.gridSize + this.gridSize / 2;
            const distX = Math.abs(gridCenterX - camX);
            const distY = Math.abs(gridCenterY - camY);
            
            if (distX > removeDistance || distY > removeDistance) {
                // Destroy stars in this grid cell
                this.starGrid[gridKey].forEach(star => star.destroy());
                delete this.starGrid[gridKey];
            }
        }
    }
    
    /**
     * Update world center based on active players
     */
    updateWorldCenter() {
        // Calculate average position of all alive players
        const allShips = this.multiplayerManager ? this.multiplayerManager.getAllShips() : [];
        
        if (allShips.length === 0 && this.ship && this.ship.alive) {
            // Single player or only local ship
            this.worldCenterX = this.ship.body.position.x;
            this.worldCenterY = this.ship.body.position.y;
        } else if (allShips.length > 0) {
            // Multiplayer - use average of all alive players
            let sumX = 0;
            let sumY = 0;
            let count = 0;
            
            for (const ship of allShips) {
                if (ship.alive) {
                    sumX += ship.body.position.x;
                    sumY += ship.body.position.y;
                    count++;
                }
            }
            
            if (count > 0) {
                this.worldCenterX = sumX / count;
                this.worldCenterY = sumY / count;
            }
        }
        // If no alive players, keep last known world center
    }
    
    /**
     * Update starfield with parallax
     */
    updateStarfield() {
        // Generate stars around camera as it moves
        if (this.game.loop.frame % 10 === 0) {
            this.generateStarsAroundCamera();
        }
    }
    
    /**
     * Reset game state
     */
    resetGame() {
        // Clear existing entities
        if (this.ship) {
            this.ship.graphics.destroy();
            if (this.ship.body) {
                this.matter.world.remove(this.ship.body);
            }
        }
        
        this.cometManager.reset();
        this.alienManager.reset();
        
        // Clear projectiles
        for (let projectile of this.projectiles) {
            projectile.destroy();
        }
        this.projectiles = [];
        
        // Recreate ship
        this.ship = new Ship(
            this, 
            C.GAME_WIDTH / 2, 
            C.GAME_HEIGHT - 150
        );
        
        this.gameActive = true;
        
        // Emit initial states
        this.events.emit('updateScore', 0);
        this.events.emit('updateFuel', 100);
        this.events.emit('gameReset');
    }
    
    /**
     * Cleanup
     */
    shutdown() {
        this.events.off('shipDestroyed');
        this.events.off('scoreChanged');
        this.events.off('alienDestroyed');
        
        if (this.inputManager) {
            this.inputManager.destroy();
        }
        
        if (this.cometManager) {
            this.cometManager.destroy();
        }
        
        if (this.alienManager) {
            this.alienManager.destroy();
        }
    }
}
