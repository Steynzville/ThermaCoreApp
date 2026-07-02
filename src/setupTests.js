import "@testing-library/jest-dom";
import { vi, beforeAll } from "vitest";

/**
 * -----------------------------
 * JSDOM POLYFILLS
 * -----------------------------
 */

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

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
 */
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => {
      return {
        type: "div",
        props,
        children,
      };
    },
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
