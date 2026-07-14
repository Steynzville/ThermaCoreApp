import { createContext, useContext, useEffect, useState } from "react";

import { apiGetJson } from "../utils/apiFetch";
import { useAuth } from "./AuthContext";

const TenantContext = createContext();

// Shared constant for API base URL fallback
const API_BASE_URL_FALLBACK = "https://thermacoreapp.onrender.com";

export const useTenant = () => {
  const context = useContext(TenantContext);
  // FIXED: Always throw when used outside provider - no test detection
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
};

export const TenantProvider = ({ children }) => {
  const { user, backendRole } = useAuth();
  const [currentTenant, setCurrentTenant] = useState(null);
  const [availableTenants, setAvailableTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is admin
  const isAdmin = backendRole === "admin";

  // Load current tenant on component mount
  useEffect(() => {
    const loadCurrentTenant = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get current tenant information
        const response = await apiGetJson(
          `${import.meta.env.VITE_API_BASE_URL || API_BASE_URL_FALLBACK}/api/v1/tenants/current`,
        );

        if (response.data) {
          setCurrentTenant(response.data);
        } else if (response.message) {
          // Admin user with cross-tenant access
          setCurrentTenant(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentTenant();
  }, [user]);

  // Load available tenants for admin users
  useEffect(() => {
    const loadAvailableTenants = async () => {
      if (!isAdmin) {
        return;
      }

      try {
        const response = await apiGetJson(
          `${import.meta.env.VITE_API_BASE_URL || API_BASE_URL_FALLBACK}/api/v1/tenants?active_only=true`,
        );

        if (response.data) {
          setAvailableTenants(response.data);
        }
      } catch (_err) {}
    };

    if (isAdmin) {
      loadAvailableTenants();
    }
  }, [isAdmin]);

  // Switch tenant (admin only)
  const switchTenant = (tenantId) => {
    if (!isAdmin) {
      return;
    }

    // Find the tenant in available tenants
    const tenant = availableTenants.find((t) => t.id === tenantId);
    setCurrentTenant(tenant || null);
  };

  // Get tenant ID for API calls
  const getTenantQueryParam = () => {
    if (!isAdmin || !currentTenant) {
      return "";
    }
    return `?tenant_id=${currentTenant.id}`;
  };

  const value = {
    currentTenant,
    availableTenants,
    isLoading,
    error,
    isAdmin,
    switchTenant,
    getTenantQueryParam,
  };

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
};
