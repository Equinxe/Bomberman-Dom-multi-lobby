// ui/components/Hud.js
// Main HUD component — delegates to sub-modules for each section.

import { topHudBar } from "./hud/top-hud-bar.js";
import { buildPowerUpIcons, bottomHudBar } from "./hud/powerup-bar.js";

export function HUD({
  score = 0,
  countdown = null,
  highscore = null,
  endTimer = null,
  players = [],
  fps = 60,
  gameWinner = null,
  localPlayerId = null,
}) {
  const localPlayer = players.find((p) => p.id === localPlayerId) || {};
  const icons = buildPowerUpIcons(localPlayer);

  return {
    tag: "div",
    attrs: {
      id: "hud-root",
      style: "pointer-events: none;",
    },
    children: [
      topHudBar({ countdown, players, localPlayerId }),
      bottomHudBar({ powerUpIcons: icons, score, highscore, fps }),
    ],
  };
}
