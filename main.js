import { render } from "../Core/dom.js";
import { Nickname } from "./ui/nickname.js";
import { Lobby } from "./ui/lobby.js";
import { WaitingRoom } from "./ui/waitingroom.js";
import { WSIndicator } from "./ui/wsindicator.js";
import { PopupError } from "./ui/popup.js";
import { setState, getState } from "../Core/state.js";
import { registerEvent, getEventsMap } from "../Core/events.js";

let lobbyState = { players: [], chat: [], queue: [], code: "" };
const container = document.getElementById("app");
let wsSocket; // Unique WebSocket for the whole session
let localColor = 0;
let wsConnected = false;
let playerCount = 1;
let lastErrorPopup = null;

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

function showPopupError(message) {
  const app = document.getElementById("app");
  if (!app) return;
  if (lastErrorPopup) {
    app.removeChild(lastErrorPopup);
    lastErrorPopup = null;
  }
  const popupVNode = PopupError({ message });
  const popupElem = window.createElement(popupVNode);
  lastErrorPopup = popupElem;
  app.appendChild(popupElem);
  setTimeout(() => {
    if (app.contains(popupElem)) app.removeChild(popupElem);
    lastErrorPopup = null;
  }, 3000);
}

function openMainSocket() {
  function connectWS() {
    wsSocket = new WebSocket("ws://localhost:9001");
    wsSocket.addEventListener("open", () => {
      wsConnected = true;
      showWSIndicator();
    });
    wsSocket.addEventListener("close", () => {
      wsConnected = false;
      showWSIndicator();
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
      if (data.type === "lobby" || data.type === "waiting") {
        handleLobbyUpdate(data.players, data.chat, data.queue, data, data.code);
      }
      if (data.type === "error") {
        showPopupError(data.message || "Erreur inconnue");
      }
    });
  }
  connectWS();
}

function sendWS(type, payload) {
  if (wsSocket && wsSocket.readyState === 1) {
    wsSocket.send(JSON.stringify({ type, ...payload }));
  }
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
  sendWS("join", {
    pseudo: nickname,
    lobbyCode: lobbyCode,
    create: opts.create === true,
  });
}

function handleLobbyUpdate(players, chat, queue, waitingMsg, code) {
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

function handleReady() {
  sendWS("ready", {});
}

function handleSendMessage(e) {
  e.preventDefault();
  const input = e.target.elements.message;
  if (input.value) {
    sendWS("chat", { text: input.value });
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

openMainSocket();
showNicknameForm();
