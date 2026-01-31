import * as C from '../config/constants.js';

/**
 * Leaderboard component - displays multiplayer leaderboard
 */
export default class Leaderboard {
    constructor(scene) {
        this.scene = scene;
        this.entries = [];
        this.create();
    }
    
    create() {
        const rightX = C.GAME_WIDTH - C.UI_PADDING;
        const topY = 100;
        
        // Leaderboard container
        this.container = this.scene.add.container(0, 0);
        this.container.setAlpha(0); // Hidden by default
        
        // Background
        const bgWidth = 220;
        const bgHeight = 300;
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(rightX - bgWidth, topY, bgWidth, bgHeight, 8);
        bg.lineStyle(2, 0x4ade80, 0.5);
        bg.strokeRoundedRect(rightX - bgWidth, topY, bgWidth, bgHeight, 8);
        this.container.add(bg);
        
        // Title
        const title = this.scene.add.text(
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
        this.container.add(title);
        
        this.startY = topY + 45;
        this.leftX = rightX - bgWidth + 15;
    }
    
    update(leaderboardData) {
        // Clear existing entries
        for (const entry of this.entries) {
            entry.destroy();
        }
        this.entries = [];
        
        // Show leaderboard if multiplayer is active
        if (leaderboardData.length > 1) {
            this.scene.tweens.add({
                targets: this.container,
                alpha: 1,
                duration: 300
            });
        } else {
            this.scene.tweens.add({
                targets: this.container,
                alpha: 0,
                duration: 300
            });
            return;
        }
        
        // Create entries for each player
        leaderboardData.forEach((player, index) => {
            const y = this.startY + index * 30;
            
            // Rank
            const rankText = this.scene.add.text(
                this.leftX, 
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
            const nameText = this.scene.add.text(
                this.leftX + 25, 
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
            const scoreText = this.scene.add.text(
                this.leftX + 180, 
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
                
                const deadText = this.scene.add.text(
                    this.leftX + 25,
                    y + 15,
                    '[DESTROYED]',
                    {
                        fontFamily: C.UI_FONT_FAMILY,
                        fontSize: '10px',
                        color: '#ff0000',
                        alpha: 0.6
                    }
                ).setOrigin(0, 0);
                
                this.entries.push(deadText);
            }
            
            this.entries.push(rankText, nameText, scoreText);
            this.container.add([rankText, nameText, scoreText]);
        });
    }
    
    destroy() {
        this.entries.forEach(entry => entry.destroy());
        this.entries = [];
        this.container.destroy();
    }
}
