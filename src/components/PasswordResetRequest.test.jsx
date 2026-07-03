// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPassword } from "../services/authService";
import PasswordResetRequest from "../components/PasswordResetRequest";

// Mock the auth service
vi.mock("../services/authService", () => ({
  resetPassword: vi.fn(),
}));

// Mock all contexts
vi.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuth: () => ({ user: null, userRole: null, isAuthenticated: false }),
}));

vi.mock("../context/ThemeContext", () => ({
  ThemeProvider: ({ children }) => <>{children}</>,
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

vi.mock("../context/SettingsContext", () => ({
  SettingsProvider: ({ children }) => <>{children}</>,
  useSettings: () => ({ settings: {} }),
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

  const renderWithToken = (token = "test-token") => {
    const initialEntries = token
      ? [`/reset-password?token=${token}`]
      : ["/reset-password"];

    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/reset-password" element={<PasswordResetRequest />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it("should render password reset form", async () => {
    renderWithToken();

    // Use getAllBy* to handle potential multiple elements
    const passwordFields = await screen.findAllByPlaceholderText("Enter new password");
    expect(passwordFields.length).toBeGreaterThan(0);
    
    const confirmFields = await screen.findAllByPlaceholderText("Confirm new password");
    expect(confirmFields.length).toBeGreaterThan(0);
    
    const buttons = screen.getAllByRole("button", { name: /reset password/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("should display error when no token in URL", async () => {
    renderWithToken(null);

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/Invalid reset link. Please request a new password reset./i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it("should handle password input change", async () => {
    renderWithToken();

    const passwordInputs = await screen.findAllByPlaceholderText("Enter new password");
    expect(passwordInputs.length).toBeGreaterThan(0);
    
    fireEvent.change(passwordInputs[0], {
      target: { name: "newPassword", value: "newpass123" },
    });
    expect(passwordInputs[0].value).toBe("newpass123");
  });

  it("should handle confirm password input change", async () => {
    renderWithToken();

    const confirmInputs = await screen.findAllByPlaceholderText("Confirm new password");
    expect(confirmInputs.length).toBeGreaterThan(0);
    
    fireEvent.change(confirmInputs[0], {
      target: { name: "confirmPassword", value: "newpass123" },
    });
    expect(confirmInputs[0].value).toBe("newpass123");
  });

  it("should validate empty password fields", async () => {
    renderWithToken();

    const buttons = screen.getAllByRole("button", { name: /reset password/i });
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/Please enter both password fields/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it("should validate password length", async () => {
    renderWithToken();

    const passwordInputs = await screen.findAllByPlaceholderText("Enter new password");
    const confirmInputs = await screen.findAllByPlaceholderText("Confirm new password");
    
    fireEvent.change(passwordInputs[0], {
      target: { name: "newPassword", value: "short" },
    });
    fireEvent.change(confirmInputs[0], {
      target: { name: "confirmPassword", value: "short" },
    });

    const buttons = screen.getAllByRole("button", { name: /reset password/i });
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/Password must be at least 6 characters long/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it("should validate password mismatch", async () => {
    renderWithToken();

    const passwordInputs = await screen.findAllByPlaceholderText("Enter new password");
    const confirmInputs = await screen.findAllByPlaceholderText("Confirm new password");
    
    fireEvent.change(passwordInputs[0], {
      target: { name: "newPassword", value: "password123" },
    });
    fireEvent.change(confirmInputs[0], {
      target: { name: "confirmPassword", value: "different456" },
    });

    const buttons = screen.getAllByRole("button", { name: /reset password/i });
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/Passwords do not match/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it("should successfully reset password with valid data", async () => {
    vi.mocked(resetPassword).mockResolvedValueOnce({
      success: true,
      message: "Password reset successful",
    });

    renderWithToken();

    const passwordInputs = await screen.findAllByPlaceholderText("Enter new password");
    const confirmInputs = await screen.findAllByPlaceholderText("Confirm new password");
    
    fireEvent.change(passwordInputs[0], {
      target: { name: "newPassword", value: "newpass123" },
    });
    fireEvent.change(confirmInputs[0], {
      target: { name: "confirmPassword", value: "newpass123" },
    });

    const buttons = screen.getAllByRole("button", { name: /reset password/i });
    fireEvent.click(buttons[0]);

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

    const passwordInputs = await screen.findAllByPlaceholderText("Enter new password");
    const confirmInputs = await screen.findAllByPlaceholderText("Confirm new password");
    
    fireEvent.change(passwordInputs[0], {
      target: { name: "newPassword", value: "newpass123" },
    });
    fireEvent.change(confirmInputs[0], {
      target: { name: "confirmPassword", value: "newpass123" },
    });

    const buttons = screen.getAllByRole("button", { name: /reset password/i });
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/Invalid token/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it("should handle API error gracefully", async () => {
    vi.mocked(resetPassword).mockRejectedValueOnce(new Error("Network Error"));

    renderWithToken();

    const passwordInputs = await screen.findAllByPlaceholderText("Enter new password");
    const confirmInputs = await screen.findAllByPlaceholderText("Confirm new password");
    
    fireEvent.change(passwordInputs[0], {
      target: { name: "newPassword", value: "newpass123" },
    });
    fireEvent.change(confirmInputs[0], {
      target: { name: "confirmPassword", value: "newpass123" },
    });

    const buttons = screen.getAllByRole("button", { name: /reset password/i });
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/An unexpected error occurred. Please try again./i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it("should toggle password visibility", async () => {
    renderWithToken();

    const passwordInputs = await screen.findAllByPlaceholderText("Enter new password");
    expect(passwordInputs[0]).toHaveAttribute("type", "password");

    // Find toggle button using data-testid or aria-label
    const toggleButtons = screen.getAllByRole("button", { name: /Show password|Hide password/i });
    if (toggleButtons.length > 0) {
      fireEvent.click(toggleButtons[0]);
      expect(passwordInputs[0]).toHaveAttribute("type", "text");
    } else {
      // Alternative: find by data-testid if available
      const eyeIcons = screen.getAllByTestId("eye-icon");
      if (eyeIcons.length > 0) {
        // Click the parent button or the icon itself
        const parentButton = eyeIcons[0].closest("button");
        if (parentButton) {
          fireEvent.click(parentButton);
          expect(passwordInputs[0]).toHaveAttribute("type", "text");
        }
      }
    }
  });

  it("should clear error when user starts typing", async () => {
    renderWithToken();

    // First trigger an error
    const buttons = screen.getAllByRole("button", { name: /reset password/i });
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/Please enter both password fields/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    // Then start typing
    const passwordInputs = screen.getAllByPlaceholderText("Enter new password");
    fireEvent.change(passwordInputs[0], {
      target: { name: "newPassword", value: "test" },
    });

    // Error should be cleared
    await waitFor(() => {
      const errorMessages = screen.queryAllByText(/Please enter both password fields/i);
      expect(errorMessages.length).toBe(0);
    });
  });
});
