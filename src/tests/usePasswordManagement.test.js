/**
 * Tests for usePasswordManagement Hook
 *
 * Tests password management state and validation logic.
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePasswordManagement } from "../hooks/usePasswordManagement";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock apiPost
vi.mock("../utils/apiFetch", () => ({
  apiPost: vi.fn(),
}));

describe("usePasswordManagement Hook", () => {
  const mockUser = {
    id: 1,
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    username: "johndoe",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => usePasswordManagement(mockUser));

    expect(result.current.passwordResetModal).toBe(false);
    expect(result.current.selectedUserForReset).toBeNull();
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

  it("should open password reset modal for user", () => {
    const { result } = renderHook(() => usePasswordManagement(mockUser));
    const userToReset = { id: 2, name: "Jane Smith", email: "jane@test.com" };

    act(() => {
      result.current.openPasswordResetModal(userToReset);
    });

    expect(result.current.passwordResetModal).toBe(true);
    expect(result.current.selectedUserForReset).toEqual(userToReset);
    expect(result.current.passwordFormData).toEqual({
      newPassword: "",
      confirmPassword: "",
    });
  });

  it("should close password reset modal and reset state", () => {
    const { result } = renderHook(() => usePasswordManagement(mockUser));

    // First open the modal
    act(() => {
      result.current.openPasswordResetModal({
        id: 2,
        name: "Jane",
        email: "jane@test.com",
      });
    });

    // Then close it
    act(() => {
      result.current.closePasswordResetModal();
    });

    expect(result.current.passwordResetModal).toBe(false);
    expect(result.current.selectedUserForReset).toBeNull();
    expect(result.current.passwordFormData).toEqual({
      newPassword: "",
      confirmPassword: "",
    });
    expect(result.current.validation).toEqual({
      isValidLength: false,
      passwordsMatch: false,
      isSubmitting: false,
      apiError: null,
    });
  });

  it("should validate password length in real time", () => {
    const { result } = renderHook(() => usePasswordManagement(mockUser));

    act(() => {
      result.current.validateInRealTime("short", "");
    });

    expect(result.current.validation.isValidLength).toBe(false);
    expect(result.current.validation.passwordsMatch).toBe(false);

    act(() => {
      result.current.validateInRealTime("longpassword", "");
    });

    expect(result.current.validation.isValidLength).toBe(true);
  });

  it("should validate password match in real time", () => {
    const { result } = renderHook(() => usePasswordManagement(mockUser));

    act(() => {
      result.current.validateInRealTime("password123", "password123");
    });

    expect(result.current.validation.isValidLength).toBe(true);
    expect(result.current.validation.passwordsMatch).toBe(true);
  });

  it("should not show match if confirm password is empty", () => {
    const { result } = renderHook(() => usePasswordManagement(mockUser));

    act(() => {
      result.current.validateInRealTime("password123", "");
    });

    expect(result.current.validation.passwordsMatch).toBe(false);
  });

  it("should show length error when appropriate", () => {
    const { result } = renderHook(() => usePasswordManagement(mockUser));

    // Set password form data
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
    const { result } = renderHook(() => usePasswordManagement(mockUser));

    act(() => {
      result.current.setPasswordFormData({
        newPassword: "validpassword",
        confirmPassword: "",
      });
      result.current.validateInRealTime("validpassword", "");
    });

    expect(result.current.shouldShowLengthError()).toBe(false);
  });

  it("should show mismatch error when appropriate", () => {
    const { result } = renderHook(() => usePasswordManagement(mockUser));

    act(() => {
      result.current.setPasswordFormData({
        newPassword: "password123",
        confirmPassword: "different",
      });
      result.current.validateInRealTime("password123", "different");
    });

    expect(result.current.shouldShowMismatchError()).toBe(true);
  });

  it("should toggle password visibility", () => {
    const { result } = renderHook(() => usePasswordManagement(mockUser));

    expect(result.current.showNewPassword).toBe(false);

    act(() => {
      result.current.setShowNewPassword(true);
    });

    expect(result.current.showNewPassword).toBe(true);

    act(() => {
      result.current.setShowConfirmPassword(true);
    });

    expect(result.current.showConfirmPassword).toBe(true);
  });

  it("should handle self password reset", () => {
    const { result } = renderHook(() => usePasswordManagement(mockUser));

    act(() => {
      result.current.handleSelfPasswordReset();
    });

    expect(result.current.passwordResetModal).toBe(true);
    expect(result.current.selectedUserForReset).toEqual({
      id: 1,
      name: "John Doe",
      email: "john@example.com",
    });
  });

  it("should handle self password reset with username fallback", () => {
    const userWithoutName = {
      id: 1,
      username: "johndoe",
      email: "john@example.com",
    };

    const { result } = renderHook(() => usePasswordManagement(userWithoutName));

    act(() => {
      result.current.handleSelfPasswordReset();
    });

    expect(result.current.selectedUserForReset.name).toBe("johndoe");
  });

  it("should update password form data", () => {
    const { result } = renderHook(() => usePasswordManagement(mockUser));

    act(() => {
      result.current.setPasswordFormData({
        newPassword: "newpass",
        confirmPassword: "newpass",
      });
    });

    expect(result.current.passwordFormData).toEqual({
      newPassword: "newpass",
      confirmPassword: "newpass",
    });
  });
});
