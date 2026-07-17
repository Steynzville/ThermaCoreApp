/**
 * Authentication Service
 * Handles user authentication, registration, and profile management
 */

import { apiPost } from "../utils/apiFetch";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com";

// In-memory auth state
let currentUser = null;
let authToken = null;
let tokenExpiry = null;

// Token expiry buffer (5 minutes before actual expiry to allow for refresh)
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * Check if a token is expired or about to expire
 * @param {string} token - The token to check
 * @returns {boolean} - True if the token is valid (not expired and not near expiry)
 */
const isTokenValid = (token) => {
  if (!token) return false;
  
  try {
    // Try to decode JWT to check expiry
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp) {
        const expiryTime = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        // Check if token is expired or within buffer window
        return expiryTime > now + TOKEN_EXPIRY_BUFFER_MS;
      }
    }
    // If we can't decode or no exp claim, assume valid (will be validated by API)
    return true;
  } catch (_error) {
    // If we can't decode, assume valid (will be validated by API)
    return true;
  }
};

/**
 * Set auth state and persist to localStorage if keepMeSignedIn
 */
const setAuthState = (user, token, keepMeSignedIn = false) => {
  currentUser = user;
  authToken = token;
  
  // Store token expiry if we can decode it
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp) {
          tokenExpiry = payload.exp * 1000;
        }
      }
    } catch (_e) {
      // Ignore decode errors
    }
  } else {
    tokenExpiry = null;
  }

  if (keepMeSignedIn && user && token) {
    try {
      localStorage.setItem("auth_token", token);
      localStorage.setItem("user", JSON.stringify(user));
      if (tokenExpiry) {
        localStorage.setItem("token_expiry", String(tokenExpiry));
      }
    } catch (_e) {
      // Ignore localStorage errors
    }
  }
};

/**
 * Clear auth state and localStorage
 */
const clearAuthState = () => {
  currentUser = null;
  authToken = null;
  tokenExpiry = null;
  try {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    localStorage.removeItem("token_expiry");
  } catch (_e) {
    // Ignore localStorage errors
  }
};

/**
 * Restore auth state from localStorage
 * @returns {boolean} - True if session was restored successfully
 */
const restoreFromLocalStorage = () => {
  try {
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("user");
    const storedExpiry = localStorage.getItem("token_expiry");

    // Clean up partial/orphaned state instead of silently returning false
    if (storedToken || storedUser) {
      // If only one exists, clean up the orphaned data
      if (!storedToken || !storedUser) {
        clearAuthState();
        return false;
      }
    }

    if (storedToken && storedUser) {
      // Check if token has expired
      if (storedExpiry) {
        const expiry = parseInt(storedExpiry, 10);
        if (expiry < Date.now()) {
          // Token expired - clear localStorage
          clearAuthState();
          return false;
        }
      }

      // Validate token structure (basic check)
      if (!isTokenValid(storedToken)) {
        clearAuthState();
        return false;
      }

      try {
        currentUser = JSON.parse(storedUser);
        authToken = storedToken;
        tokenExpiry = storedExpiry ? parseInt(storedExpiry, 10) : null;
        return true;
      } catch (_e) {
        // User JSON is corrupted - clear everything
        clearAuthState();
        return false;
      }
    }
    return false;
  } catch (_e) {
    return false;
  }
};

/**
 * Login user with username/email and password
 * @param {string} username - Username or email
 * @param {string} password - User password
 * @param {boolean} keepMeSignedIn - Whether to persist session
 * @returns {Promise<Object>} - Login result with user data and token
 */
