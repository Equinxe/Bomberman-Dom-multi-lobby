// client/overlays.js
// Persistent DOM overlays for win screen and spectator mode.

import { render } from "../Core/dom.js";
import { SpectatorOverlay } from "../ui/components/SpectatorOverlay.js";

let _winOverlayEl = null;
let _spectatorOverlayEl = null;

// Spectator overlay

export function showSpectatorOverlay(localPseudo) {
  removeSpectatorOverlay();
  const vnode = SpectatorOverlay({ pseudo: localPseudo || "" });
  const el = document.createElement("div");
  el.id = "spectator-overlay-wrapper";
  el.innerHTML = "";
  document.body.appendChild(el);
  _spectatorOverlayEl = el;

  try {
    render(vnode, el, {});
  } catch (e) {
    // Fallback: simple HTML
    el.innerHTML = `
      <div style="position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:10040;
        font-family:'Press Start 2P',monospace;text-align:center;pointer-events:none;">
        <div style="background:rgba(80,20,20,0.92);border:2px solid rgba(255,80,80,0.6);
          border-radius:12px;padding:10px 24px;box-shadow:0 4px 24px rgba(255,60,60,0.3);">
          <div style="font-size:14px;color:#ff6b6b;margin-bottom:4px;">☠ ÉLIMINÉ</div>
          <div style="font-size:8px;color:#ffaa88;">Mode spectateur — Entrée pour discuter</div>
        </div>
        <div style="margin-top:6px;font-size:8px;color:#ff9944;background:rgba(255,153,68,0.15);
          border:1px solid rgba(255,153,68,0.5);border-radius:8px;padding:4px 14px;display:inline-flex;
          align-items:center;gap:6px;">👻 MODE SPECTATEUR</div>
      </div>`;
  }

  // Fade in
  el.style.opacity = "0";
  el.style.transition = "opacity 0.5s ease";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (el) el.style.opacity = "1";
    });
  });
}

export function removeSpectatorOverlay() {
  if (_spectatorOverlayEl) {
    _spectatorOverlayEl.remove();
    _spectatorOverlayEl = null;
  }
  const old = document.getElementById("spectator-overlay-wrapper");
  if (old) old.remove();
}

// Win overlay

/**
 * Show the game-win overlay.
 */
export function showWinOverlay(winner, localPlayerId, players) {
  removeWinOverlay();
  const isDraw = !winner.id && !winner.pseudo && !winner.winningTeam;
  const isTeamWin = !!winner.winningTeam;
  const isLocalWinner = !isDraw && !isTeamWin && winner.id === localPlayerId;
  const localPlayer = players.find((p) => p.id === localPlayerId);
  const isLocalTeamWin =
    isTeamWin && localPlayer && (localPlayer.team || 0) === winner.winningTeam;

  const borderColor = isDraw
    ? "#ffaa33"
    : isLocalWinner || isLocalTeamWin
      ? "#3be6aa"
      : "#ff5555";
  const glowColor = isDraw
    ? "rgba(255,170,50,0.4)"
    : isLocalWinner || isLocalTeamWin
      ? "rgba(59,230,170,0.5)"
      : "rgba(255,85,85,0.4)";
  const textColor = isDraw
    ? "#ffaa33"
    : isLocalWinner || isLocalTeamWin
      ? "#3be6aa"
      : "#ff5555";

  let titleText, subText;
  if (isDraw) {
    titleText = "⏰ DRAW!";
    subText = "Time's up \u2014 nobody wins!";
  } else if (isTeamWin) {
    const teamNames = { 1: "Alpha", 2: "Beta" };
    const teamLabels = { 1: "α", 2: "β" };
    const teamName =
      teamNames[winner.winningTeam] || `Team ${winner.winningTeam}`;
    titleText = isLocalTeamWin
      ? "\uD83C\uDFC6 TEAM VICTORY! \uD83C\uDFC6"
      : "GAME OVER";
    subText = `Team ${teamName} (${teamLabels[winner.winningTeam] || "?"}) wins!`;
  } else if (isLocalWinner) {
    titleText = "\uD83C\uDFC6 VICTORY! \uD83C\uDFC6";
    subText = winner.pseudo ? `${winner.pseudo} wins!` : "You win!";
  } else {
    titleText = "GAME OVER";
    subText = winner.pseudo
      ? `${winner.pseudo} wins!`
      : "Draw \u2014 no winner!";
  }

  const overlay = document.createElement("div");
  overlay.id = "game-win-overlay";
  overlay.style.cssText = `
    position:fixed; top:0; left:0; right:0; bottom:0;
    z-index:11000; display:flex; align-items:center; justify-content:center;
    background:rgba(0,0,0,0); pointer-events:none;
    font-family:'Press Start 2P',monospace;
    transition: background 0.5s ease;
  `;
  overlay.innerHTML = `
    <div style="
      text-align:center; padding:32px 48px; border-radius:16px;
      background:linear-gradient(135deg,rgba(16,32,24,0.95) 0%,rgba(32,48,36,0.95) 100%);
      border:3px solid ${borderColor};
      box-shadow:0 0 40px ${glowColor};
      transform:scale(0.8); opacity:0;
      transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease;
    ">
      <div style="font-size:24px; color:${textColor}; margin-bottom:12px; text-shadow:0 0 20px ${textColor}88;">
        ${titleText}
      </div>
      <div style="font-size:14px; color:#cfeedd;">
        ${subText}
      </div>
      <div style="font-size:8px; color:#8fc; margin-top:12px; opacity:0.7;">
        Returning to lobby...
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  _winOverlayEl = overlay;

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!_winOverlayEl || _winOverlayEl !== overlay) return;
      overlay.style.background = "rgba(0,0,0,0.65)";
      overlay.style.pointerEvents = "auto";
      const box = overlay.querySelector("div");
      if (box) {
        box.style.transform = "scale(1)";
        box.style.opacity = "1";
      }
    });
  });
}

export function removeWinOverlay() {
  if (_winOverlayEl) {
    _winOverlayEl.remove();
    _winOverlayEl = null;
  }
  const old = document.getElementById("game-win-overlay");
  if (old) old.remove();
}
