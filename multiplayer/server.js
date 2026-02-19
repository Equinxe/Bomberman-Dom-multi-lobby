// multiplayer/server.js
// WebSocket server entrypoint for the multiplayer folder.
// Listens on ws://localhost:9001
// IMPORTANT: imports are relative to this file location (../server/...)
import WebSocket, { WebSocketServer } from "ws";
import { LobbyTimer } from "../server/lobby-timer.js";
import { startGameForLobby, makeMapSeed } from "../server/gameManager.js";
import { resolveCollision, checkBombCollision } from "../server/collision.js";
import {
  placeBomb,
  checkBombExplosions,
  updateBombPlayerTracking,
  checkPowerUpPickup,
  detonateBombs,
  checkTimedEffects,
} from "../server/bomb.js";
import { generateMapFromSeed } from "../shared/map-generator.js";

const wss = new WebSocketServer({ port: 9001 });

let lobbys = {}; // { code: { players: [], chat: [], queue: [], state: "lobby"|'in-game', timer: LobbyTimer, map, bombs: [] } }

// ========== MAP GENERATION: imported from shared/map-generator.js ==========

function randLobbyCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function now() {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  return (
    pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds())
  );
}

/**
 * Broadcast a typed payload to all clients in the lobby identified by `code`.
 * `payload` should already include a `type` property.
 */
function broadcast(code, payload) {
  let msg;
  try {
    msg = JSON.stringify(payload, (key, value) => {
      // Skip non-serializable properties from player objects
      if (key === "ws" || key === "_moveInterval" || key === "_inputState")
        return undefined;
      if (value instanceof Set) return undefined;
      return value;
    });
  } catch (e) {
    console.error(
      "[broadcast] JSON.stringify failed:",
      e.message,
      "type:",
      payload?.type,
    );
    return;
  }
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.lobbyCode === code) {
      try {
        client.send(msg);
      } catch (e) {
        console.warn("broadcast send error to client", e);
      }
    }
  });
}

function broadcastPlayerCountAll() {
  const count = Array.from(wss.clients).filter(
    (c) => c.readyState === WebSocket.OPEN,
  ).length;
  const msg = JSON.stringify({ type: "playerCountAll", count });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(msg);
      } catch (e) {}
    }
  });
}

