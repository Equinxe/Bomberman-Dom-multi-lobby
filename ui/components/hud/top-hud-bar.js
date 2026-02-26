// ui/components/hud/top-hud-bar.js
// Builds the top HUD bar: player cards on left/right, timer in center.

import { playerHudCard } from "./player-hud-card.js";

/**
 * Format seconds into MM:SS.
 */
function formatTime(s) {
  if (typeof s !== "number") return "00:00";
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(Math.floor(s % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * Build the top HUD bar virtual-DOM node.
 */
export function topHudBar({ countdown, players = [], localPlayerId = null }) {
  // Timer urgency colors
  let timerColor = "#fff";
  let timerGlow = "none";
  if (typeof countdown === "number") {
    if (countdown <= 30) {
      timerColor = "#ff4444";
      timerGlow = "0 0 12px #ff4444, 0 0 24px #ff000066";
    } else if (countdown <= 60) {
      timerColor = "#ffaa33";
      timerGlow = "0 0 8px #ffaa3388";
    }
  }

  return {
    tag: "div",
    attrs: {
      id: "hud-top",
      style: `
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 56px;
        background: linear-gradient(180deg, rgba(16,16,32,0.95) 0%, rgba(16,16,32,0.85) 80%, transparent 100%);
        border-bottom: 2px solid rgba(59,230,170,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 0 16px;
        box-sizing: border-box;
        pointer-events: none;
        font-family: 'Press Start 2P', monospace;
      `,
    },
    children: [
      {
        tag: "div",
        attrs: {
          style: `
            width: min(920px, calc(100% - 32px));
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          `,
        },
        children: [
          // Left: Player cards (first 2)
          {
            tag: "div",
            attrs: {
              style:
                "display:flex; gap:10px; align-items:center; flex:1; justify-content:flex-start;",
            },
            children: players
              .slice(0, 2)
              .map((p, i) => playerHudCard(p, i, localPlayerId)),
          },

          // Center: Timer
          {
            tag: "div",
            attrs: {
              style: `
                min-width: 130px;
                padding: 6px 16px;
                border-radius: 8px;
                background: rgba(0,0,0,0.6);
                border: 2px solid rgba(59,230,170,0.5);
                text-align: center;
                flex-shrink: 0;
              `,
            },
            children: [
              {
                tag: "div",
                attrs: {
                  style: `font-size:8px; color:#8fc; margin-bottom:2px; letter-spacing:2px;`,
                },
                children: ["TIME"],
              },
              {
                tag: "div",
                attrs: {
                  style: `font-size:16px; color:${timerColor}; text-shadow:${timerGlow}; letter-spacing:3px;`,
                },
                children: [formatTime(countdown)],
              },
            ],
          },

          // Right: Player cards (remaining)
          {
            tag: "div",
            attrs: {
              style:
                "display:flex; gap:10px; align-items:center; flex:1; justify-content:flex-end;",
            },
            children: players
              .slice(2, 4)
              .map((p, i) => playerHudCard(p, i + 2, localPlayerId)),
          },
        ],
      },
    ],
  };
}
