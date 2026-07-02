import "@testing-library/jest-dom";
import { vi, beforeAll, beforeEach } from "vitest";
import React from "react";

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

Object.defineProperty(window, "getComputedStyle", {
  value: () => ({
    getPropertyValue: () => "",
  }),
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
const anchorClickSpy = vi
  .spyOn(HTMLAnchorElement.prototype, "click")
  .mockImplementation(() => {});

// Optional browser APIs that some components may use
if (!window.open) {
  window.open = vi.fn();
}

if (!navigator.msSaveBlob) {
  navigator.msSaveBlob = vi.fn();
}

beforeEach(() => {
  vi.clearAllMocks();

  global.URL.createObjectURL.mockClear();
  global.URL.revokeObjectURL.mockClear();

  anchorClickSpy.mockClear();

  if (window.open.mockClear) {
    window.open.mockClear();
  }

  if (navigator.msSaveBlob.mockClear) {
    navigator.msSaveBlob.mockClear();
  }
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