function ensureLobby(code) {
  if (!lobbys[code]) {
    lobbys[code] = {
      players: [],
      chat: [],
      queue: [],
      state: "lobby",
      timer: null,
      map: null,
      bombs: [], // ✅ Bombs array
      bombCheckInterval: null, // ✅ Bomb explosion check interval
    };

    lobbys[code].code = code;

    const broadcastForThisLobby = (type, payload = {}) => {
      broadcast(code, { type, ...payload });
    };

    const onStartGame = ({ reason, N, R, players }) => {
      console.log(
        `[lobby ${code}] onStartGame triggered: reason=${reason} N=${N} R=${R}`,
      );
      const lobby = lobbys[code];
      if (!lobby) return;
      lobby.state = "in-game";
      lobby.bombs = []; // ✅ Reset bombs on game start
      lobby.powerUps = []; // ✅ Reset power-ups on game start
      lobby._gameWinBroadcasted = false; // ✅ Reset win flag for new game

      try {
        // ✅ GENERATE MAP ON SERVER with unique seed from gameManager
        const mapSeed = makeMapSeed(code);
        const cols = 15;
        const rows = 13;

        // ✅ GENERATE ONCE on server
        lobby.map = generateMapFromSeed(cols, rows, mapSeed, {
          destructibleProb: 0.42,
          borderThickness: 1,
          patternSpacing: 2,
          patternOffset: 1,
        });

        console.log(`✅ [lobby ${code}] Map generated ONCE on server:`, {
          seed: mapSeed,
          width: lobby.map.width,
          height: lobby.map.height,
          gridSize: lobby.map.grid.length,
        });

        // ✅ Send the FULL map grid to clients (not just seed)
        startGameForLobby(
          (type, payload) => broadcastForThisLobby(type, payload),
          code,
          lobby.players,
          code,
          {
            initialCountdown: 300, // ✅ 5 minutes game timer (300 seconds)
            gameTimer: 300, // ✅ Explicit game timer for clarity
            mapGrid: lobby.map, // ✅ Send FULL grid
            mapSeed: mapSeed,
            mapOptions: { destructibleProb: 0.42 },
          },
        );

        // ✅ Helper: broadcast with automatic return-to-lobby on gameWin
        function broadcastWithWinCheck(type, payload) {
          broadcast(code, { type, ...payload });
          if (type === "gameWin" && !lobby._returnToLobbyScheduled) {
            lobby._returnToLobbyScheduled = true;
            console.log(`[lobby ${code}] Game won — returning to lobby in 5s`);
            setTimeout(() => {
              lobby._returnToLobbyScheduled = false;
              exitToLobby(code);
            }, 5000);
          }
        }
        // Store it on lobby so the detonate handler can use it
        lobby._broadcastWithWinCheck = broadcastWithWinCheck;

        // ✅ Start bomb check interval
        if (lobby.bombCheckInterval) {
          clearInterval(lobby.bombCheckInterval);
        }
        lobby.bombCheckInterval = setInterval(() => {
          checkBombExplosions(lobby, broadcastWithWinCheck);
          // ✅ Check timed effects (vest expiry, skull expiry/contagion/auto-bomb)
          checkTimedEffects(lobby, broadcastWithWinCheck);
        }, 100); // Check every 100ms

        // ✅ Start server-side game timer (5 minutes = 300s)
        lobby._gameStartTime = Date.now();
        lobby._gameDuration = 300 * 1000; // 5 minutes in ms
        if (lobby._gameTimerTimeout) clearTimeout(lobby._gameTimerTimeout);
        lobby._gameTimerTimeout = setTimeout(() => {
          if (!lobby || lobby.state !== "in-game") return;
          if (lobby._gameWinBroadcasted) return; // already won

          console.log(`[lobby ${code}] Game timer expired — draw!`);
          lobby._gameWinBroadcasted = true;
          lobby._isDraw = true; // ✅ Mark as draw so exitToLobby shows correct message
          broadcast(code, {
            type: "gameWin",
            winnerId: null,
            winnerPseudo: null,
          });

          if (!lobby._returnToLobbyScheduled) {
            lobby._returnToLobbyScheduled = true;
            setTimeout(() => {
              lobby._returnToLobbyScheduled = false;
              exitToLobby(code);
            }, 5000);
          }
        }, lobby._gameDuration);

        // initialize player positions at spawn corners
        const spawns = [
          { x: 1, y: 1 }, // TL
          { x: cols - 2, y: rows - 2 }, // BR
          { x: cols - 2, y: 1 }, // TR
          { x: 1, y: rows - 2 }, // BL
        ];
        lobby.players.forEach((p, idx) => {
          if (typeof p.x !== "number" || typeof p.y !== "number") {
            const s = spawns[idx % spawns.length];
            p.x = s.x;
            p.y = s.y;
          }
          // ensure movement helper fields
          p._inputState = p._inputState || {
            left: false,
            right: false,
            up: false,
            down: false,
          };
          p._moveInterval = p._moveInterval || null;

          // ✅ Initialize lives and death state
          p.lives = 3;
          p.dead = false;
          p.deathTime = null;
          p.invincibleUntil = Date.now() + 3000; // ✅ 3s spawn protection (vest-like effect)

          // ✅ Initialize power-up stats
          p.maxBombs = 1;
          p.bombRange = 3;
          p.speed = 4;
          p.wallpass = false;
          p.detonator = false;
          p.vestActive = false;
          p.vestUntil = null;
          p.skullEffect = null;
          p.skullUntil = null;
          p.autoBomb = false;
          p.invisible = false;
          delete p.canPlaceBombs;
          delete p._preSkull;
          delete p._lastAutoBomb;

          console.log(
            `[lobby ${code}] Player ${p.pseudo} spawned at (${p.x}, ${p.y}) with ${p.lives} lives`,
          );
        });
      } catch (e) {
        console.error("Error calling startGameForLobby", e);
        broadcastForThisLobby("gameStart", { reason: "error_fallback", N, R });
      }
    };

    lobbys[code].timer = new LobbyTimer(
      broadcastForThisLobby,
      () => lobbys[code].players,
      onStartGame,
    );
  }
  return lobbys[code];
}

