let globalState = {
  me: { pseudo: "", color: 0, ready: false },
  players: [],
  chatMessages: [],
  waiting: false,
};
let listeners = [];

export function createState(initialState = {}) {
  globalState = { ...initialState };
  listeners = [];
  return {
    getState,
    setState,
    subscribe,
  };
}

export function getState() {
  return { ...globalState };
}

export function setState(newState) {
  globalState = { ...globalState, ...newState };
  listeners.forEach((fn) => fn(getState()));
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((listener) => listener !== fn);
  };
}
