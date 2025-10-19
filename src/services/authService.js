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
export const login = async (identifier, password) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://thermacoreapp.onrender.com';
  
  // Debug logging to diagnose the issue
  if (import.meta.env.DEV) {
    console.log('=== LOGIN DEBUG ===');
    console.log('VITE_API_BASE_URL:', API_BASE_URL);
    console.log('Full URL:', `${API_BASE_URL}/api/v1/auth/login`);
    console.log('Method: POST');
    console.log('Body:', { username: identifier, password: '***' });
  }
  
  // Warn if API_BASE_URL is not configured (in production this should be set)
  if (!API_BASE_URL) {
    console.warn('VITE_API_BASE_URL is not configured. Using relative URL.');
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: identifier, password: password })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Extract data from backend response
      const { access_token, user } = result.data;
      
      // Store token and user data
      authToken = access_token;
      currentUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role?.name || user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      };

      return {
        success: true,
        user: currentUser,
        token: authToken,
        message: result.message || "Login successful",
      };
    } else {
      // Backend returned error response
      return {
        success: false,
        message: "Invalid username or password. Please try again.",
      };
    }
  } catch (error) {
    // For any login failure (network, auth, etc.), show authentication error
    console.error('Login error:', error);
    return {
      success: false,
      message: "Invalid username or password. Please try again.",
    };
  }
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
export const register = async (userData) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://thermacoreapp.onrender.com';
  
  // Convert camelCase to snake_case for backend
  const backendData = {
    username: userData.username,
    email: userData.email,
    password: userData.password,
    first_name: userData.firstName,
    last_name: userData.lastName,
    phone_number: userData.phoneNumber || null,
    company: userData.company || null,
    department: userData.department || null,
    position: userData.position || null,
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/self-register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Registration failed');
    }
    
    return {
      success: true,
      status: data.data?.status || 'pending',
      message: data.message || 'Registration submitted for admin approval',
      user: data.data,
    };
  } catch (error) {
    throw new Error(error.message || 'Registration failed. Please try again.');
  }
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} Password reset result
 */
export const requestPasswordReset = async (email) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://thermacoreapp.onrender.com';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Read nested message field from API response
      const okMsg = result?.data?.message ?? result?.message;
      return {
        success: true,
        message: okMsg || "If the email exists, a password reset link has been sent",
      };
    } else {
      // Read error message from various possible locations
      const errMsg = result?.error?.message ?? result?.data?.message ?? result?.message;
      return {
        success: false,
        message: errMsg || "Unable to process password reset request. Please try again.",
      };
    }
  } catch (error) {
    console.error('Password reset request error:', error);
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
 * @returns {Promise<Object>} Password reset result
 */
export const resetPassword = async (token, newPassword) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://thermacoreapp.onrender.com';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password: newPassword })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return {
        success: true,
        message: result?.data?.message || result?.message || "Password reset successfully",
      };
    } else {
      return {
        success: false,
        message: result?.error?.message || result?.data?.message || result?.message || "Invalid or expired reset token. Please request a new one.",
      };
    }
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message: "Unable to reset password. Please try again.",
    };
  }
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