export const login = async (username, password, keepMeSignedIn = false) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        keep_me_signed_in: keepMeSignedIn,
      }),
    });

    const result = await response.json();

    // Handle HTTP-level failures (401, 403, 500, etc.)
    // IMPORTANT: Use generic message for login to prevent account enumeration
    if (!response.ok) {
      throw {
        success: false,
        message: "Invalid username or password. Please try again.",
      };
    }

    // Handle success: false in a 200 response (business-logic failure)
    // IMPORTANT: Use generic message for login to prevent account enumeration
    if (result.success === false) {
      throw {
        success: false,
        message: "Invalid username or password. Please try again.",
      };
    }

    // Extract user data with proper field mapping
    const userData = result.data?.user || result.data || {};
    const role = userData.role?.name || userData.role || "user";

    const user = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      role: role,
      firstName: userData.first_name || userData.firstName || "",
      lastName: userData.last_name || userData.lastName || "",
    };

    // Store auth state - try multiple token locations (4 levels of fallback)
    const token = result.data?.access_token ||
                  result.data?.token ||
                  result.access_token ||
                  result.token ||
                  null;

    setAuthState(user, token, keepMeSignedIn);

    return {
      success: true,
      token: token,
      user: user,
      message: result.message || "Login successful",
    };
  } catch (error) {
    // If it's already a shaped error, return it
    if (error?.success === false) {
      return error;
    }

    // Handle network or other errors with generic message
    return {
      success: false,
      message: "Invalid username or password. Please try again.",
    };
  }
};

/**
 * Logout current user
 * @returns {Promise<Object>} - Logout result
 */
export const logout = async () => {
  clearAuthState();
  return {
    success: true,
    message: "Logout successful",
  };
};

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} - Current user or null
 */
export const getCurrentUser = async () => {
  // If we have a user but token is expired, clear state
  if (currentUser && authToken && !isTokenValid(authToken)) {
    clearAuthState();
    return null;
  }

  // Check localStorage first for persisted session
  if (!currentUser) {
    const restored = restoreFromLocalStorage();
    if (!restored) {
      return null;
    }
  }

  return currentUser;
};

/**
 * Check if user is authenticated
 * @returns {boolean} - Authentication status
 */
export const isAuthenticated = () => {
  // If we have a user but token is expired, clear state and return false
  if (currentUser && authToken && !isTokenValid(authToken)) {
    clearAuthState();
    return false;
  }
  return !!currentUser && !!authToken;
};

/**
 * Get current auth token
 * @returns {string|null} - Auth token or null
 */
export const getAuthToken = () => {
  // If token is expired, clear state and return null
  if (authToken && !isTokenValid(authToken)) {
    clearAuthState();
    return null;
  }
  return authToken;
};

/**
 * Verify token validity
 * @param {string} token - Token to verify
 * @returns {Promise<Object>} - Verification result
 */
