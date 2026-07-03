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
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { afterAll, vi, beforeEach, describe, it, expect } from "vitest";

import AdminPanel from "../components/AdminPanel";
import * as AuthContext from "../context/AuthContext.jsx";
import { SettingsProvider } from "../context/SettingsContext.jsx";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock ThemeContext
vi.mock("../context/ThemeContext.jsx", () => ({
  ThemeProvider: ({ children }) => <>{children}</>,
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

vi.mock("../context/ThemeContext", () => ({
  ThemeProvider: ({ children }) => <>{children}</>,
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

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
      ],
      page: 1,
      per_page: 100,
      total: 2,
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

  // Mock useAuth
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
      const usersElements = screen.getAllByText("Users");
      expect(usersElements.length).toBeGreaterThan(0);
      
      const passwordElements = screen.getAllByText("Password Management");
      expect(passwordElements.length).toBeGreaterThan(0);
      
      const settingsElements = screen.getAllByText("Settings");
      expect(settingsElements.length).toBeGreaterThan(0);
    });
  });

  it("should display Password Management tab when clicked", async () => {
    renderWithProviders(<AdminPanel />);

    // Find and click the Password Management tab
    const passwordElements = screen.getAllByText("Password Management");
    expect(passwordElements.length).toBeGreaterThan(0);
    const passwordTab = passwordElements[0];
    fireEvent.click(passwordTab);

    // Wait for the tab content to appear
    await waitFor(() => {
      const changePasswordElements = screen.getAllByText("Change My Password");
      expect(changePasswordElements.length).toBeGreaterThan(0);
    });
  });

  it("should open password reset modal when 'Change My Password' is clicked", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management tab
    const passwordElements = screen.getAllByText("Password Management");
    expect(passwordElements.length).toBeGreaterThan(0);
    const passwordTab = passwordElements[0];
    fireEvent.click(passwordTab);

    // Wait for the button to appear then click it
    await waitFor(() => {
      const changePasswordElements = screen.getAllByText("Change My Password");
      expect(changePasswordElements.length).toBeGreaterThan(0);
      const changePasswordButton = changePasswordElements[0];
      fireEvent.click(changePasswordButton);
    });

    // Check for modal using getAllByTestId or getByTestId if it's unique
    await waitFor(() => {
      const modals = screen.getAllByTestId("password-reset-modal");
      expect(modals.length).toBeGreaterThan(0);
    });
  });

  it("should show password visibility toggle buttons", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management tab
    const passwordElements = screen.getAllByText("Password Management");
    expect(passwordElements.length).toBeGreaterThan(0);
    const passwordTab = passwordElements[0];
    fireEvent.click(passwordTab);

    // Click Change My Password button
    await waitFor(() => {
      const changePasswordElements = screen.getAllByText("Change My Password");
      expect(changePasswordElements.length).toBeGreaterThan(0);
      const changePasswordButton = changePasswordElements[0];
      fireEvent.click(changePasswordButton);
    });

    await waitFor(() => {
      const toggleButtons = screen.getAllByRole("button", { name: /toggle password visibility/i });
      expect(toggleButtons.length).toBeGreaterThan(0);
    });
  });

  it("should validate password matching", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management tab
    const passwordElements = screen.getAllByText("Password Management");
    expect(passwordElements.length).toBeGreaterThan(0);
    const passwordTab = passwordElements[0];
    fireEvent.click(passwordTab);

    // Click Change My Password button
    await waitFor(() => {
      const changePasswordElements = screen.getAllByText("Change My Password");
      expect(changePasswordElements.length).toBeGreaterThan(0);
      const changePasswordButton = changePasswordElements[0];
      fireEvent.click(changePasswordButton);
    });

    // Wait for inputs to appear
    await waitFor(() => {
      const newPasswordInputs = screen.getAllByPlaceholderText("Enter new password");
      const confirmPasswordInputs = screen.getAllByPlaceholderText("Confirm new password");
      expect(newPasswordInputs.length).toBeGreaterThan(0);
      expect(confirmPasswordInputs.length).toBeGreaterThan(0);
      
      // Type different passwords
      fireEvent.change(newPasswordInputs[0], { target: { value: "password123" } });
      fireEvent.change(confirmPasswordInputs[0], { target: { value: "password456" } });
    });

    await waitFor(() => {
      const errorElements = screen.getAllByText("Passwords do not match");
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it("should validate minimum password length", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management tab
    const passwordElements = screen.getAllByText("Password Management");
    expect(passwordElements.length).toBeGreaterThan(0);
    const passwordTab = passwordElements[0];
    fireEvent.click(passwordTab);

    // Click Change My Password button
    await waitFor(() => {
      const changePasswordElements = screen.getAllByText("Change My Password");
      expect(changePasswordElements.length).toBeGreaterThan(0);
      const changePasswordButton = changePasswordElements[0];
      fireEvent.click(changePasswordButton);
    });

    // Wait for input to appear
    await waitFor(() => {
      const newPasswordInputs = screen.getAllByPlaceholderText("Enter new password");
      expect(newPasswordInputs.length).toBeGreaterThan(0);
      
      // Type short password
      fireEvent.change(newPasswordInputs[0], { target: { value: "12345" } });
    });

    // Check for error message
    await waitFor(() => {
      const errorElements = screen.getAllByText("Password must be at least 6 characters long");
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });
});
