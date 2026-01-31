import * as C from '../config/constants.js';

/**
 * ControlsHint component - displays keyboard controls hint (desktop only)
 */
export default class ControlsHint {
    constructor(scene) {
        this.scene = scene;
        this.elements = [];
        this.create();
    }
    
    create() {
        const bounds = this.scene.getUIBounds();
        const isMobile = this.scene.gameScene.inputManager.isMobileMode();
        
        // Hide controls hint on mobile (joystick is self-explanatory)
        this.controlsText = this.scene.add.text(
            bounds.centerX, 
            bounds.height - 10, 
            'Arrow Keys: Move | Z: Laser | SPACE: Engage Auto Lock-On | ESC: Relaunch', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '11px',
                color: '#ffffff',
                alpha: 0.4
            }
        ).setOrigin(0.5, 1).setScrollFactor(0).setVisible(!isMobile);
        this.elements.push(this.controlsText);
        
        // Fade out after 10 seconds (only if visible)
        // if (!isMobile) {
        //     this.scene.time.delayedCall(10000, () => {
        //         this.scene.tweens.add({
        //             targets: this.controlsText,
        //             alpha: 0,
        //             duration: 1000
        //         });
        //     });
        // }
    }
    
    reposition() {
        const bounds = this.scene.getUIBounds();
        
        if (this.controlsText) {
            this.controlsText.setPosition(bounds.centerX, bounds.height - 10);
        }
    }
    
    destroy() {
        this.elements.forEach(el => el.destroy());
        this.elements = [];
    }
}
