// client/game-client.js
// Version mise à jour :
//  - respecte payload.mapSeed (si présent) pour obtenir une map différente à chaque gameStart
//  - réserve une zone "en L" autour de chaque spawn pour garantir un espace sûr au démarrage
//  - pattern indestructibles + destructibles seedés
import { render } from "../Core/dom.js";
import { GameView } from "../ui/gameView.js";
import { HUD } from "../ui/hud.js";

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
  let fps = 60;
  let lastTs =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  let cellSize = opts.cellSize || 24;
  let tileSrcSize = opts.tileSrcSize || 16;
  let tilesPerRow = opts.tilesPerRow || undefined;
  let started = false;
  let countdown = null;
  let countdownInterval = null;
  let endTimer = null;
  let endTimerInterval = null;
  let score = 0;
  let highscore = null;

  // ---- seeded RNG helpers (xmur3 + mulberry32) ----
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

  // ---- deterministic map generator (patterned indestructibles + seeded destructibles) ----
  // Improvements:
  //  - requires seed param (payload.mapSeed) for reproducible per-game maps
  //  - reserves an "L" shaped safe area around each spawn so players can place bomb and hide
  function generateMapFromSeed(
    cols = 15,
    rows = 13,
    seed = null,
    options = {}
  ) {
    const destructibleProb =
      typeof options.destructibleProb === "number"
        ? options.destructibleProb
        : opts.destructibleProb ?? 0.3;
    const borderThickness =
      typeof options.borderThickness === "number" ? options.borderThickness : 1;
    const patternSpacing =
      typeof options.patternSpacing === "number" ? options.patternSpacing : 2;
    const patternOffset =
      typeof options.patternOffset === "number" ? options.patternOffset : 1;

    // final seed: prefer explicit server seed; otherwise generate a unique fallback per load
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

    // build empty floor grid
    const grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => "floor")
    );

    // spawn positions (standard Bomberman corners)
    const spawns = [
      { x: 1, y: 1, name: "TL" },
      { x: cols - 2, y: rows - 2, name: "BR" },
      { x: cols - 2, y: 1, name: "TR" },
      { x: 1, y: rows - 2, name: "BL" },
    ];

    // For each spawn define the "L" offsets to reserve so the player can take cover:
    // TL: keep (0,0), (1,0), (0,1)
    // TR: keep (0,0), (-1,0), (0,1)
    // BR: keep (0,0), (-1,0), (0,-1)
    // BL: keep (0,0), (1,0), (0,-1)
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

    // build a set of reserved coordinates (as "x,y" strings) that must remain floor
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
      // reserved if in reserved set OR in the 2x2 canonical spawn area to be extra-safe
      if (reserved.has(`${x},${y}`)) return true;
      // also reserve canonical 2x2 spawn boxes to be safe
      if (
        (x <= 1 && y <= 1) ||
        (x >= cols - 2 && y <= 1) ||
        (x <= 1 && y >= rows - 2) ||
        (x >= cols - 2 && y >= rows - 2)
      )
        return true;
      return false;
    }

    // 1) Fill border with single 'wall' type
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

    // 2) Place interior indestructible blocks using a regular pattern (no RNG)
    // Start the pattern at 'start = borderThickness + patternOffset' to ensure spacing from the corner
    const start = borderThickness + patternOffset;
    for (let y = start; y < rows - borderThickness; y++) {
      for (let x = start; x < cols - borderThickness; x++) {
        if (isReserved(x, y)) continue; // never place permanent block on reserved spawn area
        if (
          (x - start) % patternSpacing === 0 &&
          (y - start) % patternSpacing === 0
        ) {
          grid[y][x] = "wall";
        }
      }
    }

    // 3) Place destructible blocks deterministically (seeded RNG).
    // Iterate row-major and use rng() so identical seed => identical placements.
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y][x] !== "floor") continue; // keep border + permanent blocks
        if (isReserved(x, y)) continue; // keep spawn areas clear
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

  function startCountdown(initial = 600) {
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
  }

  function normalizePlayers(raw, cols = 15, rows = 13) {
    if (!Array.isArray(raw)) return [];
    // spawn positions: TL, BR, TR, BL
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

  // safe socket on wrapper
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
              payload
            );
          }
        });
      }
    } catch (e) {
      console.error("safeOn error", e);
    }
  }

  // gameStart: use server-provided mapSeed (new seed each start) and server mapOptions if present
  safeOn("gameStart", (payload) => {
    try {
      const cols = (payload.map && payload.map.width) || opts.cols || 15;
      const rows = (payload.map && payload.map.height) || opts.rows || 13;
      players = normalizePlayers(payload.players || [], cols, rows);

      if (
        payload.map &&
        Array.isArray(payload.map.grid) &&
        payload.map.grid.length
      ) {
        map = payload.map;
      } else {
        const seed = payload.mapSeed || null; // server must send mapSeed
        const mapOptions = payload.mapOptions || {};
        const destructibleProb =
          mapOptions.destructibleProb ?? opts.destructibleProb ?? 0.3;
        map = generateMapFromSeed(cols, rows, seed, {
          destructibleProb,
          patternSpacing: mapOptions.patternSpacing ?? opts.patternSpacing ?? 2,
          patternOffset: mapOptions.patternOffset ?? opts.patternOffset ?? 1,
          borderThickness:
            mapOptions.borderThickness ?? opts.borderThickness ?? 1,
        });
      }

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
    } catch (e) {
      console.error("Error handling gameStart:", e, payload);
    }
  });

  safeOn("tickSnapshot", (snap) => {
    try {
      if (!snap) return;
      if (snap.map && Array.isArray(snap.map.grid) && snap.map.grid.length) {
        map = snap.map;
      } else if (snap.map || snap.mapSeed) {
        const cols = (snap.map && snap.map.width) || opts.cols || 15;
        const rows = (snap.map && snap.map.height) || opts.rows || 13;
        const seed = snap.mapSeed || null;
        const mapOptions = snap.mapOptions || {};
        const destructibleProb =
          mapOptions.destructibleProb ?? opts.destructibleProb ?? 0.3;
        map = generateMapFromSeed(cols, rows, seed, {
          destructibleProb,
          patternSpacing: mapOptions.patternSpacing ?? opts.patternSpacing ?? 2,
          patternOffset: mapOptions.patternOffset ?? opts.patternOffset ?? 1,
          borderThickness:
            mapOptions.borderThickness ?? opts.borderThickness ?? 1,
        });
      }
      if (Array.isArray(snap.players))
        players = normalizePlayers(
          snap.players,
          map.width || opts.cols || 15,
          map.height || opts.rows || 13
        );
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
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const dt = Math.max(1, now - lastTs);
      fps = Math.round(1000 / dt);
      lastTs = now;

      const gameVNode = GameView({
        map,
        players,
        cellSize,
        tilesetUrl: opts.tilesetUrl || "./assets/images/TileSets.png",
        playerSpriteUrl: opts.playerSpriteUrl || "./assets/images/Players.png",
        tileSrcSize,
        tilesPerRow: opts.tilesPerRow || tilesPerRow,
        debug: !!opts.debug,
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

  (function loop() {
    renderState();
    requestAnimationFrame(loop);
  })();

  return {
    stop() {
      try {
        clearCountdown();
        clearEndTimer();
      } catch (e) {}
      started = false;
    },
  };
}
