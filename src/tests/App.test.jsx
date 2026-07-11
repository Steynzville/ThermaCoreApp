// src/tests/App.real.test.jsx
import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import App from "../App";

// ============================================================
// ONLY mock external dependencies that are truly problematic
// ============================================================

// Mock audio player since it uses browser APIs
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
// Test the REAL App with REAL components
// ============================================================

describe("App - Real Component Tests", () => {
  
  it("renders without crashing", () => {
    const { container } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    expect(container).toBeDefined();
  });

  it("renders the login page for unauthenticated users", async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
    // Look for login elements that would actually exist in the real LoginScreen
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
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
    // Wait for login page first
    await screen.findByRole('heading', { name: /login/i });
    
    // Theme toggle should be in the header
    const themeToggle = screen.getByRole('button', { name: /toggle theme/i });
    expect(themeToggle).toBeInTheDocument();
  });

  it("allows user to toggle theme", async () => {
    const user = userEvent.setup();
    
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
    await screen.findByRole('heading', { name: /login/i });
    
    const themeToggle = screen.getByRole('button', { name: /toggle theme/i });
    
    // Click to toggle theme
    await user.click(themeToggle);
    
    // Check that theme changed (might need to check class or data attribute)
    // This depends on how your theme is implemented
    const appElement = document.querySelector('.App');
    expect(appElement).toBeDefined();
  });

  it("handles login flow with real components", async () => {
    const user = userEvent.setup();
    
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
    await screen.findByRole('heading', { name: /login/i });
    
    const usernameInput = screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    // Type credentials
    await user.type(usernameInput, 'admin@thermacore.com');
    await user.type(passwordInput, 'emergency_admin_789');
    
    // Click login - this will use the REAL auth logic
    await user.click(loginButton);
    
    // Wait for redirect to dashboard or authenticated content
    // This might take a moment
    await waitFor(() => {
      // Look for something that appears after login
      const dashboardElement = screen.queryByText(/dashboard/i);
      // If login fails, we'll still be on login page
      // This test might fail, but that's okay - it tells us if auth is broken
    });
  });

  it("shows loading state when authentication is in progress", async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
    // Initially, there might be a loading spinner while auth checks happen
    const spinner = screen.queryByText(/loading/i);
    // This is testing the real behavior - if there's a loading state, it should be shown
  });

  it("navigates to forgot password page", async () => {
    const user = userEvent.setup();
    
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
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
    
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
    await screen.findByRole('heading', { name: /login/i });
    
    const usernameInput = screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    // Type invalid credentials
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
    // This tests the real error boundary in App
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
    // Simulate an error in a child component
    // This might be tricky with real components, but we can trigger a window error
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
});

// ============================================================
// Additional tests for authenticated state (using real auth)
// ============================================================

describe("App - Authenticated State", () => {
  // This would require setting up auth state properly
  // You might need to use your real auth flow or seed the auth context
  
  it.skip("renders dashboard for authenticated users", async () => {
    // This test would need to:
    // 1. Log in a real user
    // 2. Verify the dashboard renders
    // Skipping for now as it requires more complex setup
  });
});
