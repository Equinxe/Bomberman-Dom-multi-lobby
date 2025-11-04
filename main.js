// main.js - point d'entrée client (branche test-refactor2)
// Ajusté : calcule automatiquement un cellSize plus grand si l'écran le permet.
import { render, createElement } from "../Core/dom.js";
import { Nickname } from "./ui/helpers/nickname.js";
import { Lobby } from "./ui/views/LobbyView.js";
import { WaitingRoom } from "./ui/views/WaitingRoom.js";
import { WSIndicator } from "./ui/components/WsIndicator.js";
import { PopupError } from "./ui/components/Popup.js";
import { setState, getState } from "../Core/state.js";
import { registerEvent, getEventsMap } from "../Core/events.js";
import { socket } from "./multiplayer/socket.js";
import { attachClientGame } from "./client/game-client.js";

window.createElement = createElement;

let lobbyState = { players: [], chat: [], queue: [], code: "" };
const container = document.getElementById("app");
let localColor = 0;
let wsConnected = false;
let playerCount = 1;
let lastErrorPopup = null;

function withPreservedChatDraft(renderFn) {
  try {
    const oldInput =
      document.querySelector('input[name="message"]') ||
      document.getElementById("lobby-chat-input");
    let draft = null;
    let selStart = 0;
    let selEnd = 0;
    let hadFocus = false;
    if (oldInput) {
      draft = oldInput.value;
      try {
        selStart = oldInput.selectionStart;
        selEnd = oldInput.selectionEnd;
      } catch (e) {
        selStart = selEnd = draft.length;
      }
      hadFocus = document.activeElement === oldInput;
    }
    renderFn();
    const newInput =
      document.querySelector('input[name="message"]') ||
      document.getElementById("lobby-chat-input");
    if (newInput && draft !== null) {
      newInput.value = draft;
      try {
        const len = newInput.value.length;
        const s = Math.min(selStart, len);
        const e = Math.min(selEnd, len);
        newInput.setSelectionRange(s, e);
      } catch (e) {}
      if (hadFocus) newInput.focus();
    }
  } catch (err) {
    console.error("withPreservedChatDraft error:", err);
    renderFn();
  }
}

function showNicknameForm() {
  render(Nickname({ onSubmit: handleSubmit }), container, getEventsMap());
  showWSIndicator();
}

function showWSIndicator() {
  const app = document.getElementById("app");
  if (!app) return;
  const oldInd = document.getElementById("ws-indicator");
  if (oldInd) app.removeChild(oldInd);
  app.appendChild(
    window.createElement(
      WSIndicator({
        connected: wsConnected,
        playerCount,
      })
    )
  );
}

function showPopupError(message) {
  const app = document.getElementById("app");
  if (!app) return;
  if (lastErrorPopup) {
    app.removeChild(lastErrorPopup);
    lastErrorPopup = null;
  }
  const popupVNode = PopupError({ message });
  const popupElem = window.createElement(popupVNode);
  lastErrorPopup = popupElem;
  app.appendChild(popupElem);
  setTimeout(() => {
    if (app.contains(popupElem)) app.removeChild(popupElem);
    lastErrorPopup = null;
  }, 3000);
}

function attachSocketHandlers() {
  socket.on("open", () => {
    wsConnected = true;
    showWSIndicator();
  });

  socket.on("close", () => {
    wsConnected = false;
    showWSIndicator();
  });

  socket.on("message", (data) => {});

  socket.on("playerCountAll", (data) => {
    playerCount = data.count;
    showWSIndicator();
  });

  socket.on("lobby", (data) => {
    handleLobbyUpdate(
      data.players || [],
      data.chat || [],
      data.queue || [],
      data,
      data.code
    );
  });

  socket.on("waiting", (data) => {
    handleLobbyUpdate(
      data.players || [],
      data.chat || [],
      data.queue || [],
      data,
      data.code
    );
  });

  socket.on("error", (data) => {
    showPopupError(data.message || "Erreur WebSocket");
  });

  socket.on("waitingStarted", (data) =>
    showLobbyCountdown(data.duration, "Préparation")
  );
  socket.on("waitingTick", (data) =>
    showLobbyCountdown(data.value, "Préparation")
  );
  socket.on("countdownStart", (data) =>
    showLobbyCountdown(data.value, "Démarrage")
  );
  socket.on("countdownTick", (data) =>
    showLobbyCountdown(data.value, "Démarrage")
  );

  socket.on("waitingCancelled", () => hideLobbyCountdown(true));
  socket.on("countdownCancelled", () => hideLobbyCountdown(true));

  socket.on("colorRejected", (data) => {
    showPopupError(data.reason || "Couleur refusée");
  });

  socket.on("gameStart", (data) => {
    console.debug("gameStart recu:", data);
  });

  try {
    if (!window.__COLOR_CLICK_DELEGATE_ATTACHED) {
      document.addEventListener("click", (ev) => {
        try {
          const btn = ev.target.closest && ev.target.closest("[data-idx]");
          if (!btn) return;
          if (!btn.closest || !btn.closest(".color-selector")) return;
          const raw = btn.getAttribute("data-idx");
          const idx = raw != null ? Number(raw) : NaN;
          if (!Number.isNaN(idx)) {
            socket.send && socket.send("color", { color: idx });
            try {
              btn.style.transform = "scale(0.92)";
              setTimeout(() => (btn.style.transform = ""), 120);
            } catch (e) {}
          }
        } catch (e) {
          console.warn("color button handler error", e);
        }
      });
      window.__COLOR_CLICK_DELEGATE_ATTACHED = true;
    }
  } catch (e) {
    console.warn("Failed to attach color click delegate", e);
  }
}

