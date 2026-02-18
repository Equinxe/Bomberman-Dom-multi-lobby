import { getEventsMap } from "./events.js";

export function createElement(vnode, eventsMap = {}) {
  if (typeof vnode === "string" || typeof vnode === "number") {
    return document.createTextNode(String(vnode));
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
      // ✅ Track handler references for patchElement to remove later
      if (!el._eventHandlers) el._eventHandlers = {};
      el._eventHandlers[event] = eventsMap[handlerName];
    }
  }
  for (let child of children) {
    el.appendChild(createElement(child, eventsMap));
  }
  // Store vnode reference for diffing
  el._vnode = vnode;
  return el;
}

/**
 * Patch an existing DOM element to match the new vnode.
 * Returns true if it was patched in-place, false if it needs full replacement.
 */
function patchElement(el, oldVNode, newVNode, eventsMap) {
  // Both text nodes
  if (
    (typeof oldVNode === "string" || typeof oldVNode === "number") &&
    (typeof newVNode === "string" || typeof newVNode === "number")
  ) {
    if (String(oldVNode) !== String(newVNode)) {
      el.textContent = String(newVNode);
    }
    el._vnode = newVNode;
    return true;
  }

  // One is text and other is element — must replace
  if (
    typeof oldVNode === "string" ||
    typeof oldVNode === "number" ||
    typeof newVNode === "string" ||
    typeof newVNode === "number"
  ) {
    return false;
  }

  // Different tags — must replace
  if (oldVNode.tag !== newVNode.tag) {
    return false;
  }

  // Same tag — update attributes
  const oldAttrs = oldVNode.attrs || {};
  const newAttrs = newVNode.attrs || {};

  // Remove old attrs not in new
  for (const key of Object.keys(oldAttrs)) {
    if (!(key in newAttrs)) {
      el.removeAttribute(key);
    }
  }
  // Set new/changed attrs
  for (const [key, value] of Object.entries(newAttrs)) {
    if (value !== undefined && value !== null) {
      if (oldAttrs[key] !== value) {
        el.setAttribute(key, value);
      }
    } else {
      el.removeAttribute(key);
    }
  }

  // Special: input/textarea value
  if (
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA") &&
    "value" in newAttrs
  ) {
    if (el.value !== newAttrs.value) {
      el.value = newAttrs.value;
    }
  }

  // ✅ Update event listeners: remove old ones, attach new ones
  const oldEvents = oldVNode.events || {};
  const newEvents = newVNode.events || {};
  for (const [event, handlerName] of Object.entries(oldEvents)) {
    if (!(event in newEvents) || newEvents[event] !== handlerName) {
      // Handler changed or removed — remove old listener
      if (el._eventHandlers && el._eventHandlers[event]) {
        el.removeEventListener(event, el._eventHandlers[event]);
        delete el._eventHandlers[event];
      }
    }
  }
  for (const [event, handlerName] of Object.entries(newEvents)) {
    const handler = eventsMap[handlerName];
    if (typeof handler === "function") {
      // Only re-attach if handler name changed or wasn't set before
      if (
        !oldEvents[event] ||
        oldEvents[event] !== handlerName ||
        !el._eventHandlers ||
        !el._eventHandlers[event]
      ) {
        if (el._eventHandlers && el._eventHandlers[event]) {
          el.removeEventListener(event, el._eventHandlers[event]);
        }
        if (!el._eventHandlers) el._eventHandlers = {};
        el._eventHandlers[event] = handler;
        el.addEventListener(event, handler);
      }
    }
  }

  // Patch children
  const oldChildren = oldVNode.children || [];
  const newChildren = newVNode.children || [];
  const maxLen = Math.max(oldChildren.length, newChildren.length);
  const domChildren = el.childNodes;

  for (let i = 0; i < maxLen; i++) {
    if (i >= newChildren.length) {
      // Remove extra children from the end
      while (el.childNodes.length > newChildren.length) {
        el.removeChild(el.lastChild);
      }
      break;
    }
    if (i >= oldChildren.length || i >= domChildren.length) {
      // Append new children
      el.appendChild(createElement(newChildren[i], eventsMap));
    } else {
      // Try to patch in-place
      const patched = patchElement(
        domChildren[i],
        oldChildren[i],
        newChildren[i],
        eventsMap,
      );
      if (!patched) {
        // Replace the node
        const newEl = createElement(newChildren[i], eventsMap);
        el.replaceChild(newEl, domChildren[i]);
      }
    }
  }

  el._vnode = newVNode;
  return true;
}

export function render(vnode, container, eventsMap = {}) {
  // If we have an existing rendered tree, try to patch in-place
  if (container.childNodes.length === 1 && container.firstChild._vnode) {
    const patched = patchElement(
      container.firstChild,
      container.firstChild._vnode,
      vnode,
      eventsMap,
    );
    if (patched) return;
  }

  // Fallback: full replace
  container.innerHTML = "";
  container.appendChild(createElement(vnode, eventsMap));
}
