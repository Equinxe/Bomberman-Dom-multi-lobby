// client/state-sync.js
// Socket event handlers that sync server state → client state.
// Split into sub-modules under client/sync/ for clarity.

import { generateMapFromSeed } from "../shared/map-generator.js";
import { MAP_COLS, MAP_ROWS } from "../shared/constants.js";
import {
  showSpectatorOverlay,
  showWinOverlay,
  removeSpectatorOverlay,
} from "./overlays.js";

import { normalizePlayers, registerPlayerSync } from "./sync/player-sync.js";
import { registerBombSync } from "./sync/bomb-sync.js";
import { registerPowerupSync } from "./sync/powerup-sync.js";

// ---------- initFromGameStart ----------
function initFromGameStart(
  state,
  opts,
  payload,
  startCountdown,
  clearCountdown,
) {
  try {
    const cols = (payload.map && payload.map.width) || opts.cols || MAP_COLS;
    const rows = (payload.map && payload.map.height) || opts.rows || MAP_ROWS;

    state.players = normalizePlayers(payload.players || [], cols, rows);
    const candidate = state.players.find(
      (pl) => pl.pseudo === state.localPseudo,
    );
    if (candidate) state.localPlayerId = candidate.id;

    state.players.forEach((pl) => {
      if (pl && pl.id && !state.remoteInputState[pl.id]) {
        state.remoteInputState[pl.id] = {
          left: false,
          right: false,
          up: false,
          down: false,
        };
      }
    });

    // Use map grid from server if available
    if (
      payload.map &&
      Array.isArray(payload.map.grid) &&
      payload.map.grid.length > 0 &&
      payload.map.grid[0] &&
      payload.map.grid[0].length > 0
    ) {
      state.map = payload.map;
    } else if (payload.mapSeed) {
      const mapOptions = payload.mapOptions || {};
      state.map = generateMapFromSeed(cols, rows, payload.mapSeed, {
        destructibleProb:
          mapOptions.destructibleProb ?? opts.destructibleProb ?? 0.42,
        patternSpacing: mapOptions.patternSpacing ?? opts.patternSpacing ?? 2,
        patternOffset: mapOptions.patternOffset ?? opts.patternOffset ?? 1,
        borderThickness:
          mapOptions.borderThickness ?? opts.borderThickness ?? 1,
      });
    } else {
      state.map = generateMapFromSeed(cols, rows, null, {
        destructibleProb: opts.destructibleProb ?? 0.42,
        patternSpacing: opts.patternSpacing ?? 2,
        patternOffset: opts.patternOffset ?? 1,
        borderThickness: opts.borderThickness ?? 1,
      });
    }

    // Reset game arrays
    state.bombs = [];
    state.explosions = [];
    state.destroyingBlocks = [];
    state.powerUps = [];
    state.pickupFlashes = [];
    state.gameChatMessages = [];
    state.gameChatOpen = false;
    state.gameWinner = null;

    // Remove any leftover spectator overlay from previous game
    removeSpectatorOverlay();

    state.score = 0;
    state.highscore = payload.highscore ?? state.highscore;

    // Game timer
    const initial =
      typeof payload.gameTimer === "number"
        ? payload.gameTimer
        : typeof payload.initialCountdown === "number"
          ? payload.initialCountdown
          : 300;
    startCountdown(initial);

    state.started = true;
    state.gameMode = payload.gameMode || "ffa";
    state.localPseudo =
      payload.localPseudo ||
      state.localPseudo ||
      (typeof window !== "undefined" && window.__LOCAL_NICKNAME) ||
      state.localPseudo;
  } catch (e) {
    console.error("Error handling gameStart:", e, payload);
  }
}

/**
 * Register all socket handlers that sync server state → client state.
 * @returns {function} removeAllHandlers
 */
