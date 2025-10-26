import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { usePasswordManagement } from "./usePasswordManagement";
import { apiPost } from "../utils/apiFetch";

// Mock dependencies
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("../utils/apiFetch", () => ({
  apiPost: vi.fn(),
}));

describe("usePasswordManagement", () => {
  const mockCurrentUser = {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => usePasswordManagement());

      expect(result.current.passwordResetModal).toBe(false);
      expect(result.current.selectedUserForReset).toBe(null);
      expect(result.current.passwordFormData).toEqual({
        newPassword: "",
        confirmPassword: "",
      });
      expect(result.current.showNewPassword).toBe(false);
      expect(result.current.showConfirmPassword).toBe(false);
      expect(result.current.validation).toEqual({
        isValidLength: false,
        passwordsMatch: false,
        isSubmitting: false,
        apiError: null,
      });
    });
  });

  describe("validateInRealTime", () => {
    it("should validate password length correctly", () => {
      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.validateInRealTime("short", "");
      });

      expect(result.current.validation.isValidLength).toBe(false);

      act(() => {
        result.current.validateInRealTime("longpass", "");
      });

      expect(result.current.validation.isValidLength).toBe(true);
    });

    it("should validate password match correctly", () => {
      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.validateInRealTime("password123", "password123");
      });

      expect(result.current.validation.passwordsMatch).toBe(true);

      act(() => {
        result.current.validateInRealTime("password123", "different");
      });

      expect(result.current.validation.passwordsMatch).toBe(false);
    });

    it("should not match when confirm is empty", () => {
      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.validateInRealTime("password123", "");
      });

      expect(result.current.validation.passwordsMatch).toBe(false);
    });
  });

  describe("shouldShowLengthError", () => {
    it("should show length error when password is too short", () => {
      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.setPasswordFormData({
          newPassword: "short",
          confirmPassword: "",
        });
        result.current.validateInRealTime("short", "");
      });

      expect(result.current.shouldShowLengthError()).toBe(true);
    });

    it("should not show length error when password is valid", () => {
      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.setPasswordFormData({
          newPassword: "validpass",
          confirmPassword: "",
        });
        result.current.validateInRealTime("validpass", "");
      });

      expect(result.current.shouldShowLengthError()).toBe(false);
    });

    it("should not show length error when field is empty", () => {
      const { result } = renderHook(() => usePasswordManagement());

      expect(result.current.shouldShowLengthError()).toBe(false);
    });
  });

  describe("shouldShowMismatchError", () => {
    it("should show mismatch error when passwords don't match", () => {
      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.setPasswordFormData({
          newPassword: "password123",
          confirmPassword: "different",
        });
        result.current.validateInRealTime("password123", "different");
      });

      expect(result.current.shouldShowMismatchError()).toBe(true);
    });

    it("should not show mismatch error when passwords match", () => {
      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.setPasswordFormData({
          newPassword: "password123",
          confirmPassword: "password123",
        });
        result.current.validateInRealTime("password123", "password123");
      });

      expect(result.current.shouldShowMismatchError()).toBe(false);
    });
  });

  describe("openPasswordResetModal", () => {
    it("should open modal with user and reset state", () => {
      const { result } = renderHook(() => usePasswordManagement());
      const user = { id: 1, name: "John Doe" };

      act(() => {
        result.current.openPasswordResetModal(user);
      });

      expect(result.current.passwordResetModal).toBe(true);
      expect(result.current.selectedUserForReset).toEqual(user);
      expect(result.current.passwordFormData).toEqual({
        newPassword: "",
        confirmPassword: "",
      });
      expect(result.current.showNewPassword).toBe(false);
      expect(result.current.showConfirmPassword).toBe(false);
    });
  });

  describe("closePasswordResetModal", () => {
    it("should close modal and reset state", () => {
      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.openPasswordResetModal({ id: 1, name: "John Doe" });
        result.current.setPasswordFormData({
          newPassword: "test",
          confirmPassword: "test",
        });
      });

      act(() => {
        result.current.closePasswordResetModal();
      });

      expect(result.current.passwordResetModal).toBe(false);
      expect(result.current.selectedUserForReset).toBe(null);
      expect(result.current.passwordFormData).toEqual({
        newPassword: "",
        confirmPassword: "",
      });
    });
  });

  describe("handlePasswordReset", () => {
    it("should not proceed if password is invalid", async () => {
      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.openPasswordResetModal({ id: 1, name: "John Doe" });
      });

      await act(async () => {
        await result.current.handlePasswordReset();
      });

      expect(apiPost).not.toHaveBeenCalled();
    });

    it("should successfully reset password", async () => {
      apiPost.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => usePasswordManagement());
      const user = { id: 1, name: "John Doe" };

      act(() => {
        result.current.openPasswordResetModal(user);
        result.current.setPasswordFormData({
          newPassword: "newpassword",
          confirmPassword: "newpassword",
        });
        result.current.validateInRealTime("newpassword", "newpassword");
      });

      await act(async () => {
        await result.current.handlePasswordReset();
      });

      expect(apiPost).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/users/1/reset-password"),
        { new_password: "newpassword" },
        expect.objectContaining({
          showToastOnError: false,
          retries: 2,
        })
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Password reset successfully for John Doe"
      );
      expect(result.current.passwordResetModal).toBe(false);
    });

    it("should handle API error response", async () => {
      apiPost.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Password reset failed" }),
      });

      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.openPasswordResetModal({ id: 1, name: "John Doe" });
        result.current.setPasswordFormData({
          newPassword: "newpassword",
          confirmPassword: "newpassword",
        });
        result.current.validateInRealTime("newpassword", "newpassword");
      });

      await act(async () => {
        await result.current.handlePasswordReset();
      });

      expect(result.current.validation.apiError).toBe("Password reset failed");
      expect(result.current.validation.isSubmitting).toBe(false);
    });

    it("should handle network error", async () => {
      apiPost.mockRejectedValueOnce(new Error("Failed to fetch"));

      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.openPasswordResetModal({ id: 1, name: "John Doe" });
        result.current.setPasswordFormData({
          newPassword: "newpassword",
          confirmPassword: "newpassword",
        });
        result.current.validateInRealTime("newpassword", "newpassword");
      });

      await act(async () => {
        await result.current.handlePasswordReset();
      });

      expect(result.current.validation.apiError).toContain(
        "Unable to connect to backend server"
      );
    });

    it("should handle timeout error", async () => {
      apiPost.mockRejectedValueOnce(new Error("timeout"));

      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.openPasswordResetModal({ id: 1, name: "John Doe" });
        result.current.setPasswordFormData({
          newPassword: "newpassword",
          confirmPassword: "newpassword",
        });
        result.current.validateInRealTime("newpassword", "newpassword");
      });

      await act(async () => {
        await result.current.handlePasswordReset();
      });

      expect(result.current.validation.apiError).toContain("timed out");
    });

    it("should handle CORS error", async () => {
      apiPost.mockRejectedValueOnce(new Error("CORS policy"));

      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.openPasswordResetModal({ id: 1, name: "John Doe" });
        result.current.setPasswordFormData({
          newPassword: "newpassword",
          confirmPassword: "newpassword",
        });
        result.current.validateInRealTime("newpassword", "newpassword");
      });

      await act(async () => {
        await result.current.handlePasswordReset();
      });

      expect(result.current.validation.apiError).toContain("CORS");
    });
  });

  describe("handleSelfPasswordReset", () => {
    it("should open modal for current user", () => {
      const { result } = renderHook(() => usePasswordManagement(mockCurrentUser));

      act(() => {
        result.current.handleSelfPasswordReset();
      });

      expect(result.current.passwordResetModal).toBe(true);
      expect(result.current.selectedUserForReset).toEqual({
        id: 1,
        name: "Test User",
        email: "test@example.com",
      });
    });

    it("should use username when name not available", () => {
      const userWithoutName = {
        id: 2,
        username: "johndoe",
        email: "john@example.com",
      };

      const { result } = renderHook(() => usePasswordManagement(userWithoutName));

      act(() => {
        result.current.handleSelfPasswordReset();
      });

      expect(result.current.selectedUserForReset.name).toBe("johndoe");
    });

    it("should not open modal if no current user", () => {
      const { result } = renderHook(() => usePasswordManagement(null));

      act(() => {
        result.current.handleSelfPasswordReset();
      });

      expect(result.current.passwordResetModal).toBe(false);
    });

    it("should use fallback id if not available", () => {
      const userWithoutId = {
        username: "testuser",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
      };

      const { result } = renderHook(() => usePasswordManagement(userWithoutId));

      act(() => {
        result.current.handleSelfPasswordReset();
      });

      expect(result.current.selectedUserForReset.id).toBe(1);
    });
  });

  describe("State Setters", () => {
    it("should update password form data", () => {
      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.setPasswordFormData({
          newPassword: "test",
          confirmPassword: "test",
        });
      });

      expect(result.current.passwordFormData).toEqual({
        newPassword: "test",
        confirmPassword: "test",
      });
    });

    it("should toggle show new password", () => {
      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.setShowNewPassword(true);
      });

      expect(result.current.showNewPassword).toBe(true);
    });

    it("should toggle show confirm password", () => {
      const { result } = renderHook(() => usePasswordManagement());

      act(() => {
        result.current.setShowConfirmPassword(true);
      });

      expect(result.current.showConfirmPassword).toBe(true);
    });
  });
});
