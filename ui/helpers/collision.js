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
 */
export function resolveCollision(map, oldX, oldY, newX, newY, hitboxSize = 0.6) {
  if (!map || !map.grid) return { x: newX, y: newY };
  
  if (!checkCollision(map, newX, newY, hitboxSize)) {
    return { x: newX, y: newY };
  }
  
  if (!checkCollision(map, newX, oldY, hitboxSize)) {
    return { x: newX, y: oldY };
  }
  
  if (!checkCollision(map, oldX, newY, hitboxSize)) {
    return { x: oldX, y: newY };
  }
  
  return { x: oldX, y: oldY };
}

/**
 * Get all cells that player hitbox overlaps
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