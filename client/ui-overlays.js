// client/ui-overlays.js
// Lobby-level UI overlays: popup errors, countdown timer, WS indicator.
// Extracted from main.js to keep the entry point slim.

import { WSIndicator } from "../ui/components/WsIndicator.js";
import { PopupError } from "../ui/components/Popup.js";

// ── WS Indicator ──

let _wsConnected = false;
let _playerCount = 1;

export function setWsConnected(val) {
  _wsConnected = val;
}
export function setPlayerCount(val) {
  _playerCount = val;
}

export function showWSIndicator() {
  const app = document.getElementById("app");
  if (!app) return;
  const oldInd = document.getElementById("ws-indicator");
  if (oldInd) app.removeChild(oldInd);
  app.appendChild(
    window.createElement(
      WSIndicator({
        connected: _wsConnected,
        playerCount: _playerCount,
      }),
    ),
  );
}

// ── Popup Errors ──

let _lastErrorPopup = null;

export function showPopupError(message) {
  const app = document.getElementById("app");
  if (!app) return;

  if (_lastErrorPopup) {
    try {
      if (app.contains(_lastErrorPopup)) {
        app.removeChild(_lastErrorPopup);
      }
    } catch (e) {
      console.warn("showPopupError: failed to remove lastErrorPopup", e);
    }
    _lastErrorPopup = null;
  }

  const popupVNode = PopupError({ message });
  const popupElem = window.createElement(popupVNode);
  _lastErrorPopup = popupElem;
  try {
    app.appendChild(popupElem);
  } catch (e) {
    console.warn("showPopupError: failed to append popupElem", e);
    _lastErrorPopup = null;
    return;
  }

  setTimeout(() => {
    try {
      if (app.contains(popupElem)) {
        app.removeChild(popupElem);
      }
    } catch (e) {
      console.warn(
        "showPopupError: failed to remove popupElem after timeout",
        e,
      );
    }
    if (_lastErrorPopup === popupElem) _lastErrorPopup = null;
  }, 3000);
}

// ── Lobby Countdown ──

export function showLobbyCountdown(value, label = "Démarrage") {
  if (typeof value === "number" && value <= 0) {
    hideLobbyCountdown(true);
    return;
  }
  let el = document.getElementById("lobby-countdown");
  if (!el) {
    el = document.createElement("div");
    el.id = "lobby-countdown";
    el.style = `
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 10001;
      background: rgba(0,0,0,0.6);
      color: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      font-family: 'Press Start 2P', monospace;
      font-size: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(el);
  }
  el.textContent = `${label} : ${value}s`;
  el.style.display = "block";
}

export function hideLobbyCountdown(forceRemove = false) {
  const el = document.getElementById("lobby-countdown");
  if (!el) return;
  if (forceRemove) {
    if (el.parentNode) el.parentNode.removeChild(el);
    return;
  }
  el.style.display = "none";
}
