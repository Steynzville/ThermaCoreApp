import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Import the REAL App component
import App from "../App";

// ============================================================
// Mock ALL dependencies - but NOT the App itself
// ============================================================

// Mock all context providers
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

// Mock UI components
vi.mock("../components/ThemeToggle", () => ({
  default: () => <button data-testid="theme-toggle">Toggle Theme</button>,
}));

vi.mock("../components/common/Spinner", () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}));

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

vi.mock("../components/ForgotPassword", () => ({
  default: () => <div data-testid="forgot-password-page">Forgot Password</div>,
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
    { path: "/public", component: () => <div data-testid="public-page">Public Page</div>, isProtected: false },
    { path: "/dashboard", component: () => <div data-testid="dashboard-page">Dashboard</div>, isProtected: true, roles: ["admin", "user"] },
  ],
}));

// Mock audioPlayer
vi.mock("../utils/audioPlayer", () => ({
  default: vi.fn(),
}));

// Mock cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...inputs) => inputs.filter(Boolean).join(" "),
}));

// ============================================================
// Mock AudioContext and window globals
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
    const loginPage = await screen.findByTestId("login-page");
    expect(loginPage).toBeInTheDocument();
  });

  it("renders theme toggle button", async () => {
    render(<App />);
    const themeToggle = await screen.findByTestId("theme-toggle");
    expect(themeToggle).toBeInTheDocument();
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
    const spinner = await screen.findByTestId("spinner");
    expect(spinner).toBeInTheDocument();
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
    const spinner = await screen.findByTestId("spinner");
    expect(spinner).toBeInTheDocument();
    expect(screen.getByText("Signing out...")).toBeInTheDocument();
  });

  it("renders error screen on window error event", async () => {
    render(<App />);
    await screen.findByTestId("login-page");

    fireEvent(window, new ErrorEvent("error", { message: "Something broke" }));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Something broke")).toBeInTheDocument();
    });
  });

  it("renders error screen on unhandled rejection", async () => {
    render(<App />);
    await screen.findByTestId("login-page");

    fireEvent(window, new Event("unhandledrejection"));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("A network or processing error occurred")).toBeInTheDocument();
    });
  });

  it("reloads app when reload button is clicked", async () => {
    render(<App />);
    await screen.findByTestId("login-page");

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

    await screen.findByTestId("theme-toggle");
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

    await screen.findByTestId("login-page");
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
    window.location.pathname = "/public";
    render(<App />);
    const publicPage = await screen.findByTestId("public-page");
    expect(publicPage).toBeInTheDocument();
  });

  it("redirects unknown path to login", async () => {
    window.location.pathname = "/some-unknown-path";
    render(<App />);
    const loginPage = await screen.findByTestId("login-page");
    expect(loginPage).toBeInTheDocument();
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
    const protectedRoute = await screen.findByTestId("protected-route");
    expect(protectedRoute).toBeInTheDocument();
  });

  it("redirects unauthenticated user from protected route to login", async () => {
    window.location.pathname = "/dashboard";
    render(<App />);
    const loginPage = await screen.findByTestId("login-page");
    expect(loginPage).toBeInTheDocument();
    expect(screen.queryByTestId("protected-route")).not.toBeInTheDocument();
  });

  it("renders forgot password route", async () => {
    window.location.pathname = "/forgot-password";
    render(<App />);
    const forgotPassword = await screen.findByTestId("forgot-password-page");
    expect(forgotPassword).toBeInTheDocument();
  });

  it("renders reset password route", async () => {
    window.location.pathname = "/reset-password";
    render(<App />);
    const resetPassword = await screen.findByTestId("reset-password-page");
    expect(resetPassword).toBeInTheDocument();
  });
});
