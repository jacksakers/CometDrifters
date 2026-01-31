import * as C from '../config/constants.js';

/**
 * DeathMessage component - displays death screen in multiplayer with respawn countdown
 */
export default class DeathMessage {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
    }
    
    show(reason) {
        const centerX = C.GAME_WIDTH / 2;
        const centerY = C.GAME_HEIGHT / 2;
        
        // Create death message container
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(10000);
        
        // Background overlay
        const overlay = this.scene.add.graphics();
        overlay.fillStyle(0x000000, 0.6);
        overlay.fillRect(0, 0, C.GAME_WIDTH, C.GAME_HEIGHT);
        
        // Death title
        const title = this.scene.add.text(
            centerX,
            centerY - 40,
            'YOU DIED',
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '48px',
                color: '#ff4d4d',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        
        // Reason
        const reasonText = this.scene.add.text(
            centerX,
            centerY + 10,
            reason,
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '20px',
                color: '#ffffff',
                alpha: 0.8
            }
        ).setOrigin(0.5);
        
        // Respawn message
        const respawnText = this.scene.add.text(
            centerX,
            centerY + 50,
            'Respawning in 2 seconds...',
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '16px',
                color: '#4ade80',
                alpha: 0.9
            }
        ).setOrigin(0.5);
        
        this.container.add([overlay, title, reasonText, respawnText]);
        
        // Fade in
        this.container.setAlpha(0);
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 200
        });
    }
    
    hide() {
        if (this.container) {
            this.scene.tweens.add({
                targets: this.container,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    this.container.destroy();
                    this.container = null;
                }
            });
        }
    }
    
    destroy() {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
    }
}
