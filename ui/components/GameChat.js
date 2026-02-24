// ui/components/GameChat.js
// Compact in-game chat overlay — available to alive and dead (spectator) players.
// Dead players get a "👻 Spectateur" badge next to their name.

export function GameChat({ messages = [], nickname = "", isSpectator = false }) {
  const maxMessages = 30;
  const visibleMessages = messages.slice(-maxMessages);

  return {
    tag: "div",
    attrs: {
      id: "game-chat-root",
      style: `
        position: fixed;
        bottom: 48px;
        right: 12px;
        width: 280px;
        max-height: 320px;
        z-index: 10050;
        display: flex;
        flex-direction: column;
        pointer-events: auto;
        font-family: 'Press Start 2P', monospace;
      `,
    },
    children: [
      // Header
      {
        tag: "div",
        attrs: {
          style: `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 4px 10px;
            background: rgba(16,16,32,0.92);
            border: 1px solid rgba(59,230,170,0.4);
            border-bottom: none;
            border-radius: 8px 8px 0 0;
            font-size: 8px;
            color: #8fc;
            letter-spacing: 1px;
          `,
        },
        children: [
          { tag: "span", children: ["💬 CHAT"] },
          isSpectator
            ? {
                tag: "span",
                attrs: {
                  style:
                    "color:#ff9944; font-size:7px; background:rgba(255,153,68,0.15); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,153,68,0.4);",
                },
                children: ["👻 SPECTATEUR"],
              }
            : { tag: "span", children: [""] },
        ],
      },

      // Messages list
      {
        tag: "div",
        attrs: {
          "data-game-chat-list": "true",
          style: `
            flex: 1;
            max-height: 220px;
            min-height: 80px;
            overflow-y: auto;
            background: rgba(8,12,16,0.85);
            border-left: 1px solid rgba(59,230,170,0.3);
            border-right: 1px solid rgba(59,230,170,0.3);
            padding: 6px 8px;
            display: flex;
            flex-direction: column;
            gap: 3px;
            scrollbar-width: thin;
            scrollbar-color: #45ffc0 transparent;
          `,
        },
        children:
          visibleMessages.length === 0
            ? [
                {
                  tag: "div",
                  attrs: {
                    style:
                      "font-size:7px; color:#445; text-align:center; padding:12px 0;",
                  },
                  children: ["Appuyez sur Entrée pour écrire..."],
                },
              ]
            : visibleMessages.map((msg) => {
                const isSystem = !!msg.system;
                const isOwn = !isSystem && msg.author === nickname;
                const isGhost = !!msg.spectator;
                const authorColor = isGhost
                  ? "#ff9944"
                  : isOwn
                    ? "#45ffc0"
                    : "#b8f0d8";
                const prefix = isGhost ? "👻 " : "";

                return {
                  tag: "div",
                  attrs: {
                    style: `
                    font-size: 7px;
                    line-height: 1.5;
                    color: ${isSystem ? "#f9e56e" : authorColor};
                    ${isSystem ? "font-style:italic;" : ""}
                    word-break: break-word;
                  `,
                  },
                  children: [
                    isSystem
                      ? msg.text
                      : `${prefix}${msg.author}: ${msg.text}`,
                  ],
                };
              }),
      },

      // Input form
      {
        tag: "form",
        attrs: {
          id: "game-chat-form",
          style: `
            display: flex;
            gap: 0;
            border-radius: 0 0 8px 8px;
            overflow: hidden;
            border: 1px solid rgba(59,230,170,0.4);
            border-top: none;
          `,
        },
        events: { submit: "handleGameChatSend" },
        children: [
          {
            tag: "input",
            attrs: {
              id: "game-chat-input",
              name: "gameMessage",
              type: "text",
              placeholder: isSpectator ? "👻 Message..." : "Message...",
              autocomplete: "off",
              maxlength: "120",
              style: `
                flex: 1;
                padding: 6px 8px;
                font-size: 8px;
                border: none;
                background: rgba(16,24,20,0.95);
                color: #d2ffe6;
                font-family: 'Press Start 2P', monospace;
                outline: none;
              `,
            },
          },
          {
            tag: "button",
            attrs: {
              type: "submit",
              style: `
                padding: 6px 10px;
                font-size: 8px;
                background: linear-gradient(135deg, #45ffc0, #2a9d6e);
                color: #1a2e22;
                border: none;
                cursor: pointer;
                font-family: 'Press Start 2P', monospace;
                letter-spacing: 0.5px;
              `,
            },
            children: ["➤"],
          },
        ],
      },
    ],
  };
}
