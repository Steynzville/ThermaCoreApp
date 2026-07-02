import { vi, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";

/* =========================================================
   LAYER 1: CORE DOM STABILITY
========================================================= */

// matchMedia (Radix, responsive UI, charts)
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

// ResizeObserver (charts, dashboards, sliders)
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;
global.ResizeObserver = ResizeObserverMock;

/* =========================================================
   LAYER 2: LAYOUT STABILITY (RADIX + FLOATING UI SAFE)
========================================================= */

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

// Critical for Popover / Tooltip / Slider / Dropdown
Element.prototype.getBoundingClientRect = () => stableRect;
Element.prototype.getClientRects = () => [stableRect];

// Prevent layout-dependent crashes
window.HTMLElement.prototype.scrollIntoView = () => {};

/* =========================================================
   LAYER 3: DASHBOARD / FRAMER MOTION FIX (IMPORTANT ADDITION)
========================================================= */

// Prevent animation props leaking into DOM (Dashboard crash source)
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");

  return {
    ...actual,
    motion: new Proxy(
      {},
      {
        get: () => (props = {}) => {
          const {
            whileHover,
            whileTap,
            animate,
            initial,
            exit,
            ...safeProps
          } = props;

          return {
            type: "div",
            props: safeProps,
          };
        },
      }
    ),
  };
});

/* =========================================================
   LAYER 4: AUDIO CONTEXT (MINIMAL STABLE MOCK)
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
   LAYER 5: STORAGE (SAFE PERSISTENCE MOCK)
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
   LAYER 6: TIMERS / RAF
========================================================= */

global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

/* =========================================================
   LAYER 7: INTERSECTION OBSERVER
========================================================= */

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserverMock;
global.IntersectionObserver = IntersectionObserverMock;

/* =========================================================
   LAYER 8: POINTER EVENTS
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
   LAYER 9: CANVAS (CHART / DASHBOARD GRAPHICS)
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
   LAYER 10: NAVIGATOR + CLIPBOARD
========================================================= */

global.navigator = {
  ...global.navigator,
  clipboard: {
    writeText: vi.fn().mockResolvedValue(),
    readText: vi.fn().mockResolvedValue(""),
  },
};

/* =========================================================
   LAYER 11: WINDOW DIALOGS
========================================================= */

global.alert = vi.fn();
global.confirm = vi.fn(() => true);
global.prompt = vi.fn(() => "");

/* =========================================================
   LAYER 12: COMPUTED STYLE SAFETY
========================================================= */

const originalGetComputedStyle = window.getComputedStyle;

window.getComputedStyle = (el) =>
  originalGetComputedStyle?.(el) || {
    getPropertyValue: () => "",
    transitionDuration: "0s",
    animationDuration: "0s",
    display: "block",
  };

/* =========================================================
   CLEANUP (SAFE — NO DOM DESTRUCTION)
========================================================= */

afterEach(() => {
  cleanup();

  vi.clearAllMocks();
  vi.clearAllTimers();
});
