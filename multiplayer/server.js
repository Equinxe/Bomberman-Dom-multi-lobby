import WebSocket, { WebSocketServer } from "ws";
const wss = new WebSocketServer({ port: 9001 });

let lobbys = {}; // { code: { players: [], chat: [], queue: [] } }

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

wss.on("connection", (ws) => {
  let id = Math.random().toString(36).slice(2);
  ws.id = id;
  ws.lobbyCode = null;

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
        lobbys[code] = { players: [], chat: [], queue: [] };
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
      let lobby = lobbys[ws.lobbyCode];

      if (
        !lobby.players.some((p) => p.id === id) &&
        !lobby.queue.some((p) => p.id === id)
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
        let player = { id, pseudo: data.pseudo, color: 0, ready: false };
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
      }
    }

    if (data.type === "color") {
      let code = ws.lobbyCode;
      let lobby = lobbys[code];
      let p = lobby && lobby.players.find((p) => p.id === id);
      if (p) {
        p.color = data.color;
      }
      broadcast(code, {
        type: "lobby",
        players: lobby.players,
        chat: lobby.chat,
        queue: lobby.queue.map((q) => q.pseudo),
        code,
      });
    }

    if (data.type === "ready") {
      let code = ws.lobbyCode;
      let lobby = lobbys[code];
      let p = lobby && lobby.players.find((p) => p.id === id);
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
    }
  });
});
