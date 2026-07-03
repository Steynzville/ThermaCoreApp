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

const renderWithProviders = (component) => {
  // Mock AuthContext hook directly
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({
    user: mockUser,
    userRole: "admin",
    isAuthenticated: true,
    isLoading: false,
  });

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

  return render(
    <SettingsProvider>
      <AuthProvider
        value={{
          user: mockUser,
          userRole: "admin",
          isAuthenticated: true,
          isLoading: false,
        }}
      >
        <BrowserRouter>{component}</BrowserRouter>
      </AuthProvider>
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
  });

  it("should render all three tabs: Users, Password Management, and Settings", async () => {
    renderWithProviders(<AdminPanel />);

    await waitFor(() => {
      // Use getAllByText since "Users" appears multiple times
      const usersElements = screen.getAllByText("Users");
      expect(usersElements.length).toBeGreaterThan(0);

      // Use getAllByText since "Password Management" appears multiple times
      const passwordManagementElements = screen.getAllByText("Password Management");
      expect(passwordManagementElements.length).toBeGreaterThan(0);

      // Use getAllByText since "Settings" appears multiple times
      const settingsElements = screen.getAllByText("Settings");
      expect(settingsElements.length).toBeGreaterThan(0);
    });
  });

  it("should display Password Management tab when clicked", async () => {
    renderWithProviders(<AdminPanel />);

    // Find all Password Management elements and click the first one (the tab)
    const passwordManagementElements = await screen.findAllByText("Password Management");
    const passwordTab = passwordManagementElements[0];
    fireEvent.click(passwordTab);

    await waitFor(() => {
      // Check that the password management content is visible
      const changePasswordButtons = screen.getAllByText("Change My Password");
      expect(changePasswordButtons.length).toBeGreaterThan(0);
    });
  });

  it("should open password reset modal when 'Change My Password' is clicked", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management tab
    const passwordManagementElements = await screen.findAllByText("Password Management");
    const passwordTab = passwordManagementElements[0];
    fireEvent.click(passwordTab);

    // Click Change My Password button
    const changePasswordButtons = screen.getAllByText("Change My Password");
    const changePasswordButton = changePasswordButtons[0];
    fireEvent.click(changePasswordButton);

    await waitFor(() => {
      const modal = screen.getByTestId("password-reset-modal");
      expect(modal).toBeInTheDocument();
    });
  });

  it("should show password visibility toggle buttons", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management tab
    const passwordManagementElements = await screen.findAllByText("Password Management");
    const passwordTab = passwordManagementElements[0];
    fireEvent.click(passwordTab);

    // Click Change My Password button
    const changePasswordButtons = screen.getAllByText("Change My Password");
    const changePasswordButton = changePasswordButtons[0];
    fireEvent.click(changePasswordButton);

    await waitFor(() => {
      // Find visibility toggle buttons
      const toggleButtons = screen.getAllByRole("button", { name: /toggle password visibility/i });
      expect(toggleButtons.length).toBeGreaterThan(0);
    });
  });

  it("should validate password matching", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management tab
    const passwordManagementElements = await screen.findAllByText("Password Management");
    const passwordTab = passwordManagementElements[0];
    fireEvent.click(passwordTab);

    // Click Change My Password button
    const changePasswordButtons = screen.getAllByText("Change My Password");
    const changePasswordButton = changePasswordButtons[0];
    fireEvent.click(changePasswordButton);

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm new password");

    // Type different passwords
    fireEvent.change(newPasswordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password456" } });

    await waitFor(() => {
      const mismatchElements = screen.getAllByText("Passwords do not match");
      expect(mismatchElements.length).toBeGreaterThan(0);
    });
  });

  it("should validate minimum password length", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management tab
    const passwordManagementElements = await screen.findAllByText("Password Management");
    const passwordTab = passwordManagementElements[0];
    fireEvent.click(passwordTab);

    // Click Change My Password button
    const changePasswordButtons = screen.getAllByText("Change My Password");
    const changePasswordButton = changePasswordButtons[0];
    fireEvent.click(changePasswordButton);

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");

    // Type short password
    fireEvent.change(newPasswordInput, { target: { value: "12345" } });

    await waitFor(() => {
      const warningElements = screen.getAllByText("Password must be at least 6 characters long");
      expect(warningElements.length).toBeGreaterThan(0);
    });
  });
});
