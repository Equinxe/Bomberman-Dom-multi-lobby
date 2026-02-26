// server/bomb.js
// Bomb placement, explosion, chain reactions, player damage, and win checks.

import { PLAYER_HITBOX_SIZE, TEAMS } from "../shared/constants.js";
import {
  checkWinCondition,
  buildWinText,
  formatTime,
} from "../shared/game-rules.js";
import { calculateExplosion } from "./entities/explosion.js";
import {
  spawnPowerUps,
  spawnDeathPowerUp,
  checkPowerUpPickup,
} from "./entities/power-up.js";
import { checkTimedEffects as _checkTimedEffects } from "./entities/skull-curse.js";

// Re-export for external consumers (multiplayer/server.js)
export { spawnPowerUps, checkPowerUpPickup } from "./entities/power-up.js";

/**
 * Wrapper: injects placeBomb into skull-curse's checkTimedEffects to avoid circular imports.
 */
export function checkTimedEffects(lobby, broadcastFunc) {
  _checkTimedEffects(lobby, broadcastFunc, placeBomb);
}

/**
 * Detonate all bombs placed by a player (detonator power-up).
 */
export function detonateBombs(lobby, player, broadcastFunc) {
  if (!player.detonator) return false;
  if (!lobby.bombs || lobby.bombs.length === 0) return false;

  const playerBombs = lobby.bombs.filter((b) => b.playerId === player.id);
  if (playerBombs.length === 0) return false;

  const now = Date.now();
  playerBombs.forEach((bomb) => {
    bomb.explosionTime = now - 1;
  });

  console.log(
    `[bomb] Player ${player.pseudo} detonated ${playerBombs.length} bomb(s)`,
  );

  checkBombExplosions(lobby, broadcastFunc);

  return true;
}

/**
 * Place a bomb at the player's position.
 */
export function placeBomb(lobby, player) {
  if (!lobby.bombs) lobby.bombs = [];

  if (player.canPlaceBombs === false) {
    console.log(
      `[bomb] Player ${player.pseudo} can't place bombs (skull: constipation)`,
    );
    return null;
  }

  const playerBombCount = lobby.bombs.filter(
    (b) => b.playerId === player.id,
  ).length;
  const maxBombs = player.maxBombs || 1;

  if (playerBombCount >= maxBombs) {
    console.log(
      `[bomb] Player ${player.pseudo} already has ${maxBombs} bomb(s)`,
    );
    return null;
  }

  const bombX = Math.round(player.x);
  const bombY = Math.round(player.y);

  const existingBomb = lobby.bombs.find((b) => b.x === bombX && b.y === bombY);
  if (existingBomb) {
    console.log(`[bomb] Bomb already exists at (${bombX}, ${bombY})`);
    return null;
  }

  const bomb = {
    id: `${player.id}-${Date.now()}`,
    playerId: player.id,
    x: bombX,
    y: bombY,
    placedAt: Date.now(),
    explosionTime: Date.now() + 3000,
    range: player.bombRange || 3,
    playersInside: new Set([player.id]),
  };

  lobby.bombs.push(bomb);
  console.log(
    `[bomb] Player ${player.pseudo} placed bomb at (${bombX}, ${bombY})`,
  );

  return bomb;
}

/**
 * Update bomb-player tracking (removes player from bomb's passthrough list when they exit).
 */
export function updateBombPlayerTracking(
  lobby,
  playerId,
  x,
  y,
  hitboxSize = PLAYER_HITBOX_SIZE,
) {
  if (!lobby.bombs) return;

  const playerHitbox = {
    left: x + (1 - hitboxSize) / 2,
    right: x + (1 - hitboxSize) / 2 + hitboxSize,
    top: y + (1 - hitboxSize) / 2,
    bottom: y + (1 - hitboxSize) / 2 + hitboxSize,
  };

  lobby.bombs.forEach((bomb) => {
    if (bomb.playersInside.has(playerId)) {
      const isOutside =
        playerHitbox.right <= bomb.x ||
        playerHitbox.left >= bomb.x + 1 ||
        playerHitbox.bottom <= bomb.y ||
        playerHitbox.top >= bomb.y + 1;

      if (isOutside) {
        bomb.playersInside.delete(playerId);
        console.log(
          `[bomb] Player ${playerId} fully exited bomb at (${bomb.x}, ${bomb.y})`,
        );
      }
    }
  });
}

