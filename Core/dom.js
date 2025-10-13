import { getEventsMap } from "./events.js";

export function createElement(vnode, eventsMap = {}) {
  if (typeof vnode === "string" || typeof vnode === "number") {
    return document.createTextNode(vnode);
  }
  const { tag, attrs = {}, children = [], events = {} } = vnode;
  const el = document.createElement(tag);
  for (let [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) {
      el.setAttribute(key, value);
    }
  }
  if (
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA") &&
    "value" in attrs
  ) {
    el.value = attrs.value;
  }
  for (let [event, handlerName] of Object.entries(events)) {
    if (typeof eventsMap[handlerName] === "function") {
      el.addEventListener(event, eventsMap[handlerName]);
    }
  }
  for (let child of children) {
    el.appendChild(createElement(child, eventsMap));
  }
  return el;
}

export function render(vnode, container, eventsMap = {}) {
  container.innerHTML = "";
  container.appendChild(createElement(vnode, eventsMap));
}
