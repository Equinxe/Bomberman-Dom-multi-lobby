// server/lobby-timer.js
// LobbyTimer: manages waiting/countdown phases before game start.
// Calls onStartGame callback when countdown completes.
export class LobbyTimer {
  constructor(broadcastFn, getPlayersFn = () => [], onStartGameFn = null) {
    this.broadcast = broadcastFn;
    this.getPlayersFn = getPlayersFn;
    this.onStartGame =
      typeof onStartGameFn === "function" ? onStartGameFn : null;
    this.timer = null;
  }

  clearTimer() {
    if (!this.timer) return;
    if (this.timer.intervalId) clearInterval(this.timer.intervalId);
    if (this.timer.timeoutId) clearTimeout(this.timer.timeoutId);
    this.timer = null;
  }

  _counts() {
    const players = this.getPlayersFn() || [];
    const N = players.length;
    const R = players.filter((p) => !!p.ready).length;
    return { N, R, players };
  }

  startWaiting(seconds = 20) {
    if (this.timer && this.timer.type === "waiting") {
      this.clearTimer();
    } else {
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
      const { N, R, players } = this._counts();
      this.clearTimer();
      // After waiting period, transition to 10s countdown
      if (N >= 2) {
        this.startCountdown(10, true);
      } else {
        this.broadcast("waitingCancelled", {});
      }
    }, seconds * 1000);
  }

  startCountdown(seconds = 10, force = false) {
    const { N, R } = this._counts();

    // Allow countdown if 4+ players, all ready with N>=2, or forced
    const canStart = force || N >= 4 || (R === N && N >= 2);
    if (!canStart) {
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

    if (this.timer && this.timer.type === "waiting") {
      this.broadcast("waitingCancelled", {});
      this.clearTimer();
    } else if (this.timer && this.timer.type === "countdown") {
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
      const { N: N2, R: R2, players } = this._counts();
      this.clearTimer();
      const canStartNow = force || N2 >= 4 || (R2 === N2 && N2 >= 2);
      if (canStartNow && N2 >= 2) {
        if (this.onStartGame) {
          this.onStartGame({ reason: "countdown_done", N: N2, R: R2, players });
        } else {
          this.broadcast("gameStart", {
            reason: "countdown_done",
            N: N2,
            R: R2,
          });
        }
      } else if (R2 >= 1 && R2 < N2) {
        this.startWaiting(20);
      } else {
        this.broadcast("countdownCancelled", {});
      }
    }, seconds * 1000);
  }

  evaluate() {
    const { N, R } = this._counts();

    // All ready with 2+ players → immediate 10s countdown
    if (R === N && N >= 2) {
      this.startCountdown(10);
      return;
    }

    // 4 players joined → 20s waiting period (time to pick colors/teams)
    // then auto-transitions to 10s countdown via startWaiting timeout
    if (N >= 4) {
      if (!this.timer || this.timer.type !== "waiting") {
        this.startWaiting(20);
      }
      return;
    }

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

    if (R >= 1 && R < N) {
      this.startWaiting(20);
      return;
    }
  }
}
