import { vi, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";

/* =========================================================
   LAYER 1: CORE DOM STABILITY (SAFE GLOBAL POLYFILLS)
========================================================= */

// matchMedia (Radix / Responsive UI critical)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// ResizeObserver (charts, sliders, Radix layout)
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock;
global.ResizeObserver = ResizeObserverMock;

/* =========================================================
   LAYER 2: LAYOUT STABILITY (FIX RADIX + FLOATING UI)
========================================================= */

// Critical for Popover / Tooltip / Slider / Floating UI
const stableRect = {
  width: 100,
  height: 100,
  top: 0,
  left: 0,
  right: 100,
  bottom: 100,
  x: 0,
  y: 0,
  toJSON: () => stableRect,
};

Element.prototype.getBoundingClientRect = () => stableRect;
Element.prototype.getClientRects = () => [stableRect];

// Prevent layout-dependent crashes in Radix
window.HTMLElement.prototype.scrollIntoView = () => {};

/* =========================================================
   LAYER 3: AUDIO + MEDIA APIs (FIX YOUR MAIN FAILURES)
========================================================= */

class AudioContextMock {
  constructor() {}

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
   LAYER 4: STORAGE (SAFE STATE PERSISTENCE MOCK)
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
   LAYER 5: TIMING + ANIMATION SAFETY
========================================================= */

global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

/* =========================================================
   LAYER 6: INTERSECTION OBSERVER (LAZY LOAD COMPONENTS)
========================================================= */

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserverMock;
global.IntersectionObserver = IntersectionObserverMock;

/* =========================================================
   LAYER 7: POINTER EVENTS (DRAGGABLE UI)
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
   LAYER 8: CANVAS (CHARTS, GRAPHICS)
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
   LAYER 9: NAVIGATOR + CLIPBOARD
========================================================= */

global.navigator = {
  ...global.navigator,
  clipboard: {
    writeText: vi.fn().mockResolvedValue(),
    readText: vi.fn().mockResolvedValue(""),
  },
};

/* =========================================================
   LAYER 10: WINDOW DIALOGS (NO SIDE EFFECTS)
========================================================= */

global.alert = vi.fn();
global.confirm = vi.fn(() => true);
global.prompt = vi.fn(() => "");

/* =========================================================
   LAYER 11: SAFE COMPUTED STYLE (FIX FLOATING UI EDGE CASES)
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
   CLEANUP (SAFE ONLY — NO DOM DESTRUCTION)
========================================================= */

afterEach(() => {
  cleanup();

  // Only clear mocks, NOT DOM nodes
  vi.clearAllMocks();
  vi.clearAllTimers();
});