function exitToLobby(code) {
  console.log(`[exitToLobby] Called for lobby ${code}`);
  const lobby = lobbys[code];
  if (!lobby) {
    console.log(`[exitToLobby] No lobby found for ${code}`);
    return;
  }
  if (lobby.timer) lobby.timer.clearTimer();

  // ✅ Clear bomb check interval
  if (lobby.bombCheckInterval) {
    clearInterval(lobby.bombCheckInterval);
    lobby.bombCheckInterval = null;
  }

  // ✅ Clear game timer
  if (lobby._gameTimerTimeout) {
    clearTimeout(lobby._gameTimerTimeout);
    lobby._gameTimerTimeout = null;
  }

  lobby.state = "lobby";
  lobby.bombs = []; // ✅ Clear bombs
  lobby.powerUps = []; // ✅ Clear power-ups
  lobby._gameWinBroadcasted = false; // ✅ Reset win flag for next game
  lobby._returnToLobbyScheduled = false; // ✅ Reset return-to-lobby flag

  // ✅ Find the winner before resetting state
  // If it was a draw (timer expired), show draw message even if players are alive
  let winnerText;
  if (lobby._isDraw) {
    winnerText = `⏰ Temps écoulé — match nul ! Personne ne gagne.`;
  } else {
    const winner = lobby.players.find((p) => !p.dead);
    const alivePlayers = lobby.players.filter((p) => !p.dead);
    if (alivePlayers.length === 1 && winner) {
      winnerText = `🏆 ${winner.pseudo} a gagné la partie !`;
    } else {
      winnerText = `La partie est terminée — match nul !`;
    }
  }
  lobby._isDraw = false; // Reset for next game

  lobby.players.forEach((p) => (p.ready = false));
  lobby.chat.push({
    system: true,
    text: winnerText,
    time: now(),
  });

  // clear any running move intervals for players in this lobby
  lobby.players.forEach((p) => {
    if (p._moveInterval) {
      clearInterval(p._moveInterval);
      p._moveInterval = null;
    }
    p._inputState = { left: false, right: false, up: false, down: false };
    // ✅ Reset lives/death state for next game
    p.lives = 3;
    p.dead = false;
    p.deathTime = null;
    p.invincibleUntil = null;
    // ✅ Reset power-up stats
    p.maxBombs = 1;
    p.bombRange = 3;
    p.speed = 4;
    p.wallpass = false;
    p.detonator = false;
    p.vestActive = false;
    p.vestUntil = null;
    p.skullEffect = null;
    p.skullUntil = null;
    p.autoBomb = false;
    p.invisible = false;
    delete p.canPlaceBombs;
    delete p._preSkull;
    delete p._lastAutoBomb;
    delete p.x;
    delete p.y;
  });

  console.log(
    `[exitToLobby] Broadcasting lobby event to ${lobby.players.length} player(s) in ${code}`,
  );
  broadcast(code, {
    type: "lobby",
    players: lobby.players,
    chat: lobby.chat,
    queue: lobby.queue.map((q) => q.pseudo),
    code,
  });
  console.log(`[exitToLobby] Done for lobby ${code}`);
}

// ------------------ Per-player movement relay (server-side integration) ------------------

const MOVE_HZ = 60; // updates per second for each moving player
const MOVE_INTERVAL_MS = Math.round(1000 / MOVE_HZ);
const SPEED_CELLS_PER_SEC = 4; // how many tiles per second the player moves (same as client)
const HITBOX_SIZE = 0.6; // ✅ Constant hitbox size for consistency

/**
 * Create a virtual map where blocks are treated as floor (for wallpass power-up)
 */
