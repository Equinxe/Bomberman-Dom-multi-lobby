// ui/helpers/collision.js
// Client-side collision helpers

/**
 * Check if a cell is solid (wall or block)
 */
export function isSolidCell(cell) {
  if (!cell && cell !== 0) return false;
  if (typeof cell === "string") {
    return cell === "wall" || cell === "wallDark" || cell === "block";
  }
  if (typeof cell === "object" && cell.type) {
    return (
      cell.type === "wall" || cell.type === "wallDark" || cell.type === "block"
    );
  }
  if (typeof cell === "number") {
    return cell === 0 || cell === 1;
  }
  return false;
}

/**
 * Check if a cell is a destructible block
 */
export function isDestructibleCell(cell) {
  if (!cell) return false;
  if (typeof cell === "string") {
    return cell === "block";
  }
  if (typeof cell === "object" && cell.type) {
    return cell.type === "block";
  }
  return false;
}

/**
 * Check if a cell is an indestructible wall
 */
export function isIndestructibleCell(cell) {
  if (!cell) return false;
  if (typeof cell === "string") {
    return cell === "wall" || cell === "wallDark";
  }
  if (typeof cell === "object" && cell.type) {
    return cell.type === "wall" || cell.type === "wallDark";
  }
  return false;
}

/**
 * Check if a cell is a wall (indestructible)
 */
export function isWallCell(cell) {
  return isIndestructibleCell(cell);
}

/**
 * Check if a cell is floor (walkable)
 */
export function isFloorCell(cell) {
  if (!cell) return false;
  if (typeof cell === "string") {
    return cell === "floor";
  }
  if (typeof cell === "object" && cell.type) {
    return cell.type === "floor";
  }
  return false;
}

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
  hitboxSize = 0.6
) {
  if (!map || !map.grid) {
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
