import { vi } from "vitest";
import React from "react";
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, afterAll, beforeEach } from "vitest";

// 1. Polyfills and Mock Definitions
if (typeof window !== "undefined") {
  // Global Mock for Sonner
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
      Toaster: () => React.createElement("div", { "data-testid": "mock-toaster" }),
    };
  });

  // Mock window.matchMedia
  try {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query.includes("min-width: 768px") || query.includes("min-width:768px"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  } catch (_e) {}

  // Mock window.scrollTo
  try {
    Object.defineProperty(window, "scrollTo", {
      writable: true,
      configurable: true,
      value: vi.fn(),
    });
  } catch (_e) {}

  // Storage Mocking
  class StorageMock {
    constructor() { this.store = {}; }
    clear() { this.store = {}; }
    getItem(key) { return this.store[key] || null; }
    setItem(key, value) { this.store[key] = String(value); }
    removeItem(key) { delete this.store[key]; }
    get length() { return Object.keys(this.store).length; }
    key(index) { return Object.keys(this.store)[index] || null; }
  }
  const localStorageMock = new StorageMock();
  const sessionStorageMock = new StorageMock();
  try {
    Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true, configurable: true });
    Object.defineProperty(window, "sessionStorage", { value: sessionStorageMock, writable: true, configurable: true });
  } catch (_e) {
    window.localStorage = localStorageMock;
    window.sessionStorage = sessionStorageMock;
  }
  global.localStorage = localStorageMock;
  global.sessionStorage = sessionStorageMock;

  // Mock PointerEvent for Radix primitives
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

  // Mock window.getComputedStyle
  try {
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = (elt, pseudoElt) => {
      if (originalGetComputedStyle) {
        try { const res = originalGetComputedStyle(elt, pseudoElt); if (res) return res; } catch (_e) {}
      }
      return {
        getPropertyValue: (prop) => {
          if (prop === "transition-duration" || prop === "animation-duration") return "0s";
          if (prop === "height") return "0px";
          return "";
        },
        appearance: "none", content: "none", transitionDuration: "0s", animationDuration: "0s", display: "block", height: "0px",
      };
    };
    global.getComputedStyle = window.getComputedStyle;
  } catch (_e) {}

  // Mock window.Image constructor
  class MockImage {
    constructor() { this.listeners = {}; this._src = ""; }
    get src() { return this._src; }
    set src(value) {
      this._src = value;
      if (this.onload) this.onload();
      if (this.listeners["load"]) this.listeners["load"].forEach((cb) => cb());
    }
    addEventListener(event, callback) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(callback);
    }
    removeEventListener(event, callback) {
      if (this.listeners[event]) this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }
    setAttribute(name, value) { if (name === "src") this.src = value; }
    getAttribute(name) { return name === "src" ? this.src : null; }
  }
  try {
    Object.defineProperty(window, "Image", { value: MockImage, writable: true, configurable: true });
  } catch (_e) { window.Image = MockImage; }

  // STALL SAFEGUARDS: Force animation loops to run instantly and synchronously
  window.setTimeout = window.setTimeout || global.setTimeout;
  window.clearTimeout = window.clearTimeout || global.clearTimeout;
  
  // Executing the callback instantly prevents Radix/JSDOM from queuing open microtasks
  window.requestAnimationFrame = (cb) => { cb(Date.now()); return 1; };
  window.cancelAnimationFrame = () => {};
  global.requestAnimationFrame = window.requestAnimationFrame;
  global.cancelAnimationFrame = window.cancelAnimationFrame;

  // Observers
  class ResizeObserverMock { constructor(callback) { this.callback = callback; } observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn(); }
  try { Object.defineProperty(window, "ResizeObserver", { value: ResizeObserverMock, writable: true, configurable: true }); } catch (_e) { window.ResizeObserver = ResizeObserverMock; }
  global.ResizeObserver = window.ResizeObserver;

  class IntersectionObserverMock { constructor(callback) { this.callback = callback; } observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn(); }
  try { Object.defineProperty(window, "IntersectionObserver", { value: IntersectionObserverMock, writable: true, configurable: true }); } catch (_e) { window.IntersectionObserver = IntersectionObserverMock; }
  global.IntersectionObserver = window.IntersectionObserver;

  // Mock HTMLCanvasElement context
  if (window.HTMLCanvasElement) {
    window.HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillRect: vi.fn(), clearRect: vi.fn(), getImageData: vi.fn(), putImageData: vi.fn(), createImageData: vi.fn(),
      setTransform: vi.fn(), drawImage: vi.fn(), save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
      lineTo: vi.fn(), closePath: vi.fn(), stroke: vi.fn(), translate: vi.fn(), scale: vi.fn(), rotate: vi.fn(),
      arc: vi.fn(), fill: vi.fn(), measureText: vi.fn().mockReturnValue({ width: 0 }), transform: vi.fn(), rect: vi.fn(), clip: vi.fn(),
    });
  }

  // Clipboard Mock
  const clipboardMock = { writeText: vi.fn().mockResolvedValue(undefined), readText: vi.fn().mockResolvedValue("") };
  if (typeof navigator === "undefined" || !navigator) {
    global.navigator = { clipboard: clipboardMock };
  } else {
    try { Object.defineProperty(navigator, "clipboard", { writable: true, configurable: true, value: clipboardMock }); } catch (_e) { navigator.clipboard = clipboardMock; }
  }

  // HTMLElement prototype extensions
  if (window.HTMLElement) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 100, height: 100, top: 0, left: 0, bottom: 100, right: 100, x: 0, y: 0,
    });
  }
  if (window.Element) { window.Element.prototype.scrollIntoView = vi.fn(); }
}

// Audio Context Mock
global.AudioContext = vi.fn().mockImplementation(() => ({
  createBuffer: vi.fn(),
  decodeAudioData: vi.fn().mockImplementation(() => Promise.resolve({
    sampleRate: 44100, length: 1024, duration: 1024 / 44100, numberOfChannels: 2, getChannelData: vi.fn().mockReturnValue(new Float32Array(1024)),
  })),
  createBufferSource: vi.fn(() => ({ buffer: null, connect: vi.fn(), start: vi.fn() })),
  createGain: vi.fn(() => ({ connect: vi.fn(), gain: { value: 1 } })),
  destination: {}, state: "suspended", resume: vi.fn().mockResolvedValue(undefined),
}));
global.webkitAudioContext = global.AudioContext;

// 2. Import Testing Library helpers
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
global.fireEvent = fireEvent; global.render = render; global.screen = screen; global.waitFor = waitFor;
export { fireEvent, render, screen, waitFor, cleanup };

// Global Orchestration Hooks to completely clear out background async state per file
beforeEach(() => {
  // Catch any implicit async timers standard components try to hide in the event queue
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  if (typeof document !== "undefined") {
    const floatingNodes = document.querySelectorAll([
      "[data-radix-portal]", "[data-radix-focus-guard]", "[data-radix-popper-content-wrapper]",
      '[role="dialog"]', '[role="menu"]', ".fixed"
    ].join(","));
    floatingNodes.forEach((el) => el.remove());
    document.body.innerHTML = "";
  }
  
  // Flush any pending component state update cycles immediately
  try {
    vi.runOnlyPendingTimers();
  } catch (_e) {}
  vi.useRealTimers();
  
  vi.clearAllTimers();
  vi.clearAllMocks();
});

afterAll(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});
