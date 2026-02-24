import {
  SPRITE_ROWS,
  SHEET_WIDTH,
  SHEET_HEIGHT,
  PLAYER_SHEET_COL_STRIDE,
  PLAYER_SHEET_ROW_STRIDE,
} from "./../helpers/constants.js";
import { getTransparentSpriteBgUrl } from "./../helpers/sprite-loader.js";

const PLAYER_SPRITE_URL = "./assets/images/PlayerTest.png";

// Preview zoom — bigger than in-game SPRITE_ZOOM (3) for lobby visibility
const PREVIEW_ZOOM = 5;

// PlayerPreview: renders an animated player sprite preview in the lobby
// Art within each 24x32 cell (pixel-verified across all 8 rows):
//   x = 8..23 (16px wide), y = 13..31 (19px tall)
// We use a slightly larger crop (4px left pad, 20px wide) to avoid
// sub-pixel clipping at the edges when the browser scales up.
const ART_LEFT_PAD = 4; // px of empty space left of visible window
const ART_TOP_PAD = 13; // px of empty space above art in each cell
const ART_WIDTH = 20; // px visible width (includes 4px left safety + all art)
const ART_HEIGHT = 19; // px of actual art height

export function PlayerPreview({ colorIdx, uniqueId, zoom = PREVIEW_ZOOM }) {
  const framesCount = 3;
  const tickMs = 260;

  // Visible art dimensions (cropped)
  const displayW = ART_WIDTH * zoom;
  const displayH = ART_HEIGHT * zoom;

  const row = SPRITE_ROWS[colorIdx] ? SPRITE_ROWS[colorIdx].row : 0;

  // Walk-down frames: cols 0, 1, 2
  // Background-position offsets: shift so that only the art part is visible
  // bgPosX = -(col * 24 + ART_LEFT_PAD) * zoom
  // bgPosY = -(row * 32 + ART_TOP_PAD) * zoom
  const framePositionsPx = [];
  for (let n = 0; n < framesCount; n++) {
    const srcX = n * PLAYER_SHEET_COL_STRIDE + ART_LEFT_PAD;
    const srcY = row * PLAYER_SHEET_ROW_STRIDE + ART_TOP_PAD;
    framePositionsPx.push(`-${srcX * zoom}px -${srcY * zoom}px`);
  }

  const safeId = `preview_${String(uniqueId).replace(
    /[^a-z0-9_-]/gi,
    "",
  )}_${Math.random().toString(36).slice(2, 6)}`;
  const bgSizeX = SHEET_WIDTH * zoom;
  const bgSizeY = SHEET_HEIGHT * zoom;

  // Use the processed transparent sprite (green bg removed)
  const bgUrl = getTransparentSpriteBgUrl(PLAYER_SPRITE_URL);

  const scriptContent = `
(function(){
  const el = document.getElementById("${safeId}");
  if (!el) return;
  const frames = ${JSON.stringify(framePositionsPx)};
  let idx = 0;
  el.style.backgroundPosition = frames[0];
  const iv = setInterval(() => {
    idx = (idx + 1) % frames.length;
    el.style.backgroundPosition = frames[idx];
  }, ${tickMs});
  el.__previewInterval = iv;
  const ro = new MutationObserver(() => {
    if (!document.getElementById("${safeId}")) {
      clearInterval(iv);
      ro.disconnect();
    }
  });
  ro.observe(document.body, { childList: true, subtree: true });
})();
`.trim();

  return {
    tag: "div",
    attrs: {
      class: "player-preview-wrap",
      style: `
        width: ${displayW}px;
        height: ${displayH}px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      `,
    },
    children: [
      {
        tag: "div",
        attrs: {
          id: safeId,
          style: `
            width: ${displayW}px;
            height: ${displayH}px;
            background-image: ${bgUrl};
            background-position: ${framePositionsPx[0]};
            background-size: ${bgSizeX}px ${bgSizeY}px;
            background-repeat: no-repeat;
            image-rendering: pixelated;
          `,
        },
      },
      { tag: "script", children: [scriptContent] },
    ],
  };
}
