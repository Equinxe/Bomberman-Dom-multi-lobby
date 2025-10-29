import WebSocket, { WebSocketServer } from "ws";
import { LobbyTimer } from "../server/lobby-timer.js"; // integration du timer robuste

const wss = new WebSocketServer({ port: 9001 });

let lobbys = {}; // { code: { players: [], chat: [], queue: [], state: "lobby"|'starting'|'in-game', timers:{}, waitingValue, countdownValue, timer: LobbyTimer } }

const COLOR_NAMES = ["Blanc", "Noir", "Rouge", "Bleu", "Vert", "Jaune"];

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

function broadcast(code, data) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.lobbyCode === code) {
      client.send(JSON.stringify(data));
    }
  });
}

function broadcastPlayerCountAll() {
  const count = Array.from(wss.clients).filter(
    (c) => c.readyState === 1
  ).length;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: "playerCountAll", count }));
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
      timers: {},
      waitingValue: 0,
      countdownValue: 0,
      timer: null,
    };

    // broadcast function bound to this lobby code
    const broadcastForThisLobby = (type, payload = {}) => {
      broadcast(code, { type, ...payload });
    };
    // instantiate LobbyTimer for this lobby, passing a getter to the lobby players array
    lobbys[code].timer = new LobbyTimer(
      broadcastForThisLobby,
      () => lobbys[code].players
    );
  }
  return lobbys[code];
}

// Delegation helpers: use lobby.timer if present
function startWaiting20(code, duration = 20) {
  const lobby = lobbys[code];
  if (!lobby) return;
  if (lobby.timer) lobby.timer.startWaiting(duration);
}

function cancelWaiting20(code) {
  const lobby = lobbys[code];
  if (!lobby || !lobby.timer) return;
  // notify and clear through timer API
  if (lobby.timer.timer && lobby.timer.timer.type === "waiting") {
    lobby.timer.broadcast("waitingCancelled", {});
  }
  lobby.timer.clearTimer();
}

function startCountdown10(code) {
  const lobby = lobbys[code];
  if (!lobby) return;
  if (lobby.timer) lobby.timer.startCountdown(10);
}

function stopCountdown10(code) {
  const lobby = lobbys[code];
  if (!lobby || !lobby.timer) return;
  if (lobby.timer.timer && lobby.timer.timer.type === "countdown") {
    lobby.timer.broadcast("countdownCancelled", {});
  }
  lobby.timer.clearTimer();
}

// Reset lobby back to lobby state so a new game can be started
function exitToLobby(code) {
  const lobby = lobbys[code];
  if (!lobby) return;
  // clear timers via timer API
  if (lobby.timer) lobby.timer.clearTimer();

  lobby.waitingValue = 0;
  lobby.countdownValue = 0;
  lobby.state = "lobby";
  // reset ready flags so new configuration can be made
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

  ws.on("message", (msg) => {
    let data = {};
    try {
      data = JSON.parse(msg);
    } catch {}

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
            })
          );
          return;
        }
      }
      let lobby = ensureLobby(ws.lobbyCode);

      if (
        !lobby.players.some((p) => p.id === id) &&
        !lobby.queue.some((p) => p.id === id)
      ) {
        // enqueue if lobby full
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

        let player = { id, pseudo: data.pseudo, color: 0, ready: false, ws };
        lobby.players.push(player);
        lobby.chat.push({
          system: true,
          text: `${data.pseudo} a rejoint le lobby`,
          time: now(),
        });

        // Broadcast lobby update
        broadcast(ws.lobbyCode, {
          type: "lobby",
          players: lobby.players,
          chat: lobby.chat,
          queue: lobby.queue.map((q) => q.pseudo),
          code: ws.lobbyCode,
        });

        // Evaluate timers after the modification
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
      let code = ws.lobbyCode;
      let lobby = lobbys[code];
      let p = lobby && lobby.players.find((p) => p.id === id);
      if (lobby && data.text) {
        lobby.chat.push({
          system: false,
          author: p ? p.pseudo : "???",
          text: data.text,
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
      return;
    }

    if (data.type === "ready") {
      let code = ws.lobbyCode;
      let lobby = lobbys[code];
      if (!lobby) return;
      let p = lobby.players.find((p) => p.id === id);
      if (p) {
        p.ready = !p.ready;
        lobby.chat.push({
          system: true,
          text: `${p.pseudo} ${p.ready ? "est prêt" : "n'est plus prêt"}`,
          time: now(),
        });
      }

      // Broadcast update
      broadcast(code, {
        type: "lobby",
        players: lobby.players,
        chat: lobby.chat,
        queue: lobby.queue.map((q) => q.pseudo),
        code,
      });

      // Evaluate timers after ready toggle
      if (lobby.timer) lobby.timer.evaluate();
      return;
    }

    if (data.type === "color") {
      let code = ws.lobbyCode;
      let lobby = lobbys[code];
      let p = lobby && lobby.players.find((p) => p.id === id);
      if (p && typeof data.color === "number") {
        p.color = data.color;
      }
      // Broadcast update
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
      // simple alias to join with create:true
      ws.emit?.(
        "message",
        JSON.stringify({ ...data, type: "join", create: true })
      );
      return;
    }
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
      // Also try to remove from queue if present
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

    // Broadcast updated lobby and re-evaluate timers
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
