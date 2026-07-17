/**
 * Comprehensive Authentication Service Tests
 * Merged from both test files to ensure complete coverage
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
} from "../../services/authService";
import { apiPost } from "../../utils/apiFetch";

// Mock apiPost for selfRegister
vi.mock("../../utils/apiFetch", () => ({
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
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
  // LOGIN TESTS - Merged from both files
  // ============================================================

  describe("login", () => {
    // ✅ From comprehensive test
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

    // ✅ From comprehensive test
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

    // ✅ From basic test - MAKES POST REQUEST TO CORRECT ENDPOINT
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
        expect.stringContaining("/auth/login"),
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

    // ✅ From comprehensive test
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

    // ✅ From comprehensive test
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

    // ✅ From basic test - SEND KEEP_ME_SIGNED_IN PARAMETER
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
        expect.stringContaining("/auth/login"),
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

    // ✅ From comprehensive test
    it("should fail with invalid credentials", async () => {
      const mockResponse = {
        success: false,
        message: "Invalid credentials",
      };

      fetchSpy.mockResolvedValue({
        ok: false,
        json: async () => mockResponse,
      });

      const result = await login("wronguser", "wrongpass");

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Invalid username or password. Please try again.",
      );
      expect(isAuthenticated()).toBe(false);
    });

    // ✅ From comprehensive test
    it("should handle network errors gracefully", async () => {
      fetchSpy.mockRejectedValue(new Error("Network error"));

      const result = await login("testuser", "password");

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Invalid username or password. Please try again.",
      );
      expect(isAuthenticated()).toBe(false);
    });

    // ✅ From comprehensive test
    it("should handle backend errors in response", async () => {
      const mockResponse = {
        success: false,
        message: "Server error",
      };

      fetchSpy.mockResolvedValue({
        ok: false,
        json: async () => mockResponse,
      });

      const result = await login("testuser", "password");

      expect(result.success).toBe(false);
    });

    // ✅ From basic test - HANDLE BACKEND ERRORS WITH PROPER MESSAGE
    it("should handle backend errors with proper error message", async () => {
      const mockResponse = {
        success: false,
        error: "Account locked",
      };

      fetchSpy.mockResolvedValue({
        ok: false,
        json: async () => mockResponse,
      });

      const result = await login("lockeduser", "password");

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Invalid username or password. Please try again.",
      );
    });

    // ✅ From comprehensive test
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

    // ✅ From comprehensive test
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

    // ✅ From basic test - ADDITIONAL DATA MAPPING TEST
    it("should handle successful login with proper data mapping", async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: "jwt-token-abc",
          user: {
            id: 2,
            username: "admin",
            email: "admin@example.com",
            role: "admin",
            first_name: "Admin",
            last_name: "User",
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await login("admin", "adminpass");

      expect(result.success).toBe(true);
      expect(result.token).toBe("jwt-token-abc");
      expect(result.user).toEqual({
        id: 2,
        username: "admin",
        email: "admin@example.com",
        role: "admin",
        firstName: "Admin",
        lastName: "User",
      });
    });

    // ✅ From basic test - FAILED LOGIN WITH ERROR MESSAGE
    it("should handle failed login with error message", async () => {
      const mockResponse = {
        success: false,
        message: "Invalid credentials",
      };

      fetchSpy.mockResolvedValue({
        ok: false,
        json: async () => mockResponse,
      });

      const result = await login("wronguser", "wrongpass");

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Invalid username or password. Please try again.",
      );
    });
  });

  // ============================================================
  // LOGOUT TESTS
  // ============================================================

  describe("logout", () => {
    it("should successfully logout user", async () => {
      // First login to have a user session
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
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
        }),
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
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
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
        }),
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
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
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
        }),
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
  });

  // ============================================================
  // AUTHENTICATION STATUS TESTS
  // ============================================================

  describe("isAuthenticated", () => {
    it("should return false when not authenticated", () => {
      expect(isAuthenticated()).toBe(false);
    });

    it("should return true when authenticated", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
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
        }),
      });

      await login("test", "password");
      expect(isAuthenticated()).toBe(true);
    });

    it("should return false after logout", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
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
        }),
      });

      await login("test", "password");
      await logout();
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
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
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
        }),
      });

      await login("test", "password");
      expect(getAuthToken()).toBe("my-auth-token");
    });
  });

  // ============================================================
  // VERIFY TOKEN TESTS
  // ============================================================

  describe("verifyToken", () => {
    it("should verify valid token", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
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
        }),
      });

      await login("test", "password");
      const result = await verifyToken("valid-token");

      expect(result.valid).toBe(true);
      expect(result.user).toBeTruthy();
    });

    it("should reject invalid token", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
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
        }),
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
  });

  // ============================================================
  // REGISTER TESTS
  // ============================================================

  describe("register", () => {
    it("should successfully register new user", async () => {
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

    it("should reject duplicate username", async () => {
      const userData = {
        username: "admin",
        email: "different@example.com",
        password: "password123",
      };

      try {
        await register(userData);
        // If we get here in dev mode, it should fail
        if (import.meta.env.DEV) {
          expect(true).toBe(false);
        }
      } catch (error) {
        expect(error.success).toBe(false);
        expect(error.message).toContain("already exists");
      }
    });

    it("should reject duplicate email", async () => {
      const userData = {
        username: "differentuser",
        email: "admin@thermacore.com",
        password: "password123",
      };

      try {
        await register(userData);
        if (import.meta.env.DEV) {
          expect(true).toBe(false);
        }
      } catch (error) {
        expect(error.success).toBe(false);
        expect(error.message).toContain("already exists");
      }
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
    });
  });

  // ============================================================
  // PASSWORD RESET TESTS
  // ============================================================

  describe("requestPasswordReset", () => {
    it("should successfully request password reset", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: "Password reset email sent",
        }),
      });

      const result = await requestPasswordReset("test@example.com");

      expect(result.success).toBe(true);
      expect(result.message).toContain("reset");
    });

    it("should handle network errors gracefully", async () => {
      fetchSpy.mockRejectedValue(new Error("Network error"));

      const result = await requestPasswordReset("test@example.com");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Unable to process");
    });

    it("should handle API errors", async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          message: "Email not found",
        }),
      });

      const result = await requestPasswordReset("invalid@example.com");

      expect(result.success).toBe(false);
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
      expect(result.message).toContain("Invalid or expired");
    });

    it("should handle network errors", async () => {
      fetchSpy.mockRejectedValue(new Error("Network error"));

      const result = await resetPassword("token", "newPassword123");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Unable to reset");
    });
  });

  // ============================================================
  // UPDATE PROFILE TESTS
  // ============================================================

  describe("updateProfile", () => {
    it("should successfully update profile when authenticated", async () => {
      // First login
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
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
        }),
      });

      await login("testuser", "password");

      const updates = {
        firstName: "Updated",
        lastName: "Name",
      };

      // Mock the profile update response
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: {
              id: 1,
              username: "testuser",
              email: "test@example.com",
              role: "admin",
              first_name: "Updated",
              last_name: "Name",
            },
          },
          message: "Profile updated successfully",
        }),
      });

      const result = await updateProfile(updates);

      expect(result.success).toBe(true);
      expect(result.user.firstName).toBe("Updated");
      expect(result.user.lastName).toBe("Name");
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
  });
});
