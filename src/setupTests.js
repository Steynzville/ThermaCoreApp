import "@testing-library/jest-dom/vitest";
import { vi, beforeAll } from "vitest";
import React from "react";

/**
 * -----------------------------
 * JSDOM POLYFILLS
 * -----------------------------
 */

// matchMedia (FIXED: responsive-aware mock)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query) => {
    const isMobileQuery = query.includes("max-width");

    return {
      matches: isMobileQuery,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  },
});

// ResizeObserver (Radix, charts, layout libs)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// IntersectionObserver (charts, lazy UI)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// scrollTo (navigation + layout behavior)
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
 * FRAMER MOTION MOCK (SVG SAFE)
 * -----------------------------
 * Supports: motion.div, motion.svg, motion.path, motion.g, etc.
 */

vi.mock("framer-motion", () => {
  const createMock = (Element = "div") => {
    return ({ children, ...props }) =>
      React.createElement(Element, props, children);
  };

  const motion = new Proxy(
    {},
    {
      get: (_, element) => createMock(element),
    }
  );

  return {
    motion,
    AnimatePresence: ({ children }) => children,
  };
});

/**
 * -----------------------------
 * GLOBAL STABILITY
 * -----------------------------
 */

beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
