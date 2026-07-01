// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PasswordResetRequest from "./PasswordResetRequest";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { SettingsProvider } from "../context/SettingsContext";
import { resetPassword } from "../services/authService";

// Setup mocks with variables prefixed with "mock" to bypass hoisting restrictions
const mockNavigate = vi.fn();
const mockUseSearchParams = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => mockUseSearchParams(),
  };
});

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (token = "test-token") => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams(token ? `token=${token}` : ""),
      vi.fn(),
    ]);

    return render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <BrowserRouter>
              <PasswordResetRequest />
            </BrowserRouter>
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );
  };

  it("should render password reset form", () => {
    renderComponent();

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
    renderComponent("");

    await waitFor(() => {
      expect(
        screen.getByText(/Invalid reset link. Please request a new password reset./i)
      ).toBeInTheDocument();
    });
  });

  it("should handle password input change", () => {
    renderComponent();

    const passwordInput = screen.getByPlaceholderText("Enter new password");
    fireEvent.change(passwordInput, {
      target: { name: "newPassword", value: "newpass123" },
    });

    expect(passwordInput.value).toBe("newpass123");
  });

  it("should handle confirm password input change", () => {
    renderComponent();

    const confirmInput = screen.getByPlaceholderText("Confirm new password");
    fireEvent.change(confirmInput, {
      target: { name: "confirmPassword", value: "newpass123" },
    });

    expect(confirmInput.value).toBe("newpass123");
  });

  it("should validate empty password fields", async () => {
    renderComponent();

    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    // Wait for the asynchronous useEffect to resolve and set the token, enabling the button
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    // Submit form directly to bypass native HTML5 required validation on empty fields
    const form = submitButton.closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter both password fields/i)
      ).toBeInTheDocument();
    });
  });

  it("should validate password length", async () => {
    renderComponent();

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
    renderComponent();

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

    renderComponent();

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

    renderComponent();

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

    renderComponent();

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
    renderComponent();

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
    renderComponent();

    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    // Submit form directly to bypass native HTML5 required validation on empty fields
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
