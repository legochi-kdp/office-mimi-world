import Phaser from 'phaser';

export default class WelcomeZone extends Phaser.Scene {
  constructor() {
    super({ key: 'WelcomeZone' });
  }

  preload() {
    // Leading "/" so paths resolve from site root, not /public/ (where index.html lives)
    this.load.image('Modern_Office_16x16', '/tilesets/Modern_Office_16x16.png');
    this.load.tilemapTiledJSON('WelcomeZone', '/maps/WelcomeZone.json');
  }

  create() {
    const map = this.make.tilemap({ key: 'WelcomeZone' });
    const tileset = map.addTilesetImage('ModernOffice', 'Modern_Office_16x16');

    map.createLayer('Floor', tileset, 0, 0);
    const wallsLayer = map.createLayer('Walls', tileset, 0, 0);

    wallsLayer.setCollisionByExclusion([-1, 0]);

    const centerX = map.widthInPixels / 2;
    const centerY = map.heightInPixels / 2;

    this.player = this.add.rectangle(centerX, centerY, 32, 32, 0x00ff00);
    this.physics.add.existing(this.player);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.player.body.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, wallsLayer);

    this.cursors = this.input.keyboard.createCursorKeys();

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(2);
  }

  update() {
    const speed = 150;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown) vx = speed;

    if (this.cursors.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown) vy = speed;

    this.player.body.setVelocity(vx, vy);

    if (vx !== 0 && vy !== 0) {
      this.player.body.velocity.normalize().scale(speed);
    }
  }
}
