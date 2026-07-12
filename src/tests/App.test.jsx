// src/tests/App.test.jsx
import { cleanup, render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import React from "react";

// ============================================================
// CRITICAL FIX: Ensure real timers for React's scheduler
// React.startTransition (used by react-router-dom v7 Navigate)
// needs real timers to flush navigation updates
// ============================================================
vi.useRealTimers();

// Helper to flush React.startTransition navigation updates
const flushNavigation = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
};

// ============================================================
// Use vi.hoisted() for the auth mock object - NO React.createContext
// ============================================================

const { authMock } = vi.hoisted(() => {
  const mock = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isLoggingOut: false,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
  };
  return { authMock: mock };
});

// ============================================================
// Mock ALL contexts BEFORE importing App
// ============================================================

vi.mock("../context/AuthContext", () => ({
  default: authMock,
  useAuth: () => authMock,
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
}));

// Mock all other contexts
vi.mock("../context/SettingsContext", () => ({
  useSettings: vi.fn(() => ({
    settings: { soundEnabled: true, volume: 0.5 },
  })),
  SettingsProvider: ({ children }) => <div data-testid="settings-provider">{children}</div>,
}));

vi.mock("../context/ThemeContext", () => ({
  ThemeProvider: ({ children }) => <div data-testid="theme-provider">{children}</div>,
  useTheme: vi.fn(() => ({ theme: "light", toggleTheme: vi.fn() })),
}));

vi.mock("../context/SidebarContext", () => ({
  SidebarProvider: ({ children }) => <div data-testid="sidebar-provider">{children}</div>,
  useSidebar: vi.fn(() => ({ isOpen: true, toggleSidebar: vi.fn() })),
}));

vi.mock("../context/TenantContext", () => ({
  TenantProvider: ({ children }) => <div data-testid="tenant-provider">{children}</div>,
  useTenant: vi.fn(() => ({ tenant: null, setTenant: vi.fn() })),
}));

vi.mock("../context/UnitContext", () => ({
  UnitProvider: ({ children }) => <div data-testid="unit-provider">{children}</div>,
  useUnits: vi.fn(() => ({ units: [], loading: false })),
}));

// Mock all child components
vi.mock("../components/LoginScreen", () => ({
  default: ({ error, setError }) => {
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        await authMock.login({ username, password });
        setError?.(null);
      } catch (err) {
        setError?.(err?.message || "Login failed");
      }
    };

    return (
      <div data-testid="login-page">
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          <input
            data-testid="username-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            data-testid="password-input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div data-testid="login-error">{error}</div>}
          <button type="submit" data-testid="login-button">
            Login
          </button>
        </form>
        <a href="/forgot-password" data-testid="forgot-password-link">
          Forgot password?
        </a>
      </div>
    );
  },
}));

vi.mock("../components/ThemeToggle", () => ({
  default: () => {
    const [isDark, setIsDark] = React.useState(false);
    return (
      <button
        type="button"
        aria-label="Toggle Theme"
        data-testid="theme-toggle"
        aria-pressed={isDark}
        onClick={() => setIsDark((prev) => !prev)}
      >
        {isDark ? "Dark" : "Light"}
      </button>
    );
  },
}));

vi.mock("../components/ui/spinner", () => ({
  Spinner: ({ className, size, ...props }) => (
    <div data-testid="spinner" aria-label="Loading" {...props}>
      Loading...
    </div>
  ),
}));

vi.mock("../components/common/Spinner", () => ({
  default: ({ className, size, ...props }) => (
    <div data-testid="spinner" aria-label="Loading" {...props}>
      Loading...
    </div>
  ),
}));

vi.mock("../components/ForgotPassword", () => ({
  default: () => <div data-testid="forgot-password-page">Password Reset Request</div>,
}));

vi.mock("../components/PasswordResetRequest", () => ({
  default: () => <div data-testid="reset-password-page">Reset Password</div>,
}));

