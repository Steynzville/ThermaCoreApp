import "@testing-library/jest-dom";
import { vi, beforeAll, beforeEach, afterEach } from "vitest";
import React from "react";
import { cleanup } from "@testing-library/react";

// ============================================================
// DEBUG MODE: Set to true to see ALL warnings
// Usage: VITEST_DEBUG=true pnpm vitest run
// ============================================================
const SHOW_ALL_WARNINGS = process.env.VITEST_DEBUG === 'true';

// ✅ FIX: Tell React it's running in a test environment
// This suppresses "not configured to support act(...)" warnings
global.IS_REACT_ACT_ENVIRONMENT = true;

// ============================================================
// SAFE CONSOLE FILTERING - Only suppresses warnings, NOT errors
// ============================================================
//
// NOTE: This is the ONLY console-filtering mechanism in this file.
// A previous version also installed a vi.spyOn(console, ...) blanket
// silence in beforeAll/afterAll, but that conflicted with the vitest
// config's `restoreMocks: true` (which auto-restores vi.spyOn mocks
// before every test). The spy was only actually active for the first
// test in the run and silently got undone after that, making console
// output inconsistent across the suite and bypassing the allowlist
// below for test #1. Plain reassignment (not vi.spyOn) isn't touched
// by restoreMocks, so this approach applies consistently to every
// test in the file.
// ============================================================

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Known React warnings that are safe to suppress
const warningPatterns = [
  // Act warnings
  'An update to %s inside a test was not wrapped in act',
  'not wrapped in act',
  'was not wrapped in act',
  'When testing, code that causes React state updates should be wrapped into act',
  'The current testing environment is not configured to support act',
  'Warning: An update to',
  'Warning: Cannot update a component',

  // React DOM warnings
  'React does not recognize the',
  'In HTML, <',
  'You provided a `value` prop',
  'The tag <text> is unrecognized',
  'Panel defaultSize prop recommended',
  '`value` prop on `input` should not be null',

  // DOM nesting warnings
  'cannot be a child of',
  'cannot be a descendant of',
  'select cannot contain',
  'option cannot contain',

  // Auth service warnings (expected with test tokens)
  'isTokenValid: could not decode token',
  'isTokenValid: could not decode token or no exp claim',

  // Audio/Media warnings
  'The AudioContext is not allowed to start',
  'The AudioContext was not allowed to start',

  // Radix UI warnings
  'A props object containing a "key" prop is being spread into JSX',
];

// Check if a message is a known warning that should be suppressed
const isKnownWarning = (message) => {
  return warningPatterns.some(pattern => 
    typeof message === 'string' && message.includes(pattern)
  );
};

// Override console.error
console.error = (...args) => {
  const message = args[0]?.toString?.() || '';
  
  // ✅ In DEBUG mode, show EVERYTHING (including warnings)
  if (SHOW_ALL_WARNINGS) {
    originalConsoleError(...args);
    return;
  }

  // ✅ Only suppress known warnings
  if (isKnownWarning(message)) {
    return;
  }

  // ✅ Pass through everything else (errors, exceptions, etc.)
  originalConsoleError(...args);
};

// Override console.warn
console.warn = (...args) => {
  const message = args[0]?.toString?.() || '';

  // ✅ In DEBUG mode, show EVERYTHING
  if (SHOW_ALL_WARNINGS) {
    originalConsoleWarn(...args);
    return;
  }

  // ✅ Only suppress known warnings
  if (isKnownWarning(message)) {
    return;
  }

  // ✅ Pass through everything else
  originalConsoleWarn(...args);
};

// Override console.log (some warnings come through log)
console.log = (...args) => {
  const message = args[0]?.toString?.() || '';

  // ✅ In DEBUG mode, show EVERYTHING
  if (SHOW_ALL_WARNINGS) {
    originalConsoleLog(...args);
    return;
  }

  // ✅ Only suppress known warnings
  if (isKnownWarning(message)) {
    return;
  }

  // ✅ Pass through everything else
  originalConsoleLog(...args);
};

// ============================================================
// CRITICAL: Ensure real timers for React's scheduler
// ============================================================
vi.useRealTimers();

/**
 * -----------------------------
 * GLOBAL CLEANUP
 * -----------------------------
 */
// Clean up DOM after each test to prevent memory leaks and test pollution
afterEach(() => {
  cleanup();
  // Reset any global state
  vi.clearAllMocks();
  vi.resetAllMocks();
  // CRITICAL: Re-apply real timers after clearing mocks
  vi.useRealTimers();
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
  // CRITICAL: Ensure real timers before each test
  vi.useRealTimers();
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

// Wrap getComputedStyle to provide full properties for Vaul/Radix
const realGetComputedStyle = window.getComputedStyle;
Object.defineProperty(window, 'getComputedStyle', {
  value: (el, pseudo) => {
    const style = realGetComputedStyle(el, pseudo);
    return {
      ...style,
      getPropertyValue: (prop) => style.getPropertyValue(prop) || '',
      transform: style.transform || 'none',
      webkitTransform: style.webkitTransform || 'none',
      mozTransform: style.mozTransform || 'none',
    };
  },
});

/**
 * -----------------------------
 * STORAGE MOCKS (FIXED)
 * -----------------------------
 */
// Create storage mocks with proper getItem that returns null for missing keys
const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index) => Object.keys(store)[index] || null,
  };
};

