// ui/renderers/bomb-renderer.js
// Renders bomb pump animations and directional explosion sprites.

import {
  BOMB_SPRITE,
  EXPLOSION_SPRITES,
} from "../helpers/constants.js";
import { imgStyleForBombSprite } from "../helpers/tiles.js";

/**
 * Render bombs with pump animation (R6 C32-C34).
 */
export function renderBombs(bombs, displayedCell, tilesetUrl, tileSrcSize, tileSpacing, tilesPerRowOpt) {
  if (!bombs || !Array.isArray(bombs)) return [];
  const nodes = [];

  bombs.forEach((bomb) => {
    const now = Date.now();
    const elapsed = now - bomb.placedAt;
    const totalTime = bomb.explosionTime - bomb.placedAt;
    const progress = Math.min(1, elapsed / totalTime);

    // Pump cycle accelerates as detonation approaches
    const pumpCycleMs = Math.max(200, 1000 - progress * 700);
    const cyclePos = (elapsed % pumpCycleMs) / pumpCycleMs;
    const bombFrames = BOMB_SPRITE.frames;
    const pumpFrame = Math.floor(cyclePos * bombFrames.length);
    const bombCol = bombFrames[Math.min(pumpFrame, bombFrames.length - 1)];

    const bombLeft = Math.round(bomb.x * displayedCell);
    const bombTop = Math.round(bomb.y * displayedCell);
    const bombStyle = `position:absolute; left:${bombLeft}px; top:${bombTop}px; width:${displayedCell}px; height:${displayedCell}px; overflow:hidden; z-index:50;`;
    const bombImgStyle = imgStyleForBombSprite(BOMB_SPRITE.row, bombCol, tilesetUrl, displayedCell, tileSrcSize, tileSpacing, tilesPerRowOpt || 40);

    nodes.push({
      tag: "div",
      attrs: { style: bombStyle, "data-bomb-id": bomb.id },
      children: [
        { tag: "img", attrs: { src: tilesetUrl, style: bombImgStyle, draggable: "false", alt: "bomb" } },
      ],
    });
  });

  return nodes;
}

/**
 * Render explosions with correct directional sprites and 5-frame animation.
 */
export function renderExplosions(explosions, displayedCell, tilesetUrl, tileSrcSize, tileSpacing, tilesPerRowOpt) {
  if (!explosions || !Array.isArray(explosions)) return [];
  const nodes = [];

  explosions.forEach((explosion) => {
    const now = Date.now();
    const elapsed = now - explosion.startTime;
    const duration = explosion.duration || 800;
    const progress = Math.min(1, elapsed / duration);
    const opacity = progress > 0.9 ? Math.max(0, 1 - (progress - 0.9) * 10) : 1;
    const NUM_FRAMES = 5;
    const frameIdx = Math.min(Math.floor(progress * NUM_FRAMES), NUM_FRAMES - 1);

    explosion.cells.forEach((cell, cellIdx) => {
      const expLeft = Math.round(cell.x * displayedCell);
      const expTop = Math.round(cell.y * displayedCell);

      let spriteRow, spriteCol;

      if (cellIdx === 0) {
        // Center
        spriteRow = EXPLOSION_SPRITES.center.row;
        spriteCol = EXPLOSION_SPRITES.center.cols[frameIdx];
      } else {
        // Directional cell
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

        // Find max distance in this direction to determine tip
        let maxDist = distance;
        explosion.cells.forEach((c) => {
          const cdx = c.x - centerCell.x;
          const cdy = c.y - centerCell.y;
          if (dirKey === "top" && cdy < 0) maxDist = Math.max(maxDist, Math.abs(cdy));
          else if (dirKey === "bottom" && cdy > 0) maxDist = Math.max(maxDist, cdy);
          else if (dirKey === "left" && cdx < 0) maxDist = Math.max(maxDist, Math.abs(cdx));
          else if (dirKey === "right" && cdx > 0) maxDist = Math.max(maxDist, cdx);
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
      const expImgStyle = imgStyleForBombSprite(spriteRow, spriteCol, tilesetUrl, displayedCell, tileSrcSize, tileSpacing, tilesPerRowOpt || 40);

      nodes.push({
        tag: "div",
        attrs: { style: expStyle },
        children: [
          { tag: "img", attrs: { src: tilesetUrl, style: expImgStyle, draggable: "false", alt: "explosion" } },
        ],
      });
    });
  });

  return nodes;
}
