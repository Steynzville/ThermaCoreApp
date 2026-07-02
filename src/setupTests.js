import { vi, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";

/* =========================================================
   CORE GLOBAL SAFETY (must be first)
========================================================= */

globalThis.window = globalThis.window || {};
globalThis.document = globalThis.document || {};

/* =========================================================
   1. matchMedia (CRITICAL FIX — Dashboard/Radix)
========================================================= */

function matchMediaFactory(query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  };
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: vi.fn(matchMediaFactory),
});

/* =========================================================
   2. ResizeObserver (safe minimal mock)
========================================================= */

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;
global.ResizeObserver = ResizeObserverMock;

/* =========================================================
   3. IntersectionObserver (lazy UI safety)
========================================================= */

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserverMock;
global.IntersectionObserver = IntersectionObserverMock;

/* =========================================================
   4. Pointer Events (drag/drop, sliders, Radix)
========================================================= */

class PointerEventMock extends Event {
  constructor(type, props = {}) {
    super(type, props);
    this.pointerId = props.pointerId || 1;
    this.pointerType = props.pointerType || "mouse";
    this.clientX = props.clientX || 0;
    this.clientY = props.clientY || 0;
  }
}

window.PointerEvent = PointerEventMock;
global.PointerEvent = PointerEventMock;

/* =========================================================
   5. AudioContext (fix audioPlayer + dashboards)
========================================================= */

class AudioContextMock {
  resume = () => Promise.resolve();

  decodeAudioData = () =>
    Promise.resolve({
      sampleRate: 44100,
      length: 1024,
      duration: 0.1,
      numberOfChannels: 2,
      getChannelData: () => new Float32Array(1024),
    });

  createBufferSource = () => ({
    buffer: null,
    connect: () => {},
    start: () => {},
  });

  createGain = () => ({
    connect: () => {},
    gain: { value: 1 },
  });
}

global.AudioContext = AudioContextMock;
global.webkitAudioContext = AudioContextMock;

/* =========================================================
   6. Storage (local/session safe)
========================================================= */

class StorageMock {
  constructor() {
    this.store = {};
  }

  getItem = (key) => this.store[key] || null;
  setItem = (key, value) => (this.store[key] = String(value));
  removeItem = (key) => delete this.store[key];
  clear = () => (this.store = {});
}

global.localStorage = new StorageMock();
global.sessionStorage = new StorageMock();

/* =========================================================
   7. Animation Frame (charts + UI loops)
========================================================= */

global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

/* =========================================================
   8. Canvas (charts / graphs safe)
========================================================= */

HTMLCanvasElement.prototype.getContext = () => ({
  fillRect: () => {},
  clearRect: () => {},
  getImageData: () => ({ data: [] }),
  putImageData: () => {},
  createImageData: () => [],
  setTransform: () => {},
  drawImage: () => {},
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  stroke: () => {},
  translate: () => {},
  scale: () => {},
  rotate: () => {},
  arc: () => {},
  fill: () => {},
  measureText: () => ({ width: 0 }),
  transform: () => {},
  rect: () => {},
  clip: () => {},
});

/* =========================================================
   9. Navigator clipboard
========================================================= */

global.navigator = global.navigator || {};

global.navigator.clipboard = {
  writeText: vi.fn().mockResolvedValue(),
  readText: vi.fn().mockResolvedValue(""),
};

/* =========================================================
   10. Dialogs (silent UI safety)
========================================================= */

global.alert = vi.fn();
global.confirm = vi.fn(() => true);
global.prompt = vi.fn(() => "");

/* =========================================================
   11. getComputedStyle (safe fallback only)
========================================================= */

const originalGetComputedStyle = window.getComputedStyle;

window.getComputedStyle = (el) => {
  const style = originalGetComputedStyle?.(el);

  return (
    style || {
      getPropertyValue: () => "",
      transitionDuration: "0s",
      animationDuration: "0s",
      display: "block",
    }
  );
};

/* =========================================================
   CLEANUP (DO NOT DESTROY DOM — ONLY RESET STATE)
========================================================= */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});
