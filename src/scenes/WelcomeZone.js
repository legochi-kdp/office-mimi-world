import Phaser from 'phaser';
import DialogueBox from '../ui/DialogueBox.js';
import charactersData from '../data/characters.json';
import {
  setupZoneDoorOverlaps,
  beginSpawnImmunity,
  applyArrivalDoorSuppress,
  updateArrivalDoorSuppress,
} from '../systems/zoneDoors.js';
import { resolveMapSpawn } from '../systems/zoneSpawn.js';
import { updateGreenPlayer } from '../systems/playerControl.js';

const TILE_SIZE = 16;
const MAP_TILE_WIDTH = 30;
const MAP_TILE_HEIGHT = 22;
const MAP_WIDTH_PX = MAP_TILE_WIDTH * TILE_SIZE;
const MAP_HEIGHT_PX = MAP_TILE_HEIGHT * TILE_SIZE;

const TRIGGER_LABELS = {
  DataZoneDoor: '📊 Data Zone',
  DataZone: '📊 Data Zone',
  AIZoneDoor: '🤖 AI Zone',
  AIZone: '🤖 AI Zone',
  MainEntrance: '🚪 Entrance',
  Entrance: '🚪 Entrance',
};

/** Tiled object name → Phaser scene key (Entrance is spawn-only, not listed). */
const ZONE_TRANSITIONS = {
  DataZoneDoor: 'DataZone',
  DataZone: 'DataZone',
  AIZoneDoor: 'AIZone',
  AIZone: 'AIZone',
};

const DOOR_LABEL_DEPTH = 50;

const PLAYER_FALLBACK_X = 300;
const PLAYER_FALLBACK_Y = 320;

const MIMI_X = 186;
const MIMI_Y = 257;

const YUKI_X = 80;
const YUKI_Y = 80;

const CHLOE_X = 420;
const CHLOE_Y = 80;

const INTERACT_DISTANCE = 100;

const MIMI_DIALOGUE = [
  "G'day! You must be new here — welcome to the team!",
  "This is Office Mimi's — where data meets fun!",
  'Explore the office and talk to the team. Press SPACE to interact with anyone you meet.',
  "When you're ready, head to the exit at the bottom of the room. Good luck!",
];

function findCharacter(id) {
  return charactersData.find((character) => character.id === id);
}

