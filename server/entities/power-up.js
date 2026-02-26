// server/entities/power-up.js
import {
  POWERUP_TYPE_KEYS,
  POWERUP_DROP_CHANCE,
  PLAYER_HITBOX_SIZE,
} from "../../shared/constants.js";
import { applySkullCurse } from "./skull-curse.js";

// Score bonuses for power-up pickups
export const POWERUP_SCORE_BONUS = {
  vest: 500,
  skull: 6000,
  liveup: 300,
  bombs: 100,
  flames: 100,
  speed: 100,
  wallpass: 200,
  detonator: 200,
};

export const VEST_DURATION = 10000;

/**
 * Spawn power-ups from destroyed blocks.
 */
export function spawnPowerUps(lobby, destroyedBlocks, broadcastFunc) {
  if (!lobby.powerUps) lobby.powerUps = [];

  const newPowerUps = [];
  destroyedBlocks.forEach((block) => {
    if (Math.random() < POWERUP_DROP_CHANCE) {
      const typeKey =
        POWERUP_TYPE_KEYS[Math.floor(Math.random() * POWERUP_TYPE_KEYS.length)];
      const powerUp = {
        id: `pu-${block.x}-${block.y}-${Date.now()}`,
        x: block.x,
        y: block.y,
        type: typeKey,
      };
      lobby.powerUps.push(powerUp);
      newPowerUps.push(powerUp);
    }
  });

  if (newPowerUps.length > 0) {
    broadcastFunc("powerUpSpawned", { powerUps: newPowerUps });
    console.log(
      `[power-up] Spawned ${newPowerUps.length} power-up(s):`,
      newPowerUps.map((p) => `${p.type}@(${p.x},${p.y})`).join(", "),
    );
  }
}

/**
 * When a player dies, drop a random power-up at their position.
 */
export function spawnDeathPowerUp(lobby, player, broadcastFunc) {
  if (!lobby.powerUps) lobby.powerUps = [];
  if (typeof player.x !== "number" || typeof player.y !== "number") return;

  const dropX = Math.round(player.x);
  const dropY = Math.round(player.y);

  const typeKey =
    POWERUP_TYPE_KEYS[Math.floor(Math.random() * POWERUP_TYPE_KEYS.length)];
  const powerUp = {
    id: `pu-death-${player.id}-${Date.now()}`,
    x: dropX,
    y: dropY,
    type: typeKey,
    fromDeath: true,
  };
  lobby.powerUps.push(powerUp);
  broadcastFunc("powerUpSpawned", { powerUps: [powerUp] });
  console.log(
    `[power-up] Player ${player.pseudo} died → dropped ${typeKey} at (${dropX},${dropY})`,
  );
}

/**
 * Check if a player picks up a power-up at their position (hitbox overlap).
 */
export function checkPowerUpPickup(lobby, player, broadcastFunc) {
  if (!lobby.powerUps || lobby.powerUps.length === 0) return;
  if (player.dead) return;
  if (typeof player.x !== "number" || typeof player.y !== "number") return;

  const hitbox = PLAYER_HITBOX_SIZE;
  const offset = (1 - hitbox) / 2;
  const pLeft = player.x + offset;
  const pRight = player.x + offset + hitbox;
  const pTop = player.y + offset;
  const pBottom = player.y + offset + hitbox;

  const pickedUp = [];

  lobby.powerUps = lobby.powerUps.filter((pu) => {
    const overlaps = !(
      pRight <= pu.x ||
      pLeft >= pu.x + 1 ||
      pBottom <= pu.y ||
      pTop >= pu.y + 1
    );

    if (overlaps) {
      applyPowerUp(player, pu.type);
      pickedUp.push(pu);
      return false;
    }
    return true;
  });

  if (pickedUp.length > 0) {
    pickedUp.forEach((pu) => {
      console.log(
        `[power-up] Player ${player.pseudo} picked up ${pu.type} at (${pu.x},${pu.y})`,
      );

      const scoreBonus = POWERUP_SCORE_BONUS[pu.type] || 0;
      if (scoreBonus > 0) {
        if (typeof player.score !== "number") player.score = 0;
        player.score += scoreBonus;
        console.log(
          `[power-up] Player ${player.pseudo} +${scoreBonus} score (${pu.type}), total: ${player.score}`,
        );
      }

      broadcastFunc("powerUpCollected", {
        powerUpId: pu.id,
        playerId: player.id,
        puType: pu.type,
        scoreBonus,
        playerStats: {
          lives: player.lives,
          maxBombs: player.maxBombs || 1,
          bombRange: player.bombRange || 3,
          speed: player.speed || 4,
          wallpass: !!player.wallpass,
          detonator: !!player.detonator,
          vestActive: !!player.vestActive,
          vestUntil: player.vestUntil || null,
          invincibleUntil: player.invincibleUntil || null,
          skullEffect: player.skullEffect || null,
          skullUntil: player.skullUntil || null,
          canPlaceBombs: player.canPlaceBombs !== false,
          autoBomb: !!player.autoBomb,
          invisible: !!player.invisible,
        },
      });
    });
  }
}

/**
 * Apply a power-up effect to a player.
 */
export function applyPowerUp(player, type) {
  switch (type) {
    case "skull":
      applySkullCurse(player);
      return;
    case "bombs":
      player.maxBombs = Math.min((player.maxBombs || 1) + 1, 8);
      break;
    case "flames":
      player.bombRange = Math.min((player.bombRange || 3) + 1, 10);
      break;
    case "speed":
      player.speed = Math.min((player.speed || 4) + 0.5, 8);
      break;
    case "wallpass":
      player.wallpass = true;
      break;
    case "detonator":
      player.detonator = true;
      break;
    case "liveup":
      if (typeof player.lives !== "number") player.lives = 3;
      player.lives = Math.min(player.lives + 1, 5);
      console.log(
        `[power-up] Player ${player.pseudo} gained a life! Lives: ${player.lives}`,
      );
      break;
    case "vest":
      player.invincibleUntil = Date.now() + VEST_DURATION;
      player.vestActive = true;
      player.vestUntil = Date.now() + VEST_DURATION;
      console.log(
        `[power-up] Player ${player.pseudo} is now invincible for 10s (Vest)`,
      );
      break;
  }
}
