import { PLAYER_COLORS, TEAM_INFO } from "./../helpers/constants.js";

export function HUD({
  score = 0,
  countdown = null, // seconds remaining (300..0) or null
  highscore = null,
  endTimer = null, // seconds elapsed since level end or null
  players = [], // [{ pseudo, color, lives, dead }]
  fps = 60,
  gameWinner = null, // { id, pseudo } or null
  localPlayerId = null,
}) {
  const fmt = (s) => {
    if (typeof s !== "number") return "00:00";
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(Math.floor(s % 60)).padStart(2, "0");
    return `${mm}:${ss}`;
  };

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

  const children = [];

  // ========== TOP HUD BAR (uses HUD.png as background) ==========
  children.push({
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
      // HUD content centered, max-width to match game
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
                children: [fmt(countdown)],
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
  });

  // ========== BOTTOM HUD BAR (power-ups + stats) ==========
  // Find local player for power-up display
  const localPlayer = players.find((p) => p.id === localPlayerId) || {};
  const pMaxBombs = localPlayer.maxBombs || 1;
  const pBombRange = localPlayer.bombRange || 3;
  const pSpeed = localPlayer.speed || 4;
  const pWallpass = !!localPlayer.wallpass;
  const pDetonator = !!localPlayer.detonator;
  const pVestActive = !!localPlayer.vestActive;
  const pSkullEffect = localPlayer.skullEffect || null;

  // Skull effect display names
  const skullNames = {
    slow: "SLOW",
    fast: "FAST",
    constipation: "NO BOMB",
    diarrhea: "AUTO💣",
    invisible: "INVIS",
    minRange: "MIN",
  };

  const powerUpIcons = [
    {
      emoji: "💣",
      value: pMaxBombs,
      label: "BOMB",
      highlight: pMaxBombs > 1,
      max: 8,
    },
    {
      emoji: "🔥",
      value: pBombRange,
      label: "FIRE",
      highlight: pBombRange > 3,
      max: 10,
    },
    {
      emoji: "⚡",
      value: pSpeed.toFixed ? pSpeed.toFixed(1) : pSpeed,
      label: "SPD",
      highlight: pSpeed > 4,
      max: 8,
    },
    {
      emoji: "👻",
      value: pWallpass ? "ON" : "—",
      label: "WALL",
      highlight: pWallpass,
      isBool: true,
    },
    {
      emoji: "🎯",
      value: pDetonator ? "ON" : "—",
      label: "DET [E]",
      highlight: pDetonator,
      isBool: true,
    },
    {
      emoji: "🛡️",
      value: pVestActive ? "ON" : "—",
      label: "VEST",
      highlight: pVestActive,
      isBool: true,
      color: pVestActive ? "#ffdd44" : null,
    },
    ...(pSkullEffect
      ? [
          {
            emoji: "💀",
            value: skullNames[pSkullEffect] || pSkullEffect,
            label: "CURSE",
            highlight: true,
            isBool: true,
            color: "#ff4444",
          },
        ]
      : []),
  ];

  children.push({
    tag: "div",
    attrs: {
      id: "hud-bottom",
      style: `
        position: fixed;
        bottom: 0; left: 0; right: 0;
        height: 40px;
        background: linear-gradient(0deg, rgba(16,16,32,0.92) 0%, rgba(16,16,32,0.8) 80%, transparent 100%);
        border-top: 1px solid rgba(59,230,170,0.25);
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
            font-size: 9px;
            color: #8fc;
          `,
        },
        children: [
          // Left: Power-up icons
          {
            tag: "div",
            attrs: { style: "display:flex; gap:8px; align-items:center;" },
            children: powerUpIcons.map((pu) => {
              const highlightColor =
                pu.color || (pu.highlight ? "#3be6aa" : null);
              const bgColor = pu.color
                ? `${pu.color}22`
                : pu.highlight
                  ? "rgba(59,230,170,0.18)"
                  : "rgba(0,0,0,0.3)";
              const borderColor = pu.color
                ? `${pu.color}88`
                : pu.highlight
                  ? "rgba(59,230,170,0.55)"
                  : "rgba(255,255,255,0.06)";
              return {
                tag: "div",
                attrs: {
                  style: `
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  padding: 3px 6px;
                  border-radius: 4px;
                  background: ${bgColor};
                  border: 1px solid ${borderColor};
                  ${pu.highlight ? `text-shadow: 0 0 6px ${highlightColor || "#3be6aa"}88;` : ""}
                `,
                },
                children: [
                  {
                    tag: "span",
                    attrs: { style: "font-size:11px;" },
                    children: [pu.emoji],
                  },
                  {
                    tag: "div",
                    attrs: {
                      style:
                        "display:flex; flex-direction:column; gap:0; line-height:1;",
                    },
                    children: [
                      {
                        tag: "span",
                        attrs: {
                          style: `font-size:6px; color:${pu.highlight ? highlightColor || "#3be6aa" : "#445"}; letter-spacing:0.5px;`,
                        },
                        children: [pu.label],
                      },
                      {
                        tag: "span",
                        attrs: {
                          style: `font-size:9px; color:${pu.highlight ? "#fff" : "#556"}; font-weight:bold;`,
                        },
                        children: [String(pu.value)],
                      },
                    ],
                  },
                ],
              };
            }),
          },
          // Center: Score
          {
            tag: "span",
            children: [`SC ${score}`],
          },
          // Right: FPS
          {
            tag: "div",
            attrs: { style: "display:flex; gap:12px;" },
            children: [
              highscore != null
                ? { tag: "span", children: [`HI ${highscore}`] }
                : { tag: "span", children: [""] },
              {
                tag: "span",
                attrs: { style: "color:#556;" },
                children: [`${Math.round(fps)}FPS`],
              },
            ],
          },
        ],
      },
    ],
  });

  // ========== WIN/DEATH OVERLAY ==========
  // Win overlay is handled as a persistent DOM element in game-client.js (showWinOverlay)
  // to avoid flashing caused by the render loop rebuilding the DOM every frame.

  return {
    tag: "div",
    attrs: {
      id: "hud-root",
      style: "pointer-events: none;",
    },
    children,
  };
}

// ========== PLAYER HUD CARD ==========
function playerHudCard(p = {}, index = 0, localPlayerId = null) {
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

function playerColorToCss(index) {
  const idx = typeof index === "number" ? index % PLAYER_COLORS.length : 0;
  const entry = PLAYER_COLORS[idx] || PLAYER_COLORS[0];
  return entry && entry.hex ? entry.hex : "#ffffff";
}
