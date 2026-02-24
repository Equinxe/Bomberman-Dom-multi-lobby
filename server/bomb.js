// server/bomb.js
// Bomb logic for the game server
import {
  POWERUP_TYPE_KEYS,
  POWERUP_DROP_CHANCE,
  PLAYER_HITBOX_SIZE,
} from "../shared/constants.js";

// ============= SKULL CURSE DEFINITIONS =============
const SKULL_EFFECTS = [
  "slow", // Temporarily reduces speed
  "fast", // Radically increases speed (hard to control)
  "constipation", // Disallows laying bombs
  "diarrhea", // Keeps laying bombs at high speed (auto-bomb)
  "invisible", // Makes Bomberman invisible to other players
  "minRange", // Only one minimum-range bomb at a time
];
const SKULL_DURATION = 10000; // 10 seconds
const VEST_DURATION = 10000; // 10 seconds

// ✅ Score bonuses for power-up pickups
const POWERUP_SCORE_BONUS = {
  vest: 500,
  skull: 6000,
  liveup: 300,
  bombs: 100,
  flames: 100,
  speed: 100,
  wallpass: 200,
  detonator: 200,
};

/**
 * Spawn power-ups from destroyed blocks
 * Each block has a POWERUP_DROP_CHANCE to drop a random power-up
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
      `[bomb] Spawned ${newPowerUps.length} power-up(s):`,
      newPowerUps.map((p) => `${p.type}@(${p.x},${p.y})`).join(", "),
    );
  }
}

/**
 * ✅ BONUS: When a player dies, drop a random power-up at their position
 */
function spawnDeathPowerUp(lobby, player, broadcastFunc) {
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
  };
  lobby.powerUps.push(powerUp);
  broadcastFunc("powerUpSpawned", { powerUps: [powerUp] });
  console.log(
    `[bomb] Player ${player.pseudo} died → dropped ${typeKey} at (${dropX},${dropY})`,
  );
}

/**
 * Check if a player picks up a power-up at their position
 * Uses hitbox overlap for precise pickup detection
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
    // Power-up occupies [pu.x, pu.x+1) x [pu.y, pu.y+1)
    const overlaps = !(
      pRight <= pu.x ||
      pLeft >= pu.x + 1 ||
      pBottom <= pu.y ||
      pTop >= pu.y + 1
    );

    if (overlaps) {
      // Apply power-up effect to player
      applyPowerUp(player, pu.type);
      pickedUp.push(pu);
      return false; // Remove from map
    }
    return true;
  });

  if (pickedUp.length > 0) {
    pickedUp.forEach((pu) => {
      console.log(
        `[bomb] Player ${player.pseudo} picked up ${pu.type} at (${pu.x},${pu.y})`,
      );

      // ✅ Score bonuses for special power-ups
      const scoreBonus = POWERUP_SCORE_BONUS[pu.type] || 0;
      if (scoreBonus > 0) {
        if (typeof player.score !== "number") player.score = 0;
        player.score += scoreBonus;
        console.log(
          `[bomb] Player ${player.pseudo} +${scoreBonus} score (${pu.type}), total: ${player.score}`,
        );
      }

      broadcastFunc("powerUpCollected", {
        powerUpId: pu.id,
        playerId: player.id,
        puType: pu.type,
        scoreBonus,
        // Send updated player stats
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
 * Apply a power-up effect to a player
 */
function applyPowerUp(player, type) {
  switch (type) {
    case "bombs":
      player.maxBombs = Math.min((player.maxBombs || 1) + 1, 8); // cap at 8
      break;
    case "flames":
      player.bombRange = Math.min((player.bombRange || 3) + 1, 10); // cap at 10
      break;
    case "speed":
      player.speed = Math.min((player.speed || 4) + 0.5, 8); // cap at 8
      break;
    case "wallpass":
      player.wallpass = true;
      break;
    case "detonator":
      player.detonator = true;
      break;
    case "liveup":
      // Extra life, cap at 5
      if (typeof player.lives !== "number") player.lives = 3;
      player.lives = Math.min(player.lives + 1, 5);
      console.log(
        `[bomb] Player ${player.pseudo} gained a life! Lives: ${player.lives}`,
      );
      break;
    case "vest":
      // 10 seconds of invincibility
      player.invincibleUntil = Date.now() + VEST_DURATION;
      player.vestActive = true;
      player.vestUntil = Date.now() + VEST_DURATION;
      console.log(
        `[bomb] Player ${player.pseudo} is now invincible for 10s (Vest)`,
      );
      break;
    case "skull":
      applySkullCurse(player);
      break;
  }
}

/**
 * Apply a random skull curse to a player
 */
