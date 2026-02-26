// server/game/game-lifecycle.js

import { startGameForLobby, makeMapSeed } from "../gameManager.js";
import { generateMapFromSeed } from "../../shared/map-generator.js";
import {
  resetPlayerStats,
  getSpawnPosition,
} from "../../shared/player-defaults.js";
import { checkBombExplosions, checkTimedEffects } from "../bomb.js";
import {
  TEAMS,
  GAME_MODES,
  MAP_COLS,
  MAP_ROWS,
} from "../../shared/constants.js";
import { lobbyPayload, now } from "../lobby/lobby-state.js";

/**
 * Called by LobbyTimer when countdown finishes.
 * Handles team assignment, map generation, player spawning, and game timers.
 */
export function onStartGame(
  lobbys,
  code,
  broadcastFn,
  exitToLobbyFn,
  { reason, N, R, players },
) {
  console.log(
    `[lifecycle] onStartGame triggered for lobby ${code}: reason=${reason} N=${N} R=${R}`,
  );
  const lobby = lobbys[code];
  if (!lobby) return;

  const broadcastForThisLobby = (type, payload = {}) => {
    broadcastFn(code, { type, ...payload });
  };

  // Team assignment
  if (lobby.gameMode === GAME_MODES.TEAM) {
    if (N !== 4) {
      console.log(
        `[lifecycle] Team mode requires exactly 4 players, got ${N}. Cancelling.`,
      );
      broadcastForThisLobby("countdownCancelled", {});
      lobby.chat.push({
        system: true,
        text: "⚠ Le mode Équipe nécessite exactement 4 joueurs !",
        time: now(),
      });
      broadcastFn(code, lobbyPayload(lobby));
      return;
    }
    assignTeams(lobby);
  } else {
    lobby.players.forEach((p) => {
      p.team = TEAMS.NONE;
    });
  }

  // Reset lobby state
  lobby.state = "in-game";
  lobby.bombs = [];
  lobby.powerUps = [];
  lobby.gameChat = [];
  lobby._gameWinBroadcasted = false;

  try {
    // Generate map
    const mapSeed = makeMapSeed(code);
    const cols = MAP_COLS;
    const rows = MAP_ROWS;

    lobby.map = generateMapFromSeed(cols, rows, mapSeed, {
      destructibleProb: 0.42,
      borderThickness: 1,
      patternSpacing: 2,
      patternOffset: 1,
    });

    console.log(`[lifecycle] Map generated for lobby ${code}:`, {
      seed: mapSeed,
      width: lobby.map.width,
      height: lobby.map.height,
      gridSize: lobby.map.grid.length,
    });

    // Notify clients
    startGameForLobby(
      (type, payload) => broadcastForThisLobby(type, payload),
      code,
      lobby.players,
      code,
      {
        initialCountdown: 300,
        gameTimer: 300,
        mapGrid: lobby.map,
        mapSeed,
        mapOptions: { destructibleProb: 0.42 },
        gameMode: lobby.gameMode,
      },
    );

    // Win-check broadcast wrapper
    function broadcastWithWinCheck(type, payload) {
      broadcastFn(code, { type, ...payload });
      if (type === "gameWin" && !lobby._returnToLobbyScheduled) {
        lobby._returnToLobbyScheduled = true;
        if (payload && payload.winningTeam) {
          lobby._winningTeam = payload.winningTeam;
        }
        console.log(
          `[lifecycle] Game won in ${code} — returning to lobby in 5s`,
        );
        setTimeout(() => {
          lobby._returnToLobbyScheduled = false;
          exitToLobbyFn(code);
        }, 5000);
      }
    }
    lobby._broadcastWithWinCheck = broadcastWithWinCheck;

    // Bomb + timed effects check interval (100ms)
    if (lobby.bombCheckInterval) clearInterval(lobby.bombCheckInterval);
    lobby.bombCheckInterval = setInterval(() => {
      checkBombExplosions(lobby, broadcastWithWinCheck);
      checkTimedEffects(lobby, broadcastWithWinCheck);
    }, 100);

    // Server-side game timer (5 min)
    lobby._gameStartTime = Date.now();
    lobby._gameDuration = 300 * 1000;
    if (lobby._gameTimerTimeout) clearTimeout(lobby._gameTimerTimeout);
    lobby._gameTimerTimeout = setTimeout(() => {
      if (!lobby || lobby.state !== "in-game") return;
      if (lobby._gameWinBroadcasted) return;

      console.log(`[lifecycle] Game timer expired in ${code} — draw!`);
      lobby._gameWinBroadcasted = true;
      lobby._isDraw = true;
      broadcastFn(code, {
        type: "gameWin",
        winnerId: null,
        winnerPseudo: null,
      });

      if (!lobby._returnToLobbyScheduled) {
        lobby._returnToLobbyScheduled = true;
        setTimeout(() => {
          lobby._returnToLobbyScheduled = false;
          exitToLobbyFn(code);
        }, 5000);
      }
    }, lobby._gameDuration);

    // Spawn players
    lobby.players.forEach((p, idx) => {
      if (typeof p.x !== "number" || typeof p.y !== "number") {
        const s = getSpawnPosition(idx, cols, rows);
        p.x = s.x;
        p.y = s.y;
      }
      p._inputState = p._inputState || {
        left: false,
        right: false,
        up: false,
        down: false,
      };
      p._moveInterval = p._moveInterval || null;

      resetPlayerStats(p);
      p.invincibleUntil = Date.now() + 3000;
    });
  } catch (e) {
    console.error("[lifecycle] Error calling startGameForLobby", e);
    broadcastForThisLobby("gameStart", { reason: "error_fallback", N, R });
  }
}

/**
 * Auto-assign and validate teams for 2v2 mode.
 */
function assignTeams(lobby) {
  let alphaCount = 0;
  let betaCount = 0;
  lobby.players.forEach((p) => {
    if (p.team === TEAMS.ALPHA) alphaCount++;
    else if (p.team === TEAMS.BETA) betaCount++;
  });

  // Auto-assign unassigned players to balance teams
  lobby.players.forEach((p) => {
    if (p.team !== TEAMS.ALPHA && p.team !== TEAMS.BETA) {
      if (alphaCount <= betaCount) {
        p.team = TEAMS.ALPHA;
        alphaCount++;
      } else {
        p.team = TEAMS.BETA;
        betaCount++;
      }
    }
  });

  // Final validation: exactly 2 per team
  const finalAlpha = lobby.players.filter((p) => p.team === TEAMS.ALPHA).length;
  const finalBeta = lobby.players.filter((p) => p.team === TEAMS.BETA).length;
  if (finalAlpha !== 2 || finalBeta !== 2) {
    console.log(
      `[lifecycle] Unbalanced teams (Alpha: ${finalAlpha}, Beta: ${finalBeta}). Rebalancing.`,
    );
    lobby.players.forEach((p, i) => {
      p.team = i < 2 ? TEAMS.ALPHA : TEAMS.BETA;
    });
  }

  console.log(
    `[lifecycle] Team assignments:`,
    lobby.players.map(
      (p) => `${p.pseudo}→${p.team === TEAMS.ALPHA ? "Alpha" : "Beta"}`,
    ),
  );
}
