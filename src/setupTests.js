import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

global.fireEvent = fireEvent;
global.render = render;
global.screen = screen;
global.waitFor = waitFor;

if (typeof window !== "undefined") {
  // Mock window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
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

  // Mock window.scrollTo
  Object.defineProperty(window, "scrollTo", {
    writable: true,
    value: vi.fn(),
  });

  // Mock localStorage and sessionStorage
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

  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(window, "sessionStorage", {
    value: sessionStorageMock,
    writable: true,
    configurable: true,
  });

  global.localStorage = localStorageMock;
  global.sessionStorage = sessionStorageMock;

  // Mock window.Image constructor with addEventListener and event trigger simulation
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
      // Simulate async loading to trigger Radix Avatar onload/onerror
      setTimeout(() => {
        if (this.onload) this.onload();
        if (this.listeners["load"]) {
          this.listeners["load"].forEach((cb) => { cb(); });
        }
      }, 10);
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
  Object.defineProperty(window, "Image", {
    value: MockImage,
    writable: true,
    configurable: true,
  });

  // Ensure setTimeout and clearTimeout are defined on window
  window.setTimeout = window.setTimeout || global.setTimeout;
  window.clearTimeout = window.clearTimeout || global.clearTimeout;

  // Mock window.requestAnimationFrame & cancelAnimationFrame
  window.requestAnimationFrame = window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
  window.cancelAnimationFrame = window.cancelAnimationFrame || ((id) => clearTimeout(id));
  global.requestAnimationFrame = window.requestAnimationFrame;
  global.cancelAnimationFrame = window.cancelAnimationFrame;

  // Mock window.getComputedStyle
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = (elt, pseudoElt) => {
    if (originalGetComputedStyle) {
      try {
        const res = originalGetComputedStyle(elt, pseudoElt);
        if (res) return res;
      } catch (e) {
        // ignore
      }
    }
    return {
      getPropertyValue: (prop) => {
        if (prop === "transition-duration") return "0s";
        if (prop === "animation-duration") return "0s";
        return "";
      },
      appearance: "none",
      content: "none",
      transitionDuration: "0s",
      animationDuration: "0s",
      display: "block",
    };
  };
  global.getComputedStyle = window.getComputedStyle;

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
  Object.defineProperty(window, "ResizeObserver", {
    value: ResizeObserverMock,
    writable: true,
    configurable: true,
  });

  // Mock IntersectionObserver
  class IntersectionObserverMock {
    constructor(callback) {
      this.callback = callback;
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  Object.defineProperty(window, "IntersectionObserver", {
    value: IntersectionObserverMock,
    writable: true,
    configurable: true,
  });

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
  if (typeof navigator === "undefined") {
    global.navigator = {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(""),
      },
    };
  } else {
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(""),
      },
    });
  }

  // Mock PointerEvent for Radix Slider / RadioGroup
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
    window.PointerEvent = MockPointerEvent;
    global.PointerEvent = MockPointerEvent;
  }

  // Mock HTMLElement prototype methods
  if (window.HTMLElement) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    // Default getBoundingClientRect size for charts and sliders
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

// Mock AudioContext globally for testing
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

afterEach(() => {
  cleanup();
  if (typeof document !== "undefined") {
    // Clear any leftover Radix portal wrappers, overlays, or DOM elements to prevent cross-test pollution
    // biome-ignore lint/suspicious/useIterableCallbackReturn: forEach callback intentionally returns void
    document
      .querySelectorAll("[data-radix-portal]")
      .forEach((el) => { el.remove(); });
    // biome-ignore lint/suspicious/useIterableCallbackReturn: forEach callback intentionally returns void
    document
      .querySelectorAll("[data-radix-focus-guard]")
      .forEach((el) => { el.remove(); });
    // biome-ignore lint/suspicious/useIterableCallbackReturn: forEach callback intentionally returns void
    document
      .querySelectorAll("[data-radix-popper-content-wrapper]")
      .forEach((el) => { el.remove(); });
    // biome-ignore lint/suspicious/useIterableCallbackReturn: forEach callback intentionally returns void
    document.querySelectorAll('[role="dialog"]').forEach((el) => { el.remove(); });
    // biome-ignore lint/suspicious/useIterableCallbackReturn: forEach callback intentionally returns void
    document.querySelectorAll('[role="menu"]').forEach((el) => { el.remove(); });
    document.body.innerHTML = "";
  }
});
