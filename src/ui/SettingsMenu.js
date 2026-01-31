import * as C from '../config/constants.js';

/**
 * SettingsMenu - Settings overlay with mute and other options
 * Opens when clicking the settings icon
 */
export default class SettingsMenu {
    constructor(scene) {
        this.scene = scene;
        this.gameScene = scene.gameScene;
        this.isOpen = false;
        
        // Create settings icon (gear)
        this.createSettingsIcon();
        
        // Create menu overlay (initially hidden)
        this.createMenuOverlay();
    }
    
    /**
     * Create settings icon button
     */
    createSettingsIcon() {
        const bounds = this.scene.getUIBounds();
        
        // Settings icon container
        this.iconContainer = this.scene.add.container(bounds.left, bounds.top);
        this.iconContainer.setDepth(1000);
        this.iconContainer.setScrollFactor(0);
        
        // Background circle for icon
        this.iconBg = this.scene.add.circle(0, 0, 20, 0x1e293b, 0.8);
        this.iconBg.setStrokeStyle(2, 0x475569);
        
        // Gear icon (simple representation using graphics)
        this.iconGraphics = this.scene.add.graphics();
        this.drawGearIcon();
        
        this.iconContainer.add([this.iconBg, this.iconGraphics]);
        
        // Make interactive
        this.iconBg.setInteractive({ useHandCursor: true });
        this.iconBg.on('pointerdown', () => this.toggleMenu());
        
        // Hover effect
        this.iconBg.on('pointerover', () => {
            this.iconBg.setFillStyle(0x334155, 0.9);
        });
        this.iconBg.on('pointerout', () => {
            this.iconBg.setFillStyle(0x1e293b, 0.8);
        });
    }
    
    /**
     * Draw gear icon
     */
    drawGearIcon() {
        this.iconGraphics.clear();
        this.iconGraphics.lineStyle(2, 0x94a3b8);
        
        // Draw simple gear shape
        const centerX = 0;
        const centerY = 0;
        const innerRadius = 6;
        const outerRadius = 12;
        const teeth = 6;
        
        this.iconGraphics.beginPath();
        for (let i = 0; i < teeth * 2; i++) {
            const angle = (Math.PI * 2 * i) / (teeth * 2);
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i === 0) {
                this.iconGraphics.moveTo(x, y);
            } else {
                this.iconGraphics.lineTo(x, y);
            }
        }
        this.iconGraphics.closePath();
        this.iconGraphics.strokePath();
        
