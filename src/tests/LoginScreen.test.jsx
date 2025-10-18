import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as authService from "../services/authService";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock audio player
vi.mock("../utils/audioPlayer", () => ({
  default: vi.fn(),
}));

// Test wrapper with all required providers
const TestWrapper = ({ children }) => (
  <ThemeProvider>
    <SettingsProvider>
      <AuthProvider>{children}</AuthProvider>
    </SettingsProvider>
  </ThemeProvider>
);

describe("LoginScreen - Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it("should display error message on failed login", async () => {
    // Mock failed login
    vi.spyOn(authService, "login").mockResolvedValue({
      success: false,
      message: "Invalid username or password. Please try again.",
    });

    const mockSetError = vi.fn();
    render(
      <TestWrapper>
        <LoginScreen error="" setError={mockSetError} />
      </TestWrapper>
    );

    // Fill in the form
    const usernameInput = screen.getByPlaceholderText("Enter username");
    const passwordInput = screen.getByPlaceholderText("Enter password");
    const submitButton = screen.getByRole("button", { name: "Sign In" });

    fireEvent.change(usernameInput, { target: { value: "wronguser" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpass" } });
    fireEvent.click(submitButton);

    // Wait for login to complete
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith("wronguser", "wrongpass");
    });

    // Verify error was set
    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith("Invalid username or password. Please try again.");
    });

    // Verify no navigation occurred
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should not navigate on failed login", async () => {
    // Mock failed login
    vi.spyOn(authService, "login").mockResolvedValue({
      success: false,
      message: "Invalid username or password. Please try again.",
    });

    const mockSetError = vi.fn();
    render(
      <TestWrapper>
        <LoginScreen error="" setError={mockSetError} />
      </TestWrapper>
    );

    const usernameInput = screen.getByPlaceholderText("Enter username");
    const passwordInput = screen.getByPlaceholderText("Enter password");
    const submitButton = screen.getByRole("button", { name: "Sign In" });

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith(
        "Invalid username or password. Please try again."
      );
    });

    // Ensure navigation did NOT happen
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should retain form data on failed login", async () => {
    // Mock failed login
    vi.spyOn(authService, "login").mockResolvedValue({
      success: false,
      message: "Invalid username or password. Please try again.",
    });

    const mockSetError = vi.fn();
    render(
      <TestWrapper>
        <LoginScreen error="" setError={mockSetError} />
      </TestWrapper>
    );

    const usernameInput = screen.getByPlaceholderText("Enter username");
    const passwordInput = screen.getByPlaceholderText("Enter password");
    const submitButton = screen.getByRole("button", { name: "Sign In" });

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(passwordInput, { target: { value: "testpass" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalled();
    });

    // Verify form data is retained
    expect(usernameInput.value).toBe("testuser");
    expect(passwordInput.value).toBe("testpass");
  });

  it("should navigate to dashboard on successful login", async () => {
    // Mock successful login - ensure it returns the format AuthContext expects
    vi.spyOn(authService, "login").mockResolvedValue({
      success: true,
      user: {
        id: 1,
        username: "admin",
        email: "admin@test.com",
        role: "admin",
        firstName: "Admin",
        lastName: "User",
      },
      token: "test-token",
      message: "Login successful",
    });

    const mockSetError = vi.fn();
    render(
      <TestWrapper>
        <LoginScreen error="" setError={mockSetError} />
      </TestWrapper>
    );

    const usernameInput = screen.getByPlaceholderText("Enter username");
    const passwordInput = screen.getByPlaceholderText("Enter password");
    const submitButton = screen.getByRole("button", { name: "Sign In" });

    fireEvent.change(usernameInput, { target: { value: "admin" } });
    fireEvent.change(passwordInput, { target: { value: "correctpass" } });
    fireEvent.click(submitButton);

    // Wait for navigation
    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      },
      { timeout: 3000 }
    );
  });

  it("should clear error when user starts typing", async () => {
    const mockSetError = vi.fn();
    render(
      <TestWrapper>
        <LoginScreen error="Previous error" setError={mockSetError} />
      </TestWrapper>
    );

    const usernameInput = screen.getByPlaceholderText("Enter username");

    // Type in username field
    fireEvent.change(usernameInput, { target: { value: "newuser" } });

    // Verify error was cleared
    expect(mockSetError).toHaveBeenCalledWith("");
  });
});
