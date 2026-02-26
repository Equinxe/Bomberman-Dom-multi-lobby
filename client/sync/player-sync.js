// client/sync/player-sync.js
// Player-related socket handlers and helpers.

// ---------- normalizePlayers ----------
export function normalizePlayers(raw, cols = 15, rows = 13) {
  if (!Array.isArray(raw)) return [];
  const spawns = [
    { x: 1, y: 1 },
    { x: cols - 2, y: rows - 2 },
    { x: cols - 2, y: 1 },
    { x: 1, y: rows - 2 },
  ];
  return raw.map((p, i) => {
    const out = { ...p };
    if (typeof out.x !== "number" || typeof out.y !== "number") {
      const s = spawns[i] || spawns[i % spawns.length];
      out.x = s.x;
      out.y = s.y;
    }
    out.id = out.id ?? out.pseudo ?? `p${i + 1}`;
    out.pseudo = out.pseudo ?? `J${i + 1}`;
    out.color = typeof out.color === "number" ? out.color : i % 8;
    out.lives = typeof out.lives === "number" ? out.lives : 3;
    out.dead = !!out.dead;
    out.invincibleUntil = out.invincibleUntil || null;
    return out;
  });
}

// ---------- registerPlayerSync ----------
export function registerPlayerSync(safeOn, state, callbacks = {}) {
  // ── playerInput ──
  safeOn("playerInput", (msg) => {
    if (!msg) return;
    const pid = msg.playerId;
    const payload = msg.payload || {};
    if (!state.localPlayerId && state.players && state.localPseudo) {
      const c = state.players.find((pl) => pl.pseudo === state.localPseudo);
      if (c) state.localPlayerId = c.id;
    }
    if (pid && pid === state.localPlayerId) return;
    if (pid && !state.remoteInputState[pid]) {
      state.remoteInputState[pid] = {
        left: false,
        right: false,
        up: false,
        down: false,
      };
    }
    if (payload.type === "move" && typeof payload.dir === "string") {
      const dir = payload.dir;
      const active = !!payload.active;
      if (dir === "left") state.remoteInputState[pid].left = active;
      else if (dir === "right") state.remoteInputState[pid].right = active;
      else if (dir === "up") state.remoteInputState[pid].up = active;
      else if (dir === "down") state.remoteInputState[pid].down = active;
    }
  });

  // ── playerPosition ──
  safeOn("playerPosition", (msg) => {
    if (!msg || !msg.player) return;
    const p = msg.player;
    let found = false;
    state.players = state.players.map((pl) => {
      if (pl.id === p.id || pl.pseudo === p.pseudo) {
        found = true;
        return {
          ...pl,
          id: p.id,
          x: p.x,
          y: p.y,
          lives: p.lives !== undefined ? p.lives : pl.lives,
          dead: p.dead !== undefined ? p.dead : pl.dead,
          invincibleUntil:
            p.invincibleUntil !== undefined
              ? p.invincibleUntil
              : pl.invincibleUntil,
          maxBombs: p.maxBombs !== undefined ? p.maxBombs : pl.maxBombs,
          bombRange: p.bombRange !== undefined ? p.bombRange : pl.bombRange,
          speed: p.speed !== undefined ? p.speed : pl.speed,
          wallpass: p.wallpass !== undefined ? p.wallpass : pl.wallpass,
          detonator: p.detonator !== undefined ? p.detonator : pl.detonator,
          vestActive: p.vestActive !== undefined ? p.vestActive : pl.vestActive,
          vestUntil: p.vestUntil !== undefined ? p.vestUntil : pl.vestUntil,
          skullEffect:
            p.skullEffect !== undefined ? p.skullEffect : pl.skullEffect,
          skullUntil: p.skullUntil !== undefined ? p.skullUntil : pl.skullUntil,
          invisible: p.invisible !== undefined ? p.invisible : pl.invisible,
          team: p.team !== undefined ? p.team : pl.team,
        };
      }
      return pl;
    });
    if (!found && p.pseudo) {
      for (let i = 0; i < state.players.length; i++) {
        if (state.players[i].pseudo === p.pseudo) {
          state.players[i] = { ...state.players[i], id: p.id, x: p.x, y: p.y };
          break;
        }
      }
    }
  });

  // ── playerHit ──
  safeOn("playerHit", (msg) => {
    if (!msg) return;
    state.players = state.players.map((p) => {
      if (p.id === msg.playerId) {
        return { ...p, lives: msg.lives, invincibleUntil: msg.invincibleUntil };
      }
      return p;
    });
  });

  // ── playerDeath ──
  safeOn("playerDeath", (msg) => {
    if (!msg) return;
    state.players = state.players.map((p) => {
      if (p.id === msg.playerId) {
        return { ...p, dead: true, lives: 0 };
      }
      return p;
    });
    if (
      msg.playerId === state.localPlayerId &&
      callbacks.showSpectatorOverlay
    ) {
      callbacks.showSpectatorOverlay(state.localPseudo);
    }
  });
}
