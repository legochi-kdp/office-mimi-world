import Phaser from 'phaser';

const MOVE_SPEED = 150;

export function createGreenPlayer(scene, x, y, worldWidth, worldHeight) {
  const player = scene.add.rectangle(x, y, 32, 32, 0x00ff00);
  player.setDepth(10);
  scene.physics.add.existing(player);
  player.body.setSize(28, 28);
  player.body.enable = true;
  scene.physics.world.setBounds(0, 0, worldWidth, worldHeight);
  player.body.setCollideWorldBounds(true);
  return player;
}

export function initPlayerInput(scene) {
  scene.cursors = scene.input.keyboard.createCursorKeys();
}

/** Re-create cursor keys if missing (e.g. after scene restart). */
export function ensurePlayerInput(scene) {
  if (!scene.cursors) {
    scene.cursors = scene.input.keyboard.createCursorKeys();
  }
}

export function updateGreenPlayer(scene) {
  if (!scene.sceneReady || !scene.player?.body) {
    return;
  }

  ensurePlayerInput(scene);

  if (scene.dialogueBox?.isOpen) {
    scene.player.body.setVelocity(0, 0);
    return;
  }

  let vx = 0;
  let vy = 0;

  if (scene.cursors.left.isDown) vx = -MOVE_SPEED;
  else if (scene.cursors.right.isDown) vx = MOVE_SPEED;

  if (scene.cursors.up.isDown) vy = -MOVE_SPEED;
  else if (scene.cursors.down.isDown) vy = MOVE_SPEED;

  scene.player.body.setVelocity(vx, vy);

  if (vx !== 0 && vy !== 0) {
    scene.player.body.velocity.normalize().scale(MOVE_SPEED);
  }
}
