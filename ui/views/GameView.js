// Updated GameView: tile collision overlays removed (no colored overlays on tiles).
// Keeps only the player collision debug box (hitbox). Supports playerScale to zoom sprites.
// ✅ Added bombs and explosions rendering with correct sprites
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
  imgStyleForBombSprite, // ✅ Add this import
  ensureTilesetInfo,
} from "./../helpers/tiles.js";

export function GameView(options) {
  const {
    map,
    players = [],
    bombs = [], // ✅ Bombs array
    explosions = [], // ✅ Explosions array
    cellSize = 24,
    mapScale = 1.6,
    tilesetUrl = "./assets/images/TileSets.png",
    playerSpriteUrl = "./assets/images/Players.png",
    tileSrcSize = 16,
    tileSpacing = 1,
    tilesPerRow: tilesPerRowOpt = undefined,
    debug = false,
    debugCollision = true,
    playerScale = 1.6,
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

  // build tiles (no colored collision overlays anymore)
  const tileNodes = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = (grid[y] && grid[y][x]) !== undefined ? grid[y][x] : "floor";
      const idx = tileIndexForCell(cell);
      const isBlock = isDestructibleCell(cell);
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
      tileNodes.push({ tag: "div", attrs: { style: wrapperStyle }, children });
    }
  }

  // ✅ Render bombs (corrected to show only L6,C32)
  const bombNodes = [];
  if (bombs && Array.isArray(bombs)) {
    bombs.forEach((bomb) => {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const timeLeft = bomb.explosionTime - now;

      // Blink faster as time runs out
      const blinkInterval = timeLeft < 1000 ? 100 : 200;
      const shouldShow = Math.floor(timeLeft / blinkInterval) % 2 === 0;

      if (shouldShow) {
        const bombLeft = Math.round(bomb.x * displayedCell);
        const bombTop = Math.round(bomb.y * displayedCell);
        const bombStyle = `position:absolute; left:${bombLeft}px; top:${bombTop}px; width:${displayedCell}px; height:${displayedCell}px; overflow:hidden; z-index:50;`;

        // Bomb sprite at L6 (row 6), C32 (col 32)
        const bombImgStyle = imgStyleForBombSprite(
          6, // row
          32, // col
          tilesetUrl,
          displayedCell,
          tileSrcSize,
          tileSpacing,
          tilesPerRowOpt || 40
        );

        bombNodes.push({
          tag: "div",
          attrs: { style: bombStyle, "data-bomb-id": bomb.id },
          children: [
            {
              tag: "img",
              attrs: {
                src: tilesetUrl,
                style: bombImgStyle,
                draggable: "false",
                alt: "bomb",
              },
            },
          ],
        });
      }
    });
  }

  // ✅ Render explosions (8 frames from L6,C32 to L6,C39 over 3 seconds)
  const explosionNodes = [];
  if (explosions && Array.isArray(explosions)) {
    explosions.forEach((explosion) => {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsed = now - explosion.startTime;
      const progress = Math.min(1, elapsed / explosion.duration);

      // Animation: 8 frames from C32 to C39 (columns 32-39)
      const frame = Math.floor(progress * 8);
      const frameCol = 32 + Math.min(frame, 7); // Columns 32 to 39

      explosion.cells.forEach((cell) => {
        const expLeft = Math.round(cell.x * displayedCell);
        const expTop = Math.round(cell.y * displayedCell);
        const opacity = 1 - progress * 0.2; // Slight fade
        const expStyle = `position:absolute; left:${expLeft}px; top:${expTop}px; width:${displayedCell}px; height:${displayedCell}px; overflow:hidden; z-index:55; opacity:${opacity};`;

        // Explosion sprite at L6 (row 6), C32-39 (cols 32-39)
        const expImgStyle = imgStyleForBombSprite(
          6, // row
          frameCol, // col 32-39
          tilesetUrl,
          displayedCell,
          tileSrcSize,
          tileSpacing,
          tilesPerRowOpt || 40
        );

        explosionNodes.push({
          tag: "div",
          attrs: { style: expStyle },
          children: [
            {
              tag: "img",
              attrs: {
                src: tilesetUrl,
                style: expImgStyle,
                draggable: "false",
                alt: "explosion",
              },
            },
          ],
        });
      });
    });
  }

  // players
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

    // Use playerScale to size sprite target pixels (zoom)
    const targetPx = Math.round(
      displayedCell * (typeof playerScale === "number" ? playerScale : 1)
    );
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

    // only keep player collision (hitbox) if debugCollision is true
    const collisionNodes = [];
    if (debugCollision) {
      const hitW = Math.min(16, targetPx);
      const hitH = Math.min(16, targetPx);
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
    children: [
      ...tileNodes, // z-index: 1
      ...bombNodes, // z-index: 50
      ...explosionNodes, // z-index: 55
      ...playerNodes, // z-index: 60
    ],
  };
}
