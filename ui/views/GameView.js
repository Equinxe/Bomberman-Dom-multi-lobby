// Updated GameView that imports collision and tile helpers
import {
  SPRITE_ROWS,
  SPRITE_SIZE,
  SHEET_WIDTH,
  SHEET_HEIGHT,
} from "./../helpers/constants.js";
import {
  isSolidCell,
  isDestructibleCell,
  isIndestructibleCell,
} from "./../helpers/collision.js";
import {
  tileIndexForCell,
  imgStyleForIndex,
  ensureTilesetInfo,
} from "./../helpers/tiles.js";

export function GameView(options) {
  // keep same signature as before, accept object
  const {
    map,
    players = [],
    cellSize = 24,
    mapScale = 1.0,
    tilesetUrl = "./assets/images/TileSets.png",
    playerSpriteUrl = "./assets/images/Players.png",
    tileSrcSize = 16,
    tileSpacing = 1,
    tilesPerRow: tilesPerRowOpt = undefined,
    debug = false,
    debugCollision = true,
    showCollisionOverlays = true,
  } = options || {};

  const grid = (map && map.grid) || [];
  const rows = (map && (map.height || grid.length)) || 13;
  const cols = (map && (map.width || (grid[0] && grid[0].length))) || 15;
  const displayedCell = Math.max(
    1,
    Math.round(cellSize * (typeof mapScale === "number" ? mapScale : 1))
  );

  // ensure tileset info is loaded/cached
  ensureTilesetInfo(tilesetUrl, tileSrcSize, tileSpacing);

  // build tiles
  const tileNodes = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = (grid[y] && grid[y][x]) !== undefined ? grid[y][x] : "floor";
      const idx = tileIndexForCell(cell);
      const isBlock = isDestructibleCell(cell);
      const isIndestructible = isIndestructibleCell(cell);
      const wrapperStyle = `position:absolute; left:${Math.round(
        x * displayedCell
      )}px; top:${Math.round(y * displayedCell)}px; width:${Math.round(
        displayedCell
      )}px; height:${Math.round(
        displayedCell
      )}px; overflow:hidden; box-sizing:border-box; z-index:1; background-color: transparent; ${
        isBlock ? "clip-path: inset(0 0 1px 0);" : ""
      }`;
      const imgStyle = imgStyleForIndex(
        idx,
        tilesetUrl,
        displayedCell,
        tileSrcSize,
        tileSpacing,
        tilesPerRowOpt,
        SHEET_WIDTH,
        SHEET_HEIGHT
      );
      const children = [
        {
          tag: "img",
          attrs: {
            src: tilesetUrl,
            style: imgStyle,
            draggable: "false",
            alt: "",
          },
        },
      ];
      if (showCollisionOverlays) {
        if (isIndestructible) {
          children.push({
            tag: "div",
            attrs: {
              style: `position:absolute;left:0;top:0;width:100%;height:100%;background: rgba(255,0,0,0.28);z-index:12;pointer-events:none;`,
            },
          });
        } else if (isBlock) {
          children.push({
            tag: "div",
            attrs: {
              style: `position:absolute;left:0;top:0;width:100%;height:100%;background: rgba(0,200,0,0.28);z-index:12;pointer-events:none;`,
            },
          });
        }
      }
      tileNodes.push({ tag: "div", attrs: { style: wrapperStyle }, children });
    }
  }

  // players (same as before) - simplified here to reuse previous logic
  const playersWithPos = (players || []).map((p) => ({ ...p }));
  const playerNodes = playersWithPos.map((p) => {
    const colorIdx = typeof p.color === "number" ? p.color : 0;
    const spriteRow =
      (SPRITE_ROWS && SPRITE_ROWS[colorIdx] && SPRITE_ROWS[colorIdx].row) || 0;
    const offsetY =
      (SPRITE_ROWS && SPRITE_ROWS[colorIdx] && SPRITE_ROWS[colorIdx].offsetY) ||
      0;
    const margin = 4;
    const spacing = 1;
    const frame = 0;
    const sourceSize = SPRITE_SIZE || 24;
    const targetPx = displayedCell;
    const bgZoom = targetPx / sourceSize;
    const startX = margin + frame * (sourceSize + spacing);
    const startY = margin + spriteRow * (sourceSize + spacing) + offsetY;
    const imgOffsetX = -Math.round(startX * bgZoom);
    const imgOffsetY = -Math.round(startY * bgZoom);
    const imgWidth = Math.round((SHEET_WIDTH || 128) * bgZoom);
    const imgHeight = Math.round((SHEET_HEIGHT || 128) * bgZoom);
    const wrapperLeft = Math.round(p.x * displayedCell);
    const wrapperTop = Math.round(p.y * displayedCell);
    const wrapperStyle = `position:absolute; left:${wrapperLeft}px; top:${wrapperTop}px; width:${targetPx}px; height:${targetPx}px; z-index:60; display:block; pointer-events:none; overflow:hidden;`;
    const innerStyle = `position:relative; left:${imgOffsetX}px; top:${imgOffsetY}px; width:${imgWidth}px; height:${imgHeight}px; image-rendering: pixelated; display:block; pointer-events:none; border: none;`;
    // collision debug inside player wrapper
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
            style: `position:absolute; left:${colLeft}px; top:${colTop}px; width:${displayedCell}px; height:${displayedCell}px; background: rgba(255,0,0,0.18); z-index:55; pointer-events:none;`,
          },
        });
      }
      const hitW = 16;
      const hitH = 16;
      const hitLeft = Math.round((targetPx - hitW) / 2);
      const hitTop = Math.round((targetPx - hitH) / 2);
      collisionNodes.push({
        tag: "div",
        attrs: {
          style: `position:absolute; left:${hitLeft}px; top:${hitTop}px; width:${hitW}px; height:${hitH}px; background: rgba(0,128,255,0.28); border: 1px solid rgba(0,128,255,0.6); z-index:65; pointer-events:none;`,
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

  const wrapperStyle = `position:relative;width:${
    cols * displayedCell
  }px;height:${rows * displayedCell}px;background:transparent;overflow:hidden;`;
  return {
    tag: "div",
    attrs: { style: wrapperStyle, id: "game-map-root" },
    children: [...tileNodes, ...playerNodes],
  };
}
