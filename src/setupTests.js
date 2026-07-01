import { vi } from "vitest";
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll } from "vitest";

// ============================================
// 1. POLYFILLS AND MOCKS
// ============================================

if (typeof window !== "undefined") {
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

  // Mock scrollTo
  window.scrollTo = vi.fn();

  // Storage mocks
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

  // Mock PointerEvent
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

  // Mock getComputedStyle
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = (elt, pseudoElt) => {
    try {
      const res = originalGetComputedStyle(elt, pseudoElt);
      if (res) return res;
    } catch (_e) {}
    return {
      getPropertyValue: () => "0s",
      transitionDuration: "0s",
      animationDuration: "0s",
      height: "0px",
    };
  };
  global.getComputedStyle = window.getComputedStyle;

  // Mock Image - FIXED to properly clean up timeouts
  class MockImage {
    constructor() {
      this._src = "";
      this.onload = null;
      this.listeners = {};
      this._timeoutId = null;
    }
    get src() { return this._src; }
    set src(value) {
      this._src = value;
      // Clear any existing timeout
      if (this._timeoutId) {
        clearTimeout(this._timeoutId);
        this._timeoutId = null;
      }
      this._timeoutId = setTimeout(() => {
        if (this.onload) this.onload();
        if (this.listeners.load) {
          this.listeners.load.forEach(cb => cb());
        }
        this._timeoutId = null;
      }, 5);
    }
    addEventListener(event, cb) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(cb);
    }
    removeEventListener(event, cb) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(fn => fn !== cb);
      }
    }
    setAttribute(name, value) { if (name === "src") this.src = value; }
    getAttribute(name) { return name === "src" ? this.src : null; }
    // Cleanup method
    _cleanup() {
      if (this._timeoutId) {
        clearTimeout(this._timeoutId);
        this._timeoutId = null;
      }
    }
  }
  window.Image = MockImage;

  // requestAnimationFrame
  window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
  global.requestAnimationFrame = window.requestAnimationFrame;
  global.cancelAnimationFrame = window.cancelAnimationFrame;

  // Dialog mocks
  window.alert = vi.fn();
  window.confirm = vi.fn().mockReturnValue(true);
  window.prompt = vi.fn().mockReturnValue("");

  // ResizeObserver
  class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  window.ResizeObserver = ResizeObserverMock;

  // IntersectionObserver
  class IntersectionObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  window.IntersectionObserver = IntersectionObserverMock;

  // Canvas
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

  // Clipboard
  const clipboardMock = {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(""),
  };
  Object.defineProperty(navigator, "clipboard", {
    writable: true,
    configurable: true,
    value: clipboardMock,
  });

  // HTMLElement mocks
  if (window.HTMLElement) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 100, height: 100, top: 0, left: 0, bottom: 100, right: 100, x: 0, y: 0,
    });
  }
  if (window.Element) {
    window.Element.prototype.scrollIntoView = vi.fn();
  }

  // Media elements
  if (window.HTMLMediaElement) {
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  }
}

// AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
  createBuffer: vi.fn(),
  decodeAudioData: vi.fn().mockResolvedValue({
    sampleRate: 44100,
    length: 1024,
    duration: 1024 / 44100,
    numberOfChannels: 2,
    getChannelData: vi.fn().mockReturnValue(new Float32Array(1024)),
  }),
  createBufferSource: vi.fn(() => ({ buffer: null, connect: vi.fn(), start: vi.fn() })),
  createGain: vi.fn(() => ({ connect: vi.fn(), gain: { value: 1 } })),
  destination: {},
  state: "suspended",
  resume: vi.fn().mockResolvedValue(undefined),
}));
global.webkitAudioContext = global.AudioContext;

// ============================================
// 2. EXPOSE TESTING HELPERS
// ============================================

export { cleanup };

// ============================================
// 3. CLEANUP AFTER EACH TEST
// ============================================

afterEach(() => {
  cleanup();
  
  if (typeof document !== "undefined") {
    // Remove only specific elements
    document.querySelectorAll("[data-radix-portal]").forEach(el => el.remove());
    document.querySelectorAll("[data-radix-focus-guard]").forEach(el => el.remove());
    document.querySelectorAll("[data-radix-popper-content-wrapper]").forEach(el => el.remove());
    // Clear any leftover containers
    const containers = document.querySelectorAll("#root, [data-testid]");
    containers.forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }
  
  // Clear all timers
  vi.clearAllTimers();
  
  // Clear all mocks
  vi.clearAllMocks();
  
  // Restore all mocks to their original implementation
  vi.restoreAllMocks();
});

// ============================================
// 4. GLOBAL TEARDOWN - Force exit on CI
// ============================================

if (typeof process !== "undefined" && process.env.CI) {
  // Add a global afterAll to force exit
  afterAll(() => {
    console.log("🔧 All tests complete, forcing cleanup...");
    // Clear any remaining timers
    vi.clearAllTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });
}
