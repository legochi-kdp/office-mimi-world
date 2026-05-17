import Phaser from 'phaser';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const { width, height } = this.cameras.main;

    this.add
      .text(width / 2, height / 2 - 40, 'Data & AI World', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '48px',
        color: '#e94560',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 30, 'Welcome — onboarding starts here', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#eaeaea',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height - 60, 'Press any key to continue', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#a0a0a0',
      })
      .setOrigin(0.5);

    this.input.keyboard.once('keydown', () => {
      // TODO: transition to the next scene (e.g. world map or tutorial)
    });
  }
}
