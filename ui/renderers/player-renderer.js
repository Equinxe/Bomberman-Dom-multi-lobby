// ui/renderers/player-renderer.js
// Renders player sprites with walk animation, effects (invincibility, vest,
// skull curse, invisibility, ghost), and name tags.

import {
  SPRITE_ROWS,
  SPRITE_WIDTH,
  SPRITE_HEIGHT,
  SHEET_WIDTH,
  SHEET_HEIGHT,
  PLAYER_SHEET_COL_STRIDE,
  PLAYER_SHEET_ROW_STRIDE,
  PLAYER_ANIMATIONS,
  TEAM_INFO,
} from "../helpers/constants.js";
import { getTransparentSpriteUrl } from "../helpers/sprite-loader.js";

/**
 * Compute the effect style (opacity, filter) for a player.
 */
function computePlayerEffects(p, localPlayerId) {
  const now = Date.now();
  const isDead = !!p.dead;
  const isInvincible = p.invincibleUntil && now < p.invincibleUntil;
  const isVest = !!p.vestActive;
  const isSkullCursed = !!p.skullEffect;
  const isInvisible = !!p.invisible;

  let effectStyle = "";
  let filter = "";

  if (isDead) {
    effectStyle = "opacity: 0.25;";
    filter = "grayscale(0.8) brightness(1.5)";
  } else if (isVest) {
    const vestTimeLeft = (p.vestUntil || 0) - now;
    const vestExpiring = vestTimeLeft > 0 && vestTimeLeft <= 2000;
    if (vestExpiring) {
      const flashOn = Math.floor(now / 60) % 2 === 0;
      effectStyle = `opacity: ${flashOn ? 1 : 0.15};`;
    } else {
      const flashOn = Math.floor(now / 150) % 3;
      effectStyle = `opacity: ${flashOn === 0 ? 1 : flashOn === 1 ? 0.7 : 0.9};`;
    }
    filter = "drop-shadow(0 0 8px rgba(255,220,50,0.9)) drop-shadow(0 0 16px rgba(255,180,0,0.5))";
  } else if (isInvincible) {
    const flashOn = Math.floor(now / 100) % 2 === 0;
    effectStyle = `opacity: ${flashOn ? 1 : 0.25};`;
  }

  if (isSkullCursed) {
    const skullTimeLeft = (p.skullUntil || 0) - now;
    const skullExpiring = skullTimeLeft > 0 && skullTimeLeft <= 2000;
    if (skullExpiring) {
      const flashOn = Math.floor(now / 60) % 2 === 0;
      effectStyle = `opacity: ${flashOn ? 1 : 0.2};`;
    }
    filter = `${filter ? filter + " " : ""}drop-shadow(0 0 6px rgba(180,50,255,0.8)) hue-rotate(270deg)`;
  }

  if (isInvisible && p.id === localPlayerId) {
    effectStyle = "opacity: 0.3;";
  }

  if (filter) {
    effectStyle += ` filter: ${filter};`;
  }

  return effectStyle;
}

/**
 * Build a name-tag vnode for a player.
 */
function buildNameTag(p, displayedCell, shouldMirror) {
  const isDead = !!p.dead;
  const isVest = !!p.vestActive;
  const isSkullCursed = !!p.skullEffect;

  const playerTeam = p.team || 0;
  const teamInfo = TEAM_INFO[playerTeam] || TEAM_INFO[0];
  const teamPrefix = playerTeam !== 0 ? `${teamInfo.label} ` : "";
  const statusPrefix = isDead ? "👻" : isVest ? "🛡️" : isSkullCursed ? "💀" : "";
  const nameColor = isDead ? "#ff9944" : isVest ? "#ffdd44" : isSkullCursed ? "#cc66ff" : "#fff";

  return {
    tag: "div",
    attrs: {
      style: `position:absolute; top:${-Math.round(displayedCell * 0.35)}px; left:50%; transform:translateX(-50%)${shouldMirror ? " scaleX(-1)" : ""}; font-family:'Press Start 2P',monospace; font-size:${Math.max(6, Math.round(displayedCell * 0.2))}px; color:${nameColor}; text-shadow:0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.5); white-space:nowrap; pointer-events:none; text-align:center; letter-spacing:0.5px;`,
    },
    children: [`${teamPrefix}${statusPrefix}${(p.pseudo || "").slice(0, 6)}`],
  };
}

