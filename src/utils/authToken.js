/**
 * Authentication token utilities
 * Shared functions for retrieving and managing auth tokens across the application
 */

/**
 * Get authentication token from storage
 * Checks both localStorage and sessionStorage to support both
 * "Keep me signed in" and session-only authentication
 *
 * @returns {string|null} The authentication token if found, null otherwise
 */
export const getAuthToken = () => {
  return (
    localStorage.getItem("thermacore_token") ||
    sessionStorage.getItem("thermacore_token") ||
    localStorage.getItem("authToken")
  );
};

/**
 * Check if user has a valid token stored
 *
 * @returns {boolean} True if token exists, false otherwise
 */
export const hasAuthToken = () => {
  return !!getAuthToken();
};
