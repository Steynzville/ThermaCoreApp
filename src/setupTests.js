import { vi, beforeAll } from "vitest";

/**
 * -------------------------------------------------------
 * GLOBAL JSDOM POLYFILLS (fix dashboard + Radix + charts)
 * -------------------------------------------------------
 */

// FIX: matchMedia (CRITICAL for dashboard layout + dark mode + responsive tests)
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

// FIX: ResizeObserver (Radix UI, charts, layout libs)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// FIX: IntersectionObserver (charts, lazy rendering, animations)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// FIX: scroll APIs (UI libraries + navigation animations)
Object.defineProperty(window, "scrollTo", {
  value: vi.fn(),
  writable: true,
});

// FIX: getComputedStyle (layout + styling tests)
Object.defineProperty(window, "getComputedStyle", {
  value: () => ({
    getPropertyValue: () => "",
  }),
});

/**
 * -------------------------------------------------------
 * MOCK FRAMER MOTION (prevents animation-related instability)
 * -------------------------------------------------------
 */
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

/**
 * -------------------------------------------------------
 * GLOBAL CONSOLE CLEANUP (optional but stabilizes CI logs)
 * -------------------------------------------------------
 */
beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
