import Phaser from 'phaser';
import TitleScene from './scenes/TitleScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  scene: [TitleScene],
};

export default new Phaser.Game(config);
