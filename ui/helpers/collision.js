// server/collision.js
// Server-side collision detection with improved sliding algorithm

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

  // Check AABB collision
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

  // Check all cells that the hitbox might overlap
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
 * Implements smooth sliding along walls
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
    console.warn("[resolveCollision] No map or grid provided");
    return { x: newX, y: newY };
  }

  // If no collision at new position, allow movement
  if (!checkCollision(map, newX, newY, hitboxSize)) {
    return { x: newX, y: newY };
  }

  // Calculate movement delta
  const dx = newX - oldX;
  const dy = newY - oldY;

  // Try horizontal movement only (slide along vertical walls)
  const tryX = oldX + dx;
  if (!checkCollision(map, tryX, oldY, hitboxSize)) {
    return { x: tryX, y: oldY };
  }

  // Try vertical movement only (slide along horizontal walls)
  const tryY = oldY + dy;
  if (!checkCollision(map, oldX, tryY, hitboxSize)) {
    return { x: oldX, y: tryY };
  }

  // Try smaller incremental movements for smoother sliding
  const steps = 8;
  for (let i = steps; i > 0; i--) {
    const factor = i / steps;

    // Try partial horizontal movement
    const partialX = oldX + dx * factor;
    if (!checkCollision(map, partialX, oldY, hitboxSize)) {
      return { x: partialX, y: oldY };
    }

    // Try partial vertical movement
    const partialY = oldY + dy * factor;
    if (!checkCollision(map, oldX, partialY, hitboxSize)) {
      return { x: oldX, y: partialY };
    }

    // Try diagonal with reduced movement
    if (!checkCollision(map, partialX, partialY, hitboxSize)) {
      return { x: partialX, y: partialY };
    }
  }

  // Can't move at all, return old position
  console.debug(
    `[resolveCollision] Blocked: (${oldX.toFixed(2)}, ${oldY.toFixed(
      2
    )}) -> (${newX.toFixed(2)}, ${newY.toFixed(2)})`
  );
  return { x: oldX, y: oldY };
}