function getWallpassMap(map) {
  if (!map || !map.grid) return map;
  return {
    ...map,
    grid: map.grid.map((row) =>
      row.map((cell) => (cell === "block" ? "floor" : cell)),
    ),
  };
}

// helper to start per-player movement interval
function startPlayerMoveInterval(lobby, player) {
  if (player._moveInterval) return;
  console.log(
    `[server] starting move interval for player ${player.id} (${player.pseudo}) in lobby ${lobby.code}`,
  );

  player._moveInterval = setInterval(() => {
    // ✅ CHECK: Ensure map exists
    if (!lobby.map || !lobby.map.grid) {
      console.warn(
        `[server] No map for lobby ${lobby.code}, skipping movement`,
      );
      return;
    }

    const cols = lobby.map.width || 15;
    const rows = lobby.map.height || 13;
    const input = player._inputState || {
      left: false,
      right: false,
      up: false,
      down: false,
    };

    let vx = 0,
      vy = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;

    if (vx === 0 && vy === 0) {
      return;
    }

    const dt = MOVE_INTERVAL_MS / 1000;
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    const nx = vx / len;
    const ny = vy / len;
    // ✅ Use player's speed stat (modified by speed power-up)
    const playerSpeed = player.speed || SPEED_CELLS_PER_SEC;
    const moveX = nx * playerSpeed * dt;
    const moveY = ny * playerSpeed * dt;

    if (typeof player.x !== "number") player.x = 1;
    if (typeof player.y !== "number") player.y = 1;

    const oldX = player.x;
    const oldY = player.y;
    const newX = oldX + moveX;
    const newY = oldY + moveY;

    // ✅ Check bomb collision first
    if (checkBombCollision(lobby, player.id, newX, newY)) {
      return; // Blocked by bomb
    }

    // Apply collision detection
    // ✅ If player has wallpass, use a modified collision that ignores blocks
    const resolved = resolveCollision(
      player.wallpass ? getWallpassMap(lobby.map) : lobby.map,
      oldX,
      oldY,
      newX,
      newY,
      HITBOX_SIZE,
    );

    player.x = resolved.x;
    player.y = resolved.y;

    // Safety clamping
    player.x = Math.max(0.3, Math.min(cols - 0.7, player.x));
    player.y = Math.max(0.3, Math.min(rows - 0.7, player.y));

    // ✅ Update bomb player tracking
    updateBombPlayerTracking(lobby, player.id, player.x, player.y);

    // ✅ Check for power-up pickups
    checkPowerUpPickup(lobby, player, (type, payload) => {
      broadcast(lobby.code, { type, ...payload });
    });

    // Broadcast position
    try {
      const payload = {
        type: "playerPosition",
        player: {
          id: player.id,
          pseudo: player.pseudo,
          x: player.x,
          y: player.y,
          lives: player.lives,
          dead: player.dead,
          invincibleUntil: player.invincibleUntil,
          maxBombs: player.maxBombs,
          bombRange: player.bombRange,
          speed: player.speed,
          wallpass: player.wallpass,
          detonator: player.detonator,
          vestActive: player.vestActive || false,
          vestUntil: player.vestUntil || null,
          skullEffect: player.skullEffect || null,
          skullUntil: player.skullUntil || null,
          invisible: !!player.invisible,
        },
        source: "server-move",
        ts: Date.now(),
      };
      broadcast(lobby.code, payload);
    } catch (e) {
      console.error("[startPlayerMoveInterval] broadcast error", e);
    }
  }, MOVE_INTERVAL_MS);
}

function stopPlayerMoveInterval(player) {
  if (player._moveInterval) {
    console.log(
      `[server] stop move interval for player ${player.id} (${player.pseudo})`,
    );
    clearInterval(player._moveInterval);
    player._moveInterval = null;
  }
}

// ------------------ WebSocket connection handling ------------------

