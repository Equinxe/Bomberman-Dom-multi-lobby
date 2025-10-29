// ui/ChatPanel.js
// Small right-side chat panel extracted from lobby.js
export function ChatPanel({ chat = [], nickname }) {
  return {
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
        height: 760px;
        min-height: 760px;
        max-height: 760px;
        padding: 38px 24px 18px 24px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 14px;
        margin-left: 0;
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
            height: 550px;
            min-height: 550px;
            max-height: 550px;
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
    ],
  };
}
