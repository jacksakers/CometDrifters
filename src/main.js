import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import * as C from './config/constants.js';

/**
 * Main entry point for Comet Chasers
 * Initializes Phaser with Matter.js physics
 */

const config = {
    type: Phaser.AUTO,
    width: C.GAME_WIDTH,
    height: C.GAME_HEIGHT,
    backgroundColor: C.BACKGROUND_COLOR,
    parent: 'game-container',
    physics: {
        default: 'matter',
        matter: {
            gravity: {
                x: C.GRAVITY_X,
                y: C.GRAVITY_Y
            },
            debug: false, // Set to true to see collision boundaries
            enableSleeping: false
        }
    },
    scene: [GameScene, UIScene],
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER,
        width: '100%',
        height: '100%'
    }
};

// Create game instance
const game = new Phaser.Game(config);

// Export for debugging
window.game = game;