wss.on("connection", (ws) => {
  let id = Math.random().toString(36).slice(2);
  ws.id = id;
  ws.lobbyCode = null;
  ws.playerId = null;

  broadcastPlayerCountAll();

  ws.on("message", (raw) => {
    let data = {};
    try {
      data = JSON.parse(raw);
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    if (data.type === "join") {
      let code = data.lobbyCode;
      if (data.create || !code) {
        code = randLobbyCode();
        ws.lobbyCode = code;
        ensureLobby(ws.lobbyCode);
      } else {
        ws.lobbyCode = code;
        if (!lobbys[code]) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Ce lobby n'existe pas.",
            }),
          );
          return;
        }
      }

      const lobby = ensureLobby(ws.lobbyCode);
      lobby.code = ws.lobbyCode;

      if (
        !lobby.players.some((p) => p.id === id) &&
        !lobby.queue.some((q) => q.id === id)
      ) {
        if (lobby.players.length >= 4) {
          lobby.queue.push({ id, pseudo: data.pseudo });
          ws.send(
            JSON.stringify({
              type: "waiting",
              code: ws.lobbyCode,
              message: "Lobby complet, file d'attente...",
              queuePosition: lobby.queue.length,
              queue: lobby.queue.map((q) => q.pseudo),
              players: lobby.players,
              chat: lobby.chat,
            }),
          );
          lobby.chat.push({
            system: true,
            text: `${data.pseudo} est en attente pour rejoindre le lobby`,
            time: now(),
          });
          broadcast(ws.lobbyCode, {
            type: "lobby",
            players: lobby.players,
            chat: lobby.chat,
            queue: lobby.queue.map((q) => q.pseudo),
            code: ws.lobbyCode,
          });
          return;
        }

        const player = {
          id,
          pseudo: data.pseudo,
          color: 0,
          ready: false,
          ws,
          lives: 3,
          dead: false,
        };
        lobby.players.push(player);

        ws.playerId = id;

        player._inputState = {
          left: false,
          right: false,
          up: false,
          down: false,
        };
        player._moveInterval = null;

        lobby.chat.push({
          system: true,
          text: `${data.pseudo} a rejoint le lobby`,
          time: now(),
        });

        broadcast(ws.lobbyCode, {
          type: "lobby",
          players: lobby.players,
          chat: lobby.chat,
          queue: lobby.queue.map((q) => q.pseudo),
          code: ws.lobbyCode,
        });

        if (lobby && lobby.timer) lobby.timer.evaluate();
      }
      return;
    }

    if (data.type === "exitToLobby") {
      const code = ws.lobbyCode;
      exitToLobby(code);
      return;
    }

    if (data.type === "chat") {
      const code = ws.lobbyCode;
      const lobby = lobbys[code];
      if (!lobby) return;
      const p = lobby.players.find((p) => p.id === id);
      lobby.chat.push({
        system: false,
        author: p ? p.pseudo : "???",
        text: data.text,
        time: now(),
      });
      broadcast(code, {
        type: "lobby",
        players: lobby.players,
        chat: lobby.chat,
        queue: lobby.queue.map((q) => q.pseudo),
        code,
      });
      return;
    }

    if (data.type === "ready") {
      const code = ws.lobbyCode;
      const lobby = lobbys[code];
      if (!lobby) return;
      const p = lobby.players.find((p) => p.id === id);
      if (p) {
        p.ready = !p.ready;
        lobby.chat.push({
          system: true,
          text: `${p.pseudo} ${p.ready ? "est prêt" : "n'est plus prêt"}`,
          time: now(),
        });
      }
      broadcast(code, {
        type: "lobby",
        players: lobby.players,
        chat: lobby.chat,
        queue: lobby.queue.map((q) => q.pseudo),
        code,
      });
      if (lobby.timer) lobby.timer.evaluate();
      return;
    }

    if (data.type === "color") {
      const code = ws.lobbyCode;
      const lobby = lobbys[code];
      if (!lobby) return;
      const p = lobby.players.find((p) => p.id === id);
      if (p && typeof data.color === "number") {
        p.color = data.color;
      }
      broadcast(code, {
        type: "lobby",
        players: lobby.players,
        chat: lobby.chat,
        queue: lobby.queue.map((q) => q.pseudo),
        code,
      });
      return;
    }

    // ---- INPUT handling: update per-player input state & start/stop per-player movement interval ----
    if (data.type === "input") {
      const code = ws.lobbyCode;
      const lobby = lobbys[code];
      if (!lobby) return;
      const playerId = ws.playerId || id;
      const player = lobby.players.find((p) => p.id === playerId);
      if (!player) {
        console.warn(
          `[server] input received but player not found: ${playerId} in lobby ${code}`,
        );
        return;
      }

      const payload = data.payload || {};

      // ✅ Block input for dead players
      if (player.dead) {
        return;
      }

      if (payload.type === "move" && typeof payload.dir === "string") {
        const dir = payload.dir;
        const active = !!payload.active;

        player._inputState = player._inputState || {
          left: false,
          right: false,
          up: false,
          down: false,
        };

        if (dir === "left") player._inputState.left = active;
        else if (dir === "right") player._inputState.right = active;
        else if (dir === "up") player._inputState.up = active;
        else if (dir === "down") player._inputState.down = active;

        const anyActive =
          player._inputState.left ||
          player._inputState.right ||
          player._inputState.up ||
          player._inputState.down;
        if (anyActive) {
          startPlayerMoveInterval(lobby, player);
        } else {
          stopPlayerMoveInterval(player);
        }

        // Broadcast input state for UI feedback (not for movement)
        broadcast(code, {
          type: "playerInput",
          playerId,
          payload,
          ts: Date.now(),
        });

        return;
      } else if (payload.type === "action") {
        // ✅ Handle bomb placement
        if (payload.action === "placeBomb") {
          const bomb = placeBomb(lobby, player);
          if (bomb) {
            // Broadcast bomb placement to all players
            broadcast(code, {
              type: "bombPlaced",
              bomb: {
                id: bomb.id,
                x: bomb.x,
                y: bomb.y,
                playerId: bomb.playerId,
                placedAt: bomb.placedAt,
                explosionTime: bomb.explosionTime,
              },
              timestamp: Date.now(),
            });
          }
        } else if (payload.action === "detonate") {
          // ✅ Handle detonator power-up action (uses shared win-check broadcast)
          const winCheckBroadcast =
            lobby._broadcastWithWinCheck ||
            ((type, p) => broadcast(code, { type, ...p }));
          detonateBombs(lobby, player, winCheckBroadcast);
        } else {
          // Other actions
          broadcast(code, {
            type: "playerAction",
            playerId,
            action: payload.action,
            timestamp: Date.now(),
          });
        }
        return;
      }

      return;
    }

    if (data.type === "create") {
      ws.emit?.(
        "message",
        JSON.stringify({ ...data, type: "join", create: true }),
      );
      return;
    }

    ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
  });

  ws.on("close", () => {
    const code = ws.lobbyCode;
    if (!code) {
      broadcastPlayerCountAll();
      return;
    }
    const lobby = lobbys[code];
    if (!lobby) {
      broadcastPlayerCountAll();
      return;
    }

    const idx = lobby.players.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const leaving = lobby.players.splice(idx, 1)[0];
      lobby.chat.push({
        system: true,
        text: `${leaving.pseudo} a quitté le lobby`,
        time: now(),
      });
      stopPlayerMoveInterval(leaving);
    } else {
      const qidx = lobby.queue.findIndex((q) => q.id === id);
      if (qidx !== -1) {
        const waiting = lobby.queue.splice(qidx, 1)[0];
        lobby.chat.push({
          system: true,
          text: `${waiting.pseudo} a quitté la file d'attente`,
          time: now(),
        });
      }
    }

    broadcast(code, {
      type: "lobby",
      players: lobby.players,
      chat: lobby.chat,
      queue: lobby.queue.map((q) => q.pseudo),
      code,
    });
    if (lobby.timer) lobby.timer.evaluate();

    broadcastPlayerCountAll();
  });
});

console.log("WebSocket server listening on ws://localhost:9001");
