// ui/helpers/collision.js
// Complete collision detection system for Bomberman

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
 * Check if a cell is destructible (block)
 */
export function isDestructibleCell(cell) {
  if (!cell && cell !== 0) return false;
  if (typeof cell === "string") return cell === "block";
  if (typeof cell === "object" && cell.type) return cell.type === "block";
  if (typeof cell === "number") return cell === 1;
  return false;
}

/**
 * Check if a cell is indestructible (wall)
 */
export function isIndestructibleCell(cell) {
  if (!cell && cell !== 0) return false;
  if (typeof cell === "string") return cell === "wall" || cell === "wallDark";
  if (typeof cell === "object" && cell.type)
    return cell.type === "wall" || cell.type === "wallDark";
  if (typeof cell === "number") return cell === 0;
  return false;
}

/**
 * Get player hitbox in world coordinates
 * Player hitbox is smaller than a full cell (60% of cell size, centered)
 * @param {number} x - Player x position (in cells)
 * @param {number} y - Player y position (in cells)
 * @param {number} hitboxSize - Size of hitbox as ratio of cell (default 0.6)
 * @returns {{left: number, right: number, top: number, bottom: number}}
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
 * @param {Array} grid - Map grid
 * @param {number} x - Cell x coordinate
 * @param {number} y - Cell y coordinate
 * @returns {*} Cell value or null if out of bounds
 */
function getCellAt(grid, x, y) {
  if (!grid || !Array.isArray(grid)) return null;
  if (y < 0 || y >= grid.length) return null;
  if (x < 0 || !grid[y] || x >= grid[y].length) return null;
  return grid[y][x];
}

/**
 * Check collision between player hitbox and map
 * @param {Object} map - Map object with grid
 * @param {number} x - Player x position (in cells)
 * @param {number} y - Player y position (in cells)
 * @param {number} hitboxSize - Hitbox size ratio (default 0.6)
 * @returns {boolean} True if collision detected
 */
export function checkCollision(map, x, y, hitboxSize = 0.6) {
  if (!map || !map.grid) return false;

  const hitbox = getPlayerHitbox(x, y, hitboxSize);
  const grid = map.grid;

  // Get the cells that the hitbox overlaps
  const minCellX = Math.floor(hitbox.left);
  const maxCellX = Math.floor(hitbox.right);
  const minCellY = Math.floor(hitbox.top);
  const maxCellY = Math.floor(hitbox.bottom);

  // Check each cell the hitbox touches
  for (let cy = minCellY; cy <= maxCellY; cy++) {
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      const cell = getCellAt(grid, cx, cy);
      if (isSolidCell(cell)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Resolve collision by adjusting player position
 * Implements sliding along walls for smooth movement
 * @param {Object} map - Map object with grid
 * @param {number} oldX - Previous x position
 * @param {number} oldY - Previous y position
 * @param {number} newX - Desired new x position
 * @param {number} newY - Desired new y position
 * @param {number} hitboxSize - Hitbox size ratio (default 0.6)
 * @returns {{x: number, y: number}} Corrected position
 */
export function resolveCollision(
  map,
  oldX,
  oldY,
  newX,
  newY,
  hitboxSize = 0.6
) {
  if (!map || !map.grid) return { x: newX, y: newY };

  // If no collision at new position, allow movement
  if (!checkCollision(map, newX, newY, hitboxSize)) {
    return { x: newX, y: newY };
  }

  // Try moving only on X axis (slide vertically along wall)
  if (!checkCollision(map, newX, oldY, hitboxSize)) {
    return { x: newX, y: oldY };
  }

  // Try moving only on Y axis (slide horizontally along wall)
  if (!checkCollision(map, oldX, newY, hitboxSize)) {
    return { x: oldX, y: newY };
  }

  // Can't move, return old position
  return { x: oldX, y: oldY };
}

/**
 * Get all cells that player hitbox overlaps
 * Useful for checking which blocks player is touching
 * @param {number} x - Player x position (in cells)
 * @param {number} y - Player y position (in cells)
 * @param {number} hitboxSize - Hitbox size ratio (default 0.6)
 * @returns {Array<{x: number, y: number}>} Array of cell coordinates
 */
export function getOverlappingCells(x, y, hitboxSize = 0.6) {
  const hitbox = getPlayerHitbox(x, y, hitboxSize);
  const cells = [];

  const minCellX = Math.floor(hitbox.left);
  const maxCellX = Math.floor(hitbox.right);
  const minCellY = Math.floor(hitbox.top);
  const maxCellY = Math.floor(hitbox.bottom);

  for (let cy = minCellY; cy <= maxCellY; cy++) {
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      cells.push({ x: cx, y: cy });
    }
  }

  return cells;
}
