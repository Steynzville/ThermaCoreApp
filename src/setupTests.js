import "@testing-library/jest-dom";

import { vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
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
  decodeAudioData: vi.fn(),
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
  state: 'suspended',
  resume: vi.fn().mockResolvedValue(undefined),
}));

global.webkitAudioContext = global.AudioContext;
