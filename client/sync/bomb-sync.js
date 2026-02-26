// client/sync/bomb-sync.js
// Bomb and map-related socket handlers.

export function registerBombSync(safeOn, state) {
  // ── bombPlaced ──
  safeOn("bombPlaced", (msg) => {
    if (!msg || !msg.bomb) return;
    state.bombs.push({
      id: msg.bomb.id,
      x: msg.bomb.x,
      y: msg.bomb.y,
      playerId: msg.bomb.playerId,
      placedAt: msg.bomb.placedAt,
      explosionTime: msg.bomb.explosionTime,
    });
  });

  // ── bombExplode ──
  safeOn("bombExplode", (msg) => {
    if (!msg) return;
    state.bombs = state.bombs.filter((b) => b.id !== msg.bomb.id);
    state.explosions.push({
      id: msg.bomb.id,
      cells: msg.explosionCells,
      startTime: Date.now(),
      duration: 800,
    });
    if (msg.destroyedBlocks && Array.isArray(msg.destroyedBlocks)) {
      msg.destroyedBlocks.forEach((block) => {
        state.destroyingBlocks.push({
          x: block.x,
          y: block.y,
          startTime: Date.now(),
          duration: 800,
        });
      });
      setTimeout(() => {
        const blockPositions = new Set(
          msg.destroyedBlocks.map((b) => `${b.x},${b.y}`),
        );
        state.destroyingBlocks = state.destroyingBlocks.filter(
          (b) => !blockPositions.has(`${b.x},${b.y}`),
        );
      }, 850);
    }
    setTimeout(() => {
      state.explosions = state.explosions.filter((e) => e.id !== msg.bomb.id);
    }, 850);
  });

  // ── mapUpdate ──
  safeOn("mapUpdate", (msg) => {
    if (!msg || !msg.map) return;
    state.map = msg.map;
  });
}
