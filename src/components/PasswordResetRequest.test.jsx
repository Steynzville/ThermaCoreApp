// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../context/AuthContext";
import { SettingsProvider } from "../context/SettingsContext";
import { ThemeProvider } from "../context/ThemeContext";
import { resetPassword } from "../services/authService";
import PasswordResetRequest from "./PasswordResetRequest";

// Mock the auth service
vi.mock("../services/authService", () => ({
  resetPassword: vi.fn(),
}));

vi.mock("lucide-react", () => ({
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  EyeOff: () => <div data-testid="eye-off-icon">EyeOff</div>,
}));

vi.mock("../assets/thermacore-logo-new.png", () => ({
  default: "logo.png",
}));

describe("PasswordResetRequest", () => {
  const ensureDocumentBody = () => {
    if (!document.body) {
      document.documentElement.appendChild(document.createElement("body"));
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ensureDocumentBody();
  });

  // Helper to render with a specific token in the URL
  const renderWithToken = (token = "test-token") => {
    const initialEntries = token
      ? [`/reset-password?token=${token}`]
      : ["/reset-password"];

    return render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MemoryRouter initialEntries={initialEntries}>
              <Routes>
                <Route
                  path="/reset-password"
                  element={<PasswordResetRequest />}
                />
              </Routes>
            </MemoryRouter>
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>,
    );
  };

  it("should render password reset form", async () => {
    renderWithToken();

    // Use getAllByPlaceholderText since there might be multiple instances
    const newPasswordInputs = screen.getAllByPlaceholderText("Enter new password");
    expect(newPasswordInputs.length).toBeGreaterThan(0);
    
    const confirmPasswordInputs = screen.getAllByPlaceholderText("Confirm new password");
    expect(confirmPasswordInputs.length).toBeGreaterThan(0);
    
    const resetButtons = screen.getAllByRole("button", { name: /reset password/i });
    expect(resetButtons.length).toBeGreaterThan(0);
  });

  it("should display error when no token in URL", async () => {
    renderWithToken(null);

    await waitFor(() => {
      const errorElements = screen.getAllByText(
        /Invalid reset link. Please request a new password reset./i,
      );
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it("should handle password input change", () => {
    renderWithToken();

    const passwordInputs = screen.getAllByPlaceholderText("Enter new password");
    const passwordInput = passwordInputs[0];
    fireEvent.change(passwordInput, {
      target: { name: "newPassword", value: "newpass123" },
    });

    expect(passwordInput.value).toBe("newpass123");
  });

  it("should handle confirm password input change", () => {
    renderWithToken();

    const confirmInputs = screen.getAllByPlaceholderText("Confirm new password");
    const confirmInput = confirmInputs[0];
    fireEvent.change(confirmInput, {
      target: { name: "confirmPassword", value: "newpass123" },
    });

    expect(confirmInput.value).toBe("newpass123");
  });

  it("should validate empty password fields", async () => {
    renderWithToken();

    const submitButtons = screen.getAllByRole("button", {
      name: /reset password/i,
    });
    const submitButton = submitButtons[0];

    // Submit the form
    fireEvent.submit(submitButton.closest("form") || submitButton.form || submitButton);

    await waitFor(() => {
      const errorElements = screen.getAllByText(/Please enter both password fields/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it("should validate password length", async () => {
    renderWithToken();

    const passwordInputs = screen.getAllByPlaceholderText("Enter new password");
    const passwordInput = passwordInputs[0];
    const confirmInputs = screen.getAllByPlaceholderText("Confirm new password");
    const confirmInput = confirmInputs[0];

    fireEvent.change(passwordInput, {
      target: { name: "newPassword", value: "short" },
    });
    fireEvent.change(confirmInput, {
      target: { name: "confirmPassword", value: "short" },
    });

    const submitButtons = screen.getAllByRole("button", {
      name: /reset password/i,
    });
    const submitButton = submitButtons[0];

    fireEvent.click(submitButton);

    await waitFor(() => {
      const errorElements = screen.getAllByText(/Password must be at least 6 characters long/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it("should validate password mismatch", async () => {
    renderWithToken();

    const passwordInputs = screen.getAllByPlaceholderText("Enter new password");
    const passwordInput = passwordInputs[0];
    const confirmInputs = screen.getAllByPlaceholderText("Confirm new password");
    const confirmInput = confirmInputs[0];

    fireEvent.change(passwordInput, {
      target: { name: "newPassword", value: "password123" },
    });
    fireEvent.change(confirmInput, {
      target: { name: "confirmPassword", value: "different456" },
    });

    const submitButtons = screen.getAllByRole("button", {
      name: /reset password/i,
    });
    const submitButton = submitButtons[0];

    fireEvent.click(submitButton);

    await waitFor(() => {
      const errorElements = screen.getAllByText(/Passwords do not match/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it("should successfully reset password with valid data", async () => {
    vi.mocked(resetPassword).mockResolvedValueOnce({
      success: true,
      message: "Password reset successful",
    });

    renderWithToken();

    const passwordInputs = screen.getAllByPlaceholderText("Enter new password");
    const passwordInput = passwordInputs[0];
    const confirmInputs = screen.getAllByPlaceholderText("Confirm new password");
    const confirmInput = confirmInputs[0];

    fireEvent.change(passwordInput, {
      target: { name: "newPassword", value: "newpass123" },
    });
    fireEvent.change(confirmInput, {
      target: { name: "confirmPassword", value: "newpass123" },
    });

    const submitButtons = screen.getAllByRole("button", {
      name: /reset password/i,
    });
    const submitButton = submitButtons[0];

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith("test-token", "newpass123");
    });
  });

  it("should show error message on API failure", async () => {
    vi.mocked(resetPassword).mockResolvedValueOnce({
      success: false,
      message: "Invalid token",
    });

    renderWithToken();

    const passwordInputs = screen.getAllByPlaceholderText("Enter new password");
    const passwordInput = passwordInputs[0];
    const confirmInputs = screen.getAllByPlaceholderText("Confirm new password");
    const confirmInput = confirmInputs[0];

    fireEvent.change(passwordInput, {
      target: { name: "newPassword", value: "newpass123" },
    });
    fireEvent.change(confirmInput, {
      target: { name: "confirmPassword", value: "newpass123" },
    });

    const submitButtons = screen.getAllByRole("button", {
      name: /reset password/i,
    });
    const submitButton = submitButtons[0];

    fireEvent.click(submitButton);

    await waitFor(() => {
      const errorElements = screen.getAllByText(/Invalid token/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it("should handle API error gracefully", async () => {
    vi.mocked(resetPassword).mockRejectedValueOnce(new Error("Network Error"));

    renderWithToken();

    const passwordInputs = screen.getAllByPlaceholderText("Enter new password");
    const passwordInput = passwordInputs[0];
    const confirmInputs = screen.getAllByPlaceholderText("Confirm new password");
    const confirmInput = confirmInputs[0];

    fireEvent.change(passwordInput, {
      target: { name: "newPassword", value: "newpass123" },
    });
    fireEvent.change(confirmInput, {
      target: { name: "confirmPassword", value: "newpass123" },
    });

    const submitButtons = screen.getAllByRole("button", {
      name: /reset password/i,
    });
    const submitButton = submitButtons[0];

    fireEvent.click(submitButton);

    await waitFor(() => {
      const errorElements = screen.getAllByText(
        /An unexpected error occurred. Please try again./i,
      );
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it("should toggle password visibility", () => {
    renderWithToken();

    const passwordInputs = screen.getAllByLabelText(/New Password/i);
    const passwordInput = passwordInputs[0];
    expect(passwordInput).toHaveAttribute("type", "password");

    // Find the toggle button by aria-label
    const toggleButtons = screen.getAllByRole("button", { name: /show password|hide password/i });
    if (toggleButtons.length > 0) {
      fireEvent.click(toggleButtons[0]);
      expect(passwordInput).toHaveAttribute("type", "text");
    }
  });

  it("should clear error when user starts typing", async () => {
    renderWithToken();

    const submitButtons = screen.getAllByRole("button", {
      name: /reset password/i,
    });
    const submitButton = submitButtons[0];

    // Submit without filling fields to trigger error
    fireEvent.submit(submitButton.closest("form") || submitButton.form || submitButton);

    await waitFor(() => {
      const errorElements = screen.getAllByText(/Please enter both password fields/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });

    const passwordInputs = screen.getAllByPlaceholderText("Enter new password");
    const passwordInput = passwordInputs[0];
    fireEvent.change(passwordInput, {
      target: { name: "newPassword", value: "test" },
    });

    await waitFor(() => {
      const errorElements = screen.queryAllByText(/Please enter both password fields/i);
      expect(errorElements.length).toBe(0);
    });
  });
});
