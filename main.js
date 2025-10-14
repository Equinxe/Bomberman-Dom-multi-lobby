import { render } from "../Core/dom.js";
import { Nickname } from "./ui/nickname.js";
import { Lobby } from "./ui/lobby.js";
import { WaitingRoom } from "./ui/waitingroom.js";
import { WSIndicator } from "./ui/wsindicator.js";
import { setState, getState } from "../Core/state.js";
import { registerEvent, getEventsMap } from "../Core/events.js";
import {
  SPRITE_ROWS,
  SPRITE_SIZE,
  SPRITE_ZOOM,
  SHEET_WIDTH,
  SHEET_HEIGHT,
} from "./ui/constants.js";

let lobbyState = { players: [], chat: [], queue: [], code: "" };
const container = document.getElementById("app");
let mySocket;
let wsSocket; // socket WebSocket pour l'indicateur en temps réel
let localColor = 0;
let wsConnected = false;
let playerCount = 1;

// Utilitaire pour créer un vrai Node DOM depuis ton mini-framework
window.createElement = function createElement(vnode) {
  if (typeof vnode === "string") return document.createTextNode(vnode);
  const el = document.createElement(vnode.tag);
  if (vnode.attrs) {
    for (const [k, v] of Object.entries(vnode.attrs)) {
      if (k === "style") el.setAttribute("style", v);
      else el.setAttribute(k, v);
    }
  }
  if (vnode.events) {
    for (const [event, handler] of Object.entries(vnode.events)) {
      el.addEventListener(event, window[handler]);
    }
  }
  if (vnode.children) {
    for (const child of vnode.children) {
      el.appendChild(window.createElement(child));
    }
  }
  return el;
};

function showNicknameForm() {
  render(Nickname({ onSubmit: handleSubmit }), container, getEventsMap());
  showWSIndicator();
}

// Ouvre la WebSocket pour le form dès chargement de la page
function openFormSocket() {
  function connectWS() {
    wsSocket = new WebSocket("ws://localhost:9001");
    wsSocket.addEventListener("open", () => {
      wsConnected = true;
      showWSIndicator();
    });
    wsSocket.addEventListener("close", () => {
      wsConnected = false;
      showWSIndicator();
      // Tente de se reconnecter après 1 seconde si le serveur est relancé
      setTimeout(() => {
        connectWS();
      }, 1000);
    });
    wsSocket.addEventListener("message", (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "playerCountAll") {
        playerCount = data.count;
        showWSIndicator();
      }
    });
  }
  connectWS();
}

// Ferme la WebSocket form (quand on entre dans un lobby)
function closeFormSocket() {
  if (wsSocket && wsSocket.readyState === 1) {
    wsSocket.close();
  }
}

function showWSIndicator() {
  const app = document.getElementById("app");
  if (!app) return;
  const oldInd = document.getElementById("ws-indicator");
  if (oldInd) app.removeChild(oldInd);
  app.appendChild(
    window.createElement(
      WSIndicator({
        connected: wsConnected,
        playerCount,
      })
    )
  );
}

function createSocketWithIndicator(onLobbyUpdate) {
  let socket;
  return {
    connect(pseudo, lobbyCode = "", create = false) {
      closeFormSocket(); // ferme la socket du form pour ne garder que celle du lobby
      socket = new WebSocket("ws://localhost:9001");
      socket.addEventListener("open", () => {
        wsConnected = true;
        showWSIndicator();
        socket.send(
          JSON.stringify({
            type: "join",
            pseudo,
            lobbyCode: lobbyCode,
            create: create,
          })
        );
      });
      socket.addEventListener("close", () => {
        wsConnected = false;
        showWSIndicator();
      });
      socket.addEventListener("message", (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "playerCountAll") {
          playerCount = data.count;
          showWSIndicator();
        }
        if (data.type === "lobby" || data.type === "waiting") {
          onLobbyUpdate(data.players, data.chat, data.queue, data, data.code);
        }
        if (data.type === "error") {
          // ... ton code de pop-up d'erreur ...
        }
      });
    },
    send(type, payload) {
      if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify({ type, ...payload }));
      }
    },
  };
}

function handleSubmit(e, opts = {}) {
  e.preventDefault();
  const pseudoInput = document.getElementById("nickname");
  const lobbyCodeInput = document.getElementById("lobbyCode");
  const nickname = pseudoInput ? pseudoInput.value.trim() : "";
  const lobbyCode = lobbyCodeInput
    ? lobbyCodeInput.value.trim().toUpperCase()
    : "";
  setState({ nickname, lobbyCode });
  mySocket = createSocketWithIndicator(
    (players, chat, queue, waitingMsg, code) => {
      const myPseudo = getState().nickname;
      const isInLobby = players.some((p) => p.pseudo === myPseudo);
      let waiting = false;
      let queuePosition = 1;
      if (!isInLobby) {
        waiting = true;
        if (queue) {
          let idx = queue.findIndex(
            (p) =>
              p === myPseudo || (typeof p === "object" && p.pseudo === myPseudo)
          );
          queuePosition = idx === -1 ? queue.length : idx + 1;
        }
      } else {
        waiting = false;
        queuePosition = 0;
      }
      lobbyState.players = players;
      lobbyState.chat = chat;
      lobbyState.queue = queue || [];
      lobbyState.waiting = waiting;
      lobbyState.queuePosition = queuePosition;
      lobbyState.code = code || getState().lobbyCode;
      if (isInLobby) {
        const me = players.find((p) => p.pseudo === myPseudo);
        if (me) localColor = me.color ?? 0;
      }
      showLobby();
    }
  );
  mySocket.connect(nickname, lobbyCode, opts.create === true);
  window.requestLobbyRender = showLobby;
}

function handleReady() {
  mySocket.send("ready", {});
}

function handleSendMessage(e) {
  e.preventDefault();
  const input = e.target.elements.message;
  if (input.value) {
    mySocket.send("chat", { text: input.value });
    input.value = "";
  }
}

function registerLobbyEvents() {
  registerEvent("handleReady", handleReady);
  registerEvent("handleSendMessage", handleSendMessage);
  registerEvent("handleSubmit", handleSubmit);
}

function showLobby() {
  if (!getState().nickname || getState().nickname.trim().length === 0) {
    showNicknameForm();
    openFormSocket(); // rouvre la socket du form si retour
    return;
  }
  if (lobbyState.waiting) {
    render(
      WaitingRoom({
        position: lobbyState.queuePosition,
        queue: lobbyState.queue,
        pseudo: getState().nickname,
        code: lobbyState.code,
      }),
      container,
      getEventsMap()
    );
    showWSIndicator();
    return;
  }
  registerLobbyEvents();
  render(
    Lobby({
      code: lobbyState.code,
      nickname: getState().nickname,
      players: lobbyState.players,
      chat: lobbyState.chat,
      localColor,
      queue: lobbyState.queue,
      waiting: false,
      queuePosition: 0,
    }),
    container,
    getEventsMap()
  );
  showWSIndicator();
}

openFormSocket();
showNicknameForm();
