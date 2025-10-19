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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // Frontend role (admin/user)
  const [backendRole, setBackendRole] = useState(null); // Backend role (admin/operator/viewer)
  const [permissions, setPermissions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load authentication state from localStorage on component mount
  useEffect(() => {
    const savedUser = localStorage.getItem("thermacore_user");
    const savedRole = localStorage.getItem("thermacore_role");
    const savedBackendRole = localStorage.getItem("thermacore_backend_role");

    if (savedUser && savedRole) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      
      // Use backend role if available, otherwise fall back to saved role
      const effectiveBackendRole = savedBackendRole || savedRole;
      setBackendRole(effectiveBackendRole);
      
      // Set frontend role and permissions based on backend role
      const frontendRole = getFrontendRole(effectiveBackendRole);
      setUserRole(frontendRole);
      setPermissions(getPermissions(effectiveBackendRole));
    }
    setIsLoading(false);
  }, []);

  const login = async (username, password) => {
    setIsLoading(true);
    console.log('[AuthContext] Starting login for user:', username);
    
    try {
      // Call the backend authentication API
      const result = await authService.login(username, password);
      console.log('[AuthContext] Login API result:', result);
      
      if (result.success) {
        // Backend role is the actual role from the API (admin/operator/viewer)
        const userBackendRole = result.user.role;
        console.log('[AuthContext] Backend role:', userBackendRole);
        
        // Frontend role is simplified (admin/user) for UI consistency
        const userFrontendRole = getFrontendRole(userBackendRole);
        console.log('[AuthContext] Frontend role:', userFrontendRole);
        
        // Get permissions based on backend role
        const userPermissions = getPermissions(userBackendRole);
        console.log('[AuthContext] User permissions:', userPermissions);
        
        const userData = { 
          username: result.user.username, 
          role: userFrontendRole, // Store frontend role for backward compatibility
          backendRole: userBackendRole, // Store actual backend role
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        };
        
        console.log('[AuthContext] Setting user data:', userData);
        setUser(userData);
        setUserRole(userFrontendRole);
        setBackendRole(userBackendRole);
        setPermissions(userPermissions);

        // Persist to localStorage
        localStorage.setItem("thermacore_user", JSON.stringify(userData));
        localStorage.setItem("thermacore_role", userFrontendRole);
        localStorage.setItem("thermacore_backend_role", userBackendRole);
        localStorage.setItem("thermacore_token", result.token);
        
        console.log('[AuthContext] User state updated and persisted to localStorage');
        setIsLoading(false);
        return { success: true, role: userFrontendRole };
      } else {
        console.log('[AuthContext] Login failed:', result.message);
        setIsLoading(false);
        return { success: false, error: result.message || "Invalid username or password. Please try again." };
      }
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      setIsLoading(false);
      return { success: false, error: "Invalid username or password. Please try again." };
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    setUser(null);
    setUserRole(null);
    setBackendRole(null);
    setPermissions(null);

    // Clear from localStorage
    localStorage.removeItem("thermacore_user");
    localStorage.removeItem("thermacore_role");
    localStorage.removeItem("thermacore_backend_role");
    localStorage.removeItem("thermacore_token");
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