// Define localStorage and sessionStorage with proper mocks
if (!window.localStorage) {
  Object.defineProperty(window, "localStorage", {
    value: createStorageMock(),
    writable: true,
    configurable: true,
  });
}

if (!window.sessionStorage) {
  Object.defineProperty(window, "sessionStorage", {
    value: createStorageMock(),
    writable: true,
    configurable: true,
  });
}

/**
 * -----------------------------
 * WINDOW LOCATION MOCK
 * -----------------------------
 */
// Add window.location for React Router and URL creation
if (!window.location || !window.location.origin) {
  Object.defineProperty(window, "location", {
    writable: true,
    configurable: true,
    value: {
      href: "http://localhost/",
      origin: "http://localhost",
      pathname: "/",
      search: "",
      hash: "",
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    },
  });
}

Object.defineProperty(window, "history", {
  writable: true,
  configurable: true,
  value: {
    pushState: vi.fn(),
    replaceState: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    length: 0,
    scrollRestoration: "auto",
    state: null,
  },
});

/**
 * -----------------------------
 * WINDOW METHOD MOCKS
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

// ============================================================
// CRITICAL FIX: DO NOT mock setTimeout or setInterval
// React's scheduler (used by react-router-dom v7 Navigate)
// relies on real setTimeout and MessageChannel to flush
// startTransition updates. Mocking them breaks navigation.
// ============================================================

// REMOVED: setTimeout mock - let jsdom handle it natively
// REMOVED: setInterval mock - let jsdom handle it natively

// Keep clearTimeout and clearInterval if they're missing
if (!window.clearTimeout) {
  Object.defineProperty(window, "clearTimeout", {
    writable: true,
    configurable: true,
    value: vi.fn(),
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

// Mock PointerEvent for Slider/RadioGroup components
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

// Mock DOMRect for popover/input-otp components
if (!window.DOMRect) {
  window.DOMRect = class DOMRect {
    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.top = y;
      this.left = x;
      this.bottom = y + height;
      this.right = x + width;
    }
    toJSON() {
      return { x: this.x, y: this.y, width: this.width, height: this.height, top: this.top, left: this.left, bottom: this.bottom, right: this.right };
    }
  };
}

// Mock Element.prototype methods for Radix UI components
if (!Element.prototype.hasOwnProperty('scrollIntoView')) {
  Element.prototype.scrollIntoView = vi.fn();
}

// Mock setPointerCapture for Vaul Drawer
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// getClientRects for dropdown measurements
window.Element.prototype.getClientRects = vi.fn(() => ({
  item: () => ({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
  }),
  length: 1,
  [Symbol.iterator]: function* () {
    yield {
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
    };
  },
}));

/**
 * -----------------------------
 * AUDIO CONTEXT MOCK
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
 * FETCH MOCK FOR AUDIO PLAYER
 * -----------------------------
 */
// Mock fetch for audioPlayer tests
if (!global.fetch) {
  global.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      blob: () => Promise.resolve(new Blob()),
      text: () => Promise.resolve(""),
      json: () => Promise.resolve({}),
      ok: true,
      status: 200,
    })
  );
}

// Reset fetch mock before each test
beforeEach(() => {
  if (global.fetch && typeof global.fetch === 'function' && global.fetch.mockClear) {
    global.fetch.mockClear();
  }
});

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
  // REMOVED: document.body.innerHTML = ''; // This was causing issues with async continuations
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

// IMPORTANT: Export a helper to reset storage for tests that need it
// This is NOT automatically called - tests must call it if they need clean storage
export const resetStorage = () => {
  window.localStorage.clear();
  window.sessionStorage.clear();
};

// ============================================================
// NOTE: The vi.spyOn(console, "error"/"warn") blanket-silence
// block that used to live here (in beforeAll/afterAll) has been
// removed. It conflicted with `restoreMocks: true` in
// vite.config.js — that setting auto-restores any vi.spyOn mock
// before every test, so the spy was only actually silencing
// console output for the first test in the run and reverting
// after that. The plain-reassignment overrides at the top of this
// file (console.error = ..., console.warn = ..., console.log = ...)
// are NOT vi.spyOn mocks, so they aren't touched by restoreMocks
// and apply consistently across the whole suite. No replacement
// code is needed here — the top-of-file overrides already cover it.
// ============================================================
