import Phaser from 'phaser';
import DialogueBox from '../ui/DialogueBox.js';

const TILE_SIZE = 16;

const PLAYER_TILE_X = 16;
const PLAYER_TILE_Y = 13;
const PLAYER_X = PLAYER_TILE_X * TILE_SIZE;
const PLAYER_Y = PLAYER_TILE_Y * TILE_SIZE;

const MIMI_TILE_X = 16;
const MIMI_TILE_Y = 9;
const MIMI_X = MIMI_TILE_X * TILE_SIZE;
const MIMI_Y = MIMI_TILE_Y * TILE_SIZE;

const INTERACT_DISTANCE = 100;

const MIMI_DIALOGUE = [
  "G'day! You must be new here — welcome to the team!",
  "This is Office Mimi's — where data meets fun!",
  'Explore the office and talk to the team. Press SPACE to interact with anyone you meet.',
  "When you're ready, head to the exit at the bottom of the room. Good luck!",
];

export default class WelcomeZone extends Phaser.Scene {
  constructor() {
    super({ key: 'WelcomeZone' });
  }

  preload() {
    this.load.on('loaderror', (file) => {
      console.error('[WelcomeZone] Failed to load:', file.key, file.url);
    });

    this.load.image('Modern_Office_16x16', '/tilesets/Modern_Office_16x16.png');
    this.load.tilemapTiledJSON('WelcomeZone', '/maps/WelcomeZone.json');
    // Map references ModernOffice.tsj externally — load metadata (read-only) for linking
    this.load.json('modern-office-tsj', '/maps/ModernOffice.tsj');
  }

  create() {
    this.sceneReady = false;
    this.initInputAndDialogue();

    const cacheMap = this.cache.tilemap.get('WelcomeZone');
    if (!cacheMap) {
      this.showLoadError(
        'Map failed to load. Export WelcomeZone from Tiled as JSON (not .tmx).',
      );
      return;
    }

    const map = this.make.tilemap({ key: 'WelcomeZone' });
    const tileset = this.linkTileset(map);
    if (!tileset) {
      this.showLoadError(
        'Could not link tileset to map. Ensure Modern_Office_16x16.png is in assets/tilesets/.',
      );
      return;
    }

    const floorLayer = map.createLayer('Floor', tileset, 0, 0);
    const wallsLayer = map.createLayer('Walls', tileset, 0, 0);
    const furnitureLayer = map.createLayer('Furniture', tileset, 0, 0);
    const objectsLayer = map.createLayer('Objects', tileset, 0, 0);

    if (!floorLayer || !wallsLayer || !furnitureLayer || !objectsLayer) {
      this.showLoadError(
        'Missing map layer. Expected Floor, Walls, Furniture, and Objects in WelcomeZone.json.',
      );
      return;
    }

    floorLayer.setDepth(0);
    wallsLayer.setDepth(1);
    furnitureLayer.setDepth(2);
    objectsLayer.setDepth(3);

    wallsLayer.setCollisionByExclusion([-1]);
    furnitureLayer.setCollisionByExclusion([-1]);

    this.createPlayer(map);
    this.createMimi();
    this.physics.add.collider(this.player, wallsLayer);
    this.physics.add.collider(this.player, furnitureLayer);

    this.nearMimiHint = this.add
      .text(this.mimi.x, this.mimi.y - 28, 'Press SPACE', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(20)
      .setVisible(false);

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(2);

    this.sceneReady = true;
  }

  /**
   * WelcomeZone.json uses an external tileset ("source": "ModernOffice.tsj").
   * Phaser cannot use the tileset name until it is linked to the loaded PNG.
   */
  linkTileset(map) {
    const textureKey = 'Modern_Office_16x16';
    const tsj = this.cache.json.get('modern-office-tsj');
    const tileWidth = tsj?.tilewidth ?? 16;
    const tileHeight = tsj?.tileheight ?? 16;
    const margin = tsj?.margin ?? 0;
    const spacing = tsj?.spacing ?? 0;
    const firstgid = map.tilesets[0]?.firstgid ?? 1;

    let tileset = map.addTilesetImage(0, textureKey);
    if (!tileset && tsj?.name) {
      tileset = map.addTilesetImage(
        tsj.name,
        textureKey,
        tileWidth,
        tileHeight,
        margin,
        spacing,
        firstgid,
      );
    }
    if (!tileset) {
      tileset = map.addTilesetImage(
        'ModernOffice',
        textureKey,
        tileWidth,
        tileHeight,
        margin,
        spacing,
        firstgid,
      );
    }

    return tileset;
  }

  initInputAndDialogue() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.input.keyboard.on('keydown-SPACE', (event) => {
      event.preventDefault();
    });

    this.dialogueBox = new DialogueBox();
    this.ensureDialogueAboveCanvas();
  }

  showLoadError(message) {
    console.error('[WelcomeZone]', message);
    this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY, message, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#ff6666',
        align: 'center',
        wordWrap: { width: 700 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10000);
  }

  createPlayer(map) {
    this.player = this.add.rectangle(PLAYER_X, PLAYER_Y, 32, 32, 0x00ff00);
    this.player.setDepth(10);
    this.physics.add.existing(this.player);
    this.player.body.setSize(28, 28);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.player.body.setCollideWorldBounds(true);
  }

  ensureDialogueAboveCanvas() {
    const container = document.getElementById('game-container');
    const box = document.getElementById('dialogue-box');
    if (container && box) {
      container.appendChild(box);
    }
  }

  createMimi() {
    this.mimi = this.add.rectangle(MIMI_X, MIMI_Y, 32, 32, 0xffdd00);
    this.mimi.setStrokeStyle(2, 0xcc9900);
    this.mimi.setDepth(9);
  }

  getDistanceToMimi() {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, this.mimi.x, this.mimi.y);
  }

  isPlayerNearMimi() {
    return this.getDistanceToMimi() <= INTERACT_DISTANCE;
  }

  startMimiDialogue() {
    console.log('[WelcomeZone] Starting Mimi dialogue');
    this.dialogueBox.open('Mimi', MIMI_DIALOGUE);
    this.player.body.setVelocity(0, 0);
    this.nearMimiHint.setVisible(false);
  }

  tryInteractWithMimi() {
    if (!Phaser.Input.Keyboard.JustDown(this.spaceKey)) return;

    const distance = this.getDistanceToMimi();
    const near = distance <= INTERACT_DISTANCE;
    console.log(
      '[WelcomeZone] SPACE pressed — distance to Mimi:',
      Math.round(distance),
      'px (need ≤',
      INTERACT_DISTANCE,
      ')',
      near ? '→ starting dialogue' : '→ too far',
    );

    if (!near) return;

    this.startMimiDialogue();
  }

  handleDialogueInput() {
    this.player.body.setVelocity(0, 0);
    this.dialogueBox.tryAdvance(this.spaceKey);
  }

  update() {
    if (!this.sceneReady || !this.player) {
      return;
    }

    if (this.dialogueBox.isOpen) {
      this.handleDialogueInput();
      return;
    }

    this.nearMimiHint.setVisible(this.isPlayerNearMimi());
    this.tryInteractWithMimi();

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
