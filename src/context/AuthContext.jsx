import { createContext, useContext, useEffect, useState } from "react";

import * as authService from "../services/authService";

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
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load authentication state from localStorage on component mount
  useEffect(() => {
    const savedUser = localStorage.getItem("thermacore_user");
    const savedRole = localStorage.getItem("thermacore_role");

    if (savedUser && savedRole) {
      setUser(JSON.parse(savedUser));
      setUserRole(savedRole);
    }
    setIsLoading(false);
  }, []);

  const login = async (username, password) => {
    setIsLoading(true);
    
    try {
      // Call the backend authentication API
      const result = await authService.login(username, password);
      
      if (result.success) {
        const userData = { 
          username: result.user.username, 
          role: result.user.role,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        };
        
        setUser(userData);
        setUserRole(result.user.role);

        // Persist to localStorage
        localStorage.setItem("thermacore_user", JSON.stringify(userData));
        localStorage.setItem("thermacore_role", result.user.role);
        localStorage.setItem("thermacore_token", result.token);
        
        setIsLoading(false);
        return { success: true, role: result.user.role };
      } else {
        setIsLoading(false);
        return { success: false, error: result.message || "Invalid credentials!" };
      }
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return { success: false, error: "An error occurred during login. Please try again." };
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    setUser(null);
    setUserRole(null);

    // Clear from localStorage
    localStorage.removeItem("thermacore_user");
    localStorage.removeItem("thermacore_role");
    localStorage.removeItem("thermacore_token");
    setIsLoggingOut(false);
  };

  const value = {
    user,
    userRole,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading,
    isLoggingOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
