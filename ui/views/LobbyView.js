// ui/lobby.js
// Simplified lobby entrypoint that composes LobbyPanel + ChatPanel
import { registerEvent } from "../Core/events.js";
import { LobbyPanel } from "./LobbyPanel.js";
import { ChatPanel } from "./ChatPanel.js";

export function Lobby(props) {
  const {
    code,
    nickname,
    players = [],
    chat = [],
    waiting = false,
    queue = [],
    queuePosition = 0,
  } = props;
  // progressPercent: keep previous random logic to avoid behavioral change
  const progressPercent = waiting
    ? Math.min(100, Math.round(Math.random() * 70 + 30))
    : 0;

  // copy handler (kept, register once)
  function handleCopyLobbyCode() {
    const codeElem = document.getElementById("lobby-code-value");
    const btn = document.getElementById("copy-lobby-btn");
    if (!codeElem || !btn) return;
    const codeText = codeElem.textContent.trim();
    navigator.clipboard.writeText(codeText);
    btn.classList.add("copied");
    btn.textContent = "Copié !";
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.textContent = "Copier";
    }, 1100);
  }
  registerEvent("handleCopyLobbyCode", handleCopyLobbyCode);

  return {
    tag: "div",
    attrs: {
      style: `
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        gap: 88px;
        width: 100vw;
        min-height: 100vh;
        font-family: 'Press Start 2P', monospace;
        box-sizing: border-box;
        position: relative;
      `,
    },
    children: [
      LobbyPanel({
        code,
        players,
        waiting,
        progressPercent,
        myNickname: nickname,
      }),
      ChatPanel({ chat, nickname }),
    ].filter(Boolean),
  };
}
