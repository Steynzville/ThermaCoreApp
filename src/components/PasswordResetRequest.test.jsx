import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PasswordResetRequest from "./PasswordResetRequest";

// Mock dependencies
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: vi.fn(() => [new URLSearchParams("token=test-token")]),
}));

vi.mock("../services/authService", () => ({
  resetPassword: vi.fn(),
}));

vi.mock("lucide-react", () => ({
  Eye: () => <div>Eye</div>,
  EyeOff: () => <div>EyeOff</div>,
}));

vi.mock("../assets/thermacore-logo-new.png", () => ({
  default: "logo.png",
}));

describe("PasswordResetRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render password reset form", () => {
    render(<PasswordResetRequest />);

    expect(screen.getByPlaceholderText(/new password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
  });

  it("should display error when no token in URL", async () => {
    const { useSearchParams } = await import("react-router-dom");
    useSearchParams.mockReturnValueOnce([new URLSearchParams("")]);

    render(<PasswordResetRequest />);

    await waitFor(() => {
      expect(screen.getByText(/Invalid reset link/i)).toBeInTheDocument();
    });
  });

  it("should handle password input change", () => {
    render(<PasswordResetRequest />);

    const passwordInput = screen.getByPlaceholderText(/new password/i);
    fireEvent.change(passwordInput, { target: { name: "newPassword", value: "newpass123" } });

    expect(passwordInput.value).toBe("newpass123");
  });

  it("should handle confirm password input change", () => {
    render(<PasswordResetRequest />);

    const confirmInput = screen.getByPlaceholderText(/confirm password/i);
    fireEvent.change(confirmInput, { target: { name: "confirmPassword", value: "newpass123" } });

    expect(confirmInput.value).toBe("newpass123");
  });

  it("should validate empty password fields", async () => {
    render(<PasswordResetRequest />);

    const submitButton = screen.getByRole("button", { name: /reset password/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please enter both password fields/i)).toBeInTheDocument();
    });
  });

  it("should validate password length", async () => {
    render(<PasswordResetRequest />);

    const passwordInput = screen.getByPlaceholderText(/new password/i);
    const confirmInput = screen.getByPlaceholderText(/confirm password/i);

    fireEvent.change(passwordInput, { target: { name: "newPassword", value: "short" } });
    fireEvent.change(confirmInput, { target: { name: "confirmPassword", value: "short" } });

    const submitButton = screen.getByRole("button", { name: /reset password/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 6 characters long/i)).toBeInTheDocument();
    });
  });

  it("should validate password mismatch", async () => {
    render(<PasswordResetRequest />);

    const passwordInput = screen.getByPlaceholderText(/new password/i);
    const confirmInput = screen.getByPlaceholderText(/confirm password/i);

    fireEvent.change(passwordInput, { target: { name: "newPassword", value: "password123" } });
    fireEvent.change(confirmInput, { target: { name: "confirmPassword", value: "different456" } });

    const submitButton = screen.getByRole("button", { name: /reset password/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
  });

  it("should successfully reset password", async () => {
    const { resetPassword } = await import("../services/authService");
    resetPassword.mockResolvedValueOnce({ success: true });

    render(<PasswordResetRequest />);

    const passwordInput = screen.getByPlaceholderText(/new password/i);
    const confirmInput = screen.getByPlaceholderText(/confirm password/i);

    fireEvent.change(passwordInput, { target: { name: "newPassword", value: "newpass123" } });
    fireEvent.change(confirmInput, { target: { name: "confirmPassword", value: "newpass123" } });

    const submitButton = screen.getByRole("button", { name: /reset password/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith({
        token: "test-token",
        newPassword: "newpass123",
      });
    });
  });

  it("should handle password reset error", async () => {
    const { resetPassword } = await import("../services/authService");
    resetPassword.mockResolvedValueOnce({
      success: false,
      error: "Invalid token",
    });

    render(<PasswordResetRequest />);

    const passwordInput = screen.getByPlaceholderText(/new password/i);
    const confirmInput = screen.getByPlaceholderText(/confirm password/i);

    fireEvent.change(passwordInput, { target: { name: "newPassword", value: "newpass123" } });
    fireEvent.change(confirmInput, { target: { name: "confirmPassword", value: "newpass123" } });

    const submitButton = screen.getByRole("button", { name: /reset password/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid token/i)).toBeInTheDocument();
    });
  });

  it("should toggle password visibility", () => {
    render(<PasswordResetRequest />);

    const passwordInput = screen.getByPlaceholderText(/new password/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleButtons = screen.getAllByRole("button");
    const eyeButton = toggleButtons.find(btn => btn.getAttribute("aria-label") === "Toggle password visibility");
    
    if (eyeButton) {
      fireEvent.click(eyeButton);
      expect(passwordInput).toHaveAttribute("type", "text");
    }
  });

  it("should clear error when user starts typing", async () => {
    render(<PasswordResetRequest />);

    const submitButton = screen.getByRole("button", { name: /reset password/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please enter both password fields/i)).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText(/new password/i);
    fireEvent.change(passwordInput, { target: { name: "newPassword", value: "test" } });

    await waitFor(() => {
      expect(screen.queryByText(/Please enter both password fields/i)).not.toBeInTheDocument();
    });
  });
});