export function registerStateSync(
  socket,
  state,
  opts,
  { startCountdown, clearCountdown, startEndTimer },
) {
  const handlers = [];

  function safeOn(eventName, handler) {
    try {
      if (socket && typeof socket.on === "function") {
        const wrapped = (payload) => {
          try {
            handler(payload);
          } catch (err) {
            console.error(
              `[state-sync] ${eventName} handler error:`,
              err,
              payload,
            );
          }
        };
        socket.on(eventName, wrapped);
        handlers.push({ eventName, wrappedHandler: wrapped });
      }
    } catch (e) {
      console.error("safeOn error", e);
    }
  }

  // ── Game lifecycle ──
  safeOn("gameStart", (payload) => {
    initFromGameStart(state, opts, payload, startCountdown, clearCountdown);
  });

  safeOn("tickSnapshot", (snap) => {
    if (!snap) return;

    if (snap.map && Array.isArray(snap.map.grid) && snap.map.grid.length > 0) {
      state.map = snap.map;
    } else if (snap.mapSeed) {
      const cols = (snap.map && snap.map.width) || opts.cols || MAP_COLS;
      const rows = (snap.map && snap.map.height) || opts.rows || MAP_ROWS;
      state.map = generateMapFromSeed(cols, rows, snap.mapSeed, {
        destructibleProb:
          (snap.mapOptions || {}).destructibleProb ??
          opts.destructibleProb ??
          0.42,
        patternSpacing:
          (snap.mapOptions || {}).patternSpacing ?? opts.patternSpacing ?? 2,
        patternOffset:
          (snap.mapOptions || {}).patternOffset ?? opts.patternOffset ?? 1,
        borderThickness:
          (snap.mapOptions || {}).borderThickness ?? opts.borderThickness ?? 1,
      });
    }

    if (Array.isArray(snap.players)) {
      state.players = normalizePlayers(
        snap.players,
        state.map?.width || opts.cols || MAP_COLS,
        state.map?.height || opts.rows || MAP_ROWS,
      );
      const candidate = state.players.find(
        (pl) => pl.pseudo === state.localPseudo,
      );
      if (candidate) state.localPlayerId = candidate.id;
      state.players.forEach((pl) => {
        if (pl && pl.id && !state.remoteInputState[pl.id]) {
          state.remoteInputState[pl.id] = {
            left: false,
            right: false,
            up: false,
            down: false,
          };
        }
      });
    }
    if (typeof snap.score === "number") state.score = snap.score;
    if (typeof snap.highscore === "number") state.highscore = snap.highscore;
    if (typeof snap.countdown === "number") {
      state.countdown = snap.countdown;
      if (state.countdown > 0) startCountdown(state.countdown);
    }
    if (snap.gameOver === true) {
      clearCountdown();
      if (state.endTimer == null) startEndTimer();
    }
  });

  safeOn("gameChat", (msg) => {
    if (!msg || !msg.message) return;
    state.gameChatMessages.push(msg.message);
    if (state.gameChatMessages.length > 100) state.gameChatMessages.shift();
    requestAnimationFrame(() => {
      const chatList = document.querySelector("[data-game-chat-list]");
      if (chatList) chatList.scrollTop = chatList.scrollHeight;
    });
  });

  safeOn("gameWin", (msg) => {
    if (!msg) return;
    state.gameWinner = {
      id: msg.winnerId,
      pseudo: msg.winnerPseudo,
      winningTeam: msg.winningTeam || null,
    };
    clearCountdown();
    if (state.endTimer == null) startEndTimer();
    showWinOverlay(state.gameWinner, state.localPlayerId, state.players);
  });

  safeOn("gameOver", () => {
    clearCountdown();
    if (state.endTimer == null) startEndTimer();
  });

  safeOn("scoreUpdate", (s) => {
    if (typeof s.score === "number") state.score = s.score;
  });

  safeOn("highscoreUpdate", (h) => {
    if (typeof h.highscore === "number") state.highscore = h.highscore;
  });

  // ── Domain-specific handlers (delegated to sub-modules) ──
  registerPlayerSync(safeOn, state, { showSpectatorOverlay });
  registerBombSync(safeOn, state);
  registerPowerupSync(safeOn, state);

  // ── Cleanup ──
  function removeAllHandlers() {
    if (socket && typeof socket.off === "function") {
      handlers.forEach(({ eventName, wrappedHandler }) => {
        try {
          socket.off(eventName, wrappedHandler);
        } catch (e) {
          console.warn("removeAllHandlers: off error", e);
        }
      });
    }
    handlers.length = 0;
  }

  return removeAllHandlers;
}
