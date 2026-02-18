// server/gameManager.js
// Exports helper to generate a new mapSeed and to start a game for a lobby.
// Uses ES modules so it can be imported by the multiplayer server.
import crypto from "crypto";

/**
 * Génère une mapSeed unique et non prédictible pour chaque gameStart.
 * Combine lobbyCode + timestamp + random bytes.
 */
export function makeMapSeed(lobbyCode) {
  const now = Date.now().toString();
  const rand = crypto.randomBytes(8).toString("hex");
  const raw = `${lobbyCode || "anon"}:${now}:${rand}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

/**
 * Démarre la partie pour un lobby et notifie les clients via broadcastFunc.
 * broadcastFunc(type, payload) est une fonction fournie par le serveur pour émettre
 * vers les sockets du lobby (déjà liée à la room).
 *
 * Par défaut nous envoyons mapOptions.destructibleProb = 0.42 (plus rempli).
 */
export function startGameForLobby(
  broadcastFunc,
  lobbyRoomCode,
  players,
  lobbyCode,
  opts = {}
) {
  const mapSeed = opts.mapSeed || makeMapSeed(lobbyCode);

  const payload = {
    players,
    initialCountdown: opts.initialCountdown ?? 300,
    gameTimer: opts.gameTimer ?? opts.initialCountdown ?? 300,
    mapSeed,
    map: opts.mapGrid ?? null, // ✅ Full grid from server
    mapOptions: opts.mapOptions ?? { destructibleProb: 0.42 },
  };

  // Notify clients in the lobby: broadcastFunc is expected to attach the "type" wrapper
  // e.g. broadcastFunc('gameStart', payload)
  broadcastFunc("gameStart", payload);

  // Retour pour logs/debug si besoin
  return mapSeed;
}
