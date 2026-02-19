// server/collision.js
// Server-side collision detection with improved sliding algorithm
import { isSolidCell } from "../shared/cell-types.js";

/**
 * Get player hitbox in world coordinates
 */
export function getPlayerHitbox(x, y, hitboxSize = 0.6) {
  const offset = (1 - hitboxSize) / 2;
  return {
    left: x + offset,
    right: x + offset + hitboxSize,
    top: y + offset,
    bottom: y + offset + hitboxSize,
  };
}

/**
 * Get cell at grid position
 */
function getCellAt(grid, x, y) {
  if (!grid || !Array.isArray(grid)) return null;
  if (y < 0 || y >= grid.length) return null;
  if (x < 0 || !grid[y] || x >= grid[y].length) return null;
  return grid[y][x];
}

/**
 * Check if a hitbox overlaps with a solid cell
 */
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

/**
 * Check collision between player hitbox and map
 */
export function checkCollision(map, x, y, hitboxSize = 0.6) {
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

/**
 * Resolve collision by adjusting player position
 */
export function resolveCollision(
  map,
  oldX,
  oldY,
  newX,
  newY,
  hitboxSize = 0.6,
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
 * ✅ Check if position collides with bombs (using hitbox collision)
 * The bomb blocks the entire cell, but only if the player is not marked as "inside"
 */
export function checkBombCollision(lobby, playerId, x, y, hitboxSize = 0.6) {
  if (!lobby.bombs) return false;

  // Get player's hitbox
  const playerHitbox = getPlayerHitbox(x, y, hitboxSize);

  for (const bomb of lobby.bombs) {
    // If player is marked as inside the bomb, they can move freely
    if (bomb.playersInside.has(playerId)) {
      continue;
    }

    // Bomb occupies the entire cell from bomb.x to bomb.x+1, bomb.y to bomb.y+1
    const bombLeft = bomb.x;
    const bombRight = bomb.x + 1;
    const bombTop = bomb.y;
    const bombBottom = bomb.y + 1;

    // Check AABB collision between player hitbox and bomb cell
    const collides = !(
      playerHitbox.right <= bombLeft ||
      playerHitbox.left >= bombRight ||
      playerHitbox.bottom <= bombTop ||
      playerHitbox.top >= bombBottom
    );

    if (collides) {
      return true; // Bomb blocks the player
    }
  }

  return false;
}