        // Center circle
        this.iconGraphics.fillStyle(0x1e293b);
        this.iconGraphics.fillCircle(centerX, centerY, 4);
        this.iconGraphics.strokeCircle(centerX, centerY, 4);
    }
    
    /**
     * Create menu overlay
     */
    createMenuOverlay() {
        const bounds = this.scene.getUIBounds();
        const centerX = bounds.centerX;
        const centerY = this.scene.scale.height / 2;
        
        // Container for menu
        this.menuContainer = this.scene.add.container(centerX, centerY);
        this.menuContainer.setDepth(2000);
        this.menuContainer.setScrollFactor(0);
        this.menuContainer.setVisible(false);
        
        // Semi-transparent background overlay
        this.overlay = this.scene.add.rectangle(
            0, 0,
            this.scene.scale.width * 2, // Extra wide to cover full screen
            this.scene.scale.height * 2,
            0x000000,
            0.7
        );
        this.overlay.setInteractive();
        this.overlay.on('pointerdown', () => this.closeMenu());
        
        // Menu background
        const menuWidth = Math.min(400, this.scene.scale.width - 40);
        const menuHeight = 300;
        
        this.menuBg = this.scene.add.rectangle(
            0, 0,
            menuWidth, menuHeight,
            0x1e293b,
            0.95
        );
        this.menuBg.setStrokeStyle(2, 0x475569);
        
        // Title
        this.titleText = this.scene.add.text(0, -menuHeight / 2 + 30, 'Settings', {
            fontSize: '28px',
            fontFamily: 'Arial, sans-serif',
            color: '#f1f5f9',
            fontStyle: 'bold'
        });
        this.titleText.setOrigin(0.5);
        
        // Mute button
        this.createMuteButton(menuWidth);
        
        // Close button
        this.createCloseButton(menuWidth, menuHeight);
        
        // Add all to container
        this.menuContainer.add([
            this.overlay,
            this.menuBg,
            this.titleText,
            this.muteButton,
            this.muteIcon,
            this.muteLabel,
            this.closeButton,
            this.closeText
        ]);
    }
    
    /**
     * Create mute toggle button
     */
    createMuteButton(menuWidth) {
        const yPos = -20;
        
        // Mute button background
        this.muteButton = this.scene.add.rectangle(
            0, yPos,
            menuWidth - 60, 50,
            0x334155,
            1
        );
        this.muteButton.setStrokeStyle(2, 0x475569);
        this.muteButton.setInteractive({ useHandCursor: true });
        
        // Mute icon (speaker)
        this.muteIcon = this.scene.add.text(-menuWidth / 2 + 50, yPos, '🔊', {
            fontSize: '28px'
        });
        this.muteIcon.setOrigin(0.5);
        
        // Mute label
        this.muteLabel = this.scene.add.text(-menuWidth / 2 + 110, yPos, 'Sound: ON', {
            fontSize: '20px',
            fontFamily: 'Arial, sans-serif',
            color: '#f1f5f9'
        });
        this.muteLabel.setOrigin(0, 0.5);
        
        // Update initial state
        this.updateMuteButton();
        
        // Click handler
        this.muteButton.on('pointerdown', () => {
            if (this.gameScene.audioManager) {
                this.gameScene.audioManager.toggleMute();
                this.updateMuteButton();
            }
        });
        
        // Hover effect
        this.muteButton.on('pointerover', () => {
            this.muteButton.setFillStyle(0x475569);
        });
        this.muteButton.on('pointerout', () => {
            this.muteButton.setFillStyle(0x334155);
        });
    }
    
    /**
     * Update mute button appearance
     */
    updateMuteButton() {
        if (!this.gameScene.audioManager) return;
        
        const isMuted = this.gameScene.audioManager.isMutedState();
        
        if (isMuted) {
            this.muteIcon.setText('🔇');
            this.muteLabel.setText('Sound: OFF');
            this.muteButton.setFillStyle(0x7f1d1d); // Red tint when muted
        } else {
            this.muteIcon.setText('🔊');
            this.muteLabel.setText('Sound: ON');
            this.muteButton.setFillStyle(0x334155);
        }
    }
    
    /**
     * Create close button
     */
    createCloseButton(menuWidth, menuHeight) {
        this.closeButton = this.scene.add.rectangle(
            0, menuHeight / 2 - 40,
            150, 40,
            0x3b82f6,
            1
        );
        this.closeButton.setStrokeStyle(2, 0x1e40af);
        this.closeButton.setInteractive({ useHandCursor: true });
        
        this.closeText = this.scene.add.text(0, menuHeight / 2 - 40, 'Close', {
            fontSize: '18px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        this.closeText.setOrigin(0.5);
        
        this.closeButton.on('pointerdown', () => this.closeMenu());
        
        // Hover effect
        this.closeButton.on('pointerover', () => {
            this.closeButton.setFillStyle(0x2563eb);
        });
        this.closeButton.on('pointerout', () => {
            this.closeButton.setFillStyle(0x3b82f6);
        });
    }
    
    /**
     * Toggle menu open/closed
     */
    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    /**
     * Open menu
     */
    openMenu() {
        this.isOpen = true;
        this.menuContainer.setVisible(true);
        this.updateMuteButton();
    }
    
    /**
     * Close menu
     */
    closeMenu() {
        this.isOpen = false;
        this.menuContainer.setVisible(false);
    }
    
    /**
     * Reposition on screen resize
     */
    reposition() {
        const bounds = this.scene.getUIBounds();
        
        // Reposition settings icon
        this.iconContainer.setPosition(bounds.left, bounds.top);
        
        // Reposition menu to center
        const centerX = bounds.centerX;
        const centerY = this.scene.scale.height / 2;
        this.menuContainer.setPosition(centerX, centerY);
        
        // Update overlay size
        if (this.overlay) {
            this.overlay.setSize(this.scene.scale.width * 2, this.scene.scale.height * 2);
        }
    }
    
    /**
     * Cleanup
     */
    destroy() {
        if (this.iconContainer) {
            this.iconContainer.destroy();
        }
        if (this.menuContainer) {
            this.menuContainer.destroy();
        }
    }
}
