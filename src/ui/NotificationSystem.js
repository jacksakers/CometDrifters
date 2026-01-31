import * as C from '../config/constants.js';

/**
 * NotificationSystem component - displays temporary notifications (e.g., player joined)
 */
export default class NotificationSystem {
    constructor(scene) {
        this.scene = scene;
        this.queue = [];
        this.current = null;
    }
    
    showPlayerJoined(playerName) {
        const notification = {
            text: `${playerName} joined!`,
            color: '#4ade80',
            duration: 3000
        };
        
        this.queue.push(notification);
        
        // Process queue if no notification is showing
        if (!this.current) {
            this.showNext();
        }
    }
    
    showNext() {
        if (this.queue.length === 0) {
            this.current = null;
            return;
        }
        
        const notification = this.queue.shift();
        
        const centerX = C.GAME_WIDTH / 2;
        const y = 120;
        
        // Create notification background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.8);
        bg.fillRoundedRect(centerX - 150, y - 15, 300, 40, 8);
        bg.lineStyle(2, notification.color === '#4ade80' ? 0x4ade80 : 0xff6600, 1);
        bg.strokeRoundedRect(centerX - 150, y - 15, 300, 40, 8);
        
        // Create notification text
        const text = this.scene.add.text(
            centerX, 
            y + 5, 
            notification.text, 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '16px',
                color: notification.color,
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        
        this.current = { bg, text };
        
        // Animate in
        bg.setAlpha(0);
        text.setAlpha(0);
        
        this.scene.tweens.add({
            targets: [bg, text],
            alpha: 1,
            duration: 300,
            onComplete: () => {
                // Wait then fade out
                this.scene.time.delayedCall(notification.duration, () => {
                    this.scene.tweens.add({
                        targets: [bg, text],
                        alpha: 0,
                        duration: 300,
                        onComplete: () => {
                            bg.destroy();
                            text.destroy();
                            this.showNext();
                        }
                    });
                });
            }
        });
    }
    
    destroy() {
        if (this.current) {
            this.current.bg.destroy();
            this.current.text.destroy();
        }
        this.queue = [];
    }
}
