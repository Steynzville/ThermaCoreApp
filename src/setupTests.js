import { vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom";

// Global fireEvent, render, screen, waitFor
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
global.fireEvent = fireEvent;
global.render = render;
global.screen = screen;
global.waitFor = waitFor;

// Basic mocks
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
  Toaster: () => null,
}));

// Essential mocks
if (typeof window !== "undefined") {
  // matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: query.includes("min-width"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Storage
  const createStorageMock = () => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => { store[key] = String(value); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { store = {}; },
      length: 0,
      key: () => null,
    };
  };

  window.localStorage = createStorageMock();
  window.sessionStorage = createStorageMock();
  global.localStorage = window.localStorage;
  global.sessionStorage = window.sessionStorage;

  // Other essential mocks
  window.scrollTo = vi.fn();
  window.Image = vi.fn().mockImplementation(() => ({
    onload: null,
    src: "",
  }));

  window.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  window.IntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}

// Cleanup
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
  
  if (typeof document !== "undefined") {
    document.querySelectorAll("[data-radix-portal], [data-radix-focus-guard]").forEach(el => el.remove());
  }
});
