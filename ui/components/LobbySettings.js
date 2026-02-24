// ui/components/LobbySettings.js
// Game mode settings panel — only visible to the lobby owner
import { GAME_MODES, GAME_MODE_INFO } from "../helpers/constants.js";

/**
 * @param {Object}  props
 * @param {string}  props.gameMode   – current mode ("ffa" | "team")
 * @param {boolean} props.isOwner    – whether the local player is the lobby owner
 */
export function LobbySettings({ gameMode = GAME_MODES.FFA, isOwner = false }) {
  const modes = [GAME_MODES.FFA, GAME_MODES.TEAM];

  // Non-owner: just show current mode indicator
  if (!isOwner) {
    const info = GAME_MODE_INFO[gameMode] || GAME_MODE_INFO.ffa;
    return {
      tag: "div",
      attrs: {
        class: "lobby-settings",
        style: `
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 10px;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.08);
        `,
      },
      children: [
        {
          tag: "span",
          attrs: { style: "font-size:14px;" },
          children: [info.icon],
        },
        {
          tag: "span",
          attrs: {
            style: `
              font-family: 'Press Start 2P', monospace;
              font-size: 10px;
              color: #9fead0;
              letter-spacing: 1px;
            `,
          },
          children: [info.name],
        },
      ],
    };
  }

  // Owner: show settings button / mode toggle
  return {
    tag: "div",
    attrs: {
      class: "lobby-settings",
      style: `
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 6px 12px;
        border-radius: 10px;
        background: rgba(0,0,0,0.25);
        border: 1px solid rgba(69,255,192,0.2);
      `,
    },
    children: [
      {
        tag: "span",
        attrs: {
          style: `
            font-family: 'Press Start 2P', monospace;
            font-size: 8px;
            color: rgba(69,255,192,0.6);
            letter-spacing: 1px;
          `,
        },
        children: ["⚙ MODE :"],
      },
      ...modes.map((mode) => {
        const info = GAME_MODE_INFO[mode];
        const isSelected = gameMode === mode;
        const bgColor = isSelected
          ? "rgba(69,255,192,0.15)"
          : "rgba(0,0,0,0.2)";
        const borderColor = isSelected
          ? "rgba(69,255,192,0.6)"
          : "rgba(255,255,255,0.08)";
        const textColor = isSelected ? "#45ffc0" : "#888";

        return {
          tag: "button",
          attrs: {
            "data-gamemode": mode,
            style: `
              font-family: 'Press Start 2P', monospace;
              font-size: 9px;
              padding: 5px 12px;
              border-radius: 8px;
              border: 2px solid ${borderColor};
              background: ${bgColor};
              color: ${textColor};
              cursor: pointer;
              transition: all 0.2s ease;
              min-width: 60px;
              text-align: center;
              ${isSelected ? "box-shadow: 0 0 8px rgba(69,255,192,0.3);" : ""}
            `,
          },
          events: { click: "handleGameModeChange" },
          children: [`${info.icon} ${info.short}`],
        };
      }),
    ],
  };
}
