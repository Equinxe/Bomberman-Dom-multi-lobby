// server/collision.js
import { isSolidCell } from "../shared/cell-types.js";
import { PLAYER_HITBOX_SIZE } from "../shared/constants.js";

export function getPlayerHitbox(x, y, hitboxSize = PLAYER_HITBOX_SIZE) {
  const offset = (1 - hitboxSize) / 2;
  return {
    left: x + offset,
    right: x + offset + hitboxSize,
    top: y + offset,
    bottom: y + offset + hitboxSize,
  };
}

function getCellAt(grid, x, y) {
  if (!grid || !Array.isArray(grid)) return null;
  if (y < 0 || y >= grid.length) return null;
  if (x < 0 || !grid[y] || x >= grid[y].length) return null;
  return grid[y][x];
}

function hitboxOverlapsCell(hitbox, cellX, cellY) {
  const cellLeft = cellX;
  const cellRight = cellX + 1;
  const cellTop = cellY;
  const cellBottom = cellY + 1;

  return !(
    hitbox.right <= cellLeft ||
    hitbox.left >= cellRight ||
    hitbox.bottom <= cellTop ||
    hitbox.top >= cellBottom
  );
}

export function checkCollision(map, x, y, hitboxSize = PLAYER_HITBOX_SIZE) {
  if (!map || !map.grid) return false;

  const hitbox = getPlayerHitbox(x, y, hitboxSize);
  const grid = map.grid;

  const minCellX = Math.floor(hitbox.left);
  const maxCellX = Math.floor(hitbox.right);
  const minCellY = Math.floor(hitbox.top);
  const maxCellY = Math.floor(hitbox.bottom);

  for (let cy = minCellY; cy <= maxCellY; cy++) {
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      const cell = getCellAt(grid, cx, cy);
      if (isSolidCell(cell) && hitboxOverlapsCell(hitbox, cx, cy)) {
        return true;
      }
    }
  }

  return false;
}

export function resolveCollision(
  map,
  oldX,
  oldY,
  newX,
  newY,
  hitboxSize = PLAYER_HITBOX_SIZE,
) {
  if (!map || !map.grid) {
    console.warn("[resolveCollision] No map or grid provided");
    return { x: newX, y: newY };
  }

  if (!checkCollision(map, newX, newY, hitboxSize)) {
    return { x: newX, y: newY };
  }

  const dx = newX - oldX;
  const dy = newY - oldY;

  const tryX = oldX + dx;
  if (!checkCollision(map, tryX, oldY, hitboxSize)) {
    return { x: tryX, y: oldY };
  }

  const tryY = oldY + dy;
  if (!checkCollision(map, oldX, tryY, hitboxSize)) {
    return { x: oldX, y: tryY };
  }

  const steps = 8;
  for (let i = steps; i > 0; i--) {
    const factor = i / steps;

    const partialX = oldX + dx * factor;
    if (!checkCollision(map, partialX, oldY, hitboxSize)) {
      return { x: partialX, y: oldY };
    }

    const partialY = oldY + dy * factor;
    if (!checkCollision(map, oldX, partialY, hitboxSize)) {
      return { x: oldX, y: partialY };
    }

    if (!checkCollision(map, partialX, partialY, hitboxSize)) {
      return { x: partialX, y: partialY };
    }
  }

  return { x: oldX, y: oldY };
}

/**
 * Check if position collides with bombs (player must not be marked as "inside").
 */
export function checkBombCollision(
  lobby,
  playerId,
  x,
  y,
  hitboxSize = PLAYER_HITBOX_SIZE,
) {
  if (!lobby.bombs) return false;

  const playerHitbox = getPlayerHitbox(x, y, hitboxSize);

  for (const bomb of lobby.bombs) {
    if (bomb.playersInside.has(playerId)) {
      continue;
    }

    const collides = !(
      playerHitbox.right <= bomb.x ||
      playerHitbox.left >= bomb.x + 1 ||
      playerHitbox.bottom <= bomb.y ||
      playerHitbox.top >= bomb.y + 1
    );

    if (collides) {
      return true;
    }
  }

  return false;
}
