import "@testing-library/jest-dom";
import { vi, beforeAll, beforeEach, afterEach } from "vitest";
import React from "react";
import { cleanup } from "@testing-library/react";

/**
 * -----------------------------
 * GLOBAL CLEANUP
 * -----------------------------
 */
// Clean up DOM after each test to prevent memory leaks and test pollution
afterEach(() => {
  cleanup();
  
  // Clear any leftover DOM nodes
  document.body.innerHTML = '';
  
  // Reset any global state
  vi.clearAllMocks();
  vi.resetAllMocks();
});

/**
 * -----------------------------
 * GLOBAL MATCHMEDIA FIX
 * -----------------------------
 */
const createMatchMedia = (matches = false) => (query) => ({
  matches,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: createMatchMedia(false),
});

Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  configurable: true,
  value: createMatchMedia(false),
});

// Reset matchMedia before each test
beforeEach(() => {
  window.matchMedia = createMatchMedia(false);
});

/**
 * -----------------------------
 * JSDOM POLYFILLS
 * -----------------------------
 */

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

Object.defineProperty(window, "scrollTo", {
  value: vi.fn(),
  writable: true,
});

// Fix: Only define getComputedStyle if it doesn't already exist
// or if it's not properly implemented
if (!window.getComputedStyle || typeof window.getComputedStyle !== 'function') {
  Object.defineProperty(window, "getComputedStyle", {
    value: () => ({
      getPropertyValue: () => "",
    }),
    writable: true,
    configurable: true,
  });
}

/**
 * -----------------------------
 * WINDOW METHOD MOCKS (ADDED)
 * -----------------------------
 */

// Add missing window methods for Radix UI and other libraries
if (!window.requestAnimationFrame) {
  Object.defineProperty(window, "requestAnimationFrame", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((cb) => {
      cb();
      return 123;
    }),
  });
}

if (!window.cancelAnimationFrame) {
  Object.defineProperty(window, "cancelAnimationFrame", {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });
}

if (!window.setTimeout) {
  Object.defineProperty(window, "setTimeout", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((cb) => {
      cb();
      return 123;
    }),
  });
}

if (!window.clearTimeout) {
  Object.defineProperty(window, "clearTimeout", {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });
}

if (!window.setInterval) {
  Object.defineProperty(window, "setInterval", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => 456),
  });
}

if (!window.clearInterval) {
  Object.defineProperty(window, "clearInterval", {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });
}

// Mock window.Image for Avatar component
if (!window.Image) {
  Object.defineProperty(window, "Image", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      src: '',
      onload: null,
      onerror: null,
      complete: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getAttribute: vi.fn(),
      setAttribute: vi.fn(),
    })),
  });
}

// Mock window.addEventListener/removeEventListener if needed
if (!window.addEventListener) {
  Object.defineProperty(window, "addEventListener", {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });
}

if (!window.removeEventListener) {
  Object.defineProperty(window, "removeEventListener", {
    writable: true,
    configurable: true,
    value: vi.fn(),
  });
}

// Mock PointerEvent for Slider component
if (!window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends Event {
    constructor(type, params = {}) {
      super(type, params);
      this.pointerId = params.pointerId || 1;
      this.clientX = params.clientX || 0;
      this.clientY = params.clientY || 0;
    }
  };
}

// Mock Element.prototype methods for Radix UI components
if (!Element.prototype.hasOwnProperty('scrollIntoView')) {
  Element.prototype.scrollIntoView = vi.fn();
}

// Mock getBoundingClientRect for various components
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
  width: 100,
  height: 100,
  top: 0,
  left: 0,
  bottom: 100,
  right: 100,
  x: 0,
  y: 0,
  toJSON: vi.fn(),
});

/**
 * -----------------------------
 * AUDIO CONTEXT MOCK (ADDED)
 * -----------------------------
 */

class MockAudioContext {
  constructor() {
    this.state = "suspended";
    this.currentTime = 0;
    this.destination = {};
  }
  resume() {
    return Promise.resolve();
  }
  suspend() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
  decodeAudioData() {
    return Promise.resolve({
      duration: 1,
      numberOfChannels: 2,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(44100),
    });
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
  }
  createGain() {
    return {
      gain: { value: 0.5, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }
}

if (!window.AudioContext) {
  Object.defineProperty(window, "AudioContext", {
    writable: true,
    configurable: true,
    value: MockAudioContext,
  });
}

if (!window.webkitAudioContext) {
  Object.defineProperty(window, "webkitAudioContext", {
    writable: true,
    configurable: true,
    value: MockAudioContext,
  });
}

/**
 * -----------------------------
 * FILE DOWNLOAD / BLOB POLYFILLS
 * -----------------------------
 */

// Blob URL APIs used by CSV/PDF export functionality
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = vi.fn(() => "blob:test");
}

if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = vi.fn();
}

// Spy on the native anchor click implementation so tests can verify downloads
let anchorClickSpy = null;

// Create the spy before each test
beforeEach(() => {
  if (anchorClickSpy) {
    anchorClickSpy.mockRestore();
  }
  anchorClickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
});

// Optional browser APIs that some components may use
// Create a mock for window.open if it doesn't exist
if (!window.open) {
  window.open = vi.fn();
}

// Ensure window.open is always a mock function with mockClear
if (!window.open.mockClear) {
  window.open = vi.fn();
}

// Create navigator.msSaveBlob if it doesn't exist
if (!navigator.msSaveBlob) {
  navigator.msSaveBlob = vi.fn();
}

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();

  if (global.URL.createObjectURL?.mockClear) {
    global.URL.createObjectURL.mockClear();
  }

  if (global.URL.revokeObjectURL?.mockClear) {
    global.URL.revokeObjectURL.mockClear();
  }

  if (anchorClickSpy?.mockClear) {
    anchorClickSpy.mockClear();
  }

  // Safe check for window.open mock
  if (window.open && typeof window.open === 'function' && window.open.mockClear) {
    window.open.mockClear();
  }

  // Safe check for navigator.msSaveBlob mock
  if (navigator.msSaveBlob && typeof navigator.msSaveBlob === 'function' && navigator.msSaveBlob.mockClear) {
    navigator.msSaveBlob.mockClear();
  }

  // Clear any leftover DOM from previous tests
  document.body.innerHTML = '';
});

/**
 * -----------------------------
 * FRAMER MOTION MOCK (NO JSX SAFE)
 * -----------------------------
 */
vi.mock("framer-motion", () => ({
  motion: {
    div: (props) =>
      React.createElement("div", props, props.children),
  },
}));

/**
 * -----------------------------
 * GLOBAL STABILITY
 * -----------------------------
 */
beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

// Restore console mocks after all tests
afterEach(() => {
  console.error?.mockRestore?.();
  console.warn?.mockRestore?.();
});
