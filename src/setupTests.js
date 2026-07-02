import "@testing-library/jest-dom";
import { vi, beforeAll } from "vitest";

/**
 * -----------------------------
 * GLOBAL MATCHMEDIA FIX (CRITICAL)
 * -----------------------------
 * Prevents: Cannot read properties of undefined (reading 'matches')
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

// Always define it safely BEFORE tests run
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
 * OTHER JSDOM POLYFILLS
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
 * FRAMER MOTION MOCK
 * -----------------------------
 * Fixes layout/animation instability in JSDOM
 */
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => {
      return <div {...props}>{children}</div>;
    },
  },
}));

/**
 * -----------------------------
 * CONSOLE CLEANUP (STABILITY)
 * -----------------------------
 */
beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
