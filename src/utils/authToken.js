/**
 * Authentication token utilities
 * Shared functions for retrieving and managing auth tokens across the application
 */

/**
 * Get authentication token from storage with source information
 * Checks both localStorage and sessionStorage to support both
 * "Keep me signed in" and session-only authentication
 *
 * @returns {{token: string|null, source: string}} Token and its source location
 */
export const getAuthTokenWithSource = () => {
  const localThermacore = localStorage.getItem("thermacore_token");
  if (localThermacore) {
    return { token: localThermacore, source: "localStorage:thermacore_token" };
  }

  const sessionThermacore = sessionStorage.getItem("thermacore_token");
  if (sessionThermacore) {
    return {
      token: sessionThermacore,
      source: "sessionStorage:thermacore_token",
    };
  }

  const localAuth = localStorage.getItem("authToken");
  if (localAuth) {
    return { token: localAuth, source: "localStorage:authToken" };
  }

  return { token: null, source: "none" };
};

/**
 * Get authentication token from storage
 * Checks both localStorage and sessionStorage to support both
 * "Keep me signed in" and session-only authentication
 *
 * @returns {string|null} The authentication token if found, null otherwise
 */
export const getAuthToken = () => {
  return getAuthTokenWithSource().token;
};

/**
 * Check if user has a valid token stored
 *
 * @returns {boolean} True if token exists, false otherwise
 */
export const hasAuthToken = () => {
  return !!getAuthToken();
};
