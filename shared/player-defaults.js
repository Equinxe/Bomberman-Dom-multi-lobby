// shared/player-defaults.js
// Default player stats — shared between server initialisation and lobby reset
// to avoid duplication of the same reset block in multiple places.

/**
 * Reset a player object to default game-start values.
 * Mutates the player in place and returns it for convenience.
 */
export function resetPlayerStats(player) {
  player.lives = 3;
  player.dead = false;
  player.deathTime = null;
  player.invincibleUntil = null;

  // Power-up stats
  player.maxBombs = 1;
  player.bombRange = 3;
  player.speed = 4;
  player.wallpass = false;
  player.detonator = false;
  player.vestActive = false;
  player.vestUntil = null;
  player.skullEffect = null;
  player.skullUntil = null;
  player.autoBomb = false;
  player.invisible = false;

  // Clean up transient keys
  delete player.canPlaceBombs;
  delete player._preSkull;
  delete player._lastAutoBomb;

  return player;
}

/**
 * Player spawn positions for a standard 15×13 map.
 */
export const SPAWN_POSITIONS = [
  { x: 1, y: 1 }, // Top-Left
  { x: 13, y: 11 }, // Bottom-Right (cols-2, rows-2)
  { x: 13, y: 1 }, // Top-Right
  { x: 1, y: 11 }, // Bottom-Left
];

/**
 * Get spawn position for a player index on a given map size.
 */
export function getSpawnPosition(index, cols = 15, rows = 13) {
  const spawns = [
    { x: 1, y: 1 },
    { x: cols - 2, y: rows - 2 },
    { x: cols - 2, y: 1 },
    { x: 1, y: rows - 2 },
  ];
  return spawns[index % spawns.length];
}
