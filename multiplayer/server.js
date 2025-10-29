import WebSocket, { WebSocketServer } from "ws";
const wss = new WebSocketServer({ port: 9001 });

let lobbys = {}; // { code: { players: [], chat: [], queue: [], state: "lobby"|'starting'|'in-game', timers:{}, waitingValue, countdownValue } }

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
    };
  }
  return lobbys[code];
}

function startWaiting20(code, duration = 20) {
  const lobby = ensureLobby(code);
  if (lobby.state !== "lobby") return;
  if (lobby.timers.waiting20Interval) return;
  lobby.waitingValue = duration;
  lobby.chat.push({
    system: true,
    text: `Phase de préparation commencée (${duration}s).`,
    time: now(),
  });
  broadcast(code, { type: "waitingStarted", duration: lobby.waitingValue });
  lobby.timers.waiting20Interval = setInterval(() => {
    lobby.waitingValue -= 1;
    if (lobby.waitingValue > 0) {
      broadcast(code, { type: "waitingTick", value: lobby.waitingValue });
    } else {
      clearInterval(lobby.timers.waiting20Interval);
      lobby.timers.waiting20Interval = null;
      lobby.waitingValue = 0;
      // si >=2 ready -> start countdown 10
      const readyCount = lobby.players.filter((p) => p.ready).length;
      if (readyCount >= 2) {
        startCountdown10(code);
      } else {
        lobby.chat.push({
          system: true,
          text: `La préparation est terminée mais pas assez de joueurs prêts.`,
          time: now(),
        });
        broadcast(code, { type: "waitingCancelled" });
      }
      broadcast(code, {
        type: "lobby",
        players: lobby.players,
        chat: lobby.chat,
        queue: lobby.queue.map((q) => q.pseudo),
        code,
      });
    }
  }, 1000);
}

function cancelWaiting20(code) {
  const lobby = lobbys[code];
  if (!lobby || !lobby.timers.waiting20Interval) return;
  clearInterval(lobby.timers.waiting20Interval);
  lobby.timers.waiting20Interval = null;
  lobby.waitingValue = 0;
  lobby.chat.push({
    system: true,
    text: `La préparation a été annulée.`,
    time: now(),
  });
  broadcast(code, { type: "waitingCancelled" });
  broadcast(code, {
    type: "lobby",
    players: lobby.players,
    chat: lobby.chat,
    queue: lobby.queue.map((q) => q.pseudo),
    code,
  });
}

function startCountdown10(code) {
  const lobby = ensureLobby(code);
  if (lobby.state !== "lobby") return;
  if (lobby.timers.countdown10) return;
  // cancel waiting20 if exists
  if (lobby.timers.waiting20Interval) {
    clearInterval(lobby.timers.waiting20Interval);
    lobby.timers.waiting20Interval = null;
    lobby.waitingValue = 0;
  }
  lobby.state = "starting";
  lobby.countdownValue = 10;
  lobby.chat.push({
    system: true,
    text: `Compte à rebours de démarrage (10s) lancé.`,
    time: now(),
  });
  broadcast(code, { type: "countdownStart", value: lobby.countdownValue });
  lobby.timers.countdown10 = setInterval(() => {
    lobby.countdownValue -= 1;
    if (lobby.countdownValue > 0) {
      broadcast(code, { type: "countdownTick", value: lobby.countdownValue });
    } else {
      clearInterval(lobby.timers.countdown10);
      lobby.timers.countdown10 = null;
      lobby.state = "in-game";
      // Broadcast gameStart with players and mapSeed (server-driven)
      const playersPayload = lobby.players.map((p) => ({
        id: p.id,
        pseudo: p.pseudo,
        color: p.color,
        ready: p.ready,
      }));
      lobby.chat.push({
        system: true,
        text: `La partie démarre maintenant.`,
        time: now(),
      });
      broadcast(code, {
        type: "gameStart",
        players: playersPayload,
        mapSeed: Date.now(),
      });
      broadcast(code, {
        type: "lobby",
        players: lobby.players,
        chat: lobby.chat,
        queue: lobby.queue.map((q) => q.pseudo),
        code,
      });
    }
  }, 1000);
}

function stopCountdown10(code) {
  const lobby = lobbys[code];
  if (!lobby || !lobby.timers.countdown10) return;
  clearInterval(lobby.timers.countdown10);
  lobby.timers.countdown10 = null;
  lobby.countdownValue = 0;
  lobby.state = "lobby";
  lobby.chat.push({
    system: true,
    text: `Le compte à rebours a été annulé.`,
    time: now(),
  });
  broadcast(code, { type: "countdownCancelled" });
  broadcast(code, {
    type: "lobby",
    players: lobby.players,
    chat: lobby.chat,
    queue: lobby.queue.map((q) => q.pseudo),
    code,
  });
}

