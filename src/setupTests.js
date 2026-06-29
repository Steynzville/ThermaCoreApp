import "@testing-library/jest-dom";

import { vi } from "vitest";

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

// Mock HTMLElement and Element prototype methods for JSDOM
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.Element.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  // Clean up React Testing Library roots first
  cleanup();
  // Clear any leftover Radix portal wrappers, overlays, or DOM elements to prevent cross-test pollution
  document.querySelectorAll("[data-radix-portal]").forEach((el) => el.remove());
  document
    .querySelectorAll("[data-radix-focus-guard]")
    .forEach((el) => el.remove());
  document
    .querySelectorAll("[data-radix-popper-content-wrapper]")
    .forEach((el) => el.remove());
  document.querySelectorAll('[role="dialog"]').forEach((el) => el.remove());
  document.querySelectorAll('[role="menu"]').forEach((el) => el.remove());
  document.body.innerHTML = "";
});
