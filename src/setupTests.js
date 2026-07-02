import { vi } from "vitest";
import React from "react";
import "@testing-library/jest-dom";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach } from "vitest";

// 1. Polyfills and Mock Definitions
if (typeof window !== "undefined") {
  // Mock Sonner
  vi.mock("sonner", () => ({
    toast: Object.assign(
      vi.fn((msg) => msg),
      {
        success: vi.fn((msg) => msg),
        error: vi.fn((msg) => msg),
        warning: vi.fn((msg) => msg),
        info: vi.fn((msg) => msg),
        dismiss: vi.fn(),
        custom: vi.fn(),
      }
    ),
    Toaster: () => React.createElement("div", { "data-testid": "mock-toaster" }),
  }));

  // Mock window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: query.includes("min-width: 768px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock window.scrollTo
  window.scrollTo = vi.fn();

  // Storage Mocks
  class StorageMock {
    constructor() { this.store = {}; }
    clear() { this.store = {}; }
    getItem(key) { return this.store[key] || null; }
    setItem(key, value) { this.store[key] = String(value); }
    removeItem(key) { delete this.store[key]; }
  }
  window.localStorage = new StorageMock();
  window.sessionStorage = new StorageMock();

  // Mock Intersection/Resize Observers
  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  window.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}

// Global helpers
global.fireEvent = fireEvent;
global.render = render;
global.screen = screen;
global.waitFor = waitFor;

export { fireEvent, render, screen, waitFor, cleanup };

// 2. Global cleanup: Optimized to prevent CI stalls
afterEach(() => {
  // Clear persistent DOM overlays (Radix/Dialogs)
  if (typeof document !== "undefined") {
    const floatingNodes = document.querySelectorAll([
      "[data-radix-portal]",
      "[data-radix-focus-guard]",
      "[data-radix-popper-content-wrapper]",
      '[role="dialog"]',
      '[role="menu"]',
      ".fixed"
    ].join(","));
    
    floatingNodes.forEach((el) => { el.remove(); });
  }

  // Cleanup React Testing Library
  cleanup();
  
  // Clear timers and mocks
  vi.clearAllTimers();
  vi.clearAllMocks();
});

// 3. Suppress specific React warnings that cause I/O bottlenecks
const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (
    msg.includes('You provided a `value` prop to a form field without an `onChange` handler') ||
    msg.includes('Warning: An update to .* inside a test was not wrapped in act')
  ) {
    return;
  }
  originalConsoleError(...args);
};
