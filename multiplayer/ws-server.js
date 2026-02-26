// multiplayer/ws-server.js
// HTTP static file server + WebSocket server.
// Serves the game at http://localhost:3000 and handles WS on the same port.

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

import WebSocket, { WebSocketServer } from "ws";
import {
  lobbys,
  ensureLobby,
  exitToLobby,
  handlePlayerLeave,
} from "../server/lobby/lobby-manager.js";
import {
  lobbyPayload,
  now,
  randLobbyCode,
} from "../server/lobby/lobby-state.js";
import { handleInput } from "../server/game/input-handler.js";
import { TEAMS, TEAM_MAX_PLAYERS, GAME_MODES } from "../shared/constants.js";

// ── Static file server ──
const __dirname = fileURLToPath(new URL("..", import.meta.url)); // project root
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const httpServer = createServer((req, res) => {
  // Strip query strings first
  let filePath = (req.url || "/").split("?")[0];
  // Default to index.html
  if (filePath === "/") filePath = "/index.html";
  // Decode URI components (e.g. %20 → space)
  filePath = decodeURIComponent(filePath);
  const fullPath = join(__dirname, filePath);

  // Security: prevent path traversal outside project root
  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("403 Forbidden");
    return;
  }

  if (!existsSync(fullPath) || statSync(fullPath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
    return;
  }

  const ext = extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  try {
    const data = readFileSync(fullPath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch (err) {
    console.error("[http] Error reading file:", fullPath, err.message);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("500 Internal Server Error");
  }
});

httpServer.listen(PORT, () => {
  console.log(`\n  🎮  Bomberman DOM is running!\n`);
  console.log(`  ➜  Local:   http://localhost:${PORT}/`);
  console.log(`  ➜  Network: http://${getLocalIP()}:${PORT}/\n`);
});

// ── WebSocket server (attached to the same HTTP server) ──
const wss = new WebSocketServer({ server: httpServer });

/** Return the machine's LAN IP so other computers can connect. */
function getLocalIP() {
  try {
    const nets = networkInterfaces();
    for (const iface of Object.values(nets)) {
      for (const cfg of iface) {
        if (cfg.family === "IPv4" && !cfg.internal) return cfg.address;
      }
    }
  } catch {}
  return "localhost";
}

/**
 * Broadcast a payload to all clients in a specific lobby.
 */
export function broadcast(code, payload) {
  let msg;
  try {
    msg = JSON.stringify(payload, (key, value) => {
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

/**
 * Broadcast the global online player count to all connected clients.
 */
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

function boundExitToLobby(code) {
  exitToLobby(code, broadcast);
}

// Connection handler
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

    // Route by message type
    switch (data.type) {
      case "join":
        handleJoin(ws, id, data);
        return;

      case "exitToLobby":
        boundExitToLobby(ws.lobbyCode);
        return;

      case "chat":
        handleChat(ws, id, data);
        return;

      case "gameChat":
        handleGameChat(ws, id, data);
        return;

      case "ready":
        handleReady(ws, id);
        return;

      case "color":
        handleColor(ws, id, data);
        return;

      case "team":
        handleTeam(ws, id, data);
        return;

      case "gameMode":
        handleGameMode(ws, id, data);
        return;

      case "input":
        handleInputMsg(ws, id, data);
        return;

      case "create":
        ws.emit?.(
          "message",
          JSON.stringify({ ...data, type: "join", create: true }),
        );
        return;

      default:
        ws.send(
          JSON.stringify({ type: "error", message: "Unknown message type" }),
        );
    }
  });

  ws.on("close", () => {
    const code = ws.lobbyCode;
    if (!code || !lobbys[code]) {
      broadcastPlayerCountAll();
      return;
    }

    handlePlayerLeave(code, id, broadcast);
    broadcastPlayerCountAll();
  });
});

// Message handlers

function handleJoin(ws, id, data) {
  let code = data.lobbyCode;
  if (data.create || !code) {
    code = randLobbyCode();
    ws.lobbyCode = code;
    ensureLobby(ws.lobbyCode, broadcast, boundExitToLobby);
  } else {
    ws.lobbyCode = code;
    if (!lobbys[code]) {
      ws.send(
        JSON.stringify({ type: "error", message: "Ce lobby n'existe pas." }),
      );
      return;
    }
  }

  const lobby = ensureLobby(ws.lobbyCode, broadcast, boundExitToLobby);
  lobby.code = ws.lobbyCode;

  if (
    lobby.players.some((p) => p.id === id) ||
    lobby.queue.some((q) => q.id === id)
  ) {
    return;
  }

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
        gameMode: lobby.gameMode,
        owner: lobby.owner,
      }),
    );
    lobby.chat.push({
      system: true,
      text: `${data.pseudo} est en attente pour rejoindre le lobby`,
      time: now(),
    });
    broadcast(ws.lobbyCode, lobbyPayload(lobby));
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
    team: TEAMS.NONE,
  };
  lobby.players.push(player);

  if (!lobby.owner) lobby.owner = id;
  ws.playerId = id;

  player._inputState = { left: false, right: false, up: false, down: false };
  player._moveInterval = null;

  lobby.chat.push({
    system: true,
    text: `${data.pseudo} a rejoint le lobby`,
    time: now(),
  });

  broadcast(ws.lobbyCode, lobbyPayload(lobby));
  if (lobby.timer) lobby.timer.evaluate();
}

