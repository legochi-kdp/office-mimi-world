import Phaser from 'phaser';
import DialogueBox from '../ui/DialogueBox.js';
import charactersData from '../data/characters.json';

const TILE_SIZE = 16;
const MAP_TILE_WIDTH = 30;
const MAP_TILE_HEIGHT = 22;
const MAP_WIDTH_PX = MAP_TILE_WIDTH * TILE_SIZE;
const MAP_HEIGHT_PX = MAP_TILE_HEIGHT * TILE_SIZE;

const PLAYER_SPAWN_X = 32;
const PLAYER_SPAWN_Y = 176;

const INTERACT_DISTANCE = 100;
const DOOR_LABEL_DEPTH = 50;

const TRIGGER_LABELS = {
  WelcomeZoneDoor: '🏢 Welcome Zone',
  AIZoneDoor: '🤖 AI Zone',
  ArtofCommsDoor: '🎭 Art of Comms',
};

const NPC_SPAWNS = [
  { id: 'mia', x: 160, y: 160 },
  { id: 'jinho', x: 400, y: 240 },
  { id: 'sofia', x: 560, y: 400 },
  { id: 'sean', x: 80, y: 400 },
];

const TILE_LAYER_ORDER = [
  'Floor',
  'Walls',
  'Furniture',
  'Furniture 2',
  'Objects',
  'Objects 2',
];

function findCharacter(id) {
  return charactersData.find((character) => character.id === id);
}

