// server/gameManager.js
import crypto from "crypto";

/**
 * Generate a unique, non-predictable map seed for a game start.
 */
export function makeMapSeed(lobbyCode) {
  const now = Date.now().toString();
  const rand = crypto.randomBytes(8).toString("hex");
  const raw = `${lobbyCode || "anon"}:${now}:${rand}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

/**
 * Start a game for a lobby and notify clients via broadcastFunc.
 */
export function startGameForLobby(
  broadcastFunc,
  lobbyRoomCode,
  players,
  lobbyCode,
  opts = {},
) {
  const mapSeed = opts.mapSeed || makeMapSeed(lobbyCode);

  const payload = {
    players,
    initialCountdown: opts.initialCountdown ?? 300,
    gameTimer: opts.gameTimer ?? opts.initialCountdown ?? 300,
    mapSeed,
    map: opts.mapGrid ?? null,
    mapOptions: opts.mapOptions ?? { destructibleProb: 0.42 },
    gameMode: opts.gameMode ?? "ffa",
  };

  broadcastFunc("gameStart", payload);
  return mapSeed;
}