function handleChat(ws, id, data) {
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
  broadcast(code, lobbyPayload(lobby));
}

function handleGameChat(ws, id, data) {
  const code = ws.lobbyCode;
  const lobby = lobbys[code];
  if (!lobby || lobby.state !== "in-game") return;
  const p = lobby.players.find((p) => p.id === id);
  if (!p) return;
  const text = (data.text || "").trim().slice(0, 120);
  if (!text) return;

  const msg = {
    author: p.pseudo,
    text,
    time: now(),
    spectator: !!p.dead,
  };

  if (!lobby.gameChat) lobby.gameChat = [];
  lobby.gameChat.push(msg);
  if (lobby.gameChat.length > 100) lobby.gameChat.shift();

  broadcast(code, { type: "gameChat", message: msg });
}

function handleReady(ws, id) {
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
  broadcast(code, lobbyPayload(lobby));
  if (lobby.timer) lobby.timer.evaluate();
}

function handleColor(ws, id, data) {
  const code = ws.lobbyCode;
  const lobby = lobbys[code];
  if (!lobby) return;
  const p = lobby.players.find((p) => p.id === id);
  if (p && typeof data.color === "number") {
    p.color = data.color;
  }
  broadcast(code, lobbyPayload(lobby));
}

function handleTeam(ws, id, data) {
  const code = ws.lobbyCode;
  const lobby = lobbys[code];
  if (!lobby) return;
  const p = lobby.players.find((p) => p.id === id);
  if (!p) return;
  const teamId = typeof data.team === "number" ? data.team : TEAMS.NONE;

  if (teamId !== TEAMS.NONE && teamId !== TEAMS.ALPHA && teamId !== TEAMS.BETA)
    return;

  if (teamId !== TEAMS.NONE) {
    const teamCount = lobby.players.filter(
      (pl) => pl.id !== p.id && pl.team === teamId,
    ).length;
    if (teamCount >= TEAM_MAX_PLAYERS) {
      ws.send(
        JSON.stringify({ type: "error", message: "Cette équipe est pleine !" }),
      );
      return;
    }
  }

  p.team = teamId;
  broadcast(code, lobbyPayload(lobby));
}

function handleGameMode(ws, id, data) {
  const code = ws.lobbyCode;
  const lobby = lobbys[code];
  if (!lobby) return;
  if (lobby.owner !== id) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Seul le créateur du lobby peut changer le mode.",
      }),
    );
    return;
  }
  if (lobby.state !== "lobby") return;
  const newMode = data.gameMode;
  if (newMode !== GAME_MODES.FFA && newMode !== GAME_MODES.TEAM) return;
  if (lobby.gameMode === newMode) return;

  lobby.gameMode = newMode;
  lobby.players.forEach((p) => {
    p.team = TEAMS.NONE;
  });

  const modeLabel = newMode === GAME_MODES.TEAM ? "Équipe 2v2" : "Free for All";
  lobby.chat.push({
    system: true,
    text: `⚙ Mode de jeu changé : ${modeLabel}`,
    time: now(),
  });

  broadcast(code, lobbyPayload(lobby));
}

function handleInputMsg(ws, id, data) {
  const code = ws.lobbyCode;
  const lobby = lobbys[code];
  if (!lobby) return;
  const playerId = ws.playerId || id;
  const player = lobby.players.find((p) => p.id === playerId);
  if (!player) {
    console.warn(
      `[ws-server] input received but player not found: ${playerId} in lobby ${code}`,
    );
    return;
  }

  const payload = data.payload || {};
  handleInput(lobby, player, payload, broadcast);
}
