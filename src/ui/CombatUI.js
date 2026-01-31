import * as C from '../config/constants.js';

/**
 * CombatUI component - displays health, laser charge, special weapon, and lock-on indicators
 */
export default class CombatUI {
    constructor(scene) {
        this.scene = scene;
        this.elements = [];
        this.create();
    }
    
    create() {
        const bounds = this.scene.getUIBounds();
        const isMobile = this.scene.gameScene.inputManager.isMobileMode();
        const rightX = bounds.right;
        const topY = bounds.top;
        
        // Adjust sizes for mobile
        const barWidth = isMobile ? 150 : 200;
        const barHeight = isMobile ? 16 : 20;
        const labelFontSize = isMobile ? '10px' : '12px';
        
        // Health Bar Label
        const healthLabel = this.scene.add.text(
            rightX, 
            topY, 
            'HULL', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: labelFontSize,
                color: '#ffffff',
                alpha: 0.8,
                fontStyle: 'bold'
            }
        ).setOrigin(1, 0).setScrollFactor(0);
        this.elements.push(healthLabel);
        
        const healthBarY = topY + (isMobile ? 16 : 20);
        
        // Health background
        this.healthBarBg = this.scene.add.rectangle(
            rightX - barWidth / 2,
            healthBarY,
            barWidth,
            barHeight,
            0x000000,
            0.6
        ).setOrigin(0.5, 0).setScrollFactor(0);
        this.healthBarBg.setStrokeStyle(2, 0xffffff, 0.4);
        this.elements.push(this.healthBarBg);
        
        // Health bar (green)
        this.healthBar = this.scene.add.rectangle(
            rightX - barWidth / 2,
            healthBarY,
            barWidth - 4,
            barHeight - 4,
            0x00ff00
        ).setOrigin(0.5, 0).setScrollFactor(0);
        this.elements.push(this.healthBar);
        
        this.healthBarMaxWidth = barWidth - 4;
        
        // Laser Charge Bar
        const laserY = healthBarY + (isMobile ? 30 : 40);
        
        const laserLabel = this.scene.add.text(
            rightX, 
            laserY, 
            'LASER', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: labelFontSize,
                color: '#00ffff',
                alpha: 0.8,
                fontStyle: 'bold'
            }
        ).setOrigin(1, 0).setScrollFactor(0);
        this.elements.push(laserLabel);
        
        const laserBarY = laserY + (isMobile ? 16 : 20);
        
        // Laser background
        this.laserBarBg = this.scene.add.rectangle(
            rightX - barWidth / 2,
            laserBarY,
            barWidth,
            barHeight,
            0x000000,
            0.6
        ).setOrigin(0.5, 0).setScrollFactor(0);
        this.laserBarBg.setStrokeStyle(2, 0x00ffff, 0.4);
        this.elements.push(this.laserBarBg);
        
        // Laser bar (cyan)
        this.laserBar = this.scene.add.rectangle(
            rightX - barWidth / 2,
            laserBarY,
            barWidth - 4,
            barHeight - 4,
            0x00ffff
        ).setOrigin(0.5, 0).setScrollFactor(0);
        this.elements.push(this.laserBar);
        
        this.laserBarMaxWidth = barWidth - 4;
        
        // Special Weapon Slot (placeholder)
        const specialY = laserBarY + (isMobile ? 40 : 50);
        
        const specialLabel = this.scene.add.text(
            rightX, 
            specialY, 
            'SPECIAL', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: labelFontSize,
                color: '#ff00ff',
                alpha: 0.5,
                fontStyle: 'bold'
            }
        ).setOrigin(1, 0).setScrollFactor(0);
        this.elements.push(specialLabel);
        
        const specialSlotY = specialY + (isMobile ? 16 : 20);
        const slotSize = isMobile ? 40 : 50;
        
        // Special weapon slot (empty for now)
        this.specialSlot = this.scene.add.rectangle(
            rightX - slotSize / 2,
            specialSlotY,
            slotSize,
            slotSize,
            0x000000,
            0.6
        ).setOrigin(0.5, 0).setScrollFactor(0);
        this.specialSlot.setStrokeStyle(2, 0xff00ff, 0.3);
        this.elements.push(this.specialSlot);
        
        // "EMPTY" text
        const emptyText = this.scene.add.text(
            rightX - slotSize / 2,
            specialSlotY + slotSize / 2,
            'EMPTY',
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: isMobile ? '8px' : '10px',
                color: '#ff00ff',
                alpha: 0.3
            }
        ).setOrigin(0.5).setScrollFactor(0);
        this.elements.push(emptyText);
        
        // Lock-On Indicator (centered at top)
        this.lockOnIndicator = this.scene.add.text(
            bounds.centerX,
            bounds.top,
            '\u25c4 LOCKED ON \u25ba',
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: isMobile ? '14px' : '16px',
                color: '#ff0000',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5, 0).setVisible(false).setScrollFactor(0);
        this.elements.push(this.lockOnIndicator);
        
        // Auto Lock-On Indicator (centered, below lock-on)
        this.autoLockIndicator = this.scene.add.text(
            bounds.centerX,
            bounds.top + (isMobile ? 25 : 30),
            'AUTO LOCK ON ENGAGED',
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: isMobile ? '11px' : '13px',
                color: '#ffaa00',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2,
                alpha: 0.9
            }
        ).setOrigin(0.5, 0).setVisible(false).setScrollFactor(0);
        this.elements.push(this.autoLockIndicator);
        
        // Pulsing animation for lock-on
        this.lockOnTween = this.scene.tweens.add({
            targets: this.lockOnIndicator,
            alpha: { from: 1, to: 0.4 },
            scale: { from: 1, to: 1.1 },
            duration: 500,
            yoyo: true,
            repeat: -1,
            paused: true
        });
        
        // Pulsing animation for auto lock-on
        this.autoLockTween = this.scene.tweens.add({
            targets: this.autoLockIndicator,
            alpha: { from: 0.9, to: 0.5 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            paused: true
        });
    }
    
    updateHealth(healthPercent) {
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
    
    updateLaserCharge(chargePercent) {
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
    
    updateLockOn(target) {
        if (target) {
            this.lockOnIndicator.setVisible(true);
            this.lockOnTween.resume();
        } else {
            this.lockOnIndicator.setVisible(false);
            this.lockOnTween.pause();
        }
    }
    
    updateAutoLockOn(isEnabled) {
        if (isEnabled) {
            this.autoLockIndicator.setVisible(true);
            this.autoLockTween.resume();
        } else {
            this.autoLockIndicator.setVisible(false);
            this.autoLockTween.pause();
        }
    }
    
    reposition() {
        const bounds = this.scene.getUIBounds();
        const isMobile = this.scene.gameScene.inputManager.isMobileMode();
        
        if (this.lockOnIndicator) {
            this.lockOnIndicator.setPosition(bounds.centerX, bounds.top);
        }
        
        if (this.autoLockIndicator) {
            this.autoLockIndicator.setPosition(bounds.centerX, bounds.top + (isMobile ? 25 : 30));
        }
        
        // Update other positions if needed
        // (bars are positioned relative to right edge, so they adapt automatically)
    }
    
    destroy() {
        if (this.lockOnTween) {
            this.lockOnTween.stop();
            this.lockOnTween.remove();
        }
        if (this.autoLockTween) {
            this.autoLockTween.stop();
            this.autoLockTween.remove();
        }
        this.elements.forEach(el => el.destroy());
        this.elements = [];
    }
}
