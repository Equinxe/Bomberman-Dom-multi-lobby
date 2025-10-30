// multiplayer/server.js
// WebSocket server entrypoint for the multiplayer folder.
// Listens on ws://localhost:9001
// IMPORTANT: imports are relative to this file location (../server/...)
import WebSocket, { WebSocketServer } from "ws";
import { LobbyTimer } from "../server/lobby-timer.js";
import { startGameForLobby } from "../server/gameManager.js";

const wss = new WebSocketServer({ port: 9001 });

let lobbys = {}; // { code: { players: [], chat: [], queue: [], state: "lobby"|'in-game', timer: LobbyTimer } }

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
    };

    const broadcastForThisLobby = (type, payload = {}) => {
      broadcast(code, { type, ...payload });
    };

    const onStartGame = ({ reason, N, R, players }) => {
      console.log(
        `[lobby ${code}] onStartGame triggered: reason=${reason} N=${N} R=${R}`
      );
      lobbys[code].state = "in-game";
      try {
        startGameForLobby(
          (type, payload) => broadcastForThisLobby(type, payload),
          code,
          lobbys[code].players,
          code,
          {
            initialCountdown: 10,
            mapOptions: { destructibleProb: 0.42 },
          }
        );
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
  broadcast(code, {
    type: "lobby",
    players: lobby.players,
    chat: lobby.chat,
    queue: lobby.queue.map((q) => q.pseudo),
    code,
  });
}

wss.on("connection", (ws) => {
  let id = Math.random().toString(36).slice(2);
  ws.id = id;
  ws.lobbyCode = null;

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
