export function ChatPanel({ chat = [], nickname }) {
  return {
    tag: "div",
    attrs: {
      style: `
        background: linear-gradient(160deg, rgba(16,30,20,0.97) 0%, rgba(22,40,28,0.95) 60%, rgba(38,80,55,0.10) 100%);
        border-radius: 28px;
        box-shadow: 0 8px 40px 0 rgba(52,255,204,0.10), 0 0 0 1px rgba(59,230,170,0.18) inset;
        border: 3px solid rgba(59,230,170,0.5);
        width: 360px;
        min-width: 360px;
        max-width: 360px;
        height: 760px;
        min-height: 760px;
        max-height: 760px;
        padding: 32px 22px 16px 22px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        margin-left: 0;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      `,
    },
    children: [
      {
        tag: "div",
        attrs: {
          style:
            "color:#45ffc0;font-size:20px;margin-bottom:4px;font-weight:bold;letter-spacing:2px;text-shadow:0 0 16px rgba(69,255,192,0.2);",
        },
        children: ["💬 Tchat"],
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
            gap: 5px;
            margin-bottom: 6px;
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
              font-size:13px;
              line-height: 1.5;
              color: ${
                msg.system
                  ? "#f9e56e"
                  : msg.author === nickname
                    ? "#45ffc0"
                    : "#b8f0d8"
              };
              font-weight: ${msg.system ? "bold" : "normal"};
              background: ${msg.system ? "rgba(240,212,80,0.06)" : "none"};
              border-radius: 6px;
              padding: ${msg.system ? "4px 10px" : "1px 0"};
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
              id: "chat-draft",
              name: "message",
              type: "text",
              placeholder: "Votre message...",
              autocomplete: "off",
              style: `
                width: 100%;
                padding: 8px 10px;
                font-size: 13px;
                border-radius: 10px;
                border: 2px solid rgba(69,255,192,0.4);
                background: rgba(20,40,24,0.9);
                color: #d2ffe6;
                font-family: 'Press Start 2P', monospace;
                transition: border-color 0.2s ease;
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
                padding: 7px 20px;
                font-size: 12px;
                background: linear-gradient(135deg, #45ffc0, #2a9d6e);
                color: #1a2e22;
                border-radius: 10px;
                border: none;
                cursor: pointer;
                font-family: 'Press Start 2P', monospace;
                box-shadow: 0 2px 8px rgba(69,255,192,0.25);
                transition: transform 0.15s ease, box-shadow 0.2s ease;
                letter-spacing: 1px;
              `,
            },
            children: ["Envoyer"],
          },
        ],
      },
    ],
  };
}
