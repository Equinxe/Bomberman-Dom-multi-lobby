// server/entities/explosion.js

/**
 * Calculate explosion cells in a + pattern from a bomb position.
 * Stops at walls (excluded) and blocks (included, will be destroyed).
 * @returns {Array<{x: number, y: number}>} Affected cells
 */
export function calculateExplosion(map, bombX, bombY, range) {
  const cells = [{ x: bombX, y: bombY }];

  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  directions.forEach(({ dx, dy }) => {
    for (let i = 1; i <= range; i++) {
      const x = bombX + dx * i;
      const y = bombY + dy * i;

      if (y < 0 || y >= map.grid.length || x < 0 || x >= map.grid[y].length) {
        break;
      }

      const cell = map.grid[y][x];

      if (cell === "wall" || cell === "wallDark") {
        break;
      }

      cells.push({ x, y });

      if (cell === "block") {
        break;
      }
    }
  });

  return cells;
}
