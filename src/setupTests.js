import { vi, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";

/* =========================================================
   SAFE GLOBAL ENVIRONMENT BOOTSTRAP
========================================================= */

if (typeof window !== "undefined") {
  /* ===============================
     matchMedia (CRITICAL FIX)
  =============================== */
  window.matchMedia = window.matchMedia || function (query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  };

  /* ===============================
     ResizeObserver (Radix / Charts)
  =============================== */
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  window.ResizeObserver = window.ResizeObserver || ResizeObserverMock;
  global.ResizeObserver = window.ResizeObserver;

  /* ===============================
     IntersectionObserver (Lazy UI)
  =============================== */
  class IntersectionObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  window.IntersectionObserver = window.IntersectionObserver || IntersectionObserverMock;
  global.IntersectionObserver = window.IntersectionObserver;

  /* ===============================
     VisualViewport (Floating UI FIX)
  =============================== */
  window.visualViewport = window.visualViewport || {
    width: 1920,
    height: 1080,
    scale: 1,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  /* ===============================
     getBoundingClientRect (Radix FIX)
  =============================== */
  const rect = {
    width: 1200,
    height: 800,
    top: 0,
    left: 0,
    right: 1200,
    bottom: 800,
    x: 0,
    y: 0,
    toJSON: () => rect,
  };

  Element.prototype.getBoundingClientRect = () => rect;
  Element.prototype.getClientRects = () => [rect];

  /* ===============================
     scrollIntoView safety
  =============================== */
  HTMLElement.prototype.scrollIntoView = vi.fn();

  /* ===============================
     requestAnimationFrame safety
  =============================== */
  window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);

  /* ===============================
     Pointer Events (Radix drag)
  =============================== */
  class PointerEventMock extends Event {
    constructor(type, props = {}) {
      super(type, props);
      this.pointerId = props.pointerId || 1;
      this.pointerType = props.pointerType || "mouse";
      this.clientX = props.clientX || 0;
      this.clientY = props.clientY || 0;
    }
  }

  window.PointerEvent = window.PointerEvent || PointerEventMock;
  global.PointerEvent = window.PointerEvent;

  /* ===============================
     AudioContext (Dashboard / Player FIX)
  =============================== */
  class AudioContextMock {
    constructor() {
      this.state = "suspended";
    }

    resume = () => Promise.resolve();

    decodeAudioData = () =>
      Promise.resolve({
        sampleRate: 44100,
        length: 1024,
        duration: 1,
        numberOfChannels: 2,
        getChannelData: () => new Float32Array(1024),
      });

    createBufferSource = () => ({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
    });

    createGain = () => ({
      connect: vi.fn(),
      gain: { value: 1 },
    });

    destination = {};
  }

  window.AudioContext = window.AudioContext || AudioContextMock;
  window.webkitAudioContext = window.webkitAudioContext || AudioContextMock;

  global.AudioContext = window.AudioContext;
  global.webkitAudioContext = window.webkitAudioContext;

  /* ===============================
     Storage (safe state persistence)
  =============================== */
  class StorageMock {
    constructor() {
      this.store = {};
    }
    getItem = (k) => this.store[k] || null;
    setItem = (k, v) => (this.store[k] = String(v));
    removeItem = (k) => delete this.store[k];
    clear = () => (this.store = {});
  }

  window.localStorage = window.localStorage || new StorageMock();
  window.sessionStorage = window.sessionStorage || new StorageMock();

  global.localStorage = window.localStorage;
  global.sessionStorage = window.sessionStorage;

  /* ===============================
     Canvas (Charts FIX)
  =============================== */
  if (window.HTMLCanvasElement) {
    window.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
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
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    }));
  }

  /* ===============================
     Navigator clipboard
  =============================== */
  global.navigator = global.navigator || {};
  global.navigator.clipboard = {
    writeText: vi.fn().mockResolvedValue(),
    readText: vi.fn().mockResolvedValue(""),
  };

  /* ===============================
     Dialogs
  =============================== */
  global.alert = vi.fn();
  global.confirm = vi.fn(() => true);
  global.prompt = vi.fn(() => "");

  /* ===============================
     Safe computed style
  =============================== */
  const original = window.getComputedStyle;

  window.getComputedStyle = (el) =>
    original?.(el) || {
      getPropertyValue: () => "",
      display: "block",
      transitionDuration: "0s",
      animationDuration: "0s",
    };
}

/* =========================================================
   TEST CLEANUP
========================================================= */

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});
