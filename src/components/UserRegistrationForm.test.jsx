// @vitest-environment jsdom
/**
 * Tests for UserRegistrationForm Component
 * */

import { fireEvent, render, screen, waitFor, cleanup, act } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
// ✅ Updated import for co-located test file
import UserRegistrationForm from "./UserRegistrationForm";
import { selfRegister } from "../services/authService";
import { toast } from "sonner";
import { ThemeProvider } from "../context/ThemeContext";
import { SettingsProvider } from "../context/SettingsContext";
import { AuthProvider } from "../context/AuthContext";

// Mock useNavigate from react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the auth service
vi.mock("../services/authService", () => ({
  selfRegister: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock logo asset
vi.mock("../assets/thermacore-logo-new.png", () => ({
  default: "logo-mock.png",
}));

const TestWrapper = ({ children }) => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <SettingsProvider>
          <AuthProvider>{children}</AuthProvider>
        </SettingsProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe("UserRegistrationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    selfRegister.mockReset();
    toast.error.mockClear();
    toast.success.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  // ============================================================
  // RENDERING TESTS
  // ============================================================
  it("should render without crashing", () => {
    const { container } = render(<UserRegistrationForm />, { wrapper: TestWrapper });
    expect(container).toBeTruthy();
    expect(container.firstChild).toBeTruthy();
  });

  it("should render all form fields", () => {
    render(<UserRegistrationForm />, { wrapper: TestWrapper });

    expect(screen.getByLabelText(/^Username/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Email/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Password/i)).toBeTruthy();
    expect(screen.getByLabelText(/^First Name/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Last Name/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Phone Number/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Company/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Department/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Position/i)).toBeTruthy();
  });

  // ============================================================
  // VALIDATION TESTS
  // ============================================================
  it("should display validation errors for empty required fields", async () => {
    render(<UserRegistrationForm />, { wrapper: TestWrapper });

    const submitButton = screen.getByRole("button", { name: /Create Account/i });
    
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Please fix the errors in the form");
    });

    await waitFor(() => {
      expect(screen.getByText(/Username must be at least 3 characters/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Valid email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/First name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Last name is required/i)).toBeInTheDocument();
  });

  it("should validate username length", async () => {
    render(<UserRegistrationForm />, { wrapper: TestWrapper });

    const usernameInput = screen.getByLabelText(/^Username/i);
    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: "ab" } });
    });

    const submitButton = screen.getByRole("button", { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Username must be at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it("should validate email format", async () => {
    render(<UserRegistrationForm />, { wrapper: TestWrapper });

    // Fill in other required fields first so only email validation fails
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/^Username/i), {
        target: { value: "testuser" },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByLabelText(/^First Name/i), {
        target: { value: "John" },
      });
      fireEvent.change(screen.getByLabelText(/^Last Name/i), {
        target: { value: "Doe" },
      });
    });

    // Set invalid email
    const emailInput = screen.getByLabelText(/^Email/i);
    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    });

    const submitButton = screen.getByRole("button", { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Check for the email validation error
    await waitFor(() => {
      const emailError = screen.getByText(/Valid email is required/i);
      expect(emailError).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("should validate password length", async () => {
    render(<UserRegistrationForm />, { wrapper: TestWrapper });

    const passwordInput = screen.getByLabelText(/^Password/i);
    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "12345" } });
    });

    const submitButton = screen.getByRole("button", { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
    });
  });

  it("should clear field error when user starts typing", async () => {
    render(<UserRegistrationForm />, { wrapper: TestWrapper });

    const submitButton = screen.getByRole("button", { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Username must be at least 3 characters/i)).toBeInTheDocument();
    });

    const usernameInput = screen.getByLabelText(/^Username/i);
    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: "testuser" } });
    });

    await waitFor(() => {
      expect(screen.queryByText(/Username must be at least 3 characters/i)).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // PASSWORD VISIBILITY TESTS
  // ============================================================
  it("should toggle password visibility", async () => {
    render(<UserRegistrationForm />, { wrapper: TestWrapper });

    const passwordInput = screen.getByLabelText(/^Password/i);
    expect(passwordInput.type).toBe("password");

    const toggleButton = screen.getByLabelText("Show password");
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    expect(passwordInput.type).toBe("text");

    const hideButton = screen.getByLabelText("Hide password");
    await act(async () => {
      fireEvent.click(hideButton);
    });

    expect(passwordInput.type).toBe("password");
  });

  // ============================================================
  // SUBMISSION TESTS
  // ============================================================
  it("should submit form with valid data", async () => {
    selfRegister.mockResolvedValue({ success: true });

    render(<UserRegistrationForm />, { wrapper: TestWrapper });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/^Username/i), {
        target: { value: "testuser" },
      });
      fireEvent.change(screen.getByLabelText(/^Email/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByLabelText(/^First Name/i), {
        target: { value: "John" },
      });
      fireEvent.change(screen.getByLabelText(/^Last Name/i), {
        target: { value: "Doe" },
      });
    });

    const submitButton = screen.getByRole("button", { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(selfRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "testuser",
          email: "test@example.com",
          password: "password123",
          firstName: "John",
          lastName: "Doe",
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Thank You for Your Application!/i)).toBeInTheDocument();
    });

    const returnButton = screen.getByRole("button", { name: /Return to Login/i });
    await act(async () => {
      fireEvent.click(returnButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should trim whitespace from text fields before submitting", async () => {
    selfRegister.mockResolvedValue({ success: true });

    render(<UserRegistrationForm />, { wrapper: TestWrapper });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/^Username/i), {
        target: { value: "  testuser  " },
      });
      fireEvent.change(screen.getByLabelText(/^Email/i), {
        target: { value: "  test@example.com  " },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByLabelText(/^First Name/i), {
        target: { value: "  John  " },
      });
      fireEvent.change(screen.getByLabelText(/^Last Name/i), {
        target: { value: "  Doe  " },
      });
    });

    const submitButton = screen.getByRole("button", { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(selfRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "testuser",
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
        })
      );
    });
  });

  it("should handle registration failure", async () => {
    const errorMessage = "Username already taken";
    selfRegister.mockResolvedValue({
      success: false,
      message: errorMessage,
    });

    render(<UserRegistrationForm />, { wrapper: TestWrapper });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/^Username/i), {
        target: { value: "testuser" },
      });
      fireEvent.change(screen.getByLabelText(/^Email/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByLabelText(/^First Name/i), {
        target: { value: "John" },
      });
      fireEvent.change(screen.getByLabelText(/^Last Name/i), {
        target: { value: "Doe" },
      });
    });

    const submitButton = screen.getByRole("button", { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
    });

    expect(screen.queryByText(/Thank You for Your Application!/i)).not.toBeInTheDocument();
  });

  it("should handle registration exception with user-friendly message", async () => {
    selfRegister.mockRejectedValue(new Error("Network error"));

    render(<UserRegistrationForm />, { wrapper: TestWrapper });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/^Username/i), {
        target: { value: "testuser" },
      });
      fireEvent.change(screen.getByLabelText(/^Email/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByLabelText(/^First Name/i), {
        target: { value: "John" },
      });
      fireEvent.change(screen.getByLabelText(/^Last Name/i), {
        target: { value: "Doe" },
      });
    });

    const submitButton = screen.getByRole("button", { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Registration failed. Please try again.");
    });
  });

  // ============================================================
  // NAVIGATION TESTS
  // ============================================================
  it("should navigate to login when clicking 'Already have an account?'", async () => {
    render(<UserRegistrationForm />, { wrapper: TestWrapper });

    const alreadyHaveAccountButton = screen.getByText(/Already have an account\? Sign in/i);
    await act(async () => {
      fireEvent.click(alreadyHaveAccountButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  // ============================================================
  // RESPONSIVE DESIGN TESTS
  // ============================================================
  it("should be mobile responsive", () => {
    const { container } = render(<UserRegistrationForm />, { wrapper: TestWrapper });
    const responsiveGrid = container.querySelector(".md\\:grid-cols-2");
    expect(responsiveGrid).toBeTruthy();
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================
  it("should handle whitespace-only username", async () => {
    render(<UserRegistrationForm />, { wrapper: TestWrapper });

    const usernameInput = screen.getByLabelText(/^Username/i);
    await act(async () => {
      fireEvent.change(usernameInput, { target: { value: "   " } });
    });

    const submitButton = screen.getByRole("button", { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Username must be at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it("should show loading state during submission", async () => {
    let resolveRegistration;
    const registrationPromise = new Promise((resolve) => {
      resolveRegistration = resolve;
    });
    selfRegister.mockReturnValue(registrationPromise);

    render(<UserRegistrationForm />, { wrapper: TestWrapper });

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/^Username/i), {
        target: { value: "testuser" },
      });
      fireEvent.change(screen.getByLabelText(/^Email/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByLabelText(/^First Name/i), {
        target: { value: "John" },
      });
      fireEvent.change(screen.getByLabelText(/^Last Name/i), {
        target: { value: "Doe" },
      });
    });

    const submitButton = screen.getByRole("button", { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Creating Account\.\.\./i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    await act(async () => {
      resolveRegistration({ success: true });
    });

    await waitFor(() => {
      expect(screen.queryByText(/Creating Account\.\.\./i)).not.toBeInTheDocument();
    });
  });
});
