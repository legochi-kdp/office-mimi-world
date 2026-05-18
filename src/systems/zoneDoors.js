import {
  beginSpawnImmunity,
  getSpawnDoorForTransition,
  isSpawnImmune,
  normalizeDoorName,
} from './zoneSpawn.js';

function isArrivalDoorBlocked(scene, triggerName) {
  if (!scene.arrivalSuppressDoor) return false;
  return normalizeDoorName(triggerName) === scene.arrivalSuppressDoor;
}

function startZoneTransition(scene, targetScene, exitTriggerName) {
  const fromScene = scene.scene.key;
  const exitDoor = normalizeDoorName(exitTriggerName);
  const spawnDoor = getSpawnDoorForTransition(fromScene, exitDoor, targetScene);

  scene.isTransitioning = true;
  console.log(
    `[${fromScene}] Zone transition "${exitTriggerName}" → ${targetScene}`,
    spawnDoor ? `(spawn at ${spawnDoor})` : '',
  );

  const payload = spawnDoor ? { spawnDoor } : {};
  scene.scene.start(targetScene, payload);
}

/** Block re-triggering the door we just arrived through until the player walks away. */
export function applyArrivalDoorSuppress(scene) {
  const data = scene.scene.settings.data ?? {};
  scene.arrivalSuppressDoor = data.spawnDoor ?? null;
}

export function updateArrivalDoorSuppress(scene, doors) {
  if (!scene.arrivalSuppressDoor || !scene.player?.body || !doors?.length) {
    return;
  }

  const arrivalZone = doors.find(
    (door) => normalizeDoorName(door.getData('triggerName')) === scene.arrivalSuppressDoor,
  );
  if (!arrivalZone) {
    scene.arrivalSuppressDoor = null;
    return;
  }

  const stillInside = scene.physics.overlap(scene.player, arrivalZone);
  if (!stillInside) {
    scene.arrivalSuppressDoor = null;
  }
}

/**
 * Builds physics zones from Tiled Triggers rectangles and starts scenes on overlap.
 */
export function setupZoneDoorOverlaps(scene, map, transitionMap) {
  const triggersLayer = map.getObjectLayer('Triggers');
  if (!triggersLayer?.objects?.length) {
    console.warn(`[${scene.scene.key}] No Triggers layer — zone doors not wired.`);
    return [];
  }

  const doors = [];

  triggersLayer.objects.forEach((object) => {
    const targetScene = transitionMap[object.name];
    if (!targetScene) return;

    const zone = scene.add.zone(
      object.x + object.width / 2,
      object.y + object.height / 2,
      object.width,
      object.height,
    );
    scene.physics.add.existing(zone, true);
    zone.setData('targetScene', targetScene);
    zone.setData('triggerName', object.name);
    doors.push(zone);

    console.log(`[${scene.scene.key}] Zone door wired:`, object.name, '→', targetScene);
  });

  if (doors.length > 0 && scene.player) {
    scene.physics.add.overlap(scene.player, doors, (_player, door) => {
      if (!scene.sceneReady || scene.dialogueBox?.isOpen) return;
      if (scene.isTransitioning) return;
      if (isSpawnImmune(scene)) return;

      const target = door.getData('targetScene');
      const triggerName = door.getData('triggerName');
      if (!target) return;
      if (isArrivalDoorBlocked(scene, triggerName)) return;

      startZoneTransition(scene, target, triggerName);
    });
  }

  return doors;
}

/**
 * Placeholder scenes: manual exit rectangles until Tiled maps exist.
 */
export function setupPlaceholderDoorOverlaps(scene, exits) {
  const doors = [];

  exits.forEach((exit) => {
    const zone = scene.add.zone(
      exit.x + exit.width / 2,
      exit.y + exit.height / 2,
      exit.width,
      exit.height,
    );
    scene.physics.add.existing(zone, true);
    zone.setData('targetScene', exit.target);
    zone.setData('triggerName', exit.exitName);
    doors.push(zone);
  });

  if (doors.length > 0 && scene.player) {
    scene.physics.add.overlap(scene.player, doors, (_player, door) => {
      if (!scene.sceneReady) return;
      if (scene.isTransitioning) return;
      if (isSpawnImmune(scene)) return;

      const target = door.getData('targetScene');
      const triggerName = door.getData('triggerName');
      if (!target) return;
      if (isArrivalDoorBlocked(scene, triggerName)) return;

      startZoneTransition(scene, target, triggerName);
    });
  }

  return doors;
}

export { beginSpawnImmunity };
