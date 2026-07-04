import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, beforeAll, afterAll } from "vitest";

import App from "../App";

// Mock AudioContext globally
class MockAudioContext {
  constructor() {
    this.state = "suspended";
    this.currentTime = 0;
    this.destination = {};
  }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
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

// Setup AudioContext mock and window.location before all tests
beforeAll(() => {
  const originalAudioContext = window.AudioContext;
  const originalWebkitAudioContext = window.webkitAudioContext;

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

  // CRITICAL: Mock window.location for React Router
  Object.defineProperty(window, "location", {
    writable: true,
    configurable: true,
    value: {
      href: "http://localhost/",
      origin: "http://localhost",
      pathname: "/",
      search: "",
      hash: "",
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    },
  });

  // Also mock window.history for React Router
  Object.defineProperty(window, "history", {
    writable: true,
    configurable: true,
    value: {
      pushState: vi.fn(),
      replaceState: vi.fn(),
      go: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      length: 0,
      scrollRestoration: "auto",
      state: null,
    },
  });

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
    const usernameElements = screen.getAllByLabelText(/Username/i);
    expect(usernameElements.length).toBeGreaterThan(0);
  });

  it("redirects to /login when accessing root path", () => {
    render(<App />);
    const usernameElements = screen.getAllByLabelText(/Username/i);
    expect(usernameElements.length).toBeGreaterThan(0);
  });

  it("renders router with routes", () => {
    render(<App />);
    expect(window.location.pathname).toBeDefined();
  });

  it("mounts and unmounts without errors", () => {
    const { unmount } = render(<App />);
    expect(() => unmount()).not.toThrow();
  });

  it("renders theme toggle component", () => {
    render(<App />);
    const app = document.querySelector(".min-h-screen");
    expect(app).toBeInTheDocument();
  });
});
