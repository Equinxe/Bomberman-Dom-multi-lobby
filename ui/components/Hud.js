export function HUD({
  score = 0,
  countdown = null, // seconds remaining (600..0) or null
  highscore = null,
  endTimer = null, // seconds elapsed since level end or null
  players = [], // [{ pseudo, color, lives }]
  fps = 60,
}) {
  const fmt = (s) => {
    if (typeof s !== "number") return "00:00";
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(Math.floor(s % 60)).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  // top row: SC | main timer | HI
  // bottom row: endTimer | players lives
  return {
    tag: "div",
    attrs: {
      id: "hud-root",
      style: `
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        top: 8px;
        z-index: 10000;
        width: min(920px, calc(100% - 80px));
        box-sizing: border-box;
        pointer-events: none;
        font-family: 'Press Start 2P', monospace;
      `,
    },
    children: [
      // top row
      {
        tag: "div",
        attrs: {
          style:
            "display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;",
        },
        children: [
          // SC box (left)
          {
            tag: "div",
            attrs: {
              style: `
                min-width: 84px;
                padding:6px 10px;
                border-radius:6px;
                background: rgba(0,0,0,0.55);
                color: #cfeedd;
                text-align:center;
                box-sizing:border-box;
              `,
            },
            children: [{ tag: "span", children: [`SC: ${score}`] }],
          },

          // main timer (center)
          {
            tag: "div",
            attrs: {
              style: `
                min-width: 140px;
                padding:6px 12px;
                border-radius:8px;
                background: rgba(0,0,0,0.6);
                color:#fff;
                text-align:center;
                font-size:18px;
                box-sizing:border-box;
              `,
            },
            children: [{ tag: "span", children: [fmt(countdown)] }],
          },

          // right: HI + fps (compact)
          {
            tag: "div",
            attrs: { style: "display:flex;gap:8px;align-items:center;" },
            children: [
              {
                tag: "div",
                attrs: {
                  style: `
                    min-width: 68px;
                    padding:6px 10px;
                    border-radius:6px;
                    background: rgba(0,0,0,0.55);
                    color:#cfeedd;
                    text-align:center;
                    box-sizing:border-box;
                  `,
                },
                children: [
                  {
                    tag: "span",
                    children: [`HI: ${highscore == null ? "--" : highscore}`],
                  },
                ],
              },
              {
                tag: "div",
                attrs: {
                  style: `
                    min-width: 64px;
                    padding:6px 8px;
                    border-radius:6px;
                    background: rgba(0,0,0,0.45);
                    color:#cfeedd;
                    text-align:center;
                    box-sizing:border-box;
                  `,
                },
                children: [
                  { tag: "span", children: [`FPS: ${Math.round(fps)}`] },
                ],
              },
            ],
          },
        ],
      },

      // bottom row
      {
        tag: "div",
        attrs: {
          style:
            "display:flex;align-items:center;justify-content:space-between;gap:12px;",
        },
        children: [
          // left: endTimer (ascending)
          {
            tag: "div",
            attrs: {
              style: `
                min-width: 100px;
                padding:6px 8px;
                border-radius:6px;
                background: rgba(0,0,0,0.45);
                color:#cfeedd;
                text-align:center;
                box-sizing:border-box;
              `,
            },
            children: [
              {
                tag: "span",
                children: [`${endTimer != null ? fmt(endTimer) : "00:00"}`],
              },
            ],
          },

          // right: players row
          {
            tag: "div",
            attrs: {
              style:
                "display:flex;gap:12px;align-items:center;justify-content:flex-end;flex:1;",
            },
            children: players.map((p, i) => playerSmall(p, i + 1)),
          },
        ],
      },
    ],
  };
}

function playerSmall(p = {}, index = 1) {
  const color = playerColorToCss(p.color);
  const lives =
    typeof p.lives === "number" ? p.lives : defaultLivesFor(index, p);
  const initials = (p.pseudo || `J${index}`).slice(0, 2).toUpperCase();
  return {
    tag: "div",
    attrs: {
      style: "display:flex;align-items:center;gap:6px;pointer-events:none;",
    },
    children: [
      // small avatar box
      {
        tag: "div",
        attrs: {
          style: `
            width:36px;height:36px;border-radius:6px;
            background:${color};
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 2px 6px rgba(0,0,0,0.35);
            font-size:12px;color:#022;
          `,
        },
        children: [{ tag: "span", children: [initials] }],
      },
      // lives small box
      {
        tag: "div",
        attrs: {
          style: `
            min-width:46px;height:28px;border-radius:6px;
            background: rgba(0,0,0,0.45);
            display:flex;align-items:center;justify-content:center;
            color:#cfeedd;font-size:12px;
          `,
        },
        children: [{ tag: "span", children: [`${lives} ♥`] }],
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

// default lives rule per your request: J1..J3 => 3 lives, J4 => 4 lives (if present)
function defaultLivesFor(index, p) {
  if (index === 4) return 4;
  return 3;
}
