// main.js — Client entry point (slim orchestrator)
// Init socket → attach handlers → show initial view.
// Lobby controller logic lives in client/lobby-controller.js
// UI overlays (popups, countdown, WS indicator) live in client/ui-overlays.js

import { render, createElement } from "./Core/dom.js";
import { Nickname } from "./ui/helpers/nickname.js";
import { setState } from "./Core/state.js";
import { registerEvent, getEventsMap } from "./Core/events.js";
import { socket } from "./multiplayer/socket.js";
import { attachClientGame } from "./client/game-client.js";
import {
  preloadPlayerSprites,
  preloadPowerUpSprites,
} from "./ui/helpers/sprite-loader.js";

// Lobby controller
import {
  handleLobbyUpdate,
  showLobby,
  registerLobbyEvents,
} from "./client/lobby-controller.js";

// UI overlays
import {
  showWSIndicator,
  setWsConnected,
  setPlayerCount,
  showPopupError,
  showLobbyCountdown,
  hideLobbyCountdown,
} from "./client/ui-overlays.js";

window.createElement = createElement;

// Preload sprites immediately (removes green/magenta backgrounds)
preloadPlayerSprites();
preloadPowerUpSprites();

const container = document.getElementById("app");
let gameApi = null;

// ── Helpers ──

function sendWS(type, payload) {
  socket.send(type, payload);
}

function showNicknameForm() {
  render(Nickname({ onSubmit: handleSubmit }), container, getEventsMap());
  showWSIndicator();
}

function stopGameIfRunning() {
  if (!gameApi) return;
  try {
    if (typeof gameApi.stop === "function") gameApi.stop();
  } catch (e) {
    console.warn("stopGameIfRunning error", e);
  } finally {
    gameApi = null;
  }
  // Force a full DOM wipe so the lobby gets a clean container
  try {
    if (container) {
      container.innerHTML = "";
      if (container.firstChild) container.firstChild._vnode = undefined;
    }
  } catch (e) {}
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

// ── Socket handlers ──

function attachSocketHandlers() {
  // Connection status
  socket.on("open", () => {
    setWsConnected(true);
    showWSIndicator();
  });
  socket.on("close", () => {
    setWsConnected(false);
    showWSIndicator();
  });
  socket.on("playerCountAll", (data) => {
    setPlayerCount(data.count);
    showWSIndicator();
  });

  // Lobby / waiting
  socket.on("lobby", (data) => {
    console.log("[main.js] Received lobby event", data?.code);
    stopGameIfRunning();
    handleLobbyUpdate(
      data.players || [], data.chat || [], data.queue || [],
      data, data.code, container, showNicknameForm,
    );
  });
  socket.on("waiting", (data) => {
    stopGameIfRunning();
    handleLobbyUpdate(
      data.players || [], data.chat || [], data.queue || [],
      data, data.code, container, showNicknameForm,
    );
  });

  // Errors
  socket.on("error", (data) => {
    showPopupError(data.message || "Erreur WebSocket");
  });

  // Countdown timers
  socket.on("waitingStarted", (data) => showLobbyCountdown(data.duration, "Préparation"));
  socket.on("waitingTick", (data) => showLobbyCountdown(data.value, "Préparation"));
  socket.on("countdownStart", (data) => showLobbyCountdown(data.value, "Démarrage"));
  socket.on("countdownTick", (data) => showLobbyCountdown(data.value, "Démarrage"));
  socket.on("waitingCancelled", () => { hideLobbyCountdown(true); stopGameIfRunning(); });
  socket.on("countdownCancelled", () => { hideLobbyCountdown(true); stopGameIfRunning(); });

  // Game start
  socket.on("gameStart", (data) => {
    try {
      stopGameIfRunning();
      hideLobbyCountdown(true);
      gameApi = attachClientGame(socket, container, {
        cellSize: 32,
        tileSrcSize: 16,
        tileSpacing: 1,
        tilesPerRow: 40,
        playerScale: 1.2,
        debugCollision: false,
        showCollisionOverlays: false,
        inputEnabled: true,
        tilesetUrl: "./assets/images/TileSets.png",
        playerSpriteUrl: "./assets/images/PlayerTest.png",
        gameStartData: data,
      });
      if (data && data.localPseudo) window.__LOCAL_NICKNAME = data.localPseudo;
    } catch (e) {
      console.error("Error while starting attachClientGame:", e, data);
      showPopupError("Erreur lors du démarrage du jeu");
    }
  });

  // Color selector delegate
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

// ── Initialization ──

registerLobbyEvents(sendWS);
registerEvent("handleSubmit", handleSubmit);
attachSocketHandlers();
socket.init("ws://localhost:9001");

// Show initial UI (nickname form if no nickname set)
showLobby(container, showNicknameForm);
