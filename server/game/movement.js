// server/game/movement.js

import { resolveCollision, checkBombCollision } from "../collision.js";
import { updateBombPlayerTracking, checkPowerUpPickup } from "../bomb.js";
import {
  PLAYER_HITBOX_SIZE,
  MAP_COLS,
  MAP_ROWS,
} from "../../shared/constants.js";

const MOVE_HZ = 60;
const MOVE_INTERVAL_MS = Math.round(1000 / MOVE_HZ);
const SPEED_CELLS_PER_SEC = 4;
const HITBOX_SIZE = PLAYER_HITBOX_SIZE;

/**
 * Create a virtual map where blocks are treated as floor (for wallpass).
 */
function getWallpassMap(map) {
  if (!map || !map.grid) return map;
  return {
    ...map,
    grid: map.grid.map((row) =>
      row.map((cell) => (cell === "block" ? "floor" : cell)),
    ),
  };
}

/**
 * Start a 60 Hz movement interval for a player.
 */
export function startPlayerMoveInterval(lobby, player, broadcastFn) {
  if (player._moveInterval) return;
  console.log(
    `[movement] starting move interval for player ${player.id} (${player.pseudo}) in lobby ${lobby.code}`,
  );

  player._moveInterval = setInterval(() => {
    if (!lobby.map || !lobby.map.grid) {
      console.warn(
        `[movement] No map for lobby ${lobby.code}, skipping movement`,
      );
      return;
    }

    const cols = lobby.map.width || MAP_COLS;
    const rows = lobby.map.height || MAP_ROWS;
    const input = player._inputState || {
      left: false,
      right: false,
      up: false,
      down: false,
    };

    let vx = 0,
      vy = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;

    if (vx === 0 && vy === 0) return;

    const dt = MOVE_INTERVAL_MS / 1000;
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    const nx = vx / len;
    const ny = vy / len;
    const playerSpeed = player.speed || SPEED_CELLS_PER_SEC;
    const moveX = nx * playerSpeed * dt;
    const moveY = ny * playerSpeed * dt;

    if (typeof player.x !== "number") player.x = 1;
    if (typeof player.y !== "number") player.y = 1;

    const oldX = player.x;
    const oldY = player.y;
    const newX = oldX + moveX;
    const newY = oldY + moveY;

    if (checkBombCollision(lobby, player.id, newX, newY)) {
      return;
    }

    const resolved = resolveCollision(
      player.wallpass ? getWallpassMap(lobby.map) : lobby.map,
      oldX,
      oldY,
      newX,
      newY,
      HITBOX_SIZE,
    );

    player.x = resolved.x;
    player.y = resolved.y;

    // Clamp to map bounds
    const clampOffset = (1 - HITBOX_SIZE) / 2;
    player.x = Math.max(
      clampOffset,
      Math.min(cols - 1 + clampOffset, player.x),
    );
    player.y = Math.max(
      clampOffset,
      Math.min(rows - 1 + clampOffset, player.y),
    );

    updateBombPlayerTracking(lobby, player.id, player.x, player.y);
    checkPowerUpPickup(lobby, player, (type, payload) => {
      broadcastFn(lobby.code, { type, ...payload });
    });

    // Broadcast position
    try {
      broadcastFn(lobby.code, {
        type: "playerPosition",
        player: {
          id: player.id,
          pseudo: player.pseudo,
          x: player.x,
          y: player.y,
          lives: player.lives,
          dead: player.dead,
          invincibleUntil: player.invincibleUntil,
          maxBombs: player.maxBombs,
          bombRange: player.bombRange,
          speed: player.speed,
          wallpass: player.wallpass,
          detonator: player.detonator,
          vestActive: player.vestActive || false,
          vestUntil: player.vestUntil || null,
          skullEffect: player.skullEffect || null,
          skullUntil: player.skullUntil || null,
          invisible: !!player.invisible,
          team: player.team || 0,
        },
        source: "server-move",
        ts: Date.now(),
      });
    } catch (e) {
      console.error("[movement] broadcast error", e);
    }
  }, MOVE_INTERVAL_MS);
}

/**
 * Stop the movement interval for a player.
 */
export function stopPlayerMoveInterval(player) {
  if (player._moveInterval) {
    console.log(
      `[movement] stop move interval for player ${player.id} (${player.pseudo})`,
    );
    clearInterval(player._moveInterval);
    player._moveInterval = null;
  }
}
