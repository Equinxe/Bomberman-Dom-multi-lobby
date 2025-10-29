// multiplayer/socket.js
// Petit wrapper WebSocket réutilisable avec reconnexion, queue d'envoi et gestion d'événements.
// Usage:
// import { socket } from './multiplayer/socket.js';
// socket.init('ws://localhost:9001');
// socket.on('open', () => {});
// socket.on('lobby', (data) => {});
// socket.send('join', { pseudo: 'bob' });

export const socket = (() => {
  let ws = null;
  let url = null;
  let listeners = Object.create(null);
  let queue = [];
  let reconnectDelay = 1000;
  let shouldReconnect = true;
  let connecting = false;

  function init(u) {
    url = u;
    shouldReconnect = true;
    connect();
  }

  function connect() {
    if (!url || connecting) return;
    connecting = true;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      connecting = false;
      scheduleReconnect();
      return;
    }

    ws.addEventListener("open", () => {
      connecting = false;
      emit("open");
      flushQueue();
    });

    ws.addEventListener("close", () => {
      ws = null;
      connecting = false;
      emit("close");
      if (shouldReconnect) scheduleReconnect();
    });

    ws.addEventListener("error", (err) => {
      emit("error", err);
    });

    ws.addEventListener("message", (ev) => {
      try {
        const data = JSON.parse(ev.data);
        // Emit both specific type and a generic 'message' event
        if (data && data.type) emit(data.type, data);
        emit("message", data);
      } catch (err) {
        console.warn("socket: invalid JSON message", ev.data);
        emit("raw", ev.data);
      }
    });
  }

  function scheduleReconnect() {
    setTimeout(() => {
      if (shouldReconnect) connect();
    }, reconnectDelay);
  }

  function send(type, payload = {}) {
    const msg = JSON.stringify({ type, ...payload });
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    } else {
      // queue until reconnection
      queue.push(msg);
    }
  }

  function flushQueue() {
    while (queue.length && ws && ws.readyState === WebSocket.OPEN) {
      const m = queue.shift();
      try {
        ws.send(m);
      } catch (e) {
        // push back and break to retry later
        queue.unshift(m);
        break;
      }
    }
  }

  function on(event, cb) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
    return () => off(event, cb);
  }

  function off(event, cb) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter((f) => f !== cb);
  }

  function emit(event, data) {
    const arr = listeners[event] || [];
    for (let i = 0; i < arr.length; i++) {
      try {
        arr[i](data);
      } catch (e) {
        console.error("socket listener error for", event, e);
      }
    }
  }

  function close() {
    shouldReconnect = false;
    if (ws) ws.close();
    ws = null;
  }

  return { init, connect, send, on, off, close };
})();