export const verifyToken = async (token) => {
  const tokenToVerify = token || authToken;
  if (!tokenToVerify) {
    return { valid: false, user: null };
  }

  // Check token expiry locally first
  if (!isTokenValid(tokenToVerify)) {
    if (tokenToVerify === authToken) {
      clearAuthState();
    }
    return { valid: false, user: null };
  }

  // Always verify with the backend so we pick up any server-side changes,
  // even when re-verifying the currently active session's token.
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenToVerify}`,
      },
    });

    const result = await response.json();

    if (response.ok && result.success) {
      const userData = result.data?.user || result.data || {};
      const user = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role?.name || userData.role || "user",
        firstName: userData.first_name || userData.firstName || "",
        lastName: userData.last_name || userData.lastName || "",
      };

      if (tokenToVerify === authToken) {
        currentUser = user;
      }

      return { valid: true, user };
    }

    if (tokenToVerify === authToken) {
      clearAuthState();
    }

    return { valid: false, user: null };
  } catch (_error) {
    // Network failure: if we're re-verifying the currently active session,
    // fall back to the cached user rather than treating this as invalid.
    if (tokenToVerify === authToken && currentUser) {
      return { valid: true, user: currentUser };
    }
    return { valid: false, user: null };
  }
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @param {string} userData.username - Username
 * @param {string} userData.email - Email address
 * @param {string} userData.password - Password
 * @param {string} userData.firstName - First name
 * @param {string} userData.lastName - Last name
 * @returns {Promise<Object>} - Registration result
 */
export const register = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        first_name: userData.firstName || userData.first_name || "",
        last_name: userData.lastName || userData.last_name || "",
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return {
        success: true,
        message: result.message || "Registration successful. Please log in.",
        data: result.data,
      };
    }

    // Handle failure with proper error shaping
    throw {
      success: false,
      message: result?.error?.message || result?.message || "Registration failed. Please try again.",
    };
  } catch (error) {
    if (error?.success === false) {
      return error;
    }
    return {
      success: false,
      message: "Registration failed. Please try again.",
    };
  }
};

/**
 * Self-register a new user (with admin approval workflow)
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} - Registration result
 */
export const selfRegister = async (userData) => {
  try {
    const response = await apiPost("/auth/self-register", {
      username: userData.username,
      email: userData.email,
      password: userData.password,
      first_name: userData.firstName || userData.first_name || "",
      last_name: userData.lastName || userData.last_name || "",
    });

    return {
      success: true,
      message: response.message || "Registration submitted. Awaiting admin approval.",
      data: response.data,
    };
  } catch (error) {
    // Handle error with proper message extraction
    // Note: For self-register, specific messages are okay since this isn't a login endpoint
    const errorMessage =
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.message ||
      "Registration failed. Please try again.";

    return {
      success: false,
      message: errorMessage,
    };
  }
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} - Reset request result
 */
export const requestPasswordReset = async (email) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/request-password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();

    // Always return neutral message on success to prevent email enumeration
    if (response.ok && result.success) {
      return {
        success: true,
        message: "If the email exists, a password reset link has been sent",
      };
    }

    // Also return neutral message on failure to prevent email enumeration
    return {
      success: false,
      message: "Unable to process password reset request. Please try again.",
    };
  } catch (_error) {
    return {
      success: false,
      message: "Unable to process password reset request. Please try again.",
    };
  }
};

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Reset result
 */
export const resetPassword = async (token, newPassword) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: newPassword }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      const message = result.data?.message || result.message || "Password reset successfully";

      return {
        success: true,
        message,
      };
    }

    // Handle failure
    const errorMessage =
      result?.error?.message ||
      result?.data?.message ||
      result?.message ||
      "Invalid or expired reset token. Please request a new one.";

    return {
      success: false,
      message: errorMessage,
    };
  } catch (_error) {
    return {
      success: false,
      message: "Unable to reset password. Please try again.",
    };
  }
};

/**
 * Update user profile
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} - Update result
 */
export const updateProfile = async (profileData) => {
  if (!currentUser || !authToken) {
    throw {
      success: false,
      message: "Not authenticated",
    };
  }

  // Check token validity before making request
  if (!isTokenValid(authToken)) {
    clearAuthState();
    throw {
      success: false,
      message: "Session expired. Please log in again.",
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        first_name: profileData.firstName || profileData.first_name,
        last_name: profileData.lastName || profileData.last_name,
        email: profileData.email,
      }),
    });

    const result = await response.json();

    // If token is invalid, clear state
    if (response.status === 401) {
      clearAuthState();
      throw {
        success: false,
        message: "Session expired. Please log in again.",
      };
    }

    if (response.ok && result.success) {
      const userData = result.data?.user || result.data || {};
      // Merge role as well so server-side role changes are applied
      currentUser = {
        ...currentUser,
        firstName: userData.first_name || userData.firstName || currentUser.firstName,
        lastName: userData.last_name || userData.lastName || currentUser.lastName,
        email: userData.email || currentUser.email,
        role: userData.role?.name || userData.role || currentUser.role,
      };

      // Update localStorage
      try {
        localStorage.setItem("user", JSON.stringify(currentUser));
      } catch (_e) {
        // Ignore localStorage errors
      }

      return {
        success: true,
        user: currentUser,
        message: result.message || "Profile updated successfully",
      };
    }

    throw {
      success: false,
      message: result?.error?.message || result?.message || "Unable to update profile. Please try again.",
    };
  } catch (error) {
    if (error?.success === false) {
      throw error;
    }
    throw {
      success: false,
      message: "Unable to update profile. Please try again.",
    };
  }
};

export default {
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
};
