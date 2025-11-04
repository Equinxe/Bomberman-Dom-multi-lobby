export * from "../LobbyPanel.js";

import { PlayerCard } from "./PlayerCard.js";

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

  const takenColors = players
    .map((p) => (typeof p.color === "number" ? p.color : -1))
    .filter((c) => c >= 0);

  return {
    tag: "div",
    attrs: {
      style: `
        background: linear-gradient(135deg,rgba(22,34,20,0.98) 80%,rgba(48,255,180,0.13) 100%);
        border-radius: 32px;
        box-shadow: 0 8px 32px 0 #34ffcc44, 0 0 0 8px #3be6aa55 inset;
        border: 5px solid #3be6aa;
        padding: 50px 48px 34px 48px;
        min-width: 760px;
        max-width: 820px;
        width: 820px;
        min-height: 780px;
        max-height: 800px;
        height: 800px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 32px;
        justify-content: center;
        position: relative;
      `,
    },
    children: [
      {
        tag: "div",
        attrs: {
          style:
            "font-size:34px;color:#45ffc0;letter-spacing:2px;text-align:center;margin-bottom:10px;",
        },
        children: [`Joueurs (${players.length}/4)`],
      },
      {
        tag: "div",
        attrs: {
          style: `
            font-size:30px;
            color:#afffd9;
            text-align:center;
            margin-bottom:28px;
            display: flex;
            align-items: center;
            gap: 14px;
            justify-content:center;
          `,
        },
        children: [
          "Code du lobby : ",
          {
            tag: "span",
            attrs: {
              id: "lobby-code-value",
              style:
                "font-weight:bold;color:#fff;font-size:32px;letter-spacing:4px;background:rgba(48,255,180,0.08);padding:2px 16px;border-radius:8px;",
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
                margin-left:4px;
                padding: 3px 12px;
                font-size:17px;
                border-radius: 7px;
                background: #45ffc0;
                color: #222;
                border: none;
                cursor: pointer;
                font-family:'Press Start 2P', monospace;
                transition: background 0.15s;
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
      {
        tag: "div",
        attrs: {
          style: `
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 60px 80px;
            width: 100%;
            justify-items: center;
            align-items: center;
            min-height: 540px;
            max-height: 540px;
            margin-bottom: 10px;
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
          });
        }),
      },
    ].filter(Boolean),
  };
}
