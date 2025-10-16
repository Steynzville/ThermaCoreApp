import { beforeEach, describe, expect, it, vi } from "vitest";

import { login } from "../services/authService";

describe("authService", () => {
  beforeEach(() => {
    // Reset mocks before each test
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("should make a POST request to the correct endpoint", async () => {
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

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await login("testuser", "password123");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/login"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "testuser",
            password: "password123",
          }),
        })
      );

      expect(result.success).toBe(true);
      expect(result.token).toBe("test-token-123");
      expect(result.user.username).toBe("testuser");
    });

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

      global.fetch = vi.fn().mockResolvedValue({
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

    it("should handle failed login with error message", async () => {
      const mockResponse = {
        success: false,
        message: "Invalid credentials",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => mockResponse,
      });

      const result = await login("wronguser", "wrongpass");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid username or password. Please try again.");
    });

    it("should handle network errors gracefully", async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(new Error("Network request failed"));

      const result = await login("testuser", "password");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid username or password. Please try again.");
    });

    it("should handle backend errors with proper error message", async () => {
      const mockResponse = {
        success: false,
        error: "Account locked",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => mockResponse,
      });

      const result = await login("lockeduser", "password");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid username or password. Please try again.");
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

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await login("user", "userpass");

      expect(result.success).toBe(true);
      expect(result.user.role).toBe("user");
    });
  });
});
