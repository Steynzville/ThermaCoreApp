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
  Eye: ({ size }) => <span data-testid="eye-icon">Eye</span>,
  EyeOff: ({ size }) => <span data-testid="eye-off-icon">EyeOff</span>,
}));

vi.mock("../assets/thermacore-logo-new.png", () => ({
  default: "logo.png",
}));

// Mock CSS module - FIXED: More complete mock with all required classes
vi.mock("../components/LoginScreen.module.css", () => ({
  default: {
    pageWrapper: "pageWrapper",
    loginContainer: "loginContainer",
    logoContainer: "logoContainer",
    logo: "logo",
    titleContainer: "titleContainer",
    title: "title",
    companySubtitle: "companySubtitle",
    loginError: "loginError",
    visible: "visible",
    formGroup: "formGroup",
    formLabel: "formLabel",
    passwordInputContainer: "passwordInputContainer",
    formInput: "formInput",
    passwordToggleButton: "passwordToggleButton",
    btnSignin: "btnSignin",
    forgotPasswordLink: "forgotPasswordLink",
  },
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
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
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
    
    // Check for the submit button
    const buttons = screen.getAllByRole("button", { name: /reset password/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("should display error when no token in URL", async () => {
    renderWithToken(null);

    // Wait for the error to appear
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
    expect(passwordInputs[0]).toHaveValue("newpass123");
  });

  it("should handle confirm password input change", async () => {
    renderWithToken();

    const confirmInputs = await screen.findAllByPlaceholderText("Confirm new password");
    expect(confirmInputs.length).toBeGreaterThan(0);
    
    fireEvent.change(confirmInputs[0], {
      target: { name: "confirmPassword", value: "newpass123" },
    });
    expect(confirmInputs[0]).toHaveValue("newpass123");
  });

  it("should validate empty password fields", async () => {
    renderWithToken();

    const buttons = screen.getAllByRole("button", { name: /reset password/i });
    expect(buttons.length).toBeGreaterThan(0);
    
    // Click submit with empty fields
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
    const mockResetPassword = resetPassword;
    mockResetPassword.mockResolvedValueOnce({
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
      expect(mockResetPassword).toHaveBeenCalledWith("test-token", "newpass123");
    });
  });

  it("should show error message on API failure", async () => {
    const mockResetPassword = resetPassword;
    mockResetPassword.mockResolvedValueOnce({
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
    const mockResetPassword = resetPassword;
    mockResetPassword.mockRejectedValueOnce(new Error("Network Error"));

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
    // Wait for the input to be ready
    await waitFor(() => {
      expect(passwordInputs.length).toBeGreaterThan(0);
    });
    
    // Check initial type
    expect(passwordInputs[0]).toHaveAttribute("type", "password");

    // Find the toggle button using aria-label
    const toggleButtons = screen.getAllByRole("button", { 
      name: /Show password|Hide password/i 
    });
    expect(toggleButtons.length).toBeGreaterThan(0);
    
    // Click to show password
    fireEvent.click(toggleButtons[0]);
    await waitFor(() => {
      expect(passwordInputs[0]).toHaveAttribute("type", "text");
    });
    
    // Click to hide password again
    fireEvent.click(toggleButtons[0]);
    await waitFor(() => {
      expect(passwordInputs[0]).toHaveAttribute("type", "password");
    });
  });

  it("should toggle confirm password visibility", async () => {
    renderWithToken();

    const confirmInputs = await screen.findAllByPlaceholderText("Confirm new password");
    await waitFor(() => {
      expect(confirmInputs.length).toBeGreaterThan(0);
    });
    
    expect(confirmInputs[0]).toHaveAttribute("type", "password");

    // Find the toggle button using aria-label
    const toggleButtons = screen.getAllByRole("button", { 
      name: /Show confirm password|Hide confirm password/i 
    });
    expect(toggleButtons.length).toBeGreaterThan(0);
    
    // Click to show password
    fireEvent.click(toggleButtons[0]);
    await waitFor(() => {
      expect(confirmInputs[0]).toHaveAttribute("type", "text");
    });
    
    // Click to hide password again
    fireEvent.click(toggleButtons[0]);
    await waitFor(() => {
      expect(confirmInputs[0]).toHaveAttribute("type", "password");
    });
  });

  it("should clear error when user starts typing", async () => {
    renderWithToken();

    // First trigger an error (submit empty form)
    const buttons = screen.getAllByRole("button", { name: /reset password/i });
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/Please enter both password fields/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    // Then start typing in password field
    const passwordInputs = await screen.findAllByPlaceholderText("Enter new password");
    fireEvent.change(passwordInputs[0], {
      target: { name: "newPassword", value: "test" },
    });

    // Error should be cleared (no error messages found)
    await waitFor(() => {
      const errorMessages = screen.queryAllByText(/Please enter both password fields/i);
      expect(errorMessages.length).toBe(0);
    });
  });

  it("should have back to login button", async () => {
    renderWithToken();

    const backButton = screen.getByRole("button", { name: /Back to Login/i });
    expect(backButton).toBeInTheDocument();
    
    fireEvent.click(backButton);
    // Should navigate to login - we can check for the login page
    await waitFor(() => {
      const loginPage = screen.getByTestId("login-page");
      expect(loginPage).toBeInTheDocument();
    });
  });

  it("should disable submit button when token is missing", async () => {
    renderWithToken(null);

    // Wait for the error to appear first
    await waitFor(() => {
      const errorMessages = screen.getAllByText(/Invalid reset link. Please request a new password reset./i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    const buttons = screen.getAllByRole("button", { name: /reset password/i });
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0]).toBeDisabled();
  });
});
