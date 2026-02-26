// client/sync/powerup-sync.js
// Power-up and status-effect socket handlers.

export function registerPowerupSync(safeOn, state) {
  // ── powerUpSpawned ──
  safeOn("powerUpSpawned", (msg) => {
    if (!msg || !Array.isArray(msg.powerUps)) return;
    msg.powerUps.forEach((pu) => {
      if (!state.powerUps.find((p) => p.id === pu.id)) {
        state.powerUps.push(pu);
      }
    });
  });

  // ── powerUpCollected ──
  safeOn("powerUpCollected", (msg) => {
    if (!msg) return;
    const collected = state.powerUps.find((pu) => pu.id === msg.powerUpId);
    state.powerUps = state.powerUps.filter((pu) => pu.id !== msg.powerUpId);
    if (collected && typeof document !== "undefined") {
      const flashId = `flash-${collected.id}`;
      state.pickupFlashes.push({
        id: flashId,
        x: collected.x,
        y: collected.y,
        type: msg.puType,
        startTime: Date.now(),
        duration: 400,
      });
      setTimeout(() => {
        state.pickupFlashes = state.pickupFlashes.filter(
          (f) => f.id !== flashId,
        );
      }, 450);
    }
    if (msg.playerStats) {
      state.players = state.players.map((p) => {
        if (p.id === msg.playerId) {
          return {
            ...p,
            lives:
              msg.playerStats.lives !== undefined
                ? msg.playerStats.lives
                : p.lives,
            maxBombs: msg.playerStats.maxBombs,
            bombRange: msg.playerStats.bombRange,
            speed: msg.playerStats.speed,
            wallpass: msg.playerStats.wallpass,
            detonator: msg.playerStats.detonator,
            vestActive: msg.playerStats.vestActive || false,
            invincibleUntil:
              msg.playerStats.invincibleUntil || p.invincibleUntil,
            skullEffect: msg.playerStats.skullEffect || null,
            skullUntil: msg.playerStats.skullUntil || null,
            invisible: msg.playerStats.invisible || false,
          };
        }
        return p;
      });
    }
    if (msg.scoreBonus && msg.playerId === state.localPlayerId) {
      state.score += msg.scoreBonus;
    }
  });

  // ── powerUpDestroyed ──
  safeOn("powerUpDestroyed", (msg) => {
    if (!msg || !Array.isArray(msg.powerUpIds)) return;
    const destroyedSet = new Set(msg.powerUpIds);
    state.powerUps = state.powerUps.filter((pu) => !destroyedSet.has(pu.id));
  });

  // ── vestExpired ──
  safeOn("vestExpired", (msg) => {
    if (!msg) return;
    state.players = state.players.map((p) => {
      if (p.id === msg.playerId) return { ...p, vestActive: false };
      return p;
    });
  });

  // ── skullExpired ──
  safeOn("skullExpired", (msg) => {
    if (!msg) return;
    state.players = state.players.map((p) => {
      if (p.id === msg.playerId) {
        return { ...p, skullEffect: null, skullUntil: null, invisible: false };
      }
      return p;
    });
  });

  // ── skullContagion ──
  safeOn("skullContagion", (msg) => {
    if (!msg) return;
    state.players = state.players.map((p) => {
      if (p.id === msg.toPlayerId) {
        return {
          ...p,
          skullEffect: msg.effect,
          skullUntil: Date.now() + 10000,
          invisible: msg.effect === "invisible",
        };
      }
      if (p.id === msg.fromPlayerId) {
        return { ...p, skullEffect: null, skullUntil: null, invisible: false };
      }
      return p;
    });
  });
}
