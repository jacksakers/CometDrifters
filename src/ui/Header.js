import * as C from '../config/constants.js';

/**
 * Header UI component - displays title and score
 */
export default class Header {
    constructor(scene) {
        this.scene = scene;
        this.elements = [];
        this.create();
    }
    
    create() {
        const bounds = this.scene.getUIBounds();
        const isMobile = this.scene.gameScene.inputManager.isMobileMode();
        const fontSize = isMobile ? '18px' : '24px';
        const scoreFontSize = isMobile ? '12px' : '14px';
        
        // Title
        this.titleText = this.scene.add.text(
            bounds.left, 
            bounds.top, 
            'COMET CHASERS', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: fontSize,
                color: C.UI_FONT_COLOR,
                fontStyle: 'bold'
            }
        ).setScrollFactor(0);
        this.elements.push(this.titleText);
        
        // Score label
        const scoreLabel = this.scene.add.text(
            bounds.left, 
            bounds.top + (isMobile ? 25 : 35), 
            'Score:', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: scoreFontSize,
                color: '#ffffff',
                alpha: 0.8
            }
        ).setScrollFactor(0);
        this.elements.push(scoreLabel);
        
        // Score value
        this.scoreText = this.scene.add.text(
            bounds.left + (isMobile ? 45 : 55), 
            bounds.top + (isMobile ? 25 : 35), 
            '0', 
            {
                fontFamily: C.UI_FONT_FAMILY,
                fontSize: scoreFontSize,
                color: '#f9cb28',
                fontStyle: 'bold'
            }
        ).setScrollFactor(0);
        this.elements.push(this.scoreText);
    }
    
    updateScore(score) {
        this.scoreText.setText(score.toString());
    }
    
    reposition() {
        const bounds = this.scene.getUIBounds();
        const isMobile = this.scene.gameScene.inputManager.isMobileMode();
        
        if (this.titleText) {
            this.titleText.setPosition(bounds.left, bounds.top);
        }
        
        if (this.scoreText) {
            this.elements[1].setPosition(bounds.left, bounds.top + (isMobile ? 25 : 35));
            this.scoreText.setPosition(bounds.left + (isMobile ? 45 : 55), bounds.top + (isMobile ? 25 : 35));
        }
    }
    
    destroy() {
        this.elements.forEach(el => el.destroy());
        this.elements = [];
    }
}
