import Phaser from 'phaser';
import WelcomeZone from './scenes/WelcomeZone.js';
import DataZone from './scenes/DataZone.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 600,
  backgroundColor: '#2d2d2d',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [WelcomeZone, DataZone],
};

export default new Phaser.Game(config);
