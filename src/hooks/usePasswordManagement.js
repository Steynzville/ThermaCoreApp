/**
 * usePasswordManagement Hook
 *
 * Manages password reset functionality for admin users and self-password reset.
 * Extracted from AdminPanel to improve testability.
 */

import { useState } from "react";
import { toast } from "sonner";

import { apiPost } from "../utils/apiFetch";

export const usePasswordManagement = (currentUser) => {
  const [passwordResetModal, setPasswordResetModal] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [passwordFormData, setPasswordFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Single validation state object for managing all validation
  const [validation, setValidation] = useState({
    isValidLength: false,
    passwordsMatch: false,
    isSubmitting: false,
    apiError: null,
  });

  const validateInRealTime = (newPass, confirmPass) => {
    const isValidLength = newPass.length >= 6;
    const passwordsMatch = newPass === confirmPass && confirmPass.length > 0;

    setValidation((prev) => ({
      ...prev,
      isValidLength,
      passwordsMatch,
    }));
  };

  // Helper functions for error display logic
  const shouldShowLengthError = () => {
    return (
      !validation.apiError &&
      passwordFormData.newPassword.length > 0 &&
      !validation.isValidLength
    );
  };

  const shouldShowMismatchError = () => {
    return (
      !validation.apiError &&
      validation.isValidLength &&
      passwordFormData.confirmPassword.length > 0 &&
      !validation.passwordsMatch
    );
  };

  // Password Management Functions
  const openPasswordResetModal = (user) => {
    setSelectedUserForReset(user);
    setPasswordFormData({ newPassword: "", confirmPassword: "" });
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setValidation({
      isValidLength: false,
      passwordsMatch: false,
      isSubmitting: false,
      apiError: null,
    });
    setPasswordResetModal(true);
  };

  const closePasswordResetModal = () => {
    setPasswordResetModal(false);
    setSelectedUserForReset(null);
    setPasswordFormData({ newPassword: "", confirmPassword: "" });
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setValidation({
      isValidLength: false,
      passwordsMatch: false,
      isSubmitting: false,
      apiError: null,
    });
  };

  /**
   * Handles the password reset process for a selected user.
   *
   * Depends on state variables:
   * - selectedUserForReset: The user object whose password is being reset
   * - passwordFormData: Object containing 'newPassword' and 'confirmPassword' strings
   * - validation: Object containing validation flags (isValidLength, passwordsMatch, isSubmitting, apiError)
   *
   * Side effects:
   * - Updates validation state (isSubmitting, apiError)
   * - Shows toast notifications for success or error
   * - Closes the modal on success via closePasswordResetModal
   *
   * @returns {Promise<void>} Resolves when the password reset process completes
   */
  const handlePasswordReset = async () => {
    // Validation should already be checked by button disabled state
    // But double-check here for safety
    if (!validation.isValidLength || !validation.passwordsMatch) {
      return;
    }

    setValidation((prev) => ({
      ...prev,
      isSubmitting: true,
    }));

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL ||
        "https://thermacoreapp.onrender.com";

      const response = await apiPost(
        `${API_BASE_URL}/api/v1/users/${selectedUserForReset.id}/reset-password`,
        { new_password: passwordFormData.newPassword },
        {
          showToastOnError: false, // We'll handle errors ourselves
          retries: 2, // Retry failed requests twice
          retryDelay: 1000, // Wait 1 second between retries
        },
      );

      const result = await response.json();

      if (response.ok) {
        toast.success(
          `Password reset successfully for ${selectedUserForReset.name}`,
        );
        closePasswordResetModal();
      } else {
        // Set validation with error state
        setValidation((prev) => ({
          ...prev,
          isSubmitting: false,
          apiError:
            result.error || result.message || "Failed to reset password",
        }));
      }
    } catch (error) {
      // Provide user-friendly error messages with backend connection details
      let errorMsg = "Failed to reset password. ";

      if (error.message.includes("Failed to fetch")) {
        errorMsg +=
          "Unable to connect to backend server. Please check that the backend is running and accessible.";
      } else if (error.message.includes("network")) {
        errorMsg +=
          "Network error occurred. Please check your internet connection and backend connectivity.";
      } else if (error.message.includes("timeout")) {
        errorMsg +=
          "The request timed out. The backend server may be slow or unresponsive. Please try again.";
      } else if (error.message.includes("CORS")) {
        errorMsg +=
          "Cross-origin request blocked. Please verify backend CORS configuration allows requests from this domain.";
      } else {
        errorMsg +=
          error.message ||
          "An unexpected error occurred. Please check the backend logs.";
      }

      setValidation((prev) => ({
        ...prev,
        isSubmitting: false,
        apiError: errorMsg,
      }));
    }
  };

  const handleSelfPasswordReset = () => {
    if (currentUser) {
      // Create a user object for self-password reset
      const selfUser = {
        id: currentUser.id || 1, // Fallback to 1 if id not available
        name:
          currentUser.firstName && currentUser.lastName
            ? `${currentUser.firstName} ${currentUser.lastName}`
            : currentUser.username,
        email: currentUser.email || "",
      };
      openPasswordResetModal(selfUser);
    }
  };

  return {
    // Password state
    passwordResetModal,
    selectedUserForReset,
    passwordFormData,
    showNewPassword,
    showConfirmPassword,
    validation,

    // Password actions
    validateInRealTime,
    shouldShowLengthError,
    shouldShowMismatchError,
    openPasswordResetModal,
    closePasswordResetModal,
    handlePasswordReset,
    handleSelfPasswordReset,

    // Password state setters
    setPasswordFormData,
    setShowNewPassword,
    setShowConfirmPassword,
  };
};
