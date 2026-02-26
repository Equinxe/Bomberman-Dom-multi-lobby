// shared/player-defaults.js

import { MAP_COLS, MAP_ROWS } from "./constants.js";

/**
 * Reset a player to default game-start values. Mutates in place.
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
 * Spawn positions for a standard map.
 */
export const SPAWN_POSITIONS = [
  { x: 1, y: 1 },
  { x: MAP_COLS - 2, y: MAP_ROWS - 2 },
  { x: MAP_COLS - 2, y: 1 },
  { x: 1, y: MAP_ROWS - 2 },
];

/**
 * Get spawn position for a player index on a given map size.
 */
export function getSpawnPosition(index, cols = MAP_COLS, rows = MAP_ROWS) {
  const spawns = [
    { x: 1, y: 1 },
    { x: cols - 2, y: rows - 2 },
    { x: cols - 2, y: 1 },
    { x: 1, y: rows - 2 },
  ];
  return spawns[index % spawns.length];
}
