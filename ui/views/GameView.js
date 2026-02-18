// Updated GameView: proper sprite rendering with transparency masking
// ✅ Blue background on Players.png masked out
// ✅ Bomb sprites: dark pump (R6 C0-2) + bright flash (R6 C4-7)
// ✅ Explosion sprites: directional pieces (center/vertical/horizontal) with 5 animation phases
// ✅ Smooth 4-frame walk animation cycle
import {
  SPRITE_ROWS,
  SPRITE_SIZE,
  SHEET_WIDTH,
  SHEET_HEIGHT,
  PLAYER_ANIMATIONS,
  BOMB_SPRITE,
  EXPLOSION_SPRITES,
} from "./../helpers/constants.js";
import {
  isSolidCell,
  isDestructibleCell,
  isIndestructibleCell,
} from "./../helpers/collision.js";
import {
  tileIndexForCell,
  imgStyleForIndex,
  imgStyleForBombSprite,
  ensureTilesetInfo,
} from "./../helpers/tiles.js";
import { getTransparentSpriteUrl } from "./../helpers/sprite-loader.js";

export function GameView(options) {
  const {
    map,
    players = [],
    bombs = [],
    explosions = [],
    destroyingBlocks = [],
    cellSize = 24,
    mapScale = 1.6,
    tilesetUrl = "./assets/images/TileSets.png",
    playerSpriteUrl = "./assets/images/Players.png",
    tileSrcSize = 16,
    tileSpacing = 1,
    tilesPerRow: tilesPerRowOpt = undefined,
    debug = false,
    debugCollision = false,
    playerScale = 1.6,
  } = options || {};

  const grid = (map && map.grid) || [];
  const rows = (map && (map.height || grid.length)) || 13;
  const cols = (map && (map.width || (grid[0] && grid[0].length))) || 15;
  const displayedCell = Math.max(
    1,
    Math.round(cellSize * (typeof mapScale === "number" ? mapScale : 1)),
  );

  // ensure tileset info is loaded/cached
  ensureTilesetInfo(tilesetUrl, tileSrcSize, tileSpacing);

  // ✅ Preprocess player sprite to remove blue background
  const processedPlayerSpriteUrl = getTransparentSpriteUrl(playerSpriteUrl);

  // build tiles
  const tileNodes = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = (grid[y] && grid[y][x]) !== undefined ? grid[y][x] : "floor";
      const idx = tileIndexForCell(cell);
      const isBlock = isDestructibleCell(cell);
      const wrapperStyle = `position:absolute; left:${Math.round(
        x * displayedCell,
      )}px; top:${Math.round(y * displayedCell)}px; width:${Math.round(
        displayedCell,
      )}px; height:${Math.round(
        displayedCell,
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
        679, // TileSets.png width
        373, // TileSets.png height
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

  // ✅ Render block destruction animations (R10 C33-C39 = 7 frames)
  const blockDestroyNodes = [];
  if (destroyingBlocks && Array.isArray(destroyingBlocks)) {
    const BLOCK_ANIM_START = 10 * 40 + 33; // R10 C33 = index 433
    const BLOCK_ANIM_FRAMES = 7; // C33 to C39

    destroyingBlocks.forEach((block) => {
      const now = Date.now();
      const elapsed = now - block.startTime;
      const duration = block.duration || 800;
      const progress = Math.min(1, elapsed / duration);

      // Select frame (0-6) based on progress
      const frameIdx = Math.min(
        Math.floor(progress * BLOCK_ANIM_FRAMES),
        BLOCK_ANIM_FRAMES - 1,
      );
      const tileIdx = BLOCK_ANIM_START + frameIdx;

      // Fade out in the last 15%
      const opacity =
        progress > 0.85 ? Math.max(0, 1 - (progress - 0.85) * 6.67) : 1;

      const bLeft = Math.round(block.x * displayedCell);
      const bTop = Math.round(block.y * displayedCell);
      const bStyle = `position:absolute; left:${bLeft}px; top:${bTop}px; width:${displayedCell}px; height:${displayedCell}px; overflow:hidden; z-index:56; opacity:${opacity};`;

      const bImgStyle = imgStyleForIndex(
        tileIdx,
        tilesetUrl,
        displayedCell,
        tileSrcSize,
        tileSpacing,
        tilesPerRowOpt,
        679,
        373,
      );

      blockDestroyNodes.push({
        tag: "div",
        attrs: { style: bStyle },
        children: [
          {
            tag: "img",
            attrs: {
              src: tilesetUrl,
              style: bImgStyle,
              draggable: "false",
              alt: "block-destroy",
            },
          },
        ],
      });
    });
  }

  // ✅ Render bombs with sprite animation (R6 C32-C34)
  const bombNodes = [];
  if (bombs && Array.isArray(bombs)) {
    bombs.forEach((bomb) => {
      const now = Date.now();
      const elapsed = now - bomb.placedAt;
      const totalTime = bomb.explosionTime - bomb.placedAt;
      const progress = Math.min(1, elapsed / totalTime);

      // Bomb pump animation: cycle through C32, C33, C34
      // Speed increases as time runs out (slower start)
      const pumpCycleMs = Math.max(200, 1000 - progress * 700); // 1000ms → 200ms
      const cyclePos = (elapsed % pumpCycleMs) / pumpCycleMs;
      const bombFrames = BOMB_SPRITE.frames;
      const pumpFrame = Math.floor(cyclePos * bombFrames.length);
      const bombCol = bombFrames[Math.min(pumpFrame, bombFrames.length - 1)];

      const bombLeft = Math.round(bomb.x * displayedCell);
      const bombTop = Math.round(bomb.y * displayedCell);
      const bombStyle = `position:absolute; left:${bombLeft}px; top:${bombTop}px; width:${displayedCell}px; height:${displayedCell}px; overflow:hidden; z-index:50;`;

      const bombImgStyle = imgStyleForBombSprite(
        BOMB_SPRITE.row,
        bombCol,
        tilesetUrl,
        displayedCell,
        tileSrcSize,
        tileSpacing,
        tilesPerRowOpt || 40,
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
    });
  }

  // ✅ Render explosions with correct directional sprites based on distance from center
  // All pieces use 5-frame animation synced to center (C35→C39 center, sides return to first frame)
  const explosionNodes = [];
  if (explosions && Array.isArray(explosions)) {
    explosions.forEach((explosion) => {
      const now = Date.now();
      const elapsed = now - explosion.startTime;
      const duration = explosion.duration || 800;
      const progress = Math.min(1, elapsed / duration);

      // Fade out only in the last 10% of the animation
      const opacity =
        progress > 0.9 ? Math.max(0, 1 - (progress - 0.9) * 10) : 1;

      // All pieces use 5 frames, synced together
      const NUM_FRAMES = 5;
      const frameIdx = Math.min(
        Math.floor(progress * NUM_FRAMES),
        NUM_FRAMES - 1,
      );

      explosion.cells.forEach((cell, cellIdx) => {
        const expLeft = Math.round(cell.x * displayedCell);
        const expTop = Math.round(cell.y * displayedCell);

        let spriteRow, spriteCol;

        if (cellIdx === 0) {
          // Center cell: R6 C35-C39 (5 frames)
          spriteRow = EXPLOSION_SPRITES.center.row;
          spriteCol = EXPLOSION_SPRITES.center.cols[frameIdx];
        } else {
          // Directional cell — determine direction and distance from center
          const centerCell = explosion.cells[0];
          const dx = cell.x - centerCell.x;
          const dy = cell.y - centerCell.y;
          const distance = Math.abs(dx) + Math.abs(dy);

          let dirKey;
          if (dy < 0) dirKey = "top";
          else if (dy > 0) dirKey = "bottom";
          else if (dx < 0) dirKey = "left";
          else dirKey = "right";

          const isVertical = dx === 0;

          // Find the max distance in this direction to determine the tip
          let maxDist = distance;
          explosion.cells.forEach((c) => {
            const cdx = c.x - centerCell.x;
            const cdy = c.y - centerCell.y;
            if (dirKey === "top" && cdy < 0)
              maxDist = Math.max(maxDist, Math.abs(cdy));
            else if (dirKey === "bottom" && cdy > 0)
              maxDist = Math.max(maxDist, cdy);
            else if (dirKey === "left" && cdx < 0)
              maxDist = Math.max(maxDist, Math.abs(cdx));
            else if (dirKey === "right" && cdx > 0)
              maxDist = Math.max(maxDist, cdx);
          });

          const isTip = distance === maxDist;

          if (isTip) {
            const tipConfig = EXPLOSION_SPRITES.tip[dirKey];
            spriteRow = tipConfig.row;
            spriteCol = tipConfig.cols[frameIdx];
          } else {
            const bodyConfig = isVertical
              ? EXPLOSION_SPRITES.body.vertical
              : EXPLOSION_SPRITES.body.horizontal;
            spriteRow = bodyConfig.row;
            spriteCol = bodyConfig.cols[frameIdx];
          }
        }

        const expStyle = `position:absolute; left:${expLeft}px; top:${expTop}px; width:${displayedCell}px; height:${displayedCell}px; overflow:hidden; z-index:55; opacity:${opacity};`;

        const expImgStyle = imgStyleForBombSprite(
          spriteRow,
          spriteCol,
          tilesetUrl,
          displayedCell,
          tileSrcSize,
          tileSpacing,
          tilesPerRowOpt || 40,
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

  // ✅ Players — original simple pattern restored
  const playersWithPos = (players || []).map((p) => ({ ...p }));
  const playerNodes = playersWithPos
    .filter((p) => !p.dead) // ✅ Don't render dead players
    .map((p) => {
      const colorIdx = typeof p.color === "number" ? p.color : 0;
      const spriteRow =
        (SPRITE_ROWS && SPRITE_ROWS[colorIdx] && SPRITE_ROWS[colorIdx].row) ||
        0;
      const offsetY =
        (SPRITE_ROWS &&
          SPRITE_ROWS[colorIdx] &&
          SPRITE_ROWS[colorIdx].offsetY) ||
        0;

      const margin = 4;
      const spacing = 1;
      const sourceSize = SPRITE_SIZE || 24;

      // ✅ Get animation state
      const animation = p.animation || {
        direction: "down",
        frame: 0,
        isMoving: false,
      };
      const direction = animation.direction || "down";
      const animFrame = animation.frame || 0;

      // ✅ Use PLAYER_ANIMATIONS config for proper 4-frame walk cycle
      const dirConfig = PLAYER_ANIMATIONS[direction] || PLAYER_ANIMATIONS.down;
      const shouldMirror = !!dirConfig.mirror;

      // Get the actual sprite frame index from the animation config
      let frameIndex;
      if (animation.isMoving && dirConfig.frames) {
        const cycleFrame = animFrame % dirConfig.frames.length;
        frameIndex = dirConfig.frames[cycleFrame];
      } else {
        frameIndex = dirConfig.idleFrame || 0;
      }

      // Use playerScale to size sprite target pixels (zoom)
      const targetPx = Math.round(
        displayedCell * (typeof playerScale === "number" ? playerScale : 1),
      );
      const bgZoom = targetPx / sourceSize;

      const startX = margin + frameIndex * (sourceSize + spacing);
      const startY = margin + spriteRow * (sourceSize + spacing) + offsetY;

      const imgOffsetX = -Math.round(startX * bgZoom);
      const imgOffsetY = -Math.round(startY * bgZoom);
      const imgWidth = Math.round((SHEET_WIDTH || 304) * bgZoom);
      const imgHeight = Math.round((SHEET_HEIGHT || 687) * bgZoom);

      const wrapperLeft = Math.round(p.x * displayedCell);
      const wrapperTop = Math.round(p.y * displayedCell);

      // ✅ Invincibility flashing effect
      const now = Date.now();
      const isInvincible = p.invincibleUntil && now < p.invincibleUntil;
      let invincibilityStyle = "";
      if (isInvincible) {
        // Flash every 100ms using timestamp modulo
        const flashOn = Math.floor(now / 100) % 2 === 0;
        invincibilityStyle = `opacity: ${flashOn ? 1 : 0.25};`;
      }

      const wrapperStyle = `position:absolute; left:${wrapperLeft}px; top:${wrapperTop}px; width:${targetPx}px; height:${targetPx}px; z-index:60; display:block; pointer-events:none; overflow:hidden; ${
        shouldMirror ? "transform: scaleX(-1);" : ""
      } ${invincibilityStyle}`;

      const innerStyle = `position:relative; left:${imgOffsetX}px; top:${imgOffsetY}px; width:${imgWidth}px; height:${imgHeight}px; image-rendering: pixelated; display:block; pointer-events:none; border: none;`;

      return {
        tag: "div",
        attrs: {
          style: wrapperStyle,
          "data-player-id": p.id || "",
        },
        children: [
          {
            tag: "img",
            attrs: {
              src: processedPlayerSpriteUrl,
              style: innerStyle,
              draggable: "false",
              alt: "",
            },
          },
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
      ...blockDestroyNodes, // z-index: 45 (block breaking animation)
      ...bombNodes, // z-index: 50
      ...explosionNodes, // z-index: 55
      ...playerNodes, // z-index: 60
    ],
  };
}
