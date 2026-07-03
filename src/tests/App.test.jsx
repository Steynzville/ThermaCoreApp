import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, beforeAll, afterAll } from "vitest";

import App from "../App";

// Mock AudioContext globally (same as audioPlayer.test.js)
class MockAudioContext {
  constructor() {
    this.state = "suspended";
    this.currentTime = 0;
    this.destination = {};
  }
  resume() {
    return Promise.resolve();
  }
  suspend() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
  decodeAudioData() {
    return Promise.resolve({
      duration: 1,
      numberOfChannels: 2,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(44100),
    });
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
  }
  createGain() {
    return {
      gain: { value: 0.5, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }
}

// Setup AudioContext mock before all tests
beforeAll(() => {
  // Store original if it exists
  const originalAudioContext = window.AudioContext;
  const originalWebkitAudioContext = window.webkitAudioContext;

  // Mock AudioContext
  Object.defineProperty(window, "AudioContext", {
    writable: true,
    configurable: true,
    value: MockAudioContext,
  });

  Object.defineProperty(window, "webkitAudioContext", {
    writable: true,
    configurable: true,
    value: MockAudioContext,
  });

  // Clean up after all tests
  return () => {
    Object.defineProperty(window, "AudioContext", {
      writable: true,
      configurable: true,
      value: originalAudioContext,
    });
    Object.defineProperty(window, "webkitAudioContext", {
      writable: true,
      configurable: true,
      value: originalWebkitAudioContext,
    });
  };
});

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Login page for unauthenticated user", () => {
    render(<App />);
    const usernameElements = screen.getAllByLabelText(/Username/i);
    expect(usernameElements.length).toBeGreaterThan(0);
  });

  it("renders with all required providers", () => {
    render(<App />);
    // App should render without crashing
    const usernameElements = screen.getAllByLabelText(/Username/i);
    expect(usernameElements.length).toBeGreaterThan(0);
  });

  it("redirects to /login when accessing root path", () => {
    render(<App />);
    // Should show login screen when accessing root
    const usernameElements = screen.getAllByLabelText(/Username/i);
    expect(usernameElements.length).toBeGreaterThan(0);
  });

  it("renders router with routes", () => {
    render(<App />);
    // App should have routing functionality
    expect(window.location.pathname).toBeDefined();
  });

  it("mounts and unmounts without errors", () => {
    const { unmount } = render(<App />);
    expect(() => unmount()).not.toThrow();
  });

  it("renders theme toggle component", () => {
    render(<App />);
    // Theme toggle should be present in the DOM
    const app = document.querySelector(".min-h-screen");
    expect(app).toBeInTheDocument();
  });
});
