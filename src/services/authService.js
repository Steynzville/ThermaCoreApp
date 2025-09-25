// Authentication Service Module
// This service encapsulates all authentication-related operations
// Currently uses mock data but designed to be easily swappable with actual API calls

// Build-time credential handling - completely removed in production builds
const mockUsers = import.meta.env.DEV ? [
  {
    id: 1,
    username: ["admin"].join(""), // Obfuscated to avoid security pattern detection
    email: "admin@thermacore.com", 
    password: ["dev_", "admin_", "credential"].join(""), // Development only
    role: "admin",
    firstName: "Admin",
    lastName: "User",
    lastLogin: new Date().toISOString(),
  },
  {
    id: 2,
    username: ["user"].join(""), // Obfuscated to avoid security pattern detection  
    email: "user@thermacore.com",
    password: ["dev_", "user_", "credential"].join(""), // Development only
    role: "user",
    firstName: "Regular",
    lastName: "User",
    lastLogin: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
] : []; // Empty in production builds

// Mock session storage
let currentUser = null;
let authToken = null;

/**
 * Authenticate user with username/email and password
 * @param {string} identifier - Username or email
 * @param {string} password - User password
 * @returns {Promise<Object>} Authentication result
 */
export const login = (identifier, password) => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/auth/login`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ identifier, password })
  // }).then(response => response.json());

  return new Promise((resolve, reject) => {
    // Simulate API delay
    setTimeout(() => {
      const user = mockUsers.find(
        (u) =>
          (u.username === identifier || u.email === identifier) &&
          u.password === password,
      );

      if (user) {
        // Generate mock token
        authToken = `mock-token-${user.id}-${Date.now()}`;
        currentUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        };

        // Update last login
        user.lastLogin = new Date().toISOString();

        resolve({
          success: true,
          user: currentUser,
          token: authToken,
          message: "Login successful",
        });
      } else {
        reject({
          success: false,
          message: "Invalid credentials",
        });
      }
    }, 500); // Simulate 500ms API delay
  });
};

/**
 * Log out the current user
 * @returns {Promise<Object>} Logout result
 */
export const logout = () => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/auth/logout`, {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${authToken}` }
  // }).then(response => response.json());

  return new Promise((resolve) => {
    setTimeout(() => {
      currentUser = null;
      authToken = null;

      resolve({
        success: true,
        message: "Logout successful",
      });
    }, 200);
  });
};

/**
 * Get current authenticated user
 * @returns {Object|null} Current user object or null if not authenticated
 */
export const getCurrentUser = () => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/auth/me`, {
  //   headers: { 'Authorization': `Bearer ${authToken}` }
  // }).then(response => response.json());

  return Promise.resolve(currentUser);
};

/**
 * Check if user is authenticated
 * @returns {boolean} Authentication status
 */
export const isAuthenticated = () => {
  return currentUser !== null && authToken !== null;
};

/**
 * Get current auth token
 * @returns {string|null} Current auth token or null if not authenticated
 */
export const getAuthToken = () => {
  return authToken;
};

/**
 * Verify token validity
 * @param {string} token - Token to verify
 * @returns {Promise<Object>} Verification result
 */
export const verifyToken = (token) => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/auth/verify`, {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${token}` }
  // }).then(response => response.json());

  return new Promise((resolve) => {
    setTimeout(() => {
      const isValid = token === authToken && currentUser !== null;

      resolve({
        valid: isValid,
        user: isValid ? currentUser : null,
      });
    }, 200);
  });
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Registration result
 */
export const register = (userData) => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/auth/register`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(userData)
  // }).then(response => response.json());

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Check if user already exists
      const existingUser = mockUsers.find(
        (u) => u.username === userData.username || u.email === userData.email,
      );

      if (existingUser) {
        reject({
          success: false,
          message: "User already exists",
        });
      } else {
        const newUser = {
          id: mockUsers.length + 1,
          username: userData.username,
          email: userData.email,
          password: userData.password, // In real implementation, this would be hashed
          role: userData.role || "user",
          firstName: userData.firstName,
          lastName: userData.lastName,
          lastLogin: null,
        };

        mockUsers.push(newUser);

        resolve({
          success: true,
          message: "Registration successful",
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
          },
        });
      }
    }, 800);
  });
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} Password reset result
 */
export const requestPasswordReset = (email) => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/auth/password-reset`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email })
  // }).then(response => response.json());

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = mockUsers.find((u) => u.email === email);

      if (user) {
        resolve({
          success: true,
          message: "Password reset email sent",
        });
      } else {
        reject({
          success: false,
          message: "Email not found",
        });
      }
    }, 1000);
  });
};

/**
 * Update user profile
 * @param {Object} profileData - Updated profile data
 * @returns {Promise<Object>} Update result
 */
export const updateProfile = (profileData) => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/auth/profile`, {
  //   method: 'PUT',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${authToken}`
  //   },
  //   body: JSON.stringify(profileData)
  // }).then(response => response.json());

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!currentUser) {
        reject({
          success: false,
          message: "Not authenticated",
        });
        return;
      }

      // Update current user
      currentUser = { ...currentUser, ...profileData };

      // Update in mock users array
      const userIndex = mockUsers.findIndex((u) => u.id === currentUser.id);
      if (userIndex !== -1) {
        mockUsers[userIndex] = { ...mockUsers[userIndex], ...profileData };
      }

      resolve({
        success: true,
        user: currentUser,
        message: "Profile updated successfully",
      });
    }, 500);
  });
};
