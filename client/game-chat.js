// client/game-chat.js

/**
 * Create a chat manager for the in-game chat.
 */
export function createChatManager(socket) {
  function sendGameChat(text) {
    const trimmed = (text || "").trim().slice(0, 120);
    if (!trimmed) return;
    try {
      socket &&
        typeof socket.send === "function" &&
        socket.send("gameChat", { text: trimmed });
    } catch (e) {
      // ignore
    }
  }

  function handleGameChatSubmit(ev) {
    ev.preventDefault();
    const input = document.getElementById("game-chat-input");
    if (!input) return;
    sendGameChat(input.value);
    input.value = "";
    input.blur();
  }

  return { sendGameChat, handleGameChatSubmit };
}
