import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
  act,
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

// Mock ThemeContext to make sure ThemeProvider is fully operational for the component under test
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

// Mock apiFetch to prevent real API calls and make it a configurable mock
vi.mock("../utils/apiFetch", () => ({
  apiGet: vi.fn(() => Promise.resolve({ data: [] })),
  apiPost: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })),
  apiPut: vi.fn(() => Promise.resolve({ data: {} })),
  apiDelete: vi.fn(() => Promise.resolve({ data: {} })),
}));

// Mock usersAPI to prevent disk dependencies and network requests
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

describe("AdminPanel Password Reset Validation - Real-time Updates", () => {
  afterAll(() => {
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      writable: true,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm to prevent ReferenceError in tests
    window.confirm = vi.fn(() => true);
  });

  it("should render without crashing", async () => {
    renderWithProviders(<AdminPanel />);
    await waitFor(() => {
      expect(screen.getByText("Users")).toBeInTheDocument();
    });
  });

  it("should show warning for passwords less than 6 characters", async () => {
    renderWithProviders(<AdminPanel />);

    // Use getAllByText and get the first one, or use a more specific query
    const passwordManagementElements = screen.getAllByText("Password Management");
    // Click the first one (or the one that's a button/link)
    await act(async () => {
      fireEvent.click(passwordManagementElements[0]);
    });
    
    await act(async () => {
      fireEvent.click(screen.getByText("Change My Password"));
    });

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");

    // Type 5 characters - should show warning
    await act(async () => {
      fireEvent.change(newPasswordInput, { target: { value: "12345" } });
    });

    await waitFor(() => {
      // Should have the validation warning
      const warning = screen.getByText(
        "Password must be at least 6 characters long"
      );
      expect(warning).toBeInTheDocument();
    });

    // Button should be disabled
    const modal = screen.getByTestId("password-reset-modal");
    const resetButton = within(modal).getByRole("button", {
      name: /Reset Password/i,
    });
    expect(resetButton).toBeDisabled();
  });

  it("should remove warning when password reaches 6 characters", async () => {
    renderWithProviders(<AdminPanel />);

    // Use getAllByText and get the first one
    const passwordManagementElements = screen.getAllByText("Password Management");
    await act(async () => {
      fireEvent.click(passwordManagementElements[0]);
    });
    
    await act(async () => {
      fireEvent.click(screen.getByText("Change My Password"));
    });

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmPasswordInput = screen.getByPlaceholderText(
      "Confirm new password"
    );

    // Type 5 characters first - should show warning
    await act(async () => {
      fireEvent.change(newPasswordInput, { target: { value: "12345" } });
    });

    await waitFor(() => {
      const warning = screen.getByText(
        "Password must be at least 6 characters long"
      );
      expect(warning).toBeInTheDocument();
    });

    // Now type 6 characters - warning should disappear completely
    await act(async () => {
      fireEvent.change(newPasswordInput, { target: { value: "123456" } });
    });
    await act(async () => {
      fireEvent.change(confirmPasswordInput, { target: { value: "123456" } });
    });

    await waitFor(() => {
      // Warning should be completely gone
      const warning = screen.queryByText(
        "Password must be at least 6 characters long"
      );
      expect(warning).not.toBeInTheDocument();
    });

    // Button should be enabled now
    const modal = screen.getByTestId("password-reset-modal");
    const resetButton = within(modal).getByRole("button", {
      name: /Reset Password/i,
    });
    expect(resetButton).not.toBeDisabled();
  });

  it("should show mismatch warning in real-time", async () => {
    renderWithProviders(<AdminPanel />);

    // Use getAllByText and get the first one
    const passwordManagementElements = screen.getAllByText("Password Management");
    await act(async () => {
      fireEvent.click(passwordManagementElements[0]);
    });
    
    await act(async () => {
      fireEvent.click(screen.getByText("Change My Password"));
    });

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmPasswordInput = screen.getByPlaceholderText(
      "Confirm new password"
    );

    // Type valid password
    await act(async () => {
      fireEvent.change(newPasswordInput, { target: { value: "password123" } });
    });

    // Type different password in confirm field
    await act(async () => {
      fireEvent.change(confirmPasswordInput, {
        target: { value: "password456" },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });

    // Button should be disabled
    const modal = screen.getByTestId("password-reset-modal");
    const resetButton = within(modal).getByRole("button", {
      name: /Reset Password/i,
    });
    expect(resetButton).toBeDisabled();
  });

  it("should remove mismatch warning when passwords match", async () => {
    renderWithProviders(<AdminPanel />);

    // Use getAllByText and get the first one
    const passwordManagementElements = screen.getAllByText("Password Management");
    await act(async () => {
      fireEvent.click(passwordManagementElements[0]);
    });
    
    await act(async () => {
      fireEvent.click(screen.getByText("Change My Password"));
    });

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmPasswordInput = screen.getByPlaceholderText(
      "Confirm new password"
    );

    // Create mismatch
    await act(async () => {
      fireEvent.change(newPasswordInput, { target: { value: "password123" } });
    });
    await act(async () => {
      fireEvent.change(confirmPasswordInput, {
        target: { value: "password456" },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });

    // Fix the mismatch
    await act(async () => {
      fireEvent.change(confirmPasswordInput, {
        target: { value: "password123" },
      });
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Passwords do not match")
      ).not.toBeInTheDocument();
    });

    // Button should be enabled
    const modal = screen.getByTestId("password-reset-modal");
    const resetButton = within(modal).getByRole("button", {
      name: /Reset Password/i,
    });
    expect(resetButton).not.toBeDisabled();
  });

  it("should enable button only when both validations pass", async () => {
    renderWithProviders(<AdminPanel />);

    // Use getAllByText and get the first one
    const passwordManagementElements = screen.getAllByText("Password Management");
    await act(async () => {
      fireEvent.click(passwordManagementElements[0]);
    });
    
    await act(async () => {
      fireEvent.click(screen.getByText("Change My Password"));
    });

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmPasswordInput = screen.getByPlaceholderText(
      "Confirm new password"
    );
    const modal = screen.getByTestId("password-reset-modal");
    const resetButton = within(modal).getByRole("button", {
      name: /Reset Password/i,
    });

    // Initially disabled
    expect(resetButton).toBeDisabled();

    // Short password + no confirm - disabled
    await act(async () => {
      fireEvent.change(newPasswordInput, { target: { value: "123" } });
    });
    expect(resetButton).toBeDisabled();

    // Short password + matching - disabled
    await act(async () => {
      fireEvent.change(confirmPasswordInput, { target: { value: "123" } });
    });
    expect(resetButton).toBeDisabled();

    // Valid length + no confirm - disabled
    await act(async () => {
      fireEvent.change(newPasswordInput, { target: { value: "123456" } });
    });
    expect(resetButton).toBeDisabled();

    // Valid length + mismatched - disabled
    await act(async () => {
      fireEvent.change(confirmPasswordInput, { target: { value: "123" } });
    });
    expect(resetButton).toBeDisabled();

    // Valid length + matched - enabled
    await act(async () => {
      fireEvent.change(confirmPasswordInput, { target: { value: "123456" } });
    });
    await waitFor(() => {
      expect(resetButton).not.toBeDisabled();
    });
  });

  it("should successfully submit password reset with valid data", async () => {
    // Mock successful API response
    apiFetch.apiPost.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          message: "Password reset successfully",
        }),
    });

    renderWithProviders(<AdminPanel />);

    // Use getAllByText and get the first one
    const passwordManagementElements = screen.getAllByText("Password Management");
    await act(async () => {
      fireEvent.click(passwordManagementElements[0]);
    });
    
    await act(async () => {
      fireEvent.click(screen.getByText("Change My Password"));
    });

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmPasswordInput = screen.getByPlaceholderText(
      "Confirm new password"
    );

    // Fill in valid matching passwords
    await act(async () => {
      fireEvent.change(newPasswordInput, { target: { value: "newPassword123" } });
    });
    await act(async () => {
      fireEvent.change(confirmPasswordInput, {
        target: { value: "newPassword123" },
      });
    });

    const modal = screen.getByTestId("password-reset-modal");
    const resetButton = within(modal).getByRole("button", {
      name: /Reset Password/i,
    });

    // Wait for button to be enabled
    await waitFor(() => {
      expect(resetButton).not.toBeDisabled();
    });

    // Click submit
    await act(async () => {
      fireEvent.click(resetButton);
    });

    // Verify API was called with correct data
    await waitFor(() => {
      expect(apiFetch.apiPost).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/users/"),
        { new_password: "newPassword123" },
        expect.objectContaining({
          showToastOnError: false,
          retries: 2,
          retryDelay: 1000,
        })
      );
    });
  });

  it("should show error message on API failure", async () => {
    // Mock failed API response
    apiFetch.apiPost.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Invalid password format" }),
    });

    renderWithProviders(<AdminPanel />);

    // Use getAllByText and get the first one
    const passwordManagementElements = screen.getAllByText("Password Management");
    await act(async () => {
      fireEvent.click(passwordManagementElements[0]);
    });
    
    await act(async () => {
      fireEvent.click(screen.getByText("Change My Password"));
    });

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmPasswordInput = screen.getByPlaceholderText(
      "Confirm new password"
    );

    // Fill in valid matching passwords
    await act(async () => {
      fireEvent.change(newPasswordInput, { target: { value: "newPassword123" } });
    });
    await act(async () => {
      fireEvent.change(confirmPasswordInput, {
        target: { value: "newPassword123" },
      });
    });

    const modal = screen.getByTestId("password-reset-modal");
    const resetButton = within(modal).getByRole("button", {
      name: /Reset Password/i,
    });

    await waitFor(() => {
      expect(resetButton).not.toBeDisabled();
    });

    // Click submit
    await act(async () => {
      fireEvent.click(resetButton);
    });

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByTestId("password-error")).toBeInTheDocument();
      expect(screen.getByText(/Invalid password format/i)).toBeInTheDocument();
    });
  });
});
