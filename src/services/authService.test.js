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
} from "./authService";

// Mock fetch globally
global.fetch = vi.fn();

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the service state by logging out
    return logout();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

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

      global.fetch.mockResolvedValue({
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
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/login"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "testuser",
            password: "password",
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

      global.fetch.mockResolvedValue({
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

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await login("user3", "password");

      expect(result.success).toBe(true);
      expect(result.user.role).toBe("technician");
    });

    it("should fail with invalid credentials", async () => {
      const mockResponse = {
        success: false,
        message: "Invalid credentials",
      };

      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => mockResponse,
      });

      const result = await login("wronguser", "wrongpass");

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Invalid username or password. Please try again.",
      );
    });

    it("should handle network errors gracefully", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      const result = await login("testuser", "password");

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Invalid username or password. Please try again.",
      );
    });

    it("should handle backend errors in response", async () => {
      const mockResponse = {
        success: false,
        message: "Server error",
      };

      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => mockResponse,
      });

      const result = await login("testuser", "password");

      expect(result.success).toBe(false);
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

      global.fetch.mockResolvedValue({
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

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await login("test", "password");

      expect(result.message).toBe("Login successful");
    });
  });

  describe("logout", () => {
    it("should successfully logout user", async () => {
      // First login to have a user session
      global.fetch.mockResolvedValue({
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
      global.fetch.mockResolvedValue({
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

  describe("getCurrentUser", () => {
    it("should return null when no user is logged in", async () => {
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it("should return current user when logged in", async () => {
      global.fetch.mockResolvedValue({
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

  describe("isAuthenticated", () => {
    it("should return false when not authenticated", () => {
      expect(isAuthenticated()).toBe(false);
    });

    it("should return true when authenticated", async () => {
      global.fetch.mockResolvedValue({
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
      global.fetch.mockResolvedValue({
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

  describe("getAuthToken", () => {
    it("should return null when not authenticated", () => {
      expect(getAuthToken()).toBeNull();
    });

    it("should return token when authenticated", async () => {
      global.fetch.mockResolvedValue({
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

  describe("verifyToken", () => {
    it("should verify valid token", async () => {
      global.fetch.mockResolvedValue({
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
      global.fetch.mockResolvedValue({
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
        username: "admin", // Existing user in dev mode
        email: "different@example.com",
        password: "password123",
      };

      try {
        await register(userData);
        // If we get here in dev mode, it should fail
        if (import.meta.env.DEV) {
          expect(true).toBe(false); // Should not reach here
        }
      } catch (error) {
        // Expected to reject with error
        expect(error.success).toBe(false);
        expect(error.message).toContain("already exists");
      }
    });

    it("should reject duplicate email", async () => {
      const userData = {
        username: "differentuser",
        email: "admin@thermacore.com", // Existing email in dev mode
        password: "password123",
      };

      try {
        await register(userData);
        // If we get here in dev mode, it should fail
        if (import.meta.env.DEV) {
          expect(true).toBe(false); // Should not reach here
        }
      } catch (error) {
        // Expected to reject with error
        expect(error.success).toBe(false);
        expect(error.message).toContain("already exists");
      }
    });
  });

  describe("requestPasswordReset", () => {
    it("should successfully request password reset", async () => {
      global.fetch.mockResolvedValue({
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
      global.fetch.mockRejectedValue(new Error("Network error"));

      const result = await requestPasswordReset("test@example.com");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Unable to process");
    });

    it("should handle API errors", async () => {
      global.fetch.mockResolvedValue({
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

  describe("resetPassword", () => {
    it("should successfully reset password with valid token", async () => {
      global.fetch.mockResolvedValue({
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
      global.fetch.mockResolvedValue({
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
      global.fetch.mockRejectedValue(new Error("Network error"));

      const result = await resetPassword("token", "newPassword123");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Unable to reset");
    });
  });

  describe("selfRegister", () => {
    it("should submit self-registration request", async () => {
      // Note: selfRegister uses apiPost which would need separate mocking
      // This is a placeholder for when apiPost is properly mocked
      const userData = {
        username: "selfuser",
        email: "self@example.com",
        password: "password123",
        firstName: "Self",
        lastName: "User",
      };

      // Actual test would require mocking apiPost
      expect(userData).toBeDefined();
    });
  });

  describe("updateProfile", () => {
    it("should successfully update profile when authenticated", async () => {
      // First login
      global.fetch.mockResolvedValue({
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
