import * as C from '../config/constants.js';

/**
 * PlayerTracking component - displays arrows pointing to remote players
 */
export default class PlayerTracking {
    constructor(scene) {
        this.scene = scene;
        this.arrows = new Map(); // Map of ship -> arrow graphics
    }
    
    update() {
        if (!this.scene.gameScene.multiplayerManager || !this.scene.gameScene.ship || !this.scene.gameScene.ship.alive) {
            // Clear all arrows if no multiplayer or local ship
            for (const arrow of this.arrows.values()) {
                arrow.setVisible(false);
            }
            return;
        }
        
        const localShip = this.scene.gameScene.ship;
        const remotePlayers = this.scene.gameScene.multiplayerManager.getRemoteShips();
        
        // Track which arrows are used
        const usedArrows = new Set();
        
        // For each remote player
        remotePlayers.forEach((remoteShip, index) => {
            if (!remoteShip.alive) return;
            
            // Get or create arrow for this ship
            let arrow = this.arrows.get(remoteShip);
            if (!arrow) {
                arrow = this.scene.add.graphics();
                this.arrows.set(remoteShip, arrow);
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
        });
        
        // Hide unused arrows
        for (const [ship, arrow] of this.arrows) {
            if (!usedArrows.has(arrow)) {
                arrow.setVisible(false);
            }
        }
    }
    
    destroy() {
        for (const arrow of this.arrows.values()) {
            arrow.destroy();
        }
        this.arrows.clear();
    }
}
