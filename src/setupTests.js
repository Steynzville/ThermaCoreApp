import { vi } from "vitest";
import React from "react"; // Explicitly import React for the factory fallback
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// 1. Polyfills and Mock Definitions (at the very top before other major library imports)
if (typeof window !== "undefined") {
  // Global Mock for Sonner using standard JavaScript objects to fix compilation
  vi.mock("sonner", () => {
    return {
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
      // Uses standard React factory execution instead of JSX angle brackets
      Toaster: () => React.createElement("div", { "data-testid": "mock-toaster" }),
    };
  });

  // Mock window.matchMedia
  try {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches:
          query.includes("min-width: 768px") || query.includes("min-width:768px"),
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  } catch (_e) {
    // ignore
  }

  // Mock window.scrollTo
  try {
    Object.defineProperty(window, "scrollTo", {
      writable: true,
      configurable: true,
      value: vi.fn(),
    });
  } catch (_e) {
    // ignore
  }

  // StorageMock definition for localStorage and sessionStorage
  class StorageMock {
    constructor() {
      this.store = {};
    }
    clear() {
      this.store = {};
    }
    getItem(key) {
      return this.store[key] || null;
    }
    setItem(key, value) {
      this.store[key] = String(value);
    }
    removeItem(key) {
      delete this.store[key];
    }
    get length() {
      return Object.keys(this.store).length;
    }
    key(index) {
      const keys = Object.keys(this.store);
      return keys[index] || null;
    }
  }

  const localStorageMock = new StorageMock();
  const sessionStorageMock = new StorageMock();

  try {
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
  } catch (_e) {
    window.localStorage = localStorageMock;
  }

  try {
    Object.defineProperty(window, "sessionStorage", {
      value: sessionStorageMock,
      writable: true,
      configurable: true,
    });
  } catch (_e) {
    window.sessionStorage = sessionStorageMock;
  }

  global.localStorage = localStorageMock;
  global.sessionStorage = sessionStorageMock;

  // Mock PointerEvent for Radix components (defined BEFORE imports)
  if (!window.PointerEvent) {
    class MockPointerEvent extends Event {
      constructor(type, props = {}) {
        super(type, props);
        this.pointerId = props.pointerId || 0;
        this.pointerType = props.pointerType || "mouse";
        this.clientX = props.clientX || 0;
        this.clientY = props.clientY || 0;
      }
    }
    try {
      window.PointerEvent = MockPointerEvent;
      global.PointerEvent = MockPointerEvent;
    } catch (_e) {
      // ignore
    }
  }

  // Mock window.getComputedStyle with robust height support
  try {
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = (elt, pseudoElt) => {
      if (originalGetComputedStyle) {
        try {
          const res = originalGetComputedStyle(elt, pseudoElt);
          if (res) return res;
        } catch (_e) {
          // ignore
        }
      }
      return {
        getPropertyValue: (prop) => {
          if (prop === "transition-duration") return "0s";
          if (prop === "animation-duration") return "0s";
          if (prop === "height") return "0px";
          return "";
        },
        appearance: "none",
        content: "none",
        transitionDuration: "0s",
        animationDuration: "0s",
        display: "block",
        height: "0px",
      };
    };
    global.getComputedStyle = window.getComputedStyle;
  } catch (_e) {
    // ignore
  }

  // Mock window.Image constructor
  class MockImage {
    constructor() {
      this.listeners = {};
      this._src = "";
    }
    get src() {
      return this._src;
    }
    set src(value) {
      this._src = value;
      if (this.onload) this.onload();
      if (this.listeners["load"]) {
        this.listeners["load"].forEach((cb) => { cb(); });
      }
    }
    addEventListener(event, callback) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(callback);
    }
    removeEventListener(event, callback) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
      }
    }
    setAttribute(name, value) {
      if (name === "src") this.src = value;
    }
    getAttribute(name) {
      if (name === "src") return this.src;
      return null;
    }
  }

  try {
    Object.defineProperty(window, "Image", {
      value: MockImage,
      writable: true,
      configurable: true,
    });
  } catch (_e) {
    window.Image = MockImage;
  }

  // Ensure setTimeout and clearTimeout are defined on window
  window.setTimeout = window.setTimeout || global.setTimeout;
  window.clearTimeout = window.clearTimeout || global.clearTimeout;

  // Mock window.requestAnimationFrame & cancelAnimationFrame
  window.requestAnimationFrame = window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
  window.cancelAnimationFrame = window.cancelAnimationFrame || ((id) => clearTimeout(id));
  global.requestAnimationFrame = window.requestAnimationFrame;
  global.cancelAnimationFrame = window.cancelAnimationFrame;

  // Ensure addEventListener and removeEventListener are defined on window
  if (typeof window.addEventListener !== "function") {
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
  }

  // Mock dialog functions
  window.alert = vi.fn();
  window.confirm = vi.fn().mockReturnValue(true);
  window.prompt = vi.fn().mockReturnValue("");

  // Mock ResizeObserver
  class ResizeObserverMock {
    constructor(callback) {
      this.callback = callback;
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  try {
    Object.defineProperty(window, "ResizeObserver", {
      value: ResizeObserverMock,
      writable: true,
      configurable: true,
    });
  } catch (_e) {
    window.ResizeObserver = ResizeObserverMock;
  }
  global.ResizeObserver = window.ResizeObserver;

  // Mock IntersectionObserver
  class IntersectionObserverMock {
    constructor(callback) {
      this.callback = callback;
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  try {
    Object.defineProperty(window, "IntersectionObserver", {
      value: IntersectionObserverMock,
      writable: true,
      configurable: true,
    });
  } catch (_e) {
    window.IntersectionObserver = IntersectionObserverMock;
  }
  global.IntersectionObserver = window.IntersectionObserver;

  // Mock HTMLCanvasElement context
  if (window.HTMLCanvasElement) {
    window.HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 0 }),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    });
  }

  // Mock navigator.clipboard with standard read/write methods
  const clipboardMock = {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(""),
  };

  if (typeof navigator === "undefined" || !navigator) {
    global.navigator = {
      clipboard: clipboardMock,
    };
  } else {
    try {
      Object.defineProperty(navigator, "clipboard", {
        writable: true,
        configurable: true,
        value: clipboardMock,
      });
    } catch (_e) {
      try {
        navigator.clipboard = clipboardMock;
      } catch (_innerError) {
        const originalNavigator = window.navigator;
        const descriptor = Object.getOwnPropertyDescriptor(window, "navigator");
        if (descriptor?.configurable) {
          Object.defineProperty(window, "navigator", {
            value: {
              ...originalNavigator,
              clipboard: clipboardMock,
            },
            configurable: true,
            writable: true,
          });
        } else {
          window.navigator = {
            ...window.navigator,
            clipboard: clipboardMock,
          };
        }
      }
    }
  }

  // Mock HTMLElement prototype methods
  if (window.HTMLElement) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
    });
  }
  if (window.Element) {
    window.Element.prototype.scrollIntoView = vi.fn();
  }

  // Mock HTMLMediaElement methods
  if (window.HTMLMediaElement) {
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  }
}

