// src/context/AuthContext.jsx

import { createContext, useContext, useEffect, useState } from "react";

import * as authService from "../services/authService";
import { getFrontendRole, getPermissions } from "../utils/permissions";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children, value: customValue }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // Frontend role (admin/user)
  const [backendRole, setBackendRole] = useState(null); // Backend role (admin/operator/viewer)
  const [permissions, setPermissions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load authentication state from localStorage or sessionStorage on component mount
  useEffect(() => {
    // Try localStorage first (for "keep me signed in")
    let savedUser = localStorage.getItem("thermacore_user");
    let savedRole = localStorage.getItem("thermacore_role");
    let savedBackendRole = localStorage.getItem("thermacore_backend_role");
    let savedToken = localStorage.getItem("thermacore_token");

    // Check completeness of localStorage session, not just savedUser
    // If localStorage is missing any required field, fall back to sessionStorage
    if (!savedUser || !savedRole || !savedToken) {
      savedUser = sessionStorage.getItem("thermacore_user");
      savedRole = sessionStorage.getItem("thermacore_role");
      savedBackendRole = sessionStorage.getItem("thermacore_backend_role");
      savedToken = sessionStorage.getItem("thermacore_token");
    }

    if (savedUser && savedRole && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        // Use backend role if available, otherwise fall back to saved role
        const effectiveBackendRole = savedBackendRole || savedRole;
        setBackendRole(effectiveBackendRole);

        // Set frontend role and permissions based on backend role
        const frontendRole = getFrontendRole(effectiveBackendRole);
        setUserRole(frontendRole);
        setPermissions(getPermissions(effectiveBackendRole));
      } catch (_error) {
        // Corrupt storage — clear it and fall back to logged-out state
        console.error("Failed to parse stored user data:", _error);
        localStorage.removeItem("thermacore_user");
        localStorage.removeItem("thermacore_role");
        localStorage.removeItem("thermacore_backend_role");
        localStorage.removeItem("thermacore_token");
        sessionStorage.removeItem("thermacore_user");
        sessionStorage.removeItem("thermacore_role");
        sessionStorage.removeItem("thermacore_backend_role");
        sessionStorage.removeItem("thermacore_token");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username, password, keepMeSignedIn = false) => {
    setIsLoading(true);

    try {
      // Call the backend authentication API
      const result = await authService.login(
        username,
        password,
        keepMeSignedIn,
      );

      if (result.success) {
        // Backend role is the actual role from the API (admin/operator/viewer)
        const userBackendRole = result.user.role;

        // Frontend role is simplified (admin/user) for UI consistency
        const userFrontendRole = getFrontendRole(userBackendRole);

        // Get permissions based on backend role
        const userPermissions = getPermissions(userBackendRole);

        const userData = {
          username: result.user.username,
          role: userFrontendRole, // Store frontend role for backward compatibility
          backendRole: userBackendRole, // Store actual backend role
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          tenantId: result.user.tenant_id, // Store tenant ID
        };

        // Determine which storage to use based on keepMeSignedIn
        const storage = keepMeSignedIn ? localStorage : sessionStorage;

        // Clear the other storage to prevent conflicts
        const otherStorage = keepMeSignedIn ? sessionStorage : localStorage;

        // Wrap ALL storage operations in a single try/catch
        // This ensures accurate error messaging if ANY storage operation fails
        try {
          otherStorage.removeItem("thermacore_user");
          otherStorage.removeItem("thermacore_role");
          otherStorage.removeItem("thermacore_backend_role");
          otherStorage.removeItem("thermacore_token");

          storage.setItem("thermacore_user", JSON.stringify(userData));
          storage.setItem("thermacore_role", userFrontendRole);
          storage.setItem("thermacore_backend_role", userBackendRole);
          storage.setItem("thermacore_token", result.token);
        } catch (_storageError) {
          console.error("Failed to save session to storage:", _storageError);
          setIsLoading(false);
          return {
            success: false,
            error: "Unable to save session. Please check your browser storage settings.",
          };
        }

        // Now set state after successful storage operations
        setUser(userData);
        setUserRole(userFrontendRole);
        setBackendRole(userBackendRole);
        setPermissions(userPermissions);

        setIsLoading(false);
        return { success: true, role: userFrontendRole, token: result.token };
      } else {
        setIsLoading(false);
        return {
          success: false,
          error:
            result.message || "Invalid username or password. Please try again.",
        };
      }
    } catch (_error) {
      console.error("Login error:", _error);
      setIsLoading(false);
      return {
        success: false,
        error: "Invalid username or password. Please try again.",
      };
    }
  };

  const logout = async () => {
    // Set loading state and ensure React flushes the render
    // This allows consumers to show a spinner before clearing state
    setIsLoggingOut(true);
    
    // Use setTimeout to ensure the state update is rendered
    // before we clear the user data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    setUser(null);
    setUserRole(null);
    setBackendRole(null);
    setPermissions(null);

    // Clear from both localStorage and sessionStorage
    localStorage.removeItem("thermacore_user");
    localStorage.removeItem("thermacore_role");
    localStorage.removeItem("thermacore_backend_role");
    localStorage.removeItem("thermacore_token");
    sessionStorage.removeItem("thermacore_user");
    sessionStorage.removeItem("thermacore_role");
    sessionStorage.removeItem("thermacore_backend_role");
    sessionStorage.removeItem("thermacore_token");
    
    setIsLoggingOut(false);
  };

  const value = {
    user,
    userRole, // Frontend role (admin/user) for backward compatibility
    backendRole, // Backend role (admin/operator/viewer) for permission checks
    permissions, // Permission object for granular access control
    login,
    logout,
    isAuthenticated: !!user,
    isLoading,
    isLoggingOut,
  };

  return <AuthContext.Provider value={customValue || value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
