/**
 * Comprehensive Authentication Service Tests
 * Covers all auth functions with full branch coverage
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAuthToken,
  getCurrentUser,
  isAuthenticated,
  login,
  logout,
  register,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  verifyToken,
  selfRegister,
} from "../services/authService";
import { apiPost } from "../utils/apiFetch";

// Mock apiPost for selfRegister
vi.mock("../utils/apiFetch", () => ({
  apiPost: vi.fn(),
}));

// Ensure fetch is always a mock
if (!global.fetch || !vi.isMockFunction(global.fetch)) {
  global.fetch = vi.fn();
}

describe("authService", () => {
  let fetchSpy;

  beforeEach(async () => {
    vi.useFakeTimers();

    fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    // Reset module state via logout
    const logoutPromise = logout();
    vi.advanceTimersByTime(200);
    await logoutPromise;

    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
  });

  // ============================================================
  // INITIAL STATE TESTS
  // ============================================================

  describe("Initial State", () => {
    it("should initially not be authenticated", async () => {
      expect(isAuthenticated()).toBe(false);
      expect(getAuthToken()).toBeNull();
      expect(await getCurrentUser()).toBeNull();
    });
  });

  // ============================================================
  // LOGIN TESTS
  // ============================================================

  describe("login", () => {
    it("should successfully login with valid credentials", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "test-token-123",
          user: {
            id: 1,
            username: "testuser",
            email: "test@example.com",
            role: { name: "admin" },
            first_name: "Test",
            last_name: "User",
          },
        },
        message: "Login successful",
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await login("testuser", "password");

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: 1,
        username: "testuser",
        email: "test@example.com",
        role: "admin",
        firstName: "Test",
        lastName: "User",
      });
      expect(result.token).toBe("test-token-123");
      expect(result.message).toBe("Login successful");
      expect(isAuthenticated()).toBe(true);
      expect(getAuthToken()).toBe("test-token-123");
    });

    it("should make a POST request to the correct endpoint with proper headers", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "test-token-123",
          user: {
            id: 1,
            username: "testuser",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
        message: "Login successful",
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await login("testuser", "password123");

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/login"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "testuser",
            password: "password123",
            keep_me_signed_in: false,
          }),
        }),
      );
    });

    it("should handle login with email instead of username", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "token-456",
          user: {
            id: 2,
            username: "user2",
            email: "user@example.com",
            role: "user",
            first_name: "Regular",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await login("user@example.com", "password");

      expect(result.success).toBe(true);
      expect(result.user.email).toBe("user@example.com");
    });

    it("should handle role as string instead of object", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "token-789",
          user: {
            id: 3,
            username: "user3",
            email: "user3@example.com",
            role: "technician",
            first_name: "Tech",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await login("user3", "password");

      expect(result.success).toBe(true);
      expect(result.user.role).toBe("technician");
    });

    it("should handle role as object with name property", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "token-xyz",
          user: {
            id: 3,
            username: "user",
            email: "user@example.com",
            role: { name: "user" },
            first_name: "Regular",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await login("user", "userpass");

      expect(result.success).toBe(true);
      expect(result.user.role).toBe("user");
    });

    it("should send keep_me_signed_in parameter when true", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "token-persistent",
          user: {
            id: 4,
            username: "persistent-user",
            email: "persistent@example.com",
            role: "user",
            first_name: "Persistent",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await login("persistent-user", "password", true);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/login"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            username: "persistent-user",
            password: "password",
            keep_me_signed_in: true,
          }),
        }),
      );
    });

    it("should fail with invalid credentials (401/403) with generic message", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          message: "Invalid credentials",
        }),
      });

      const result = await login("wronguser", "wrongpass");

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Invalid username or password. Please try again.",
      );
      expect(isAuthenticated()).toBe(false);
    });

    it("should use generic message for 200 with success:false to prevent enumeration", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          message: "Account disabled",
        }),
      });

      const result = await login("disableduser", "password");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid username or password. Please try again.");
      expect(isAuthenticated()).toBe(false);
    });

    it("should handle network errors gracefully with generic message", async () => {
      fetchSpy.mockRejectedValue(new Error("Network error"));

      const result = await login("testuser", "password");

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Invalid username or password. Please try again.",
      );
      expect(isAuthenticated()).toBe(false);
    });

    it("should use generic message when response.ok is false without success field", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { message: "Account locked" },
        }),
      });

      const result = await login("lockeduser", "password");

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Invalid username or password. Please try again.",
      );
    });

    it("should use custom message from backend on success", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "token",
          user: {
            id: 1,
            username: "test",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
        message: "Welcome back!",
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await login("test", "password");

      expect(result.message).toBe("Welcome back!");
    });

    it("should use default message when backend doesn't provide one", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "token",
          user: {
            id: 1,
            username: "test",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await login("test", "password");

      expect(result.message).toBe("Login successful");
    });

    it("should fall back to data.token when access_token is absent", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            token: "fallback-token",
            user: { id: 1, username: "a", email: "a@a.com" },
          },
        }),
      });
      const result = await login("a", "p");
      expect(result.token).toBe("fallback-token");
    });

    it("should fall back to top-level access_token when data is absent", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          access_token: "top-level-token",
          data: { user: { id: 1, username: "a", email: "a@a.com" } },
        }),
      });
      const result = await login("a", "p");
      expect(result.token).toBe("top-level-token");
    });

    it("should fall back to top-level token when all other token fields are absent", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          token: "last-resort-token",
          data: { user: { id: 1, username: "a", email: "a@a.com" } },
        }),
      });
      const result = await login("a", "p");
      expect(result.token).toBe("last-resort-token");
    });

    it("should set token to null when no token field is present anywhere", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: { id: 1, username: "a", email: "a@a.com" } },
        }),
      });
      const result = await login("a", "p");
      expect(result.token).toBeNull();
      expect(isAuthenticated()).toBe(false);
    });

    it("should default role to 'user' when absent", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            access_token: "t",
            user: { id: 1, username: "a", email: "a@a.com" },
          },
        }),
      });
      const result = await login("a", "p");
      expect(result.user.role).toBe("user");
    });

    it("should default firstName/lastName to empty string when absent", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            access_token: "t",
            user: { id: 1, username: "a", email: "a@a.com" },
          },
        }),
      });
      const result = await login("a", "p");
      expect(result.user.firstName).toBe("");
      expect(result.user.lastName).toBe("");
    });

    it("should persist to localStorage when keepMeSignedIn is true", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            access_token: "persist-token",
            user: { id: 1, username: "a", email: "a@a.com" },
          },
        }),
      });
      await login("a", "p", true);
      expect(localStorage.getItem("auth_token")).toBe("persist-token");
      expect(JSON.parse(localStorage.getItem("user")).username).toBe("a");
    });
  });

  // ============================================================
  // LOGOUT TESTS
  // ============================================================

  describe("logout", () => {
    it("should successfully logout user", async () => {
      // First login to have a user session
      const mockResponse = {
        success: true,
        data: {
          access_token: "token",
          user: {
            id: 1,
            username: "test",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await login("test", "password");
      expect(isAuthenticated()).toBe(true);

      const result = await logout();

      expect(result.success).toBe(true);
      expect(result.message).toBe("Logout successful");
      expect(isAuthenticated()).toBe(false);
    });

    it("should clear user and token on logout", async () => {
      // Login first
      const mockResponse = {
        success: true,
        data: {
          access_token: "token",
          user: {
            id: 1,
            username: "test",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await login("test", "password");

      await logout();

      const user = await getCurrentUser();
      const token = getAuthToken();

      expect(user).toBeNull();
      expect(token).toBeNull();
    });
  });

  // ============================================================
  // GET CURRENT USER TESTS
  // ============================================================

  describe("getCurrentUser", () => {
    it("should return null when no user is logged in", async () => {
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it("should return current user when logged in", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "token",
          user: {
            id: 1,
            username: "testuser",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await login("testuser", "password");
      const user = await getCurrentUser();

      expect(user).toEqual({
        id: 1,
        username: "testuser",
        email: "test@example.com",
        role: "admin",
        firstName: "Test",
        lastName: "User",
      });
    });

    it("should clear expired token from localStorage on restore", async () => {
      // Create an expired token in localStorage
      const expiredToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MDAwMDAwMDB9.expired";
      const user = { id: 1, username: "test", email: "test@example.com", role: "user" };
      localStorage.setItem("auth_token", expiredToken);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token_expiry", "1500000000000");

      const result = await getCurrentUser();
      expect(result).toBeNull();
      expect(localStorage.getItem("auth_token")).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
    });
  });

  // ============================================================
  // AUTHENTICATION STATUS TESTS
  // ============================================================

  describe("isAuthenticated", () => {
    it("should return false when not authenticated", () => {
      expect(isAuthenticated()).toBe(false);
    });

    it("should return true when authenticated", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "token",
          user: {
            id: 1,
            username: "test",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await login("test", "password");
      expect(isAuthenticated()).toBe(true);
    });

    it("should return false after logout", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "token",
          user: {
            id: 1,
            username: "test",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await login("test", "password");
      await logout();
      expect(isAuthenticated()).toBe(false);
    });

    it("should return false when token is expired", async () => {
      // Create an expired token
      const expiredToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MDAwMDAwMDB9.expired";
      const user = { id: 1, username: "test", email: "test@example.com", role: "user" };
      localStorage.setItem("auth_token", expiredToken);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token_expiry", "1500000000000");

      // Force state to be set
      await getCurrentUser();
      expect(isAuthenticated()).toBe(false);
    });
  });

  // ============================================================
  // GET AUTH TOKEN TESTS
  // ============================================================

  describe("getAuthToken", () => {
    it("should return null when not authenticated", () => {
      expect(getAuthToken()).toBeNull();
    });

    it("should return token when authenticated", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "my-auth-token",
          user: {
            id: 1,
            username: "test",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await login("test", "password");
      expect(getAuthToken()).toBe("my-auth-token");
    });

    it("should return null when token is expired", async () => {
      const expiredToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MDAwMDAwMDB9.expired";
      const user = { id: 1, username: "test", email: "test@example.com", role: "user" };
      localStorage.setItem("auth_token", expiredToken);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token_expiry", "1500000000000");

      await getCurrentUser();
      expect(getAuthToken()).toBeNull();
    });
  });

  // ============================================================
  // VERIFY TOKEN TESTS
  // ============================================================

  describe("verifyToken", () => {
    it("should verify valid token", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "valid-token",
          user: {
            id: 1,
            username: "test",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await login("test", "password");
      const result = await verifyToken("valid-token");

      expect(result.valid).toBe(true);
      expect(result.user).toBeTruthy();
    });

    it("should reject invalid token", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "valid-token",
          user: {
            id: 1,
            username: "test",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await login("test", "password");
      const result = await verifyToken("invalid-token");

      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
    });

    it("should reject token when no user is logged in", async () => {
      const result = await verifyToken("some-token");

      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
    });

    it("should verify token without explicit token using current auth token", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "current-token",
          user: {
            id: 1,
            username: "test",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await login("test", "password");
      const result = await verifyToken();

      expect(result.valid).toBe(true);
      expect(result.user).toBeTruthy();
    });

    it("should verify a token that differs from the current auth token via backend", async () => {
      // Login first to set current user
      const loginResponse = {
        success: true,
        data: {
          access_token: "current-token",
          user: {
            id: 1,
            username: "test",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => loginResponse,
      });
      await login("test", "password");

      // Mock backend verification for a different token
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: {
              id: 5,
              username: "other",
              email: "o@o.com",
              role: { name: "tech" },
              first_name: "Other",
              last_name: "User",
            },
          },
        }),
      });

      const result = await verifyToken("some-other-token");
      expect(result.valid).toBe(true);
      expect(result.user.role).toBe("tech");
    });

    it("should return invalid when backend responds with success:false", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false }),
      });
      const result = await verifyToken("bad-token");
      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
    });

    it("should reject expired token", async () => {
      const expiredToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MDAwMDAwMDB9.expired";
      const result = await verifyToken(expiredToken);
      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
    });
  });

  // ============================================================
  // REGISTER TESTS
  // ============================================================

  describe("register", () => {
    it("should successfully register new user", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: "Registration successful",
        }),
      });

      const userData = {
        username: "newuser",
        email: "new@example.com",
        password: "password123",
        firstName: "New",
        lastName: "User",
      };

      const result = await register(userData);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Registration successful");
    });

    it("should handle registration failure", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          message: "Username already exists",
        }),
      });

      const userData = {
        username: "existinguser",
        email: "existing@example.com",
        password: "password123",
      };

      const result = await register(userData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Username already exists");
    });

    it("should handle network errors during registration", async () => {
      fetchSpy.mockRejectedValue(new Error("Network error"));

      const userData = {
        username: "newuser",
        email: "new@example.com",
        password: "password123",
      };

      const result = await register(userData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Registration failed. Please try again.");
    });

    it("should handle error response without message", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      const userData = {
        username: "newuser",
        email: "new@example.com",
        password: "password123",
      };

      const result = await register(userData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Registration failed. Please try again.");
    });

    it("should use error.message from error object", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { message: "Email already registered" },
        }),
      });

      const userData = {
        username: "newuser",
        email: "existing@example.com",
        password: "password123",
      };

      const result = await register(userData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Email already registered");
    });
  });

  // ============================================================
  // SELF REGISTER TESTS
  // ============================================================

  describe("selfRegister", () => {
    it("should submit self registration request successfully", async () => {
      vi.mocked(apiPost).mockResolvedValueOnce({
        success: true,
        message: "Account request submitted",
      });

      const result = await selfRegister({
        username: "self_reg",
        email: "self@example.com",
        password: "password123",
        firstName: "Self",
        lastName: "User",
      });

      expect(apiPost).toHaveBeenCalledWith(
        "/auth/self-register",
        expect.any(Object),
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("pending admin approval");
    });

    it("should return failure message from error.response.data.error.message", async () => {
      vi.mocked(apiPost).mockRejectedValueOnce({
        response: { data: { error: { message: "Username taken" } } },
      });

      const result = await selfRegister({
        username: "x",
        email: "x@x.com",
        password: "p",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Username taken");
    });

    it("should fall back to error.response.data.message", async () => {
      vi.mocked(apiPost).mockRejectedValueOnce({
        response: { data: { message: "Validation failed" } },
      });

      const result = await selfRegister({
        username: "x",
        email: "x@x.com",
        password: "p",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Validation failed");
    });

    it("should fall back to error.message", async () => {
      vi.mocked(apiPost).mockRejectedValueOnce(new Error("Network down"));

      const result = await selfRegister({
        username: "x",
        email: "x@x.com",
        password: "p",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Network down");
    });

    it("should use default message when error has no details", async () => {
      vi.mocked(apiPost).mockRejectedValueOnce({});

      const result = await selfRegister({
        username: "x",
        email: "x@x.com",
        password: "p",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Registration failed. Please try again.");
    });

    it("should use default success message when backend gives none", async () => {
      vi.mocked(apiPost).mockResolvedValueOnce({});

      const result = await selfRegister({
        username: "x",
        email: "x@x.com",
        password: "p",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("pending admin approval");
    });
  });

  // ============================================================
  // PASSWORD RESET TESTS
  // ============================================================

  describe("requestPasswordReset", () => {
    it("should return neutral message on success to prevent email enumeration", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: "Reset email sent",
        }),
      });

      const result = await requestPasswordReset("test@example.com");

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        "If the email exists, a password reset link has been sent",
      );
    });

    it("should return neutral message on failure to prevent email enumeration", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: "Email not found" },
        }),
      });

      const result = await requestPasswordReset("nonexistent@example.com");

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Unable to process password reset request. Please try again.",
      );
    });

    it("should handle network errors gracefully with neutral message", async () => {
      fetchSpy.mockRejectedValue(new Error("Network error"));

      const result = await requestPasswordReset("test@example.com");

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Unable to process password reset request. Please try again.",
      );
    });
  });

  // ============================================================
  // RESET PASSWORD TESTS
  // ============================================================

  describe("resetPassword", () => {
    it("should successfully reset password with valid token", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: "Password reset successfully",
        }),
      });

      const result = await resetPassword("valid-token", "newPassword123");

      expect(result.success).toBe(true);
      expect(result.message).toContain("successfully");
    });

    it("should prefer data.message over message on success", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { message: "Nested" },
          message: "Top",
        }),
      });

      const result = await resetPassword("token", "newPass123");

      expect(result.message).toBe("Nested");
    });

    it("should fall back to data.message over message on failure", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          data: { message: "Token expired" },
        }),
      });

      const result = await resetPassword("token", "newPass123");

      expect(result.message).toBe("Token expired");
    });

    it("should use default failure message when nothing provided", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      const result = await resetPassword("token", "newPass123");

      expect(result.message).toBe(
        "Invalid or expired reset token. Please request a new one.",
      );
    });

    it("should handle invalid token", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: "Invalid or expired token" },
        }),
      });

      const result = await resetPassword("invalid-token", "newPassword123");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid or expired token");
    });

    it("should handle network errors", async () => {
      fetchSpy.mockRejectedValue(new Error("Network error"));

      const result = await resetPassword("token", "newPassword123");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Unable to reset password. Please try again.");
    });
  });

  // ============================================================
  // UPDATE PROFILE TESTS
  // ============================================================

  describe("updateProfile", () => {
    it("should successfully update profile when authenticated", async () => {
      // First login
      const loginResponse = {
        success: true,
        data: {
          access_token: "token",
          user: {
            id: 1,
            username: "testuser",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => loginResponse,
      });

      await login("testuser", "password");

      // Mock the profile update response
      const updateResponse = {
        success: true,
        data: {
          user: {
            id: 1,
            username: "testuser",
            email: "updated@example.com",
            role: "admin",
            first_name: "Updated",
            last_name: "Name",
          },
        },
        message: "Profile updated successfully",
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => updateResponse,
      });

      const updates = {
        firstName: "Updated",
        lastName: "Name",
        email: "updated@example.com",
      };

      const result = await updateProfile(updates);

      expect(result.success).toBe(true);
      expect(result.user.firstName).toBe("Updated");
      expect(result.user.lastName).toBe("Name");
      expect(result.user.email).toBe("updated@example.com");
      expect(result.message).toContain("successfully");
    });

    it("should reject profile update when not authenticated", async () => {
      const updates = {
        firstName: "Updated",
      };

      await expect(updateProfile(updates)).rejects.toMatchObject({
        success: false,
        message: expect.stringContaining("Not authenticated"),
      });
    });

    it("should handle update failure with error message", async () => {
      // Login first
      const loginResponse = {
        success: true,
        data: {
          access_token: "token",
          user: {
            id: 1,
            username: "testuser",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => loginResponse,
      });

      await login("testuser", "password");

      // Mock update failure
      fetchSpy.mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          message: "Email already in use",
        }),
      });

      const updates = {
        email: "existing@example.com",
      };

      await expect(updateProfile(updates)).rejects.toMatchObject({
        success: false,
        message: "Email already in use",
      });
    });

    it("should use default error message when none provided", async () => {
      // Login first
      const loginResponse = {
        success: true,
        data: {
          access_token: "token",
          user: {
            id: 1,
            username: "testuser",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => loginResponse,
      });

      await login("testuser", "password");

      // Mock update failure with no message
      fetchSpy.mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      const updates = {
        firstName: "Updated",
      };

      await expect(updateProfile(updates)).rejects.toMatchObject({
        success: false,
        message: "Unable to update profile. Please try again.",
      });
    });

    it("should handle network error during update", async () => {
      // Login first
      const loginResponse = {
        success: true,
        data: {
          access_token: "token",
          user: {
            id: 1,
            username: "testuser",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => loginResponse,
      });

      await login("testuser", "password");

      // Mock network error
      fetchSpy.mockRejectedValue(new Error("Network error"));

      const updates = {
        firstName: "Updated",
      };

      await expect(updateProfile(updates)).rejects.toMatchObject({
        success: false,
        message: "Unable to update profile. Please try again.",
      });
    });

    it("should accept camelCase field names as fallback", async () => {
      const loginResponse = {
        success: true,
        data: {
          access_token: "t",
          user: {
            id: 1,
            username: "a",
            email: "a@a.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => loginResponse,
      });
      await login("a", "p");

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: {
              id: 1,
              firstName: "Cam",
              lastName: "Case",
              email: "a@a.com",
            },
          },
        }),
      });

      const result = await updateProfile({ firstName: "Cam", lastName: "Case" });
      expect(result.user.firstName).toBe("Cam");
      expect(result.user.lastName).toBe("Case");
    });

    it("should clear state and reject when token is expired", async () => {
      // Login first with a token that expires soon
      const loginResponse = {
        success: true,
        data: {
          access_token: "expiring-token",
          user: {
            id: 1,
            username: "testuser",
            email: "test@example.com",
            role: "admin",
            first_name: "Test",
            last_name: "User",
          },
        },
      };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => loginResponse,
      });
      await login("testuser", "password");

      // Set token expiry to now (expired)
      const now = Date.now();
      const expiredToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE1MDAwMDAwMDB9.expired";
      localStorage.setItem("auth_token", expiredToken);
      localStorage.setItem("token_expiry", String(now - 1000));

      // Force state to be reloaded from localStorage
      await getCurrentUser();

      const updates = {
        firstName: "Updated",
      };

      await expect(updateProfile(updates)).rejects.toMatchObject({
        success: false,
        message: "Session expired. Please log in again.",
      });
      expect(isAuthenticated()).toBe(false);
    });
  });
});
