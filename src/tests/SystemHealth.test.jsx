import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  getAuthToken,
  verifyToken,
  register,
  selfRegister,
  requestPasswordReset,
  resetPassword,
  updateProfile,
} from "../services/authService";
import { apiPost } from "../utils/apiFetch";

// Mock apiPost for selfRegister
vi.mock("../utils/apiFetch", () => ({
  apiPost: vi.fn(),
}));

describe("Authentication Service - /src/services/authService.js", () => {
  let fetchMock;

  beforeEach(async () => {
    vi.useFakeTimers();

    // ✅ HARD OVERRIDE fetch (fixes mockResolvedValue issues)
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // reset auth state
    const logoutPromise = logout();
    vi.advanceTimersByTime(200);
    await logoutPromise;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Initial State", () => {
    it("should initially not be authenticated", async () => {
      expect(isAuthenticated()).toBe(false);
      expect(getAuthToken()).toBeNull();
      expect(await getCurrentUser()).toBeNull();
    });
  });

  describe("login", () => {
    it("should authenticate successfully on correct credentials", async () => {
      const mockLoginResponse = {
        success: true,
        message: "Logged in successfully",
        data: {
          access_token: "mock-jwt-token-xyz",
          user: {
            id: 10,
            username: "test_user",
            email: "test@thermacore.com",
            role: { name: "operator" },
            first_name: "Test",
            last_name: "Operator",
          },
        },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse,
      });

      const result = await login("test_user", "password123", true);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/login"),
        expect.objectContaining({
          method: "POST",
        })
      );

      expect(result.success).toBe(true);
      expect(result.token).toBe("mock-jwt-token-xyz");

      expect(isAuthenticated()).toBe(true);
      expect(getAuthToken()).toBe("mock-jwt-token-xyz");
    });

    it("should fail authentication when server returns success = false", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false }),
      });

      const result = await login("test_user", "wrong_pass");

      expect(result.success).toBe(false);
      expect(isAuthenticated()).toBe(false);
    });

    it("should fail authentication when request returns non-200 status", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });

      const result = await login("test_user", "wrong_pass");

      expect(result.success).toBe(false);
    });

    it("should catch network errors gracefully", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network failure"));

      const result = await login("test_user", "password");

      expect(result.success).toBe(false);
    });
  });

  describe("logout", () => {
    it("should clear current user and authentication token", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { access_token: "tkn", user: { id: 1, username: "u", role: "admin" } },
        }),
      });

      await login("u", "p");

      const logoutPromise = logout();
      vi.advanceTimersByTime(200);
      const result = await logoutPromise;

      expect(result.success).toBe(true);
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe("verifyToken", () => {
    it("should verify token successfully if it matches active login token", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { access_token: "tkn-123", user: { id: 1, username: "u", role: "admin" } },
        }),
      });

      await login("u", "p");

      const verifyPromise = verifyToken("tkn-123");
      vi.advanceTimersByTime(200);
      const result = await verifyPromise;

      expect(result.valid).toBe(true);
    });
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        username: "new_user",
        email: "new@thermacore.com",
        password: "secure_password",
        firstName: "New",
        lastName: "User",
      };

      const registerPromise = register(userData);
      vi.advanceTimersByTime(800);
      const result = await registerPromise;

      expect(result.success).toBe(true);
    });
  });

  describe("selfRegister", () => {
    it("should submit self registration request successfully", async () => {
      vi.mocked(apiPost).mockResolvedValueOnce({
        success: true,
        message: "Account request submitted",
      });

      const result = await selfRegister({
        username: "self_reg",
        email: "self@thermacore.com",
      });

      expect(result.success).toBe(true);
      expect(apiPost).toHaveBeenCalled();
    });
  });

  describe("requestPasswordReset", () => {
    it("should request password reset successfully", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "Email sent",
        }),
      });

      const result = await requestPasswordReset("test@thermacore.com");

      expect(result.success).toBe(true);
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "Password reset",
        }),
      });

      const result = await resetPassword("token", "newpass");

      expect(result.success).toBe(true);
    });
  });

  describe("updateProfile", () => {
    it("should reject when not authenticated", async () => {
      const promise = updateProfile({ firstName: "Hack" });
      vi.advanceTimersByTime(500);

      await expect(promise).rejects.toEqual({
        success: false,
        message: "Not authenticated",
      });
    });
  });
});
