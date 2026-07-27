import { createContext, useContext, useEffect, useState, useRef } from "react";

import { apiGetJson } from "../utils/apiFetch";
import { useAuth } from "./AuthContext";
import { units } from "../data/mockUnits";

const TenantContext = createContext();

// Shared constant for API base URL fallback
const API_BASE_URL_FALLBACK = "https://thermacoreapp.onrender.com";

// Generate mock tenants from units data for demo purposes
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

  // Use a ref to track currentTenant without triggering re-renders
  const currentTenantRef = useRef(currentTenant);
  useEffect(() => {
    currentTenantRef.current = currentTenant;
  }, [currentTenant]);

  // Check roles
  const isAdmin = backendRole === "admin";
  const isClientAdmin = backendRole === "client_admin";
  const canSwitchTenants = isAdmin || isClientAdmin;

  // Track loading state for available tenants separately
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);

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

        // Handle response.success properly
        if (response?.success === false) {
          setError(response.error || "Failed to load current tenant");
        } else if (response.data) {
          setCurrentTenant(response.data);
        } else if (response.message) {
          // Admin user with cross-tenant access
          setCurrentTenant(null);
        } else {
          // No data, no message, no error - fallback
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

  // Load available tenants based on user role
  // Uses currentTenantRef to avoid re-fetching when currentTenant changes
  useEffect(() => {
    const loadAvailableTenants = async () => {
      if (!user) {
        setAvailableTenants([]);
        setIsLoadingTenants(false);
        return;
      }

      if (!canSwitchTenants) {
        // Non-admin (Operator / Viewer): set availableTenants to [currentTenant] or [user.tenant]
        if (user.tenant) {
          setAvailableTenants([user.tenant]);
        } else if (currentTenantRef.current) {
          setAvailableTenants([currentTenantRef.current]);
        } else {
          setAvailableTenants([]);
        }
        setIsLoadingTenants(false);
        return;
      }

      try {
        setIsLoadingTenants(true);

        const response = await apiGetJson(
          `${import.meta.env.VITE_API_BASE_URL || API_BASE_URL_FALLBACK}/api/v1/tenants?active_only=true`,
        );

        let loadedTenants = [];
        if (response?.success !== false && response?.data && response.data.length > 0) {
          loadedTenants = response.data;
        } else {
          loadedTenants = generateMockTenants();
        }

        // Role-based filtering:
        // System Admin: ALL tenants — merge whatever the backend returns
        // with the full mock tenant list, so admin always sees every demo
        // client even when the backend only has partial seed data (e.g. ACME).
        if (isAdmin) {
          // Generate full mock tenant list from mockUnits.js
          const mockTenants = generateMockTenants();
          // Merge with backend data — use Map to deduplicate by name
          const combined = new Map();
          mockTenants.forEach((t) => combined.set(t.name, t));
          loadedTenants.forEach((t) => combined.set(t.name, t)); // real data wins on conflicts
          setAvailableTenants(Array.from(combined.values()));
        } else if (isClientAdmin && user?.client_id) {
          const userClientId = Number(user.client_id);
          const filtered = loadedTenants.filter(
            (t) => (t.client_id !== undefined && Number(t.client_id) === userClientId) ||
                   (t.clientId !== undefined && Number(t.clientId) === userClientId)
          );
          setAvailableTenants(filtered.length > 0 ? filtered : loadedTenants);
        } else {
          setAvailableTenants(loadedTenants);
        }
      } catch (_err) {
        // API error - use mock tenants for demo
        const mockTenants = generateMockTenants();
        if (isClientAdmin && user?.client_id) {
          const userClientId = Number(user.client_id);
          const filtered = mockTenants.filter(
            (t) => Number(t.client_id) === userClientId || Number(t.clientId) === userClientId
          );
          setAvailableTenants(filtered.length > 0 ? filtered : mockTenants);
        } else if (isAdmin) {
          // Admin gets all mock tenants on API error
          setAvailableTenants(mockTenants);
        } else {
          setAvailableTenants(mockTenants);
        }
      } finally {
        setIsLoadingTenants(false);
      }
    };

    loadAvailableTenants();
  }, [user, backendRole, isAdmin, isClientAdmin, canSwitchTenants]);

  // Switch tenant - no-op on invalid tenant ID
  const switchTenant = (tenantId) => {
    if (!canSwitchTenants) {
      return;
    }

    // If tenantId is null, that means "All Tenants" is selected
    if (tenantId === null) {
      setCurrentTenant(null);
      return;
    }

    // Only switch if tenant exists in available tenants
    const tenant = availableTenants.find((t) => t.id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant);
    }
  };

  // Get tenant ID for API calls
  const getTenantQueryParam = () => {
    if (!canSwitchTenants || !currentTenant) {
      return "";
    }
    return `?tenant_id=${currentTenant.id}`;
  };

  const value = {
    currentTenant,
    availableTenants,
    isLoading: isLoading || isLoadingTenants,
    isLoadingTenants,
    error,
    isAdmin,
    isClientAdmin,
    canSwitchTenants,
    switchTenant,
    getTenantQueryParam,
  };

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
};