function sendWS(type, payload) {
  socket.send(type, payload);
}

function handleSubmit(e, opts = {}) {
  e.preventDefault();
  const pseudoInput = document.getElementById("nickname");
  const lobbyCodeInput = document.getElementById("lobbyCode");
  const nickname = pseudoInput ? pseudoInput.value.trim() : "";
  const lobbyCode = lobbyCodeInput
    ? lobbyCodeInput.value.trim().toUpperCase()
    : "";
  setState({ nickname, lobbyCode });

  try {
    if (lobbyCode) localStorage.setItem("LOBBY_CODE", lobbyCode);
    else localStorage.removeItem("LOBBY_CODE");
  } catch (e) {}

  window.__LOCAL_NICKNAME = nickname;

  sendWS("join", {
    pseudo: nickname,
    lobbyCode: lobbyCode,
    create: opts.create === true,
  });
}

function handleLobbyUpdate(players, chat, queue, waitingMsg, code) {
  const myPseudo = getState().nickname;
  const isInLobby = players.some((p) => p.pseudo === myPseudo);
  let waiting = false;
  let queuePosition = 1;
  if (!isInLobby) {
    waiting = true;
    if (queue) {
      let idx = queue.findIndex(
        (p) =>
          p === myPseudo || (typeof p === "object" && p.pseudo === myPseudo)
      );
      queuePosition = idx === -1 ? queue.length : idx + 1;
    }
  } else {
    waiting = false;
    queuePosition = 0;
  }

  lobbyState.players = players;
  lobbyState.chat = chat;
  lobbyState.queue = queue || [];
  lobbyState.waiting = waiting;
  lobbyState.queuePosition = queuePosition;
  lobbyState.code = code || getState().lobbyCode;

  if (isInLobby) {
    const me = players.find((p) => p.pseudo === myPseudo);
    if (me) localColor = me.color ?? 0;
  }

  try {
    window.__LOBBY_PLAYERS = Array.isArray(players) ? players : [];
  } catch (e) {
    window.__LOBBY_PLAYERS = [];
  }

  showLobby();
}

function handleReady() {
  sendWS("ready", {});
}

function handleSendMessage(e) {
  e.preventDefault();
  const input = e.target.elements.message;
  if (input.value) {
    sendWS("chat", { text: input.value });
    input.value = "";
  }
}

function registerLobbyEvents() {
  registerEvent("handleReady", handleReady);
  registerEvent("handleSendMessage", handleSendMessage);
  registerEvent("handleSubmit", handleSubmit);
}

function showLobby() {
  if (!getState().nickname || getState().nickname.trim().length === 0) {
    showNicknameForm();
    return;
  }
  if (lobbyState.waiting) {
    withPreservedChatDraft(() =>
      render(
        WaitingRoom({
          position: lobbyState.queuePosition,
          queue: lobbyState.queue,
          pseudo: getState().nickname,
          code: lobbyState.code,
        }),
        container,
        getEventsMap()
      )
    );
    showWSIndicator();
    return;
  }
  registerLobbyEvents();
  withPreservedChatDraft(() =>
    render(
      Lobby({
        code: lobbyState.code,
        nickname: getState().nickname,
        players: lobbyState.players,
        chat: lobbyState.chat,
        localColor,
        queue: lobbyState.queue,
        waiting: false,
        queuePosition: 0,
      }),
      container,
      getEventsMap()
    )
  );
  showWSIndicator();
}

function showLobbyCountdown(value, label = "Démarrage") {
  if (typeof value === "number" && value <= 0) {
    hideLobbyCountdown(true);
    return;
  }
  let el = document.getElementById("lobby-countdown");
  if (!el) {
    el = document.createElement("div");
    el.id = "lobby-countdown";
    el.style = `
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 10001;
      background: rgba(0,0,0,0.6);
      color: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      font-family: 'Press Start 2P', monospace;
      font-size: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(el);
  }
  el.textContent = `${label} : ${value}s`;
  el.style.display = "block";
}

function hideLobbyCountdown(forceRemove = false) {
  const el = document.getElementById("lobby-countdown");
  if (!el) return;
  if (forceRemove) {
    if (el.parentNode) el.parentNode.removeChild(el);
    return;
  }
  el.style.display = "none";
}

// Initialization
attachSocketHandlers();
socket.init("ws://localhost:9001");

// Decide a larger cellSize automatically to better use screen space.
// You can override by setting a fixed number instead of autoCell.
(function initGameClient() {
  const preferredCols = 15;
  const preferredRows = 13;
  // Fill a large portion of screen (80% width, 75% height)
  const maxCellWidth = Math.floor((window.innerWidth * 0.8) / preferredCols);
  const maxCellHeight = Math.floor((window.innerHeight * 0.75) / preferredRows);
  let autoCell = Math.min(maxCellWidth || 36, maxCellHeight || 36);
  // clamp sensible range
  autoCell = Math.max(28, Math.min(80, autoCell));
  const cellSizeToUse = autoCell; // use computed autoCell (bigger than previous)

  const gameClient = attachClientGame(socket, container, {
    cellSize: cellSizeToUse,
    tilesetUrl: "./assets/images/TileSets.png",
    playerSpriteUrl: "./assets/images/Players.png",
    tileSrcSize: 16,
    tilesPerRow: undefined,
    debug: false,
    destructibleProb: 0.75, // client default (server can override)
    playerScale: 1.5, // pass preferred player scale to client (used for rendering)
  });
})();

// show nickname form to start normally
showNicknameForm();