// Reset lobby back to lobby state so a new game can be started
function exitToLobby(code) {
  const lobby = lobbys[code];
  if (!lobby) return;
  // clear timers
  if (lobby.timers.waiting20Interval) {
    clearInterval(lobby.timers.waiting20Interval);
    lobby.timers.waiting20Interval = null;
  }
  if (lobby.timers.countdown10) {
    clearInterval(lobby.timers.countdown10);
    lobby.timers.countdown10 = null;
  }
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
      if (!lobby) return;
      let requestedColor = Number(data.color);
      if (Number.isNaN(requestedColor)) return;

      const p = lobby.players.find((p) => p.id === id);
      if (!p) return;

      // Check if the requested color is already used by another player
      const takenBy = lobby.players.find(
        (pl) => pl.color === requestedColor && pl.id !== id
      );
      if (takenBy) {
        // refuse and notify requester
        ws.send(
          JSON.stringify({
            type: "colorRejected",
            color: requestedColor,
            reason: `La couleur ${
              COLOR_NAMES[requestedColor] || requestedColor
            } est déjà utilisée par ${takenBy.pseudo}.`,
          })
        );
        lobby.chat.push({
          system: true,
          text: `${p.pseudo} a essayé de choisir ${
            COLOR_NAMES[requestedColor] || requestedColor
          } mais elle est déjà prise par ${takenBy.pseudo}.`,
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

      // Accept color
      p.color = requestedColor;
      lobby.chat.push({
        system: true,
        text: `${p.pseudo} a choisi la couleur ${
          COLOR_NAMES[requestedColor] || requestedColor
        }.`,
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

    if (data.type === "ready") {
      let code = ws.lobbyCode;
      let lobby = lobbys[code];
      if (!lobby) return;
      let p = lobby.players.find((p) => p.id === id);
      if (!p) return;

      // Do nothing if game already started
      if (lobby.state === "in-game") {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "La partie est déjà en cours.",
          })
        );
        return;
      }

      // Toggle ready
      p.ready = !p.ready;
      lobby.chat.push({
        system: true,
        text: `${p.pseudo} ${p.ready ? "est prêt" : "n'est plus prêt"}`,
        time: now(),
      });

      const readyCount = lobby.players.filter((pl) => pl.ready).length;

      if (p.ready) {
        // If this is the first ready -> start waiting20 (unless countdown already running)
        if (
          readyCount === 1 &&
          !lobby.timers.waiting20Interval &&
          !lobby.timers.countdown10
        ) {
          lobby.chat.push({
            system: true,
            text: `1 joueur est prêt — début d'une phase de préparation de 20s.`,
            time: now(),
          });
          startWaiting20(code);
        }
        // If we have enough players ready immediately -> start countdown10
        if (readyCount >= 2 && !lobby.timers.countdown10) {
          startCountdown10(code);
        }
      } else {
        // player unready: compute after-change readyCount
        // If nobody is ready anymore -> cancel waiting20
        if (readyCount === 0) {
          if (lobby.timers.waiting20Interval) {
            cancelWaiting20(code);
          }
        }

        // If countdown is running and now < 2 ready -> stop countdown
        if (readyCount < 2 && lobby.timers.countdown10) {
          // stop countdown
          stopCountdown10(code);
          // After stopping countdown, if one player remains ready, we should start the 20s preparation for them
          if (readyCount === 1) {
            // start waiting20 only if not already started
            if (!lobby.timers.waiting20Interval && !lobby.timers.countdown10) {
              lobby.chat.push({
                system: true,
                text: `Il reste 1 joueur prêt — relance de la préparation (20s).`,
                time: now(),
              });
              startWaiting20(code);
            }
          }
        } else {
          // countdown was not running but one player remains ready -> ensure waiting20 exists
          if (
            readyCount === 1 &&
            !lobby.timers.waiting20Interval &&
            !lobby.timers.countdown10
          ) {
            lobby.chat.push({
              system: true,
              text: `Il reste 1 joueur prêt — début d'une phase de préparation de 20s.`,
              time: now(),
            });
            startWaiting20(code);
          }
        }
      }

      broadcast(code, {
        type: "lobby",
        players: lobby.players,
        chat: lobby.chat,
        queue: lobby.queue.map((q) => q.pseudo),
        code,
      });
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
    }
  });

  ws.on("close", () => {
    const code = ws.lobbyCode;
    if (!code || !lobbys[code]) {
      broadcastPlayerCountAll();
      return;
    }
    const lobby = lobbys[code];
    lobby.players = lobby.players.filter((p) => p.id !== id);
    lobby.queue = lobby.queue.filter((q) => q.id !== id);
    lobby.chat.push({
      system: true,
      text: `Un joueur a quitté le lobby`,
      time: now(),
    });

    // If not enough players, cancel timers appropriately
    const readyCount = lobby.players.filter((pl) => pl.ready).length;
    if (readyCount < 1) {
      if (lobby.timers.waiting20Interval) {
        clearInterval(lobby.timers.waiting20Interval);
        lobby.timers.waiting20Interval = null;
      }
    }
    if (readyCount < 2) {
      if (lobby.timers.countdown10) {
        clearInterval(lobby.timers.countdown10);
        lobby.timers.countdown10 = null;
        lobby.state = "lobby";
        broadcast(code, { type: "countdownCancelled" });
      }
    }

    broadcast(code, {
      type: "lobby",
      players: lobby.players,
      chat: lobby.chat,
      queue: lobby.queue.map((q) => q.pseudo),
      code,
    });
    broadcastPlayerCountAll();
  });
});
