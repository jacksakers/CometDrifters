import * as C from '../config/constants.js';

/**
 * InputManager - Abstracts input from keyboard/touch/gamepad
 * Converts various input sources into generic actions
 * Uses Playroom Kit joystick for mobile/touch controls
 */
export default class InputManager {
    constructor(scene) {
        this.scene = scene;
        
        // Detect if mobile device
        this.isMobile = this.detectMobile();
        
        // Current input state
        this.state = {
            thrust: false,
            rotateLeft: false,
            rotateRight: false,
            dock: false,
            brake: false,
            shoot: false,
            special: false,
            lockOn: false
        };
        
        // Playroom joystick (set by MultiplayerManager when player joins)
        this.joystick = null;
        
        // Lock-on toggle state
        this.lockOnToggled = false;
        this.lastLockOnPressed = false;
        this.lastShiftPressed = false; // Track keyboard shift key for toggle
        
        // Setup keyboard input
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.wKey = scene.input.keyboard.addKey('W');
        this.aKey = scene.input.keyboard.addKey('A');
        this.sKey = scene.input.keyboard.addKey('S');
        this.dKey = scene.input.keyboard.addKey('D');
        this.spaceKey = scene.input.keyboard.addKey('SPACE');
        this.zKey = scene.input.keyboard.addKey('Z');
        this.xKey = scene.input.keyboard.addKey('X');
        this.shiftKey = scene.input.keyboard.addKey('SHIFT');
    }
    
    /**
     * Detect if running on mobile device
     */
    detectMobile() {
        // Check if touch is available and screen is small
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= C.MOBILE_BREAKPOINT;
        
        // Also check user agent for mobile devices
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        return (hasTouch && isSmallScreen) || isMobileUA;
    }
    
    /**
     * Set Playroom joystick (called by MultiplayerManager)
     */
    setJoystick(joystick) {
        this.joystick = joystick;
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
            brake: false,
            shoot: false,
            special: false,
            lockOn: false
        };
        
        // Playroom joystick input (takes priority if available)
        if (this.joystick) {
            this.updateJoystickInput(ship);
        }
        
        // Always also read keyboard input (so desktop users can use keyboard)
        this.updateKeyboardInput();
        
        return this.state;
    }
    
    /**
     * Process Playroom joystick input
     */
    updateJoystickInput(ship) {
        if (!this.joystick) return;
        
        // Check if joystick is actually being pressed/moved
        if (this.joystick.isJoystickPressed()) {
            let angle = this.joystick.angle();
            
            // Adjust joystick angle to match ship coordinate system
            // Negate the angle to flip the Y-axis (joystick Y is inverted from physics Y)
            if (angle !== null) {
                angle = -angle;
                // rotate the angle by 90 degrees CCW to align with ship forward direction
                angle += Math.PI / 2;
                
                // Normalize to -PI to PI range
                while (angle > Math.PI) angle -= Math.PI * 2;
                while (angle < -Math.PI) angle += Math.PI * 2;
            }
            
            // Joystick angle controls ship direction
            // Compare joystick angle to ship's current angle and rotate towards it
            if (ship && ship.body && angle !== null) {
                let currentAngle = ship.body.angle;
                
                // Normalize current ship angle to -PI to PI range
                while (currentAngle > Math.PI) currentAngle -= Math.PI * 2;
                while (currentAngle < -Math.PI) currentAngle += Math.PI * 2;
                
                // Calculate the difference between joystick angle and ship angle
                let angleDiff = angle - currentAngle;
                
                // Normalize angle difference to -PI to PI range
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                // Rotate towards the target angle
                const rotationThreshold = 0.15; // Dead zone for rotation
                if (Math.abs(angleDiff) > rotationThreshold) {
                    if (angleDiff > 0) {
                        this.state.rotateRight = true;
                    } else {
                        this.state.rotateLeft = true;
                    }
                }
                
                // Thrust when joystick is pressed (and not pointing down)
                this.state.thrust = true;
                // }

                // Log all of the above data for debugging
                console.log(`Joystick Angle: ${angle.toFixed(2)}, Ship Angle: ${currentAngle.toFixed(2)}, Thrust: ${this.state.thrust}, RotateLeft: ${this.state.rotateLeft}, RotateRight: ${this.state.rotateRight}, Dock: ${this.state.dock}, Brake: ${this.state.brake}`);
            }
        }
        
        // Shoot button
        if (this.joystick.isPressed('shoot')) {
            this.state.shoot = true;
        }
        
        // Lock-on as a toggle switch
        const lockOnPressed = this.joystick.isPressed('lockOn');
        if (lockOnPressed && !this.lastLockOnPressed) {
            // Button just pressed, toggle the state
            this.lockOnToggled = !this.lockOnToggled;
        }
        this.lastLockOnPressed = lockOnPressed;
        
        // Set state based on toggle
        if (this.lockOnToggled) {
            this.state.lockOn = true;
        }
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
        
        // Combat controls
        if (this.zKey.isDown) {
            this.state.shoot = true;
        }
        
        if (this.xKey.isDown) {
            this.state.special = true;
        }
        
        // Lock-on targeting - toggle on/off with shift key
        const shiftPressed = this.shiftKey.isDown;
        if (shiftPressed && !this.lastShiftPressed) {
            // Shift just pressed, toggle the state
            this.lockOnToggled = !this.lockOnToggled;
        }
        this.lastShiftPressed = shiftPressed;
        
        // Set state based on toggle
        if (this.lockOnToggled) {
            this.state.lockOn = true;
        }
    }
    
    /**
     * Get current input state
     */
    getState() {
        return this.state;
    }
    
    /**
     * Check if in mobile mode
     */
    isMobileMode() {
        return this.isMobile;
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
        this.joystick = null;
    }
}
