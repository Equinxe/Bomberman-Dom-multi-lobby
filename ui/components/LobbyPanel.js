import { PlayerCard } from "./PlayerCard.js";
import { LobbySettings } from "./LobbySettings.js";
import { TEAMS, GAME_MODES } from "../helpers/constants.js";

// Small ProgressBar helper
export function ProgressBar({ percent }) {
  return {
    tag: "div",
    attrs: {
      style: `
        width: 100%;
        height: 11px;
        border-radius: 6px;
        background: #143a2c;
        box-shadow: 0 0 0 1px #45ffc044 inset;
        margin-top: 10px;
        margin-bottom: 4px;
        overflow: hidden;
      `,
    },
    children: [
      {
        tag: "div",
        attrs: {
          style: `
            width: ${percent}%;
            height: 100%;
            border-radius: 6px;
            background: linear-gradient(90deg,#ffe854 0%,#45ffc0 100%);
            transition: width 0.5s cubic-bezier(.68,-0.55,.27,1.55);
          `,
        },
      },
    ],
  };
}

export function LobbyPanel({
  code,
  players,
  waiting,
  progressPercent,
  myNickname,
  gameMode,
  owner,
}) {
  const defaultColors = [0, 1, 2, 3, 4, 5];
  const fullPlayers = [...players];
  while (fullPlayers.length < 4)
    fullPlayers.push({
      pseudo: "",
      color: defaultColors[fullPlayers.length],
      ready: false,
      empty: true,
    });
  const myIndex = players.findIndex((p) => p.pseudo === myNickname);
  const myPlayer = myIndex >= 0 ? players[myIndex] : null;
  const isOwner = !!(myPlayer && owner && myPlayer.id === owner);

  const takenColors = players
    .map((p) => (typeof p.color === "number" ? p.color : -1))
    .filter((c) => c >= 0);

  const isTeamMode = gameMode === GAME_MODES.TEAM;

  // Compute team counts for team badges
  const teamCounts = {};
  if (isTeamMode) {
    players.forEach((p) => {
      const t = p.team || 0;
      teamCounts[t] = (teamCounts[t] || 0) + 1;
    });
  }

  return {
    tag: "div",
    attrs: {
      style: `
        background: linear-gradient(160deg, rgba(16,30,20,0.97) 0%, rgba(22,40,28,0.95) 60%, rgba(38,80,55,0.12) 100%);
        border-radius: 28px;
        box-shadow: 0 8px 40px 0 rgba(52,255,204,0.12), 0 0 0 1px rgba(59,230,170,0.2) inset;
        border: 3px solid rgba(59,230,170,0.5);
        padding: 28px 32px 20px 32px;
        min-width: 680px;
        max-width: 780px;
        width: 780px;
        min-height: 0;
        max-height: 92vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        justify-content: flex-start;
        position: relative;
        overflow-y: auto;
        overflow-x: hidden;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      `,
    },
    children: [
      // Title row
      {
        tag: "div",
        attrs: {
          style:
            "font-size:22px;color:#45ffc0;letter-spacing:3px;text-align:center;text-shadow:0 0 20px rgba(69,255,192,0.25);",
        },
        children: [`Joueurs (${players.length}/4)`],
      },
      // Game mode settings (owner can change, others see current mode)
      LobbySettings({ gameMode, isOwner }),
      // Lobby code row
      {
        tag: "div",
        attrs: {
          style: `
            font-size:16px;
            color:#9fead0;
            text-align:center;
            margin-bottom:8px;
            display: flex;
            align-items: center;
            gap: 10px;
            justify-content:center;
          `,
        },
        children: [
          "Code : ",
          {
            tag: "span",
            attrs: {
              id: "lobby-code-value",
              style:
                "font-weight:bold;color:#fff;font-size:22px;letter-spacing:5px;background:rgba(69,255,192,0.07);padding:4px 16px;border-radius:10px;border:1px solid rgba(69,255,192,0.15);",
            },
            children: [code],
          },
          {
            tag: "button",
            attrs: {
              id: "copy-lobby-btn",
              type: "button",
              class: "lobby-copy-btn",
              style: `          
                margin-left:2px;
                padding: 4px 14px;
                font-size:12px;
                border-radius: 8px;
                background: linear-gradient(135deg, #45ffc0, #2a9d6e);
                color: #1a2e22;
                border: none;
                cursor: pointer;
                font-family:'Press Start 2P', monospace;
                transition: transform 0.15s ease, box-shadow 0.2s ease;
                box-shadow: 0 2px 8px rgba(69,255,192,0.25);
                display:flex;
                align-items:center;
              `,
            },
            events: { click: "handleCopyLobbyCode" },
            children: ["Copier"],
          },
        ],
      },
      waiting ? ProgressBar({ percent: progressPercent }) : null,
      // Player grid
      {
        tag: "div",
        attrs: {
          style: `
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 16px 28px;
            width: 100%;
            justify-items: center;
            align-items: start;
            flex: 1;
            min-height: 0;
            margin-bottom: 4px;
          `,
        },
        children: [0, 1, 2, 3].map((i) => {
          const isMe = !fullPlayers[i].empty && i === myIndex;
          return PlayerCard({
            player: fullPlayers[i],
            index: i,
            isMe,
            myIndex,
            takenColors,
            nickname: myNickname,
            gameMode,
            teamCounts,
          });
        }),
      },
    ].filter(Boolean),
  };
}
