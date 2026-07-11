import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";

import App from "../App";

// ============================================================
// Mock dependencies
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
}));

// Mock SidebarContext
vi.mock("../context/SidebarContext", () => ({
  SidebarProvider: ({ children }) => <div data-testid="sidebar-provider">{children}</div>,
}));

// Mock TenantContext
vi.mock("../context/TenantContext", () => ({
  TenantProvider: ({ children }) => <div data-testid="tenant-provider">{children}</div>,
}));

// Mock UnitContext
vi.mock("../context/UnitContext", () => ({
  UnitProvider: ({ children }) => <div data-testid="unit-provider">{children}</div>,
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
  default: ({ component: Component }) => (
    <div data-testid="protected-route">
      {Component ? <Component /> : <div>Protected Content</div>}
    </div>
  ),
}));

// Mock routes
vi.mock("../config/routes", () => ({
  default: [
    { path: "/public-page", component: () => <div data-testid="public-page">Public Page</div>, isProtected: false },
    { path: "/dashboard", component: () => <div data-testid="dashboard-page">Dashboard</div>, isProtected: true, roles: ["admin", "user"] },
  ],
}));

// Mock audioPlayer
vi.mock("../utils/audioPlayer", () => ({
  default: vi.fn(),
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

// ============================================================
// Mock AudioContext
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
  Object.defineProperty(window, "AudioContext", {
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
      reload: reloadMock,
    },
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
  window.location.pathname = "/";
});

// ============================================================
// Tests
// ============================================================

describe("App", () => {
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

  it("renders error screen on window error event", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });

    fireEvent(window, new ErrorEvent("error", { message: "Something broke" }));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Something broke")).toBeInTheDocument();
    });
  });

  it("renders error screen on unhandled rejection", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });

    fireEvent(window, new Event("unhandledrejection"));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("A network or processing error occurred")).toBeInTheDocument();
    });
  });

  it("reloads app when reload button is clicked", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });

    fireEvent(window, new ErrorEvent("error", { message: "Boom" }));

    const reloadButton = await screen.findByText("Reload Application");
    fireEvent.click(reloadButton);

    expect(reloadMock).toHaveBeenCalled();
  });

  it("does not play login sound on initial mount", async () => {
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

  it("plays login sound on null -> logged-in transition", async () => {
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
      expect(playSound).toHaveBeenCalledWith("login-sound.mp3", true, 0.5);
    });
  });

  it("renders public route from configuration", async () => {
    window.location.pathname = "/public-page";
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("public-page")).toBeInTheDocument();
    });
  });

  it("redirects unknown path to login", async () => {
    window.location.pathname = "/some-unknown-path";
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
  });

  it("renders protected route when authenticated", async () => {
    const { useAuth } = await import("../context/AuthContext");
    vi.mocked(useAuth).mockReturnValue({
      user: { name: "Test User" },
      isAuthenticated: true,
      isLoading: false,
      isLoggingOut: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    window.location.pathname = "/dashboard";
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("protected-route")).toBeInTheDocument();
    });
  });

  it("redirects unauthenticated user from protected route to login", async () => {
    window.location.pathname = "/dashboard";
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("protected-route")).not.toBeInTheDocument();
  });

  it("renders forgot password route", async () => {
    window.location.pathname = "/forgot-password";
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("forgot-password-page")).toBeInTheDocument();
    });
  });

  it("renders reset password route", async () => {
    window.location.pathname = "/reset-password";
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("reset-password-page")).toBeInTheDocument();
    });
  });
});
