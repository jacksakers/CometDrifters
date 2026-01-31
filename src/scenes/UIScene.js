import * as C from '../config/constants.js';
import Header from '../ui/Header.js';
import CombatUI from '../ui/CombatUI.js';
import FuelGauge from '../ui/FuelGauge.js';
import ControlsHint from '../ui/ControlsHint.js';
import GameOverScreen from '../ui/GameOverScreen.js';
import Leaderboard from '../ui/Leaderboard.js';
import NotificationSystem from '../ui/NotificationSystem.js';
import PlayerTracking from '../ui/PlayerTracking.js';
import DeathMessage from '../ui/DeathMessage.js';
import SettingsMenu from '../ui/SettingsMenu.js';

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
        
        // Track window resize for responsive UI
        this.scale.on('resize', this.handleResize, this);
        
        // Create UI components
        this.header = new Header(this);
        this.combatUI = new CombatUI(this);
        this.fuelGauge = new FuelGauge(this);
        this.controlsHint = new ControlsHint(this);
        this.gameOverScreen = new GameOverScreen(this);
        this.leaderboard = new Leaderboard(this);
        this.notificationSystem = new NotificationSystem(this);
        this.playerTracking = new PlayerTracking(this);
        this.deathMessage = new DeathMessage(this);
        this.settingsMenu = new SettingsMenu(this);
        
        // Listen to game events
        this.gameScene.events.on('updateScore', this.updateScore, this);
        this.gameScene.events.on('updateFuel', this.updateFuel, this);
        this.gameScene.events.on('updateHealth', this.updateHealth, this);
        this.gameScene.events.on('updateLaserCharge', this.updateLaserCharge, this);
        this.gameScene.events.on('updateDockStatus', this.updateDockStatus, this);
        this.gameScene.events.on('lockOnTarget', this.updateLockOn, this);
        this.gameScene.events.on('autoLockOnToggle', this.updateAutoLockOn, this);
        this.gameScene.events.on('gameOver', this.showGameOver, this);
        this.gameScene.events.on('gameReset', this.hideGameOver, this);
        this.gameScene.events.on('updateLeaderboard', this.updateLeaderboard, this);
        this.gameScene.events.on('playerJoined', this.showPlayerJoinNotification, this);
        this.gameScene.events.on('showDeathMessage', this.showDeathMessage, this);
        this.gameScene.events.on('hideDeathMessage', this.hideDeathMessage, this);
    }
    
    /**
     * Get UI boundaries with max width constraint
     * Returns { left, right, top, bottom, width, height, centerX }
     */
    getUIBounds() {
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;
        
        // Calculate left margin to center UI if screen is wider than max width
        const uiWidth = Math.min(screenWidth, C.UI_MAX_WIDTH);
        const leftMargin = (screenWidth - uiWidth) / 2;
        
        return {
            left: leftMargin + C.UI_PADDING,
            right: leftMargin + uiWidth - C.UI_PADDING,
            top: C.UI_PADDING,
            bottom: screenHeight - C.UI_PADDING,
            width: uiWidth,
            height: screenHeight,
            centerX: leftMargin + uiWidth / 2
        };
    }
    
    /**
     * Handle window resize
     */
    handleResize(gameSize) {
        // Reposition UI elements based on new size
        this.repositionUI();
    }
    
    /**
     * Reposition all UI elements (called on resize)
     */
    repositionUI() {
        this.header.reposition();
        this.combatUI.reposition();
        this.fuelGauge.reposition();
        this.controlsHint.reposition();
        this.settingsMenu.reposition();
    }
    
    /**
     * Update score display
     */
    updateScore(score) {
        this.header.updateScore(score);
    }
    
    /**
     * Update fuel gauge
     */
    updateFuel(fuelPercent) {
        this.fuelGauge.updateFuel(fuelPercent);
    }
    
    /**
     * Update docking status
     */
    updateDockStatus(isDocked) {
        this.fuelGauge.updateDockStatus(isDocked);
    }
    
    /**
     * Update health bar
     */
    updateHealth(healthPercent) {
        this.combatUI.updateHealth(healthPercent);
    }
    
    /**
     * Update laser charge bar
     */
    updateLaserCharge(chargePercent) {
        this.combatUI.updateLaserCharge(chargePercent);
    }
    
    /**
     * Update lock-on indicator
     */
    updateLockOn(target) {
        this.combatUI.updateLockOn(target);
    }
    
    /**
     * Update auto lock-on indicator
     */
    updateAutoLockOn(isEnabled) {
        this.combatUI.updateAutoLockOn(isEnabled);
    }
    
    /**
     * Show game over screen
     */
    showGameOver(data) {
        this.gameOverScreen.show(data);
    }
    
    /**
     * Hide game over screen
     */
    hideGameOver() {
        this.gameOverScreen.hide();
    }
    
    /**
     * Update leaderboard with player data
     */
    updateLeaderboard(leaderboardData) {
        this.leaderboard.update(leaderboardData);
    }
    
    /**
     * Show player join notification
     */
    showPlayerJoinNotification(playerName) {
        this.notificationSystem.showPlayerJoined(playerName);
    }
    
    /**
     * Show death message in multiplayer (respawn countdown)
     */
    showDeathMessage(reason) {
        this.deathMessage.show(reason);
    }
    
    /**
     * Hide death message
     */
    hideDeathMessage() {
        this.deathMessage.hide();
    }
    
    /**
     * Update - called every frame
     */
    update() {
        this.playerTracking.update();
    }
    
    /**
     * Cleanup
     */
    shutdown() {
        this.gameScene.events.off('updateScore');
        this.gameScene.events.off('updateFuel');
        this.gameScene.events.off('updateDockStatus');
        this.gameScene.events.off('updateHealth');
        this.gameScene.events.off('updateLaserCharge');
        this.gameScene.events.off('lockOnTarget');
        this.gameScene.events.off('autoLockOnToggle');
        this.gameScene.events.off('gameOver');
        this.gameScene.events.off('gameReset');
        this.gameScene.events.off('updateLeaderboard');
        this.gameScene.events.off('playerJoined');
        this.gameScene.events.off('showDeathMessage');
        this.gameScene.events.off('hideDeathMessage');
    }
}
