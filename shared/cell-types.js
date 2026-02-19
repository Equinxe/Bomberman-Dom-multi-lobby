// shared/cell-types.js
// Cell type detection helpers — used by both server and client.
// Centralised to avoid duplication between server/collision.js and ui/helpers/collision.js.

/**
 * Check if a cell is solid (wall or destructible block)
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
