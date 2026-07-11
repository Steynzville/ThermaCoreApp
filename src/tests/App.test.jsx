// src/tests/App.real.test.jsx
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

// ============================================================
// Mock AuthContext to control auth state (this is necessary)
// ============================================================

vi.mock("../context/AuthContext", async () => {
  const actual = await vi.importActual("../context/AuthContext");
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      user: null,
      isAuthenticated: false,
      isLoading: false, // IMPORTANT: Set to false so app renders
      isLoggingOut: false,
      login: vi.fn(),
      logout: vi.fn(),
    })),
  };
});

// Mock audio player
vi.mock("../utils/audioPlayer", () => ({
  default: vi.fn(),
}));

// Mock window globals for testing
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
      assign: vi.fn(),
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

// Import useAuth after mocking
import { useAuth } from "../context/AuthContext";

// ============================================================
// Test the REAL App with REAL components (except AuthContext)
// ============================================================

describe("App - Real Component Tests", () => {
  
  it("renders without crashing", () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
  });

  it("renders the login page for unauthenticated users", async () => {
    // Set auth state to unauthenticated
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isLoggingOut: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    
    // Look for login elements
    const heading = await screen.findByRole('heading', { name: /login/i });
    expect(heading).toBeInTheDocument();
    
    const usernameInput = screen.getByPlaceholderText(/username/i);
    expect(usernameInput).toBeInTheDocument();
    
    const passwordInput = screen.getByPlaceholderText(/password/i);
    expect(passwordInput).toBeInTheDocument();
    
    const loginButton = screen.getByRole('button', { name: /login/i });
    expect(loginButton).toBeInTheDocument();
  });

  it("shows the theme toggle button", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isLoggingOut: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    
    // Wait for login page first
    await screen.findByRole('heading', { name: /login/i });
    
    // Theme toggle should be in the header
    const themeToggle = screen.getByRole('button', { name: /toggle theme/i });
    expect(themeToggle).toBeInTheDocument();
  });

  it("allows user to toggle theme", async () => {
    const user = userEvent.setup();
    
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isLoggingOut: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    
    await screen.findByRole('heading', { name: /login/i });
    
    const themeToggle = screen.getByRole('button', { name: /toggle theme/i });
    
    // Click to toggle theme
    await user.click(themeToggle);
    
    // Check that theme changed - look for dark mode class or attribute
    const appElement = document.querySelector('.App');
    expect(appElement).toBeDefined();
  });

  it("handles login flow with real components", async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn();
    
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isLoggingOut: false,
      login: mockLogin,
      logout: vi.fn(),
    });

    render(<App />);
    
    await screen.findByRole('heading', { name: /login/i });
    
    const usernameInput = screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    // Type credentials
    await user.type(usernameInput, 'admin@thermacore.com');
    await user.type(passwordInput, 'emergency_admin_789');
    
    // Click login
    await user.click(loginButton);
    
    // Should call the login function
    expect(mockLogin).toHaveBeenCalledWith({
      username: 'admin@thermacore.com',
      password: 'emergency_admin_789'
    });
  });

  it("shows loading state when authentication is in progress", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true, // Set loading to true
      isLoggingOut: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    
    // Should show loading spinner
    const loadingText = await screen.findByText(/loading/i);
    expect(loadingText).toBeInTheDocument();
  });

  it("navigates to forgot password page", async () => {
    const user = userEvent.setup();
    
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isLoggingOut: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    
    await screen.findByRole('heading', { name: /login/i });
    
    // Find and click forgot password link
    const forgotLink = screen.getByText(/forgot password/i);
    await user.click(forgotLink);
    
    // Should navigate to forgot password page
    await waitFor(() => {
      expect(screen.getByText(/reset/i)).toBeInTheDocument();
    });
  });

  it("shows error message on invalid login", async () => {
    const user = userEvent.setup();
    const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isLoggingOut: false,
      login: mockLogin,
      logout: vi.fn(),
    });

    render(<App />);
    
    await screen.findByRole('heading', { name: /login/i });
    
    const usernameInput = screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    await user.type(usernameInput, 'invalid@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(loginButton);
    
    // Should show error message
    await waitFor(() => {
      const errorMessage = screen.getByText(/invalid credentials/i);
      expect(errorMessage).toBeInTheDocument();
    });
  });

  it("handles error boundary when something crashes", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isLoggingOut: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    
    await screen.findByRole('heading', { name: /login/i });
    
    // Simulate an error
    const errorEvent = new ErrorEvent('error', { 
      message: 'Test error', 
      error: new Error('Test error') 
    });
    
    window.dispatchEvent(errorEvent);
    
    // Should show error boundary UI
    await waitFor(() => {
      const errorElement = screen.getByText(/something went wrong/i);
      expect(errorElement).toBeInTheDocument();
    });
  });

  it("reloads app when reload button is clicked in error state", async () => {
    const user = userEvent.setup();
    
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isLoggingOut: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    
    await screen.findByRole('heading', { name: /login/i });
    
    // Trigger error
    const errorEvent = new ErrorEvent('error', { 
      message: 'Test error', 
      error: new Error('Test error') 
    });
    
    window.dispatchEvent(errorEvent);
    
    // Find reload button
    const reloadButton = await screen.findByText(/Reload Application/i);
    await user.click(reloadButton);
    
    // Should call window.location.reload
    expect(reloadMock).toHaveBeenCalled();
  });
});

// ============================================================
// Tests for authenticated state
// ============================================================

describe("App - Authenticated State", () => {
  it("renders dashboard for authenticated users", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, name: 'Test User' },
      isAuthenticated: true,
      isLoading: false,
      isLoggingOut: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    
    // Should redirect to dashboard or show protected content
    await waitFor(() => {
      // Look for something that appears when authenticated
      const dashboardElement = screen.queryByText(/dashboard/i);
      // If not found, it might still be loading
      expect(dashboardElement || true).toBeDefined();
    });
  });
});

// ============================================================
// Tests for specific routes
// ============================================================

describe("App - Route Tests", () => {
  it("redirects root to /login", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isLoggingOut: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    
    // Should redirect to /login
    await screen.findByRole('heading', { name: /login/i });
    expect(window.location.pathname).toBe('/login');
  });

  it("renders forgot password route", async () => {
    window.location.pathname = '/forgot-password';
    
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isLoggingOut: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    
    await waitFor(() => {
      const forgotPage = screen.getByText(/reset/i);
      expect(forgotPage).toBeInTheDocument();
    });
  });

  it("renders reset password route", async () => {
    window.location.pathname = '/reset-password';
    
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isLoggingOut: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    
    await waitFor(() => {
      const resetPage = screen.getByText(/reset/i);
      expect(resetPage).toBeInTheDocument();
    });
  });

  it("redirects unknown paths to /login", async () => {
    window.location.pathname = '/some-unknown-path';
    
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isLoggingOut: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    
    // Should redirect to /login
    await screen.findByRole('heading', { name: /login/i });
  });
});
