// ui/gameView.js
// Render tiles + players. Ensure player size exactly equals tile displayed size (displayedCell).
// Integer math throughout; wrappers overflow:hidden to avoid neighbour-pixel bleed.
import {
  SPRITE_ROWS,
  SPRITE_SIZE,
  SHEET_WIDTH,
  SHEET_HEIGHT,
} from "./constants.js";

export function GameView({
  map,
  players = [],
  cellSize = 24, // logical source tile size (default 24)
  mapScale = 1.0, // visual zoom for the map (if you want to scale the whole map)
  tilesetUrl = "./assets/images/TileSets.png",
  playerSpriteUrl = "./assets/images/Players.png",
  tileSrcSize = 16,
  tileSpacing = 1,
  tilesPerRow: tilesPerRowOpt = undefined,
  debug = false,
  debugCollision = true,
}) {
  const defaultCols = 15;
  const defaultRows = 13;
  const grid =
    (map && map.grid) ||
    Array.from({ length: defaultRows }, () =>
      Array.from({ length: defaultCols }, () => "floor")
    );
  const rows = (map && map.height) || grid.length;
  const cols = (map && map.width) || (grid[0] ? grid[0].length : defaultCols);

  // displayed cell is the visual size of a tile (e.g. 24)
  const displayedCell = Math.max(
    1,
    Math.round(cellSize * (typeof mapScale === "number" ? mapScale : 1))
  );

  const TILE_INDICES = {
    wall: 33,
    wallDark: 71,
    floor: 72,
    blockBase: 422,
    blockAnimStart: 422,
    blockAnimEnd: 429,
  };
  const blockAnimFrames = [];
  for (let i = TILE_INDICES.blockAnimStart; i <= TILE_INDICES.blockAnimEnd; i++)
    blockAnimFrames.push(i);
  const blockFrameDuration = 80;

  // tileset metrics cache (detect natural size and tilesPerRow)
  window.__TILESET_INFO = window.__TILESET_INFO || {};
  const cache = window.__TILESET_INFO[tilesetUrl] || {};
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
    };
    img.onerror = () => {
      window.__TILESET_INFO[tilesetUrl] = { loading: false };
      console.warn(`[GameView] failed to load tileset ${tilesetUrl}`);
    };
    img.src = tilesetUrl + (tilesetUrl.indexOf("?") === -1 ? "?_v=1" : "&_v=1");
  }

  const cached = window.__TILESET_INFO[tilesetUrl] || {};
  naturalW = naturalW || cached.naturalWidth;
  naturalH = naturalH || cached.naturalHeight;
  computedTilesPerRow =
    computedTilesPerRow ||
    cached.tilesPerRow ||
    Math.max(20, Math.floor((naturalW || 320) / (tileSrcSize + tileSpacing)));

  const tileStride = tileSrcSize + tileSpacing;
  // scale from source tile size to displayed tile size
  const scale = displayedCell / tileSrcSize;

  // scaled overall tileset width used for translate math
  const imgScaledWidth = Math.round(
    (naturalW || computedTilesPerRow * tileStride) * scale
  );

  const imgStyleCache = {};
  function imgStyleForIndex(index) {
    if (imgStyleCache[index]) return imgStyleCache[index];
    const tx = index % computedTilesPerRow;
    const ty = Math.floor(index / computedTilesPerRow);
    const x = -Math.round(tx * tileStride * scale);
    const y = -Math.round(ty * tileStride * scale);
    const base = `
      width: ${imgScaledWidth}px;
      height: auto;
      image-rendering: pixelated;
      display:block;
      transform-origin: 0 0;
      pointer-events:none;
      transform: translate(${x}px, ${y}px);
      border: none;
    `;
    imgStyleCache[index] = base;
    return base;
  }

  function isSolidCell(cell) {
    if (!cell && cell !== 0) return false;
    if (typeof cell === "string") {
      return cell === "wall" || cell === "wallDark" || cell === "block";
    }
    if (typeof cell === "object" && cell.type) {
      return (
        cell.type === "wall" ||
        cell.type === "wallDark" ||
        cell.type === "block"
      );
    }
    if (typeof cell === "number") {
      return cell === 0 || cell === 1;
    }
    return false;
  }

  function tileIndexForCell(cell) {
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
        if (typeof cell.animStart === "number") {
          const elapsed = Math.max(0, Date.now() - cell.animStart);
          const frame = Math.floor(elapsed / blockFrameDuration);
          if (frame >= blockAnimFrames.length)
            return blockAnimFrames[blockAnimFrames.length - 1];
          return blockAnimFrames[Math.min(frame, blockAnimFrames.length - 1)];
        }
        return TILE_INDICES.blockBase;
      }
      if (cell.type === "wallDark") return TILE_INDICES.wallDark;
      if (cell.type === "wall") return TILE_INDICES.wall;
      if (cell.type === "floor") return TILE_INDICES.floor;
    }
    return TILE_INDICES.floor;
  }

  // build tiles
  const tileNodes = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid[y][x];
      const idx = tileIndexForCell(cell);
      const isBlock =
        (typeof cell === "string" && cell === "block") ||
        (typeof cell === "object" && cell.type === "block");
      const wrapperStyle = `
        position:absolute;
        left:${Math.round(x * displayedCell)}px;
        top:${Math.round(y * displayedCell)}px;
        width:${Math.round(displayedCell)}px;
        height:${Math.round(displayedCell)}px;
        overflow:hidden;
        box-sizing:border-box;
        z-index:1;
        background-color: transparent;
        ${isBlock ? "clip-path: inset(0 0 1px 0);" : ""}
      `;
      const imgStyle = imgStyleForIndex(idx);
      tileNodes.push({
        tag: "div",
        attrs: { style: wrapperStyle },
        children: [
          {
            tag: "img",
            attrs: {
              src: tilesetUrl,
              style: imgStyle,
              draggable: "false",
              alt: "",
            },
          },
        ],
      });
    }
  }

  // players: set player size to exactly displayedCell × displayedCell (same as tiles)
  const playersWithPos = ensurePlayerPositions(players, cols, rows);
  const playerNodes = playersWithPos.map((p) => {
    const colorIdx = typeof p.color === "number" ? p.color : 0;
    const spriteRow = (SPRITE_ROWS[colorIdx] && SPRITE_ROWS[colorIdx].row) || 0;
    const offsetY =
      (SPRITE_ROWS[colorIdx] && SPRITE_ROWS[colorIdx].offsetY) || 0;

    const margin = 4; // tuned to PlayerPreview
    const spacing = 1;
    const frame = 0;
    const sourceSize = SPRITE_SIZE || 24;

    // FORCE player size = displayedCell (same as tile)
    const targetPx = displayedCell;

    // compute scale from source sprite to target size
    const bgZoom = targetPx / sourceSize; // typically 24/24 = 1

    // source (frame) origin on sprite sheet
    const startX = margin + frame * (sourceSize + spacing);
    const startY = margin + spriteRow * (sourceSize + spacing) + offsetY;

    // position the inner <img> to show the correct sprite frame
    const imgOffsetX = -Math.round(startX * bgZoom);
    const imgOffsetY = -Math.round(startY * bgZoom);

    // scaled full sheet size
    const imgWidth = Math.round((SHEET_WIDTH || 128) * bgZoom);
    const imgHeight = Math.round((SHEET_HEIGHT || 128) * bgZoom);

    // wrapper is exactly one tile and clips overflow so the visible area is exactly displayedCell
    const wrapperLeft = Math.round(p.x * displayedCell);
    const wrapperTop = Math.round(p.y * displayedCell);
    const wrapperStyle = `
      position:absolute;
      left:${wrapperLeft}px;
      top:${wrapperTop}px;
      width:${targetPx}px;
      height:${targetPx}px;
      z-index:60;
      display:block;
      pointer-events:none;
      overflow:hidden;
    `;

    const innerStyle = `
      position:relative;
      left:${imgOffsetX}px;
      top:${imgOffsetY}px;
      width:${imgWidth}px;
      height:${imgHeight}px;
      image-rendering: pixelated;
      display:block;
      pointer-events:none;
      border: none;
    `;

    // optional collision visualization: small centered box (user can adjust)
    const collisionNodes = [];
    if (debugCollision) {
      const tx = typeof p.x === "number" ? p.x : 0;
      const ty = typeof p.y === "number" ? p.y : 0;
      const tileCell =
        (grid[ty] && grid[ty][tx]) !== undefined ? grid[ty][tx] : null;
      const collision = isSolidCell(tileCell);

      if (collision) {
        const colLeft = Math.round(tx * displayedCell);
        const colTop = Math.round(ty * displayedCell);
        collisionNodes.push({
          tag: "div",
          attrs: {
            style: `
              position:absolute;
              left:${colLeft}px;
              top:${colTop}px;
              width:${displayedCell}px;
              height:${displayedCell}px;
              background: rgba(255,0,0,0.18);
              z-index:55;
              pointer-events:none;
            `,
          },
        });
      }

      // default hitbox: centered box (you can change width/height here)
      const hitW = 16;
      const hitH = 16;
      const hitLeft = Math.round((targetPx - hitW) / 2);
      const hitTop = Math.round((targetPx - hitH) / 2);
      collisionNodes.push({
        tag: "div",
        attrs: {
          style: `
            position:absolute;
            left:${hitLeft}px;
            top:${hitTop}px;
            width:${hitW}px;
            height:${hitH}px;
            background: rgba(0,128,255,0.28);
            border: 1px solid rgba(0,128,255,0.6);
            z-index:65;
            pointer-events:none;
          `,
        },
      });
    }

    return {
      tag: "div",
      attrs: { style: wrapperStyle, "data-player-id": p.id || "" },
      children: [
        {
          tag: "img",
          attrs: {
            src: playerSpriteUrl,
            style: innerStyle,
            draggable: "false",
            alt: "",
          },
        },
        ...collisionNodes,
      ],
    };
  });

  // map root
  const wrapperStyle = `position:relative;width:${
    cols * displayedCell
  }px;height:${rows * displayedCell}px;background:transparent;overflow:hidden;`;

  return {
    tag: "div",
    attrs: { style: wrapperStyle, id: "game-map-root" },
    children: [...tileNodes, ...playerNodes],
  };
}

// helper
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
