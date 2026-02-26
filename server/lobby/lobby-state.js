// server/lobby/lobby-state.js

import { GAME_MODES } from "../../shared/constants.js";

/** Generate a random 5-char lobby code. */
export function randLobbyCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

/** Current time formatted as HH:MM:SS. */
export function now() {
  const d = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  return (
    pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds())
  );
}

/** Create a fresh lobby data structure. */
export function createLobbyState(code) {
  return {
    code,
    players: [],
    chat: [],
    queue: [],
    state: "lobby",
    timer: null,
    map: null,
    bombs: [],
    powerUps: [],
    gameChat: [],
    bombCheckInterval: null,
    gameMode: GAME_MODES.FFA,
    owner: null,
    _gameWinBroadcasted: false,
    _returnToLobbyScheduled: false,
    _isDraw: false,
    _winningTeam: null,
  };
}

/** Build the standard lobby broadcast payload. */
export function lobbyPayload(lobby) {
  return {
    type: "lobby",
    players: lobby.players,
    chat: lobby.chat,
    queue: lobby.queue.map((q) => (typeof q === "string" ? q : q.pseudo)),
    code: lobby.code,
    gameMode: lobby.gameMode || GAME_MODES.FFA,
    owner: lobby.owner || (lobby.players[0] && lobby.players[0].id) || null,
  };
}
