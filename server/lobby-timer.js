// server/lobby-timer.js
// Exemple d'implémentation Node.js (ws) du comportement de timers de lobby
// - start waiting (20s) quand R>=1 et R < N
// - reset waiting(20s) si R augmente mais reste < N
// - start countdown (10s) quand R === N (et N >= 2)
// - si R devient < N pendant countdown, switch back to waiting(20s)
// - si R === 0, cancel all timers
//
// Intégrer la logique suivante dans ton handler d'événements (join/leave/ready/unready).
//
// This is an example module — adapt to your existing project structure.

const WebSocket = require('ws');

class LobbyTimer {
  constructor(broadcastFn) {
    // broadcastFn(type, payload) -> envoie à tous les clients du lobby
    this.broadcast = broadcastFn;

    this.timer = null; // { type: 'waiting'|'countdown', remaining, intervalId, timeoutId }
  }

  clearTimer() {
    if (!this.timer) return;
    if (this.timer.intervalId) clearInterval(this.timer.intervalId);
    if (this.timer.timeoutId) clearTimeout(this.timer.timeoutId);
    this.timer = null;
  }

  startWaiting(seconds = 20) {
    // si déjà waiting, on reset simplement le timer (re-start)
    if (this.timer && this.timer.type === 'waiting') {
      this.clearTimer();
    } else {
      // si on avait un countdown, annulez-le et signalez
      if (this.timer && this.timer.type === 'countdown') {
        this.broadcast('countdownCancelled', {});
        this.clearTimer();
      }
    }

    this.timer = { type: 'waiting', remaining: seconds, intervalId: null, timeoutId: null };
    this.broadcast('waitingStarted', { duration: seconds, value: seconds });
    // tick chaque seconde
    this.timer.intervalId = setInterval(() => {
      this.timer.remaining -= 1;
      if (this.timer.remaining >= 0) {
        this.broadcast('waitingTick', { value: this.timer.remaining });
      }
    }, 1000);
    // à la fin -> démarrer la partie
    this.timer.timeoutId = setTimeout(() => {
      this.clearTimer();
      this.broadcast('gameStart', { reason: 'waiting_timeout' });
    }, seconds * 1000);
  }

  startCountdown(seconds = 10) {
    // si on était en waiting, on annule waiting
    if (this.timer && this.timer.type === 'waiting') {
      this.broadcast('waitingCancelled', {});
      this.clearTimer();
    } else if (this.timer && this.timer.type === 'countdown') {
      // si on est déjà en countdown, on ne relance pas
      return;
    }

    this.timer = { type: 'countdown', remaining: seconds, intervalId: null, timeoutId: null };
    this.broadcast('countdownStart', { value: seconds });
    this.timer.intervalId = setInterval(() => {
      this.timer.remaining -= 1;
      if (this.timer.remaining >= 0) {
        this.broadcast('countdownTick', { value: this.timer.remaining });
      }
    }, 1000);
    this.timer.timeoutId = setTimeout(() => {
      this.clearTimer();
      this.broadcast('gameStart', { reason: 'countdown_done' });
    }, seconds * 1000);
  }

  // Call this after any change in players / ready status
  evaluate(N, R) {
    // no players or no ready players -> cancel timers
    if (R === 0) {
      if (this.timer) {
        if (this.timer.type === 'waiting') this.broadcast('waitingCancelled', {});
        if (this.timer.type === 'countdown') this.broadcast('countdownCancelled', {});
      }
      this.clearTimer();
      return;
    }

    // if all players ready and at least 2 players -> countdown 10s
    if (R === N && N >= 2) {
      this.startCountdown(10);
      return;
    }

    // otherwise some (but not all) players ready -> waiting 20s (and reset on extra ready)
    if (R >= 1 && R < N) {
      this.startWaiting(20);
      return;
    }
  }
}

// Export the class for reuse
module.exports = { LobbyTimer };

// If run directly for manual testing, spin a demo WS server using the lobby timer
if (require.main === module) {
  const wss = new WebSocket.Server({ port: 9001 });
  const players = []; // each: { id, pseudo, ws, ready }

  function broadcastAll(type, payload) {
    const msg = JSON.stringify({ type, ...payload });
    wss.clients.forEach((c) => {
      if (c.readyState === WebSocket.OPEN) c.send(msg);
    });
  }

  const lobbyTimer = new LobbyTimer(broadcastAll);

  wss.on('connection', function connection(ws) {
    const id = Math.random().toString(36).slice(2, 9);
    const player = { id, pseudo: 'anon', ws, ready: false };
    players.push(player);

    function sendLobbySnapshot() {
      const payload = {
        players: players.map((p) => ({ pseudo: p.pseudo, ready: p.ready, color: p.color || 0 })),
        chat: [],
        queue: [],
        code: 'DEMO',
      };
      ws.send(JSON.stringify({ type: 'lobby', ...payload }));
    }
    sendLobbySnapshot();

    ws.on('message', function incoming(message) {
      let data;
      try {
        data = JSON.parse(message);
      } catch (e) {
        return;
      }
      if (data.type === 'join') {
        player.pseudo = data.pseudo || player.pseudo;
        broadcastAll('lobby', {
          players: players.map((p) => ({ pseudo: p.pseudo, ready: p.ready, color: p.color || 0 })),
          chat: [],
          queue: [],
          code: 'DEMO',
        });
        const N = players.length;
        const R = players.filter((p) => p.ready).length;
        lobbyTimer.evaluate(N, R);
      }

      if (data.type === 'ready') {
        player.ready = !player.ready;
        broadcastAll('lobby', {
          players: players.map((p) => ({ pseudo: p.pseudo, ready: p.ready, color: p.color || 0 })),
          chat: [],
          queue: [],
          code: 'DEMO',
        });
        const N = players.length;
        const R = players.filter((p) => p.ready).length;
        lobbyTimer.evaluate(N, R);
      }

      if (data.type === 'chat') {
        broadcastAll('chat', { text: data.text || '' });
      }

      if (data.type === 'color') {
        player.color = data.color;
        broadcastAll('lobby', {
          players: players.map((p) => ({ pseudo: p.pseudo, ready: p.ready, color: p.color || 0 })),
          chat: [],
          queue: [],
          code: 'DEMO',
        });
      }
    });

    ws.on('close', function () {
      const idx = players.findIndex((p) => p.id === player.id);
      if (idx !== -1) players.splice(idx, 1);
      broadcastAll('lobby', {
        players: players.map((p) => ({ pseudo: p.pseudo, ready: p.ready, color: p.color || 0 })),
        chat: [],
        queue: [],
        code: 'DEMO',
      });
      const N = players.length;
      const R = players.filter((p) => p.ready).length;
      lobbyTimer.evaluate(N, R);
    });
  });

  console.log('Demo WS server listening on ws://localhost:9001');
}