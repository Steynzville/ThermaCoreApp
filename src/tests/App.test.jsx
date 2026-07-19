import { cleanup, render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import React from "react";
import { MemoryRouter, Link } from "react-router-dom";

// ============================================================
// CRITICAL FIX: Ensure real timers for React's scheduler
// ============================================================
vi.useRealTimers();

// Helper to flush React.startTransition navigation updates
const flushNavigation = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
};

// ============================================================
// Mock BrowserRouter with configurable initial route
// ============================================================

const { getInitialEntries, setInitialRoute } = vi.hoisted(() => {
  let entries = ["/"];
  return {
    getInitialEntries: () => entries,
    setInitialRoute: (path) => { entries = [path]; },
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    BrowserRouter: ({ children }) => (
      <MemoryRouter initialEntries={getInitialEntries()}>
        {children}
      </MemoryRouter>
    ),
  };
});

// ============================================================
// Use vi.hoisted() for auth - login/logout are live functions
// ============================================================

const { authState } = vi.hoisted(() => {
  const state = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isLoggingOut: false,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
  };
  return { authState: state };
});

// ============================================================
// Mock ALL contexts BEFORE importing App
// ============================================================

const { mockUseSettings } = vi.hoisted(() => ({
  mockUseSettings: vi.fn(() => ({
    settings: { soundEnabled: true, volume: 0.5 },
  })),
}));

vi.mock("../context/AuthContext", () => ({
  default: authState,
  useAuth: () => authState,
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
}));

