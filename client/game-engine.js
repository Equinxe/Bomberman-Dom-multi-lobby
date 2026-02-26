// client/game-engine.js

import { render } from "../Core/dom.js";
import { GameView } from "../ui/views/GameView.js";
import { HUD } from "../ui/components/Hud.js";
import { GameChat } from "../ui/components/GameChat.js";

/**
 * Update player walk animation based on input state.
 */
export function updatePlayerAnimation(player, inputState) {
  if (!player.animation) {
    player.animation = {
      direction: "down",
      frame: 0,
      lastUpdate: Date.now(),
      isMoving: false,
    };
  }

  const now = Date.now();
  const isMoving =
    inputState.left || inputState.right || inputState.up || inputState.down;

  if (inputState.down) player.animation.direction = "down";
  else if (inputState.up) player.animation.direction = "up";
  else if (inputState.left) player.animation.direction = "left";
  else if (inputState.right) player.animation.direction = "right";

  player.animation.isMoving = isMoving;

  if (isMoving) {
    if (now - player.animation.lastUpdate > 120) {
      player.animation.frame = (player.animation.frame + 1) % 4;
      player.animation.lastUpdate = now;
    }
  } else {
    player.animation.frame = 0;
  }
}

/**
 * Create the game render loop.
 */
export function createRenderLoop(state, opts, container, handleGameChatSubmit) {
  let _stopped = false;
  let lastTs =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  let fps = 60;

  function renderState() {
    if (!state.started) return;

    const nowTs =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const dt = Math.max(1, nowTs - lastTs);
    fps = Math.round(1000 / dt);
    lastTs = nowTs;

    // Update animations
    state.players.forEach((player) => {
      const pid = player.id;
      if (pid === state.localPlayerId) {
        updatePlayerAnimation(player, state.inputState);
      } else if (state.remoteInputState[pid]) {
        updatePlayerAnimation(player, state.remoteInputState[pid]);
      }
    });

    const gameVNode = GameView({
      map: state.map,
      players: state.players,
      bombs: state.bombs,
      explosions: state.explosions,
      destroyingBlocks: state.destroyingBlocks,
      powerUps: state.powerUps,
      pickupFlashes: state.pickupFlashes,
      cellSize: state.cellSize,
      playerScale: opts.playerScale,
      tilesetUrl: opts.tilesetUrl || "./assets/images/TileSets.png",
      playerSpriteUrl: opts.playerSpriteUrl || "./assets/images/PlayerTest.png",
      powerUpSpriteUrl: "./assets/images/PowerUps.png",
      tileSrcSize: opts.tileSrcSize || 16,
      tilesPerRow: opts.tilesPerRow,
      debug: !!opts.debug,
      debugCollision: !!opts.debugCollision,
      showCollisionOverlays: opts.showCollisionOverlays !== false,
      collisionColors: opts.collisionColors || undefined,
      localPlayerId: state.localPlayerId,
      gameMode: state.gameMode,
    });

    const hudVNode = HUD({
      score: state.score,
      countdown: state.countdown,
      highscore: state.highscore,
      endTimer: state.endTimer,
      fps,
      players: state.players,
      gameWinner: state.gameWinner,
      localPlayerId: state.localPlayerId,
      gameMode: state.gameMode,
    });

    const localPlayer = state.players.find((p) => p.id === state.localPlayerId);
    const isSpectator = !!(localPlayer && localPlayer.dead);
    const gameChatVNode = GameChat({
      messages: state.gameChatMessages,
      nickname: state.localPseudo || "",
      isSpectator,
    });

    try {
      render(
        {
          tag: "div",
          attrs: {
            style:
              "display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding-top:60px;padding-bottom:40px;box-sizing:border-box;",
          },
          children: [gameVNode, hudVNode, gameChatVNode],
        },
        container,
        { handleGameChatSend: handleGameChatSubmit },
      );
    } catch (e) {
      console.error("render failed:", e, {
        map: state.map,
        players: state.players,
      });
    }
  }

  // Start the loop
  (function loop() {
    if (_stopped) return;
    try {
      renderState();
    } catch (e) {}
    requestAnimationFrame(loop);
  })();

  return {
    stop() {
      _stopped = true;
    },
  };
}

// Timer helpers

export function createTimerManager() {
  let countdown = null;
  let countdownInterval = null;
  let endTimer = null;
  let endTimerInterval = null;

  function startCountdown(initial = 300) {
    clearCountdown();
    countdown = initial;
    countdownInterval = setInterval(() => {
      countdown = Math.max(0, countdown - 1);
      if (countdown <= 0) clearCountdown();
    }, 1000);
  }

  function clearCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    countdown = null;
  }

  function startEndTimer() {
    clearEndTimer();
    endTimer = 0;
    endTimerInterval = setInterval(() => endTimer++, 1000);
  }

  function clearEndTimer() {
    if (endTimerInterval) {
      clearInterval(endTimerInterval);
      endTimerInterval = null;
    }
    endTimer = null;
  }

  return {
    getCountdown: () => countdown,
    setCountdown: (v) => {
      countdown = v;
    },
    getEndTimer: () => endTimer,
    setEndTimer: (v) => {
      endTimer = v;
    },
    startCountdown,
    clearCountdown,
    startEndTimer,
    clearEndTimer,
  };
}
