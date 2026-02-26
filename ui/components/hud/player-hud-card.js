// ui/components/hud/player-hud-card.js
// Renders a single player card in the top HUD bar.

import { PLAYER_COLORS, TEAM_INFO } from "../../helpers/constants.js";

/**
 * Convert a numeric color index to a CSS hex string.
 */
export function playerColorToCss(index) {
  const idx = typeof index === "number" ? index % PLAYER_COLORS.length : 0;
  const entry = PLAYER_COLORS[idx] || PLAYER_COLORS[0];
  return entry && entry.hex ? entry.hex : "#ffffff";
}

/**
 * Build a virtual-DOM node for one player's HUD card.
 */
export function playerHudCard(p = {}, index = 0, localPlayerId = null) {
  const color = playerColorToCss(p.color);
  const lives = typeof p.lives === "number" ? p.lives : 3;
  const isDead = !!p.dead;
  const isLocal = p.id === localPlayerId;
  const initials = (p.pseudo || `J${index + 1}`).slice(0, 3).toUpperCase();
  const playerTeam = p.team || 0;
  const teamInfo = TEAM_INFO[playerTeam] || TEAM_INFO[0];

  // Hearts display (max 5, show up to the max of lives or 3)
  const maxHearts = Math.max(3, Math.min(lives, 5));
  const hearts = [];
  for (let i = 0; i < maxHearts; i++) {
    hearts.push({
      tag: "span",
      attrs: {
        style: `
          font-size: 10px;
          margin: 0 1px;
          ${i < lives ? "color: #ff4b4b; text-shadow: 0 0 4px #ff4b4b88;" : "color: #333; text-shadow: none;"}
        `,
      },
      children: ["♥"],
    });
  }

  return {
    tag: "div",
    attrs: {
      style: `
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 3px 8px;
        border-radius: 6px;
        background: ${isDead ? "rgba(80,20,20,0.6)" : "rgba(0,0,0,0.45)"};
        border: 1px solid ${isLocal ? "rgba(59,230,170,0.7)" : isDead ? "rgba(255,60,60,0.4)" : "rgba(255,255,255,0.12)"};
        ${isDead ? "opacity: 0.5;" : ""}
        transition: opacity 0.3s;
      `,
    },
    children: [
      // Color indicator dot
      {
        tag: "div",
        attrs: {
          style: `
            width: 22px; height: 22px;
            border-radius: 4px;
            background: ${isDead ? "#444" : color};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            color: #000;
            font-weight: bold;
            flex-shrink: 0;
            ${isDead ? "" : `box-shadow: 0 0 6px ${color}66;`}
            ${playerTeam !== 0 ? `border: 2px solid ${teamInfo.color};` : ""}
          `,
        },
        children: [
          { tag: "span", children: [isDead ? "☠" : initials.charAt(0)] },
        ],
      },
      // Name + hearts column
      {
        tag: "div",
        attrs: {
          style: "display:flex; flex-direction:column; gap:1px;",
        },
        children: [
          {
            tag: "div",
            attrs: {
              style: `font-size: 7px; color: ${isDead ? "#666" : "#cfeedd"}; letter-spacing: 1px; white-space: nowrap; display:flex; align-items:center; gap:3px; ${isDead ? "text-decoration: line-through;" : ""}`,
            },
            children: [
              // Team label badge
              ...(playerTeam !== 0
                ? [
                    {
                      tag: "span",
                      attrs: {
                        style: `font-size:6px; color:${teamInfo.color}; background:${teamInfo.color}22; border:1px solid ${teamInfo.color}55; border-radius:3px; padding:0 3px;`,
                      },
                      children: [teamInfo.label],
                    },
                  ]
                : []),
              initials,
            ],
          },
          {
            tag: "div",
            attrs: {
              style: "display:flex; align-items:center;",
            },
            children: isDead
              ? [
                  {
                    tag: "span",
                    attrs: {
                      style: "font-size: 7px; color: #ff4444;",
                    },
                    children: ["DEAD"],
                  },
                ]
              : hearts,
          },
        ],
      },
    ],
  };
}
