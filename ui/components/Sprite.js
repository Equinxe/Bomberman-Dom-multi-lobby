// Sprite.js - Player sprite component for lobby/preview
// Uses PlayerTest.png spritesheet (456x592, green bg removed, cell=24x32, no gaps)

import {
  SPRITE_WIDTH,
  SPRITE_HEIGHT,
  SPRITE_ZOOM,
  SHEET_WIDTH,
  SHEET_HEIGHT,
  PLAYER_SHEET_COL_STRIDE,
  PLAYER_SHEET_ROW_STRIDE,
} from "./../helpers/constants.js";
import { getTransparentSpriteBgUrl } from "./../helpers/sprite-loader.js";

const PLAYER_SPRITE_URL = "./assets/images/PlayerTest.png";

export function Sprite({
  frame = 0,
  row = 0,
  width = SPRITE_WIDTH,
  height = SPRITE_HEIGHT,
  className = "",
  zoom = SPRITE_ZOOM,
  sheetWidth = SHEET_WIDTH,
  sheetHeight = SHEET_HEIGHT,
  colStride = PLAYER_SHEET_COL_STRIDE,
  rowStride = PLAYER_SHEET_ROW_STRIDE,
  id = "",
  framesCount = 1,
  duration = 0.6,
}) {
  const bgUrl = getTransparentSpriteBgUrl(PLAYER_SPRITE_URL);

  const x = frame * colStride;
  const y = row * rowStride;

  const startX = 0;
  const endX = Math.max(0, framesCount - 1) * colStride;
  const startY = row * rowStride;

  // animation unique par id pour éviter collision
  const animName = `sprite_anim_${
    id || Math.random().toString(36).slice(2, 8)
  }`;

  if (framesCount > 1) {
    const keyframes = `
@keyframes ${animName} {
  0% { background-position: -${startX * zoom}px -${startY * zoom}px; }
  100% { background-position: -${endX * zoom}px -${startY * zoom}px; }
}
`;
    return {
      tag: "div",
      attrs: {
        class: `sprite-wrap ${className}`,
        style: [
          `width:${width * zoom}px`,
          `height:${height * zoom}px`,
          "display:inline-block",
          "overflow:hidden",
          "box-sizing:border-box",
        ].join(";"),
      },
      children: [
        { tag: "style", children: [keyframes] },
        {
          tag: "div",
          attrs: {
            id,
            class: `sprite-sheet ${className}`,
            style: [
              `width:${width * zoom}px`,
              `height:${height * zoom}px`,
              `background-image:${bgUrl}`,
              `background-position:-${startX * zoom}px -${startY * zoom}px`,
              `background-size:${sheetWidth * zoom}px ${sheetHeight * zoom}px`,
              "background-repeat:no-repeat",
              "image-rendering:pixelated",
              "border-radius:6px",
              "box-shadow:0 0 10px #45ffc077",
              "border:2px solid #45ffc0",
              `animation: ${animName} ${duration}s steps(${framesCount}) infinite`,
            ].join(";"),
          },
        },
      ],
    };
  }

  // Sinon rendu statique classique
  return {
    tag: "div",
    attrs: {
      id,
      class: `sprite-sheet ${className}`,
      style: [
        `width:${width * zoom}px`,
        `height:${height * zoom}px`,
        `background-image:${bgUrl}`,
        `background-position:-${x * zoom}px -${y * zoom}px`,
        `background-size:${sheetWidth * zoom}px ${sheetHeight * zoom}px`,
        "background-repeat:no-repeat",
        "image-rendering:pixelated",
        "border-radius:6px",
        "box-shadow:0 0 10px #45ffc077",
        "border:2px solid #45ffc0",
        "margin:auto",
        "overflow:hidden",
      ].join(";"),
    },
  };
}
