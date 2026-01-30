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
        this.createCombatUI();
        this.createFuelGauge();
        this.createControlsHint();
        this.createGameOverScreen();
        this.createLeaderboard();
        this.createNotificationSystem();
        this.createPlayerTracking();
        
        // Listen to game events
        this.gameScene.events.on('updateScore', this.updateScore, this);
        this.gameScene.events.on('updateFuel', this.updateFuel, this);
        this.gameScene.events.on('updateHealth', this.updateHealth, this);
        this.gameScene.events.on('updateLaserCharge', this.updateLaserCharge, this);
        this.gameScene.events.on('updateDockStatus', this.updateDockStatus, this);
        this.gameScene.events.on('lockOnTarget', this.updateLockOn, this);
        this.gameScene.events.on('gameOver', this.showGameOver, this);
        this.gameScene.events.on('gameReset', this.hideGameOver, this);
        this.gameScene.events.on('updateLeaderboard', this.updateLeaderboard, this);
        this.gameScene.events.on('playerJoined', this.showPlayerJoinNotification, this);
    }
    
    /**
     * Create header with title and score
     */
    createHeader() {
        // Title
        this.titleText = this.add.text(
            C.UI_PADDING, 
            C.UI_PADDING, 
            'COMET CHASERS', 
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
     * Create combat UI - health, laser charge, special weapon
     */
    createCombatUI() {
        const rightX = C.GAME_WIDTH - C.UI_PADDING;
        const topY = C.UI_PADDING;
        
        // Health Bar
        this.add.text(
            rightX, 
            topY, 
            'HULL', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '12px',
                color: '#ffffff',
                alpha: 0.8,
                fontStyle: 'bold'
            }
        ).setOrigin(1, 0);
        
        const healthBarWidth = 200;
        const healthBarHeight = 20;
        const healthBarY = topY + 20;
        
        // Health background
        this.healthBarBg = this.add.rectangle(
            rightX - healthBarWidth / 2,
            healthBarY,
            healthBarWidth,
            healthBarHeight,
            0x000000,
            0.6
        ).setOrigin(0.5, 0);
        this.healthBarBg.setStrokeStyle(2, 0xffffff, 0.4);
        
        // Health bar (green)
        this.healthBar = this.add.rectangle(
            rightX - healthBarWidth / 2,
            healthBarY,
            healthBarWidth - 4,
            healthBarHeight - 4,
            0x00ff00
        ).setOrigin(0.5, 0);
        
        this.healthBarMaxWidth = healthBarWidth - 4;
        
        // Laser Charge Bar
        const laserY = healthBarY + 40;
        
        this.add.text(
            rightX, 
            laserY, 
            'LASER', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '12px',
                color: '#00ffff',
                alpha: 0.8,
                fontStyle: 'bold'
            }
        ).setOrigin(1, 0);
        
        const laserBarY = laserY + 20;
        
        // Laser background
        this.laserBarBg = this.add.rectangle(
            rightX - healthBarWidth / 2,
            laserBarY,
            healthBarWidth,
            healthBarHeight,
            0x000000,
            0.6
        ).setOrigin(0.5, 0);
        this.laserBarBg.setStrokeStyle(2, 0x00ffff, 0.4);
        
        // Laser bar (cyan)
        this.laserBar = this.add.rectangle(
            rightX - healthBarWidth / 2,
            laserBarY,
            healthBarWidth - 4,
            healthBarHeight - 4,
            0x00ffff
        ).setOrigin(0.5, 0);
        
        this.laserBarMaxWidth = healthBarWidth - 4;
        
        // Special Weapon Slot (placeholder)
        const specialY = laserBarY + 50;
        
        this.add.text(
            rightX, 
            specialY, 
            'SPECIAL', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '12px',
                color: '#ff00ff',
                alpha: 0.5,
                fontStyle: 'bold'
            }
        ).setOrigin(1, 0);
        
        const specialSlotY = specialY + 20;
        
        // Special weapon slot (empty for now)
        this.specialSlot = this.add.rectangle(
            rightX - 30,
            specialSlotY,
            50,
            50,
            0x000000,
            0.6
        ).setOrigin(0.5, 0);
        this.specialSlot.setStrokeStyle(2, 0xff00ff, 0.3);
        
        // "EMPTY" text
        this.add.text(
            rightX - 30,
            specialSlotY + 25,
            'EMPTY',
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '10px',
                color: '#ff00ff',
                alpha: 0.3
            }
        ).setOrigin(0.5);
        
        // Lock-On Indicator (centered at top)
        this.lockOnIndicator = this.add.text(
            C.GAME_WIDTH / 2,
            C.UI_PADDING,
            '\u25c4 LOCKED ON \u25ba',
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '16px',
                color: '#ff0000',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5, 0).setVisible(false);
        
        // Pulsing animation for lock-on
        this.lockOnTween = this.tweens.add({
            targets: this.lockOnIndicator,
            alpha: { from: 1, to: 0.4 },
            scale: { from: 1, to: 1.1 },
            duration: 500,
            yoyo: true,
            repeat: -1,
            paused: true
        });
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
            'Arrow Keys: Move | S: Dock | Z: Laser | SHIFT: Lock-On | ESC: Reset', 
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

        // add text saying "Press ESC to restart" below the button
        const escHint = this.add.text(
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
        this.gameOverContainer.add([
            overlay, 
            box, 
            this.gameOverTitle, 
            this.gameOverReason,
            this.gameOverScore, 
            button, 
            buttonText,
            escHint
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
     * Update health bar
     */
    updateHealth(healthPercent) {
        // Update bar width
        const newWidth = (healthPercent / 100) * this.healthBarMaxWidth;
        this.healthBar.width = newWidth;
        
        // Update color based on health
        if (healthPercent > 50) {
            this.healthBar.setFillStyle(0x00ff00); // Green
        } else if (healthPercent > 25) {
            this.healthBar.setFillStyle(0xffff00); // Yellow
        } else {
            this.healthBar.setFillStyle(0xff0000); // Red
        }
    }
    
    /**
     * Update laser charge bar
     */
    updateLaserCharge(chargePercent) {
        // Update bar width
        const newWidth = (chargePercent / 100) * this.laserBarMaxWidth;
        this.laserBar.width = newWidth;
        
        // Update color and alpha based on charge
        if (chargePercent >= 100) {
            this.laserBar.setFillStyle(0x00ffff); // Full cyan
            this.laserBar.setAlpha(1);
        } else if (chargePercent >= 50) {
            this.laserBar.setFillStyle(0x0088ff); // Blue
            this.laserBar.setAlpha(0.8);
        } else {
            this.laserBar.setFillStyle(0x004488); // Dark blue
            this.laserBar.setAlpha(0.6);
        }
    }
    
    /**
     * Update lock-on indicator
     */
    updateLockOn(target) {
        if (target) {
            // Show lock-on indicator
            this.lockOnIndicator.setVisible(true);
            this.lockOnTween.resume();
        } else {
            // Hide lock-on indicator
            this.lockOnIndicator.setVisible(false);
            this.lockOnTween.pause();
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
     * Create leaderboard (hidden by default, shows when multiplayer active)
     */
    createLeaderboard() {
        const rightX = C.GAME_WIDTH - C.UI_PADDING;
        const topY = 100;
        
        // Leaderboard container
        this.leaderboardContainer = this.add.container(0, 0);
        this.leaderboardContainer.setAlpha(0); // Hidden by default
        
        // Background
        const bgWidth = 220;
        const bgHeight = 300;
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(rightX - bgWidth, topY, bgWidth, bgHeight, 8);
        bg.lineStyle(2, 0x4ade80, 0.5);
        bg.strokeRoundedRect(rightX - bgWidth, topY, bgWidth, bgHeight, 8);
        this.leaderboardContainer.add(bg);
        
        // Title
        const title = this.add.text(
            rightX - bgWidth / 2, 
            topY + 15, 
            'LEADERBOARD', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: '16px',
                color: '#4ade80',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5, 0);
        this.leaderboardContainer.add(title);
        
        // Player entries (will be created dynamically)
        this.leaderboardEntries = [];
        this.leaderboardStartY = topY + 45;
        this.leaderboardX = rightX - bgWidth + 15;
    }
    
    /**
     * Create notification system
     */
    createNotificationSystem() {
        this.notificationQueue = [];
        this.currentNotification = null;
    }
    
    /**
     * Create player tracking arrows (will be shown in update loop)
     */
    createPlayerTracking() {
        this.playerArrows = new Map(); // Map of ship -> arrow graphics
    }
    
    /**
     * Update leaderboard with player data
     */
    updateLeaderboard(leaderboardData) {
        // Clear existing entries
        for (const entry of this.leaderboardEntries) {
            entry.destroy();
        }
        this.leaderboardEntries = [];
        
        // Show leaderboard if multiplayer is active
        if (leaderboardData.length > 1) {
            this.tweens.add({
                targets: this.leaderboardContainer,
                alpha: 1,
                duration: 300
            });
        } else {
            this.tweens.add({
                targets: this.leaderboardContainer,
                alpha: 0,
                duration: 300
            });
            return;
        }
        
        // Create entries for each player
        leaderboardData.forEach((player, index) => {
            const y = this.leaderboardStartY + index * 30;
            
            // Rank
            const rankText = this.add.text(
                this.leaderboardX, 
                y, 
                `${index + 1}.`, 
                {
                    fontFamily: C.UI_FONT_FAMILY,
                    fontSize: '14px',
                    color: '#ffffff',
                    alpha: 0.8
                }
            ).setOrigin(0, 0);
            
            // Player name with indicator for local player
            const nameColor = player.isLocal ? '#f9cb28' : '#ffffff';
            const namePrefix = player.isLocal ? '► ' : '';
            const nameText = this.add.text(
                this.leaderboardX + 25, 
                y, 
                `${namePrefix}${player.name}`, 
                {
                    fontFamily: C.UI_FONT_FAMILY,
                    fontSize: '13px',
                    color: nameColor,
                    fontStyle: player.isLocal ? 'bold' : 'normal'
                }
            ).setOrigin(0, 0);
            
            // Score
            const scoreText = this.add.text(
                this.leaderboardX + 180, 
                y, 
                player.score.toString(), 
                {
                    fontFamily: C.UI_FONT_FAMILY,
                    fontSize: '13px',
                    color: '#4ade80',
                    fontStyle: 'bold'
                }
            ).setOrigin(1, 0);
            
            // Status indicator (alive/dead)
            if (!player.alive) {
                nameText.setAlpha(0.4);
                scoreText.setAlpha(0.4);
                rankText.setAlpha(0.4);
                
                const deadText = this.add.text(
                    this.leaderboardX + 25,
                    y + 15,
                    '[DESTROYED]',
                    {
                        fontFamily: C.UI_FONT_FAMILY,
                        fontSize: '10px',
                        color: '#ff0000',
                        alpha: 0.6
                    }
                ).setOrigin(0, 0);
                
                this.leaderboardEntries.push(deadText);
            }
            
            this.leaderboardEntries.push(rankText, nameText, scoreText);
            this.leaderboardContainer.add([rankText, nameText, scoreText]);
        });
    }
    
    /**
     * Show player join notification
     */
    showPlayerJoinNotification(playerName) {
        const notification = {
            text: `${playerName} joined!`,
            color: '#4ade80',
            duration: 3000
        };
        
        this.notificationQueue.push(notification);
        
        // Process queue if no notification is showing
        if (!this.currentNotification) {
            this.showNextNotification();
        }
    }
    
    /**
     * Show next notification in queue
     */
    showNextNotification() {
        if (this.notificationQueue.length === 0) {
            this.currentNotification = null;
            return;
        }
        
        const notification = this.notificationQueue.shift();
        
        const centerX = C.GAME_WIDTH / 2;
        const y = 120;
        
        // Create notification background
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.8);
        bg.fillRoundedRect(centerX - 150, y - 15, 300, 40, 8);
        bg.lineStyle(2, notification.color === '#4ade80' ? 0x4ade80 : 0xff6600, 1);
        bg.strokeRoundedRect(centerX - 150, y - 15, 300, 40, 8);
        
        // Create notification text
        const text = this.add.text(
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
        
        this.currentNotification = { bg, text };
        
        // Animate in
        bg.setAlpha(0);
        text.setAlpha(0);
        
        this.tweens.add({
            targets: [bg, text],
            alpha: 1,
            duration: 300,
            onComplete: () => {
                // Wait then fade out
                this.time.delayedCall(notification.duration, () => {
                    this.tweens.add({
                        targets: [bg, text],
                        alpha: 0,
                        duration: 300,
                        onComplete: () => {
                            bg.destroy();
                            text.destroy();
                            this.showNextNotification();
                        }
                    });
                });
            }
        });
    }
    
    /**
     * Update - called every frame
     */
    update() {
        this.updatePlayerTrackingArrows();
    }
    
    /**
     * Update player tracking arrows to point at remote players
     */
    updatePlayerTrackingArrows() {
        if (!this.gameScene.multiplayerManager || !this.gameScene.ship || !this.gameScene.ship.alive) {
            // Clear all arrows if no multiplayer or local ship
            for (const arrow of this.playerArrows.values()) {
                arrow.setVisible(false);
            }
            return;
        }
        
        const localShip = this.gameScene.ship;
        const remotePlayers = this.gameScene.multiplayerManager.getRemoteShips();
        const cam = this.gameScene.cameras.main;
        
        // Track which arrows are used
        const usedArrows = new Set();
        
        // For each remote player
        remotePlayers.forEach((remoteShip, index) => {
            if (!remoteShip.alive) return;
            
            // Get or create arrow for this ship
            let arrow = this.playerArrows.get(remoteShip);
            if (!arrow) {
                arrow = this.add.graphics();
                this.playerArrows.set(remoteShip, arrow);
            }
            
            usedArrows.add(arrow);
            
            // Calculate relative position
            const dx = remoteShip.body.position.x - localShip.body.position.x;
            const dy = remoteShip.body.position.y - localShip.body.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Only show arrow if player is far away (off-screen or distant)
            const showArrowDistance = 600; // Show arrow when > 600 units away
            
            if (distance < showArrowDistance) {
                arrow.setVisible(false);
                return;
            }
            
            arrow.setVisible(true);
            
            // Calculate angle to remote player
            const angle = Math.atan2(dy, dx);
            
            // Position arrow at edge of screen pointing toward player
            const screenCenterX = C.GAME_WIDTH / 2;
            const screenCenterY = C.GAME_HEIGHT / 2;
            const arrowDistance = 80; // Distance from center of screen
            
            const arrowX = screenCenterX + Math.cos(angle) * arrowDistance;
            const arrowY = screenCenterY + Math.sin(angle) * arrowDistance;
            
            // Draw arrow
            arrow.clear();
            
            // Arrow color based on player
            const color = remoteShip.playerColor || 0x00ffff;
            arrow.fillStyle(color, 0.8);
            arrow.lineStyle(2, 0xffffff, 0.6);
            
            // Draw triangle pointing in direction
            const arrowSize = 12;
            arrow.save();
            arrow.translateCanvas(arrowX, arrowY);
            arrow.rotateCanvas(angle);
            
            arrow.beginPath();
            arrow.moveTo(arrowSize, 0); // Tip
            arrow.lineTo(-arrowSize, -arrowSize * 0.6); // Top wing
            arrow.lineTo(-arrowSize * 0.5, 0); // Back center
            arrow.lineTo(-arrowSize, arrowSize * 0.6); // Bottom wing
            arrow.closePath();
            arrow.fillPath();
            arrow.strokePath();
            
            arrow.restore();
            
            // Draw distance text below arrow
            const distanceText = `${Math.floor(distance)}`;
            const textX = arrowX;
            const textY = arrowY + 20;
            
            arrow.fillStyle(0x000000, 0.7);
            arrow.fillRect(textX - 15, textY - 8, 30, 14);
            
            // Note: Can't draw text with graphics, would need Text objects
            // For now, just the arrow is enough
        });
        
        // Hide unused arrows
        for (const [ship, arrow] of this.playerArrows) {
            if (!usedArrows.has(arrow)) {
                arrow.setVisible(false);
            }
        }
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
