// client/game-client.js
// Orchestrator — wires together client modules.

import { createInputManager } from "./input-manager.js";
import { registerStateSync } from "./state-sync.js";
import { removeWinOverlay, removeSpectatorOverlay } from "./overlays.js";
import { createChatManager } from "./game-chat.js";
import { createRenderLoop, createTimerManager } from "./game-engine.js";

export function attachClientGame(socket, container, opts = {}) {
  const isBrowser =
    typeof window !== "undefined" && typeof document !== "undefined";

  // Shared mutable game state
  const state = {
    map: null,
    players: [],
    bombs: [],
    explosions: [],
    destroyingBlocks: [],
    powerUps: [],
    pickupFlashes: [],
    gameChatMessages: [],
    gameChatOpen: false,
    score: 0,
    highscore: null,
    started: false,
    countdown: null,
    endTimer: null,
    gameWinner: null,
    gameMode: "ffa",
    localPlayerId: null,
    localPseudo:
      (typeof window !== "undefined" && window.__LOCAL_NICKNAME) || null,
    inputState: { left: false, right: false, up: false, down: false },
    remoteInputState: {},
    cellSize: typeof opts.cellSize === "number" ? opts.cellSize : 24,
  };

  // Timers
  const timers = createTimerManager();

  const timerProxy = {
    startCountdown(initial) {
      timers.startCountdown(initial);
      state.countdown = timers.getCountdown();
    },
    clearCountdown() {
      timers.clearCountdown();
      state.countdown = null;
    },
    startEndTimer() {
      timers.startEndTimer();
      state.endTimer = timers.getEndTimer();
    },
    clearEndTimer() {
      timers.clearEndTimer();
      state.endTimer = null;
    },
  };

  // Keep timers in sync
  const _timerSyncInterval = setInterval(() => {
    state.countdown = timers.getCountdown();
    state.endTimer = timers.getEndTimer();
  }, 200);

  // Send input to server
  function sendInputToServer(payload) {
    try {
      socket &&
        typeof socket.send === "function" &&
        socket.send("input", { payload });
    } catch (e) {
      // ignore
    }
  }

  // Chat
  const chatManager = createChatManager(socket);

  // Input
  const inputManager = createInputManager({
    sendInputToServer,
    getLocalPlayer: () =>
      state.players.find((p) => p.id === state.localPlayerId),
    inputState: state.inputState,
    onChatFocus: () => {
      state.gameChatOpen = true;
    },
  });

  if (opts.inputEnabled !== false) {
    inputManager.attach();
  }

  // State sync (socket handlers)
  const removeAllSocketHandlers = registerStateSync(socket, state, opts, {
    startCountdown: timerProxy.startCountdown,
    clearCountdown: timerProxy.clearCountdown,
    startEndTimer: timerProxy.startEndTimer,
  });

  // Handle immediate init
  if (opts.gameStartData) {
    const fakePayload = opts.gameStartData;
    socket?.emit?.("gameStart", fakePayload);
  }

  // Render loop
  const renderLoop = createRenderLoop(
    state,
    opts,
    container,
    chatManager.handleGameChatSubmit,
  );

  // Public API
  return {
    stop() {
      renderLoop.stop();
      try {
        timerProxy.clearCountdown();
        timerProxy.clearEndTimer();
        clearInterval(_timerSyncInterval);
        removeWinOverlay();
        removeSpectatorOverlay();
        state.bombs = [];
        state.explosions = [];
        state.destroyingBlocks = [];
        state.powerUps = [];
        state.pickupFlashes = [];
        state.gameChatMessages = [];
        state.gameChatOpen = false;
        state.gameWinner = null;
      } catch (e) {}
      state.started = false;
      inputManager.detach();
      removeAllSocketHandlers();
    },
  };
}
