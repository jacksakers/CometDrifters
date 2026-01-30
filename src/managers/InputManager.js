import * as C from '../config/constants.js';

/**
 * InputManager - Abstracts input from keyboard/touch/gamepad
 * Converts various input sources into generic actions
 * This makes it easy to later add Playroom Kit mobile controls
 */
export default class InputManager {
    constructor(scene) {
        this.scene = scene;
        
        // Current input state
        this.state = {
            thrust: false,
            rotateLeft: false,
            rotateRight: false,
            dock: false,
            brake: false
        };
        
        // Setup keyboard input
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.wKey = scene.input.keyboard.addKey('W');
        this.aKey = scene.input.keyboard.addKey('A');
        this.sKey = scene.input.keyboard.addKey('S');
        this.dKey = scene.input.keyboard.addKey('D');
        this.spaceKey = scene.input.keyboard.addKey('SPACE');
        
        // Touch controls
        this.touchActive = false;
        this.touchX = null;
        this.touchY = null;
        this.lastShipAngle = 0;
        
        // Setup touch listeners
        this.setupTouchControls();
    }
    
    /**
     * Setup touch control handlers
     */
    setupTouchControls() {
        this.scene.input.on('pointerdown', (pointer) => {
            this.touchActive = true;
            this.touchX = pointer.x;
            this.touchY = pointer.y;
        });
        
        this.scene.input.on('pointermove', (pointer) => {
            if (this.touchActive) {
                this.touchX = pointer.x;
                this.touchY = pointer.y;
            }
        });
        
        this.scene.input.on('pointerup', () => {
            this.touchActive = false;
            this.touchX = null;
            this.touchY = null;
        });
    }
    
    /**
     * Update input state - call this every frame
     */
    update(ship) {
        // Reset state
        this.state = {
            thrust: false,
            rotateLeft: false,
            rotateRight: false,
            dock: false,
            brake: false
        };
        
        // Keyboard input
        this.updateKeyboardInput();
        
        // Touch input (if ship exists)
        if (ship && ship.alive) {
            this.updateTouchInput(ship);
        }
        
        return this.state;
    }
    
    /**
     * Process keyboard input
     */
    updateKeyboardInput() {
        // Thrust
        if (this.cursors.up.isDown || this.wKey.isDown || this.spaceKey.isDown) {
            this.state.thrust = true;
        }
        
        // Rotation
        if (this.cursors.left.isDown || this.aKey.isDown) {
            this.state.rotateLeft = true;
        }
        
        if (this.cursors.right.isDown || this.dKey.isDown) {
            this.state.rotateRight = true;
        }
        
        // Dock/Brake
        if (this.cursors.down.isDown || this.sKey.isDown) {
            this.state.dock = true;
            this.state.brake = true;
        }
    }
    
    /**
     * Process touch input
     * Touch on left half = rotate toward finger
     * Touch on right half = thrust toward finger
     */
    updateTouchInput(ship) {
        if (!this.touchActive || this.touchX === null || this.touchY === null) {
            return;
        }
        
        const shipX = ship.body.position.x;
        const shipY = ship.body.position.y;
        const screenWidth = this.scene.cameras.main.width;
        
        // Calculate angle to touch point
        const dx = this.touchX - shipX;
        const dy = this.touchY - shipY;
        const targetAngle = Math.atan2(dy, dx);
        
        // Normalize angles to -PI to PI
        let currentAngle = ship.body.angle;
        while (currentAngle > Math.PI) currentAngle -= Math.PI * 2;
        while (currentAngle < -Math.PI) currentAngle += Math.PI * 2;
        
        let angleDiff = targetAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Determine rotation direction
        if (Math.abs(angleDiff) > 0.1) { // Deadzone
            if (angleDiff > 0) {
                this.state.rotateRight = true;
            } else {
                this.state.rotateLeft = true;
            }
        }
        
        // If touch is on right half or ship is roughly pointing at target, thrust
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (this.touchX > screenWidth / 2 || 
            (Math.abs(angleDiff) < 0.3 && distance > 50)) {
            this.state.thrust = true;
        }
        
        this.lastShipAngle = currentAngle;
    }
    
    /**
     * Get current input state
     */
    getState() {
        return this.state;
    }
    
    /**
     * Check if specific action is active
     */
    isActionActive(action) {
        return this.state[action] || false;
    }
    
    /**
     * Cleanup
     */
    destroy() {
        // Remove touch listeners
        this.scene.input.off('pointerdown');
        this.scene.input.off('pointermove');
        this.scene.input.off('pointerup');
    }
}
