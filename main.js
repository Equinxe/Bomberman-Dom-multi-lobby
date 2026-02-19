// main.js - point d'entrée client (branche test-refactor2)
// Ajusté : lors du démarrage du jeu on force cellSize 32 (tiles plus grands) et playerScale 1.2.
import { render, createElement } from "./Core/dom.js";
import { Nickname } from "./ui/helpers/nickname.js";
import { Lobby } from "./ui/views/LobbyView.js";
import { WaitingRoom } from "./ui/views/WaitingRoomView.js";
import { WSIndicator } from "./ui/components/WsIndicator.js";
import { PopupError } from "./ui/components/Popup.js";
import { setState, getState } from "./Core/state.js";
import { registerEvent, getEventsMap } from "./Core/events.js";
import { socket } from "./multiplayer/socket.js";
import { attachClientGame } from "./client/game-client.js";
import {
  preloadPlayerSprites,
  preloadPowerUpSprites,
} from "./ui/helpers/sprite-loader.js";

window.createElement = createElement;

// ✅ Start preprocessing sprites immediately (removes blue/magenta backgrounds)
preloadPlayerSprites();
preloadPowerUpSprites();

let lobbyState = { players: [], chat: [], queue: [], code: "" };
const container = document.getElementById("app");
let localColor = 0;
let wsConnected = false;
let playerCount = 1;
let lastErrorPopup = null;
let gameApi = null;

function withPreservedChatDraft(renderFn) {
  let draft = "";
  try {
    const draftEl = document.getElementById("chat-draft");
    if (draftEl) draft = draftEl.value || "";
  } catch (e) {}
  renderFn();
  if (draft) {
    try {
      const newDraftEl = document.getElementById("chat-draft");
      if (newDraftEl) newDraftEl.value = draft;
    } catch (e) {}
  }
  // ✅ Auto-scroll chat to bottom after render
  try {
    const chatList = document.querySelector("[data-chat-list]");
    if (chatList) chatList.scrollTop = chatList.scrollHeight;
  } catch (e) {}
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
      }),
    ),
  );
}

function showPopupError(message) {
  const app = document.getElementById("app");
  if (!app) return;

  if (lastErrorPopup) {
    try {
      if (app.contains(lastErrorPopup)) {
        app.removeChild(lastErrorPopup);
      }
    } catch (e) {
      console.warn("showPopupError: failed to remove lastErrorPopup", e);
    }
    lastErrorPopup = null;
  }

  const popupVNode = PopupError({ message });
  const popupElem = window.createElement(popupVNode);
  lastErrorPopup = popupElem;
  try {
    app.appendChild(popupElem);
  } catch (e) {
    console.warn("showPopupError: failed to append popupElem", e);
    lastErrorPopup = null;
    return;
  }

  setTimeout(() => {
    try {
      if (app.contains(popupElem)) {
        app.removeChild(popupElem);
      }
    } catch (e) {
      console.warn(
        "showPopupError: failed to remove popupElem after timeout",
        e,
      );
    }
    if (lastErrorPopup === popupElem) lastErrorPopup = null;
  }, 3000);
}

function stopGameIfRunning() {
  if (!gameApi) return; // ✅ Only wipe DOM when actually stopping a game
  try {
    if (typeof gameApi.stop === "function") {
      gameApi.stop();
    }
  } catch (e) {
    console.warn("stopGameIfRunning error", e);
  } finally {
    gameApi = null;
  }
  // ✅ Force a full DOM wipe so the lobby gets a clean container
  // (the game vnode tree is completely different from the lobby tree,
  //  and leftover _vnode refs can confuse the patcher)
  try {
    if (container) {
      container.innerHTML = "";
      if (container.firstChild) container.firstChild._vnode = undefined;
    }
  } catch (e) {}
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

  socket.on("playerCountAll", (data) => {
    playerCount = data.count;
    showWSIndicator();
  });

  socket.on("lobby", (data) => {
    console.log(
      "[main.js] Received lobby event, stopping game and showing lobby",
      data?.code,
    );
    stopGameIfRunning();
    handleLobbyUpdate(
      data.players || [],
      data.chat || [],
      data.queue || [],
      data,
      data.code,
    );
  });

  socket.on("waiting", (data) => {
    stopGameIfRunning();
    handleLobbyUpdate(
      data.players || [],
      data.chat || [],
      data.queue || [],
      data,
      data.code,
    );
  });

  socket.on("error", (data) => {
    showPopupError(data.message || "Erreur WebSocket");
  });

  socket.on("waitingStarted", (data) =>
    showLobbyCountdown(data.duration, "Préparation"),
  );
  socket.on("waitingTick", (data) =>
    showLobbyCountdown(data.value, "Préparation"),
  );
  socket.on("countdownStart", (data) =>
    showLobbyCountdown(data.value, "Démarrage"),
  );
  socket.on("countdownTick", (data) =>
    showLobbyCountdown(data.value, "Démarrage"),
  );

  socket.on("waitingCancelled", () => {
    hideLobbyCountdown(true);
    stopGameIfRunning();
  });
  socket.on("countdownCancelled", () => {
    hideLobbyCountdown(true);
    stopGameIfRunning();
  });

  socket.on("gameStart", (data) => {
    try {
      stopGameIfRunning();
      // ✅ Hide lobby countdown overlay
      hideLobbyCountdown(true);
      // ✅ Force larger tiles (32x32) to zoom the tileset, playerScale=1.2 keeps sprite slightly larger
      gameApi = attachClientGame(socket, container, {
        cellSize: 32, // Taille d'affichage des cellules (zoom x2)
        tileSrcSize: 16, // ✅ Taille source des tiles dans le PNG (16x16)
        tileSpacing: 1, // ✅ Espacement de 1 pixel entre les tiles
        tilesPerRow: 40, // ✅ 40 tiles par ligne dans TileSets.png
        playerScale: 1.2, // Les joueurs sont 1.2x plus grands que les cellules
        debugCollision: false, // ✅ NO debug hitbox
        showCollisionOverlays: false, // do not show tile overlays
        inputEnabled: true,
        tilesetUrl: "./assets/images/TileSets.png", // ✅ Chemin du tileset
        playerSpriteUrl: "./assets/images/Players.png", // ✅ Chemin des sprites joueurs
        gameStartData: data, // ✅ Pass gameStart payload so client can initialize immediately
      });

      if (data && data.localPseudo) {
        window.__LOCAL_NICKNAME = data.localPseudo;
      }
    } catch (e) {
      console.error("Error while starting attachClientGame:", e, data);
      showPopupError("Erreur lors du démarrage du jeu");
    }
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
          p === myPseudo || (typeof p === "object" && p.pseudo === myPseudo),
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
        getEventsMap(),
      ),
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
      getEventsMap(),
    ),
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

// Ensure the initial UI is shown (nickname form if no nickname)
showLobby();
