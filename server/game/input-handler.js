// server/game/input-handler.js

import { startPlayerMoveInterval, stopPlayerMoveInterval } from "./movement.js";
import { placeBomb, detonateBombs } from "../bomb.js";

/**
 * Handle a player "input" message (movement or action).
 */
export function handleInput(lobby, player, payload, broadcastFn) {
  const code = lobby.code;
  const playerId = player.id;

  if (player.dead) return;

  // Movement
  if (payload.type === "move" && typeof payload.dir === "string") {
    const dir = payload.dir;
    const active = !!payload.active;

    player._inputState = player._inputState || {
      left: false,
      right: false,
      up: false,
      down: false,
    };

    if (dir === "left") player._inputState.left = active;
    else if (dir === "right") player._inputState.right = active;
    else if (dir === "up") player._inputState.up = active;
    else if (dir === "down") player._inputState.down = active;

    const anyActive =
      player._inputState.left ||
      player._inputState.right ||
      player._inputState.up ||
      player._inputState.down;

    if (anyActive) {
      startPlayerMoveInterval(lobby, player, broadcastFn);
    } else {
      stopPlayerMoveInterval(player);
    }

    // Broadcast input state for UI feedback
    broadcastFn(code, {
      type: "playerInput",
      playerId,
      payload,
      ts: Date.now(),
    });

    return;
  }

  // Actions (bomb, detonate)
  if (payload.type === "action") {
    if (payload.action === "placeBomb") {
      const bomb = placeBomb(lobby, player);
      if (bomb) {
        broadcastFn(code, {
          type: "bombPlaced",
          bomb: {
            id: bomb.id,
            x: bomb.x,
            y: bomb.y,
            playerId: bomb.playerId,
            placedAt: bomb.placedAt,
            explosionTime: bomb.explosionTime,
          },
          timestamp: Date.now(),
        });
      }
    } else if (payload.action === "detonate") {
      const winCheckBroadcast =
        lobby._broadcastWithWinCheck ||
        ((type, p) => broadcastFn(code, { type, ...p }));
      detonateBombs(lobby, player, winCheckBroadcast);
    } else {
      broadcastFn(code, {
        type: "playerAction",
        playerId,
        action: payload.action,
        timestamp: Date.now(),
      });
    }
    return;
  }
}
