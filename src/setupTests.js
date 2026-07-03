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