// Mock AudioContext globally
global.AudioContext = vi.fn().mockImplementation(() => ({
  createBuffer: vi.fn(),
  decodeAudioData: vi.fn().mockImplementation(() => {
    const mockAudioBuffer = {
      sampleRate: 44100,
      length: 1024,
      duration: 1024 / 44100,
      numberOfChannels: 2,
      getChannelData: vi.fn().mockReturnValue(new Float32Array(1024)),
    };
    return Promise.resolve(mockAudioBuffer);
  }),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1 },
  })),
  destination: {},
  state: "suspended",
  resume: vi.fn().mockResolvedValue(undefined),
}));

global.webkitAudioContext = global.AudioContext;

// 2. Now import Testing Library so that they are evaluated with all globals fully defined
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// Ensure global helper functions exist
global.fireEvent = fireEvent;
global.render = render;
global.screen = screen;
global.waitFor = waitFor;

// Explicitly export testing helpers
export { fireEvent, render, screen, waitFor, cleanup };

// Global cleanup after each test - simplified to avoid memory issues
afterEach(() => {
  cleanup();
  if (typeof document !== "undefined") {
    // Only remove specific elements, not everything
    document
      .querySelectorAll("[data-radix-portal]")
      .forEach((el) => { el.remove(); });
    document
      .querySelectorAll("[data-radix-focus-guard]")
      .forEach((el) => { el.remove(); });
    document
      .querySelectorAll("[data-radix-popper-content-wrapper]")
      .forEach((el) => { el.remove(); });
    // Don't remove all dialogs or menus - they might be legitimate
    // Don't wipe document.body.innerHTML - this causes issues
  }
  
  vi.clearAllTimers();
  vi.clearAllMocks();
});

// 3. Suppress persistent React Form console warnings that cause I/O bottlenecks in CI
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' && 
    args[0].includes('You provided a `value` prop to a form field without an `onChange` handler')
  ) {
    return; // Silently swallow these warnings during tests
  }
  originalConsoleError(...args);
};
