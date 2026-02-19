// shared/map-generator.js
// Shared map generation logic — used by both server and client.
// Deterministic: same seed always produces same map.

export function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRngFromSeed(seed) {
  if (typeof seed === "number") return mulberry32(seed >>> 0);
  const s = String(seed ?? "0");
  const hfn = xmur3(s);
  const seedNum = hfn();
  return mulberry32(seedNum);
}

/**
 * Generate a deterministic map from a seed.
 * @param {number} cols - Grid columns (default 15)
 * @param {number} rows - Grid rows (default 13)
 * @param {string|number|null} seed - Seed value
 * @param {object} options - Map options
 * @returns {{ grid: string[][], width: number, height: number, cellSize: number, seed: string }}
 */
export function generateMapFromSeed(
  cols = 15,
  rows = 13,
  seed = null,
  options = {},
) {
  const destructibleProb = options.destructibleProb ?? 0.42;
  const borderThickness = options.borderThickness ?? 1;
  const patternSpacing = options.patternSpacing ?? 2;
  const patternOffset = options.patternOffset ?? 1;

  const finalSeed =
    seed || String(Date.now()) + "-" + Math.floor(Math.random() * 1e6);
  const rng = makeRngFromSeed(finalSeed);

  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => "floor"),
  );

  // Spawn corners and their safe zones
  const spawns = [
    { x: 1, y: 1, name: "TL" },
    { x: cols - 2, y: rows - 2, name: "BR" },
    { x: cols - 2, y: 1, name: "TR" },
    { x: 1, y: rows - 2, name: "BL" },
  ];
  const spawnOffsets = {
    TL: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    TR: [
      [0, 0],
      [-1, 0],
      [0, 1],
    ],
    BR: [
      [0, 0],
      [-1, 0],
      [0, -1],
    ],
    BL: [
      [0, 0],
      [1, 0],
      [0, -1],
    ],
  };
  const reserved = new Set();
  for (const s of spawns) {
    const offs = spawnOffsets[s.name] || [[0, 0]];
    for (const o of offs) {
      const rx = s.x + o[0];
      const ry = s.y + o[1];
      if (rx >= 0 && rx < cols && ry >= 0 && ry < rows)
        reserved.add(`${rx},${ry}`);
    }
  }

  function isReserved(x, y) {
    if (reserved.has(`${x},${y}`)) return true;
    if (
      (x <= 1 && y <= 1) ||
      (x >= cols - 2 && y <= 1) ||
      (x <= 1 && y >= rows - 2) ||
      (x >= cols - 2 && y >= rows - 2)
    )
      return true;
    return false;
  }

  // Border walls
  for (let t = 0; t < borderThickness; t++) {
    const topY = t;
    const bottomY = rows - 1 - t;
    for (let x = 0; x < cols; x++) {
      grid[topY][x] = "wall";
      grid[bottomY][x] = "wall";
    }
    const leftX = t;
    const rightX = cols - 1 - t;
    for (let y = 0; y < rows; y++) {
      grid[y][leftX] = "wall";
      grid[y][rightX] = "wall";
    }
  }

  // Pattern walls (indestructible pillars)
  const start = borderThickness + patternOffset;
  for (let y = start; y < rows - borderThickness; y++) {
    for (let x = start; x < cols - borderThickness; x++) {
      if (isReserved(x, y)) continue;
      if (
        (x - start) % patternSpacing === 0 &&
        (y - start) % patternSpacing === 0
      ) {
        grid[y][x] = "wall";
      }
    }
  }

  // Random destructible blocks
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] !== "floor") continue;
      if (isReserved(x, y)) continue;
      const r = rng();
      if (r < destructibleProb) grid[y][x] = "block";
    }
  }

  return {
    grid,
    width: cols,
    height: rows,
    cellSize: 16,
    seed: String(finalSeed),
  };
}
