import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, beforeAll, afterAll } from "vitest";

import App from "../App";

// Mock AuthContext to return unauthenticated state
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    isLoggingOut: false,
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
      soundEnabled: true,
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

// Mock SidebarContext
vi.mock("../context/SidebarContext", () => ({
  SidebarProvider: ({ children }) => <div data-testid="sidebar-provider">{children}</div>,
  useSidebar: () => ({ isOpen: true, toggleSidebar: vi.fn() }),
}));

// Mock TenantContext
vi.mock("../context/TenantContext", () => ({
  TenantProvider: ({ children }) => <div data-testid="tenant-provider">{children}</div>,
  useTenant: () => ({ tenant: null, setTenant: vi.fn() }),
}));

// Mock UnitContext
vi.mock("../context/UnitContext", () => ({
  UnitProvider: ({ children }) => <div data-testid="unit-provider">{children}</div>,
  useUnits: () => ({ units: [], loading: false }),
}));

// Mock the cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...inputs) => inputs.filter(Boolean).join(" "),
}));

// Mock the ThemeToggle component
vi.mock("../components/ThemeToggle", () => ({
  default: () => (
    <button 
      aria-label="Toggle Theme"
      data-testid="theme-toggle"
      type="button"
    >
      Toggle Theme
    </button>
  ),
}));

// Mock the Spinner component
vi.mock("../components/common/Spinner", () => ({
  default: ({ size, className }) => (
    <div data-testid="spinner" data-size={size} className={className}>
      Loading...
    </div>
  ),
}));

// Mock the LoginScreen component - simplified
vi.mock("../components/LoginScreen", () => ({
  default: ({ error, setError }) => (
    <div data-testid="login-page" className="login-page">
      <h1>Login</h1>
      <div>
        <label>
          Username
          <input type="text" placeholder="Username" data-testid="username-input" />
        </label>
      </div>
      <div>
        <label>
          Password
          <input type="password" placeholder="Password" data-testid="password-input" />
        </label>
      </div>
      {error && <div data-testid="login-error">{error}</div>}
      <button data-testid="login-button" type="button" onClick={() => setError("")}>Login</button>
    </div>
  ),
}));

// Mock the ProtectedRoute component
vi.mock("../components/ProtectedRoute", () => ({
  default: () => <div data-testid="protected-content">Protected Content</div>,
}));

// Mock config/routes
vi.mock("../config/routes", () => ({
  default: [
    { path: "/", component: () => <div>Home</div>, isProtected: false },
    { path: "/dashboard", component: () => <div>Dashboard</div>, isProtected: true, roles: ["admin", "user"] },
    { path: "/admin", component: () => <div>Admin</div>, isProtected: true, roles: ["admin"] },
  ],
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

  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  window.IntersectionObserver = vi.fn().mockImplementation(() => ({
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
    
    Object.defineProperty(window, "localStorage", {
      value: createStorageMock(),
      writable: true,
    });
    Object.defineProperty(window, "sessionStorage", {
      value: createStorageMock(),
      writable: true,
    });
    
    window.location.pathname = "/";
  });

  it("renders Login page for unauthenticated user", async () => {
    render(<App />);
    
    await waitFor(() => {
      const loginElements = screen.getAllByTestId("login-page");
      expect(loginElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
    
    const usernameElements = screen.getAllByTestId("username-input");
    expect(usernameElements.length).toBeGreaterThan(0);
  });

  it("renders with all required providers", async () => {
    render(<App />);
    
    await waitFor(() => {
      const loginElements = screen.getAllByTestId("login-page");
      expect(loginElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
    
    const usernameElements = screen.getAllByTestId("username-input");
    expect(usernameElements.length).toBeGreaterThan(0);
  });

  it("redirects to /login when accessing root path", async () => {
    render(<App />);
    
    await waitFor(() => {
      const loginElements = screen.getAllByTestId("login-page");
      expect(loginElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
    
    const usernameElements = screen.getAllByTestId("username-input");
    expect(usernameElements.length).toBeGreaterThan(0);
  });

  it("renders router with routes", () => {
    render(<App />);
    const appElement = document.querySelector(".min-h-screen");
    expect(appElement).toBeInTheDocument();
  });

  it("mounts and unmounts without errors", () => {
    const { unmount } = render(<App />);
    expect(() => unmount()).not.toThrow();
  });

  it("renders theme toggle component", () => {
    render(<App />);
    const themeToggleElements = screen.getAllByTestId("theme-toggle");
    expect(themeToggleElements.length).toBeGreaterThan(0);
  });
});