/**
 * Render all visible player sprites.
 */
export function renderPlayers(players, displayedCell, playerSpriteUrl, playerScale, localPlayerId) {
  const processedPlayerSpriteUrl = getTransparentSpriteUrl(playerSpriteUrl);
  const scale = typeof playerScale === "number" ? playerScale : 1;
  const sourceW = SPRITE_WIDTH || 24;
  const sourceH = SPRITE_HEIGHT || 32;

  return (players || [])
    .filter((p) => {
      if (p.dead && p.id !== localPlayerId) return false;
      if (p.invisible && p.id !== localPlayerId) return false;
      return true;
    })
    .map((p) => {
      const colorIdx = typeof p.color === "number" ? p.color : 0;
      const spriteRow = (SPRITE_ROWS && SPRITE_ROWS[colorIdx] && SPRITE_ROWS[colorIdx].row) || 0;

      const animation = p.animation || { direction: "down", frame: 0, isMoving: false };
      const direction = animation.direction || "down";
      const animFrame = animation.frame || 0;

      const dirConfig = PLAYER_ANIMATIONS[direction] || PLAYER_ANIMATIONS.down;
      const shouldMirror = !!dirConfig.mirror;

      let frameIndex;
      if (animation.isMoving && dirConfig.frames) {
        const cycleFrame = animFrame % dirConfig.frames.length;
        frameIndex = dirConfig.frames[cycleFrame];
      } else {
        frameIndex = dirConfig.idleFrame || 0;
      }

      const bgZoom = (displayedCell * scale) / sourceW;
      const targetW = Math.round(sourceW * bgZoom);
      const targetH = Math.round(sourceH * bgZoom);

      const startX = frameIndex * PLAYER_SHEET_COL_STRIDE;
      const startY = spriteRow * PLAYER_SHEET_ROW_STRIDE;

      const imgOffsetX = -Math.round(startX * bgZoom);
      const imgOffsetY = -Math.round(startY * bgZoom);
      const imgWidth = Math.round((SHEET_WIDTH || 456) * bgZoom);
      const imgHeight = Math.round((SHEET_HEIGHT || 592) * bgZoom);

      const extraW = targetW - displayedCell;
      const wrapperLeft = Math.round(p.x * displayedCell - extraW / 2);
      const wrapperTop = Math.round((p.y + 1) * displayedCell - targetH);

      const playerEffectStyle = computePlayerEffects(p, localPlayerId);

      const wrapperStyle = `position:absolute; left:${wrapperLeft}px; top:${wrapperTop}px; width:${targetW}px; height:${targetH}px; z-index:60; display:block; pointer-events:none; overflow:visible; ${shouldMirror ? "transform: scaleX(-1);" : ""} ${playerEffectStyle}`;
      const innerStyle = `position:relative; left:${imgOffsetX}px; top:${imgOffsetY}px; width:${imgWidth}px; height:${imgHeight}px; image-rendering: pixelated; display:block; pointer-events:none; border: none;`;

      return {
        tag: "div",
        attrs: { style: wrapperStyle, "data-player-id": p.id || "" },
        children: [
          buildNameTag(p, displayedCell, shouldMirror),
          {
            tag: "div",
            attrs: { style: `overflow:hidden; width:${targetW}px; height:${targetH}px;` },
            children: [
              { tag: "img", attrs: { src: processedPlayerSpriteUrl, style: innerStyle, draggable: "false", alt: "" } },
            ],
          },
        ].filter(Boolean),
      };
    });
}
