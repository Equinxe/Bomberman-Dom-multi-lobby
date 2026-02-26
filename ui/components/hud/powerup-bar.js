// ui/components/hud/powerup-bar.js
// Builds the bottom HUD bar showing power-up stats, score, and FPS.

/** Skull effect display names */
const SKULL_NAMES = {
  slow: "SLOW",
  fast: "FAST",
  constipation: "NO BOMB",
  diarrhea: "AUTO💣",
  invisible: "INVIS",
  minRange: "MIN",
};

/**
 * Build the array of power-up icon descriptors for the local player.
 */
export function buildPowerUpIcons(localPlayer = {}) {
  const pMaxBombs = localPlayer.maxBombs || 1;
  const pBombRange = localPlayer.bombRange || 3;
  const pSpeed = localPlayer.speed || 4;
  const pWallpass = !!localPlayer.wallpass;
  const pDetonator = !!localPlayer.detonator;
  const pVestActive = !!localPlayer.vestActive;
  const pSkullEffect = localPlayer.skullEffect || null;

  return [
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
            value: SKULL_NAMES[pSkullEffect] || pSkullEffect,
            label: "CURSE",
            highlight: true,
            isBool: true,
            color: "#ff4444",
          },
        ]
      : []),
  ];
}

/**
 * Build a single power-up icon virtual-DOM node.
 */
function powerUpIcon(pu) {
  const highlightColor = pu.color || (pu.highlight ? "#3be6aa" : null);
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
          style: "display:flex; flex-direction:column; gap:0; line-height:1;",
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
}

/**
 * Build the bottom HUD bar virtual-DOM node.
 */
export function bottomHudBar({
  powerUpIcons,
  score = 0,
  highscore = null,
  fps = 60,
}) {
  return {
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
            children: powerUpIcons.map((pu) => powerUpIcon(pu)),
          },
          // Center: Score
          {
            tag: "span",
            children: [`SC ${score}`],
          },
          // Right: FPS + highscore
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
  };
}
