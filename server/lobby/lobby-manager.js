// server/lobby/lobby-manager.js

import { LobbyTimer } from "../lobby-timer.js";
import { resetPlayerStats } from "../../shared/player-defaults.js";
import { TEAMS, TEAM_INFO } from "../../shared/constants.js";
import { stopPlayerMoveInterval } from "../game/movement.js";
import { onStartGame } from "../game/game-lifecycle.js";
import { createLobbyState, lobbyPayload, now } from "./lobby-state.js";

/** Global lobby store. { code: lobbyState } */
export const lobbys = {};

/**
 * Ensure a lobby exists for the given code. Creates it if needed.
 */
export function ensureLobby(code, broadcastFn, exitToLobbyFn) {
  if (!lobbys[code]) {
    lobbys[code] = createLobbyState(code);

    const broadcastForThisLobby = (type, payload = {}) => {
      broadcastFn(code, { type, ...payload });
    };

    lobbys[code].timer = new LobbyTimer(
      broadcastForThisLobby,
      () => lobbys[code].players,
      (opts) => onStartGame(lobbys, code, broadcastFn, exitToLobbyFn, opts),
    );
  }
  return lobbys[code];
}

/**
 * Transition a lobby from "in-game" back to "lobby" state.
 */
export function exitToLobby(code, broadcastFn) {
  console.log(`[lobby-mgr] exitToLobby called for ${code}`);
  const lobby = lobbys[code];
  if (!lobby) {
    console.log(`[lobby-mgr] No lobby found for ${code}`);
    return;
  }

  if (lobby.timer) lobby.timer.clearTimer();

  // Clear bomb check interval
  if (lobby.bombCheckInterval) {
    clearInterval(lobby.bombCheckInterval);
    lobby.bombCheckInterval = null;
  }

  // Clear game timer
  if (lobby._gameTimerTimeout) {
    clearTimeout(lobby._gameTimerTimeout);
    lobby._gameTimerTimeout = null;
  }

  lobby.state = "lobby";
  lobby.bombs = [];
  lobby.powerUps = [];
  lobby._gameWinBroadcasted = false;
  lobby._returnToLobbyScheduled = false;

  const winnerText = buildWinnerText(lobby);
  lobby._isDraw = false;
  lobby._winningTeam = null;

  lobby.players.forEach((p) => (p.ready = false));
  lobby.chat.push({ system: true, text: winnerText, time: now() });

  // Clear movement intervals and reset stats
  lobby.players.forEach((p) => {
    if (p._moveInterval) {
      clearInterval(p._moveInterval);
      p._moveInterval = null;
    }
    p._inputState = { left: false, right: false, up: false, down: false };
    const savedTeam = p.team || 0;
    resetPlayerStats(p);
    p.team = savedTeam;
    delete p.x;
    delete p.y;
  });

  console.log(
    `[lobby-mgr] Broadcasting lobby to ${lobby.players.length} player(s) in ${code}`,
  );
  broadcastFn(code, lobbyPayload(lobby));
  console.log(`[lobby-mgr] Done for ${code}`);
}

/**
 * Handle a player disconnecting from a lobby.
 */
export function handlePlayerLeave(code, playerId, broadcastFn) {
  const lobby = lobbys[code];
  if (!lobby) return;

  const idx = lobby.players.findIndex((p) => p.id === playerId);
  if (idx !== -1) {
    const leaving = lobby.players.splice(idx, 1)[0];
    lobby.chat.push({
      system: true,
      text: `${leaving.pseudo} a quitté le lobby`,
      time: now(),
    });
    stopPlayerMoveInterval(leaving);

    // Transfer ownership
    if (lobby.owner === playerId) {
      lobby.owner = lobby.players.length > 0 ? lobby.players[0].id : null;
      if (lobby.owner) {
        const newOwner = lobby.players.find((p) => p.id === lobby.owner);
        if (newOwner) {
          lobby.chat.push({
            system: true,
            text: `👑 ${newOwner.pseudo} est maintenant le chef du lobby`,
            time: now(),
          });
        }
      }
    }
  } else {
    const qidx = lobby.queue.findIndex((q) => q.id === playerId);
    if (qidx !== -1) {
      const waiting = lobby.queue.splice(qidx, 1)[0];
      lobby.chat.push({
        system: true,
        text: `${waiting.pseudo} a quitté la file d'attente`,
        time: now(),
      });
    }
  }

  broadcastFn(code, lobbyPayload(lobby));
  if (lobby.timer) lobby.timer.evaluate();
}

// ── Internal helpers ──

function buildWinnerText(lobby) {
  if (lobby._isDraw) {
    return `⏰ Temps écoulé — match nul ! Personne ne gagne.`;
  }
  if (lobby._winningTeam) {
    const teamName =
      TEAM_INFO[lobby._winningTeam]?.name || `Équipe ${lobby._winningTeam}`;
    return `🏆 L'équipe ${teamName} a gagné la partie !`;
  }
  const winner = lobby.players.find((p) => !p.dead);
  const alivePlayers = lobby.players.filter((p) => !p.dead);
  if (alivePlayers.length === 1 && winner) {
    return `🏆 ${winner.pseudo} a gagné la partie !`;
  }
  return `La partie est terminée — match nul !`;
}
