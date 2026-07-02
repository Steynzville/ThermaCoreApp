import { vi, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";

/* =========================================================
   CORE TEST ENVIRONMENT STABILITY LAYER
========================================================= */

/**
 * CRITICAL FIX:
 * matchMedia MUST always return a valid object synchronously.
 * This prevents: "Cannot read properties of undefined (reading 'matches')"
 */
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: (query) => {
    return {
      matches: false,
      media: query || "",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  },
});

/* =========================================================
   RESIZE OBSERVER (Radix + charts + layout systems)
========================================================= */

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;
global.ResizeObserver = ResizeObserverMock;

/* =========================================================
   LAYOUT / DOM MEASUREMENT STABILITY
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

if (window.HTMLElement) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}

/* =========================================================
   INTERSECTION OBSERVER (lazy UI / charts / virtualization)
========================================================= */

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserverMock;
global.IntersectionObserver = IntersectionObserverMock;

/* =========================================================
   AUDIO CONTEXT (fixes audioPlayer + hooks)
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

  destination = {};
  state = "suspended";
}

global.AudioContext = AudioContextMock;
global.webkitAudioContext = AudioContextMock;

/* =========================================================
   STORAGE MOCKS
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
   POINTER EVENTS (drag, sliders, Radix interactions)
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
   CANVAS (charts / graphs / analytics UI)
========================================================= */

if (window.HTMLCanvasElement) {
  window.HTMLCanvasElement.prototype.getContext = () => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => [],
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  });
}

/* =========================================================
   NAVIGATOR / CLIPBOARD
========================================================= */

global.navigator = {
  ...global.navigator,
  clipboard: {
    writeText: vi.fn().mockResolvedValue(),
    readText: vi.fn().mockResolvedValue(""),
  },
};

/* =========================================================
   WINDOW DIALOGS
========================================================= */

global.alert = vi.fn();
global.confirm = vi.fn(() => true);
global.prompt = vi.fn(() => "");

/* =========================================================
   COMPUTED STYLE SAFETY (fix Radix + floating UI edge cases)
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
   CLEANUP (SAFE ONLY - NO DOM DESTRUCTION)
========================================================= */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});
