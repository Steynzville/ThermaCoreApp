/**
 * User formatting utilities
 * Contains helper functions for formatting user data
 */

/**
 * Capitalize the first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Format user's full name from first and last name, with fallback to username
 * @param {Object} user - User object
 * @param {string} [user.first_name] - User's first name
 * @param {string} [user.last_name] - User's last name
 * @param {string} user.username - User's username (used as fallback)
 * @returns {string} Formatted full name or username
 */
export const formatUserName = (user) => {
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`.trim();
  }
  return user.username;
};

/**
 * Format role name with proper capitalization
 * @param {Object|string} role - Role object with name property or role name string
 * @param {string} [defaultRole='Viewer'] - Default role if none provided
 * @returns {string} Capitalized role name
 */
export const formatRoleName = (role, defaultRole = "Viewer") => {
  const roleName = typeof role === "string" ? role : role?.name;
  return roleName ? capitalize(roleName) : defaultRole;
};
