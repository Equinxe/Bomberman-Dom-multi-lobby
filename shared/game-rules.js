// shared/game-rules.js
import { TEAMS, TEAM_INFO } from "./constants.js";

/**
 * Check if the game should end based on alive players.
 */
export function checkWinCondition(players) {
  if (!players || players.length <= 1) {
    return { gameOver: false };
  }

  const alivePlayers = players.filter((p) => !p.dead);

  // Determine if team mode is active
  const teamPlayers = players.filter((p) => (p.team || 0) !== TEAMS.NONE);
  const isTeamMode = teamPlayers.length >= 2;

  let shouldEndGame = false;
  let winPayload = {};

  if (isTeamMode) {
    const aliveTeams = new Set(
      alivePlayers.map((p) => p.team || 0).filter((t) => t !== TEAMS.NONE),
    );
    const aliveFFA = alivePlayers.filter((p) => (p.team || 0) === TEAMS.NONE);

    if (alivePlayers.length === 0) {
      // Everyone dead — draw
      shouldEndGame = true;
      winPayload = { winnerId: null, winnerPseudo: null, winningTeam: null };
    } else if (aliveTeams.size === 1 && aliveFFA.length === 0) {
      // One team remains
      const winTeam = [...aliveTeams][0];
      shouldEndGame = true;
      winPayload = {
        winnerId: null,
        winnerPseudo: null,
        winningTeam: winTeam,
      };
    } else if (aliveTeams.size === 0 && aliveFFA.length === 1) {
      // One FFA player left
      shouldEndGame = true;
      winPayload = {
        winnerId: aliveFFA[0].id,
        winnerPseudo: aliveFFA[0].pseudo,
        winningTeam: null,
      };
    } else if (alivePlayers.length === 1) {
      // Exactly one person alive
      shouldEndGame = true;
      winPayload = {
        winnerId: alivePlayers[0].id,
        winnerPseudo: alivePlayers[0].pseudo,
        winningTeam: alivePlayers[0].team || null,
      };
    }
  } else {
    // FFA MODE: last player standing
    if (alivePlayers.length <= 1) {
      shouldEndGame = true;
      const winner = alivePlayers[0] || null;
      winPayload = {
        winnerId: winner ? winner.id : null,
        winnerPseudo: winner ? winner.pseudo : null,
        winningTeam: null,
      };
    }
  }

  return { gameOver: shouldEndGame, winPayload };
}

/**
 * Build a game-win chat message text.
 */
export function buildWinText(winPayload, players) {
  const winner = winPayload.winnerId
    ? players.find((p) => p.id === winPayload.winnerId)
    : null;

  if (winPayload.winningTeam) {
    const teamName =
      TEAM_INFO[winPayload.winningTeam]?.name ||
      `Équipe ${winPayload.winningTeam}`;
    return `🏆 L'équipe ${teamName} remporte la victoire !`;
  } else if (winner) {
    return `🏆 ${winner.pseudo} remporte la victoire !`;
  } else {
    return `🤝 Match nul — aucun vainqueur !`;
  }
}

/**
 * Format a timestamp as HH:MM:SS (French locale).
 */
export function formatTime() {
  return new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
