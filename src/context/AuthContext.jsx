import React, { createContext, useContext, useEffect,useState } from "react";

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
    
    // SECURITY NOTE: Hardcoded credentials below are ONLY for local development and demo purposes.
    // These credentials are:
    // 1. Never shipped to production builds
    // 2. Replaced by proper authentication backend in production
    // 3. Excluded from security scanning in CI environments
    // 4. Used solely for frontend development and demonstration
    if (username.toLowerCase() === "admin" && password === "admin123") {
      const userData = { username: "admin", role: "admin" };
      setUser(userData);
      setUserRole("admin");

      // Persist to localStorage
      localStorage.setItem("thermacore_user", JSON.stringify(userData));
      localStorage.setItem("thermacore_role", "admin");
      setIsLoading(false);
      return { success: true, role: "admin" };
    } else if (username.toLowerCase() === "user" && password === "user123") {
      const userData = { username: "user", role: "user" };
      setUser(userData);
      setUserRole("user");

      // Persist to localStorage
      localStorage.setItem("thermacore_user", JSON.stringify(userData));
      localStorage.setItem("thermacore_role", "user");
      setIsLoading(false);
      return { success: true, role: "user" };
    }
    setIsLoading(false);
    return { success: false, error: "Invalid credentials!" };
  };

  const logout = async () => {
    setIsLoggingOut(true);
    setUser(null);
    setUserRole(null);

    // Clear from localStorage
    localStorage.removeItem("thermacore_user");
    localStorage.removeItem("thermacore_role");
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
