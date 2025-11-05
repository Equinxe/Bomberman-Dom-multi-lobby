// multiplayer/server.js
// WebSocket server entrypoint for the multiplayer folder.
// Listens on ws://localhost:9001
// IMPORTANT: imports are relative to this file location (../server/...)
import WebSocket, { WebSocketServer } from "ws";
import { LobbyTimer } from "../server/lobby-timer.js";
import { startGameForLobby } from "../server/gameManager.js";

const wss = new WebSocketServer({ port: 9001 });

let lobbys = {}; // { code: { players: [], chat: [], queue: [], state: "lobby"|'in-game', timer: LobbyTimer, map } }

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
  const msg = JSON.stringify(payload);
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
    (c) => c.readyState === WebSocket.OPEN
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
      map: null, // optional map data if server-side provided later
    };

    // give the object its code
    lobbys[code].code = code;

    const broadcastForThisLobby = (type, payload = {}) => {
      broadcast(code, { type, ...payload });
    };

    const onStartGame = ({ reason, N, R, players }) => {
      console.log(
        `[lobby ${code}] onStartGame triggered: reason=${reason} N=${N} R=${R}`
      );
      const lobby = lobbys[code];
      if (!lobby) return;
      lobby.state = "in-game";
      try {
        // Start the game manager which broadcasts 'gameStart' to the lobby with a payload
        startGameForLobby(
          (type, payload) => broadcastForThisLobby(type, payload),
          code,
          lobby.players,
          code,
          {
            initialCountdown: 10,
            mapOptions: { destructibleProb: 0.42 },
          }
        );

        // initialize player positions if not set (spawn corners) using default map size
        const cols = (lobby.map && lobby.map.width) || 15;
        const rows = (lobby.map && lobby.map.height) || 13;
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
        });
      } catch (e) {
        console.error("Error calling startGameForLobby", e);
        broadcastForThisLobby("gameStart", { reason: "error_fallback", N, R });
      }
    };

    lobbys[code].timer = new LobbyTimer(
      broadcastForThisLobby,
      () => lobbys[code].players,
      onStartGame
    );
  }
  return lobbys[code];
}

function exitToLobby(code) {
  const lobby = lobbys[code];
  if (!lobby) return;
  if (lobby.timer) lobby.timer.clearTimer();
  lobby.state = "lobby";
  lobby.players.forEach((p) => (p.ready = false));
  lobby.chat.push({
    system: true,
    text: `Retour au lobby demandé — la partie est réinitialisée.`,
    time: now(),
  });

  // clear any running move intervals for players in this lobby
  lobby.players.forEach((p) => {
    if (p._moveInterval) {
      clearInterval(p._moveInterval);
      p._moveInterval = null;
    }
    p._inputState = { left: false, right: false, up: false, down: false };
  });

  broadcast(code, {
    type: "lobby",
    players: lobby.players,
    chat: lobby.chat,
    queue: lobby.queue.map((q) => q.pseudo),
    code,
  });
}

// ------------------ Per-player movement relay (server-side integration) ------------------

// We'll create per-player movement intervals: when a keydown arrives, start an interval
// that integrates position at MOVE_HZ and broadcasts updated position to lobby.
// Stop the interval when no movement keys are active.
const MOVE_HZ = 60; // updates per second for each moving player
const MOVE_INTERVAL_MS = Math.round(1000 / MOVE_HZ);
const SPEED_CELLS_PER_SEC = 4; // how many tiles per second the player moves (same as client)

// helper to start per-player movement interval
function startPlayerMoveInterval(lobby, player) {
  if (player._moveInterval) return;
  console.log(
    `[server] starting move interval for player ${player.id} in lobby ${lobby.code}`
  );
  player._moveInterval = setInterval(() => {
    // ensure lobby/map sizes
    const cols = (lobby.map && lobby.map.width) || 15;
    const rows = (lobby.map && lobby.map.height) || 13;
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
      // nothing to do
      return;
    }
    const dt = MOVE_INTERVAL_MS / 1000;
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    const nx = vx / len;
    const ny = vy / len;
    const moveX = nx * SPEED_CELLS_PER_SEC * dt;
    const moveY = ny * SPEED_CELLS_PER_SEC * dt;

    if (typeof player.x !== "number") player.x = 1;
    if (typeof player.y !== "number") player.y = 1;

    player.x = Math.max(0, Math.min(cols - 1, player.x + moveX));
    player.y = Math.max(0, Math.min(rows - 1, player.y + moveY));

    // broadcast only this player's new position to the lobby
    try {
      const payload = {
        type: "playerPosition",
        player: {
          id: player.id,
          pseudo: player.pseudo,
          x: player.x,
          y: player.y,
        },
        source: "server-move",
        ts: Date.now(),
      };
      // debug log
      console.log(
        `[server] broadcast playerPosition for ${player.id} (${
          player.pseudo
        }) -> x=${player.x.toFixed(3)}, y=${player.y.toFixed(3)} (lobby ${
          lobby.code
        })`
      );
      broadcast(lobby.code, payload);
    } catch (e) {
      console.error("[startPlayerMoveInterval] broadcast error", e);
    }
  }, MOVE_INTERVAL_MS);
}

function stopPlayerMoveInterval(player) {
  if (player._moveInterval) {
    console.log(`[server] stop move interval for player ${player.id}`);
    clearInterval(player._moveInterval);
    player._moveInterval = null;
  }
}

// ------------------ WebSocket connection handling ------------------

wss.on("connection", (ws) => {
  let id = Math.random().toString(36).slice(2);
  ws.id = id;
  ws.lobbyCode = null;
  ws.playerId = null; // will be set when joining as player

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
            JSON.stringify({ type: "error", message: "Ce lobby n'existe pas." })
          );
          return;
        }
      }

      const lobby = ensureLobby(ws.lobbyCode);
      lobby.code = ws.lobbyCode; // keep code for broadcast helper usage

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
            })
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

        const player = { id, pseudo: data.pseudo, color: 0, ready: false, ws };
        lobby.players.push(player);

        // associate ws with playerId for input handling
        ws.playerId = id;

        // initialize movement helpers
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
          `[server] input received but player not found: ${playerId} in lobby ${code}`
        );
        return;
      }

      const payload = data.payload || {};

      // only handle move/action payloads
      if (payload.type === "move" && typeof payload.dir === "string") {
        const dir = payload.dir;
        const active = !!payload.active;

        // ensure player's helper state exists
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

        // debug log
        console.log(
          `[server] input from ${playerId} dir=${dir} active=${active} (lobby ${code})`
        );

        // if any direction is active, ensure interval running
        const anyActive =
          player._inputState.left ||
          player._inputState.right ||
          player._inputState.up ||
          player._inputState.down;
        if (anyActive) {
          startPlayerMoveInterval(lobby, player);
        } else {
          // stop moving if nothing is pressed
          stopPlayerMoveInterval(player);
        }

        // Also broadcast the input to other clients (so they can animate locally if desired)
        broadcast(code, {
          type: "playerInput",
          playerId,
          payload,
          ts: Date.now(),
        });

        return;
      } else if (payload.type === "action") {
        // immediate action handling (e.g. placeBomb)
        broadcast(code, {
          type: "playerAction",
          playerId,
          action: payload.action,
          timestamp: Date.now(),
        });
        return;
      }

      return;
    }

    if (data.type === "create") {
      ws.emit?.(
        "message",
        JSON.stringify({ ...data, type: "join", create: true })
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
      // cleanup interval if any
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
