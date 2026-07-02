import { vi } from "vitest";
import React from "react";
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// ============================================
// BROWSER API POLYFILLS (Must run before any imports)
// ============================================

if (typeof window !== "undefined") {
  // ============================================
  // 1. matchMedia Polyfill
  // ============================================
  try {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  } catch (_e) {
    // Ignore
  }

  // ============================================
  // 2. ResizeObserver Mock
  // ============================================
  class ResizeObserverMock {
    constructor(callback) {
      this.callback = callback;
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
    }
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

  // ============================================
  // 3. getBoundingClientRect Stable Mock
  // ============================================
  const mockRect = {
    width: 100,
    height: 100,
    top: 0,
    left: 0,
    right: 100,
    bottom: 100,
    x: 0,
    y: 0,
  };

  if (window.Element) {
    try {
      window.Element.prototype.getBoundingClientRect = vi
        .fn()
        .mockReturnValue(mockRect);
    } catch (_e) {
      // Ignore
    }
  }

  if (window.HTMLElement) {
    try {
      window.HTMLElement.prototype.getBoundingClientRect = vi
        .fn()
        .mockReturnValue(mockRect);
    } catch (_e) {
      // Ignore
    }
  }

  // ============================================
  // 4. AudioContext Mock
  // ============================================
  const AudioContextMock = vi.fn().mockImplementation(() => ({
    createBuffer: vi.fn(),
    decodeAudioData: vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve({
          sampleRate: 44100,
          length: 1024,
          duration: 1024 / 44100,
          numberOfChannels: 2,
          getChannelData: vi.fn().mockReturnValue(new Float32Array(1024)),
        })
      ),
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

  global.AudioContext = AudioContextMock;
  global.webkitAudioContext = AudioContextMock;

  try {
    Object.defineProperty(window, "AudioContext", {
      value: AudioContextMock,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "webkitAudioContext", {
      value: AudioContextMock,
      writable: true,
      configurable: true,
    });
  } catch (_e) {
    window.AudioContext = AudioContextMock;
    window.webkitAudioContext = AudioContextMock;
  }

  // ============================================
  // 5. Additional DOM APIs
  // ============================================

  // Storage mocks
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
    Object.defineProperty(window, "sessionStorage", {
      value: sessionStorageMock,
      writable: true,
      configurable: true,
    });
  } catch (_e) {
    window.localStorage = localStorageMock;
    window.sessionStorage = sessionStorageMock;
  }

  global.localStorage = localStorageMock;
  global.sessionStorage = sessionStorageMock;

  // ============================================
  // 6. PointerEvent
  // ============================================
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
      // Ignore
    }
  }

  // ============================================
  // 7. IntersectionObserver
  // ============================================
  class IntersectionObserverMock {
    constructor(callback) {
      this.callback = callback;
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
    }
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

  // ============================================
  // 8. Animation Frame
  // ============================================
  window.requestAnimationFrame =
    window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
  window.cancelAnimationFrame =
    window.cancelAnimationFrame || ((id) => clearTimeout(id));
  global.requestAnimationFrame = window.requestAnimationFrame;
  global.cancelAnimationFrame = window.cancelAnimationFrame;

  // ============================================
  // 9. Scroll and Navigation
  // ============================================
  try {
    Object.defineProperty(window, "scrollTo", {
      writable: true,
      configurable: true,
      value: vi.fn(),
    });
  } catch (_e) {
    // Ignore
  }

  if (window.HTMLElement) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  }

  // ============================================
  // 10. Canvas
  // ============================================
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

  // ============================================
  // 11. Navigator Clipboard
  // ============================================
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
        const descriptor = Object.getOwnPropertyDescriptor(
          window,
          "navigator"
        );
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

  // ============================================
  // 12. Dialog Functions
  // ============================================
  window.alert = vi.fn();
  window.confirm = vi.fn().mockReturnValue(true);
  window.prompt = vi.fn().mockReturnValue("");

  // ============================================
  // 13. Media Elements
  // ============================================
  if (window.HTMLMediaElement) {
    window.HTMLMediaElement.prototype.play = vi
      .fn()
      .mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  }

  // ============================================
  // 14. getComputedStyle
  // ============================================
  try {
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = (elt, pseudoElt) => {
      if (originalGetComputedStyle) {
        try {
          const res = originalGetComputedStyle(elt, pseudoElt);
          if (res) return res;
        } catch (_e) {
          // Ignore
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
    // Ignore
  }
}

// ============================================
// TESTING LIBRARY IMPORTS
// ============================================
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

global.fireEvent = fireEvent;
global.render = render;
global.screen = screen;
global.waitFor = waitFor;

export { fireEvent, render, screen, waitFor, cleanup };

// ============================================
// GLOBAL CLEANUP
// ============================================
afterEach(() => {
  cleanup();

  if (typeof document !== "undefined") {
    document
      .querySelectorAll("[data-radix-portal]")
      .forEach((el) => {
        el.remove();
      });
    document
      .querySelectorAll("[data-radix-focus-guard]")
      .forEach((el) => {
        el.remove();
      });
    document
      .querySelectorAll("[data-radix-popper-content-wrapper]")
      .forEach((el) => {
        el.remove();
      });

    document
      .querySelectorAll("#root, [data-testid]")
      .forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });

    document
      .querySelectorAll(
        '[data-slot="card"], [data-slot="card-header"], [data-slot="card-footer"]'
      )
      .forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });

    const bodyChildren = document.body.children;
    for (let i = bodyChildren.length - 1; i >= 0; i--) {
      const child = bodyChildren[i];
      if (
        child.id === "root" ||
        child.getAttribute("data-testid") ||
        child.className?.includes("test")
      ) {
        child.remove();
      }
    }
  }

  vi.clearAllTimers();
  vi.clearAllMocks();
});

// ============================================
// CONSOLE WARNING SUPPRESSION
// ============================================
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes(
      "You provided a value prop to a form field without an onChange handler"
    )
  ) {
    return;
  }
  originalConsoleError(...args);
};
