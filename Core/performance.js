// Core/performance.js
// Performance optimization utilities for 60 FPS gameplay

/**
 * Performance monitor with FPS tracking
 */
export class PerformanceMonitor {
  constructor() {
    this.frames = [];
    this.lastTime = performance.now();
    this.fps = 60;
  }

  update() {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    this.frames.push(delta);
    if (this.frames.length > 60) {
      this.frames.shift();
    }

    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    this.fps = Math.round(1000 / avg);

    return this.fps;
  }

  getFPS() {
    return this.fps;
  }
}

/**
 * DOM element pool for reuse (reduces GC pressure)
 */
export class DOMPool {
  constructor(tagName, initialSize = 50) {
    this.tagName = tagName;
    this.available = [];
    this.inUse = new Set();

    for (let i = 0; i < initialSize; i++) {
      this.available.push(document.createElement(tagName));
    }
  }

  acquire() {
    let element;
    if (this.available.length > 0) {
      element = this.available.pop();
    } else {
      element = document.createElement(this.tagName);
    }
    this.inUse.add(element);
    return element;
  }

  release(element) {
    if (this.inUse.has(element)) {
      this.inUse.delete(element);
      element.removeAttribute("style");
      element.removeAttribute("class");
      element.textContent = "";
      this.available.push(element);
    }
  }

  releaseAll() {
    this.inUse.forEach((el) => {
      el.removeAttribute("style");
      el.removeAttribute("class");
      el.textContent = "";
      this.available.push(el);
    });
    this.inUse.clear();
  }
}

/**
 * Batch DOM updates to minimize reflows
 */
export function batchDOMUpdates(fn) {
  requestAnimationFrame(() => {
    fn();
  });
}

/**
 * Optimize element for CSS animations
 */
export function optimizeForAnimation(element) {
  element.style.willChange = "transform";
  element.style.transform = "translate3d(0, 0, 0)";
  element.style.backfaceVisibility = "hidden";
}
