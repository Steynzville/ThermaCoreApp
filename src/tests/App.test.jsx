import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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
  default: ({ error }) => (
    <div data-testid="login-page">
      <h1>Login</h1>
      <input data-testid="username-input" placeholder="Username" />
      <input data-testid="password-input" placeholder="Password" type="password" />
      {error && <div data-testid="login-error">{error}</div>}
      <button data-testid="login-button">Login</button>
    </div>
  ),
}));

// Mock ForgotPassword
vi.mock("../components/ForgotPassword", () => ({
  default: () => <div data-testid="forgot-password-page">Forgot Password</div>,
}));

// Mock PasswordResetRequest
vi.mock("../components/PasswordResetRequest", () => ({
  default: () => <div data-testid="reset-password-page">Reset Password</div>,
}));

// Mock ProtectedRoute
vi.mock("../components/ProtectedRoute", () => ({
  default: ({ component: Component, componentMap, roles }) => (
    <div data-testid="protected-route" data-has-component-map={!!componentMap} data-roles={JSON.stringify(roles || [])}>
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
    { path: "/public-page", component: () => <div data-testid="public-page">Public Page</div>, isProtected: false },
    { path: "/dashboard", component: () => <div data-testid="dashboard-page">Dashboard</div>, isProtected: true, roles: ["admin", "user"] },
    {
      path: "/role-based",
      isProtected: true,
      roles: ["admin", "user"],
      specialHandling: "unit-role-based",
    },
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

const reloadMock = vi.fn();

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

  // Mock location with proper origin for React Router
  Object.defineProperty(window, "location", {
    writable: true,
    configurable: true,
    value: {
      href: "http://localhost/",
      origin: "http://localhost",
      pathname: "/",
      search: "",
      hash: "",
      reload: reloadMock,
    },
  });

  // Mock history for React Router
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
// Helper to set pathname and trigger navigation
// ============================================================

const setPathname = (path) => {
  window.location.pathname = path;
  window.location.href = `http://localhost${path}`;
};

afterEach(() => {
  setPathname("/");
  reloadMock.mockClear();
});

// ============================================================
// Tests
// ============================================================

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPathname("/");
  });

  describe("basic rendering", () => {
    it("renders without crashing", () => {
      const { container } = render(<App />);
      expect(container).toBeDefined();
    });

    it("renders the login page for unauthenticated users at root path", async () => {
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
  });

  describe("loading and logging-out states", () => {
    it("shows loading state when isLoading is true", async () => {
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
        const spinner = screen.getByTestId("spinner");
        expect(spinner).toBeInTheDocument();
      });
    });

    it("shows signing out message when isLoggingOut is true", async () => {
      const { useAuth } = await import("../context/AuthContext");
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isLoggingOut: true,
        login: vi.fn(),
        logout: vi.fn(),
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("spinner")).toBeInTheDocument();
        expect(screen.getByText("Signing out...")).toBeInTheDocument();
      });
    });
  });

  describe("error boundary", () => {
    it("renders the error screen when a window error event fires", async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-page")).toBeInTheDocument();
      });

      fireEvent(window, new ErrorEvent("error", { message: "Something broke" }));

      await waitFor(() => {
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      });
      expect(screen.getByText("Something broke")).toBeInTheDocument();
    });

    it("renders a generic message on unhandled promise rejection", async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-page")).toBeInTheDocument();
      });

      fireEvent(window, new Event("unhandledrejection"));

      await waitFor(() => {
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      });
      expect(
        screen.getByText("A network or processing error occurred"),
      ).toBeInTheDocument();
    });

    it("reloads the app when the reload button is clicked", async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-page")).toBeInTheDocument();
      });

      fireEvent(window, new ErrorEvent("error", { message: "Boom" }));

      const reloadButton = await screen.findByText("Reload Application");
      fireEvent.click(reloadButton);

      expect(reloadMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("login sound effect", () => {
    it("does not play a sound on initial mount even if already authenticated", async () => {
      const { useAuth } = await import("../context/AuthContext");
      vi.mocked(useAuth).mockReturnValue({
        user: { name: "Test User" },
        isAuthenticated: true,
        isLoading: false,
        isLoggingOut: false,
        login: vi.fn(),
        logout: vi.fn(),
      });

      const playSound = (await import("../utils/audioPlayer")).default;

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
      });

      expect(playSound).not.toHaveBeenCalled();
    });

    it("plays the login sound only on a null -> logged-in transition", async () => {
      const { useAuth } = await import("../context/AuthContext");
      const playSound = (await import("../utils/audioPlayer")).default;

      vi.mocked(useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isLoggingOut: false,
        login: vi.fn(),
        logout: vi.fn(),
      });

      const { rerender } = render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-page")).toBeInTheDocument();
      });
      expect(playSound).not.toHaveBeenCalled();

      vi.mocked(useAuth).mockReturnValue({
        user: { name: "Test User" },
        isAuthenticated: true,
        isLoading: false,
        isLoggingOut: false,
        login: vi.fn(),
        logout: vi.fn(),
      });

      rerender(<App />);

      await waitFor(() => {
        expect(playSound).toHaveBeenCalledWith(
          "login-sound.mp3",
          true,
          0.5,
        );
      });
    });
  });

  describe("routing", () => {
    it("renders the forgot password route", async () => {
      setPathname("/forgot-password");
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("forgot-password-page")).toBeInTheDocument();
      });
    });

    it("renders the reset password route", async () => {
      setPathname("/reset-password");
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("reset-password-page")).toBeInTheDocument();
      });
    });

    it("renders a public route from the route configuration", async () => {
      setPathname("/public-page");
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("public-page")).toBeInTheDocument();
      });
    });

    it("redirects an unknown path to login", async () => {
      setPathname("/some-unknown-path");
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-page")).toBeInTheDocument();
      });
    });

    it("renders a protected route when authenticated", async () => {
      const { useAuth } = await import("../context/AuthContext");
      vi.mocked(useAuth).mockReturnValue({
        user: { name: "Test User" },
        isAuthenticated: true,
        isLoading: false,
        isLoggingOut: false,
        login: vi.fn(),
        logout: vi.fn(),
      });

      setPathname("/dashboard");
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("protected-route")).toBeInTheDocument();
      });
      expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
    });

    it("redirects to login when visiting a protected route unauthenticated", async () => {
      setPathname("/dashboard");
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("login-page")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("protected-route")).not.toBeInTheDocument();
    });

    it("passes a role-based component map for routes with specialHandling", async () => {
      const { useAuth } = await import("../context/AuthContext");
      vi.mocked(useAuth).mockReturnValue({
        user: { name: "Test User" },
        isAuthenticated: true,
        isLoading: false,
        isLoggingOut: false,
        login: vi.fn(),
        logout: vi.fn(),
      });

      setPathname("/role-based");
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("protected-route")).toBeInTheDocument();
      });
      expect(
        screen.getByTestId("protected-route").getAttribute("data-has-component-map"),
      ).toBe("true");
    });
  });
});
