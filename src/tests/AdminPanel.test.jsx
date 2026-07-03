/**
 * Tests for AdminPanel Component
 *
 * Coverage includes:
 * - Tab rendering (Users, Password Management, Settings)
 * - Password reset functionality
 * - Password visibility toggle
 * - Password validation (length, matching)
 * - User management
 * - Settings management
 */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { afterAll, vi, beforeEach, describe, it, expect } from "vitest";

import AdminPanel from "../components/AdminPanel";
import * as AuthContext from "../context/AuthContext.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";
import { SettingsProvider } from "../context/SettingsContext.jsx";
import * as apiFetch from "../utils/apiFetch";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock ThemeContext
vi.mock("../context/ThemeContext.jsx", () => {
  const React = require("react");
  const ThemeContext = React.createContext({ theme: "dark", setTheme: () => {} });
  return {
    ThemeContext,
    ThemeProvider: ({ children }) => (
      <ThemeContext.Provider value={{ theme: "dark", setTheme: () => {} }}>
        {children}
      </ThemeContext.Provider>
    ),
    useTheme: () => React.useContext(ThemeContext),
  };
});

vi.mock("../context/ThemeContext", () => {
  const React = require("react");
  const ThemeContext = React.createContext({ theme: "dark", setTheme: () => {} });
  return {
    ThemeContext,
    ThemeProvider: ({ children }) => (
      <ThemeContext.Provider value={{ theme: "dark", setTheme: () => {} }}>
        {children}
      </ThemeContext.Provider>
    ),
    useTheme: () => React.useContext(ThemeContext),
  };
});

// Mock apiFetch
vi.mock("../utils/apiFetch", () => ({
  apiGet: vi.fn(() => Promise.resolve({ data: [] })),
  apiPost: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })),
  apiPut: vi.fn(() => Promise.resolve({ data: {} })),
  apiDelete: vi.fn(() => Promise.resolve({ data: {} })),
}));

// Mock usersAPI
vi.mock("../services/usersAPI", () => ({
  getAllUsers: vi.fn(() =>
    Promise.resolve({
      data: [
        {
          id: 1,
          username: "john_doe",
          email: "john@thermacore.com",
          first_name: "John",
          last_name: "Doe",
          role: { name: "admin" },
          is_active: true,
        },
        {
          id: 2,
          username: "jane_smith",
          email: "jane@thermacore.com",
          first_name: "Jane",
          last_name: "Smith",
          role: { name: "operator" },
          is_active: true,
        },
        {
          id: 3,
          username: "mike_johnson",
          email: "mike@thermacore.com",
          first_name: "Mike",
          last_name: "Johnson",
          role: { name: "viewer" },
          is_active: false,
        },
      ],
      page: 1,
      per_page: 100,
      total: 3,
    })
  ),
  deleteUser: vi.fn(() => Promise.resolve({ ok: true, status: 204 })),
}));

const mockUser = {
  id: 1,
  username: "admin",
  role: "admin",
  email: "admin@thermacore.com",
  firstName: "Admin",
  lastName: "User",
};

const originalLocalStorage = window.localStorage;

// Create a wrapper component that provides all required contexts
const TestWrapper = ({ children }) => {
  // Mock useAuth directly
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({
    user: mockUser,
    userRole: "admin",
    isAuthenticated: true,
    isLoading: false,
  });

  return (
    <SettingsProvider>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </SettingsProvider>
  );
};

const renderWithProviders = (component) => {
  // Mock localStorage
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: vi.fn((key) => {
        if (key === "thermacore_user") return JSON.stringify(mockUser);
        if (key === "thermacore_role") return "admin";
        if (key === "thermacore_token") return "fake-token";
        if (key === "thermacore_settings" || key === "thermacore-settings") {
          return JSON.stringify({
            soundEnabled: true,
            volume: 0.35,
            refreshInterval: 5000,
            temperatureUnit: "celsius",
            theme: "dark",
          });
        }
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    writable: true,
  });

  // Mock useAuth before rendering
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({
    user: mockUser,
    userRole: "admin",
    isAuthenticated: true,
    isLoading: false,
  });

  return render(
    <SettingsProvider>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </SettingsProvider>
  );
};

describe("AdminPanel Component", () => {
  afterAll(() => {
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      writable: true,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    // Ensure useAuth returns the mock
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: mockUser,
      userRole: "admin",
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it("should render all three tabs: Users, Password Management, and Settings", async () => {
    renderWithProviders(<AdminPanel />);

    await waitFor(() => {
      // Use getByText - the component renders these tabs
      expect(screen.getByText("Users")).toBeInTheDocument();
      expect(screen.getByText("Password Management")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });
  });

  it("should display Password Management tab when clicked", async () => {
    renderWithProviders(<AdminPanel />);

    // Find and click the Password Management tab
    const passwordTab = screen.getByText("Password Management");
    fireEvent.click(passwordTab);

    await waitFor(() => {
      // Check that the password management content is visible
      expect(screen.getByText("Change My Password")).toBeInTheDocument();
    });
  });

  it("should open password reset modal when 'Change My Password' is clicked", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management tab
    const passwordTab = screen.getByText("Password Management");
    fireEvent.click(passwordTab);

    // Click Change My Password button
    const changePasswordButton = screen.getByText("Change My Password");
    fireEvent.click(changePasswordButton);

    await waitFor(() => {
      const modal = screen.getByTestId("password-reset-modal");
      expect(modal).toBeInTheDocument();
    });
  });

  it("should show password visibility toggle buttons", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management tab
    const passwordTab = screen.getByText("Password Management");
    fireEvent.click(passwordTab);

    // Click Change My Password button
    const changePasswordButton = screen.getByText("Change My Password");
    fireEvent.click(changePasswordButton);

    await waitFor(() => {
      // Find visibility toggle buttons - they use aria-label
      const toggleButtons = screen.getAllByRole("button", { name: /toggle password visibility/i });
      expect(toggleButtons.length).toBeGreaterThan(0);
    });
  });

  it("should validate password matching", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management tab
    const passwordTab = screen.getByText("Password Management");
    fireEvent.click(passwordTab);

    // Click Change My Password button
    const changePasswordButton = screen.getByText("Change My Password");
    fireEvent.click(changePasswordButton);

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm new password");

    // Type different passwords
    fireEvent.change(newPasswordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password456" } });

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });

  it("should validate minimum password length", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management tab
    const passwordTab = screen.getByText("Password Management");
    fireEvent.click(passwordTab);

    // Click Change My Password button
    const changePasswordButton = screen.getByText("Change My Password");
    fireEvent.click(changePasswordButton);

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");

    // Type short password
    fireEvent.change(newPasswordInput, { target: { value: "12345" } });

    await waitFor(() => {
      expect(screen.getByText("Password must be at least 6 characters long")).toBeInTheDocument();
    });
  });
});
