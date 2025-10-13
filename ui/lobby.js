import {
  SPRITE_ROWS,
  SPRITE_SIZE,
  SPRITE_ZOOM,
  SHEET_WIDTH,
  SHEET_HEIGHT,
  PLAYER_COLORS,
} from "./constants.js";

export function Lobby({
  code,
  nickname,
  players,
  chat,
  localColor,
  queue,
  waiting,
  queuePosition,
  onReady,
  onSendMessage,
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
  const myIndex = players.findIndex((p) => p.pseudo === nickname);
  // Liste déroulante couleur (désactivée pour l'instant)
  // const lockedColors = players.filter((p, pi) => pi !== myIndex).map((p) => p.color);

  return {
    tag: "div",
    attrs: {
      style: `
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: flex-start;
        gap: 220px;
        width: 100vw;
        min-height: 100vh;
        padding: 48px 0 0 0;
        font-family: 'Press Start 2P', monospace;
        box-sizing: border-box;
      `,
    },
    children: [
      {
        tag: "div",
        attrs: {
          style: `
            background: linear-gradient(135deg,rgba(22,34,20,0.98) 80%,rgba(48,255,180,0.13) 100%);
            border-radius: 32px;
            box-shadow: 0 8px 32px 0 #34ffcc44, 0 0 0 8px #3be6aa55 inset;
            border: 5px solid #3be6aa;
            padding: 64px 48px 64px 48px;
            min-width: 740px;
            max-width: 740px;
            width: 740px;
            min-height: 760px;
            max-height: 760px;
            height: 760px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 38px;
            justify-content: center;
          `,
        },
        children: [
          {
            tag: "div",
            attrs: {
              style:
                "font-size:34px;color:#45ffc0;letter-spacing:2px;text-align:center;margin-bottom:18px;",
            },
            children: [
              `Code du lobby : ${code}`,
              `Joueurs (${players.length}/4)`,
            ],
          },
          {
            tag: "div",
            attrs: {
              style: `
                display: grid;
                grid-template-columns: 1fr 1fr;
                grid-template-rows: 1fr 1fr;
                gap: 44px 60px;
                width: 100%;
                justify-items: center;
                align-items: center;
                min-height: 540px;
                max-height: 540px;
              `,
            },
            children: [0, 1, 2, 3].map((i) => {
              const isMe = !fullPlayers[i].empty && i === myIndex;
              const colorToUse = fullPlayers[i].color;
              return {
                tag: "div",
                attrs: {
                  style: `
                    background: rgba(48,255,180,0.11);
                    border-radius: 22px;
                    padding: 36px 22px 36px 22px;
                    min-width: 260px;
                    max-width: 320px;
                    min-height: 220px;
                    max-height: 260px;
                    box-shadow: 0 0 12px #45ffc033 inset;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    border: ${
                      fullPlayers[i].empty
                        ? "2px dashed #3be6aa66"
                        : "2px solid #45ffc0"
                    };
                    position: relative;
                  `,
                },
                children: [
                  {
                    tag: "div",
                    attrs: {
                      style: "font-size:22px;color:#45ffc0;margin-bottom:8px;",
                    },
                    children: [`J${i + 1}`],
                  },
                  {
                    tag: "span",
                    attrs: {
                      style: `
                        font-size:25px;
                        color:${fullPlayers[i].ready ? "#45ffc0" : "#afffd9"};
                        font-weight:bold;
                        letter-spacing:1px;
                        margin-bottom:10px;
                      `,
                    },
                    children: [fullPlayers[i].pseudo || "En attente..."],
                  },
                  !fullPlayers[i].empty
                    ? {
                        tag: "div",
                        attrs: {
                          id: `player-sprite-${i}`,
                          style: `
                            width: ${SPRITE_SIZE * SPRITE_ZOOM}px;
                            height: ${SPRITE_SIZE * SPRITE_ZOOM}px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-bottom: 12px;
                            background: url('./assets/images/Players.png');
                            background-repeat: no-repeat;
                            background-position: -4px -${
                              SPRITE_ROWS[colorToUse].row * (SPRITE_SIZE + 1) +
                              SPRITE_ROWS[colorToUse].offsetY
                            }px;
                            background-size: ${SHEET_WIDTH * SPRITE_ZOOM}px ${
                            SHEET_HEIGHT * SPRITE_ZOOM
                          }px;
                            border-radius:12px;
                          `,
                        },
                        children: [],
                      }
                    : null,
                  isMe
                    ? {
                        tag: "button",
                        attrs: {
                          style: `
                            margin-top:18px;
                            padding:18px 44px;
                            font-size:22px;
                            border-radius:12px;
                            background:linear-gradient(90deg,#45ffc0 0%,#267c5c 100%);
                            color:#1d2820;
                            border:none;
                            cursor:pointer;
                            font-family:'Press Start 2P',monospace;
                          `,
                        },
                        events: { click: "handleReady" },
                        children: [
                          fullPlayers[myIndex].ready ? "Annuler prêt" : "Prêt",
                        ],
                      }
                    : null,
                ].filter(Boolean),
              };
            }),
          },
        ].filter(Boolean),
      },
      {
        tag: "div",
        attrs: {
          style: `
            background: linear-gradient(135deg,rgba(22,34,20,0.97) 82%,rgba(48,255,180,0.08) 100%);
            border-radius: 32px;
            box-shadow: 0 8px 32px 0 #34ffcc33, 0 0 0 8px #3be6aa44 inset;
            border: 5px solid #3be6aa;
            width: 360px;
            min-width: 360px;
            max-width: 360px;
            height: 800px;
            min-height: 800px;
            max-height: 800px;
            padding: 38px 24px 18px 24px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
            margin-left: 170px;
          `,
        },
        children: [
          {
            tag: "div",
            attrs: {
              style:
                "color:#45ffc0;font-size:22px;margin-bottom:6px;font-weight:bold;",
            },
            children: ["Tchat"],
          },
          {
            tag: "div",
            attrs: {
              style: `
                flex: 1;
                width: 100%;
                height: 600px;
                min-height: 600px;
                max-height: 600px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 7px;
                padding-right: 6px;
                scrollbar-color: #45ffc0 #163013;
                scrollbar-width: thin;
              `,
              "data-chat-list": "true",
            },
            children: chat.map((msg) => ({
              tag: "div",
              attrs: {
                style: `
                  font-size:14px;
                  color: ${
                    msg.system
                      ? "#f9e56e"
                      : msg.author === nickname
                      ? "#45ffc0"
                      : "#afffd9"
                  };
                  font-weight: ${msg.system ? "bold" : "normal"};
                  background: ${msg.system ? "rgba(240,212,80,0.08)" : "none"};
                  border-radius: 6px;
                  padding: ${msg.system ? "5px 12px" : "0"};
                `,
              },
              children: [
                msg.system
                  ? `[${msg.time}] ${msg.text}`
                  : `[${msg.time}] ${msg.author}: ${msg.text}`,
              ],
            })),
          },
          {
            tag: "form",
            attrs: {
              style: `
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 6px;
                margin-bottom: 0;
                padding-bottom: 4px;
                position: relative;
              `,
            },
            events: { submit: "handleSendMessage" },
            children: [
              {
                tag: "input",
                attrs: {
                  name: "message",
                  type: "text",
                  placeholder: "Votre message...",
                  style: `
                    width: 100%;
                    padding: 6px 8px;
                    font-size: 14px;
                    border-radius: 8px;
                    border: 2px solid #45ffc0;
                    background: rgba(35,54,29,0.97);
                    color: #d2ffe6;
                    font-family: 'Press Start 2P', monospace;
                  `,
                },
              },
              {
                tag: "button",
                attrs: {
                  type: "submit",
                  style: `
                    align-self: flex-end;
                    margin-top: 2px;
                    padding: 6px 18px;
                    font-size: 14px;
                    background: linear-gradient(90deg, #45ffc0 0%, #267c5c 100%);
                    color: #1d2820;
                    border-radius: 8px;
                    border: none;
                    cursor: pointer;
                    font-family: 'Press Start 2P', monospace;
                    box-sizing: border-box;
                  `,
                },
                children: ["Envoyer"],
              },
            ],
          },
        ].filter(Boolean),
      },
    ].filter(Boolean),
  };
}