vi.mock("../context/SettingsContext", () => ({
  useSettings: mockUseSettings,
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
  useTenant: vi.fn(() => ({ currentTenant: null, availableTenants: [], switchTenant: vi.fn() })),
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
        await authState.login({ username, password });
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
        <Link to="/forgot-password" data-testid="forgot-password-link">
          Forgot password?
        </Link>
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
  default: ({ component: Component, componentMap, roles }) => {
    // Use the role from authState to determine which component to render
    const userRole = authState.user?.role || "user";
    
    if (componentMap) {
      const hasAccess = !roles || roles.length === 0 || roles.includes(userRole);
      
      if (!hasAccess) {
        return <div data-testid="protected-route">Access Denied</div>;
      }
      
      const RoleComponent = userRole === "admin" ? componentMap.admin : componentMap.user;
      return (
        <div data-testid="protected-route">
          {RoleComponent ? <RoleComponent /> : <div>Protected Content</div>}
        </div>
      );
    }
    
    const hasAccess = !roles || roles.length === 0 || roles.includes(userRole);
    
    if (!hasAccess) {
      return <div data-testid="protected-route">Access Denied</div>;
    }
    
    return (
      <div data-testid="protected-route">
        {Component ? <Component /> : <div>Protected Content</div>}
      </div>
    );
  },
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
    {
      path: "/public-info",
      component: () => <div data-testid="public-info-page">Public Info</div>,
      isProtected: false,
    },
    {
      path: "/admin",
      component: () => <div data-testid="admin-page">Admin</div>,
      isProtected: true,
      roles: ["admin"],
    },
    {
      path: "/units",
      component: () => <div data-testid="unit-fallback">Unit Fallback</div>,
      isProtected: true,
      roles: ["admin", "user"],
      specialHandling: "unit-role-based",
    },
    {
      path: "/unit-details-role-based",
      component: () => <div data-testid="unit-details-fallback">Unit Details Fallback</div>,
      isProtected: true,
      roles: ["admin", "user"],
      specialHandling: "unit-details-role-based",
    },
    {
      path: "/open-route",
      component: () => <div data-testid="open-route-page">Open Route</div>,
      isProtected: true,
      roles: [], // Open to all authenticated users
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
  vi.useRealTimers();

  mockUseSettings.mockReturnValue({
    settings: { soundEnabled: true, volume: 0.5 },
  });

  setInitialRoute("/");

  authState.user = null;
  authState.isAuthenticated = false;
  authState.isLoading = false;
  authState.isLoggingOut = false;
  authState.login = vi.fn().mockResolvedValue(undefined);
  authState.logout = vi.fn();
});

afterEach(() => {
  cleanup();
  reloadMock.mockClear();
  vi.useRealTimers();
});

// ============================================================
// Helper to set auth state
// ============================================================

const setAuth = (overrides = {}) => {
  Object.assign(authState, overrides);
};

// ============================================================
// Helper to capture the real listener registered by AppContent's
// error-boundary effect, bypassing jsdom's dispatchEvent machinery
// entirely. Returns the captured handler for the given event type.
// ============================================================

const captureWindowListener = (addEventListenerSpy, eventType) => {
  const call = addEventListenerSpy.mock.calls.find(([type]) => type === eventType);
  return call ? call[1] : undefined;
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

    const usernameInput = screen.getByTestId("username-input");
    const passwordInput = screen.getByTestId("password-input");

    await user.type(usernameInput, "admin@thermacore.com");
    await user.type(passwordInput, "emergency_admin_789");

    const form = screen.getByTestId("login-button").closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: "admin@thermacore.com",
        password: "emergency_admin_789",
      });
    }, { timeout: 3000 });
  });

  it("shows an error message when login rejects", async () => {
    const user = userEvent.setup();
    const errorMessage = "Invalid credentials";
    const mockLogin = vi.fn().mockRejectedValue(new Error(errorMessage));
    setAuth({ login: mockLogin });

    render(<App />);
    await flushNavigation();
    await screen.findByRole("heading", { name: /login/i });

    const usernameInput = screen.getByTestId("username-input");
    const passwordInput = screen.getByTestId("password-input");

    await user.type(usernameInput, "invalid@example.com");
    await user.type(passwordInput, "wrongpassword");

    const form = screen.getByTestId("login-button").closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId("login-error")).toBeInTheDocument();
    }, { timeout: 3000 });

    const errorElement = screen.getByTestId("login-error");
    expect(errorElement).toHaveTextContent(errorMessage);
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
    }, { timeout: 3000 });
  });

  it("renders the forgot password route directly", async () => {
    setAuth();
    setInitialRoute("/forgot-password");
    render(<App />);
    await flushNavigation();

    await waitFor(() => {
      expect(screen.getByTestId("forgot-password-page")).toBeInTheDocument();
    });
  });

  it("renders the reset password route directly", async () => {
    setAuth();
    setInitialRoute("/reset-password");
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
    setAuth();
    setInitialRoute("/some-unknown-path");
    render(<App />);
    await flushNavigation();
    await screen.findByRole("heading", { name: /login/i });
  });

  it("renders a protected route when authenticated", async () => {
    setAuth({ user: { id: 1, name: "Test User", role: "user" }, isAuthenticated: true });
    setInitialRoute("/dashboard");
    render(<App />);
    await flushNavigation();

    await waitFor(() => {
      expect(screen.getByTestId("protected-route")).toBeInTheDocument();
      expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("renders admin route when authenticated as admin", async () => {
    setAuth({ user: { id: 1, name: "Admin User", role: "admin" }, isAuthenticated: true });
    setInitialRoute("/admin");
    render(<App />);
    await flushNavigation();

    await waitFor(() => {
      expect(screen.getByTestId("protected-route")).toBeInTheDocument();
      expect(screen.getByTestId("admin-page")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("renders an open route (roles: []) for any authenticated user", async () => {
    setAuth({ user: { id: 1, name: "Regular User", role: "user" }, isAuthenticated: true });
    setInitialRoute("/open-route");
    render(<App />);
    await flushNavigation();

    await waitFor(() => {
      expect(screen.getByTestId("protected-route")).toBeInTheDocument();
      expect(screen.getByTestId("open-route-page")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("redirects to login when visiting a protected route unauthenticated", async () => {
    setAuth();
    setInitialRoute("/dashboard");
    render(<App />);
    await flushNavigation();

    await screen.findByRole("heading", { name: /login/i });
    expect(screen.queryByTestId("protected-route")).not.toBeInTheDocument();
  });

  // ============ PUBLIC ROUTE TESTS ============

  it("renders a public route from configuration", async () => {
    setAuth();
    setInitialRoute("/public-info");
    render(<App />);
    await flushNavigation();

    await waitFor(() => {
      expect(screen.getByTestId("public-info-page")).toBeInTheDocument();
    });
  });

  // ============ SPECIAL HANDLING / ROLE-BASED TESTS ============

  it("renders the admin role-based component for a special-handling route when user is admin", async () => {
    setAuth({ user: { id: 1, name: "Admin User", role: "admin" }, isAuthenticated: true });
    setInitialRoute("/units");
    render(<App />);
    await flushNavigation();

    await waitFor(() => {
      expect(screen.getByTestId("protected-route")).toBeInTheDocument();
      expect(screen.getByTestId("unit-control")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("renders the user role-based component for a special-handling route when user is regular user", async () => {
    setAuth({ user: { id: 1, name: "Regular User", role: "user" }, isAuthenticated: true });
    setInitialRoute("/units");
    render(<App />);
    await flushNavigation();

    await waitFor(() => {
      expect(screen.getByTestId("protected-route")).toBeInTheDocument();
      expect(screen.getByTestId("user-unit-details")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("renders the role-based component map for unit-details special-handling", async () => {
    setAuth({ user: { id: 1, name: "Admin User", role: "admin" }, isAuthenticated: true });
    setInitialRoute("/unit-details-role-based");
    render(<App />);
    await flushNavigation();

    await waitFor(() => {
      expect(screen.getByTestId("protected-route")).toBeInTheDocument();
      expect(screen.getByTestId("unit-details")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("renders user unit details for regular user on unit-details route", async () => {
    setAuth({ user: { id: 1, name: "Regular User", role: "user" }, isAuthenticated: true });
    setInitialRoute("/unit-details-role-based");
    render(<App />);
    await flushNavigation();

    await waitFor(() => {
      expect(screen.getByTestId("protected-route")).toBeInTheDocument();
      expect(screen.getByTestId("user-unit-details")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // ProtectedRoute enforces role check directly now that AdminRoute is removed
  it("shows access denied when user role doesn't match route roles", async () => {
    setAuth({ user: { id: 1, name: "Regular User", role: "user" }, isAuthenticated: true });
    setInitialRoute("/admin");
    render(<App />);
    await flushNavigation();

    await waitFor(() => {
      expect(screen.getByTestId("protected-route")).toBeInTheDocument();
      expect(screen.getByText("Access Denied")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // ============ LOGIN SOUND TESTS ============

  it("plays the login sound on a false-to-true auth transition", async () => {
    const playSound = (await import("../utils/audioPlayer")).default;
    setAuth({ isAuthenticated: false });
    const { rerender } = render(<App />);
    await flushNavigation();
    await screen.findByRole("heading", { name: /login/i });

    setAuth({ isAuthenticated: true, user: { id: 1, name: "Test User" } });
    rerender(<App />);
    await flushNavigation();

    await waitFor(() => {
      expect(playSound).toHaveBeenCalledWith(
        "login-sound.mp3",
        true,
        0.5
      );
    });
  });

  it("does not play sound when soundEnabled is false", async () => {
    mockUseSettings.mockReturnValue({ settings: { soundEnabled: false, volume: 0.5 } });
    const playSound = (await import("../utils/audioPlayer")).default;

    setAuth({ isAuthenticated: false });
    const { rerender } = render(<App />);
    await flushNavigation();
    await screen.findByRole("heading", { name: /login/i });

    setAuth({ isAuthenticated: true, user: { id: 1, name: "Test User" } });
    rerender(<App />);
    await flushNavigation();

    expect(playSound).not.toHaveBeenCalled();
  });

  it("swallows audio errors without surfacing them as app errors", async () => {
    const audioModule = await import("../utils/audioPlayer");
    audioModule.default.mockImplementationOnce(() => {
      throw new Error("audio failed");
    });

    setAuth({ isAuthenticated: false });
    const { rerender } = render(<App />);
    await flushNavigation();
    await screen.findByRole("heading", { name: /login/i });

    setAuth({ isAuthenticated: true, user: { id: 1, name: "Test User" } });
    rerender(<App />);
    await flushNavigation();

    // Confirm the thrown error was swallowed, not surfaced as an app error
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/network or processing error/i)).not.toBeInTheDocument();
  });

  // ============ ERROR BOUNDARY TESTS ============

  it("shows the error boundary UI when a window error event fires", async () => {
    setAuth();
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    render(<App />);
    await flushNavigation();
    await screen.findByRole("heading", { name: /login/i });

    const handleError = captureWindowListener(addEventListenerSpy, "error");
    expect(handleError).toBeDefined();

    await act(async () => {
      handleError({ message: "Test error" });
    });

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    addEventListenerSpy.mockRestore();
  });

  it("reloads the app when the reload button is clicked in the error state", async () => {
    const user = userEvent.setup();
    setAuth();
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    render(<App />);
    await flushNavigation();
    await screen.findByRole("heading", { name: /login/i });

    const handleError = captureWindowListener(addEventListenerSpy, "error");
    expect(handleError).toBeDefined();

    await act(async () => {
      handleError({ message: "Test error" });
    });

    const reloadButton = await screen.findByRole("button", {
      name: /reload application/i,
    });
    await user.click(reloadButton);

    expect(reloadMock).toHaveBeenCalled();

    addEventListenerSpy.mockRestore();
  });

  it("shows the error boundary UI when an unhandled promise rejection fires", async () => {
    setAuth();
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    render(<App />);
    await flushNavigation();
    await screen.findByRole("heading", { name: /login/i });

    const handleUnhandledRejection = captureWindowListener(
      addEventListenerSpy,
      "unhandledrejection"
    );
    expect(handleUnhandledRejection).toBeDefined();

    await act(async () => {
      handleUnhandledRejection({});
    });

    await waitFor(() => {
      expect(
        screen.getByText(/network or processing error occurred/i)
      ).toBeInTheDocument();
    });

    addEventListenerSpy.mockRestore();
  });
});
