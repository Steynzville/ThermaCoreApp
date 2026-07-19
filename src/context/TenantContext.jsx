import { createContext, useContext, useEffect, useState } from "react";

import { apiGetJson } from "../utils/apiFetch";
import { useAuth } from "./AuthContext";
import { units } from "../data/mockUnits";

const TenantContext = createContext();

// Shared constant for API base URL fallback
const API_BASE_URL_FALLBACK = "https://thermacoreapp.onrender.com";

// ✅ NEW: Generate mock tenants from units data for demo purposes
const generateMockTenants = () => {
  const tenantMap = new Map();
  units.forEach((unit) => {
    if (unit.client && unit.client.name) {
      const clientName = unit.client.name;
      if (!tenantMap.has(clientName)) {
        tenantMap.set(clientName, {
          id: `tenant-${clientName.replace(/\s+/g, "-").toLowerCase()}`,
          name: clientName,
          unitCount: units.filter((u) => u.client?.name === clientName).length,
        });
      }
    }
  });
  return Array.from(tenantMap.values());
};

export const useTenant = () => {
  const context = useContext(TenantContext);
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

        if (response.data && response.data.length > 0) {
          setAvailableTenants(response.data);
        } else {
          // ✅ NEW: No tenants from API - use mock tenants for demo
          const mockTenants = generateMockTenants();
          setAvailableTenants(mockTenants);
        }
      } catch (_err) {
        // ✅ NEW: API error - use mock tenants for demo
        const mockTenants = generateMockTenants();
        setAvailableTenants(mockTenants);
      }
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
