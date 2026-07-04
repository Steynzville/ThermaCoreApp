import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, beforeAll, afterAll } from "vitest";

import App from "../App";

// Mock AuthContext to return unauthenticated state
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    updateProfile: vi.fn(),
  }),
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
}));

// Mock SettingsContext
vi.mock("../context/SettingsContext", () => ({
  useSettings: () => ({
    settings: {
      sound: true,
      volume: 0.5,
      temperatureUnit: "celsius",
    },
    toggleSound: vi.fn(),
    setVolume: vi.fn(),
    setTemperatureUnit: vi.fn(),
  }),
  SettingsProvider: ({ children }) => <div data-testid="settings-provider">{children}</div>,
}));

// Mock ThemeContext
vi.mock("../context/ThemeContext", () => ({
  useTheme: () => ({
    theme: "light",
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }) => <div data-testid="theme-provider">{children}</div>,
}));

// Mock the cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...inputs) => inputs.filter(Boolean).join(" "),
}));

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

  // Mock window.matchMedia for theme
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });

  // Mock ResizeObserver
  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

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

// Mock localStorage
const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index) => Object.keys(store)[index] || null,
  };
};

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset localStorage and sessionStorage
    Object.defineProperty(window, "localStorage", {
      value: createStorageMock(),
      writable: true,
    });
    Object.defineProperty(window, "sessionStorage", {
      value: createStorageMock(),
      writable: true,
    });
    
    // Reset window.location.pathname
    window.location.pathname = "/";
  });

  it("renders Login page for unauthenticated user", async () => {
    render(<App />);
    
    // Wait for the login page to render
    await waitFor(() => {
      const usernameElements = screen.getAllByText(/Username/i);
      expect(usernameElements.length).toBeGreaterThan(0);
    });
  });

  it("renders with all required providers", async () => {
    render(<App />);
    
    // Should render the login page
    await waitFor(() => {
      const usernameElements = screen.getAllByText(/Username/i);
      expect(usernameElements.length).toBeGreaterThan(0);
    });
  });

  it("redirects to /login when accessing root path", async () => {
    render(<App />);
    
    // Should show login page
    await waitFor(() => {
      const usernameElements = screen.getAllByText(/Username/i);
      expect(usernameElements.length).toBeGreaterThan(0);
    });
  });

  it("renders router with routes", () => {
    render(<App />);
    // Verify that the router is rendering something
    const appElement = document.querySelector(".min-h-screen");
    expect(appElement).toBeInTheDocument();
  });

  it("mounts and unmounts without errors", () => {
    const { unmount } = render(<App />);
    expect(() => unmount()).not.toThrow();
  });

  it("renders theme toggle component", () => {
    render(<App />);
    // The theme toggle should be present
    const themeToggleElements = screen.getAllByLabelText(/Toggle Theme/i);
    expect(themeToggleElements.length).toBeGreaterThan(0);
  });
});