function applySkullCurse(player) {
  // Clear any existing skull curse first
  clearSkullCurse(player);

  const effect =
    SKULL_EFFECTS[Math.floor(Math.random() * SKULL_EFFECTS.length)];
  const now = Date.now();

  player.skullEffect = effect;
  player.skullUntil = now + SKULL_DURATION;

  // Save original stats so we can restore them
  player._preSkull = {
    speed: player.speed || 4,
    maxBombs: player.maxBombs || 1,
    bombRange: player.bombRange || 3,
  };

  switch (effect) {
    case "slow":
      player.speed = 1.5; // Very slow
      break;
    case "fast":
      player.speed = 10; // Uncontrollably fast
      break;
    case "constipation":
      player.canPlaceBombs = false; // Block bomb placement
      break;
    case "diarrhea":
      player.autoBomb = true; // Server will auto-place bombs
      break;
    case "minRange":
      player.maxBombs = 1;
      player.bombRange = 1;
      break;
    case "invisible":
      player.invisible = true; // Make player invisible
      break;
  }

  console.log(
    `[bomb] Player ${player.pseudo} cursed with skull: ${effect} for ${SKULL_DURATION / 1000}s`,
  );
}

/**
 * Clear skull curse and restore original stats
 */
function clearSkullCurse(player) {
  if (!player.skullEffect) return;

  const effect = player.skullEffect;

  // Restore original stats
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
  console.log(`[bomb] Player ${player.pseudo} skull curse (${effect}) expired`);
}

/**
 * Check and expire timed effects (vest, skull) for all players in a lobby.
 * Also handles skull auto-bomb (diarrhea) and skull contagion.
 * Called from the bomb check interval on server.
 */
export function checkTimedEffects(lobby, broadcastFunc) {
  if (!lobby.players) return;
  const now = Date.now();

  lobby.players.forEach((player) => {
    if (player.dead) return;

    // ✅ Expire vest
    if (player.vestActive && player.vestUntil && now >= player.vestUntil) {
      player.vestActive = false;
      delete player.vestUntil;
      // Don't remove invincibleUntil here if it was set by a hit — vest just adds extra
      console.log(`[bomb] Player ${player.pseudo} vest expired`);
      broadcastFunc("vestExpired", { playerId: player.id });
    }

    // ✅ Expire skull
    if (player.skullEffect && player.skullUntil && now >= player.skullUntil) {
      const oldEffect = player.skullEffect;
      clearSkullCurse(player);
      broadcastFunc("skullExpired", { playerId: player.id, effect: oldEffect });
    }

    // ✅ Skull auto-bomb (diarrhea): place a bomb every ~500ms
    if (player.autoBomb && !player.dead) {
      if (!player._lastAutoBomb || now - player._lastAutoBomb > 500) {
        player._lastAutoBomb = now;
        const bomb = placeBomb(lobby, player);
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

  // ✅ Skull contagion: if a cursed player touches a non-cursed player, spread it
  checkSkullContagion(lobby, broadcastFunc);
}

/**
 * Check if cursed players touch non-cursed players → spread skull
 */
function checkSkullContagion(lobby, broadcastFunc) {
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
        // Spread the curse!
        applySkullCurse(clean);
        broadcastFunc("skullContagion", {
          fromPlayerId: cursed.id,
          toPlayerId: clean.id,
          effect: clean.skullEffect,
        });
        // Clear the curse from the spreader
        const oldEffect = cursed.skullEffect;
        clearSkullCurse(cursed);
        broadcastFunc("skullExpired", {
          playerId: cursed.id,
          effect: oldEffect,
        });
        console.log(
          `[bomb] Skull contagion: ${cursed.pseudo} → ${clean.pseudo} (${clean.skullEffect})`,
        );
        break; // Only spread to one player per tick
      }
    }
  }
}

/**
 * Detonate all bombs placed by a player (detonator power-up)
 */
export function detonateBombs(lobby, player, broadcastFunc) {
  if (!player.detonator) return false;
  if (!lobby.bombs || lobby.bombs.length === 0) return false;

  const playerBombs = lobby.bombs.filter((b) => b.playerId === player.id);
  if (playerBombs.length === 0) return false;

  // Force all player's bombs to explode immediately by setting explosionTime to now
  const now = Date.now();
  playerBombs.forEach((bomb) => {
    bomb.explosionTime = now - 1; // Ensure it triggers on next check
  });

  console.log(
    `[bomb] Player ${player.pseudo} detonated ${playerBombs.length} bomb(s)`,
  );

  // Immediately trigger explosion check so detonation feels instant
  checkBombExplosions(lobby, broadcastFunc);

  return true;
}

/**
 * Place a bomb at the player's position
 */
export function placeBomb(lobby, player) {
  if (!lobby.bombs) lobby.bombs = [];

  // ✅ Block bomb placement if cursed with constipation
  if (player.canPlaceBombs === false) {
    console.log(
      `[bomb] Player ${player.pseudo} can't place bombs (skull: constipation)`,
    );
    return null;
  }

  // Check if player can place more bombs (max 1 by default)
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

  // Round position to grid cell (Math.round for better centering)
  const bombX = Math.round(player.x);
  const bombY = Math.round(player.y);

  // Check if there's already a bomb at this position
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
    explosionTime: Date.now() + 3000, // 3 seconds
    range: player.bombRange || 3, // default range of 3
    playersInside: new Set([player.id]), // Players who can pass through initially
  };

  lobby.bombs.push(bomb);
  console.log(
    `[bomb] Player ${player.pseudo} placed bomb at (${bombX}, ${bombY})`,
  );

  return bomb;
}

