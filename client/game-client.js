// client/game-client.js
// Réception et application en temps réel des inputs distants (relay server -> playerInput)
// Le serveur gère TOUS les mouvements avec collision - pas de prédiction côté client
import { render } from "../Core/dom.js";
import { GameView } from "../ui/views/GameView.js";
import { HUD } from "../ui/components/Hud.js";
import { GameChat } from "../ui/components/GameChat.js";
import { SpectatorOverlay } from "../ui/components/SpectatorOverlay.js";
import { generateMapFromSeed } from "../shared/map-generator.js";

export function attachClientGame(socket, container, opts = {}) {
  const isBrowser =
    typeof window !== "undefined" && typeof document !== "undefined";
  const safeLocalStorage = (() => {
    try {
      return isBrowser && window.localStorage ? window.localStorage : null;
    } catch (e) {
      return null;
    }
  })();

  let map = null;
  let players = [];
  let bombs = []; // ✅ Bombs array
  let explosions = []; // ✅ Explosions array
  let destroyingBlocks = []; // ✅ Block destruction animations
  let powerUps = []; // ✅ Power-ups on the map
  let pickupFlashes = []; // ✅ Visual flash when picking up power-ups
  let fps = 60;
  let lastTs =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  let cellSize = typeof opts.cellSize === "number" ? opts.cellSize : 24;
  let tileSrcSize = opts.tileSrcSize || 16;
  let tilesPerRow = opts.tilesPerRow || undefined;
  let started = false;
  let countdown = null;
  let countdownInterval = null;
  let endTimer = null;
  let endTimerInterval = null;
  let score = 0;
  let highscore = null;

  // ✅ In-game chat state
  let gameChatMessages = [];
  let gameChatOpen = false; // Whether the chat input is focused

  const playerScale =
    typeof opts.playerScale === "number" ? opts.playerScale : undefined;

  const inputEnabled = opts.inputEnabled !== false;
  const playerSpeed =
    typeof opts.playerSpeed === "number" ? opts.playerSpeed : 4;

  const inputState = { left: false, right: false, up: false, down: false };
  const remoteInputState = {};

  let localPseudo =
    (typeof window !== "undefined" && window.__LOCAL_NICKNAME) || null;
  let localPlayerId = null;
  let gameWinner = null; // ✅ Track game winner
  let gameMode = "ffa"; // ✅ Track game mode (ffa or team)

  // ✅ Update player animation based on input state
  function updatePlayerAnimation(player, inputState) {
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

    // Update direction based on input (last pressed key takes priority)
    if (inputState.down) player.animation.direction = "down";
    else if (inputState.up) player.animation.direction = "up";
    else if (inputState.left) player.animation.direction = "left";
    else if (inputState.right) player.animation.direction = "right";

    player.animation.isMoving = isMoving;

    // Update animation frame - 4-frame cycle for smooth walk
    if (isMoving) {
      if (now - player.animation.lastUpdate > 120) {
        // 120ms per frame for smoother walk
        player.animation.frame = (player.animation.frame + 1) % 4; // 4 frames: idle→walkA→idle→walkB
        player.animation.lastUpdate = now;
      }
    } else {
      player.animation.frame = 0; // Idle frame
    }
  }

  // ---------- normalizePlayers ----------
  function normalizePlayers(raw, cols = 15, rows = 13) {
    if (!Array.isArray(raw)) return [];
    const spawns = [
      { x: 1, y: 1 },
      { x: cols - 2, y: rows - 2 },
      { x: cols - 2, y: 1 },
      { x: 1, y: rows - 2 },
    ];
    return raw.map((p, i) => {
      const out = { ...p };
      if (typeof out.x !== "number" || typeof out.y !== "number") {
        const s = spawns[i] || spawns[i % spawns.length];
        out.x = s.x;
        out.y = s.y;
      }
      out.id = out.id ?? out.pseudo ?? `p${i + 1}`;
      out.pseudo = out.pseudo ?? `J${i + 1}`;
      out.color = typeof out.color === "number" ? out.color : i % 8;
      out.lives = typeof out.lives === "number" ? out.lives : 3;
      out.dead = !!out.dead;
      out.invincibleUntil = out.invincibleUntil || null;
      return out;
    });
  }

  // ---------- countdown / timers ----------
  function startCountdown(initial = 300) {
    clearCountdown();
    countdown = initial;
    countdownInterval = setInterval(() => {
      countdown = Math.max(0, countdown - 1);
      if (countdown <= 0) {
        clearCountdown();
      }
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

  // ---------- safeOn wrapper ----------
  const _registeredHandlers = []; // Track all registered socket handlers for cleanup

  function safeOn(eventName, handler) {
    try {
      if (socket && typeof socket.on === "function") {
        const wrappedHandler = (payload) => {
          try {
            handler(payload);
          } catch (err) {
            console.error(
              `[attachClientGame] handler ${eventName} error:`,
              err,
              payload,
            );
          }
        };
        socket.on(eventName, wrappedHandler);
        _registeredHandlers.push({ eventName, wrappedHandler });
      }
    } catch (e) {
      console.error("safeOn error", e);
    }
  }

  function removeAllSocketHandlers() {
    if (socket && typeof socket.off === "function") {
      _registeredHandlers.forEach(({ eventName, wrappedHandler }) => {
        try {
          socket.off(eventName, wrappedHandler);
        } catch (e) {
          console.warn("removeAllSocketHandlers: off error", e);
        }
      });
    }
    _registeredHandlers.length = 0;
  }

  // ---------- send input to server ----------
  function sendInputToServer(payload) {
    try {
      console.debug("[client] sendInputToServer ->", payload);
      socket &&
        typeof socket.send === "function" &&
        socket.send("input", { payload });
    } catch (e) {
      // ignore
    }
  }

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
    if (!inputEnabled) return;
    if (isTypingInFormElement(ev.target)) return;

    const key = (ev.key || "").toLowerCase();

    // ✅ Enter key: focus the in-game chat input (works for alive AND dead players)
    if (key === "enter") {
      const chatInput = document.getElementById("game-chat-input");
      if (chatInput) {
        ev.preventDefault();
        chatInput.focus();
        gameChatOpen = true;
      }
      return;
    }

    // ✅ Block movement/action input if local player is dead (but chat still works above)
    const localPlayer = players.find((p) => p.id === localPlayerId);
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
      // ✅ Detonator: detonate all player's bombs
      sendInputToServer({ type: "action", action: "detonate" });
    }
    if (changed) ev.preventDefault();
  }

  function handleKeyUp(ev) {
    if (!inputEnabled) return;
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

  function attachInputListeners() {
    if (!isBrowser) return;
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  }

  function detachInputListeners() {
    if (!isBrowser) return;
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  }

  // ✅ Shared initialization from gameStart payload
  function initFromGameStart(payload) {
    try {
      const cols = (payload.map && payload.map.width) || opts.cols || 15;
      const rows = (payload.map && payload.map.height) || opts.rows || 13;
      players = normalizePlayers(payload.players || [], cols, rows);

      const candidate = players.find((pl) => pl.pseudo === localPseudo);
      if (candidate) localPlayerId = candidate.id;

      players.forEach((pl) => {
        if (pl && pl.id) {
          if (!remoteInputState[pl.id]) {
            remoteInputState[pl.id] = {
              left: false,
              right: false,
              up: false,
              down: false,
            };
          }
        }
      });

      // ✅ PRIORITY 1: Use map grid from server if available
      if (
        payload.map &&
        Array.isArray(payload.map.grid) &&
        payload.map.grid.length > 0 &&
        payload.map.grid[0] &&
        payload.map.grid[0].length > 0
      ) {
        map = payload.map;
        console.log("✅ [gameStart] Map received from server with grid:", {
          width: map.width,
          height: map.height,
          gridRows: map.grid.length,
          gridCols: map.grid[0].length,
        });
      } else if (payload.mapSeed) {
        const seed = payload.mapSeed;
        const mapOptions = payload.mapOptions || {};
        const destructibleProb =
          mapOptions.destructibleProb ?? opts.destructibleProb ?? 0.42;
        map = generateMapFromSeed(cols, rows, seed, {
          destructibleProb,
          patternSpacing: mapOptions.patternSpacing ?? opts.patternSpacing ?? 2,
          patternOffset: mapOptions.patternOffset ?? opts.patternOffset ?? 1,
          borderThickness:
            mapOptions.borderThickness ?? opts.borderThickness ?? 1,
        });
        console.log("⚠️ [gameStart] Map generated from seed (fallback):", seed);
      } else {
        map = generateMapFromSeed(cols, rows, null, {
          destructibleProb: opts.destructibleProb ?? 0.42,
          patternSpacing: opts.patternSpacing ?? 2,
          patternOffset: opts.patternOffset ?? 1,
          borderThickness: opts.borderThickness ?? 1,
        });
        console.warn("⚠️ [gameStart] Map generated randomly (no server data)");
      }

      // ✅ Reset bombs, explosions, and block animations
      bombs = [];
      explosions = [];
      destroyingBlocks = [];
      powerUps = [];
      pickupFlashes = [];
      gameChatMessages = [];
      gameChatOpen = false;
      gameWinner = null;

      // ✅ Remove any leftover spectator overlay from previous game
      removeSpectatorOverlay();

      score = 0;
      highscore = payload.highscore ?? highscore;

      // ✅ Game timer: 5 minutes (300s) — use gameTimer or initialCountdown from server
      const initial =
        typeof payload.gameTimer === "number"
          ? payload.gameTimer
          : typeof payload.initialCountdown === "number"
            ? payload.initialCountdown
            : 300;
      console.log(`✅ [gameStart] Starting countdown: ${initial}s`);
      startCountdown(initial);
      clearEndTimer();
      endTimer = null;
      started = true;
      gameMode = payload.gameMode || "ffa"; // ✅ Store game mode
      localPseudo =
        payload.localPseudo ||
        localPseudo ||
        (typeof window !== "undefined" && window.__LOCAL_NICKNAME) ||
        localPseudo;
    } catch (e) {
      console.error("Error handling gameStart:", e, payload);
    }
  }

  // ✅ If gameStart data was passed via opts, initialize immediately
  if (opts.gameStartData) {
    initFromGameStart(opts.gameStartData);
  }

  safeOn("gameStart", (payload) => {
    initFromGameStart(payload);
  });

  safeOn("tickSnapshot", (snap) => {
    try {
      if (!snap) return;

      if (
        snap.map &&
        Array.isArray(snap.map.grid) &&
        snap.map.grid.length > 0
      ) {
        map = snap.map;
      } else if (snap.mapSeed) {
        const cols = (snap.map && snap.map.width) || opts.cols || 15;
        const rows = (snap.map && snap.map.height) || opts.rows || 13;
        const seed = snap.mapSeed;
        const mapOptions = snap.mapOptions || {};
        const destructibleProb =
          mapOptions.destructibleProb ?? opts.destructibleProb ?? 0.42;
        map = generateMapFromSeed(cols, rows, seed, {
          destructibleProb,
          patternSpacing: mapOptions.patternSpacing ?? opts.patternSpacing ?? 2,
          patternOffset: mapOptions.patternOffset ?? opts.patternOffset ?? 1,
          borderThickness:
            mapOptions.borderThickness ?? opts.borderThickness ?? 1,
        });
      }

      if (Array.isArray(snap.players)) {
        players = normalizePlayers(
          snap.players,
          map.width || opts.cols || 15,
          map.height || opts.rows || 13,
        );
        const candidate = players.find((pl) => pl.pseudo === localPseudo);
        if (candidate) localPlayerId = candidate.id;
        players.forEach((pl) => {
          if (pl && pl.id && !remoteInputState[pl.id]) {
            remoteInputState[pl.id] = {
              left: false,
              right: false,
              up: false,
              down: false,
            };
          }
        });
      }
      if (typeof snap.score === "number") score = snap.score;
      if (typeof snap.highscore === "number") highscore = snap.highscore;
      if (typeof snap.countdown === "number") {
        countdown = snap.countdown;
        if (!countdownInterval && countdown > 0) startCountdown(countdown);
      }
      if (snap.gameOver === true) {
        clearCountdown();
        if (endTimer == null) startEndTimer();
      }
    } catch (e) {
      console.error("tickSnapshot handler error:", e, snap);
    }
  });

  safeOn("playerInput", (msg) => {
    try {
      if (!msg) return;
      const pid = msg.playerId;
      const payload = msg.payload || {};
      if (!localPlayerId && players && localPseudo) {
        const c = players.find((pl) => pl.pseudo === localPseudo);
        if (c) localPlayerId = c.id;
      }
      if (pid && pid === localPlayerId) return;
      if (pid && !remoteInputState[pid]) {
        remoteInputState[pid] = {
          left: false,
          right: false,
          up: false,
          down: false,
        };
      }
      if (payload.type === "move" && typeof payload.dir === "string") {
        const dir = payload.dir;
        const active = !!payload.active;
        if (dir === "left") remoteInputState[pid].left = active;
        else if (dir === "right") remoteInputState[pid].right = active;
        else if (dir === "up") remoteInputState[pid].up = active;
        else if (dir === "down") remoteInputState[pid].down = active;
      }
    } catch (e) {
      console.error("playerInput handler error", e, msg);
    }
  });

  safeOn("playerPosition", (msg) => {
    try {
      if (!msg || !msg.player) return;
      const p = msg.player;

      let found = false;
      players = players.map((pl) => {
        if (pl.id === p.id || pl.pseudo === p.pseudo) {
          found = true;
          return {
            ...pl,
            id: p.id,
            x: p.x,
            y: p.y,
            lives: p.lives !== undefined ? p.lives : pl.lives,
            dead: p.dead !== undefined ? p.dead : pl.dead,
            invincibleUntil:
              p.invincibleUntil !== undefined
                ? p.invincibleUntil
                : pl.invincibleUntil,
            maxBombs: p.maxBombs !== undefined ? p.maxBombs : pl.maxBombs,
            bombRange: p.bombRange !== undefined ? p.bombRange : pl.bombRange,
            speed: p.speed !== undefined ? p.speed : pl.speed,
            wallpass: p.wallpass !== undefined ? p.wallpass : pl.wallpass,
            detonator: p.detonator !== undefined ? p.detonator : pl.detonator,
            vestActive:
              p.vestActive !== undefined ? p.vestActive : pl.vestActive,
            vestUntil: p.vestUntil !== undefined ? p.vestUntil : pl.vestUntil,
            skullEffect:
              p.skullEffect !== undefined ? p.skullEffect : pl.skullEffect,
            skullUntil:
              p.skullUntil !== undefined ? p.skullUntil : pl.skullUntil,
            invisible: p.invisible !== undefined ? p.invisible : pl.invisible,
            team: p.team !== undefined ? p.team : pl.team,
          };
        }
        return pl;
      });

      if (!found && p.pseudo) {
        for (let i = 0; i < players.length; i++) {
          if (players[i].pseudo === p.pseudo) {
            players[i] = { ...players[i], id: p.id, x: p.x, y: p.y };
            found = true;
            break;
          }
        }
      }

      if (!found) {
        console.warn("[client] playerPosition received for unknown player:", p);
      }
    } catch (e) {
      console.error("playerPosition handler error", e, msg);
    }
  });

  // ✅ Bomb handlers
  safeOn("bombPlaced", (msg) => {
    try {
      if (!msg || !msg.bomb) return;
      console.log("[client] Bomb placed:", msg.bomb);

      bombs.push({
        id: msg.bomb.id,
        x: msg.bomb.x,
        y: msg.bomb.y,
        playerId: msg.bomb.playerId,
        placedAt: msg.bomb.placedAt,
        explosionTime: msg.bomb.explosionTime,
      });
    } catch (e) {
      console.error("bombPlaced handler error", e, msg);
    }
  });

  safeOn("bombExplode", (msg) => {
    try {
      if (!msg) return;
      console.log("[client] Bomb exploded:", msg);

      // Remove bomb from list
      bombs = bombs.filter((b) => b.id !== msg.bomb.id);

      // Add explosion animation (800ms with 5 phases)
      explosions.push({
        id: msg.bomb.id,
        cells: msg.explosionCells,
        startTime: Date.now(),
        duration: 800, // ✅ 800ms for proper explosion timing
      });

      // ✅ Add block destruction animations for destroyed blocks
      if (msg.destroyedBlocks && Array.isArray(msg.destroyedBlocks)) {
        msg.destroyedBlocks.forEach((block) => {
          destroyingBlocks.push({
            x: block.x,
            y: block.y,
            startTime: Date.now(),
            duration: 800, // 800ms block breaking animation
          });
        });

        // Remove block destruction animations after they finish
        setTimeout(() => {
          const blockPositions = new Set(
            msg.destroyedBlocks.map((b) => `${b.x},${b.y}`),
          );
          destroyingBlocks = destroyingBlocks.filter(
            (b) => !blockPositions.has(`${b.x},${b.y}`),
          );
        }, 850);
      }

      // Remove explosion after animation
      setTimeout(() => {
        explosions = explosions.filter((e) => e.id !== msg.bomb.id);
      }, 850); // Slightly longer than duration to ensure last frame renders
    } catch (e) {
      console.error("bombExplode handler error", e, msg);
    }
  });

  safeOn("mapUpdate", (msg) => {
    try {
      if (!msg || !msg.map) return;
      console.log(
        "[client] Map updated, blocks destroyed:",
        msg.destroyedBlocks,
      );
      map = msg.map;
    } catch (e) {
      console.error("mapUpdate handler error", e, msg);
    }
  });

  // ✅ Power-up spawned handler
  safeOn("powerUpSpawned", (msg) => {
    try {
      if (!msg || !Array.isArray(msg.powerUps)) return;
      console.log("[client] Power-ups spawned:", msg.powerUps);
      msg.powerUps.forEach((pu) => {
        // Avoid duplicates
        if (!powerUps.find((p) => p.id === pu.id)) {
          powerUps.push(pu);
        }
      });
    } catch (e) {
      console.error("powerUpSpawned handler error", e, msg);
    }
  });

  // ✅ Power-up collected handler
  safeOn("powerUpCollected", (msg) => {
    try {
      if (!msg) return;
      console.log(
        "[client] Power-up collected:",
        msg.puType,
        "by",
        msg.playerId,
      );

      // Find the power-up position for the flash effect before removing it
      const collected = powerUps.find((pu) => pu.id === msg.powerUpId);

      // Remove from map immediately
      powerUps = powerUps.filter((pu) => pu.id !== msg.powerUpId);

      // ✅ Spawn a visual pickup flash at the collection position
      if (collected && typeof document !== "undefined") {
        const flashId = `flash-${collected.id}`;
        pickupFlashes.push({
          id: flashId,
          x: collected.x,
          y: collected.y,
          type: msg.puType,
          startTime: Date.now(),
          duration: 400,
        });
        setTimeout(() => {
          pickupFlashes = pickupFlashes.filter((f) => f.id !== flashId);
        }, 450);
      }

      // Update player stats
      if (msg.playerStats) {
        players = players.map((p) => {
          if (p.id === msg.playerId) {
            return {
              ...p,
              lives:
                msg.playerStats.lives !== undefined
                  ? msg.playerStats.lives
                  : p.lives,
              maxBombs: msg.playerStats.maxBombs,
              bombRange: msg.playerStats.bombRange,
              speed: msg.playerStats.speed,
              wallpass: msg.playerStats.wallpass,
              detonator: msg.playerStats.detonator,
              vestActive: msg.playerStats.vestActive || false,
              invincibleUntil:
                msg.playerStats.invincibleUntil || p.invincibleUntil,
              skullEffect: msg.playerStats.skullEffect || null,
              skullUntil: msg.playerStats.skullUntil || null,
              invisible: msg.playerStats.invisible || false,
            };
          }
          return p;
        });
      }

      // ✅ Update score on power-up collection
      if (msg.scoreBonus && msg.playerId === localPlayerId) {
        score += msg.scoreBonus;
      }
    } catch (e) {
      console.error("powerUpCollected handler error", e, msg);
    }
  });

  // ✅ Power-up destroyed by explosion handler
  safeOn("powerUpDestroyed", (msg) => {
    try {
      if (!msg || !Array.isArray(msg.powerUpIds)) return;
      console.log("[client] Power-ups destroyed:", msg.powerUpIds);
      const destroyedSet = new Set(msg.powerUpIds);
      powerUps = powerUps.filter((pu) => !destroyedSet.has(pu.id));
    } catch (e) {
      console.error("powerUpDestroyed handler error", e, msg);
    }
  });

  // ✅ Vest expired handler
  safeOn("vestExpired", (msg) => {
    try {
      if (!msg) return;
      console.log("[client] Vest expired for:", msg.playerId);
      players = players.map((p) => {
        if (p.id === msg.playerId) {
          return { ...p, vestActive: false };
        }
        return p;
      });
    } catch (e) {
      console.error("vestExpired handler error", e, msg);
    }
  });

  // ✅ Skull expired handler
  safeOn("skullExpired", (msg) => {
    try {
      if (!msg) return;
      console.log(
        "[client] Skull expired for:",
        msg.playerId,
        "effect:",
        msg.effect,
      );
      players = players.map((p) => {
        if (p.id === msg.playerId) {
          return {
            ...p,
            skullEffect: null,
            skullUntil: null,
            invisible: false,
          };
        }
        return p;
      });
    } catch (e) {
      console.error("skullExpired handler error", e, msg);
    }
  });

  // ✅ Skull contagion handler
  safeOn("skullContagion", (msg) => {
    try {
      if (!msg) return;
      console.log(
        "[client] Skull contagion:",
        msg.fromPlayerId,
        "→",
        msg.toPlayerId,
        msg.effect,
      );
      players = players.map((p) => {
        if (p.id === msg.toPlayerId) {
          return {
            ...p,
            skullEffect: msg.effect,
            skullUntil: Date.now() + 10000,
            invisible: msg.effect === "invisible",
          };
        }
        if (p.id === msg.fromPlayerId) {
          return {
            ...p,
            skullEffect: null,
            skullUntil: null,
            invisible: false,
          };
        }
        return p;
      });
    } catch (e) {
      console.error("skullContagion handler error", e, msg);
    }
  });

  // ✅ Player hit handler — update lives & invincibility
  safeOn("playerHit", (msg) => {
    try {
      if (!msg) return;
      console.log("[client] Player hit:", msg.playerId, "lives:", msg.lives);
      players = players.map((p) => {
        if (p.id === msg.playerId) {
          return {
            ...p,
            lives: msg.lives,
            invincibleUntil: msg.invincibleUntil,
          };
        }
        return p;
      });
    } catch (e) {
      console.error("playerHit handler error", e, msg);
    }
  });

  // ✅ Player death handler
  safeOn("playerDeath", (msg) => {
    try {
      if (!msg) return;
      console.log("[client] Player died:", msg.playerId, msg.pseudo);
      players = players.map((p) => {
        if (p.id === msg.playerId) {
          return { ...p, dead: true, lives: 0 };
        }
        return p;
      });

      // ✅ If local player died, show spectator overlay
      if (msg.playerId === localPlayerId) {
        showSpectatorOverlay();
      }
    } catch (e) {
      console.error("playerDeath handler error", e, msg);
    }
  });

  // ✅ In-game chat handler — receives messages from alive and dead players
  safeOn("gameChat", (msg) => {
    try {
      if (!msg || !msg.message) return;
      gameChatMessages.push(msg.message);
      // Cap at 100 client-side
      if (gameChatMessages.length > 100) gameChatMessages.shift();
      // Auto-scroll chat
      requestAnimationFrame(() => {
        const chatList = document.querySelector("[data-game-chat-list]");
        if (chatList) chatList.scrollTop = chatList.scrollHeight;
      });
    } catch (e) {
      console.error("gameChat handler error", e, msg);
    }
  });

  // ✅ Send in-game chat message
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

  // ✅ Handle in-game chat form submission
  function handleGameChatSubmit(ev) {
    ev.preventDefault();
    const input = document.getElementById("game-chat-input");
    if (!input) return;
    sendGameChat(input.value);
    input.value = "";
    input.blur();
    gameChatOpen = false;
  }

  // ✅ Spectator overlay — persistent DOM element (not in render loop)
  let _spectatorOverlayEl = null;
  function showSpectatorOverlay() {
    removeSpectatorOverlay();
    const vnode = SpectatorOverlay({ pseudo: localPseudo || "" });
    // We need to build DOM from the vnode manually since it's outside the render loop
    const el = document.createElement("div");
    el.id = "spectator-overlay-wrapper";
    el.innerHTML = ""; // will be populated by render
    document.body.appendChild(el);
    _spectatorOverlayEl = el;

    // Use the framework's render to build the spectator overlay
    try {
      render(vnode, el, {});
    } catch (e) {
      // Fallback: simple HTML
      el.innerHTML = `
        <div style="position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:10040;
          font-family:'Press Start 2P',monospace;text-align:center;pointer-events:none;">
          <div style="background:rgba(80,20,20,0.92);border:2px solid rgba(255,80,80,0.6);
            border-radius:12px;padding:10px 24px;box-shadow:0 4px 24px rgba(255,60,60,0.3);">
            <div style="font-size:14px;color:#ff6b6b;margin-bottom:4px;">☠ ÉLIMINÉ</div>
            <div style="font-size:8px;color:#ffaa88;">Mode spectateur — Entrée pour discuter</div>
          </div>
          <div style="margin-top:6px;font-size:8px;color:#ff9944;background:rgba(255,153,68,0.15);
            border:1px solid rgba(255,153,68,0.5);border-radius:8px;padding:4px 14px;display:inline-flex;
            align-items:center;gap:6px;">👻 MODE SPECTATEUR</div>
        </div>`;
    }

    // Fade in animation
    el.style.opacity = "0";
    el.style.transition = "opacity 0.5s ease";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (el) el.style.opacity = "1";
      });
    });
  }

  function removeSpectatorOverlay() {
    if (_spectatorOverlayEl) {
      _spectatorOverlayEl.remove();
      _spectatorOverlayEl = null;
    }
    const old = document.getElementById("spectator-overlay-wrapper");
    if (old) old.remove();
  }

  // ✅ Game win handler — creates a persistent overlay (not in the render loop)
  let _winOverlayEl = null;
  function showWinOverlay(winner) {
    removeWinOverlay();
    const isDraw = !winner.id && !winner.pseudo && !winner.winningTeam;
    const isTeamWin = !!winner.winningTeam;
    const isLocalWinner = !isDraw && !isTeamWin && winner.id === localPlayerId;
    // For team win, check if local player was on the winning team
    const localPlayer = players.find((p) => p.id === localPlayerId);
    const isLocalTeamWin =
      isTeamWin &&
      localPlayer &&
      (localPlayer.team || 0) === winner.winningTeam;

    const borderColor = isDraw
      ? "#ffaa33"
      : isLocalWinner || isLocalTeamWin
        ? "#3be6aa"
        : "#ff5555";
    const glowColor = isDraw
      ? "rgba(255,170,50,0.4)"
      : isLocalWinner || isLocalTeamWin
        ? "rgba(59,230,170,0.5)"
        : "rgba(255,85,85,0.4)";
    const textColor = isDraw
      ? "#ffaa33"
      : isLocalWinner || isLocalTeamWin
        ? "#3be6aa"
        : "#ff5555";

    let titleText, subText;
    if (isDraw) {
      titleText = "⏰ DRAW!";
      subText = "Time's up \u2014 nobody wins!";
    } else if (isTeamWin) {
      // Import team info dynamically for display
      const teamNames = { 1: "Alpha", 2: "Beta" };
      const teamLabels = { 1: "α", 2: "β" };
      const teamName =
        teamNames[winner.winningTeam] || `Team ${winner.winningTeam}`;
      titleText = isLocalTeamWin
        ? "\uD83C\uDFC6 TEAM VICTORY! \uD83C\uDFC6"
        : "GAME OVER";
      subText = `Team ${teamName} (${teamLabels[winner.winningTeam] || "?"}) wins!`;
    } else if (isLocalWinner) {
      titleText = "\uD83C\uDFC6 VICTORY! \uD83C\uDFC6";
      subText = winner.pseudo ? `${winner.pseudo} wins!` : "You win!";
    } else {
      titleText = "GAME OVER";
      subText = winner.pseudo
        ? `${winner.pseudo} wins!`
        : "Draw \u2014 no winner!";
    }

    const overlay = document.createElement("div");
    overlay.id = "game-win-overlay";
    overlay.style.cssText = `
      position:fixed; top:0; left:0; right:0; bottom:0;
      z-index:11000; display:flex; align-items:center; justify-content:center;
      background:rgba(0,0,0,0); pointer-events:none;
      font-family:'Press Start 2P',monospace;
      transition: background 0.5s ease;
    `;
    overlay.innerHTML = `
      <div style="
        text-align:center; padding:32px 48px; border-radius:16px;
        background:linear-gradient(135deg,rgba(16,32,24,0.95) 0%,rgba(32,48,36,0.95) 100%);
        border:3px solid ${borderColor};
        box-shadow:0 0 40px ${glowColor};
        transform:scale(0.8); opacity:0;
        transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease;
      ">
        <div style="font-size:24px; color:${textColor}; margin-bottom:12px; text-shadow:0 0 20px ${textColor}88;">
          ${titleText}
        </div>
        <div style="font-size:14px; color:#cfeedd;">
          ${subText}
        </div>
        <div style="font-size:8px; color:#8fc; margin-top:12px; opacity:0.7;">
          Returning to lobby...
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    _winOverlayEl = overlay;

    // Animate in after a frame (double rAF for reliable CSS transition trigger)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!_winOverlayEl || _winOverlayEl !== overlay) return; // already removed
        overlay.style.background = "rgba(0,0,0,0.65)";
        overlay.style.pointerEvents = "auto";
        const box = overlay.querySelector("div");
        if (box) {
          box.style.transform = "scale(1)";
          box.style.opacity = "1";
        }
      });
    });
  }

  function removeWinOverlay() {
    if (_winOverlayEl) {
      _winOverlayEl.remove();
      _winOverlayEl = null;
    }
    // Also remove any stale overlays
    const old = document.getElementById("game-win-overlay");
    if (old) old.remove();
  }

  safeOn("gameWin", (msg) => {
    try {
      if (!msg) return;
      console.log(
        "[client] Game won by:",
        msg.winnerPseudo || msg.winningTeam || "nobody",
      );
      gameWinner = {
        id: msg.winnerId,
        pseudo: msg.winnerPseudo,
        winningTeam: msg.winningTeam || null,
      };
      clearCountdown();
      if (endTimer == null) startEndTimer();
      // Show persistent overlay
      showWinOverlay(gameWinner);
    } catch (e) {
      console.error("gameWin handler error", e, msg);
    }
  });

  safeOn("gameOver", () => {
    try {
      clearCountdown();
      if (endTimer == null) startEndTimer();
    } catch (e) {
      console.error("gameOver handler error", e);
    }
  });

  safeOn("scoreUpdate", (s) => {
    if (typeof s.score === "number") score = s.score;
  });

  safeOn("highscoreUpdate", (h) => {
    if (typeof h.highscore === "number") highscore = h.highscore;
  });

  function renderState() {
    try {
      if (!started) return;
      const nowTs =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const dt = Math.max(1, nowTs - lastTs);
      fps = Math.round(1000 / dt);
      lastTs = nowTs;

      // ✅ Update animations for all players
      players.forEach((player) => {
        const pid = player.id;

        // Update local player animation
        if (pid === localPlayerId) {
          updatePlayerAnimation(player, inputState);
        }
        // Update remote player animation
        else if (remoteInputState[pid]) {
          updatePlayerAnimation(player, remoteInputState[pid]);
        }
      });

      const gameVNode = GameView({
        map,
        players,
        bombs, // ✅ Pass bombs
        explosions, // ✅ Pass explosions
        destroyingBlocks, // ✅ Pass block destruction animations
        powerUps, // ✅ Pass power-ups
        pickupFlashes, // ✅ Pass pickup flash effects
        cellSize,
        playerScale,
        tilesetUrl: opts.tilesetUrl || "./assets/images/TileSets.png",
        playerSpriteUrl:
          opts.playerSpriteUrl || "./assets/images/PlayerTest.png",
        powerUpSpriteUrl: "./assets/images/PowerUps.png",
        tileSrcSize,
        tilesPerRow: opts.tilesPerRow || tilesPerRow,
        debug: !!opts.debug,
        debugCollision: !!opts.debugCollision,
        showCollisionOverlays: opts.showCollisionOverlays !== false,
        collisionColors: opts.collisionColors || undefined,
        localPlayerId,
        gameMode, // ✅ Pass game mode
      });

      const hudVNode = HUD({
        score,
        countdown,
        highscore,
        endTimer,
        fps,
        players,
        gameWinner,
        localPlayerId,
        gameMode, // ✅ Pass game mode
      });

      // ✅ In-game chat component (always visible — alive players and spectators)
      const localPlayer = players.find((p) => p.id === localPlayerId);
      const isSpectator = !!(localPlayer && localPlayer.dead);
      const gameChatVNode = GameChat({
        messages: gameChatMessages,
        nickname: localPseudo || "",
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
        console.error("render failed:", e, { map, players });
      }
    } catch (err) {
      console.error("renderState error:", err);
    }
  }

  let _stopped = false; // ✅ Flag to break out of the render loop

  attachInputListeners();

  (function loop() {
    if (_stopped) return; // ✅ Stop the render loop when game is stopped
    try {
      renderState();
    } catch (e) {}
    requestAnimationFrame(loop);
  })();

  return {
    stop() {
      _stopped = true; // ✅ Break the render loop
      try {
        clearCountdown();
        clearEndTimer();
        removeWinOverlay(); // ✅ Remove persistent win overlay from document.body
        removeSpectatorOverlay(); // ✅ Remove spectator overlay
        bombs = [];
        explosions = [];
        destroyingBlocks = [];
        powerUps = [];
        pickupFlashes = [];
        gameChatMessages = [];
        gameChatOpen = false;
        gameWinner = null;
      } catch (e) {}
      started = false;
      detachInputListeners();
      removeAllSocketHandlers(); // ✅ Clean up all socket event handlers
    },
  };
}
