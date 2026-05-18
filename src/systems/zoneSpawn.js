import Phaser from 'phaser';

const SPAWN_INSET = 40;

/** Normalize Tiled trigger names to canonical door ids. */
const DOOR_ALIASES = {
  DataZone: 'data',
  DataZoneDoor: 'data',
  AIZone: 'ai',
  AIZoneDoor: 'ai',
  'AI Zone': 'ai',
  'Welcome Zone': 'welcome',
  WelcomeZoneDoor: 'welcome',
  ArtofComms: 'criticalComms',
  ArtofCommsDoor: 'criticalComms',
  CriticalCommsDoor: 'criticalComms',
  Entrance: 'entrance',
  MainEntrance: 'entrance',
};

/**
 * Which door in the destination scene to spawn at when leaving `fromScene`
 * through `exitDoor` (canonical) into `toScene`.
 */
const SPAWN_PAIRING = {
  'WelcomeZone|data|DataZone': 'welcome',
  'DataZone|welcome|WelcomeZone': 'data',
  'WelcomeZone|ai|AIZone': 'welcome',
  'DataZone|ai|AIZone': 'data',
  'DataZone|criticalComms|CriticalComms': 'data',
  'CriticalComms|data|DataZone': 'criticalComms',
  'AIZone|welcome|WelcomeZone': 'ai',
  'AIZone|data|DataZone': 'ai',
};

/** Fallback spawn when a scene has no Tiled map yet. */
const PLACEHOLDER_SPAWNS = {
  AIZone: {
    welcome: { x: 96, y: 300 },
    data: { x: 704, y: 300 },
  },
  CriticalComms: {
    data: { x: 96, y: 300 },
    criticalComms: { x: 400, y: 300 },
  },
};

export function normalizeDoorName(tiledName) {
  return DOOR_ALIASES[tiledName] ?? tiledName;
}

export function getSpawnDoorForTransition(fromScene, exitDoor, toScene) {
  const exit = normalizeDoorName(exitDoor);
  const key = `${fromScene}|${exit}|${toScene}`;
  return SPAWN_PAIRING[key] ?? null;
}

export function findTriggerByCanonical(map, canonicalDoor) {
  const layer = map.getObjectLayer('Triggers');
  if (!layer?.objects) return null;

  return (
    layer.objects.find((object) => normalizeDoorName(object.name) === canonicalDoor) ??
    null
  );
}

/**
 * Place the player just inside the room relative to the door trigger.
 */
export function computeSpawnFromTrigger(trigger, mapWidthPx, mapHeightPx) {
  const centerX = trigger.x + trigger.width / 2;
  const centerY = trigger.y + trigger.height / 2;

  let x = centerX;
  let y = centerY;

  if (centerX < mapWidthPx * 0.35) {
    x = trigger.x + trigger.width + SPAWN_INSET;
  } else if (centerX > mapWidthPx * 0.65) {
    x = trigger.x - SPAWN_INSET;
  } else if (centerY < mapHeightPx * 0.35) {
    y = trigger.y + trigger.height + SPAWN_INSET;
  } else if (centerY > mapHeightPx * 0.65) {
    y = trigger.y - SPAWN_INSET;
  } else {
    y = trigger.y - SPAWN_INSET;
  }

  return {
    x: Phaser.Math.Clamp(x, 20, mapWidthPx - 20),
    y: Phaser.Math.Clamp(y, 20, mapHeightPx - 20),
  };
}

export function resolveMapSpawn(map, spawnDoor, mapWidthPx, mapHeightPx, fallback) {
  const trigger = findTriggerByCanonical(map, spawnDoor);
  if (!trigger) {
    console.warn('[zoneSpawn] Door not found on map:', spawnDoor, '— using fallback');
    return fallback;
  }

  const point = computeSpawnFromTrigger(trigger, mapWidthPx, mapHeightPx);
  console.log('[zoneSpawn] Spawn at door', spawnDoor, point);
  return point;
}

export function getPlaceholderSpawn(sceneKey, spawnDoor) {
  const table = PLACEHOLDER_SPAWNS[sceneKey];
  return table?.[spawnDoor] ?? table?.welcome ?? { x: 400, y: 300 };
}

export const SPAWN_IMMUNITY_MS = 550;

export function beginSpawnImmunity(scene) {
  scene.spawnImmunityUntil = scene.time.now + SPAWN_IMMUNITY_MS;
}

export function isSpawnImmune(scene) {
  return Boolean(scene.spawnImmunityUntil && scene.time.now < scene.spawnImmunityUntil);
}
