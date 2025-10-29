// main.js (modifié pour utiliser multiplayer/socket.js)
import { render, createElement } from "../Core/dom.js";
import { Nickname } from "./ui/nickname.js";
import { Lobby } from "./ui/lobby.js";
import { WaitingRoom } from "./ui/waitingroom.js";
import { WSIndicator } from "./ui/wsindicator.js";
import { PopupError } from "./ui/popup.js";
import { setState, getState } from "../Core/state.js";
import { registerEvent, getEventsMap } from "../Core/events.js";
import { GamePlaceholder } from "./ui/gamePlaceholder.js";
import { socket } from "./multiplayer/socket.js";

window.createElement = createElement; // Réutilise l'implémentation centrale

let lobbyState = { players: [], chat: [], queue: [], code: "" };
const container = document.getElementById("app");
let localColor = 0;
let wsConnected = false;
let playerCount = 1;
let lastErrorPopup = null;

// helper: preserve chat draft (value + selection + focus) across renders
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
      if (hadFocus) {
        newInput.focus();
      }
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

  socket.on("message", (data) => {
    // generic message handler if needed
  });

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
  socket.on("waitingCancelled", hideLobbyCountdown);
  socket.on("countdownCancelled", hideLobbyCountdown);

  socket.on("gameStart", (data) => {
    hideLobbyCountdown();
    render(
      GamePlaceholder({
        players: data.players || [],
        mapSeed: data.mapSeed || null,
      }),
      container,
      getEventsMap()
    );
    showWSIndicator();
  });

  socket.on("colorRejected", (data) => {
    showPopupError(data.reason || "Couleur refusée");
  });

  // global click delegation for color buttons
  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-idx]");
    if (btn) {
      const idx = Number(btn.getAttribute("data-idx"));
      if (!Number.isNaN(idx)) {
        sendWS("color", { color: idx });
      }
    }
  });
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

// Small overlay for lobby countdown / waiting
function showLobbyCountdown(value, label = "Démarrage") {
  let el = document.getElementById("lobby-countdown");
  if (!el) {
    el = document.createElement("div");
    el.id = "lobby-countdown";
    el.style = `
      position: fixed;
      top: 14px;
      right: 14px;
      z-index: 9999;
      background: rgba(0,0,0,0.6);
      color: #fff;
      padding: 10px 14px;
      border-radius: 8px;
      font-family: 'Press Start 2P', monospace;
      font-size: 16px;
      box-shadow: 0 8px 28px #000;
    `;
    document.body.appendChild(el);
  }
  el.textContent = `${label} : ${value}s`;
  el.style.display = "block";
}

function hideLobbyCountdown() {
  const el = document.getElementById("lobby-countdown");
  if (el) el.style.display = "none";
}

// initialisation socket et UI
attachSocketHandlers();
socket.init("ws://localhost:9001");
showNicknameForm();