/**
 * Update bomb player tracking (when player moves out of bomb cell)
 * Uses hitbox to detect when player fully exits bomb
 */
export function updateBombPlayerTracking(
  lobby,
  playerId,
  x,
  y,
  hitboxSize = PLAYER_HITBOX_SIZE,
) {
  if (!lobby.bombs) return;

  // Get player's hitbox
  const playerHitbox = {
    left: x + (1 - hitboxSize) / 2,
    right: x + (1 - hitboxSize) / 2 + hitboxSize,
    top: y + (1 - hitboxSize) / 2,
    bottom: y + (1 - hitboxSize) / 2 + hitboxSize,
  };

  lobby.bombs.forEach((bomb) => {
    // If player was inside
    if (bomb.playersInside.has(playerId)) {
      // Check if player's hitbox is now completely outside bomb cell
      const bombLeft = bomb.x;
      const bombRight = bomb.x + 1;
      const bombTop = bomb.y;
      const bombBottom = bomb.y + 1;

      // Player is outside if hitbox doesn't overlap with bomb cell
      const isOutside =
        playerHitbox.right <= bombLeft ||
        playerHitbox.left >= bombRight ||
        playerHitbox.bottom <= bombTop ||
        playerHitbox.top >= bombBottom;

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
 * Check and trigger bomb explosions (with chain reaction support)
 * Uses a loop: after each batch of explosions, any bombs that were
 * chain-triggered (explosionTime set to 0) are exploded immediately
 * in the next iteration, preventing them from being silently removed.
 */
export function checkBombExplosions(lobby, broadcastFunc) {
  if (!lobby.bombs || lobby.bombs.length === 0) return;

  const explodedIds = new Set();
  let safety = 50; // prevent infinite loops

  while (safety-- > 0) {
    const now = Date.now();
    const explodingBombs = lobby.bombs.filter(
      (b) => b.explosionTime <= now && !explodedIds.has(b.id),
    );

    if (explodingBombs.length === 0) break;

    // Mark them as exploded before processing (so chain reactions
    // don't try to re-trigger them)
    explodingBombs.forEach((b) => explodedIds.add(b.id));

    // Explode each bomb (may set other bombs' explosionTime = 0)
    explodingBombs.forEach((bomb) => {
      explodeBomb(lobby, bomb, broadcastFunc);
    });

    // Remove exploded bombs from the array
    lobby.bombs = lobby.bombs.filter((b) => !explodedIds.has(b.id));
  }
}

/**
 * Explode a bomb and calculate affected cells
 */
function explodeBomb(lobby, bomb, broadcastFunc) {
  console.log(`[bomb] Exploding bomb at (${bomb.x}, ${bomb.y})`);

  const map = lobby.map;
  if (!map || !map.grid) return;

  const explosionCells = calculateExplosion(map, bomb.x, bomb.y, bomb.range);

  // Destroy blocks in explosion range
  const destroyedBlocks = [];
  explosionCells.forEach((cell) => {
    if (map.grid[cell.y] && map.grid[cell.y][cell.x] === "block") {
      map.grid[cell.y][cell.x] = "floor";
      destroyedBlocks.push({ x: cell.x, y: cell.y });
    }
  });

  // Check if players are hit (with invincibility check)
  // Uses hitbox-based collision for precise detection
  const hitPlayers = [];
  const killedPlayers = [];
  const now = Date.now();
  const explosionHitbox = PLAYER_HITBOX_SIZE;

  lobby.players.forEach((player) => {
    // Skip dead players
    if (player.dead) return;

    // Skip invincible players
    if (player.invincibleUntil && now < player.invincibleUntil) {
      console.log(`[bomb] Player ${player.pseudo} is invincible, skipping hit`);
      return;
    }

    if (typeof player.x !== "number" || typeof player.y !== "number") return;

    // Player hitbox
    const offset = (1 - explosionHitbox) / 2;
    const pLeft = player.x + offset;
    const pRight = player.x + offset + explosionHitbox;
    const pTop = player.y + offset;
    const pBottom = player.y + offset + explosionHitbox;

    // Check if player hitbox overlaps with any explosion cell
    const isHit = explosionCells.some((cell) => {
      // Each explosion cell occupies [cell.x, cell.x+1) x [cell.y, cell.y+1)
      return !(
        pRight <= cell.x ||
        pLeft >= cell.x + 1 ||
        pBottom <= cell.y ||
        pTop >= cell.y + 1
      );
    });

    if (isHit) {
      // Decrement lives
      if (typeof player.lives !== "number") player.lives = 3;
      player.lives = Math.max(0, player.lives - 1);

      // Apply invincibility (2 seconds)
      player.invincibleUntil = now + 2000;

      hitPlayers.push(player.id);
      console.log(
        `[bomb] Player ${player.pseudo} hit! Lives remaining: ${player.lives}`,
      );

      // Broadcast playerHit event
      broadcastFunc("playerHit", {
        playerId: player.id,
        lives: player.lives,
        invincibleUntil: player.invincibleUntil,
      });

      // Check if player is dead
      if (player.lives <= 0) {
        player.dead = true;
        player.deathTime = now;
        killedPlayers.push(player.id);
        console.log(`[bomb] Player ${player.pseudo} has been eliminated!`);

        // Stop their movement
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

        // ✅ BONUS: Dead player drops a random power-up at their position
        spawnDeathPowerUp(lobby, player, broadcastFunc);

        // Broadcast playerDeath event
        broadcastFunc("playerDeath", {
          playerId: player.id,
          pseudo: player.pseudo,
        });
      }
    }
  });

  // Check win condition: last player standing (only fire once per game)
  const alivePlayers = lobby.players.filter((p) => !p.dead);
  if (
    lobby.players.length > 1 &&
    alivePlayers.length <= 1 &&
    !lobby._gameWinBroadcasted
  ) {
    lobby._gameWinBroadcasted = true; // ✅ Prevent repeated gameWin broadcasts
    const winner = alivePlayers[0] || null;
    console.log(
      `[bomb] Game over! Winner: ${winner ? winner.pseudo : "nobody"}`,
    );
    broadcastFunc("gameWin", {
      winnerId: winner ? winner.id : null,
      winnerPseudo: winner ? winner.pseudo : null,
    });
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

  // ✅ Destroy power-ups caught in the explosion
  if (lobby.powerUps && lobby.powerUps.length > 0) {
    const destroyedPowerUps = [];
    lobby.powerUps = lobby.powerUps.filter((pu) => {
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

  // ✅ Chain reaction: trigger other bombs caught in the explosion
  if (lobby.bombs && lobby.bombs.length > 0) {
    lobby.bombs.forEach((otherBomb) => {
      if (otherBomb.id === bomb.id) return; // skip self
      if (otherBomb.explosionTime <= now) return; // already exploding
      const caught = explosionCells.some(
        (cell) => cell.x === otherBomb.x && cell.y === otherBomb.y,
      );
      if (caught) {
        otherBomb.explosionTime = 0; // will trigger on next tick
        console.log(
          `[bomb] Chain reaction: bomb at (${otherBomb.x},${otherBomb.y}) triggered`,
        );
      }
    });
  }

  // If blocks were destroyed, broadcast updated map and spawn power-ups
  if (destroyedBlocks.length > 0) {
    broadcastFunc("mapUpdate", {
      map: lobby.map,
      destroyedBlocks,
    });
    // ✅ Spawn power-ups from destroyed blocks
    spawnPowerUps(lobby, destroyedBlocks, broadcastFunc);
  }
}

/**
 * Calculate explosion cells in + pattern
 */
function calculateExplosion(map, bombX, bombY, range) {
  const cells = [{ x: bombX, y: bombY }]; // Center

  const directions = [
    { dx: 1, dy: 0 }, // right
    { dx: -1, dy: 0 }, // left
    { dx: 0, dy: 1 }, // down
    { dx: 0, dy: -1 }, // up
  ];

  directions.forEach(({ dx, dy }) => {
    for (let i = 1; i <= range; i++) {
      const x = bombX + dx * i;
      const y = bombY + dy * i;

      // Check bounds
      if (y < 0 || y >= map.grid.length || x < 0 || x >= map.grid[y].length) {
        break;
      }

      const cell = map.grid[y][x];

      // Stop if we hit a wall (don't include it)
      if (cell === "wall" || cell === "wallDark") {
        break;
      }

      cells.push({ x, y });

      // Stop after hitting a block (but include it)
      if (cell === "block") {
        break;
      }
    }
  });

  return cells;
}
