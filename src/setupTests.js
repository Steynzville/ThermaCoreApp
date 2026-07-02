import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi, beforeAll } from "vitest";

/**
 * -----------------------------
 * JSDOM POLYFILLS
 * -----------------------------
 */

// matchMedia (fix responsive tests)
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

// ResizeObserver (Radix + charts)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// IntersectionObserver (charts + lazy UI)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// scrollTo (navigation + layout tests)
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
 * FRAMER MOTION MOCK (SAFE REACT VERSION)
 * -----------------------------
 */

vi.mock("framer-motion", () => {
  const MotionComponent = ({ children, ...props }) =>
    React.createElement("div", props, children);

  return {
    motion: {
      div: MotionComponent,
      span: MotionComponent,
      button: MotionComponent,
      section: MotionComponent,
    },
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
