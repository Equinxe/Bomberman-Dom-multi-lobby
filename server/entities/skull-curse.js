// server/entities/skull-curse.js
import { PLAYER_HITBOX_SIZE } from "../../shared/constants.js";

export const SKULL_EFFECTS = [
  "slow",
  "fast",
  "constipation",
  "diarrhea",
  "invisible",
  "minRange",
];

export const SKULL_DURATION = 10000;

/**
 * Apply a random skull curse to a player.
 */
export function applySkullCurse(player) {
  clearSkullCurse(player);

  const effect =
    SKULL_EFFECTS[Math.floor(Math.random() * SKULL_EFFECTS.length)];
  const now = Date.now();

  player.skullEffect = effect;
  player.skullUntil = now + SKULL_DURATION;

  player._preSkull = {
    speed: player.speed || 4,
    maxBombs: player.maxBombs || 1,
    bombRange: player.bombRange || 3,
  };

  switch (effect) {
    case "slow":
      player.speed = 1.5;
      break;
    case "fast":
      player.speed = 10;
      break;
    case "constipation":
      player.canPlaceBombs = false;
      break;
    case "diarrhea":
      player.autoBomb = true;
      break;
    case "minRange":
      player.maxBombs = 1;
      player.bombRange = 1;
      break;
    case "invisible":
      player.invisible = true;
      break;
  }

  console.log(
    `[skull] Player ${player.pseudo} cursed with skull: ${effect} for ${SKULL_DURATION / 1000}s`,
  );
}

/**
 * Clear skull curse and restore original stats.
 */
export function clearSkullCurse(player) {
  if (!player.skullEffect) return;

  const effect = player.skullEffect;

  if (player._preSkull) {
    switch (effect) {
      case "slow":
      case "fast":
        player.speed = player._preSkull.speed;
        break;
      case "constipation":
        delete player.canPlaceBombs;
        break;
      case "diarrhea":
        delete player.autoBomb;
        break;
      case "minRange":
        player.maxBombs = player._preSkull.maxBombs;
        player.bombRange = player._preSkull.bombRange;
        break;
      case "invisible":
        delete player.invisible;
        break;
    }
    delete player._preSkull;
  }

  delete player.skullEffect;
  delete player.skullUntil;
  console.log(
    `[skull] Player ${player.pseudo} skull curse (${effect}) expired`,
  );
}

/**
 * Check and expire timed effects (vest, skull) for all players.
 * Also handles skull auto-bomb (diarrhea) and contagion.
 */
export function checkTimedEffects(lobby, broadcastFunc, placeBombFn) {
  if (!lobby.players) return;
  const now = Date.now();

  lobby.players.forEach((player) => {
    if (player.dead) return;

    // Expire vest
    if (player.vestActive && player.vestUntil && now >= player.vestUntil) {
      player.vestActive = false;
      delete player.vestUntil;
      console.log(`[skull] Player ${player.pseudo} vest expired`);
      broadcastFunc("vestExpired", { playerId: player.id });
    }

    // Expire skull
    if (player.skullEffect && player.skullUntil && now >= player.skullUntil) {
      const oldEffect = player.skullEffect;
      clearSkullCurse(player);
      broadcastFunc("skullExpired", { playerId: player.id, effect: oldEffect });
    }

    // Skull auto-bomb (diarrhea)
    if (player.autoBomb && !player.dead) {
      if (!player._lastAutoBomb || now - player._lastAutoBomb > 500) {
        player._lastAutoBomb = now;
        const bomb = placeBombFn(lobby, player);
        if (bomb) {
          broadcastFunc("bombPlaced", {
            bomb: {
              id: bomb.id,
              x: bomb.x,
              y: bomb.y,
              playerId: bomb.playerId,
              placedAt: bomb.placedAt,
              explosionTime: bomb.explosionTime,
            },
            timestamp: now,
          });
        }
      }
    }
  });

  // Skull contagion
  checkSkullContagion(lobby, broadcastFunc);
}

/**
 * Spread skull curse from cursed to touching non-cursed players.
 */
export function checkSkullContagion(lobby, broadcastFunc) {
  if (!lobby.players) return;
  const now = Date.now();
  const hitbox = PLAYER_HITBOX_SIZE;
  const offset = (1 - hitbox) / 2;

  const cursedPlayers = lobby.players.filter(
    (p) => !p.dead && p.skullEffect && p.skullUntil && now < p.skullUntil,
  );
  if (cursedPlayers.length === 0) return;

  const cleanPlayers = lobby.players.filter(
    (p) => !p.dead && !p.skullEffect && typeof p.x === "number",
  );
  if (cleanPlayers.length === 0) return;

  for (const cursed of cursedPlayers) {
    if (typeof cursed.x !== "number") continue;

    const cLeft = cursed.x + offset;
    const cRight = cursed.x + offset + hitbox;
    const cTop = cursed.y + offset;
    const cBottom = cursed.y + offset + hitbox;

    for (const clean of cleanPlayers) {
      const pLeft = clean.x + offset;
      const pRight = clean.x + offset + hitbox;
      const pTop = clean.y + offset;
      const pBottom = clean.y + offset + hitbox;

      const overlaps = !(
        cRight <= pLeft ||
        cLeft >= pRight ||
        cBottom <= pTop ||
        cTop >= pBottom
      );

      if (overlaps) {
        applySkullCurse(clean);
        broadcastFunc("skullContagion", {
          fromPlayerId: cursed.id,
          toPlayerId: clean.id,
          effect: clean.skullEffect,
        });
        const oldEffect = cursed.skullEffect;
        clearSkullCurse(cursed);
        broadcastFunc("skullExpired", {
          playerId: cursed.id,
          effect: oldEffect,
        });
        console.log(
          `[skull] Skull contagion: ${cursed.pseudo} → ${clean.pseudo} (${clean.skullEffect})`,
        );
        break; // One spread per tick
      }
    }
  }
}
