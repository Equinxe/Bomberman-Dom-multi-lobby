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

  // ========== BOTTOM HUD BAR ==========
  children.push({
    tag: "div",
    attrs: {
      id: "hud-bottom",
      style: `
        position: fixed;
        bottom: 0; left: 0; right: 0;
        height: 36px;
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
          // Left: Score
          {
            tag: "span",
            children: [`SC ${score}`],
          },
          // Center: End timer (elapsed) or game state
          {
            tag: "span",
            attrs: {
              style: `color: ${endTimer != null ? "#ffaa33" : "#556"};`,
            },
            children: [endTimer != null ? `ELAPSED ${fmt(endTimer)}` : ""],
          },
          // Right: FPS + HI
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
  if (gameWinner) {
    const isLocalWinner = gameWinner.id === localPlayerId;
    children.push({
      tag: "div",
      attrs: {
        id: "game-over-overlay",
        style: `
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 11000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.65);
          pointer-events: none;
          font-family: 'Press Start 2P', monospace;
        `,
      },
      children: [
        {
          tag: "div",
          attrs: {
            style: `
              text-align: center;
              padding: 32px 48px;
              border-radius: 16px;
              background: linear-gradient(135deg, rgba(16,32,24,0.95) 0%, rgba(32,48,36,0.95) 100%);
              border: 3px solid ${isLocalWinner ? "#3be6aa" : "#ff5555"};
              box-shadow: 0 0 40px ${isLocalWinner ? "rgba(59,230,170,0.5)" : "rgba(255,85,85,0.4)"};
            `,
          },
          children: [
            {
              tag: "div",
              attrs: {
                style: `font-size: 24px; color: ${isLocalWinner ? "#3be6aa" : "#ff5555"}; margin-bottom: 12px; text-shadow: 0 0 20px ${isLocalWinner ? "#3be6aa88" : "#ff555588"};`,
              },
              children: [isLocalWinner ? "🏆 VICTORY! 🏆" : "GAME OVER"],
            },
            {
              tag: "div",
              attrs: {
                style: "font-size: 14px; color: #cfeedd;",
              },
              children: [
                gameWinner.pseudo
                  ? `${gameWinner.pseudo} wins!`
                  : "Draw — no winner!",
              ],
            },
          ],
        },
      ],
    });
  }

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

  // Hearts display (max 5)
  const hearts = [];
  for (let i = 0; i < 3; i++) {
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
              style: `font-size: 7px; color: ${isDead ? "#666" : "#cfeedd"}; letter-spacing: 1px; white-space: nowrap; ${isDead ? "text-decoration: line-through;" : ""}`,
            },
            children: [initials],
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
  const palette = [
    "#ffffff",
    "#222222",
    "#ff4b4b",
    "#4b8bff",
    "#58ff7a",
    "#ffd24b",
    "#ff9cff",
  ];
  return palette[(index || 0) % palette.length];
}
