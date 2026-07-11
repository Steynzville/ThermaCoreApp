import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, beforeAll, afterAll } from "vitest";

import App from "../App";

// ============================================================
// Mock dependencies - NOT the App component itself
// ============================================================

// Mock AuthContext
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isLoggingOut: false,
    login: vi.fn(),
    logout: vi.fn(),
  })),
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
}));

// Mock SettingsContext
vi.mock("../context/SettingsContext", () => ({
  useSettings: vi.fn(() => ({
    settings: {
      soundEnabled: true,
      volume: 0.5,
    },
  })),
  SettingsProvider: ({ children }) => <div data-testid="settings-provider">{children}</div>,
}));

// Mock ThemeContext
vi.mock("../context/ThemeContext", () => ({
  ThemeProvider: ({ children }) => <div data-testid="theme-provider">{children}</div>,
  useTheme: vi.fn(() => ({ theme: "light", toggleTheme: vi.fn() })),
}));

// Mock SidebarContext
vi.mock("../context/SidebarContext", () => ({
  SidebarProvider: ({ children }) => <div data-testid="sidebar-provider">{children}</div>,
  useSidebar: vi.fn(() => ({ isOpen: true, toggleSidebar: vi.fn() })),
}));

// Mock TenantContext
vi.mock("../context/TenantContext", () => ({
  TenantProvider: ({ children }) => <div data-testid="tenant-provider">{children}</div>,
  useTenant: vi.fn(() => ({ tenant: null, setTenant: vi.fn() })),
}));

// Mock UnitContext
vi.mock("../context/UnitContext", () => ({
  UnitProvider: ({ children }) => <div data-testid="unit-provider">{children}</div>,
  useUnits: vi.fn(() => ({ units: [], loading: false })),
}));

// Mock the cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...inputs) => inputs.filter(Boolean).join(" "),
}));

// Mock ThemeToggle
vi.mock("../components/ThemeToggle", () => ({
  default: () => <button data-testid="theme-toggle">Toggle Theme</button>,
}));

// Mock Spinner
vi.mock("../components/common/Spinner", () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}));

// Mock LoginScreen
vi.mock("../components/LoginScreen", () => ({
  default: ({ error, setError }) => (
    <div data-testid="login-page">
      <h1>Login</h1>
      <input data-testid="username-input" placeholder="Username" />
      <input data-testid="password-input" placeholder="Password" type="password" />
      {error && <div data-testid="login-error">{error}</div>}
      <button data-testid="login-button">Login</button>
    </div>
  ),
}));

// Mock ProtectedRoute
vi.mock("../components/ProtectedRoute", () => ({
  default: ({ component: Component, componentMap, roles }) => (
    <div data-testid="protected-route">
      {Component ? <Component /> : <div>Protected Content</div>}
    </div>
  ),
}));

// Mock lazy-loaded components
vi.mock("../components/UnitControl", () => ({
  default: () => <div data-testid="unit-control">Unit Control</div>,
}));

vi.mock("../components/UserUnitDetails", () => ({
  default: () => <div data-testid="user-unit-details">User Unit Details</div>,
}));

vi.mock("../components/UnitDetails", () => ({
  default: () => <div data-testid="unit-details">Unit Details</div>,
}));

// Mock routes
vi.mock("../config/routes", () => ({
  default: [
    { path: "/", component: () => <div>Home</div>, isProtected: false },
    { path: "/dashboard", component: () => <div>Dashboard</div>, isProtected: true, roles: ["admin", "user"] },
  ],
}));

// Mock audioPlayer to prevent actual sound playback
vi.mock("../utils/audioPlayer", () => ({
  default: vi.fn(),
}));

// ============================================================
// Mock AudioContext and window globals
// ============================================================

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

beforeAll(() => {
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

  // Mock location
  Object.defineProperty(window, "location", {
    writable: true,
    configurable: true,
    value: {
      href: "http://localhost/",
      pathname: "/",
      reload: vi.fn(),
    },
  });

  // Mock matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query) => ({
      matches: false,
      media: query,
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
});

// ============================================================
// Tests
// ============================================================

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
  });

  it("renders the login page for unauthenticated users", async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
  });

  it("renders theme toggle button", async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    });
  });

  it("shows loading state when isLoading is true", async () => {
    // Override the mock to show loading
    const { useAuth } = await import("../context/AuthContext");
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isLoggingOut: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
  });
});
