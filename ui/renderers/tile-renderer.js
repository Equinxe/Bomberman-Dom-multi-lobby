// ui/renderers/tile-renderer.js
// Renders map tiles and block-destruction animations.

import { isDestructibleCell } from "../helpers/collision.js";
import {
  tileIndexForCell,
  imgStyleForIndex,
  ensureTilesetInfo,
} from "../helpers/tiles.js";

/**
 * Build the static tile grid vnodes.
 */
export function renderTiles(grid, rows, cols, displayedCell, tilesetUrl, tileSrcSize, tileSpacing, tilesPerRowOpt) {
  ensureTilesetInfo(tilesetUrl, tileSrcSize, tileSpacing);

  const tileNodes = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = (grid[y] && grid[y][x]) !== undefined ? grid[y][x] : "floor";
      const idx = tileIndexForCell(cell);
      const isBlock = isDestructibleCell(cell);
      const wrapperStyle = `position:absolute; left:${Math.round(x * displayedCell)}px; top:${Math.round(y * displayedCell)}px; width:${Math.round(displayedCell)}px; height:${Math.round(displayedCell)}px; overflow:hidden; box-sizing:border-box; z-index:1; background-color: transparent; ${isBlock ? "clip-path: inset(0 0 1px 0);" : ""}`;
      const imgStyle = imgStyleForIndex(idx, tilesetUrl, displayedCell, tileSrcSize, tileSpacing, tilesPerRowOpt, 679, 373);
      tileNodes.push({
        tag: "div",
        attrs: { style: wrapperStyle },
        children: [
          { tag: "img", attrs: { src: tilesetUrl, style: imgStyle, draggable: "false", alt: "" } },
        ],
      });
    }
  }
  return tileNodes;
}

/**
 * Render block-destruction animations (R10 C33-C39 = 7 frames).
 */
export function renderBlockDestruction(destroyingBlocks, displayedCell, tilesetUrl, tileSrcSize, tileSpacing, tilesPerRowOpt) {
  if (!destroyingBlocks || !Array.isArray(destroyingBlocks)) return [];

  const BLOCK_ANIM_START = 10 * 40 + 33; // R10 C33 = index 433
  const BLOCK_ANIM_FRAMES = 7;
  const nodes = [];

  destroyingBlocks.forEach((block) => {
    const now = Date.now();
    const elapsed = now - block.startTime;
    const duration = block.duration || 800;
    const progress = Math.min(1, elapsed / duration);
    const frameIdx = Math.min(Math.floor(progress * BLOCK_ANIM_FRAMES), BLOCK_ANIM_FRAMES - 1);
    const tileIdx = BLOCK_ANIM_START + frameIdx;
    const opacity = progress > 0.85 ? Math.max(0, 1 - (progress - 0.85) * 6.67) : 1;

    const bLeft = Math.round(block.x * displayedCell);
    const bTop = Math.round(block.y * displayedCell);
    const bStyle = `position:absolute; left:${bLeft}px; top:${bTop}px; width:${displayedCell}px; height:${displayedCell}px; overflow:hidden; z-index:56; opacity:${opacity};`;
    const bImgStyle = imgStyleForIndex(tileIdx, tilesetUrl, displayedCell, tileSrcSize, tileSpacing, tilesPerRowOpt, 679, 373);

    nodes.push({
      tag: "div",
      attrs: { style: bStyle },
      children: [
        { tag: "img", attrs: { src: tilesetUrl, style: bImgStyle, draggable: "false", alt: "block-destroy" } },
      ],
    });
  });

  return nodes;
}
