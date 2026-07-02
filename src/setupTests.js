import { vi, beforeAll } from "vitest";

// -------------------------------
// GLOBAL JSDOM FIXES
// -------------------------------

// 1. FIX matchMedia (CRITICAL)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query) => ({
    matches: false, // default safe value
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated but used in libs
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// 2. FIX ResizeObserver (Radix/UI + charts dependency)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// 3. FIX IntersectionObserver (charts + lazy UI)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// 4. FIX scroll APIs (Radix + animations)
Object.defineProperty(window, "scrollTo", {
  value: vi.fn(),
  writable: true,
});

// 5. FIX getComputedStyle (layout tests)
Object.defineProperty(window, "getComputedStyle", {
  value: () => ({
    getPropertyValue: () => "",
  }),
});

// -------------------------------
// FRAMER MOTION SAFETY
// -------------------------------
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

// -------------------------------
// CONSOLE CLEANUP (optional but helpful)
// -------------------------------
beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