function parseColour(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

export default class DataZone extends Phaser.Scene {
  constructor() {
    super({ key: 'DataZone' });
  }

  preload() {
    this.load.on('loaderror', (file) => {
      console.error('[DataZone] Failed to load:', file.key, file.url);
    });

    this.load.image('Modern_Office_16x16', '/tilesets/Modern_Office_16x16.png');
    this.load.image('Room_Builder_Office_16x16', '/tilesets/Room_Builder_Office_16x16.png');
    this.load.image('Office_interiors_16x16', '/tilesets/Office_interiors_16x16.png');
    this.load.tilemapTiledJSON('DataZone', '/maps/DataZone.json');
    this.load.json('characters', '/src/data/characters.json');
  }

  create() {
    this.sceneReady = false;
    this.initInputAndDialogue();

    this.characters = this.cache.json.get('characters') ?? charactersData;
    this.npcs = [];

    const cacheMap = this.cache.tilemap.get('DataZone');
    if (!cacheMap) {
      this.showLoadError('Map failed to load. Export DataZone.json from Tiled as JSON.');
      return;
    }

    const map = this.make.tilemap({ key: 'DataZone' });
    const tilesets = this.linkTilesets(map);
    if (tilesets.length === 0) {
      this.showLoadError('Could not link tilesets. Check PNG files in assets/tilesets/.');
      return;
    }

    const collisionLayers = this.createTileLayers(map, tilesets);
    const wallsLayer = collisionLayers.walls;
    const furnitureLayer = collisionLayers.furniture;

    if (!wallsLayer || !furnitureLayer) {
      this.showLoadError('Missing Walls or Furniture layer in DataZone.json.');
      return;
    }

    wallsLayer.setCollisionByExclusion([-1]);
    furnitureLayer.setCollisionByExclusion([-1]);

    this.createPlayer();
    this.createNpcs();
    this.createTriggerLabels(map);

    if (wallsLayer && furnitureLayer) {
      this.physics.add.collider(this.player, wallsLayer);
      this.physics.add.collider(this.player, furnitureLayer);
    }

    this.interactHint = this.add
      .text(0, 0, 'Press SPACE', {
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

  linkTilesets(map) {
    const textureByName = {
      Modern_Office_16x16: 'Modern_Office_16x16',
      Room_Builder_Office_16x16: 'Room_Builder_Office_16x16',
      Office_interiors_16x16: 'Office_interiors_16x16',
    };

    const linked = [];

    map.tilesets.forEach((tilesetData, index) => {
      const textureKey = textureByName[tilesetData.name];
      if (!textureKey) {
        console.warn('[DataZone] No texture mapped for tileset:', tilesetData.name);
        return;
      }

      let tileset = map.addTilesetImage(tilesetData.name, textureKey);
      if (!tileset) {
        tileset = map.addTilesetImage(index, textureKey);
      }
      if (tileset) {
        linked.push(tileset);
      }
    });

    console.log('[DataZone] Linked tilesets:', linked.map((t) => t.name));
    return linked;
  }

  createTileLayers(map, tilesets) {
    const result = { walls: null, furniture: null };
    let depth = 0;

    TILE_LAYER_ORDER.forEach((layerName) => {
      const layer = map.createLayer(layerName, tilesets, 0, 0);
      if (!layer) {
        console.warn('[DataZone] Tile layer not found:', layerName);
        return;
      }

      layer.setDepth(depth);
      depth += 1;

      if (layerName === 'Walls') result.walls = layer;
      if (layerName === 'Furniture') result.furniture = layer;
    });

    return result;
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
      .setOrigin(0.5, 1)
      .setScrollFactor(1);

    const boxWidth = label.width + paddingX * 2;
    const boxHeight = label.height + paddingY * 2;

    const background = this.add.graphics();
    background.fillStyle(0x000000, 0.72);
    background.fillRoundedRect(
      centerX - boxWidth / 2,
      topY - boxHeight,
      boxWidth,
      boxHeight,
      8,
    );
    background.setScrollFactor(1);
    background.setDepth(DOOR_LABEL_DEPTH - 1);

    label.setPosition(centerX, topY);
    label.setDepth(DOOR_LABEL_DEPTH);

    return { label, background };
  }

  createTriggerLabels(map) {
    const triggersLayer = map.getObjectLayer('Triggers');
    console.log('[DataZone] getObjectLayer("Triggers"):', triggersLayer);

    if (!triggersLayer?.objects?.length) {
      console.warn('[DataZone] Triggers layer missing or empty — door labels skipped.');
      return;
    }

    triggersLayer.objects.forEach((object) => {
      console.log('[DataZone] Trigger object:', object.name, object.x, object.y);

      const labelText = TRIGGER_LABELS[object.name];
      if (!labelText) {
        console.warn('[DataZone] No label for trigger:', object.name);
        return;
      }

      const centerX = object.x + object.width / 2;
      this.createDoorLabel(centerX, object.y - 8, labelText);
    });
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
    console.error('[DataZone]', message);
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

  createPlayer() {
    this.player = this.add.rectangle(PLAYER_SPAWN_X, PLAYER_SPAWN_Y, 32, 32, 0x00ff00);
    this.player.setDepth(10);
    this.physics.add.existing(this.player);
    this.player.body.setSize(28, 28);

    this.physics.world.setBounds(0, 0, MAP_WIDTH_PX, MAP_HEIGHT_PX);
    this.player.body.setCollideWorldBounds(true);
  }

  createNpcs() {
    NPC_SPAWNS.forEach((spawn) => {
      const data = findCharacter(spawn.id);
      if (!data) {
        console.warn('[DataZone] Character not found:', spawn.id);
        return;
      }

      const sprite = this.add.rectangle(
        spawn.x,
        spawn.y,
        32,
        32,
        parseColour(data.colour),
      );
      sprite.setStrokeStyle(2, 0x000000, 0.35);
      sprite.setDepth(9);

      this.npcs.push({ id: spawn.id, sprite, data });
    });
  }

  ensureDialogueAboveCanvas() {
    const container = document.getElementById('game-container');
    const box = document.getElementById('dialogue-box');
    if (container && box) {
      container.appendChild(box);
    }
  }

  getDistanceToSprite(sprite) {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
  }

  getNearestInteractableNpc() {
    const options = this.npcs
      .filter((npc) => this.getDistanceToSprite(npc.sprite) <= INTERACT_DISTANCE)
      .map((npc) => ({ id: npc.id, distance: this.getDistanceToSprite(npc.sprite) }));

    if (options.length === 0) return null;

    options.sort((a, b) => a.distance - b.distance);
    return options[0].id;
  }

  updateInteractHint() {
    const nearestId = this.getNearestInteractableNpc();
    const npc = this.npcs.find((n) => n.id === nearestId);

    if (npc) {
      this.interactHint.setPosition(npc.sprite.x, npc.sprite.y - 28);
      this.interactHint.setVisible(true);
    } else {
      this.interactHint.setVisible(false);
    }
  }

  startNpcDialogue(npcId) {
    const npc = this.npcs.find((n) => n.id === npcId);
    if (!npc) return;

    console.log('[DataZone] Starting dialogue:', npc.data.name);
    this.dialogueBox.open(npc.data.name, npc.data.dialogue);
    this.player.body.setVelocity(0, 0);
    this.interactHint.setVisible(false);
  }

  tryInteractWithNpcs() {
    if (!Phaser.Input.Keyboard.JustDown(this.spaceKey)) return;

    const nearestId = this.getNearestInteractableNpc();
    if (!nearestId) return;

    this.startNpcDialogue(nearestId);
  }

  handleDialogueInput() {
    this.player.body.setVelocity(0, 0);
    this.dialogueBox.tryAdvance(this.spaceKey);
  }

  update() {
    if (!this.sceneReady || !this.player) return;

    if (this.dialogueBox.isOpen) {
      this.handleDialogueInput();
      return;
    }

    this.updateInteractHint();
    this.tryInteractWithNpcs();

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
