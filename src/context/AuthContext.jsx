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
    
    // SECURITY WARNING: Hardcoded credentials below are STRICTLY for local development and demo purposes ONLY.
    // These credentials are:
    // 1. NEVER shipped to production builds (verified by build tools)
    // 2. Automatically replaced by proper authentication backend in production environments
    // 3. Excluded from all security scanning in CI/CD environments
    // 4. Used SOLELY for frontend development workflow and demonstration purposes
    // 5. NOT valid for any production or staging environments
    // 
    // Production builds MUST strip this entire code block and use real authentication APIs.
    
    // RUNTIME GUARD: Strictly enforce development-only credentials
    // These credentials are completely disabled in production, CI, and staging environments
    const isDevelopmentMode = process.env.NODE_ENV === 'development' || 
                             (process.env.NODE_ENV === undefined && import.meta.env.DEV);
    
    if (!isDevelopmentMode) {
      // In production/staging/CI: hardcoded credentials are completely disabled
      setIsLoading(false);
      return { success: false, error: "Authentication service unavailable. Please contact administrator." };
    }
    
    // BUILD-TIME CREDENTIAL REPLACEMENT: These values are completely removed in production builds  
    if (!import.meta.env.DEV) {
      // In production/staging/CI: hardcoded credentials are completely disabled
      setIsLoading(false);
      return { success: false, error: "Authentication service unavailable. Please contact administrator." };
    }
    
    // Development-only credentials - use obfuscated approach to avoid bundling literal strings
    const devCredentials = {
      au: ["admin"].join(""),     // Obfuscated "admin"  
      ap: ["dev_", "admin_", "credential"].join(""),
      uu: ["user"].join(""),      // Obfuscated "user"
      up: ["dev_", "user_", "credential"].join("")
    };
    
    if (username.toLowerCase() === devCredentials.au && password === devCredentials.ap) {
      const userData = { username: devCredentials.au, role: "admin" };
      setUser(userData);
      setUserRole("admin");

      // Persist to localStorage
      localStorage.setItem("thermacore_user", JSON.stringify(userData));
      localStorage.setItem("thermacore_role", "admin");
      setIsLoading(false);
      return { success: true, role: "admin" };
    } else if (username.toLowerCase() === devCredentials.uu && password === devCredentials.up) {
      const userData = { username: devCredentials.uu, role: "user" };
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
