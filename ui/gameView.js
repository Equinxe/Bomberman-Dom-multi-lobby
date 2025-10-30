// ui/gameView.js
// GameView with exact tile indices and destructible-block animation support.
//
// Tile mapping (as you gave):
//  - wall (bord lumineux) index: 33   -> tileCoords { r:0,c:33 }
//  - wallDark (indestructible sans lumière) index: 71 -> tileCoords { r:1,c:32 } (index 71)
//  - floor (herbe) index: 72 -> tileCoords { r:1,c:33 }
//  - block (destructible) base index: 422 (animation frames 422..429 for destruction)
//
// Assumptions:
//  - source tile size: 16x16px
//  - spacing between tiles in sheet: 1px
//  - tiles are arranged row-major in the sheet
//  - attachClientGame already renders continuously (requestAnimationFrame), so this component
//    computes animation frame per render using Date.now().
//  - Map cells can be either simple values ("wall","block","floor","wallDark") or objects:
//      { type: "block", animStart: <ms timestamp> }  // animStart = ms timestamp when destruction started
//    After the animation completes client or server should replace the cell with "floor".
//
// How animation works here:
//  - destructible block animation frames: frames = [422..429]
//  - frameDuration default: 80ms (adjustable below). Total animation time = frames.length * frameDuration
//  - If a cell is an object with animStart, the renderer picks the appropriate frame based on elapsed time.
//  - When elapsed >= totalAnimation, the last frame is shown (caller should replace cell with "floor" afterwards).
export function GameView({
  map,
  players = [],
  cellSize = 24,
  tilesetUrl = "./assets/images/TileSets.png",
  playerSpriteUrl = "./assets/images/Players.png",
  tileSrcSize = 16,
  tileSpacing = 1,
  tilesPerRow: tilesPerRowOpt = undefined,
  debug = false,
}) {
  // default map 15x13 if none
  const defaultCols = 15;
  const defaultRows = 13;
  const grid =
    (map && map.grid) ||
    Array.from({ length: defaultRows }, () =>
      Array.from({ length: defaultCols }, () => "floor")
    );
  const rows = (map && map.height) || grid.length;
  const cols = (map && map.width) || (grid[0] ? grid[0].length : defaultCols);

  // exact mapping provided by user:
  const TILE_INDICES = {
    wall: 33, // bord lumineux (col:33,row:0 -> index 33)
    wallDark: 71, // indestructible sans lumiere (col:32,row:1 -> index 71)
    floor: 72, // herbe (col:33,row:1 -> index 72)
    blockBase: 422, // destructible first frame (col:32,row:10 -> index 422)
    blockAnimStart: 422,
    blockAnimEnd: 429, // inclusive
  };

  // animation settings
  const blockAnimFrames = [];
  for (let i = TILE_INDICES.blockAnimStart; i <= TILE_INDICES.blockAnimEnd; i++)
    blockAnimFrames.push(i);
  const blockFrameDuration = 80; // ms per frame (adjust if you want faster/slower)

  // tileset metrics cache
  window.__TILESET_INFO = window.__TILESET_INFO || {};
  const cache = window.__TILESET_INFO[tilesetUrl] || {};

  // detect natural size & tilesPerRow if not known
  let naturalW = cache.naturalWidth;
  let naturalH = cache.naturalHeight;
  let computedTilesPerRow = tilesPerRowOpt ?? cache.tilesPerRow;

  if ((!naturalW || !naturalH || !computedTilesPerRow) && !cache.loading) {
    cache.loading = true;
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      const stride = tileSrcSize + tileSpacing;
      const tp = Math.max(1, Math.floor(nw / stride));
      window.__TILESET_INFO[tilesetUrl] = {
        naturalWidth: nw,
        naturalHeight: nh,
        tileSrcSize,
        tileSpacing,
        tilesPerRow: tp,
        loading: false,
      };
      console.info(
        `[GameView] tileset loaded: ${tilesetUrl} -> ${nw}x${nh}, tileSrc=${tileSrcSize}, spacing=${tileSpacing}, tilesPerRow=${tp}`
      );
    };
    img.onerror = () => {
      window.__TILESET_INFO[tilesetUrl] = { loading: false };
      console.warn(`[GameView] failed to load tileset ${tilesetUrl}`);
    };
    img.src = tilesetUrl + (tilesetUrl.indexOf("?") === -1 ? "?_v=1" : "&_v=1");
    window.__TILESET_INFO[tilesetUrl] = { loading: true };
  }

  const cached = window.__TILESET_INFO[tilesetUrl] || {};
  naturalW = naturalW || cached.naturalWidth;
  naturalH = naturalH || cached.naturalHeight;
  computedTilesPerRow =
    computedTilesPerRow ||
    cached.tilesPerRow ||
    Math.max(20, Math.floor((naturalW || 320) / (tileSrcSize + tileSpacing)));

  // tile stride on source image (pixels between tile origins)
  const tileStride = tileSrcSize + tileSpacing;

  // image scaled width when drawn at desired scale (we position using tileStride * scale)
  const scale = cellSize / tileSrcSize;
  const imgScaledWidth = (naturalW || computedTilesPerRow * tileStride) * scale;

  // cache computed img style per index
  const imgStyleCache = {};
  function imgStyleForIndex(index) {
    if (imgStyleCache[index]) return imgStyleCache[index];
    const tx = index % computedTilesPerRow;
    const ty = Math.floor(index / computedTilesPerRow);
    // translate by tileStride * scale
    const x = -(tx * tileStride) * scale;
    const y = -(ty * tileStride) * scale;
    const base = `
      width: ${imgScaledWidth}px;
      height: auto;
      image-rendering: pixelated;
      display:block;
      transform-origin: 0 0;
      pointer-events:none;
      transform: translate(${x}px, ${y}px);
    `;
    imgStyleCache[index] = base;
    return base;
  }

  // decide which tile index to display for a given cell value (supports object shapes)
  function tileIndexForCell(cell) {
    // cell can be:
    //  - string: "wall"/"block"/"floor"/"wallDark"
    //  - number: mapping 0->wall,1->block,2->floor
    //  - object: { type:"block", animStart: <ms timestamp> } to animate destruction
    if (!cell && cell !== 0) return TILE_INDICES.floor;
    if (typeof cell === "string") {
      if (cell === "wall") return TILE_INDICES.wall;
      if (cell === "wallDark") return TILE_INDICES.wallDark;
      if (cell === "block") return TILE_INDICES.blockBase;
      if (cell === "floor") return TILE_INDICES.floor;
      return TILE_INDICES.floor;
    }
    if (typeof cell === "number") {
      if (cell === 0) return TILE_INDICES.wall;
      if (cell === 1) return TILE_INDICES.blockBase;
      return TILE_INDICES.floor;
    }
    if (typeof cell === "object" && cell.type) {
      if (cell.type === "block") {
        // animation support: if animStart present, compute frame based on now
        if (typeof cell.animStart === "number") {
          const elapsed = Math.max(0, Date.now() - cell.animStart);
          const frame = Math.floor(elapsed / blockFrameDuration);
          if (frame >= blockAnimFrames.length) {
            // animation finished: show last frame (caller should replace cell with "floor" afterwards)
            return blockAnimFrames[blockAnimFrames.length - 1];
          }
          return blockAnimFrames[Math.min(frame, blockAnimFrames.length - 1)];
        }
        // no animStart -> show base frame
        return TILE_INDICES.blockBase;
      }
      if (cell.type === "wallDark") return TILE_INDICES.wallDark;
      if (cell.type === "wall") return TILE_INDICES.wall;
      if (cell.type === "floor") return TILE_INDICES.floor;
    }
    // fallback
    return TILE_INDICES.floor;
  }

  // build tile nodes (one wrapper + single <img> per cell using translated tileset)
  const tileNodes = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid[y][x];
      const idx = tileIndexForCell(cell);
      const wrapperStyle = `
        position:absolute;
        left:${x * cellSize}px;
        top:${y * cellSize}px;
        width:${cellSize}px;
        height:${cellSize}px;
        overflow:hidden;
        box-sizing:border-box;
        z-index:1;
      `;
      const imgStyle = imgStyleForIndex(idx);
      tileNodes.push({
        tag: "div",
        attrs: { style: wrapperStyle },
        children: [
          {
            tag: "img",
            attrs: { src: tilesetUrl, style: imgStyle, draggable: "false" },
          },
        ],
      });
    }
  }

  // render players (unchanged)
  const playersWithPos = ensurePlayerPositions(players, cols, rows);
  const playerSize = 24;
  const halfExtra = Math.round((playerSize - cellSize) / 2);

  const playerNodes = playersWithPos.map((p) => {
    const left = p.x * cellSize - halfExtra;
    const top = p.y * cellSize - halfExtra;
    const wrapperStyle = `
      position:absolute;
      left:${left}px;
      top:${top}px;
      width:${playerSize}px;
      height:${playerSize}px;
      z-index:60;
      display:flex;
      align-items:center;
      justify-content:center;
      transform: translateZ(0);
      pointer-events:none;
    `;
    const imgStyle = `
      width:${playerSize}px;
      height:${playerSize}px;
      image-rendering: pixelated;
      display:block;
      border-radius:6px;
    `;
    const haloColor = playerColorToCss(p.color);
    const haloStyle = `
      position:absolute;
      left:0;top:0;width:${playerSize}px;height:${playerSize}px;border-radius:6px;
      box-shadow: 0 0 0 4px ${hexToRgba(
        haloColor,
        0.22
      )} inset, 0 0 8px ${hexToRgba(haloColor, 0.14)};
      pointer-events:none;
    `;
    const initials = (p.pseudo || "").slice(0, 2).toUpperCase();

    return {
      tag: "div",
      attrs: { style: wrapperStyle, "data-player-id": p.id || "" },
      children: [
        {
          tag: "img",
          attrs: { src: playerSpriteUrl, style: imgStyle, draggable: "false" },
        },
        { tag: "div", attrs: { style: haloStyle } },
        {
          tag: "div",
          attrs: {
            style: `position:absolute;left:0;top:0;width:${playerSize}px;height:${playerSize}px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#012;pointer-events:none;`,
          },
          children: [initials],
        },
      ],
    };
  });

  // debug overlay if requested
  const overlays = [];
  if (debug) {
    overlays.push({
      tag: "div",
      attrs: {
        style: `position:absolute;left:0;top:0;width:${
          cols * cellSize
        }px;height:${rows * cellSize}px;pointer-events:none;z-index:200;`,
      },
      children: [
        ...Array.from({ length: cols }, (_, i) => ({
          tag: "div",
          attrs: {
            style: `position:absolute;left:${
              i * cellSize
            }px;top:0;width:1px;height:${
              rows * cellSize
            }px;background:rgba(255,255,255,0.06);pointer-events:none;`,
          },
        })),
        ...Array.from({ length: rows }, (_, j) => ({
          tag: "div",
          attrs: {
            style: `position:absolute;top:${
              j * cellSize
            }px;left:0;height:1px;width:${
              cols * cellSize
            }px;background:rgba(255,255,255,0.06);pointer-events:none;`,
          },
        })),
      ],
    });

    // highlight the three tiles defined by user coords
    const highlights = [
      {
        idx: TILE_INDICES.wall,
        color: "#ff00ff",
        label: "wall(light) idx " + TILE_INDICES.wall,
      },
      {
        idx: TILE_INDICES.wallDark,
        color: "#00ff00",
        label: "wallDark idx " + TILE_INDICES.wallDark,
      },
      {
        idx: TILE_INDICES.floor,
        color: "#00ffff",
        label: "floor idx " + TILE_INDICES.floor,
      },
    ];
    highlights.forEach((h, i) => {
      // compute r,c from index for display (if tilesPerRow known)
      const tp = computedTilesPerRow || 1;
      const r = Math.floor(h.idx / tp);
      const c = h.idx % tp;
      overlays.push({
        tag: "div",
        attrs: {
          style: `position:absolute;left:${c * cellSize}px;top:${
            r * cellSize
          }px;width:${cellSize}px;height:${cellSize}px;border:2px solid ${
            h.color
          };box-sizing:border-box;z-index:210;pointer-events:none;`,
        },
      });
      overlays.push({
        tag: "div",
        attrs: {
          style: `position:absolute;left:${c * cellSize + 6}px;top:${
            r * cellSize + 6
          }px;color:${h.color};font-size:12px;z-index:211;pointer-events:none;`,
        },
        children: [h.label],
      });
    });

    overlays.push({
      tag: "div",
      attrs: {
        style: `
          position:absolute;
          left:8px;top:8px;
          background:rgba(0,0,0,0.6);
          color:#fff;
          padding:8px 10px;
          border-radius:6px;
          font-family: monospace;
          font-size:12px;
          z-index:220;
          pointer-events:none;
        `,
      },
      children: [
        { tag: "div", children: [`tileset: ${tilesetUrl}`] },
        {
          tag: "div",
          children: [`natural: ${naturalW || "?"} x ${naturalH || "?"}`],
        },
        { tag: "div", children: [`tileSrcSize: ${tileSrcSize}px`] },
        { tag: "div", children: [`tileSpacing: ${tileSpacing}px`] },
        { tag: "div", children: [`tileStride: ${tileStride}px`] },
        { tag: "div", children: [`tilesPerRow: ${computedTilesPerRow}`] },
        {
          tag: "div",
          children: [`blockAnim frames: ${blockAnimFrames.join(",")}`],
        },
      ],
    });
  }

  const wrapperStyle = `position:relative;width:${cols * cellSize}px;height:${
    rows * cellSize
  }px;background:transparent;overflow:hidden;`;

  return {
    tag: "div",
    attrs: { style: wrapperStyle, id: "game-map-root" },
    children: [...tileNodes, ...playerNodes, ...overlays],
  };
}

// same helpers as before
function ensurePlayerPositions(players = [], cols = 15, rows = 13) {
  const out = players.map((p) => ({ ...p }));
  const TL = { x: 1, y: 1 };
  const BR = { x: cols - 2, y: rows - 2 };
  const TR = { x: cols - 2, y: 1 };
  const BL = { x: 1, y: rows - 2 };

  const n = out.length;
  let positions = [];
  if (n === 1) positions = [TL];
  else if (n === 2) positions = [TL, BR];
  else if (n === 3) positions = [TL, BR, TR];
  else positions = [TL, BR, TR, BL];

  for (let i = 0; i < out.length; i++) {
    if (typeof out[i].x === "number" && typeof out[i].y === "number") continue;
    const pos = positions[i] || positions[i % positions.length] || TL;
    out[i].x = pos.x;
    out[i].y = pos.y;
  }
  return out;
}

function playerColorToCss(index) {
  const palette = [
    "#ffffff",
    "#222222",
    "#ff4b4b",
    "#4b8bff",
    "#58ff7a",
    "#ffd24b",
    "#ff9cff",
  ];
  return palette[(index || 0) % palette.length];
}
function hexToRgba(hex, alpha = 1) {
  const h = hex.replace("#", "");
  const bigint = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
