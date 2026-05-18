import Phaser from 'phaser';
import {
  setupPlaceholderDoorOverlaps,
  beginSpawnImmunity,
  applyArrivalDoorSuppress,
  updateArrivalDoorSuppress,
} from '../systems/zoneDoors.js';
import { getPlaceholderSpawn } from '../systems/zoneSpawn.js';
import {
  createGreenPlayer,
  initPlayerInput,
  updateGreenPlayer,
} from '../systems/playerControl.js';

const WORLD_W = 800;
const WORLD_H = 600;

export default class AIZone extends Phaser.Scene {
  constructor() {
    super({ key: 'AIZone' });
  }

  create() {
    this.sceneReady = false;
    this.isTransitioning = false;

    const transitionData = this.scene.settings.data ?? {};
    const spawnDoor = transitionData.spawnDoor ?? 'welcome';
    const spawn = getPlaceholderSpawn('AIZone', spawnDoor);

    initPlayerInput(this);
    this.player = createGreenPlayer(this, spawn.x, spawn.y, WORLD_W, WORLD_H);

    this.add
      .text(WORLD_W / 2, 48, 'AI Zone — coming soon', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);

    this.add
      .text(WORLD_W / 2, WORLD_H - 24, 'Walk to a door at the edge to leave', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        color: '#888888',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);

    this.zoneDoors = setupPlaceholderDoorOverlaps(this, [
      {
        x: 0,
        y: 200,
        width: 48,
        height: 200,
        target: 'WelcomeZone',
        exitName: 'welcome',
      },
      {
        x: WORLD_W - 48,
        y: 200,
        width: 48,
        height: 200,
        target: 'DataZone',
        exitName: 'data',
      },
    ]);

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(2);

    applyArrivalDoorSuppress(this);
    beginSpawnImmunity(this);
    this.sceneReady = true;
  }

  update() {
    updateArrivalDoorSuppress(this, this.zoneDoors);
    updateGreenPlayer(this);
  }
}
