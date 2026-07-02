import "@testing-library/jest-dom/vitest";
import { vi, beforeAll } from "vitest";
import React from "react";

/**
 * -----------------------------
 * JSDOM POLYFILLS
 * -----------------------------
 */

// matchMedia (responsive layouts)
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

// ResizeObserver (Radix, charts, layout libs)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// IntersectionObserver (lazy loading, charts)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// scrollTo (navigation, layout)
Object.defineProperty(window, "scrollTo", {
  value: vi.fn(),
  writable: true,
});

// getComputedStyle (layout assertions)
Object.defineProperty(window, "getComputedStyle", {
  value: () => ({
    getPropertyValue: () => "",
  }),
});

/**
 * -----------------------------
 * FRAMER MOTION MOCK (SAFE + SVG COMPATIBLE)
 * -----------------------------
 * FIX: Uses Proxy so motion.div, motion.svg, motion.path, etc. all work
 */

vi.mock("framer-motion", () => {
  const createMockComponent = (Element = "div") => {
    return ({ children, ...props }) =>
      React.createElement(Element, props, children);
  };

  const motion = new Proxy(
    {},
    {
      get: (_, element) => createMockComponent(element),
    }
  );

  return {
    motion,
    AnimatePresence: ({ children }) => children,
  };
});

/**
 * -----------------------------
 * GLOBAL STABILITY HOOKS
 * -----------------------------
 */

beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
