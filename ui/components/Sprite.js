// Sprite.js - Player sprite component for lobby/preview
// Uses Players.png spritesheet (304x687, blue bg, margin=4, sprite=24x24, gap=1, stride=25)
import { getTransparentSpriteBgUrl } from "../helpers/sprite-loader.js";

const PLAYER_SPRITE_URL = "./assets/images/Players.png";

export function Sprite({
  frame = 0,
  row = 0,
  size = 24,
  className = "",
  offsetX = 0, // ✅ Fixed: extra offset (on top of margin)
  offsetY = 0, // ✅ Fixed: extra offset (on top of margin)
  zoom = 3,
  sheetWidth = 304, // ✅ Fixed: actual width
  sheetHeight = 687,
  id = "",
  framesCount = 1,
  duration = 0.6,
}) {
  const margin = 4; // ✅ Fixed: actual margin in Players.png
  const spacing = 1; // 1px gap between sprites
  const stride = size + spacing; // 25px
  const x = margin + frame * stride + offsetX;
  const y = margin + row * stride + offsetY;

  const startX = margin + 0 * stride + offsetX;
  const endX = margin + Math.max(0, framesCount - 1) * stride + offsetX;
  const startY = margin + row * stride + offsetY;

  // animation unique par id pour éviter collision
  const animName = `sprite_anim_${
    id || Math.random().toString(36).slice(2, 8)
  }`;

  // Si framesCount > 1, on génère un bloc <style> avec keyframes qui déplace background-position
  const bgUrl = getTransparentSpriteBgUrl(PLAYER_SPRITE_URL);

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
          `width:${size * zoom}px`,
          `height:${size * zoom}px`,
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
              `width:${size * zoom}px`,
              `height:${size * zoom}px`,
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
        `width:${size * zoom}px`,
        `height:${size * zoom}px`,
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
