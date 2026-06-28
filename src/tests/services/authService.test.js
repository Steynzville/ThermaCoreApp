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

// Mock apiPost for selfRegister
vi.mock("../../utils/apiFetch", () => ({
  apiPost: vi.fn(),
}));

describe("Authentication Service - /src/services/authService.js", () => {
  let fetchSpy;

  beforeEach(async () => {
    vi.useFakeTimers();
    fetchSpy = vi.spyOn(global, "fetch");

    // Perform logout to reset the singleton state in authService.js
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

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/login"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "test_user",
            password: "password123",
            keep_me_signed_in: true,
          }),
        }
      );

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

      // Assert global/singleton state has changed
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
      expect(result.message).toBe("Invalid username or password. Please try again.");
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
      fetchSpy.mockRejectedValueOnce(new Error("CORS or Connection failure"));

      const result = await login("test_user", "password");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid username or password. Please try again.");
    });
  });

  describe("logout", () => {
    it("should clear current user and authentication token", async () => {
      // Setup logged in state first
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

      expect(result).toEqual({
        success: true,
        message: "Logout successful",
      });

      expect(isAuthenticated()).toBe(false);
      expect(getAuthToken()).toBeNull();
      expect(await getCurrentUser()).toBeNull();
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
      expect(result.user).not.toBeNull();
    });

    it("should return valid: false if token does not match active login token", async () => {
      const verifyPromise = verifyToken("some-random-token");
      vi.advanceTimersByTime(200);
      const result = await verifyPromise;

      expect(result.valid).toBe(false);
      expect(result.user).toBeNull();
    });
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        username: "new_guy_success",
        email: "newguy_success@thermacore.com",
        password: "secure_password",
        firstName: "New",
        lastName: "Guy",
      };

      const registerPromise = register(userData);
      vi.advanceTimersByTime(800);
      const result = await registerPromise;

      expect(result.success).toBe(true);
      expect(result.message).toBe("Registration successful");
      expect(result.user.username).toBe("new_guy_success");
    });

    it("should reject registration if user already exists", async () => {
      const userData = {
        username: "new_guy_duplicate",
        email: "newguy_duplicate@thermacore.com",
        password: "secure_password",
        firstName: "New",
        lastName: "Guy",
      };

      // Register once
      const firstReg = register(userData);
      vi.advanceTimersByTime(800);
      await firstReg;

      // Try registering again with same username
      const secondReg = register(userData);
      vi.advanceTimersByTime(800);

      await expect(secondReg).rejects.toEqual({
        success: false,
        message: "User already exists",
      });
    });
  });

  describe("selfRegister", () => {
    it("should submit self registration request successfully", async () => {
      const mockResponse = {
        success: true,
        message: "Account request submitted",
      };

      vi.mocked(apiPost).mockResolvedValueOnce(mockResponse);

      const result = await selfRegister({
        username: "self_reg",
        email: "self@thermacore.com",
        password: "pass",
        firstName: "Self",
        lastName: "Reg",
      });

      expect(apiPost).toHaveBeenCalledWith("/auth/self-register", expect.any(Object));
      expect(result).toEqual({
        success: true,
        message: "Account request submitted",
      });
    });

    it("should use result?.data?.message if provided", async () => {
      const mockResponse = {
        data: {
          message: "Account request submitted via data nested field",
        },
      };
      vi.mocked(apiPost).mockResolvedValueOnce(mockResponse);

      const result = await selfRegister({ username: "self_reg" });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Account request submitted via data nested field");
    });

    it("should fall back to generic success message if response is missing one", async () => {
      vi.mocked(apiPost).mockResolvedValueOnce({});

      const result = await selfRegister({ username: "self_reg" });

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        "Registration request submitted successfully. Your account is pending admin approval."
      );
    });

    it("should map error messages accurately on selfRegister API failures", async () => {
      const mockErrorResponse = {
        response: {
          data: {
            error: {
              message: "Username taken",
            },
          },
        },
      };

      vi.mocked(apiPost).mockRejectedValueOnce(mockErrorResponse);

      const result = await selfRegister({ username: "bad_request" });

      expect(result).toEqual({
        success: false,
        message: "Username taken",
      });
    });

    it("should map nested error message without error object accurately on selfRegister failures", async () => {
      const mockErrorResponse = {
        response: {
          data: {
            message: "Username taken direct data message",
          },
        },
      };

      vi.mocked(apiPost).mockRejectedValueOnce(mockErrorResponse);

      const result = await selfRegister({ username: "bad_request" });

      expect(result).toEqual({
        success: false,
        message: "Username taken direct data message",
      });
    });

    it("should fall back to generic registration failed message on other exceptions", async () => {
      vi.mocked(apiPost).mockRejectedValueOnce(new Error("Request timed out"));

      const result = await selfRegister({ username: "error_prone" });

      expect(result).toEqual({
        success: false,
        message: "Request timed out",
      });
    });

    it("should fall back to default fail message if error has absolutely no detail", async () => {
      vi.mocked(apiPost).mockRejectedValueOnce({});

      const result = await selfRegister({ username: "error_prone" });

      expect(result).toEqual({
        success: false,
        message: "Registration failed. Please try again.",
      });
    });
  });

  describe("requestPasswordReset", () => {
    it("should request password reset successfully with direct message", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "Email sent with reset link",
        }),
      });

      const result = await requestPasswordReset("forgot@thermacore.com");

      expect(result).toEqual({
        success: true,
        message: "Email sent with reset link",
      });
    });

    it("should request password reset successfully with data nested message", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { message: "Email sent nested message" },
        }),
      });

      const result = await requestPasswordReset("forgot@thermacore.com");

      expect(result).toEqual({
        success: true,
        message: "Email sent nested message",
      });
    });

    it("should request password reset successfully and fallback on default message", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
        }),
      });

      const result = await requestPasswordReset("forgot@thermacore.com");

      expect(result).toEqual({
        success: true,
        message: "If the email exists, a password reset link has been sent",
      });
    });

    it("should return failure status when forgot-password endpoint is not successful with error.message", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: "Email not found" },
        }),
      });

      const result = await requestPasswordReset("missing@thermacore.com");

      expect(result).toEqual({
        success: false,
        message: "Email not found",
      });
    });

    it("should return failure status when forgot-password endpoint is not successful with data.message", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          data: { message: "Email not found nested in data" },
        }),
      });

      const result = await requestPasswordReset("missing@thermacore.com");

      expect(result).toEqual({
        success: false,
        message: "Email not found nested in data",
      });
    });

    it("should return failure status when forgot-password endpoint is not successful with message field", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          message: "Email not found direct message field",
        }),
      });

      const result = await requestPasswordReset("missing@thermacore.com");

      expect(result).toEqual({
        success: false,
        message: "Email not found direct message field",
      });
    });

    it("should fallback to generic failure message on error response with no messaging", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
        }),
      });

      const result = await requestPasswordReset("missing@thermacore.com");

      expect(result).toEqual({
        success: false,
        message: "Unable to process password reset request. Please try again.",
      });
    });

    it("should handle requestPasswordReset exceptions cleanly", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Network connection dropped"));

      const result = await requestPasswordReset("error@thermacore.com");

      expect(result).toEqual({
        success: false,
        message: "Unable to process password reset request. Please try again.",
      });
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully with direct message", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "Your password has been reset",
        }),
      });

      const result = await resetPassword("token-123", "newPass999");

      expect(result).toEqual({
        success: true,
        message: "Your password has been reset",
      });
    });

    it("should reset password successfully with nested message", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { message: "Your password has been reset nested" },
        }),
      });

      const result = await resetPassword("token-123", "newPass999");

      expect(result).toEqual({
        success: true,
        message: "Your password has been reset nested",
      });
    });

    it("should reset password successfully and fallback to default message", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
        }),
      });

      const result = await resetPassword("token-123", "newPass999");

      expect(result).toEqual({
        success: true,
        message: "Password reset successfully",
      });
    });

    it("should return failure status when reset-password endpoint returns error with error.message", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: "Token expired" },
        }),
      });

      const result = await resetPassword("expired-token", "pass");

      expect(result).toEqual({
        success: false,
        message: "Token expired",
      });
    });

    it("should return failure status when reset-password endpoint returns error with data.message", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          data: { message: "Token expired in data" },
        }),
      });

      const result = await resetPassword("expired-token", "pass");

      expect(result).toEqual({
        success: false,
        message: "Token expired in data",
      });
    });

    it("should return failure status when reset-password endpoint returns error with message", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          message: "Token expired in direct message",
        }),
      });

      const result = await resetPassword("expired-token", "pass");

      expect(result).toEqual({
        success: false,
        message: "Token expired in direct message",
      });
    });

    it("should fallback on default error message if error reset-password response has no details", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
        }),
      });

      const result = await resetPassword("expired-token", "pass");

      expect(result).toEqual({
        success: false,
        message: "Invalid or expired reset token. Please request a new one.",
      });
    });

    it("should handle resetPassword exceptions gracefully", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Server crash"));

      const result = await resetPassword("token", "pass");

      expect(result).toEqual({
        success: false,
        message: "Unable to reset password. Please try again.",
      });
    });
  });

  describe("updateProfile", () => {
    it("should reject profile update if user is not authenticated", async () => {
      const updatePromise = updateProfile({ firstName: "Hack" });
      vi.advanceTimersByTime(500);

      await expect(updatePromise).rejects.toEqual({
        success: false,
        message: "Not authenticated",
      });
    });

    it("should update profile details successfully when logged in", async () => {
      // Login first
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            access_token: "active-tkn",
            user: { id: 1, username: "admin", first_name: "Original" },
          },
        }),
      });
      await login("admin", "pass");

      const updatePromise = updateProfile({ firstName: "Updated", lastName: "Name" });
      vi.advanceTimersByTime(500);
      const result = await updatePromise;

      expect(result.success).toBe(true);
      expect(result.user.firstName).toBe("Updated");
      expect(result.user.lastName).toBe("Name");

      // Verify getCurrentUser retains the updated values
      expect(await getCurrentUser()).toEqual(result.user);
    });
  });
});
