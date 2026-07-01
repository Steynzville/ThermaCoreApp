// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PasswordResetRequest from "./PasswordResetRequest";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { SettingsProvider } from "../context/SettingsContext";
import { resetPassword } from "../services/authService";

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

// Mock useNavigate
const mockNavigate = vi.fn();

describe("PasswordResetRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  // Helper to render with a specific token in the URL
  const renderWithToken = (token = "test-token") => {
    const initialEntries = token ? [`/reset-password?token=${token}`] : ["/reset-password"];
    
    return render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MemoryRouter initialEntries={initialEntries}>
              <Routes>
                <Route path="/reset-password" element={<PasswordResetRequest />} />
              </Routes>
            </MemoryRouter>
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );
  };

  it("should render password reset form", () => {
    renderWithToken();

    expect(
      screen.getByPlaceholderText("Enter new password")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Confirm new password")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reset password/i })
    ).toBeInTheDocument();
  });

  it("should display error when no token in URL", async () => {
    renderWithToken(null);

    await waitFor(() => {
      expect(
        screen.getByText(/Invalid reset link. Please request a new password reset./i)
      ).toBeInTheDocument();
    });
  });

  it("should handle password input change", () => {
    renderWithToken();

    const passwordInput = screen.getByPlaceholderText("Enter new password");
    fireEvent.change(passwordInput, {
      target: { name: "newPassword", value: "newpass123" },
    });

    expect(passwordInput.value).toBe("newpass123");
  });

  it("should handle confirm password input change", () => {
    renderWithToken();

    const confirmInput = screen.getByPlaceholderText("Confirm new password");
    fireEvent.change(confirmInput, {
      target: { name: "confirmPassword", value: "newpass123" },
    });

    expect(confirmInput.value).toBe("newpass123");
  });

  it("should validate empty password fields", async () => {
    renderWithToken();

    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    // Submit form directly
    const form = submitButton.closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter both password fields/i)
      ).toBeInTheDocument();
    });
  });

  it("should validate password length", async () => {
    renderWithToken();

    const passwordInput = screen.getByPlaceholderText("Enter new password");
    const confirmInput = screen.getByPlaceholderText("Confirm new password");

    fireEvent.change(passwordInput, {
      target: { name: "newPassword", value: "short" },
    });
    fireEvent.change(confirmInput, {
      target: { name: "confirmPassword", value: "short" },
    });

    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Password must be at least 6 characters long/i)
      ).toBeInTheDocument();
    });
  });

  it("should validate password mismatch", async () => {
    renderWithToken();

    const passwordInput = screen.getByPlaceholderText("Enter new password");
    const confirmInput = screen.getByPlaceholderText("Confirm new password");

    fireEvent.change(passwordInput, {
      target: { name: "newPassword", value: "password123" },
    });
    fireEvent.change(confirmInput, {
      target: { name: "confirmPassword", value: "different456" },
    });

    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
  });

  it("should successfully reset password with valid data", async () => {
    vi.mocked(resetPassword).mockResolvedValueOnce({
      success: true,
      message: "Password reset successful",
    });

    renderWithToken();

    const passwordInput = screen.getByPlaceholderText("Enter new password");
    const confirmInput = screen.getByPlaceholderText("Confirm new password");

    fireEvent.change(passwordInput, {
      target: { name: "newPassword", value: "newpass123" },
    });
    fireEvent.change(confirmInput, {
      target: { name: "confirmPassword", value: "newpass123" },
    });

    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

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

    const passwordInput = screen.getByPlaceholderText("Enter new password");
    const confirmInput = screen.getByPlaceholderText("Confirm new password");

    fireEvent.change(passwordInput, {
      target: { name: "newPassword", value: "newpass123" },
    });
    fireEvent.change(confirmInput, {
      target: { name: "confirmPassword", value: "newpass123" },
    });

    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid token/i)).toBeInTheDocument();
    });
  });

  it("should handle API error gracefully", async () => {
    vi.mocked(resetPassword).mockRejectedValueOnce(new Error("Network Error"));

    renderWithToken();

    const passwordInput = screen.getByPlaceholderText("Enter new password");
    const confirmInput = screen.getByPlaceholderText("Confirm new password");

    fireEvent.change(passwordInput, {
      target: { name: "newPassword", value: "newpass123" },
    });
    fireEvent.change(confirmInput, {
      target: { name: "confirmPassword", value: "newpass123" },
    });

    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/An unexpected error occurred. Please try again./i)
      ).toBeInTheDocument();
    });
  });

  it("should toggle password visibility", () => {
    renderWithToken();

    const passwordInput = screen.getByLabelText(/New Password/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleButton = screen
      .getAllByRole("button")
      .find((btn) => btn.getAttribute("aria-label")?.includes("password"));

    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "text");
    }
  });

  it("should clear error when user starts typing", async () => {
    renderWithToken();

    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    // Submit form directly
    const form = submitButton.closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter both password fields/i)
      ).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText("Enter new password");
    fireEvent.change(passwordInput, {
      target: { name: "newPassword", value: "test" },
    });

    await waitFor(() => {
      expect(
        screen.queryByText(/Please enter both password fields/i)
      ).not.toBeInTheDocument();
    });
  });
});
