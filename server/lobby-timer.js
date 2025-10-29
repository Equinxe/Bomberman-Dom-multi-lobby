// server/lobby-timer.js
// ESM version du timer de lobby. Compte N et R depuis getPlayersFn()
// et vérifie l'état juste avant de lancer un countdown/gameStart.

// Usage :
// import { LobbyTimer } from '../server/lobby-timer.js';
// const lobbyTimer = new LobbyTimer((type,payload)=> broadcast(code,{ type, ...payload }), () => lobby.players);
// lobbyTimer.evaluate(); // appeler après chaque join/leave/ready toggle

import WebSocket from "ws";

export class LobbyTimer {
  // broadcastFn(type, payload) -> envoie aux clients de la lobby
  // getPlayersFn() -> retourne l'array current des players pour la lobby (players[])
  constructor(broadcastFn, getPlayersFn = () => []) {
    this.broadcast = broadcastFn;
    this.getPlayersFn = getPlayersFn;
    this.timer = null; // { type: 'waiting'|'countdown', remaining, intervalId, timeoutId }
  }

  clearTimer() {
    if (!this.timer) return;
    if (this.timer.intervalId) clearInterval(this.timer.intervalId);
    if (this.timer.timeoutId) clearTimeout(this.timer.timeoutId);
    this.timer = null;
  }

  _counts() {
    // On considère "present" = players array (ne pas confondre avec queue)
    const players = this.getPlayersFn() || [];
    const N = players.length;
    const R = players.filter((p) => !!p.ready).length;
    return { N, R, players };
  }

  startWaiting(seconds = 20) {
    // si déjà waiting, reset
    if (this.timer && this.timer.type === "waiting") {
      this.clearTimer();
    } else {
      // si précédemment countdown, on annule
      if (this.timer && this.timer.type === "countdown") {
        this.broadcast("countdownCancelled", {});
        this.clearTimer();
      }
    }

    this.timer = {
      type: "waiting",
      remaining: seconds,
      intervalId: null,
      timeoutId: null,
    };
    this.broadcast("waitingStarted", { duration: seconds, value: seconds });

    this.timer.intervalId = setInterval(() => {
      if (!this.timer) return;
      this.timer.remaining -= 1;
      if (this.timer.remaining >= 0) {
        this.broadcast("waitingTick", { value: this.timer.remaining });
      }
    }, 1000);

    this.timer.timeoutId = setTimeout(() => {
      // Avant gameStart, re-vérifier l'état actuel
      const { N, R } = this._counts();
      this.clearTimer();
      // Ici, la politique originale démarre la partie à la fin du waiting.
      // On transmet aussi N/R pour diagnostic.
      this.broadcast("gameStart", { reason: "waiting_timeout", N, R });
    }, seconds * 1000);
  }

  startCountdown(seconds = 10) {
    // Vérifier la condition actuelle : tous les joueurs présents doivent être prêts
    const { N, R } = this._counts();
    if (!(R === N && N >= 2)) {
      // condition non satisfaite : fallback
      if (R >= 1) {
        this.startWaiting(20);
      } else {
        if (this.timer) {
          if (this.timer.type === "waiting")
            this.broadcast("waitingCancelled", {});
          if (this.timer.type === "countdown")
            this.broadcast("countdownCancelled", {});
        }
        this.clearTimer();
      }
      return;
    }

    // annule waiting si besoin
    if (this.timer && this.timer.type === "waiting") {
      this.broadcast("waitingCancelled", {});
      this.clearTimer();
    } else if (this.timer && this.timer.type === "countdown") {
      // déjà en countdown => on ne relance pas
      return;
    }

    this.timer = {
      type: "countdown",
      remaining: seconds,
      intervalId: null,
      timeoutId: null,
    };
    this.broadcast("countdownStart", { value: seconds });

    this.timer.intervalId = setInterval(() => {
      if (!this.timer) return;
      this.timer.remaining -= 1;
      if (this.timer.remaining >= 0) {
        this.broadcast("countdownTick", { value: this.timer.remaining });
      }
    }, 1000);

    this.timer.timeoutId = setTimeout(() => {
      // Avant d'émettre gameStart, re-vérifier N/R pour empêcher condition de course
      const { N: N2, R: R2 } = this._counts();
      this.clearTimer();
      if (R2 === N2 && N2 >= 2) {
        this.broadcast("gameStart", { reason: "countdown_done", N: N2, R: R2 });
      } else if (R2 >= 1 && R2 < N2) {
        this.startWaiting(20);
      } else {
        // R2 === 0 => annulation finale
        this.broadcast("countdownCancelled", {});
      }
    }, seconds * 1000);
  }

  // Appeler après chaque mutation du players[] du lobby
  evaluate() {
    const { N, R } = this._counts();

    if (R === 0) {
      if (this.timer) {
        if (this.timer.type === "waiting")
          this.broadcast("waitingCancelled", {});
        if (this.timer.type === "countdown")
          this.broadcast("countdownCancelled", {});
      }
      this.clearTimer();
      return;
    }

    if (R === N && N >= 2) {
      this.startCountdown(10);
      return;
    }

    if (R >= 1 && R < N) {
      this.startWaiting(20);
      return;
    }
  }
}
