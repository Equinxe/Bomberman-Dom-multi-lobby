import { registerEvent } from "../Core/events.js";
export function Chat({ messages, onSend }) {
  registerEvent("handleSendMessage", onSend);
  return {
    tag: "div",
    attrs: {
      style: `
        background:rgba(22,34,20,0.98);
        border-radius:16px;box-shadow:0 2px 8px #45ffc088 inset;
        padding:18px 12px;min-height:180px;max-height:220px;overflow-y:auto;
        margin-bottom:16px;display:flex;flex-direction:column;gap:8px;
      `,
    },
    children: [
      ...messages.slice(-16).map((msg) => ({
        tag: "div",
        attrs: {
          style: "color:#afffd9;font-size:15px;font-family:'Inter',monospace;",
        },
        children: [`${msg.author}: ${msg.text}`],
      })),
      {
        tag: "form",
        attrs: { style: "display:flex;gap:6px;margin-top:12px;" },
        events: { submit: "handleSendMessage" },
        children: [
          {
            tag: "input",
            attrs: {
              name: "message",
              type: "text",
              placeholder: "Votre message...",
              style: `
                flex:1;padding:8px 11px;border-radius:8px;border:2px solid #45ffc0;
                background:#183216;color:#afffd9;font-size:16px;font-family:monospace;
                outline:none;box-shadow:0 1px 4px #45ffc044 inset;
              `,
            },
          },
          {
            tag: "button",
            attrs: {
              type: "submit",
              style: `
                padding:0 14px;font-size:16px;background:#45ffc0;color:#183216;
                border:none;border-radius:8px;cursor:pointer;font-weight:bold;
                font-family:'Press Start 2P',monospace;
                box-shadow:0 1px 6px #45ffc088;
              `,
            },
            children: ["Envoyer"],
          },
        ],
      },
    ],
  };
}
