import { vi, beforeAll } from "vitest";

/**
 * -------------------------------------------------------
 * JSDOM GLOBAL POLYFILLS
 * -------------------------------------------------------
 */

// matchMedia fix (dashboard responsive + dark mode + layout tests)
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

// ResizeObserver fix (Radix UI, charts, layout systems)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// IntersectionObserver fix (charts, lazy rendering, animations)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// scrollTo fix (navigation + UI libraries)
Object.defineProperty(window, "scrollTo", {
  value: vi.fn(),
  writable: true,
});

// getComputedStyle fix (layout/styling tests)
Object.defineProperty(window, "getComputedStyle", {
  value: () => ({
    getPropertyValue: () => "",
  }),
});

/**
 * -------------------------------------------------------
 * FRAMER MOTION MOCK
 * -------------------------------------------------------
 * Prevents animation-related instability in tests
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
 * -------------------------------------------------------
 * GLOBAL TEST STABILITY HOOKS
 * -------------------------------------------------------
 */
beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
