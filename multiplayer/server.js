import { WebSocketServer } from "ws";

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
      }
      ws.lobbyCode = code;
      if (!lobbys[code]) {
        lobbys[code] = { players: [], chat: [], queue: [] };
      }
      let lobby = lobbys[code];

      // Vérifie si le joueur existe déjà
      if (
        !lobby.players.some((p) => p.id === id) &&
        !lobby.queue.some((p) => p.id === id)
      ) {
        if (lobby.players.length >= 4) {
          lobby.queue.push({ id, pseudo: data.pseudo });
          ws.send(
            JSON.stringify({
              type: "waiting",
              code,
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
          broadcast(code, {
            type: "lobby",
            players: lobby.players,
            chat: lobby.chat,
            queue: lobby.queue.map((q) => q.pseudo),
            code,
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
        broadcast(code, {
          type: "lobby",
          players: lobby.players,
          chat: lobby.chat,
          queue: lobby.queue.map((q) => q.pseudo),
          code,
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
          text: p.ready
            ? `${p.pseudo} est prêt`
            : `${p.pseudo} n'est plus prêt`,
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
      let p =
        (lobby && lobby.players.find((p) => p.id === id)) ||
        (lobby && lobby.queue.find((q) => q.id === id));
      if (p && data.text)
        lobby.chat.push({ author: p.pseudo, text: data.text, time: now() });
      broadcast(code, {
        type: "lobby",
        players: lobby.players,
        chat: lobby.chat,
        queue: lobby.queue.map((q) => q.pseudo),
        code,
      });
    }
  });

  ws.on("close", () => {
    let code = ws.lobbyCode;
    if (!code || !lobbys[code]) return;
    let lobby = lobbys[code];
    let leaver = lobby.players.find((p) => p.id === id);
    let pseudo =
      (leaver && leaver.pseudo) ||
      (lobby.queue.find((q) => q.id === id) || {}).pseudo ||
      "???";
    if (leaver) {
      lobby.chat.push({
        system: true,
        text: `${leaver.pseudo} a quitté le lobby`,
        time: now(),
      });
      lobby.players = lobby.players.filter((p) => p.id !== id);
      if (lobby.queue.length > 0) {
        const next = lobby.queue.shift();
        lobby.players.push({
          id: next.id,
          pseudo: next.pseudo,
          color: 0,
          ready: false,
        });
        lobby.chat.push({
          system: true,
          text: `${next.pseudo} a rejoint le lobby depuis la file d'attente`,
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
    lobby.queue = lobby.queue.filter((q) => q.id !== id);
    lobby.chat.push({
      system: true,
      text: `${pseudo} a quitté la file d'attente`,
      time: now(),
    });
    broadcast(code, {
      type: "lobby",
      players: lobby.players,
      chat: lobby.chat,
      queue: lobby.queue.map((q) => q.pseudo),
      code,
    });
  });
});
console.log("WebSocket server running on ws://localhost:9001");
