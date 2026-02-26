// client/lobby-controller.js
// Lobby UI controller: state, rendering, event wiring.
// Extracted from main.js to keep the entry point slim.

import { render } from "../Core/dom.js";
import { getState } from "../Core/state.js";
import { registerEvent, getEventsMap } from "../Core/events.js";
import { Lobby } from "../ui/views/LobbyView.js";
import { WaitingRoom } from "../ui/views/WaitingRoomView.js";
import { showWSIndicator } from "./ui-overlays.js";

// ── Lobby state ──

const lobbyState = {
  players: [],
  chat: [],
  queue: [],
  code: "",
  gameMode: "ffa",
  owner: null,
  waiting: false,
  queuePosition: 0,
};

let localColor = 0;

export function getLobbyState() {
  return lobbyState;
}

// ── Chat draft preservation helper ──

function withPreservedChatDraft(renderFn) {
  let draft = "";
  try {
    const draftEl = document.getElementById("chat-draft");
    if (draftEl) draft = draftEl.value || "";
  } catch (e) {}
  renderFn();
  if (draft) {
    try {
      const newDraftEl = document.getElementById("chat-draft");
      if (newDraftEl) newDraftEl.value = draft;
    } catch (e) {}
  }
  // Auto-scroll chat to bottom after render
  try {
    const chatList = document.querySelector("[data-chat-list]");
    if (chatList) chatList.scrollTop = chatList.scrollHeight;
  } catch (e) {}
}

// ── Lobby update handler ──

export function handleLobbyUpdate(players, chat, queue, waitingMsg, code, container, showNicknameForm) {
  const myPseudo = getState().nickname;
  const isInLobby = players.some((p) => p.pseudo === myPseudo);
  let waiting = false;
  let queuePosition = 1;
  if (!isInLobby) {
    waiting = true;
    if (queue) {
      let idx = queue.findIndex(
        (p) =>
          p === myPseudo || (typeof p === "object" && p.pseudo === myPseudo),
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
  // Store game mode and owner from server payload
  if (waitingMsg) {
    if (waitingMsg.gameMode) lobbyState.gameMode = waitingMsg.gameMode;
    if (waitingMsg.owner) lobbyState.owner = waitingMsg.owner;
  }

  if (isInLobby) {
    const me = players.find((p) => p.pseudo === myPseudo);
    if (me) localColor = me.color ?? 0;
  }

  try {
    window.__LOBBY_PLAYERS = Array.isArray(players) ? players : [];
  } catch (e) {
    window.__LOBBY_PLAYERS = [];
  }

  showLobby(container, showNicknameForm);
}

// ── Show lobby / waiting room ──

export function showLobby(container, showNicknameForm) {
  if (!getState().nickname || getState().nickname.trim().length === 0) {
    showNicknameForm();
    return;
  }
  if (lobbyState.waiting) {
    withPreservedChatDraft(() =>
      render(
        WaitingRoom({
          position: lobbyState.queuePosition,
          queue: lobbyState.queue,
          pseudo: getState().nickname,
          code: lobbyState.code,
        }),
        container,
        getEventsMap(),
      ),
    );
    showWSIndicator();
    return;
  }
  withPreservedChatDraft(() =>
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
        gameMode: lobbyState.gameMode,
        owner: lobbyState.owner,
      }),
      container,
      getEventsMap(),
    ),
  );
  showWSIndicator();
}

// ── Lobby event handlers ──

export function registerLobbyEvents(sendWS) {
  registerEvent("handleReady", () => {
    sendWS("ready", {});
  });

  registerEvent("handleSendMessage", (e) => {
    e.preventDefault();
    const input = e.target.elements.message;
    if (input.value) {
      sendWS("chat", { text: input.value });
      input.value = "";
    }
  });

  registerEvent("handleTeamSelect", (e) => {
    const btn = e.target.closest && e.target.closest("[data-team]");
    if (!btn) return;
    const teamId = Number(btn.getAttribute("data-team"));
    if (Number.isNaN(teamId)) return;

    const myPseudo = getState().nickname;
    const me = (lobbyState.players || []).find((p) => p.pseudo === myPseudo);
    const currentTeam = (me && me.team) || 0;
    const newTeam = teamId === currentTeam ? 0 : teamId;

    sendWS("team", { team: newTeam });
  });

  registerEvent("handleGameModeChange", (e) => {
    const btn = e.target.closest && e.target.closest("[data-gamemode]");
    if (!btn) return;
    const mode = btn.getAttribute("data-gamemode");
    if (mode) {
      sendWS("gameMode", { gameMode: mode });
    }
  });
}
