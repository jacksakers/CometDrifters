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
        
        // Setup camera bounds (expanded world)
        this.cameras.main.setBounds(0, 0, C.GAME_WIDTH * 3, C.GAME_HEIGHT * 3);
        
        // Center camera on ship initially
        this.cameras.main.scrollX = this.ship.body.position.x - C.GAME_WIDTH / 2;
        this.cameras.main.scrollY = this.ship.body.position.y - C.GAME_HEIGHT / 2;
        
        console.log('[GameScene] Camera bounds after:', this.cameras.main.getBounds());
        console.log('[GameScene] Camera scroll set to:', this.cameras.main.scrollX, this.cameras.main.scrollY);
        
        // Expand world bounds so ship doesn't hit edges
        this.matter.world.setBounds(0, 0, C.GAME_WIDTH * 3, C.GAME_HEIGHT * 3);
        
        console.log('[GameScene] World bounds set to:', C.GAME_WIDTH * 3, 'x', C.GAME_HEIGHT * 3);
        
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
        
        // Listen for score changes
        this.events.on('scoreChanged', (score) => {
            this.events.emit('updateScore', score);
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
     * Create parallax starfield
     */
    createStarfield() {
        this.stars = [];
        
        for (let i = 0; i < 150; i++) {
            const star = this.add.circle(
                Math.random() * C.GAME_WIDTH,
                Math.random() * C.GAME_HEIGHT,
                Math.random() * 1.5,
                0xffffff,
                Math.random() * 0.8 + 0.2
            );
            star.speed = Math.random() * 0.5 + 0.2;
            this.stars.push(star);
        }
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
        if (!this.ship || !this.ship.alive) return;
        
        // Only destroy if not docked and moving fast
        if (!this.ship.isDocked) {
            this.ship.destroy('Collision Detected');
        }
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
     * Update starfield with parallax
     */
    updateStarfield() {
        this.stars.forEach(star => {
            star.y += star.speed;
            star.x += star.speed * 0.5; // Diagonal movement
            
            // Wrap around
            if (star.y > C.GAME_HEIGHT) {
                star.y = 0;
                star.x = Math.random() * C.GAME_WIDTH;
            }
            if (star.x > C.GAME_WIDTH) {
                star.x = 0;
            }
        });
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
