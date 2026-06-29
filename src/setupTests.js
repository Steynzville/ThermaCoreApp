import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

global.fireEvent = fireEvent;
global.render = render;
global.screen = screen;
global.waitFor = waitFor;

import { vi } from "vitest";

if (typeof window !== "undefined") {
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

  // Mock window.scrollTo for JSDOM
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

  // Mock window.Image constructor
  if (!window.Image) {
    class MockImage {
      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 50);
      }
    }
    Object.defineProperty(window, "Image", {
      value: MockImage,
      writable: true,
      configurable: true,
    });
  }

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

  // Mock navigator.clipboard
  Object.defineProperty(navigator, "clipboard", {
    writable: true,
    configurable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(""),
    },
  });

  // Mock HTMLElement and Element prototype methods for JSDOM
  if (window.HTMLElement) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  }
  if (window.Element) {
    window.Element.prototype.scrollIntoView = vi.fn();
  }
}

// Mock AudioContext for testing environment
global.AudioContext = vi.fn().mockImplementation(() => ({
  createBuffer: vi.fn(),
  decodeAudioData: vi.fn().mockImplementation(() => {
    // Create a mock AudioBuffer object
    const mockAudioBuffer = {
      sampleRate: 44100,
      length: 1024,
      duration: 1024 / 44100,
      numberOfChannels: 2,
      getChannelData: vi.fn().mockReturnValue(new Float32Array(1024)),
    };
    // Return a resolved Promise with the mock AudioBuffer
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

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  // Clean up React Testing Library roots first
  cleanup();
  if (typeof document !== "undefined") {
    // Clear any leftover Radix portal wrappers, overlays, or DOM elements to prevent cross-test pollution
    document
      .querySelectorAll("[data-radix-portal]")
      .forEach((el) => el.remove());
    document
      .querySelectorAll("[data-radix-focus-guard]")
      .forEach((el) => el.remove());
    document
      .querySelectorAll("[data-radix-popper-content-wrapper]")
      .forEach((el) => el.remove());
    document.querySelectorAll('[role="dialog"]').forEach((el) => el.remove());
    document.querySelectorAll('[role="menu"]').forEach((el) => el.remove());
    document.body.innerHTML = "";
  }
});
