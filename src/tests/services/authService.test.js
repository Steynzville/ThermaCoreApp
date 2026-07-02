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
} from "../../services/authService";
import { apiPost } from "../../utils/apiFetch";

/**
 * =========================
 * SAFE FETCH BOOTSTRAP FIX
 * =========================
 * Ensures fetch is ALWAYS a vi mock function
 * so mockResolvedValueOnce / mockRejectedValueOnce works.
 */
if (!global.fetch || !vi.isMockFunction(global.fetch)) {
  global.fetch = vi.fn();
}

// Mock apiPost for selfRegister
vi.mock("../../utils/apiFetch", () => ({
  apiPost: vi.fn(),
}));

describe("Authentication Service - /src/services/authService.js", () => {
  let fetchSpy;

  beforeEach(async () => {
    vi.useFakeTimers();

    // IMPORTANT: reset fetch to a clean mock each test
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

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLoginResponse,
      });

      const result = await login("test_user", "password123", true);

      expect(fetchSpy).toHaveBeenCalled();

      expect(result.success).toBe(true);
      expect(result.token).toBe("mock-jwt-token-xyz");
      expect(result.user).toEqual({
        id: 10,
        username: "test_user",
        email: "test@thermacore.com",
        role: "operator",
        firstName: "Test",
        lastName: "Operator",
      });

      expect(isAuthenticated()).toBe(true);
      expect(getAuthToken()).toBe("mock-jwt-token-xyz");
      expect(await getCurrentUser()).toEqual(result.user);
    });

    it("should fail authentication when server returns success = false", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, message: "Invalid password" }),
      });

      const result = await login("test_user", "wrong_pass");

      expect(result.success).toBe(false);
      expect(isAuthenticated()).toBe(false);
    });

    it("should fail authentication when request returns non-200 status", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });

      const result = await login("test_user", "wrong_pass");

      expect(result.success).toBe(false);
      expect(isAuthenticated()).toBe(false);
    });

    it("should catch network errors gracefully", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("CORS failure"));

      const result = await login("test_user", "password");

      expect(result.success).toBe(false);
    });
  });

  describe("logout", () => {
    it("should clear current user and authentication token", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { access_token: "tkn", user: { id: 1, username: "u", role: "admin" } },
        }),
      });

      await login("u", "p");
      expect(isAuthenticated()).toBe(true);

      const logoutPromise = logout();
      vi.advanceTimersByTime(200);
      const result = await logoutPromise;

      expect(result.success).toBe(true);
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe("verifyToken", () => {
    it("should verify token successfully if it matches active login token", async () => {
      fetchSpy.mockResolvedValueOnce({
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
      const registerPromise = register({
        username: "new_guy",
        email: "new@thermacore.com",
        password: "secure_password",
        firstName: "New",
        lastName: "Guy",
      });

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
      });

      expect(apiPost).toHaveBeenCalledWith(
        "/auth/self-register",
        expect.any(Object),
      );

      expect(result.success).toBe(true);
    });
  });

  describe("requestPasswordReset", () => {
    it("should handle password reset", async () => {
      fetchSpy.mockResolvedValueOnce({
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
    it("should reset password", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "Password reset",
        }),
      });

      const result = await resetPassword("token", "newPass");

      expect(result.success).toBe(true);
    });
  });

  describe("updateProfile", () => {
    it("should reject if not authenticated", async () => {
      const updatePromise = updateProfile({ firstName: "Hack" });
      vi.advanceTimersByTime(500);

      await expect(updatePromise).rejects.toEqual({
        success: false,
        message: "Not authenticated",
      });
    });
  });
});
