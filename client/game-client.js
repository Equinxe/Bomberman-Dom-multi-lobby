// client/game-client.js
// Réception et application en temps réel des inputs distants (relay server -> playerInput)
// Le serveur gère TOUS les mouvements avec collision - pas de prédiction côté client
import { render } from "../Core/dom.js";
import { GameView } from "../ui/views/GameView.js";
import { HUD } from "../ui/components/Hud.js";

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

  // ---------- helpers & RNG ----------
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRngFromSeed(seed) {
    if (typeof seed === "number") return mulberry32(seed >>> 0);
    const s = String(seed ?? "0");
    const hfn = xmur3(s);
    const seedNum = hfn();
    return mulberry32(seedNum);
  }

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

  function generateMapFromSeed(
    cols = 15,
    rows = 13,
    seed = null,
    options = {},
  ) {
    const destructibleProb =
      typeof options.destructibleProb === "number"
        ? options.destructibleProb
        : (opts.destructibleProb ?? 0.42);
    const borderThickness =
      typeof options.borderThickness === "number" ? options.borderThickness : 1;
    const patternSpacing =
      typeof options.patternSpacing === "number" ? options.patternSpacing : 2;
    const patternOffset =
      typeof options.patternOffset === "number" ? options.patternOffset : 1;

    let finalSeed = seed;
    if (!finalSeed) {
      try {
        finalSeed = safeLocalStorage && safeLocalStorage.getItem("MAP_SEED");
      } catch (e) {
        finalSeed = null;
      }
    }
    if (!finalSeed)
      finalSeed = String(Date.now()) + "-" + Math.floor(Math.random() * 1e6);

    const rng = makeRngFromSeed(finalSeed);

    const grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => "floor"),
    );

    const spawns = [
      { x: 1, y: 1, name: "TL" },
      { x: cols - 2, y: rows - 2, name: "BR" },
      { x: cols - 2, y: 1, name: "TR" },
      { x: 1, y: rows - 2, name: "BL" },
    ];
    const spawnOffsets = {
      TL: [
        [0, 0],
        [1, 0],
        [0, 1],
      ],
      TR: [
        [0, 0],
        [-1, 0],
        [0, 1],
      ],
      BR: [
        [0, 0],
        [-1, 0],
        [0, -1],
      ],
      BL: [
        [0, 0],
        [1, 0],
        [0, -1],
      ],
    };
    const reserved = new Set();
    for (let i = 0; i < spawns.length; i++) {
      const s = spawns[i];
      const offs = spawnOffsets[s.name] || [[0, 0]];
      for (const o of offs) {
        const rx = s.x + o[0];
        const ry = s.y + o[1];
        if (rx >= 0 && rx < cols && ry >= 0 && ry < rows)
          reserved.add(`${rx},${ry}`);
      }
    }
    function isReserved(x, y) {
      if (reserved.has(`${x},${y}`)) return true;
      if (
        (x <= 1 && y <= 1) ||
        (x >= cols - 2 && y <= 1) ||
        (x <= 1 && y >= rows - 2) ||
        (x >= cols - 2 && y >= rows - 2)
      )
        return true;
      return false;
    }

    for (let t = 0; t < borderThickness; t++) {
      const topY = t;
      const bottomY = rows - 1 - t;
      for (let x = 0; x < cols; x++) {
        grid[topY][x] = "wall";
        grid[bottomY][x] = "wall";
      }
      const leftX = t;
      const rightX = cols - 1 - t;
      for (let y = 0; y < rows; y++) {
        grid[y][leftX] = "wall";
        grid[y][rightX] = "wall";
      }
    }

    const start = borderThickness + patternOffset;
    for (let y = start; y < rows - borderThickness; y++) {
      for (let x = start; x < cols - borderThickness; x++) {
        if (isReserved(x, y)) continue;
        if (
          (x - start) % patternSpacing === 0 &&
          (y - start) % patternSpacing === 0
        ) {
          grid[y][x] = "wall";
        }
      }
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] !== "floor") continue;
        if (isReserved(x, y)) continue;
        const r = rng();
        if (r < destructibleProb) grid[y][x] = "block";
      }
    }

    return {
      grid,
      width: cols,
      height: rows,
      cellSize: tileSrcSize,
      seed: finalSeed,
    };
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
      out.color = typeof out.color === "number" ? out.color : (i % 6) + 1;
      return out;
    });
  }

  // ---------- countdown / timers ----------
  function startCountdown(initial = 600) {
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
  function safeOn(eventName, handler) {
    try {
      if (socket && typeof socket.on === "function") {
        socket.on(eventName, (payload) => {
          try {
            handler(payload);
          } catch (err) {
            console.error(
              `[attachClientGame] handler ${eventName} error:`,
              err,
              payload,
            );
          }
        });
      }
    } catch (e) {
      console.error("safeOn error", e);
    }
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

  // ✅ PAS DE MOUVEMENT OPTIMISTE LOCAL - Le serveur gère tout
  function applyLocalMovement(dtMs) {
    return;
  }

  safeOn("gameStart", (payload) => {
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

      score = 0;
      highscore = payload.highscore ?? highscore;
      const initial =
        typeof payload.initialCountdown === "number"
          ? payload.initialCountdown
          : 10;
      startCountdown(initial);
      clearEndTimer();
      endTimer = null;
      started = true;
      localPseudo =
        payload.localPseudo ||
        localPseudo ||
        (typeof window !== "undefined" && window.__LOCAL_NICKNAME) ||
        localPseudo;
    } catch (e) {
      console.error("Error handling gameStart:", e, payload);
    }
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
          return { ...pl, id: p.id, x: p.x, y: p.y };
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
          const bombId = msg.bomb.id;
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
        cellSize,
        playerScale,
        tilesetUrl: opts.tilesetUrl || "./assets/images/TileSets.png",
        playerSpriteUrl: opts.playerSpriteUrl || "./assets/images/Players.png",
        tileSrcSize,
        tilesPerRow: opts.tilesPerRow || tilesPerRow,
        debug: !!opts.debug,
        debugCollision: !!opts.debugCollision,
        showCollisionOverlays: opts.showCollisionOverlays !== false,
        collisionColors: opts.collisionColors || undefined,
      });

      const hudVNode = HUD({
        score,
        countdown,
        highscore,
        endTimer,
        fps,
        players,
      });

      try {
        render({ tag: "div", children: [gameVNode, hudVNode] }, container, {});
      } catch (e) {
        console.error("render failed:", e, { map, players });
      }
    } catch (err) {
      console.error("renderState error:", err);
    }
  }

  attachInputListeners();

  (function loop() {
    try {
      renderState();
    } catch (e) {}
    requestAnimationFrame(loop);
  })();

  return {
    stop() {
      try {
        clearCountdown();
        clearEndTimer();
        bombs = [];
        explosions = [];
        destroyingBlocks = [];
      } catch (e) {}
      started = false;
      detachInputListeners();
    },
  };
}