/**
 * Check and trigger bomb explosions (with chain reaction support).
 */
export function checkBombExplosions(lobby, broadcastFunc) {
  if (!lobby.bombs || lobby.bombs.length === 0) return;

  const explodedIds = new Set();
  let safety = 50;

  while (safety-- > 0) {
    const now = Date.now();
    const explodingBombs = lobby.bombs.filter(
      (b) => b.explosionTime <= now && !explodedIds.has(b.id),
    );

    if (explodingBombs.length === 0) break;

    explodingBombs.forEach((b) => explodedIds.add(b.id));

    explodingBombs.forEach((bomb) => {
      explodeBomb(lobby, bomb, broadcastFunc);
    });

    lobby.bombs = lobby.bombs.filter((b) => !explodedIds.has(b.id));
  }
}

/**
 * Explode a bomb: destroy blocks, hit players, check win, chain-react, spawn power-ups.
 */
function explodeBomb(lobby, bomb, broadcastFunc) {
  console.log(`[bomb] Exploding bomb at (${bomb.x}, ${bomb.y})`);

  const map = lobby.map;
  if (!map || !map.grid) return;

  const explosionCells = calculateExplosion(map, bomb.x, bomb.y, bomb.range);

  // Destroy blocks and award score to bomb owner
  const destroyedBlocks = [];
  explosionCells.forEach((cell) => {
    if (map.grid[cell.y] && map.grid[cell.y][cell.x] === "block") {
      map.grid[cell.y][cell.x] = "floor";
      destroyedBlocks.push({ x: cell.x, y: cell.y });
    }
  });

  const BLOCK_DESTROY_SCORE = 100;
  const bombOwner = lobby.players.find((p) => p.id === bomb.playerId);
  if (bombOwner && destroyedBlocks.length > 0) {
    if (typeof bombOwner.score !== "number") bombOwner.score = 0;
    const bonus = destroyedBlocks.length * BLOCK_DESTROY_SCORE;
    bombOwner.score += bonus;
    console.log(
      `[bomb] ${bombOwner.pseudo} +${bonus} score (${destroyedBlocks.length} block(s)), total: ${bombOwner.score}`,
    );
    broadcastFunc("scoreUpdate", {
      playerId: bombOwner.id,
      score: bombOwner.score,
      bonus,
      reason: "blockDestroy",
    });
  }

  // Check player hits
  const hitPlayers = [];
  const killedPlayers = [];
  const now = Date.now();
  const explosionHitbox = PLAYER_HITBOX_SIZE;
  const bombOwnerTeam = bombOwner ? bombOwner.team || 0 : 0;

  lobby.players.forEach((player) => {
    if (player.dead) return;

    // Team-mode friendly fire protection
    if (
      bombOwnerTeam !== TEAMS.NONE &&
      (player.team || 0) === bombOwnerTeam &&
      player.id !== bomb.playerId
    ) {
      return;
    }

    if (player.invincibleUntil && now < player.invincibleUntil) {
      console.log(`[bomb] Player ${player.pseudo} is invincible, skipping hit`);
      return;
    }

    if (typeof player.x !== "number" || typeof player.y !== "number") return;

    const offset = (1 - explosionHitbox) / 2;
    const pLeft = player.x + offset;
    const pRight = player.x + offset + explosionHitbox;
    const pTop = player.y + offset;
    const pBottom = player.y + offset + explosionHitbox;

    const isHit = explosionCells.some((cell) => {
      return !(
        pRight <= cell.x ||
        pLeft >= cell.x + 1 ||
        pBottom <= cell.y ||
        pTop >= cell.y + 1
      );
    });

    if (isHit) {
      if (typeof player.lives !== "number") player.lives = 3;
      player.lives = Math.max(0, player.lives - 1);
      player.invincibleUntil = now + 2000;

      hitPlayers.push(player.id);
      console.log(
        `[bomb] Player ${player.pseudo} hit! Lives remaining: ${player.lives}`,
      );

      broadcastFunc("playerHit", {
        playerId: player.id,
        lives: player.lives,
        invincibleUntil: player.invincibleUntil,
      });

      if (player.lives <= 0) {
        player.dead = true;
        player.deathTime = now;
        killedPlayers.push(player.id);
        console.log(`[bomb] Player ${player.pseudo} has been eliminated!`);

        if (player._moveInterval) {
          clearInterval(player._moveInterval);
          player._moveInterval = null;
        }
        player._inputState = {
          left: false,
          right: false,
          up: false,
          down: false,
        };

        spawnDeathPowerUp(lobby, player, broadcastFunc);

        broadcastFunc("playerDeath", {
          playerId: player.id,
          pseudo: player.pseudo,
        });

        broadcastFunc("gameChat", {
          message: {
            system: true,
            text: `☠ ${player.pseudo} a été éliminé !`,
            time: formatTime(),
          },
        });
      }
    }
  });

  // ── Win condition check (delegated to shared/game-rules.js) ──
  if (lobby.players.length > 1 && !lobby._gameWinBroadcasted) {
    const { gameOver, winPayload } = checkWinCondition(lobby.players);

    if (gameOver) {
      lobby._gameWinBroadcasted = true;
      const winner = winPayload.winnerId
        ? lobby.players.find((p) => p.id === winPayload.winnerId)
        : null;
      console.log(
        `[bomb] Game over! Winner: ${winner ? winner.pseudo : winPayload.winningTeam ? `Team ${winPayload.winningTeam}` : "nobody"}`,
      );
      broadcastFunc("gameWin", winPayload);

      broadcastFunc("gameChat", {
        message: {
          system: true,
          text: buildWinText(winPayload, lobby.players),
          time: formatTime(),
        },
      });
    }
  }

  // Broadcast explosion event
  broadcastFunc("bombExplode", {
    bomb: {
      id: bomb.id,
      x: bomb.x,
      y: bomb.y,
      range: bomb.range,
    },
    explosionCells,
    destroyedBlocks,
    hitPlayers,
    killedPlayers,
    timestamp: Date.now(),
  });

  // Destroy power-ups caught in explosion
  if (lobby.powerUps && lobby.powerUps.length > 0) {
    const destroyedPowerUps = [];
    lobby.powerUps = lobby.powerUps.filter((pu) => {
      if (pu.fromDeath) {
        delete pu.fromDeath;
        return true;
      }
      const hit = explosionCells.some(
        (cell) => cell.x === pu.x && cell.y === pu.y,
      );
      if (hit) {
        destroyedPowerUps.push(pu.id);
        console.log(
          `[bomb] Power-up ${pu.type} at (${pu.x},${pu.y}) destroyed by explosion`,
        );
      }
      return !hit;
    });
    if (destroyedPowerUps.length > 0) {
      broadcastFunc("powerUpDestroyed", { powerUpIds: destroyedPowerUps });
    }
  }

  // Chain reaction
  if (lobby.bombs && lobby.bombs.length > 0) {
    lobby.bombs.forEach((otherBomb) => {
      if (otherBomb.id === bomb.id) return;
      if (otherBomb.explosionTime <= now) return;
      const caught = explosionCells.some(
        (cell) => cell.x === otherBomb.x && cell.y === otherBomb.y,
      );
      if (caught) {
        otherBomb.explosionTime = 0;
        console.log(
          `[bomb] Chain reaction: bomb at (${otherBomb.x},${otherBomb.y}) triggered`,
        );
      }
    });
  }

  // Broadcast map update and spawn power-ups from destroyed blocks
  if (destroyedBlocks.length > 0) {
    broadcastFunc("mapUpdate", {
      map: lobby.map,
      destroyedBlocks,
    });
    spawnPowerUps(lobby, destroyedBlocks, broadcastFunc);
  }
}
