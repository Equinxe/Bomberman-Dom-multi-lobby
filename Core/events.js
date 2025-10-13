let eventRegistry = {};

export function registerEvent(name, handler) {
  eventRegistry[name] = handler;
}

export function getEventsMap() {
  return { ...eventRegistry };
}
