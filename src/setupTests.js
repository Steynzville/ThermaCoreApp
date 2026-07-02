import { vi, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";

/* =========================================================
   CRITICAL FIX: MUST EXIST BEFORE ANY UI CODE RUNS
   matchMedia (Radix / Theme / Responsive Fix)
========================================================= */

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: (query) => {
    return {
      media: query,
      matches: false,

      onchange: null,

      // legacy (Radix + older libs still call these)
      addListener: vi.fn(),
      removeListener: vi.fn(),

      // modern API
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    };
  },
});

/* =========================================================
   ResizeObserver (layout / charts / Radix Popovers)
========================================================= */

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;
global.ResizeObserver = ResizeObserverMock;

/* =========================================================
   IntersectionObserver (lazy loading / charts / dashboards)
========================================================= */

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserverMock;
global.IntersectionObserver = IntersectionObserverMock;

/* =========================================================
   Layout Stability (Radix / Floating UI / Tooltips)
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

Element.prototype.getBoundingClientRect = () => stableRect;
Element.prototype.getClientRects = () => [stableRect];

window.HTMLElement.prototype.scrollIntoView = () => {};

/* =========================================================
   Pointer Events (drag / sliders / dashboards)
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
   AudioContext (charts / dashboards / visualization)
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
   Storage (auth / dashboard state)
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
   Animation Timing
========================================================= */

global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

/* =========================================================
   Canvas (charts / graph rendering)
========================================================= */

if (window.HTMLCanvasElement) {
  window.HTMLCanvasElement.prototype.getContext = () => ({
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
}

/* =========================================================
   Navigator clipboard (dashboard copy actions)
========================================================= */

global.navigator = {
  ...global.navigator,
  clipboard: {
    writeText: vi.fn().mockResolvedValue(),
    readText: vi.fn().mockResolvedValue(""),
  },
};

/* =========================================================
   Window dialogs
========================================================= */

global.alert = vi.fn();
global.confirm = vi.fn(() => true);
global.prompt = vi.fn(() => "");

/* =========================================================
   getComputedStyle (dark mode + responsive safety)
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
   GLOBAL CLEANUP (SAFE ONLY)
========================================================= */

afterEach(() => {
  cleanup();

  vi.clearAllMocks();
  vi.clearAllTimers();
});
