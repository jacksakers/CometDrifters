import * as C from '../config/constants.js';

/**
 * UIScene - Overlay scene for HUD elements
 * Displays score, fuel gauge, docking status, and game over screen
 */
export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }
    
    create() {
        // Get reference to game scene
        this.gameScene = this.scene.get('GameScene');
        
        // Create UI elements
        this.createHeader();
        this.createFuelGauge();
        this.createControlsHint();
        this.createGameOverScreen();
        
        // Listen to game events
        this.gameScene.events.on('updateScore', this.updateScore, this);
        this.gameScene.events.on('updateFuel', this.updateFuel, this);
        this.gameScene.events.on('updateDockStatus', this.updateDockStatus, this);
        this.gameScene.events.on('gameOver', this.showGameOver, this);
        this.gameScene.events.on('gameReset', this.hideGameOver, this);
    }
    
    /**
     * Create header with title and score
     */
    createHeader() {
        // Title
        this.titleText = this.add.text(
            C.UI_PADDING, 
            C.UI_PADDING, 
            'COMET DRIFTERS', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '24px',
                color: C.UI_FONT_COLOR,
                fontStyle: 'bold'
            }
        );
        
        // Score label
        this.add.text(
            C.UI_PADDING, 
            C.UI_PADDING + 35, 
            'Score:', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '14px',
                color: '#ffffff',
                alpha: 0.8
            }
        );
        
        // Score value
        this.scoreText = this.add.text(
            C.UI_PADDING + 55, 
            C.UI_PADDING + 35, 
            '0', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '14px',
                color: '#f9cb28',
                fontStyle: 'bold'
            }
        );
    }
    
    /**
     * Create fuel gauge at bottom of screen
     */
    createFuelGauge() {
        const width = C.GAME_WIDTH;
        const height = C.GAME_HEIGHT;
        const barWidth = 250;
        const barHeight = 25;
        const centerX = width / 2;
        const bottomY = height - 40;
        
        // Label
        this.fuelLabel = this.add.text(
            centerX, 
            bottomY - 25, 
            'FUEL: REGENERATING', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '12px',
                color: '#f9cb28',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        
        // Background bar
        this.fuelBarBg = this.add.rectangle(
            centerX, 
            bottomY, 
            barWidth, 
            barHeight, 
            0x000000, 
            0.5
        );
        this.fuelBarBg.setStrokeStyle(2, 0xffffff, 0.4);
        
        // Fuel bar (gradient approximation with multiple rectangles)
        this.fuelBar = this.add.rectangle(
            centerX, 
            bottomY, 
            barWidth - 4, 
            barHeight - 4, 
            0x4ade80
        ).setOrigin(0.5);
        
        // Store original width for scaling
        this.fuelBarMaxWidth = barWidth - 4;
    }
    
    /**
     * Create controls hint
     */
    createControlsHint() {
        this.controlsText = this.add.text(
            C.GAME_WIDTH / 2, 
            C.GAME_HEIGHT - 10, 
            'Arrow Keys or Touch to Move | S/Down to Dock | ESC to Reset', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '11px',
                color: '#ffffff',
                alpha: 0.4
            }
        ).setOrigin(0.5, 1);
        
        // Fade out after 10 seconds
        this.time.delayedCall(10000, () => {
            this.tweens.add({
                targets: this.controlsText,
                alpha: 0,
                duration: 1000
            });
        });
    }
    
    /**
     * Create game over screen (hidden by default)
     */
    createGameOverScreen() {
        const centerX = C.GAME_WIDTH / 2;
        const centerY = C.GAME_HEIGHT / 2;
        
        // Container for all game over elements
        this.gameOverContainer = this.add.container(0, 0);
        
        // Dark overlay
        const overlay = this.add.rectangle(
            0, 0, 
            C.GAME_WIDTH, 
            C.GAME_HEIGHT, 
            0x000000, 
            0.85
        ).setOrigin(0);
        
        // Box
        const box = this.add.rectangle(
            centerX, 
            centerY, 
            500, 
            300, 
            0x000000, 
            0.9
        );
        box.setStrokeStyle(2, 0x444444);
        
        // Title
        this.gameOverTitle = this.add.text(
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
        this.gameOverReason = this.add.text(
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
        this.gameOverScore = this.add.text(
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
        const button = this.add.rectangle(
            centerX, 
            centerY + 80, 
            200, 
            50, 
            0x4ade80
        );
        button.setInteractive({ useHandCursor: true });
        
        const buttonText = this.add.text(
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
        this.gameOverContainer.add([
            overlay, 
            box, 
            this.gameOverTitle, 
            this.gameOverReason,
            this.gameOverScore, 
            button, 
            buttonText
        ]);
        
        // Hide initially
        this.gameOverContainer.setVisible(false);
        
        // ESC key to restart
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.gameOverContainer.visible) {
                this.restartGame();
            }
        });
    }
    
    /**
     * Update score display
     */
    updateScore(score) {
        this.scoreText.setText(score.toString());
    }
    
    /**
     * Update fuel gauge
     */
    updateFuel(fuelPercent) {
        // Update bar width
        const newWidth = (fuelPercent / 100) * this.fuelBarMaxWidth;
        this.fuelBar.width = newWidth;
        
        // Update color based on fuel level
        if (fuelPercent > 50) {
            this.fuelBar.setFillStyle(0x4ade80); // Green
        } else if (fuelPercent > 20) {
            this.fuelBar.setFillStyle(0xf9cb28); // Yellow
        } else {
            this.fuelBar.setFillStyle(0xff4d4d); // Red
        }
        
        // Update label
        if (fuelPercent < 10) {
            this.fuelLabel.setText('FUEL: CRITICAL');
            this.fuelLabel.setColor('#ff4d4d');
        } else if (fuelPercent < 100) {
            this.fuelLabel.setText('FUEL: REGENERATING');
            this.fuelLabel.setColor('#f9cb28');
        } else {
            this.fuelLabel.setText('FUEL: FULL');
            this.fuelLabel.setColor('#4ade80');
        }
    }
    
    /**
     * Update docking status
     */
    updateDockStatus(isDocked) {
        if (isDocked) {
            this.fuelLabel.setText('DOCKED: REFUELING');
            this.fuelLabel.setColor('#4ade80');
        }
    }
    
    /**
     * Show game over screen
     */
    showGameOver(data) {
        this.gameOverReason.setText(data.reason);
        this.gameOverScore.setText(`Final Score: ${data.score}`);
        this.gameOverContainer.setVisible(true);
        
        // Fade in
        this.gameOverContainer.setAlpha(0);
        this.tweens.add({
            targets: this.gameOverContainer,
            alpha: 1,
            duration: 500
        });
    }
    
    /**
     * Hide game over screen
     */
    hideGameOver() {
        this.gameOverContainer.setVisible(false);
    }
    
    /**
     * Restart the game
     */
    restartGame() {
        this.hideGameOver();
        this.gameScene.resetGame();
    }
    
    /**
     * Cleanup
     */
    shutdown() {
        this.gameScene.events.off('updateScore');
        this.gameScene.events.off('updateFuel');
        this.gameScene.events.off('updateDockStatus');
        this.gameScene.events.off('gameOver');
        this.gameScene.events.off('gameReset');
    }
}
