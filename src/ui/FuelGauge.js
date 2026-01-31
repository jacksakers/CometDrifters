import * as C from '../config/constants.js';

/**
 * FuelGauge component - displays fuel bar with mobile-responsive positioning
 */
export default class FuelGauge {
    constructor(scene) {
        this.scene = scene;
        this.elements = [];
        this.create();
    }
    
    create() {
        const bounds = this.scene.getUIBounds();
        const isMobile = this.scene.gameScene.inputManager.isMobileMode();
        
        // Adjust size and position for mobile
        const barWidth = isMobile ? 180 : 250;
        const barHeight = isMobile ? 20 : 25;
        const centerX = bounds.centerX;
        
        // On mobile, position higher to account for virtual controls
        const mobileOffset = isMobile ? 100 : 20;
        const bottomY = bounds.bottom - mobileOffset;
        
        // Label
        this.fuelLabel = this.scene.add.text(
            centerX, 
            bottomY - (isMobile ? 20 : 25), 
            'FUEL: REGENERATING', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: isMobile ? '10px' : '12px',
                color: '#f9cb28',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5).setScrollFactor(0);
        this.elements.push(this.fuelLabel);
        
        // Background bar
        this.fuelBarBg = this.scene.add.rectangle(
            centerX, 
            bottomY, 
            barWidth, 
            barHeight, 
            0x000000, 
            0.5
        ).setScrollFactor(0);
        this.fuelBarBg.setStrokeStyle(2, 0xffffff, 0.4);
        this.elements.push(this.fuelBarBg);
        
        // Fuel bar
        this.fuelBar = this.scene.add.rectangle(
            centerX, 
            bottomY, 
            barWidth - 4, 
            barHeight - 4, 
            0x4ade80
        ).setOrigin(0.5).setScrollFactor(0);
        this.elements.push(this.fuelBar);
        
        // Store original width for scaling
        this.fuelBarMaxWidth = barWidth - 4;
    }
    
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
    
    updateDockStatus(isDocked) {
        if (isDocked) {
            this.fuelLabel.setText('DOCKED: REFUELING');
            this.fuelLabel.setColor('#4ade80');
        }
    }
    
    reposition() {
        const bounds = this.scene.getUIBounds();
        const isMobile = this.scene.gameScene.inputManager.isMobileMode();
        const mobileOffset = isMobile ? 100 : 20;
        const bottomY = bounds.bottom - mobileOffset;
        
        if (this.fuelLabel) {
            this.fuelLabel.setPosition(bounds.centerX, bottomY - (isMobile ? 20 : 25));
            this.fuelBarBg.setPosition(bounds.centerX, bottomY);
            this.fuelBar.setPosition(bounds.centerX, bottomY);
        }
    }
    
    destroy() {
        this.elements.forEach(el => el.destroy());
        this.elements = [];
    }
}
