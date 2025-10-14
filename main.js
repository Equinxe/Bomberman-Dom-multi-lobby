import { render } from "../Core/dom.js";
import { Nickname } from "./ui/nickname.js";
import { Lobby } from "./ui/lobby.js";
import { WaitingRoom } from "./ui/waitingroom.js";
import { setState, getState } from "../Core/state.js";
import { createSocket } from "./multiplayer/socket.js";
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
let localColor = 0;

function showNicknameForm() {
  render(Nickname({ onSubmit: handleSubmit }), container, getEventsMap());
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
  mySocket = createSocket((players, chat, queue, waitingMsg, code) => {
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
  });
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
}

showNicknameForm();