function parseColour(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

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
    this.load.json('modern-office-tsj', '/maps/ModernOffice.tsj');
    this.load.json('characters', '/src/data/characters.json');
  }

  create() {
    this.sceneReady = false;
    this.isTransitioning = false;
    this.initInputAndDialogue();

    this.characters = this.cache.json.get('characters') ?? charactersData;
    this.yukiData = findCharacter('yuki');
    this.chloeData = findCharacter('chloe');

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
    this.createYuki();
    this.createChloe();
    this.createTriggerLabels(map);
    this.physics.add.collider(this.player, wallsLayer);
    this.physics.add.collider(this.player, furnitureLayer);
    this.zoneDoors = setupZoneDoorOverlaps(this, map, ZONE_TRANSITIONS);
    applyArrivalDoorSuppress(this);

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

    this.cameras.main.setBounds(0, 0, MAP_WIDTH_PX, MAP_HEIGHT_PX);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(2);

    this.sceneReady = true;
  }

  createDoorLabel(centerX, topY, text) {
    const paddingX = 8;
    const paddingY = 4;
    const label = this.add
      .text(0, 0, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 1);
    label.setScrollFactor(1);

    const boxWidth = label.width + paddingX * 2;
    const boxHeight = label.height + paddingY * 2;
    const boxX = centerX - boxWidth / 2;
    const boxY = topY - boxHeight;

    const background = this.add.graphics();
    background.fillStyle(0x000000, 0.72);
    background.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 8);
    background.setScrollFactor(1);
    background.setDepth(DOOR_LABEL_DEPTH - 1);

    label.setPosition(centerX, topY);
    label.setDepth(DOOR_LABEL_DEPTH);

    return { label, background };
  }

  createTriggerLabels(map) {
    this.doorLabels = [];

    console.log('[WelcomeZone] Map pixel size:', map.widthInPixels, 'x', map.heightInPixels);
    console.log('[WelcomeZone] Object layer names:', map.getObjectLayerNames());

    const triggersLayer = map.getObjectLayer('Triggers');
    console.log('[WelcomeZone] getObjectLayer("Triggers"):', triggersLayer);

    if (!triggersLayer) {
      console.warn(
        '[WelcomeZone] Object layer "Triggers" not found — door labels skipped. Add it in Tiled and re-export JSON.',
      );
      return;
    }

    if (!triggersLayer.objects || triggersLayer.objects.length === 0) {
      console.warn('[WelcomeZone] Triggers layer has no objects.');
      return;
    }

    console.log('[WelcomeZone] Triggers object count:', triggersLayer.objects.length);

    triggersLayer.objects.forEach((object) => {
      console.log('[WelcomeZone] Trigger object read:', {
        id: object.id,
        name: object.name,
        x: object.x,
        y: object.y,
        width: object.width,
        height: object.height,
        visible: object.visible,
      });

      const labelText = TRIGGER_LABELS[object.name];
      if (!labelText) {
        console.warn(
          '[WelcomeZone] No label mapped for trigger name:',
          object.name,
          '— add it to TRIGGER_LABELS in WelcomeZone.js',
        );
        return;
      }

      const centerX = object.x + object.width / 2;
      const labelY = object.y - 8;

      const doorLabel = this.createDoorLabel(centerX, labelY, labelText);
      this.doorLabels.push({ triggerName: object.name, ...doorLabel });

      console.log('[WelcomeZone] Door label created:', {
        trigger: object.name,
        text: labelText,
        worldX: centerX,
        worldY: labelY,
        depth: DOOR_LABEL_DEPTH,
      });
    });
  }

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

  getMainEntranceSpawn(map) {
    const triggersLayer = map.getObjectLayer('Triggers');
    const entrance = triggersLayer?.objects?.find(
      (object) => object.name === 'Entrance' || object.name === 'MainEntrance',
    );

    if (!entrance) {
      console.warn(
        '[WelcomeZone] Entrance trigger not found — using fallback player spawn',
      );
      return { x: PLAYER_FALLBACK_X, y: PLAYER_FALLBACK_Y };
    }

    const spawnX = entrance.x + entrance.width / 2;
    const spawnY = entrance.y - 20;

    console.log('[WelcomeZone] Player spawn at main entrance:', {
      spawnX,
      spawnY,
      trigger: entrance.name,
    });

    return { x: spawnX, y: spawnY };
  }

  createPlayer(map) {
    const transitionData = this.scene.settings.data ?? {};
    const fallback = { x: PLAYER_FALLBACK_X, y: PLAYER_FALLBACK_Y };
    let spawn;

    if (transitionData.spawnDoor) {
      spawn = resolveMapSpawn(
        map,
        transitionData.spawnDoor,
        MAP_WIDTH_PX,
        MAP_HEIGHT_PX,
        fallback,
      );
    } else {
      spawn = this.getMainEntranceSpawn(map);
    }

    this.player = this.add.rectangle(spawn.x, spawn.y, 32, 32, 0x00ff00);
    this.player.setDepth(10);
    this.physics.add.existing(this.player);
    this.player.body.setSize(28, 28);

    this.physics.world.setBounds(0, 0, MAP_WIDTH_PX, MAP_HEIGHT_PX);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.enable = true;
    beginSpawnImmunity(this);
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

  createYuki() {
    if (!this.yukiData) {
      console.warn('[WelcomeZone] Character "yuki" not found in characters.json');
      return;
    }

    this.yuki = this.add.rectangle(
      YUKI_X,
      YUKI_Y,
      32,
      32,
      parseColour(this.yukiData.colour),
    );
    this.yuki.setStrokeStyle(2, 0x000000, 0.35);
    this.yuki.setDepth(9);
  }

  createChloe() {
    if (!this.chloeData) {
      console.warn('[WelcomeZone] Character "chloe" not found in characters.json');
      return;
    }

    this.chloe = this.add.rectangle(
      CHLOE_X,
      CHLOE_Y,
      32,
      32,
      parseColour(this.chloeData.colour),
    );
    this.chloe.setStrokeStyle(2, 0x000000, 0.35);
    this.chloe.setDepth(9);
  }

  getDistanceToSprite(sprite) {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
  }

  getDistanceToMimi() {
    return this.getDistanceToSprite(this.mimi);
  }

  isPlayerNearSprite(sprite) {
    if (!sprite) return false;
    return this.getDistanceToSprite(sprite) <= INTERACT_DISTANCE;
  }

  isPlayerNearMimi() {
    return this.isPlayerNearSprite(this.mimi);
  }

  isPlayerNearYuki() {
    return this.isPlayerNearSprite(this.yuki);
  }

  isPlayerNearChloe() {
    return this.isPlayerNearSprite(this.chloe);
  }

  getNearestInteractableNpc() {
    const options = [];

    if (this.mimi && this.isPlayerNearMimi()) {
      options.push({ id: 'mimi', distance: this.getDistanceToMimi() });
    }
    if (this.yuki && this.isPlayerNearYuki()) {
      options.push({ id: 'yuki', distance: this.getDistanceToSprite(this.yuki) });
    }
    if (this.chloe && this.isPlayerNearChloe()) {
      options.push({ id: 'chloe', distance: this.getDistanceToSprite(this.chloe) });
    }

    if (options.length === 0) return null;

    options.sort((a, b) => a.distance - b.distance);
    return options[0].id;
  }

  updateInteractHint() {
    let hintX = this.mimi.x;
    let hintY = this.mimi.y - 28;
    let show = false;

    const nearestId = this.getNearestInteractableNpc();
    if (nearestId === 'mimi' && this.mimi) {
      hintX = this.mimi.x;
      hintY = this.mimi.y - 28;
      show = true;
    } else if (nearestId === 'yuki' && this.yuki) {
      hintX = this.yuki.x;
      hintY = this.yuki.y - 28;
      show = true;
    } else if (nearestId === 'chloe' && this.chloe) {
      hintX = this.chloe.x;
      hintY = this.chloe.y - 28;
      show = true;
    }

    this.nearMimiHint.setPosition(hintX, hintY);
    this.nearMimiHint.setVisible(show);
  }

  startMimiDialogue() {
    console.log('[WelcomeZone] Starting Mimi dialogue');
    this.dialogueBox.open('Mimi', MIMI_DIALOGUE);
    this.player.body.setVelocity(0, 0);
    this.nearMimiHint.setVisible(false);
  }

  startYukiDialogue() {
    if (!this.yukiData) return;
    console.log('[WelcomeZone] Starting Yuki dialogue');
    this.dialogueBox.open(this.yukiData.name, this.yukiData.dialogue);
    this.player.body.setVelocity(0, 0);
    this.nearMimiHint.setVisible(false);
  }

  startChloeDialogue() {
    if (!this.chloeData) return;
    console.log('[WelcomeZone] Starting Chloe dialogue');
    this.dialogueBox.open(this.chloeData.name, this.chloeData.dialogue);
    this.player.body.setVelocity(0, 0);
    this.nearMimiHint.setVisible(false);
  }

  tryInteractWithMimi() {
    if (!Phaser.Input.Keyboard.JustDown(this.spaceKey)) return;

    const nearestId = this.getNearestInteractableNpc();
    if (!nearestId) return;

    const distance =
      nearestId === 'mimi'
        ? this.getDistanceToMimi()
        : nearestId === 'yuki'
          ? this.getDistanceToSprite(this.yuki)
          : this.getDistanceToSprite(this.chloe);

    console.log(
      '[WelcomeZone] SPACE pressed — nearest NPC:',
      nearestId,
      'distance:',
      Math.round(distance),
      'px (need ≤',
      INTERACT_DISTANCE,
      ')',
    );

    if (nearestId === 'mimi') {
      this.startMimiDialogue();
    } else if (nearestId === 'yuki') {
      this.startYukiDialogue();
    } else if (nearestId === 'chloe') {
      this.startChloeDialogue();
    }
  }

  handleDialogueInput() {
    this.player.body.setVelocity(0, 0);
    this.dialogueBox.tryAdvance(this.spaceKey);
  }

  update() {
    if (!this.sceneReady || !this.player?.body) {
      return;
    }

    if (this.dialogueBox.isOpen) {
      this.handleDialogueInput();
      return;
    }

    this.updateInteractHint();
    this.tryInteractWithMimi();
    updateArrivalDoorSuppress(this, this.zoneDoors);
    updateGreenPlayer(this);
  }
}
