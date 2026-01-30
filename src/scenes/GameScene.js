import Ship from '../entities/Ship.js';
import CometManager from '../managers/CometManager.js';
import InputManager from '../managers/InputManager.js';
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
    
    create() {
        // Setup Matter.js physics world with expanded bounds
        this.matter.world.setGravity(C.GRAVITY_X, C.GRAVITY_Y);
        
        // Create starfield background
        this.createStarfield();
        
        // Initialize managers
        this.inputManager = new InputManager(this);
        this.cometManager = new CometManager(this);
        
        // Create player ship
        console.log('[GameScene] Creating ship at center:', C.GAME_WIDTH / 2, C.GAME_HEIGHT - 150);
        this.ship = new Ship(
            this, 
            C.GAME_WIDTH / 2, 
            C.GAME_HEIGHT - 150
        );
        
        console.log('[GameScene] Ship created, setting up camera');
        console.log('[GameScene] Ship body position:', this.ship.body.position);
        console.log('[GameScene] Camera bounds before:', this.cameras.main.getBounds());
        
        // No camera bounds - infinite world
        // Remove world bounds too - no boundaries
        
        // Center camera on ship initially
        this.cameras.main.scrollX = this.ship.body.position.x - C.GAME_WIDTH / 2;
        this.cameras.main.scrollY = this.ship.body.position.y - C.GAME_HEIGHT / 2;
        
        console.log('[GameScene] Camera scroll set to:', this.cameras.main.scrollX, this.cameras.main.scrollY);
        
        // Setup collision detection
        this.setupCollisions();
        
        // Game state
        this.gameActive = true;
        
        // Start UI scene if not already started
        if (!this.scene.isActive('UIScene')) {
            this.scene.launch('UIScene');
        }
        
        // Listen for ship destruction
        this.events.on('shipDestroyed', this.onShipDestroyed, this);
        
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
     * Setup collision handlers
     */
    setupCollisions() {
        // Ship collides with comet
        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;
                
                // Check if ship hit a comet
                if (this.isShipCometCollision(bodyA, bodyB)) {
                    this.handleShipCometCollision();
                }
            });
        });
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
    onShipDestroyed(reason) {
        this.gameActive = false;
        
        // Emit game over event to UI
        this.time.delayedCall(1000, () => {
            this.events.emit('gameOver', {
                reason: reason,
                score: this.cometManager.getScore()
            });
        });
    }
    
    /**
     * Main update loop
     */
    update(time, delta) {
        if (!this.gameActive) return;
        
        // Debug: Log camera and ship position every 120 frames
        if (this.game.loop.frame % 120 === 0 && this.ship) {
            console.log('[GameScene] Camera:', {
                x: this.cameras.main.scrollX,
                y: this.cameras.main.scrollY,
                shipX: this.ship.body.position.x,
                shipY: this.ship.body.position.y
            });
        }
        
        // Update starfield with parallax effect
        this.updateStarfield();
        
        // Get input state
        const inputState = this.inputManager.update(this.ship);
        
        // Update ship
        if (this.ship) {
            this.ship.update(inputState, this.cometManager.getComets());
            
            // Manually update camera to follow ship with smooth lerp
            const targetX = this.ship.body.position.x - C.GAME_WIDTH / 2;
            const targetY = this.ship.body.position.y - C.GAME_HEIGHT / 2;
            
            // Smooth camera movement with lerp
            this.cameras.main.scrollX += (targetX - this.cameras.main.scrollX) * 0.1;
            this.cameras.main.scrollY += (targetY - this.cameras.main.scrollY) * 0.1;
            
            // Update fuel UI
            this.events.emit('updateFuel', this.ship.getFuelPercent());
            this.events.emit('updateDockStatus', this.ship.isDocked);
        }
        
        // Update comet manager
        this.cometManager.update(this.ship);
    }
    
    /**
     * Generate stars around current camera position
     */
    generateStarsAroundCamera() {
        const camX = this.cameras.main.scrollX + C.GAME_WIDTH / 2;
        const camY = this.cameras.main.scrollY + C.GAME_HEIGHT / 2;
        
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
        
        if (this.inputManager) {
            this.inputManager.destroy();
        }
        
        if (this.cometManager) {
            this.cometManager.destroy();
        }
    }
}
