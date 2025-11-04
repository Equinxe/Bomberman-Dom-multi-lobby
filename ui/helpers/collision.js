// Collision helpers extracted from GameView
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

export function isDestructibleCell(cell) {
  if (!cell && cell !== 0) return false;
  if (typeof cell === "string") return cell === "block";
  if (typeof cell === "object" && cell.type) return cell.type === "block";
  if (typeof cell === "number") return cell === 1;
  return false;
}

export function isIndestructibleCell(cell) {
  if (!cell && cell !== 0) return false;
  if (typeof cell === "string") return cell === "wall" || cell === "wallDark";
  if (typeof cell === "object" && cell.type)
    return cell.type === "wall" || cell.type === "wallDark";
  if (typeof cell === "number") return cell === 0;
  return false;
}
