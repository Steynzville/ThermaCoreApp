import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { vi } from "vitest";

import AdminPanel from "../components/AdminPanel";
import * as AuthContext from "../context/AuthContext.jsx";
import * as apiFetch from "../utils/apiFetch";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUser = {
  id: 1,
  username: "admin",
  role: "admin",
  email: "admin@thermacore.com",
  firstName: "Admin",
  lastName: "User",
};

const renderWithProviders = (component) => {
  // Mock AuthContext
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
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    writable: true,
  });

  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("AdminPanel Password Reset Validation - Real-time Updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show warning for passwords less than 6 characters", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management and open modal
    fireEvent.click(screen.getByText("Password Management"));
    fireEvent.click(screen.getByText("Change My Password"));

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");

    // Type 5 characters - should show warning
    fireEvent.change(newPasswordInput, { target: { value: "12345" } });

    await waitFor(() => {
      // Should have the validation warning (static info banner removed per requirements)
      const warning = screen.getByText("Password must be at least 6 characters long");
      expect(warning).toBeInTheDocument();
    });

    // Button should be disabled
    const modal = screen.getByTestId("password-reset-modal");
    const resetButton = within(modal).getByRole("button", { name: /Reset Password/i });
    expect(resetButton).toBeDisabled();
  });

  it("should remove warning when password reaches 6 characters", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management and open modal
    fireEvent.click(screen.getByText("Password Management"));
    fireEvent.click(screen.getByText("Change My Password"));

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm new password");

    // Type 5 characters first - should show warning
    fireEvent.change(newPasswordInput, { target: { value: "12345" } });

    await waitFor(() => {
      const warning = screen.getByText("Password must be at least 6 characters long");
      expect(warning).toBeInTheDocument();
    });

    // Now type 6 characters - warning should disappear completely (no static info banner per requirements)
    fireEvent.change(newPasswordInput, { target: { value: "123456" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "123456" } });

    await waitFor(() => {
      // Warning should be completely gone (no static info banner)
      const warning = screen.queryByText("Password must be at least 6 characters long");
      expect(warning).not.toBeInTheDocument();
    });

    // Button should be enabled now
    const modal = screen.getByTestId("password-reset-modal");
    const resetButton = within(modal).getByRole("button", { name: /Reset Password/i });
    expect(resetButton).not.toBeDisabled();
  });

  it("should show mismatch warning in real-time", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management and open modal
    fireEvent.click(screen.getByText("Password Management"));
    fireEvent.click(screen.getByText("Change My Password"));

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm new password");

    // Type valid password
    fireEvent.change(newPasswordInput, { target: { value: "password123" } });

    // Type different password in confirm field
    fireEvent.change(confirmPasswordInput, { target: { value: "password456" } });

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });

    // Button should be disabled
    const modal = screen.getByTestId("password-reset-modal");
    const resetButton = within(modal).getByRole("button", { name: /Reset Password/i });
    expect(resetButton).toBeDisabled();
  });

  it("should remove mismatch warning when passwords match", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management and open modal
    fireEvent.click(screen.getByText("Password Management"));
    fireEvent.click(screen.getByText("Change My Password"));

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm new password");

    // Create mismatch
    fireEvent.change(newPasswordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "password456" } });

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });

    // Fix the mismatch
    fireEvent.change(confirmPasswordInput, { target: { value: "password123" } });

    await waitFor(() => {
      expect(screen.queryByText("Passwords do not match")).not.toBeInTheDocument();
    });

    // Button should be enabled
    const modal = screen.getByTestId("password-reset-modal");
    const resetButton = within(modal).getByRole("button", { name: /Reset Password/i });
    expect(resetButton).not.toBeDisabled();
  });

  it("should enable button only when both validations pass", async () => {
    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management and open modal
    fireEvent.click(screen.getByText("Password Management"));
    fireEvent.click(screen.getByText("Change My Password"));

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm new password");
    const modal = screen.getByTestId("password-reset-modal");
    const resetButton = within(modal).getByRole("button", { name: /Reset Password/i });

    // Initially disabled
    expect(resetButton).toBeDisabled();

    // Short password + no confirm - disabled
    fireEvent.change(newPasswordInput, { target: { value: "123" } });
    expect(resetButton).toBeDisabled();

    // Short password + matching - disabled
    fireEvent.change(confirmPasswordInput, { target: { value: "123" } });
    expect(resetButton).toBeDisabled();

    // Valid length + no confirm - disabled
    fireEvent.change(newPasswordInput, { target: { value: "123456" } });
    expect(resetButton).toBeDisabled();

    // Valid length + mismatched - disabled
    fireEvent.change(confirmPasswordInput, { target: { value: "123" } });
    expect(resetButton).toBeDisabled();

    // Valid length + matched - enabled
    fireEvent.change(confirmPasswordInput, { target: { value: "123456" } });
    await waitFor(() => {
      expect(resetButton).not.toBeDisabled();
    });
  });

  it("should successfully submit password reset with valid data", async () => {
    // Mock successful API response
    const mockApiPost = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, message: "Password reset successfully" }),
      }),
    );
    vi.spyOn(apiFetch, "apiPost").mockImplementation(mockApiPost);

    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management and open modal
    fireEvent.click(screen.getByText("Password Management"));
    fireEvent.click(screen.getByText("Change My Password"));

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm new password");

    // Fill in valid matching passwords
    fireEvent.change(newPasswordInput, { target: { value: "newPassword123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "newPassword123" } });

    const modal = screen.getByTestId("password-reset-modal");
    const resetButton = within(modal).getByRole("button", { name: /Reset Password/i });

    // Wait for button to be enabled
    await waitFor(() => {
      expect(resetButton).not.toBeDisabled();
    });

    // Click submit
    fireEvent.click(resetButton);

    // Verify API was called with correct data
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/users/"),
        { new_password: "newPassword123" },
        expect.objectContaining({
          showToastOnError: false,
          retries: 2,
          retryDelay: 1000,
        }),
      );
    });
  });

  it("should show error message on API failure", async () => {
    // Mock failed API response
    const mockApiPost = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Invalid password format" }),
      }),
    );
    vi.spyOn(apiFetch, "apiPost").mockImplementation(mockApiPost);

    renderWithProviders(<AdminPanel />);

    // Navigate to Password Management and open modal
    fireEvent.click(screen.getByText("Password Management"));
    fireEvent.click(screen.getByText("Change My Password"));

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm new password");

    // Fill in valid matching passwords
    fireEvent.change(newPasswordInput, { target: { value: "newPassword123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "newPassword123" } });

    const modal = screen.getByTestId("password-reset-modal");
    const resetButton = within(modal).getByRole("button", { name: /Reset Password/i });

    await waitFor(() => {
      expect(resetButton).not.toBeDisabled();
    });

    // Click submit
    fireEvent.click(resetButton);

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByTestId("password-error")).toBeInTheDocument();
      expect(screen.getByText(/Invalid password format/i)).toBeInTheDocument();
    });
  });
});
