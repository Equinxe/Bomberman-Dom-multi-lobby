// client/input-manager.js

/**
 * Create an input manager that sends player input to the server.
 * @returns {{ attach, detach }}
 */
export function createInputManager({
  sendInputToServer,
  getLocalPlayer,
  inputState,
  onChatFocus,
}) {
  const isBrowser =
    typeof window !== "undefined" && typeof document !== "undefined";

  function isTypingInFormElement(target) {
    if (!target) return false;
    const tag = (target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (target.isContentEditable) return true;
    if (
      target.closest &&
      target.closest("input,textarea,select,[contenteditable='true']")
    )
      return true;
    return false;
  }

  function handleKeyDown(ev) {
    if (isTypingInFormElement(ev.target)) return;

    const key = (ev.key || "").toLowerCase();

    // Enter opens in-game chat (works for alive AND dead players)
    if (key === "enter") {
      const chatInput = document.getElementById("game-chat-input");
      if (chatInput) {
        ev.preventDefault();
        chatInput.focus();
        if (onChatFocus) onChatFocus();
      }
      return;
    }

    // Block movement/action if local player is dead
    const localPlayer = getLocalPlayer();
    if (localPlayer && localPlayer.dead) return;

    let changed = false;
    if (key === "arrowleft" || key === "a" || key === "q") {
      if (!inputState.left) changed = true;
      inputState.left = true;
      sendInputToServer({ type: "move", dir: "left", active: true });
    } else if (key === "arrowright" || key === "d") {
      if (!inputState.right) changed = true;
      inputState.right = true;
      sendInputToServer({ type: "move", dir: "right", active: true });
    } else if (key === "arrowup" || key === "w" || key === "z") {
      if (!inputState.up) changed = true;
      inputState.up = true;
      sendInputToServer({ type: "move", dir: "up", active: true });
    } else if (key === "arrowdown" || key === "s") {
      if (!inputState.down) changed = true;
      inputState.down = true;
      sendInputToServer({ type: "move", dir: "down", active: true });
    } else if (key === " " || key === "x") {
      sendInputToServer({ type: "action", action: "placeBomb" });
    } else if (key === "e" || key === "r") {
      sendInputToServer({ type: "action", action: "detonate" });
    }
    if (changed) ev.preventDefault();
  }

  function handleKeyUp(ev) {
    if (isTypingInFormElement(ev.target)) return;

    const key = (ev.key || "").toLowerCase();
    if (key === "arrowleft" || key === "a" || key === "q") {
      inputState.left = false;
      sendInputToServer({ type: "move", dir: "left", active: false });
    } else if (key === "arrowright" || key === "d") {
      inputState.right = false;
      sendInputToServer({ type: "move", dir: "right", active: false });
    } else if (key === "arrowup" || key === "w" || key === "z") {
      inputState.up = false;
      sendInputToServer({ type: "move", dir: "up", active: false });
    } else if (key === "arrowdown" || key === "s") {
      inputState.down = false;
      sendInputToServer({ type: "move", dir: "down", active: false });
    }
  }

  return {
    attach() {
      if (!isBrowser) return;
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
    },
    detach() {
      if (!isBrowser) return;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    },
  };
}
