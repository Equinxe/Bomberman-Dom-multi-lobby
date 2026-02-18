// server/bomb.js
// Bomb logic for the game server

/**
 * Place a bomb at the player's position
 */
export function placeBomb(lobby, player) {
  if (!lobby.bombs) lobby.bombs = [];

  // Check if player can place more bombs (max 1 by default)
  const playerBombCount = lobby.bombs.filter(
    (b) => b.playerId === player.id
  ).length;
  const maxBombs = player.maxBombs || 1;

  if (playerBombCount >= maxBombs) {
    console.log(
      `[bomb] Player ${player.pseudo} already has ${maxBombs} bomb(s)`
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
    `[bomb] Player ${player.pseudo} placed bomb at (${bombX}, ${bombY})`
  );

  return bomb;
}

/**
 * Check if a position has a bomb that should block the player
 * Uses hitbox collision for precise detection
 */
export function isBombBlocking(lobby, playerId, x, y, hitboxSize = 0.6) {
  if (!lobby.bombs) return false;

  // Get player's hitbox
  const playerHitbox = {
    left: x + (1 - hitboxSize) / 2,
    right: x + (1 - hitboxSize) / 2 + hitboxSize,
    top: y + (1 - hitboxSize) / 2,
    bottom: y + (1 - hitboxSize) / 2 + hitboxSize,
  };

  for (const bomb of lobby.bombs) {
    // If player is inside the bomb cell, they can move freely
    if (bomb.playersInside.has(playerId)) {
      continue;
    }

    // Bomb occupies the entire cell from bomb.x to bomb.x+1, bomb.y to bomb.y+1
    const bombLeft = bomb.x;
    const bombRight = bomb.x + 1;
    const bombTop = bomb.y;
    const bombBottom = bomb.y + 1;

    // Check AABB collision between player hitbox and bomb cell
    const collides = !(
      playerHitbox.right <= bombLeft ||
      playerHitbox.left >= bombRight ||
      playerHitbox.bottom <= bombTop ||
      playerHitbox.top >= bombBottom
    );

    if (collides) {
      return true; // Bomb blocks the player
    }
  }

  return false;
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
  hitboxSize = 0.6
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
          `[bomb] Player ${playerId} fully exited bomb at (${bomb.x}, ${bomb.y})`
        );
      }
    }
  });
}

/**
 * Check and trigger bomb explosions
 */
export function checkBombExplosions(lobby, broadcastFunc) {
  if (!lobby.bombs || lobby.bombs.length === 0) return;

  const now = Date.now();
  const explodingBombs = lobby.bombs.filter((b) => b.explosionTime <= now);

  explodingBombs.forEach((bomb) => {
    explodeBomb(lobby, bomb, broadcastFunc);
  });

  // Remove exploded bombs
  lobby.bombs = lobby.bombs.filter((b) => b.explosionTime > now);
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
  const HITBOX_SIZE = 0.6;

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
    const offset = (1 - HITBOX_SIZE) / 2;
    const pLeft = player.x + offset;
    const pRight = player.x + offset + HITBOX_SIZE;
    const pTop = player.y + offset;
    const pBottom = player.y + offset + HITBOX_SIZE;

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
        `[bomb] Player ${player.pseudo} hit! Lives remaining: ${player.lives}`
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
  if (lobby.players.length > 1 && alivePlayers.length <= 1 && !lobby._gameWinBroadcasted) {
    lobby._gameWinBroadcasted = true; // ✅ Prevent repeated gameWin broadcasts
    const winner = alivePlayers[0] || null;
    console.log(
      `[bomb] Game over! Winner: ${winner ? winner.pseudo : "nobody"}`
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

  // If blocks were destroyed, broadcast updated map
  if (destroyedBlocks.length > 0) {
    broadcastFunc("mapUpdate", {
      map: lobby.map,
      destroyedBlocks,
    });
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
