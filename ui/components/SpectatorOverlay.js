// ui/components/SpectatorOverlay.js
// Persistent overlay shown to dead players — "You died" banner with spectator status.
// Rendered as a DOM overlay on top of the game view.

export function SpectatorOverlay({ pseudo = "", killedBy = null }) {
  return {
    tag: "div",
    attrs: {
      id: "spectator-overlay",
      style: `
        position: fixed;
        top: 64px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10040;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        pointer-events: none;
        font-family: 'Press Start 2P', monospace;
        animation: spectator-fade-in 0.6s ease-out;
      `,
    },
    children: [
      // Main banner
      {
        tag: "div",
        attrs: {
          style: `
            background: linear-gradient(135deg, rgba(80,20,20,0.92) 0%, rgba(40,10,10,0.92) 100%);
            border: 2px solid rgba(255,80,80,0.6);
            border-radius: 12px;
            padding: 10px 24px;
            text-align: center;
            box-shadow: 0 4px 24px rgba(255,60,60,0.3), 0 0 40px rgba(0,0,0,0.5);
          `,
        },
        children: [
          {
            tag: "div",
            attrs: {
              style: `font-size: 14px; color: #ff6b6b; margin-bottom: 4px; text-shadow: 0 0 12px rgba(255,100,100,0.6);`,
            },
            children: ["☠ ÉLIMINÉ"],
          },
          {
            tag: "div",
            attrs: {
              style: `font-size: 8px; color: #ffaa88;`,
            },
            children: [
              killedBy
                ? `Tué par ${killedBy}`
                : "Vous pouvez regarder et discuter !",
            ],
          },
        ],
      },

      // Spectator badge
      {
        tag: "div",
        attrs: {
          style: `
            background: rgba(255,153,68,0.15);
            border: 1px solid rgba(255,153,68,0.5);
            border-radius: 8px;
            padding: 4px 14px;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 8px;
            color: #ff9944;
            letter-spacing: 1px;
          `,
        },
        children: [
          {
            tag: "span",
            attrs: { style: "font-size:12px;" },
            children: ["👻"],
          },
          { tag: "span", children: ["MODE SPECTATEUR"] },
        ],
      },

      // Help text
      {
        tag: "div",
        attrs: {
          style: `font-size: 6px; color: #666; margin-top: 2px;`,
        },
        children: ["Entrée = ouvrir le chat"],
      },
    ],
  };
}
