import { fireEvent, render, screen, waitFor, act } from "@testing-library/react";
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

  // ✅ FIX: Wrap interactions in act()
  const fillAndSubmit = (username, password) => {
    act(() => {
      fireEvent.change(screen.getByPlaceholderText("Enter username"), {
        target: { value: username },
      });
    });
    act(() => {
      fireEvent.change(screen.getByPlaceholderText("Enter password"), {
        target: { value: password },
      });
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    });
  };

  // ✅ FIX: Wrap render in act()
  const renderComponent = (props = {}) => {
    let result;
    act(() => {
      result = render(
        <TestWrapper>
          <LoginScreen error="" setError={vi.fn()} {...props} />
        </TestWrapper>
      );
    });
    return result;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ensureDocumentBody();
    mockSoundEnabled = true;
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================
  describe("Error handling", () => {
    // ✅ FIX: Already has proper async handling
    it("should display error message on failed login", async () => {
      vi.spyOn(authService, "login").mockResolvedValue({
        success: false,
        message: "Invalid username or password. Please try again.",
      });

      const mockSetError = vi.fn();
      renderComponent({ error: "", setError: mockSetError });

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

    // ✅ FIX: Already has proper async handling
    it("should retain form data on failed login", async () => {
      vi.spyOn(authService, "login").mockResolvedValue({
        success: false,
        message: "Invalid credentials",
      });

      const mockSetError = vi.fn();
      renderComponent({ error: "", setError: mockSetError });

      const usernameInput = screen.getByPlaceholderText("Enter username");
      const passwordInput = screen.getByPlaceholderText("Enter password");
      fillAndSubmit("testuser", "testpass");

      await waitForInDocument(() => {
        expect(authService.login).toHaveBeenCalled();
      });

      expect(usernameInput.value).toBe("testuser");
      expect(passwordInput.value).toBe("testpass");
    });

    // ✅ FIX: Wrap interaction in act()
    it("should clear error when user starts typing", () => {
      const mockSetError = vi.fn();
      renderComponent({ error: "Previous error", setError: mockSetError });

      act(() => {
        fireEvent.change(screen.getByPlaceholderText("Enter username"), {
          target: { value: "newuser" },
        });
      });

      expect(mockSetError).toHaveBeenCalledWith("");
    });

    it("should show error with visible class when error prop is set", () => {
      renderComponent({ error: "Test error message", setError: vi.fn() });

      const errorElement = screen.getByText("Test error message");
      expect(errorElement.className).toContain("visible");
    });

    it("should hide error when error prop is empty", () => {
      renderComponent({ error: "", setError: vi.fn() });

      const errorElement = document.querySelector("[class*='loginError']");
      expect(errorElement).toBeInTheDocument();
      expect(errorElement.className).not.toContain("visible");
    });
  });

  // ============================================================
  // CLIENT-SIDE VALIDATION TESTS
  // ============================================================
  describe("Client-side validation", () => {
    // ✅ FIX: Wrap form submission in act()
    it("should block submit and show an error when fields are empty", () => {
      const mockSetError = vi.fn();
      const loginSpy = vi.spyOn(authService, "login");
      
      renderComponent({ error: "", setError: mockSetError });

      // Submit the form directly using fireEvent.submit
      const form = document.querySelector("form");
      act(() => {
        fireEvent.submit(form);
      });

      expect(mockSetError).toHaveBeenCalledWith(
        "Please enter both username and password",
      );
      expect(loginSpy).not.toHaveBeenCalled();
    });

    // ✅ FIX: Wrap interactions in act()
    it("should show validation message for passwords under 6 characters", () => {
      renderComponent({ error: "", setError: vi.fn() });

      act(() => {
        fireEvent.change(screen.getByPlaceholderText("Enter password"), {
          target: { value: "123" },
        });
      });

      expect(
        screen.getByText("Password must be at least 6 characters"),
      ).toBeInTheDocument();
    });

    // ✅ FIX: Wrap interactions in act()
    it("should clear password validation message once 6+ characters are entered", () => {
      renderComponent({ error: "", setError: vi.fn() });

      const passwordInput = screen.getByPlaceholderText("Enter password");
      act(() => {
        fireEvent.change(passwordInput, { target: { value: "123" } });
      });
      act(() => {
        fireEvent.change(passwordInput, { target: { value: "123456" } });
      });

      expect(
        screen.queryByText("Password must be at least 6 characters"),
      ).not.toBeInTheDocument();
    });

    // ✅ FIX: Wrap interaction in act()
    it("should show no validation message on empty password", () => {
      renderComponent({ error: "", setError: vi.fn() });

      const passwordInput = screen.getByPlaceholderText("Enter password");
      act(() => {
        fireEvent.change(passwordInput, { target: { value: "" } });
      });

      expect(
        screen.queryByText("Password must be at least 6 characters"),
      ).not.toBeInTheDocument();
    });

    // ✅ FIX: Wrap interaction in act()
    it("should apply error class to password input when invalid", () => {
      renderComponent({ error: "", setError: vi.fn() });

      const passwordInput = screen.getByPlaceholderText("Enter password");
      act(() => {
        fireEvent.change(passwordInput, { target: { value: "123" } });
      });

      expect(passwordInput.className).toContain("inputError");
    });

    // ✅ FIX: Wrap interactions in act()
    it("should remove error class when password becomes valid", () => {
      renderComponent({ error: "", setError: vi.fn() });

      const passwordInput = screen.getByPlaceholderText("Enter password");
      act(() => {
        fireEvent.change(passwordInput, { target: { value: "123" } });
      });
      expect(passwordInput.className).toContain("inputError");

      act(() => {
        fireEvent.change(passwordInput, { target: { value: "123456" } });
      });
      expect(passwordInput.className).not.toContain("inputError");
    });

    // ✅ FIX: Wrap interactions in act()
    it("should block submission when password is too short", async () => {
      const loginSpy = vi.spyOn(authService, "login").mockResolvedValue({
        success: true,
        token: "test-token",
        user: { id: 1, username: "user" },
      });

      const mockSetError = vi.fn();
      renderComponent({ error: "", setError: mockSetError });

      fillAndSubmit("user", "123");

      expect(loginSpy).not.toHaveBeenCalled();
      expect(mockSetError).toHaveBeenCalledWith(
        "Password must be at least 6 characters",
      );
    });
  });

  // ============================================================
  // SUCCESSFUL LOGIN TESTS
  // ============================================================
  describe("Successful login", () => {
    // ✅ FIX: Already has proper async handling
    it("should navigate to dashboard on successful login", async () => {
      vi.spyOn(authService, "login").mockResolvedValue({
        success: true,
        user: { id: 1, username: "admin", role: "admin", email: "admin@test.com" },
        token: "test-token",
        message: "Login successful",
      });

      const mockSetError = vi.fn();
      renderComponent({ error: "", setError: mockSetError });

      fillAndSubmit("admin", "correctpass");

      await waitForInDocument(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
        },
        { timeout: 3000 },
      );
    });

    // ✅ FIX: Already has proper async handling
    it("should pass keepMeSignedIn=true to login when checkbox is checked", async () => {
      vi.spyOn(authService, "login").mockResolvedValue({
        success: true,
        token: "test-token",
        user: { id: 1, username: "admin", role: "admin" },
      });

      renderComponent({ error: "", setError: vi.fn() });

      const checkbox = screen.getByRole("checkbox");
      act(() => {
        fireEvent.click(checkbox);
      });
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

    // ✅ FIX: Already has proper async handling
    it("should pass keepMeSignedIn=false when checkbox is unchecked", async () => {
      vi.spyOn(authService, "login").mockResolvedValue({
        success: true,
        token: "test-token",
        user: { id: 1, username: "admin", role: "admin" },
      });

      renderComponent({ error: "", setError: vi.fn() });

      fillAndSubmit("admin", "correctpass");

      await waitForInDocument(() => {
        expect(authService.login).toHaveBeenCalledWith(
          "admin",
          "correctpass",
          false,
        );
      });
    });

    // ✅ FIX: Already has proper async handling
    it("should show loading indicator while login request is pending", async () => {
      let resolveLogin;
      vi.spyOn(authService, "login").mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLogin = resolve;
          }),
      );

      renderComponent({ error: "", setError: vi.fn() });

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
    // ✅ FIX: Wrap interactions in act()
    it("should navigate to /forgot-password", () => {
      renderComponent({ error: "", setError: vi.fn() });

      act(() => {
        fireEvent.click(screen.getByText("Forgot Password?"));
      });
      expect(mockNavigate).toHaveBeenCalledWith("/forgot-password");
    });

    // ✅ FIX: Wrap interactions in act()
    it("should navigate to /register", () => {
      renderComponent({ error: "", setError: vi.fn() });

      act(() => {
        fireEvent.click(screen.getByText("Create Account"));
      });
      expect(mockNavigate).toHaveBeenCalledWith("/register");
    });
  });

  // ============================================================
  // PASSWORD VISIBILITY TOGGLE TESTS
  // ============================================================
  describe("Password visibility toggle", () => {
    // ✅ FIX: Wrap interaction in act()
    it("should toggle password field between hidden and visible", () => {
      renderComponent({ error: "", setError: vi.fn() });

      const passwordInput = screen.getByPlaceholderText("Enter password");
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggleButton = passwordInput.parentElement.querySelector(
        'button[type="button"]',
      );
      act(() => {
        fireEvent.click(toggleButton);
      });
      expect(passwordInput).toHaveAttribute("type", "text");

      act(() => {
        fireEvent.click(toggleButton);
      });
      expect(passwordInput).toHaveAttribute("type", "password");
    });
  });

  // ============================================================
  // FOCUS AND BLUR HANDLING TESTS
  // ============================================================
  describe("Focus and blur handling", () => {
    // ✅ FIX: Wrap interactions in act()
    it("should apply inputFocused class on username focus", () => {
      renderComponent({ error: "", setError: vi.fn() });

      const usernameInput = screen.getByPlaceholderText("Enter username");
      act(() => {
        fireEvent.focus(usernameInput);
      });

      expect(usernameInput.className).toContain("inputFocused");
    });

    // ✅ FIX: Wrap interactions in act()
    it("should remove inputFocused class on username blur", () => {
      renderComponent({ error: "", setError: vi.fn() });

      const usernameInput = screen.getByPlaceholderText("Enter username");
      act(() => {
        fireEvent.focus(usernameInput);
      });
      act(() => {
        fireEvent.blur(usernameInput);
      });

      expect(usernameInput.className).not.toContain("inputFocused");
    });

    // ✅ FIX: Wrap interactions in act()
    it("should apply inputFocused class on password focus", () => {
      renderComponent({ error: "", setError: vi.fn() });

      const passwordInput = screen.getByPlaceholderText("Enter password");
      act(() => {
        fireEvent.focus(passwordInput);
      });

      expect(passwordInput.className).toContain("inputFocused");
    });

    // ✅ FIX: Wrap interactions in act()
    it("should remove inputFocused class on password blur", () => {
      renderComponent({ error: "", setError: vi.fn() });

      const passwordInput = screen.getByPlaceholderText("Enter password");
      act(() => {
        fireEvent.focus(passwordInput);
      });
      act(() => {
        fireEvent.blur(passwordInput);
      });

      expect(passwordInput.className).not.toContain("inputFocused");
    });
  });

  // ============================================================
  // LOGO ANIMATION TESTS
  // ============================================================
  describe("Logo animation", () => {
    it("should animate logo on mount", () => {
      renderComponent({ error: "", setError: vi.fn() });

      const logo = screen.getByAltText("ThermaCore Logo");
      expect(logo).toBeInTheDocument();
      expect(logo.className).toContain("logoSpin");
    });
  });

  // ============================================================
  // SOUND TOGGLE TESTS
  // ============================================================
  describe("Sound toggle", () => {
    it("should show mute icon and title when sound is enabled", () => {
      mockSoundEnabled = true;
      renderComponent({ error: "", setError: vi.fn() });

      expect(screen.getByTitle("Mute sounds")).toBeInTheDocument();
    });

    it("should show unmute icon and title when sound is disabled", () => {
      mockSoundEnabled = false;
      renderComponent({ error: "", setError: vi.fn() });

      expect(screen.getByTitle("Enable sounds")).toBeInTheDocument();
    });

    // ✅ FIX: Wrap interaction in act()
    it("should call toggleSound when volume button is clicked", () => {
      renderComponent({ error: "", setError: vi.fn() });

      act(() => {
        fireEvent.click(screen.getByTitle("Mute sounds"));
      });
      expect(mockToggleSound).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // PROVIDER DIALOGS ('COMING SOON') TESTS
  // ============================================================
  describe("Provider dialogs ('coming soon')", () => {
    // ✅ FIX: Already has proper async handling
    it("should show a coming-soon dialog for Google sign-in", async () => {
      renderComponent({ error: "", setError: vi.fn() });

      act(() => {
        fireEvent.click(screen.getByText("Sign in with Google"));
      });

      await waitForInDocument(() => {
        expect(
          screen.getByText(/Google sign-in is coming soon/i),
        ).toBeInTheDocument();
      });
    });

    // ✅ FIX: Already has proper async handling
    it("should show a coming-soon dialog for Apple sign-in", async () => {
      renderComponent({ error: "", setError: vi.fn() });

      act(() => {
        fireEvent.click(screen.getByText("Sign in with Apple"));
      });

      await waitForInDocument(() => {
        expect(
          screen.getByText(/Apple sign-in is coming soon/i),
        ).toBeInTheDocument();
      });
    });

    // ✅ FIX: Already has proper async handling
    it("should show a coming-soon dialog for biometric sign-in", async () => {
      renderComponent({ error: "", setError: vi.fn() });

      const biometricHeading = screen.getByText("Biometric Sign In");
      const container = biometricHeading.closest("[class*='biometricSection']");
      const triggerButton = container.querySelector("button");
      act(() => {
        fireEvent.click(triggerButton);
      });

      await waitForInDocument(() => {
        expect(
          screen.getByText(/Biometric authentication is coming soon/i),
        ).toBeInTheDocument();
      });
    });

    // ✅ FIX: Already has proper async handling
    it("should close dialog when Close button is clicked", async () => {
      renderComponent({ error: "", setError: vi.fn() });

      act(() => {
        fireEvent.click(screen.getByText("Sign in with Google"));
      });
      
      await waitForInDocument(() => {
        expect(
          screen.getByText(/Google sign-in is coming soon/i),
        ).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByText("Close");
      const closeButton = closeButtons[0];
      act(() => {
        fireEvent.click(closeButton);
      });

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
      renderComponent({ error: "", setError: vi.fn() });

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
    });

    // ✅ FIX: Wrap interactions in act()
    it("should toggle when clicked", () => {
      renderComponent({ error: "", setError: vi.fn() });

      const checkbox = screen.getByRole("checkbox");
      act(() => {
        fireEvent.click(checkbox);
      });
      expect(checkbox).toBeChecked();
      act(() => {
        fireEvent.click(checkbox);
      });
      expect(checkbox).not.toBeChecked();
    });
  });
});
