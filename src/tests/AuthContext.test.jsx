// src/tests/AuthContext.test.jsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "../context/AuthContext";
import * as authService from "../services/authService";
import * as permissions from "../utils/permissions";

// Mock external dependencies
vi.mock("../services/authService");
vi.mock("../utils/permissions");

// ---- storage mocks ----
function makeStorageMock() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
}

// ---- test consumer component ----
const TestConsumer = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="user">{auth.user ? auth.user.username : "none"}</div>
      <div data-testid="role">{auth.userRole || "none"}</div>
      <div data-testid="backendRole">{auth.backendRole || "none"}</div>
      <div data-testid="loading">{auth.isLoading ? "loading" : "loaded"}</div>
      <div data-testid="authed">{auth.isAuthenticated ? "yes" : "no"}</div>
      <div data-testid="loggingout">{auth.isLoggingOut ? "yes" : "no"}</div>
      <div data-testid="permissions">{auth.permissions ? JSON.stringify(auth.permissions) : "none"}</div>
      <button onClick={() => auth.login("u", "p", true)}>login-keep</button>
      <button onClick={() => auth.login("u", "p", false)}>login-session</button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: makeStorageMock(), writable: true });
    Object.defineProperty(window, "sessionStorage", { value: makeStorageMock(), writable: true });
    vi.clearAllMocks();
    
    // Default mock implementations
    permissions.getFrontendRole.mockImplementation((r) => (r === "admin" ? "admin" : "user"));
    permissions.getPermissions.mockImplementation((r) => ({ 
      role: r,
      canEdit: r === "admin",
      canView: true,
      canDelete: r === "admin",
    }));
  });

  // ============ SECTION 1: useAuth Hook Tests ============

  describe("useAuth hook", () => {
    it("throws when useAuth is used outside AuthProvider", () => {
      const Bare = () => { useAuth(); return null; };
      // Suppress React's error boundary console noise
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => render(<Bare />)).toThrow("useAuth must be used within an AuthProvider");
      spy.mockRestore();
    });

    it("returns auth context when used inside provider", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
      expect(screen.getByTestId("loading")).toBeInTheDocument();
    });
  });

  // ============ SECTION 2: Initialization Tests ============

  describe("Initialization", () => {
    it("initializes with no user when nothing is persisted", async () => {
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));
      expect(screen.getByTestId("user").textContent).toBe("none");
      expect(screen.getByTestId("authed").textContent).toBe("no");
      expect(screen.getByTestId("role").textContent).toBe("none");
      expect(screen.getByTestId("backendRole").textContent).toBe("none");
    });

    it("restores session from localStorage on mount", async () => {
      localStorage.setItem("thermacore_user", JSON.stringify({ username: "localuser" }));
      localStorage.setItem("thermacore_role", "admin");
      localStorage.setItem("thermacore_backend_role", "admin");
      localStorage.setItem("thermacore_token", "tok");

      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));
      expect(screen.getByTestId("user").textContent).toBe("localuser");
      expect(screen.getByTestId("role").textContent).toBe("admin");
      expect(screen.getByTestId("backendRole").textContent).toBe("admin");
      expect(screen.getByTestId("authed").textContent).toBe("yes");
    });

    it("falls back to sessionStorage when localStorage is empty", async () => {
      sessionStorage.setItem("thermacore_user", JSON.stringify({ username: "sessuser" }));
      sessionStorage.setItem("thermacore_role", "user");
      sessionStorage.setItem("thermacore_token", "tok2");
      // No backend_role set -> exercises savedBackendRole || savedRole fallback

      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));
      expect(screen.getByTestId("user").textContent).toBe("sessuser");
      expect(screen.getByTestId("role").textContent).toBe("user");
      expect(screen.getByTestId("backendRole").textContent).toBe("user"); // Falls back to savedRole
      expect(screen.getByTestId("authed").textContent).toBe("yes");
    });

    it("falls back to sessionStorage when localStorage session is incomplete", async () => {
      // localStorage has user and role but NO token (incomplete session)
      localStorage.setItem("thermacore_user", JSON.stringify({ username: "partial" }));
      localStorage.setItem("thermacore_role", "admin");
      // No token in localStorage intentionally

      // sessionStorage has a complete valid session
      sessionStorage.setItem("thermacore_user", JSON.stringify({ username: "fallbackuser" }));
      sessionStorage.setItem("thermacore_role", "admin");
      sessionStorage.setItem("thermacore_backend_role", "admin");
      sessionStorage.setItem("thermacore_token", "sess-tok");

      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));
      
      // Should fall back to sessionStorage
      expect(screen.getByTestId("user").textContent).toBe("fallbackuser");
      expect(screen.getByTestId("role").textContent).toBe("admin");
      expect(screen.getByTestId("backendRole").textContent).toBe("admin");
      expect(screen.getByTestId("authed").textContent).toBe("yes");
    });

    it("preserves backend role from localStorage on mount", async () => {
      localStorage.setItem("thermacore_user", JSON.stringify({ username: "adminuser" }));
      localStorage.setItem("thermacore_role", "admin");
      localStorage.setItem("thermacore_backend_role", "operator");
      localStorage.setItem("thermacore_token", "tok");

      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));
      expect(screen.getByTestId("user").textContent).toBe("adminuser");
      expect(screen.getByTestId("role").textContent).toBe("admin");
      expect(screen.getByTestId("backendRole").textContent).toBe("operator");
      expect(screen.getByTestId("authed").textContent).toBe("yes");
    });

    it("handles missing token by not authenticating", async () => {
      localStorage.setItem("thermacore_user", JSON.stringify({ username: "nouser" }));
      localStorage.setItem("thermacore_role", "admin");
      // Intentionally omit token

      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));
      expect(screen.getByTestId("user").textContent).toBe("none");
      expect(screen.getByTestId("authed").textContent).toBe("no");
    });

    it("handles missing user data by not authenticating", async () => {
      localStorage.setItem("thermacore_token", "token");
      localStorage.setItem("thermacore_role", "admin");
      // Intentionally omit user

      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));
      expect(screen.getByTestId("user").textContent).toBe("none");
      expect(screen.getByTestId("authed").textContent).toBe("no");
    });

    it("handles invalid JSON in storage without crashing", async () => {
      localStorage.setItem("thermacore_user", "invalid-json{");
      localStorage.setItem("thermacore_token", "tok");
      localStorage.setItem("thermacore_role", "admin");

      // Should not throw, just not authenticate
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));
      expect(screen.getByTestId("authed").textContent).toBe("no");
      expect(screen.getByTestId("user").textContent).toBe("none");
      
      // Verify corrupt storage was cleared
      expect(localStorage.getItem("thermacore_user")).toBeNull();
      expect(localStorage.getItem("thermacore_token")).toBeNull();
      expect(localStorage.getItem("thermacore_role")).toBeNull();
      expect(localStorage.getItem("thermacore_backend_role")).toBeNull();
    });

    it("handles empty string values in storage", async () => {
      localStorage.setItem("thermacore_user", "");
      localStorage.setItem("thermacore_token", "");
      localStorage.setItem("thermacore_role", "");

      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));
      expect(screen.getByTestId("authed").textContent).toBe("no");
      expect(screen.getByTestId("user").textContent).toBe("none");
    });

    it("handles null string values in storage", async () => {
      localStorage.setItem("thermacore_user", "null");
      localStorage.setItem("thermacore_token", "null");
      localStorage.setItem("thermacore_role", "null");

      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));
      // Should handle null string gracefully - not authenticate
      expect(screen.getByTestId("authed").textContent).toBe("no");
    });
  });

  // ============ SECTION 3: Login Tests ============

  describe("login function", () => {
    it("logs in and persists to localStorage when keepMeSignedIn is true", async () => {
      const mockResult = {
        success: true,
        user: {
          username: "u",
          role: "admin",
          email: "u@x.com",
          firstName: "A",
          lastName: "B",
          tenant_id: "t1"
        },
        token: "tok-abc",
      };

      authService.login.mockResolvedValue(mockResult);
      permissions.getFrontendRole.mockReturnValue("admin");
      permissions.getPermissions.mockReturnValue({
        role: "admin",
        canEdit: true,
        canView: true,
        canDelete: true,
      });

      const user = userEvent.setup();
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      await user.click(screen.getByText("login-keep"));

      await waitFor(() => {
        expect(screen.getByTestId("user").textContent).toBe("u");
        expect(screen.getByTestId("role").textContent).toBe("admin");
        expect(screen.getByTestId("backendRole").textContent).toBe("admin");
        expect(screen.getByTestId("authed").textContent).toBe("yes");
        expect(screen.getByTestId("loading").textContent).toBe("loaded");
      });

      // Verify localStorage was used
      expect(localStorage.getItem("thermacore_token")).toBe("tok-abc");
      expect(localStorage.getItem("thermacore_role")).toBe("admin");
      expect(localStorage.getItem("thermacore_backend_role")).toBe("admin");
      expect(sessionStorage.getItem("thermacore_token")).toBeNull();
    });

    it("logs in and persists to sessionStorage when keepMeSignedIn is false", async () => {
      const mockResult = {
        success: true,
        user: {
          username: "u2",
          role: "operator",
          email: "e@x.com",
          firstName: "F",
          lastName: "L",
          tenant_id: "t2"
        },
        token: "tok-xyz",
      };

      authService.login.mockResolvedValue(mockResult);
      permissions.getFrontendRole.mockReturnValue("user");
      permissions.getPermissions.mockReturnValue({
        role: "operator",
        canEdit: false,
        canView: true,
        canDelete: false,
      });

      const user = userEvent.setup();
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      await user.click(screen.getByText("login-session"));

      await waitFor(() => {
        expect(screen.getByTestId("user").textContent).toBe("u2");
        expect(screen.getByTestId("role").textContent).toBe("user");
        expect(screen.getByTestId("backendRole").textContent).toBe("operator");
        expect(screen.getByTestId("authed").textContent).toBe("yes");
      });

      // Verify sessionStorage was used
      expect(sessionStorage.getItem("thermacore_token")).toBe("tok-xyz");
      expect(sessionStorage.getItem("thermacore_role")).toBe("user");
      expect(sessionStorage.getItem("thermacore_backend_role")).toBe("operator");
      expect(localStorage.getItem("thermacore_token")).toBeNull();
    });

    it("clears opposite storage to prevent conflicts", async () => {
      // Pre-populate both storages
      localStorage.setItem("thermacore_token", "old-local-token");
      sessionStorage.setItem("thermacore_token", "old-session-token");

      const mockResult = {
        success: true,
        user: {
          username: "newuser",
          role: "admin",
          email: "new@x.com",
          firstName: "New",
          lastName: "User",
          tenant_id: "t3"
        },
        token: "new-token",
      };

      authService.login.mockResolvedValue(mockResult);
      permissions.getFrontendRole.mockReturnValue("admin");
      permissions.getPermissions.mockReturnValue({
        role: "admin",
        canEdit: true,
        canView: true,
        canDelete: true,
      });

      const user = userEvent.setup();
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      // Login with keepMeSignedIn = true (should use localStorage, clear sessionStorage)
      await user.click(screen.getByText("login-keep"));

      await waitFor(() => {
        expect(screen.getByTestId("authed").textContent).toBe("yes");
      });

      // Should keep localStorage, clear sessionStorage
      expect(localStorage.getItem("thermacore_token")).toBe("new-token");
      expect(sessionStorage.getItem("thermacore_token")).toBeNull();
    });

    it("handles minimal user data from login response", async () => {
      const mockResult = {
        success: true,
        user: {
          username: "minimal",
          role: "admin",
          // No email, firstName, lastName, tenant_id
        },
        token: "minimal-token",
      };

      authService.login.mockResolvedValue(mockResult);
      permissions.getFrontendRole.mockReturnValue("admin");
      permissions.getPermissions.mockReturnValue({
        role: "admin",
        canEdit: true,
        canView: true,
        canDelete: true,
      });

      const user = userEvent.setup();
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      await user.click(screen.getByText("login-keep"));

      await waitFor(() => {
        expect(screen.getByTestId("user").textContent).toBe("minimal");
        expect(screen.getByTestId("role").textContent).toBe("admin");
        expect(screen.getByTestId("backendRole").textContent).toBe("admin");
        expect(screen.getByTestId("authed").textContent).toBe("yes");
      });
    });

    it("returns server error message on failed login", async () => {
      authService.login.mockResolvedValue({ 
        success: false, 
        message: "Account locked due to too many failed attempts" 
      });

      let result;
      const CaptureConsumer = () => {
        const auth = useAuth();
        const handleLogin = async () => {
          result = await auth.login("u", "p", false);
        };
        return <button onClick={handleLogin}>login-capture</button>;
      };

      const user = userEvent.setup();
      render(
        <AuthProvider>
          <CaptureConsumer />
        </AuthProvider>
      );
      
      await user.click(screen.getByText("login-capture"));

      await waitFor(() => {
        expect(result).toEqual({
          success: false,
          error: "Account locked due to too many failed attempts"
        });
      });
    });

    it("returns default error message when server gives no message", async () => {
      authService.login.mockResolvedValue({ success: false });

      let result;
      const CaptureConsumer = () => {
        const auth = useAuth();
        const handleLogin = async () => {
          result = await auth.login("u", "p", false);
        };
        return <button onClick={handleLogin}>login-capture</button>;
      };

      const user = userEvent.setup();
      render(
        <AuthProvider>
          <CaptureConsumer />
        </AuthProvider>
      );
      
      await user.click(screen.getByText("login-capture"));

      await waitFor(() => {
        expect(result).toEqual({
          success: false,
          error: "Invalid username or password. Please try again."
        });
      });
    });

    it("returns default error message when login throws", async () => {
      authService.login.mockRejectedValue(new Error("Network connection failed"));

      let result;
      const CaptureConsumer = () => {
        const auth = useAuth();
        const handleLogin = async () => {
          result = await auth.login("u", "p", false);
        };
        return <button onClick={handleLogin}>login-capture</button>;
      };

      const user = userEvent.setup();
      render(
        <AuthProvider>
          <CaptureConsumer />
        </AuthProvider>
      );
      
      await user.click(screen.getByText("login-capture"));

      await waitFor(() => {
        expect(result).toEqual({
          success: false,
          error: "Invalid username or password. Please try again."
        });
      });
    });

    it("returns storage error when storage write fails", async () => {
      const mockResult = {
        success: true,
        user: {
          username: "storagefail",
          role: "admin",
          email: "e@x.com",
          firstName: "F",
          lastName: "L",
          tenant_id: "t4"
        },
        token: "fail-token",
      };

      authService.login.mockResolvedValue(mockResult);
      permissions.getFrontendRole.mockReturnValue("admin");
      permissions.getPermissions.mockReturnValue({
        role: "admin",
        canEdit: true,
        canView: true,
        canDelete: true,
      });

      // Mock localStorage.setItem to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error("Storage quota exceeded");
      });

      let result;
      const CaptureConsumer = () => {
        const auth = useAuth();
        const handleLogin = async () => {
          result = await auth.login("u", "p", true);
        };
        return <button onClick={handleLogin}>login-capture</button>;
      };

      const user = userEvent.setup();
      render(
        <AuthProvider>
          <CaptureConsumer />
        </AuthProvider>
      );
      
      await user.click(screen.getByText("login-capture"));

      await waitFor(() => {
        expect(result).toEqual({
          success: false,
          error: "Unable to save session. Please check your browser storage settings."
        });
      });

      // User should remain unauthenticated
      expect(screen.queryByTestId("authed")).not.toBeInTheDocument();
      
      // Restore original
      localStorage.setItem = originalSetItem;
    });

    it("calls getFrontendRole with correct backend role", async () => {
      const mockResult = {
        success: true,
        user: {
          username: "roleuser",
          role: "operator",
          email: "e@x.com",
          firstName: "F",
          lastName: "L",
          tenant_id: "t5"
        },
        token: "role-token",
      };

      authService.login.mockResolvedValue(mockResult);
      permissions.getFrontendRole.mockReturnValue("user");
      permissions.getPermissions.mockReturnValue({
        role: "operator",
        canEdit: false,
        canView: true,
        canDelete: false,
      });

      const user = userEvent.setup();
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      await user.click(screen.getByText("login-keep"));

      await waitFor(() => {
        expect(permissions.getFrontendRole).toHaveBeenCalledWith("operator");
        expect(screen.getByTestId("role").textContent).toBe("user");
        expect(screen.getByTestId("backendRole").textContent).toBe("operator");
      });
    });

    it("sets permissions based on backend role", async () => {
      const mockPermissions = {
        role: "admin",
        canEdit: true,
        canView: true,
        canDelete: true,
        canApprove: true,
        canConfigure: true,
      };

      const mockResult = {
        success: true,
        user: {
          username: "permuser",
          role: "admin",
          email: "e@x.com",
          firstName: "F",
          lastName: "L",
          tenant_id: "t6"
        },
        token: "perm-token",
      };

      authService.login.mockResolvedValue(mockResult);
      permissions.getFrontendRole.mockReturnValue("admin");
      permissions.getPermissions.mockReturnValue(mockPermissions);

      const user = userEvent.setup();
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      await user.click(screen.getByText("login-keep"));

      await waitFor(() => {
        expect(JSON.parse(screen.getByTestId("permissions").textContent)).toEqual(mockPermissions);
      });
    });

    it("shows loading state during login", async () => {
      // Make login slow to test loading state
      authService.login.mockImplementation(
        () => new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            user: {
              username: "slowuser",
              role: "admin",
              email: "slow@x.com",
              firstName: "Slow",
              lastName: "User",
              tenant_id: "t7"
            },
            token: "slow-token",
          }), 100)
        )
      );

      permissions.getFrontendRole.mockReturnValue("admin");
      permissions.getPermissions.mockReturnValue({
        role: "admin",
        canEdit: true,
        canView: true,
        canDelete: true,
      });

      const user = userEvent.setup();
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      // Start login
      await user.click(screen.getByText("login-keep"));

      // Should be loading
      expect(screen.getByTestId("loading").textContent).toBe("loading");

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("loaded");
        expect(screen.getByTestId("authed").textContent).toBe("yes");
      });
    });
  });

  // ============ SECTION 4: Logout Tests ============

  describe("logout function", () => {
    it("logs out and clears both storages", async () => {
      // First login
      const mockResult = {
        success: true,
        user: {
          username: "logoutuser",
          role: "admin",
          email: "e@x.com",
          firstName: "F",
          lastName: "L",
          tenant_id: "t8"
        },
        token: "logout-token",
      };

      authService.login.mockResolvedValue(mockResult);
      permissions.getFrontendRole.mockReturnValue("admin");
      permissions.getPermissions.mockReturnValue({
        role: "admin",
        canEdit: true,
        canView: true,
        canDelete: true,
      });

      const user = userEvent.setup();
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      // Login
      await user.click(screen.getByText("login-keep"));
      await waitFor(() => {
        expect(screen.getByTestId("authed").textContent).toBe("yes");
        expect(localStorage.getItem("thermacore_token")).toBe("logout-token");
      });

      // Now logout
      await user.click(screen.getByText("logout"));

      await waitFor(() => {
        expect(screen.getByTestId("authed").textContent).toBe("no");
        expect(screen.getByTestId("user").textContent).toBe("none");
        expect(screen.getByTestId("role").textContent).toBe("none");
        expect(screen.getByTestId("backendRole").textContent).toBe("none");
        expect(screen.getByTestId("permissions").textContent).toBe("none");
        expect(screen.getByTestId("loggingout").textContent).toBe("no");
      });

      // Verify all storage is cleared
      expect(localStorage.getItem("thermacore_token")).toBeNull();
      expect(localStorage.getItem("thermacore_user")).toBeNull();
      expect(localStorage.getItem("thermacore_role")).toBeNull();
      expect(localStorage.getItem("thermacore_backend_role")).toBeNull();
      expect(sessionStorage.getItem("thermacore_token")).toBeNull();
      expect(sessionStorage.getItem("thermacore_user")).toBeNull();
      expect(sessionStorage.getItem("thermacore_role")).toBeNull();
      expect(sessionStorage.getItem("thermacore_backend_role")).toBeNull();
    });

    it("shows isLoggingOut as true during the logout transition", async () => {
      // First login
      const mockResult = {
        success: true,
        user: {
          username: "stateuser",
          role: "admin",
          email: "e@x.com",
          firstName: "F",
          lastName: "L",
          tenant_id: "t9"
        },
        token: "state-token",
      };

      authService.login.mockResolvedValue(mockResult);
      permissions.getFrontendRole.mockReturnValue("admin");
      permissions.getPermissions.mockReturnValue({
        role: "admin",
        canEdit: true,
        canView: true,
        canDelete: true,
      });

      const user = userEvent.setup();
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      // Login
      await user.click(screen.getByText("login-keep"));
      await waitFor(() => {
        expect(screen.getByTestId("authed").textContent).toBe("yes");
      });

      // Use fireEvent (synchronous) to catch the intermediate state
      fireEvent.click(screen.getByText("logout"));
      
      // isLoggingOut should be true immediately after the click
      // The setTimeout(0) hasn't run yet, so state is still true
      expect(screen.getByTestId("loggingout").textContent).toBe("yes");

      // Wait for the logout to complete
      await waitFor(() => {
        expect(screen.getByTestId("loggingout").textContent).toBe("no");
        expect(screen.getByTestId("authed").textContent).toBe("no");
      });
    });

    it("handles logout when already logged out", async () => {
      const user = userEvent.setup();
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      // Should already be logged out
      expect(screen.getByTestId("authed").textContent).toBe("no");

      // Click logout
      await user.click(screen.getByText("logout"));

      // Should remain logged out
      expect(screen.getByTestId("authed").textContent).toBe("no");
      expect(screen.getByTestId("user").textContent).toBe("none");
    });
  });

  // ============ SECTION 5: Custom Value Tests ============

  describe("customValue prop", () => {
    it("uses the injected custom value instead of internal state when provided", () => {
      const customValue = {
        user: { username: "mocked" },
        userRole: "admin",
        backendRole: "admin",
        permissions: { custom: true },
        login: vi.fn(),
        logout: vi.fn(),
        isAuthenticated: true,
        isLoading: false,
        isLoggingOut: false,
      };

      render(
        <AuthProvider value={customValue}>
          <TestConsumer />
        </AuthProvider>
      );

      expect(screen.getByTestId("user").textContent).toBe("mocked");
      expect(screen.getByTestId("role").textContent).toBe("admin");
      expect(screen.getByTestId("backendRole").textContent).toBe("admin");
      expect(screen.getByTestId("loading").textContent).toBe("loaded");
      expect(screen.getByTestId("authed").textContent).toBe("yes");
      expect(screen.getByTestId("permissions").textContent).toBe('{"custom":true}');
    });

    it("uses internal state when customValue is not provided", () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      expect(screen.getByTestId("user").textContent).toBe("none");
      expect(screen.getByTestId("loading").textContent).toBe("loading");
    });
  });

  // ============ SECTION 6: Permission Conversion Tests ============

  describe("Role conversion", () => {
    it("converts admin backend role to admin frontend role", async () => {
      const mockResult = {
        success: true,
        user: {
          username: "adminuser",
          role: "admin",
          email: "e@x.com",
          firstName: "F",
          lastName: "L",
          tenant_id: "t10"
        },
        token: "admin-token",
      };

      authService.login.mockResolvedValue(mockResult);
      permissions.getFrontendRole.mockReturnValue("admin");
      permissions.getPermissions.mockReturnValue({
        role: "admin",
        canEdit: true,
        canView: true,
        canDelete: true,
      });

      const user = userEvent.setup();
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      await user.click(screen.getByText("login-keep"));

      await waitFor(() => {
        expect(permissions.getFrontendRole).toHaveBeenCalledWith("admin");
        expect(screen.getByTestId("role").textContent).toBe("admin");
      });
    });

    it("converts operator backend role to user frontend role", async () => {
      const mockResult = {
        success: true,
        user: {
          username: "operatoruser",
          role: "operator",
          email: "e@x.com",
          firstName: "F",
          lastName: "L",
          tenant_id: "t11"
        },
        token: "operator-token",
      };

      authService.login.mockResolvedValue(mockResult);
      permissions.getFrontendRole.mockReturnValue("user");
      permissions.getPermissions.mockReturnValue({
        role: "operator",
        canEdit: false,
        canView: true,
        canDelete: false,
      });

      const user = userEvent.setup();
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      await user.click(screen.getByText("login-keep"));

      await waitFor(() => {
        expect(permissions.getFrontendRole).toHaveBeenCalledWith("operator");
        expect(screen.getByTestId("role").textContent).toBe("user");
      });
    });

    it("converts viewer backend role to user frontend role", async () => {
      const mockResult = {
        success: true,
        user: {
          username: "vieweruser",
          role: "viewer",
          email: "e@x.com",
          firstName: "F",
          lastName: "L",
          tenant_id: "t12"
        },
        token: "viewer-token",
      };

      authService.login.mockResolvedValue(mockResult);
      permissions.getFrontendRole.mockReturnValue("user");
      permissions.getPermissions.mockReturnValue({
        role: "viewer",
        canEdit: false,
        canView: true,
        canDelete: false,
      });

      const user = userEvent.setup();
      render(<AuthProvider><TestConsumer /></AuthProvider>);
      await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("loaded"));

      await user.click(screen.getByText("login-keep"));

      await waitFor(() => {
        expect(permissions.getFrontendRole).toHaveBeenCalledWith("viewer");
        expect(screen.getByTestId("role").textContent).toBe("user");
      });
    });
  });
});