vi.mock("../components/ProtectedRoute", () => ({
  default: ({ component: Component }) => (
    <div data-testid="protected-route">
      {Component ? <Component /> : <div>Protected Content</div>}
    </div>
  ),
}));

vi.mock("../components/UnitControl", () => ({
  default: () => <div data-testid="unit-control">Unit Control</div>,
}));

vi.mock("../components/UserUnitDetails", () => ({
  default: () => <div data-testid="user-unit-details">User Unit Details</div>,
}));

vi.mock("../components/UnitDetails", () => ({
  default: () => <div data-testid="unit-details">Unit Details</div>,
}));

vi.mock("../config/routes", () => ({
  default: [
    {
      path: "/dashboard",
      component: () => <div data-testid="dashboard-page">Dashboard</div>,
      isProtected: true,
      roles: ["admin", "user"],
    },
  ],
}));

vi.mock("../utils/audioPlayer", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...inputs) => inputs.filter(Boolean).join(" "),
}));

// ============================================================
// NOW import App
// ============================================================
import App from "../App";

// ============================================================
// Mock window globals
// ============================================================

class MockAudioContext {
  constructor() {
    this.state = "suspended";
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
      gain: { value: 0.5, setValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }
}

const reloadMock = vi.fn();

beforeAll(() => {
  // Ensure real timers are used for all tests in this file
  vi.useRealTimers();
  
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

  // Keep the real Location object and only stub reload()
  Object.defineProperty(window.location, "reload", {
    configurable: true,
    writable: true,
    value: reloadMock,
  });

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

beforeEach(() => {
  vi.clearAllMocks();

  // Ensure real timers are used for each test
  vi.useRealTimers();

  // Use the real History API to reset the URL between tests
  window.history.pushState({}, "", "/");

  // Reset auth mock to default state
  Object.assign(authMock, {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isLoggingOut: false,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  reloadMock.mockClear();
  // Restore real timers after each test
  vi.useRealTimers();
});

// ============================================================
// Helper to set auth state
// ============================================================

const setAuth = (overrides = {}) => {
  Object.assign(authMock, {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isLoggingOut: false,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    ...overrides,
  });
};

// Helper to navigate to a given path using the real History API
const navigateTo = (path) => {
  window.history.pushState({}, "", path);
};

// ============================================================
// Tests
// ============================================================

describe("App", () => {
  it("renders without crashing", () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
  });

  it("renders the login page for unauthenticated users", async () => {
    setAuth();
    render(<App />);
    await flushNavigation();

    const heading = await screen.findByRole("heading", { name: /login/i });
    expect(heading).toBeInTheDocument();
    expect(screen.getByTestId("username-input")).toBeInTheDocument();
    expect(screen.getByTestId("password-input")).toBeInTheDocument();
    expect(screen.getByTestId("login-button")).toBeInTheDocument();
  });

  it("shows the theme toggle button", async () => {
    setAuth();
    render(<App />);
    await flushNavigation();

    await screen.findByRole("heading", { name: /login/i });
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("allows the user to toggle theme", async () => {
    const user = userEvent.setup();
    setAuth();
    render(<App />);
    await flushNavigation();

    await screen.findByRole("heading", { name: /login/i });
    const themeToggle = screen.getByTestId("theme-toggle");

    expect(themeToggle).toHaveAttribute("aria-pressed", "false");
    await user.click(themeToggle);
    expect(themeToggle).toHaveAttribute("aria-pressed", "true");
  });

  it("shows loading state when authentication is in progress", async () => {
    setAuth({ isLoading: true });
    render(<App />);
    await flushNavigation();

    const loadingElements = await screen.findAllByText(/loading/i);
    expect(loadingElements.length).toBeGreaterThan(0);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("shows signing out message when isLoggingOut is true", async () => {
    setAuth({ isLoggingOut: true });
    render(<App />);
    await flushNavigation();

    await waitFor(() => {
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
    expect(screen.getByText(/signing out/i)).toBeInTheDocument();
  });

  it("calls login with the entered credentials on submit", async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn().mockResolvedValue(undefined);
    setAuth({ login: mockLogin });

    render(<App />);
    await flushNavigation();
    await screen.findByRole("heading", { name: /login/i });

    await user.type(screen.getByTestId("username-input"), "admin@thermacore.com");
    await user.type(screen.getByTestId("password-input"), "emergency_admin_789");
    await user.click(screen.getByTestId("login-button"));

    expect(mockLogin).toHaveBeenCalledWith({
      username: "admin@thermacore.com",
      password: "emergency_admin_789",
    });
  });

  it("shows an error message when login rejects", async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn().mockRejectedValue(new Error("Invalid credentials"));
    setAuth({ login: mockLogin });

    render(<App />);
    await flushNavigation();
    await screen.findByRole("heading", { name: /login/i });

    await user.type(screen.getByTestId("username-input"), "invalid@example.com");
    await user.type(screen.getByTestId("password-input"), "wrongpassword");
    await user.click(screen.getByTestId("login-button"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error")).toHaveTextContent("Invalid credentials");
    });
  });

  it("navigates to the forgot password page via the link", async () => {
    const user = userEvent.setup();
    setAuth();
    render(<App />);
    await flushNavigation();
    await screen.findByRole("heading", { name: /login/i });

    await user.click(screen.getByTestId("forgot-password-link"));
    await flushNavigation();

    await waitFor(() => {
      expect(screen.getByTestId("forgot-password-page")).toBeInTheDocument();
    });
  });

  it("renders the forgot password route directly", async () => {
    navigateTo("/forgot-password");
    setAuth();
    render(<App />);
    await flushNavigation();

    await waitFor(() => {
      expect(screen.getByTestId("forgot-password-page")).toBeInTheDocument();
    });
  });

  it("renders the reset password route directly", async () => {
    navigateTo("/reset-password");
    setAuth();
    render(<App />);
    await flushNavigation();

    await waitFor(() => {
      expect(screen.getByTestId("reset-password-page")).toBeInTheDocument();
    });
  });

  it("redirects root path to the login page", async () => {
    setAuth();
    render(<App />);
    await flushNavigation();
    await screen.findByRole("heading", { name: /login/i });
  });

  it("redirects unknown paths to the login page", async () => {
    navigateTo("/some-unknown-path");
    setAuth();
    render(<App />);
    await flushNavigation();
    await screen.findByRole("heading", { name: /login/i });
  });

  it("renders a protected route when authenticated", async () => {
    navigateTo("/dashboard");
    setAuth({ user: { id: 1, name: "Test User" }, isAuthenticated: true });
    render(<App />);
    await flushNavigation();

    await waitFor(() => {
      expect(screen.getByTestId("protected-route")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
    });
  });

  it("redirects to login when visiting a protected route unauthenticated", async () => {
    navigateTo("/dashboard");
    setAuth();
    render(<App />);
    await flushNavigation();

    await screen.findByRole("heading", { name: /login/i });
    expect(screen.queryByTestId("protected-route")).not.toBeInTheDocument();
  });

  it("shows the error boundary UI when a window error event fires", async () => {
    setAuth();
    render(<App />);
    await flushNavigation();
    await screen.findByRole("heading", { name: /login/i });

    const errorEvent = new ErrorEvent("error", { message: "Test error" });
    window.dispatchEvent(errorEvent);

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it("reloads the app when the reload button is clicked in the error state", async () => {
    const user = userEvent.setup();
    setAuth();
    render(<App />);
    await flushNavigation();
    await screen.findByRole("heading", { name: /login/i });

    const errorEvent = new ErrorEvent("error", { message: "Test error" });
    window.dispatchEvent(errorEvent);

    const reloadButton = await screen.findByText(/reload application/i);
    await user.click(reloadButton);

    expect(reloadMock).toHaveBeenCalled();
  });
});
