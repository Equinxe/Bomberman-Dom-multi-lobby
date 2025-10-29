// ui/PlayerPreview.js
import {
  SPRITE_ROWS,
  SPRITE_SIZE,
  SPRITE_ZOOM,
  SHEET_WIDTH,
  SHEET_HEIGHT,
} from "./constants.js";

// PlayerPreview: extrait depuis ui/lobby.js — rend une preview animée du sprite
export function PlayerPreview({ colorIdx, uniqueId }) {
  const margin = 4;
  const spacing = 1;
  const framesCount = 3;
  const frameSize = SPRITE_SIZE;
  const displayFrameSize = frameSize - 1;
  const previewSize = displayFrameSize * SPRITE_ZOOM;
  let adjustPx = 0;
  const tickMs = 260;

  const row = SPRITE_ROWS[colorIdx] ? SPRITE_ROWS[colorIdx].row : 0;
  const offsetY = SPRITE_ROWS[colorIdx]
    ? SPRITE_ROWS[colorIdx].offsetY || 0
    : 0;
  const posY = margin + row * (frameSize + spacing) + offsetY;

  const frameXs = [];
  for (let n = 0; n < framesCount; n++) {
    const base = margin + n * (frameSize + spacing);
    const corrected = n > 0 ? base + adjustPx : base;
    frameXs.push(corrected);
  }

  const cropShift = 0;
  const displayOffsetPerFrame = frameXs.map((frameX) => frameX + cropShift);
  const posYpx = -posY * SPRITE_ZOOM;
  const framePositionsPx = displayOffsetPerFrame.map(
    (x) => `-${x * SPRITE_ZOOM}px ${posYpx}px`
  );

  const safeId = `preview_${String(uniqueId).replace(
    /[^a-z0-9_-]/gi,
    ""
  )}_${Math.random().toString(36).slice(2, 6)}`;
  const bgSizeX = SHEET_WIDTH * SPRITE_ZOOM;
  const bgSizeY = SHEET_HEIGHT * SPRITE_ZOOM;

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
        width: ${previewSize}px;
        height: ${previewSize}px;
        overflow: hidden;
        display:flex;
        align-items:center;
        justify-content:center;
      `,
    },
    children: [
      {
        tag: "div",
        attrs: {
          id: safeId,
          style: `
            width: ${previewSize}px;
            height: ${previewSize}px;
            background-image: url('./assets/images/Players.png');
            background-position: ${framePositionsPx[0]};
            background-size: ${bgSizeX}px ${bgSizeY}px;
            background-repeat: no-repeat;
            image-rendering: pixelated;
            border-radius:6px;
          `,
        },
      },
      { tag: "script", children: [scriptContent] },
    ],
  };
}
