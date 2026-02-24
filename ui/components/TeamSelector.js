// ui/components/TeamSelector.js
// Team selection buttons for the lobby (2v2 mode)
// In 2v2 mode the "FFA" option is hidden — players pick Alpha or Beta only.
// Clicking the already-selected team unselects it (sends TEAMS.NONE).
import { TEAMS, TEAM_INFO, TEAM_MAX_PLAYERS } from "../helpers/constants.js";

/**
 * @param {Object}   props
 * @param {number}   props.selectedTeam  – current player's team (0 | 1 | 2)
 * @param {Object}   props.teamCounts    – { 1: n, 2: n } how many players are on each team
 * @param {boolean}  [props.disabled]    – whether to disable selection
 */
export function TeamSelector({
  selectedTeam = 0,
  teamCounts = {},
  disabled = false,
}) {
  // In 2v2 mode we only show Alpha and Beta (no FFA button)
  const teams = [TEAMS.ALPHA, TEAMS.BETA];

  return {
    tag: "div",
    attrs: {
      class: "team-selector",
      style: `
        display: flex;
        gap: 6px;
        justify-content: center;
        align-items: center;
        padding: 4px 0;
      `,
    },
    children: teams.map((teamId) => {
      const info = TEAM_INFO[teamId];
      const isSelected = selectedTeam === teamId;
      const count = teamCounts[teamId] || 0;

      // A team is "full" only when it has max players AND the current player
      // is NOT on that team. Players can always click their own team to leave.
      const isFull = count >= TEAM_MAX_PLAYERS && !isSelected;

      const bgColor = isSelected
        ? `${info.color}44`
        : isFull
          ? "rgba(80,80,80,0.3)"
          : "rgba(0,0,0,0.25)";
      const borderColor = isSelected
        ? info.color
        : isFull
          ? "rgba(80,80,80,0.4)"
          : "rgba(255,255,255,0.12)";
      const textColor = isSelected ? info.color : isFull ? "#555" : "#aaa";
      const cursor = disabled || isFull ? "not-allowed" : "pointer";
      const opacity = disabled ? "0.5" : isFull && !isSelected ? "0.5" : "1";

      return {
        tag: "button",
        attrs: {
          // When the player clicks their own team, main.js will receive the
          // same teamId they already have — we handle toggle there.
          "data-team": String(teamId),
          style: `
            font-family: 'Press Start 2P', monospace;
            font-size: 9px;
            padding: 5px 10px;
            border-radius: 8px;
            border: 2px solid ${borderColor};
            background: ${bgColor};
            color: ${textColor};
            cursor: ${cursor};
            opacity: ${opacity};
            transition: all 0.2s ease;
            min-width: 58px;
            text-align: center;
            ${isSelected ? `box-shadow: 0 0 8px ${info.glow};` : ""}
          `,
          disabled: disabled || isFull ? "true" : undefined,
        },
        events: { click: "handleTeamSelect" },
        children: [`${info.label} ${count}/${TEAM_MAX_PLAYERS}`],
      };
    }),
  };
}
