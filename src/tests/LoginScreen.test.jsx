import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginScreen from "../components/LoginScreen";
import { AuthProvider } from "../context/AuthContext";
import * as authService from "../services/authService";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock SettingsContext
const mockToggleSound = vi.fn();
let mockSoundEnabled = true;
vi.mock("../context/SettingsContext", () => ({
  useSettings: () => ({
    settings: { soundEnabled: mockSoundEnabled },
    toggleSound: mockToggleSound,
  }),
  SettingsProvider: ({ children }) => children,
}));

// Mock ThemeContext
vi.mock("../context/ThemeContext", () => ({
  useTheme: () => ({ actualTheme: "light" }),
  ThemeProvider: ({ children }) => children,
}));

// Mock SocialButton to make it testable with accessible names
vi.mock("../components/SocialButton", () => ({
  default: ({ provider, onClick }) => (
    <button onClick={onClick} type="button">
      Sign in with {provider}
    </button>
  ),
}));

const TestWrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe("LoginScreen", () => {
  const ensureDocumentBody = () => {
    if (!document.body) {
      document.documentElement.appendChild(document.createElement("body"));
    }
  };
  const waitForInDocument = (callback, options) =>
    waitFor(callback, { container: document.body, ...options });

  const fillAndSubmit = (username, password) => {
    fireEvent.change(screen.getByPlaceholderText("Enter username"), {
      target: { value: username },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter password"), {
      target: { value: password },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ensureDocumentBody();
    mockSoundEnabled = true;
    // Reset any mocks
    vi.spyOn(authService, "login").mockReset();
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================
  describe("Error handling", () => {
    it("should display error message on failed login", async () => {
      vi.spyOn(authService, "login").mockResolvedValue({
        success: false,
        message: "Invalid username or password. Please try again.",
      });

      const mockSetError = vi.fn();
      render(
        <TestWrapper>
          <LoginScreen error="" setError={mockSetError} />
        </TestWrapper>,
      );

      fillAndSubmit("wronguser", "wrongpass");

      await waitForInDocument(() => {
        expect(authService.login).toHaveBeenCalledWith(
          "wronguser",
          "wrongpass",
          false,
        );
      });

      await waitForInDocument(() => {
        expect(mockSetError).toHaveBeenCalledWith(
          "Invalid username or password. Please try again.",
        );
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should retain form data on failed login", async () => {
      vi.spyOn(authService, "login").mockResolvedValue({
        success: false,
        message: "Invalid credentials",
      });

      const mockSetError = vi.fn();
      render(
        <TestWrapper>
          <LoginScreen error="" setError={mockSetError} />
        </TestWrapper>,
      );

      const usernameInput = screen.getByPlaceholderText("Enter username");
      const passwordInput = screen.getByPlaceholderText("Enter password");
      fillAndSubmit("testuser", "testpass");

      await waitForInDocument(() => {
        expect(authService.login).toHaveBeenCalled();
      });

      expect(usernameInput.value).toBe("testuser");
      expect(passwordInput.value).toBe("testpass");
    });

    it("should clear error when user starts typing", () => {
      const mockSetError = vi.fn();
      render(
        <TestWrapper>
          <LoginScreen error="Previous error" setError={mockSetError} />
        </TestWrapper>,
      );

      fireEvent.change(screen.getByPlaceholderText("Enter username"), {
        target: { value: "newuser" },
      });

      expect(mockSetError).toHaveBeenCalledWith("");
    });

    it("should show error with visible class when error prop is set", () => {
      render(
        <TestWrapper>
          <LoginScreen error="Test error message" setError={vi.fn()} />
        </TestWrapper>,
      );

      const errorElement = screen.getByText("Test error message");
      // Check if the class name contains "visible" (works with CSS modules)
      expect(errorElement.className).toContain("visible");
    });

    it("should hide error when error prop is empty", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      // The error container should exist but without the visible class
      const errorElement = document.querySelector("[class*='loginError']");
      expect(errorElement).toBeInTheDocument();
      expect(errorElement.className).not.toContain("visible");
    });
  });

  // ============================================================
  // CLIENT-SIDE VALIDATION TESTS
  // ============================================================
  describe("Client-side validation", () => {
    it("should block submit and show an error when fields are empty", () => {
      const mockSetError = vi.fn();
      // Create a fresh spy for authService.login
      const loginSpy = vi.spyOn(authService, "login");
      
      render(
        <TestWrapper>
          <LoginScreen error="" setError={mockSetError} />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

      expect(mockSetError).toHaveBeenCalledWith(
        "Please enter both username and password",
      );
      expect(loginSpy).not.toHaveBeenCalled();
    });

    it("should show validation message for passwords under 6 characters", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      fireEvent.change(screen.getByPlaceholderText("Enter password"), {
        target: { value: "123" },
      });

      expect(
        screen.getByText("Password must be at least 6 characters"),
      ).toBeInTheDocument();
    });

    it("should clear password validation message once 6+ characters are entered", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      const passwordInput = screen.getByPlaceholderText("Enter password");
      fireEvent.change(passwordInput, { target: { value: "123" } });
      fireEvent.change(passwordInput, { target: { value: "123456" } });

      expect(
        screen.queryByText("Password must be at least 6 characters"),
      ).not.toBeInTheDocument();
    });

    it("should show no validation message on empty password", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      const passwordInput = screen.getByPlaceholderText("Enter password");
      fireEvent.change(passwordInput, { target: { value: "" } });

      expect(
        screen.queryByText("Password must be at least 6 characters"),
      ).not.toBeInTheDocument();
    });

    it("should apply error class to password input when invalid", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      const passwordInput = screen.getByPlaceholderText("Enter password");
      fireEvent.change(passwordInput, { target: { value: "123" } });

      // Check if the class name contains "inputError" (works with CSS modules)
      expect(passwordInput.className).toContain("inputError");
    });

    it("should remove error class when password becomes valid", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      const passwordInput = screen.getByPlaceholderText("Enter password");
      fireEvent.change(passwordInput, { target: { value: "123" } });
      expect(passwordInput.className).toContain("inputError");

      fireEvent.change(passwordInput, { target: { value: "123456" } });
      expect(passwordInput.className).not.toContain("inputError");
    });

    it("should block submission when password is too short", async () => {
      const loginSpy = vi.spyOn(authService, "login").mockResolvedValue({
        success: true,
        token: "test-token",
        user: { id: 1, username: "user" },
      });

      const mockSetError = vi.fn();
      render(
        <TestWrapper>
          <LoginScreen error="" setError={mockSetError} />
        </TestWrapper>,
      );

      fillAndSubmit("user", "123");

      // Should NOT call login
      expect(loginSpy).not.toHaveBeenCalled();
      
      // Should show error
      expect(mockSetError).toHaveBeenCalledWith(
        "Password must be at least 6 characters",
      );
    });
  });

  // ============================================================
  // SUCCESSFUL LOGIN TESTS
  // ============================================================
  describe("Successful login", () => {
    it("should navigate to dashboard on successful login", async () => {
      vi.spyOn(authService, "login").mockResolvedValue({
        success: true,
        user: { id: 1, username: "admin", role: "admin", email: "admin@test.com" },
        token: "test-token",
        message: "Login successful",
      });

      const mockSetError = vi.fn();
      render(
        <TestWrapper>
          <LoginScreen error="" setError={mockSetError} />
        </TestWrapper>,
      );

      fillAndSubmit("admin", "correctpass");

      await waitForInDocument(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
        },
        { timeout: 3000 },
      );
    });

    it("should pass keepMeSignedIn=true to login when checkbox is checked", async () => {
      vi.spyOn(authService, "login").mockResolvedValue({
        success: true,
        token: "test-token",
        user: { id: 1, username: "admin", role: "admin" },
      });

      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      fillAndSubmit("admin", "correctpass");

      await waitForInDocument(() => {
        expect(authService.login).toHaveBeenCalledWith(
          "admin",
          "correctpass",
          true,
        );
      });
    });

    it("should pass keepMeSignedIn=false when checkbox is unchecked", async () => {
      vi.spyOn(authService, "login").mockResolvedValue({
        success: true,
        token: "test-token",
        user: { id: 1, username: "admin", role: "admin" },
      });

      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      // Checkbox is unchecked by default
      fillAndSubmit("admin", "correctpass");

      await waitForInDocument(() => {
        expect(authService.login).toHaveBeenCalledWith(
          "admin",
          "correctpass",
          false,
        );
      });
    });

    it("should show loading indicator while login request is pending", async () => {
      let resolveLogin;
      vi.spyOn(authService, "login").mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLogin = resolve;
          }),
      );

      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      fillAndSubmit("admin", "correctpass");

      await waitForInDocument(() => {
        expect(screen.getByRole("img", { name: "Icon" })).toBeInTheDocument();
      });

      resolveLogin({ success: true, token: "test-token", user: { id: 1, username: "admin", role: "admin" } });

      await waitForInDocument(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
      });
    });
  });

  // ============================================================
  // NAVIGATION LINKS TESTS
  // ============================================================
  describe("Navigation links", () => {
    it("should navigate to /forgot-password", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Forgot Password?"));
      expect(mockNavigate).toHaveBeenCalledWith("/forgot-password");
    });

    it("should navigate to /register", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Create Account"));
      expect(mockNavigate).toHaveBeenCalledWith("/register");
    });
  });

  // ============================================================
  // PASSWORD VISIBILITY TOGGLE TESTS
  // ============================================================
  describe("Password visibility toggle", () => {
    it("should toggle password field between hidden and visible", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      const passwordInput = screen.getByPlaceholderText("Enter password");
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggleButton = passwordInput.parentElement.querySelector(
        'button[type="button"]',
      );
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "text");

      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "password");
    });
  });

  // ============================================================
  // FOCUS AND BLUR HANDLING TESTS
  // ============================================================
  describe("Focus and blur handling", () => {
    it("should apply inputFocused class on username focus", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      const usernameInput = screen.getByPlaceholderText("Enter username");
      fireEvent.focus(usernameInput);

      // Check if the class name contains "inputFocused" (works with CSS modules)
      expect(usernameInput.className).toContain("inputFocused");
    });

    it("should remove inputFocused class on username blur", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      const usernameInput = screen.getByPlaceholderText("Enter username");
      fireEvent.focus(usernameInput);
      fireEvent.blur(usernameInput);

      expect(usernameInput.className).not.toContain("inputFocused");
    });

    it("should apply inputFocused class on password focus", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      const passwordInput = screen.getByPlaceholderText("Enter password");
      fireEvent.focus(passwordInput);

      expect(passwordInput.className).toContain("inputFocused");
    });

    it("should remove inputFocused class on password blur", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      const passwordInput = screen.getByPlaceholderText("Enter password");
      fireEvent.focus(passwordInput);
      fireEvent.blur(passwordInput);

      expect(passwordInput.className).not.toContain("inputFocused");
    });
  });

  // ============================================================
  // LOGO ANIMATION TESTS
  // ============================================================
  describe("Logo animation", () => {
    it("should animate logo on mount", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      // Find the logo element by its alt text
      const logo = screen.getByAltText("ThermaCore Logo");
      expect(logo).toBeInTheDocument();
      // Check if the class name contains "logoSpin" (works with CSS modules)
      expect(logo.className).toContain("logoSpin");
    });
  });

  // ============================================================
  // SOUND TOGGLE TESTS
  // ============================================================
  describe("Sound toggle", () => {
    it("should show mute icon and title when sound is enabled", () => {
      mockSoundEnabled = true;
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      expect(screen.getByTitle("Mute sounds")).toBeInTheDocument();
    });

    it("should show unmute icon and title when sound is disabled", () => {
      mockSoundEnabled = false;
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      expect(screen.getByTitle("Enable sounds")).toBeInTheDocument();
    });

    it("should call toggleSound when volume button is clicked", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTitle("Mute sounds"));
      expect(mockToggleSound).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // PROVIDER DIALOGS ('COMING SOON') TESTS
  // ============================================================
  describe("Provider dialogs ('coming soon')", () => {
    it("should show a coming-soon dialog for Google sign-in", async () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Sign in with Google"));

      await waitForInDocument(() => {
        expect(
          screen.getByText(/Google sign-in is coming soon/i),
        ).toBeInTheDocument();
      });
    });

    it("should show a coming-soon dialog for Apple sign-in", async () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Sign in with Apple"));

      await waitForInDocument(() => {
        expect(
          screen.getByText(/Apple sign-in is coming soon/i),
        ).toBeInTheDocument();
      });
    });

    it("should show a coming-soon dialog for biometric sign-in", async () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      // Find the biometric button by its container
      const biometricHeading = screen.getByText("Biometric Sign In");
      const container = biometricHeading.closest("[class*='biometricSection']");
      const triggerButton = container.querySelector("button");
      fireEvent.click(triggerButton);

      await waitForInDocument(() => {
        expect(
          screen.getByText(/Biometric authentication is coming soon/i),
        ).toBeInTheDocument();
      });
    });

    it("should close dialog when Close button is clicked", async () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Sign in with Google"));
      
      await waitForInDocument(() => {
        expect(
          screen.getByText(/Google sign-in is coming soon/i),
        ).toBeInTheDocument();
      });

      // Use getAllByText and pick the first one (the button, not the sr-only span)
      const closeButtons = screen.getAllByText("Close");
      const closeButton = closeButtons[0]; // First one is the button
      fireEvent.click(closeButton);

      // Wait for dialog to close
      await waitForInDocument(() => {
        expect(
          screen.queryByText(/Google sign-in is coming soon/i),
        ).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // "KEEP ME SIGNED IN" TOGGLE TESTS
  // ============================================================
  describe("Keep me signed in checkbox", () => {
    it("should be unchecked by default", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
    });

    it("should toggle when clicked", () => {
      render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} />
        </TestWrapper>,
      );

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });
});
