import * as C from '../config/constants.js';

/**
 * GameOverScreen component - displays game over overlay with restart button
 */
export default class GameOverScreen {
    constructor(scene) {
        this.scene = scene;
        this.create();
    }
    
    create() {
        const centerX = C.GAME_WIDTH / 2;
        const centerY = C.GAME_HEIGHT / 2;
        
        // Container for all game over elements
        this.container = this.scene.add.container(0, 0);
        
        // Dark overlay
        const overlay = this.scene.add.rectangle(
            0, 0, 
            C.GAME_WIDTH, 
            C.GAME_HEIGHT, 
            0x000000, 
            0.85
        ).setOrigin(0);
        
        // Box
        const box = this.scene.add.rectangle(
            centerX, 
            centerY, 
            500, 
            300, 
            0x000000, 
            0.9
        );
        box.setStrokeStyle(2, 0x444444);
        
        // Title
        this.title = this.scene.add.text(
            centerX, 
            centerY - 80, 
            'CRITICAL FAILURE', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '32px',
                color: '#ff4d4d',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        
        // Reason
        this.reason = this.scene.add.text(
            centerX, 
            centerY - 30, 
            '', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '18px',
                color: '#ffffff',
                alpha: 0.8
            }
        ).setOrigin(0.5);
        
        // Final score
        this.score = this.scene.add.text(
            centerX, 
            centerY + 10, 
            'Final Score: 0', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '20px',
                color: '#f9cb28',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        
        // Restart button
        const button = this.scene.add.rectangle(
            centerX, 
            centerY + 80, 
            200, 
            50, 
            0x4ade80
        );
        button.setInteractive({ useHandCursor: true });
        
        const buttonText = this.scene.add.text(
            centerX, 
            centerY + 80, 
            'RELAUNCH', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '18px',
                color: '#050510',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);

        // ESC hint
        const escHint = this.scene.add.text(
            centerX, 
            centerY + 130,
            'Press ESC to Restart',
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '12px',
                color: '#ffffff',
                alpha: 0.6
            }
        ).setOrigin(0.5);
        
        // Button interactions
        button.on('pointerover', () => {
            button.setFillStyle(0x22c55e);
        });
        
        button.on('pointerout', () => {
            button.setFillStyle(0x4ade80);
        });
        
        button.on('pointerdown', () => {
            this.restartGame();
        });
        
        // Add all to container
        this.container.add([
            overlay, 
            box, 
            this.title, 
            this.reason,
            this.score, 
            button, 
            buttonText,
            escHint
        ]);
        
        // Hide initially
        this.container.setVisible(false);
        
        // ESC key to restart
        this.scene.input.keyboard.on('keydown-ESC', () => {
            if (this.container.visible) {
                this.restartGame();
            }
        });
    }
    
    show(data) {
        this.reason.setText(data.reason);
        this.score.setText(`Final Score: ${data.score}`);
        this.container.setVisible(true);
        
        // Fade in
        this.container.setAlpha(0);
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 500
        });
    }
    
    hide() {
        this.container.setVisible(false);
    }
    
    restartGame() {
        this.hide();
        this.scene.gameScene.resetGame();
    }
    
    destroy() {
        this.container.destroy();
    }
}
