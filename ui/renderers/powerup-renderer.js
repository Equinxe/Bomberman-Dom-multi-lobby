// ui/renderers/powerup-renderer.js
// Renders power-up items on the map and pickup flash effects.

import { POWERUP_SPRITE, POWERUP_TYPES } from "../helpers/constants.js";
import { getTransparentPowerUpUrl } from "../helpers/sprite-loader.js";

const GLOW_COLORS = {
  bombs: "rgba(255,180,50,0.6)",
  flames: "rgba(255,80,30,0.6)",
  speed: "rgba(50,180,255,0.6)",
  wallpass: "rgba(160,100,255,0.6)",
  detonator: "rgba(255,50,50,0.6)",
  liveup: "rgba(255,80,150,0.7)",
  vest: "rgba(255,220,50,0.8)",
  skull: "rgba(180,50,255,0.7)",
};

const FLASH_EMOJIS = {
  bombs: "💣",
  flames: "🔥",
  speed: "⚡",
  wallpass: "👻",
  detonator: "🎯",
  liveup: "❤️",
  vest: "🛡️",
  skull: "💀",
};

/**
 * Render power-up items floating on the map.
 */
export function renderPowerUps(powerUps, displayedCell, powerUpSpriteUrl) {
  if (!powerUps || !Array.isArray(powerUps)) return [];

  const puSpriteSize = POWERUP_SPRITE.spriteSize;
  const puSheetW = POWERUP_SPRITE.sheetWidth;
  const puSheetH = POWERUP_SPRITE.sheetHeight;
  const processedPowerUpUrl = getTransparentPowerUpUrl(powerUpSpriteUrl);
  const nodes = [];

  powerUps.forEach((pu) => {
    const puConfig = POWERUP_TYPES[pu.type];
    if (!puConfig) return;

    const puLeft = Math.round(pu.x * displayedCell);
    const puTop = Math.round(pu.y * displayedCell);
    const srcX = puConfig.srcX;
    const srcY = puConfig.srcY;

    const zoom = displayedCell / puSpriteSize;
    const imgW = Math.round(puSheetW * zoom);
    const imgH = Math.round(puSheetH * zoom);
    const offX = -Math.round(srcX * zoom);
    const offY = -Math.round(srcY * zoom);

    // Floating animation
    const floatPhase = (Date.now() % 1500) / 1500;
    const floatY = Math.sin(floatPhase * Math.PI * 2) * 2;

    const glowColor = GLOW_COLORS[pu.type] || "rgba(255,255,255,0.4)";
    const puStyle = `position:absolute; left:${puLeft}px; top:${Math.round(puTop + floatY)}px; width:${displayedCell}px; height:${displayedCell}px; overflow:hidden; z-index:45; image-rendering:pixelated; filter: drop-shadow(0 0 6px ${glowColor}) drop-shadow(0 2px 4px rgba(0,0,0,0.5));`;
    const puImgStyle = `position:relative; left:${offX}px; top:${offY}px; width:${imgW}px; height:${imgH}px; image-rendering:pixelated; display:block; pointer-events:none;`;

    nodes.push({
      tag: "div",
      attrs: { style: puStyle, "data-powerup-id": pu.id },
      children: [
        { tag: "img", attrs: { src: processedPowerUpUrl, style: puImgStyle, draggable: "false", alt: puConfig.name } },
      ],
    });
  });

  return nodes;
}

/**
 * Render emoji pickup flash effects.
 */
export function renderPickupFlashes(pickupFlashes, displayedCell) {
  if (!pickupFlashes || !Array.isArray(pickupFlashes)) return [];
  const nodes = [];

  pickupFlashes.forEach((flash) => {
    const now = Date.now();
    const elapsed = now - flash.startTime;
    const progress = Math.min(1, elapsed / flash.duration);
    const opacity = 1 - progress;
    const scale = 1 + progress * 0.8;
    const yOffset = -progress * displayedCell * 0.6;

    const fLeft = Math.round(flash.x * displayedCell + displayedCell * 0.15);
    const fTop = Math.round(flash.y * displayedCell + yOffset);

    nodes.push({
      tag: "div",
      attrs: {
        style: `position:absolute; left:${fLeft}px; top:${fTop}px; width:${Math.round(displayedCell * 0.7)}px; height:${Math.round(displayedCell * 0.7)}px; z-index:65; pointer-events:none; display:flex; align-items:center; justify-content:center; opacity:${opacity}; transform:scale(${scale}); font-size:${Math.round(displayedCell * 0.5)}px; text-shadow: 0 0 8px rgba(255,255,255,0.8);`,
      },
      children: [FLASH_EMOJIS[flash.type] || "✨"],
    });
  });

  return nodes;
}
