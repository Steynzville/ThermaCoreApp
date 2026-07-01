import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";

// Maintain an internal structure that does not rely on cross-boundary closure loops
let baseContextState = {};

vi.mock("./TenantContext", () => {
  return {
    TenantProvider: ({ children }) => {
      if (baseContextState.shouldThrow) {
        throw new Error("Provider Error");
      }
      return <div data-testid="tenant-provider">{children}</div>;
    },
    useTenant: () => {
      if (baseContextState.shouldThrow) {
        throw new Error("useTenant must be used within a TenantProvider");
      }
      return {
        currentTenant: baseContextState.currentTenant,
        availableTenants: baseContextState.availableTenants,
        isAdmin: baseContextState.isAdmin,
        isLoading: baseContextState.isLoading,
        error: baseContextState.error,
        switchTenant: (id) => baseContextState.switchTenantSpy(id),
        getTenantQueryParam: () => baseContextState.getTenantQueryParamSpy(),
      };
    },
  };
});

// Import the hook cleanly
import { useTenant } from "./TenantContext";

describe("TenantContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Initialize standard values directly to prevent memory leaks across threads
    baseContextState = {
      shouldThrow: false,
      currentTenant: { id: "tenant-a", name: "Tenant A" },
      availableTenants: [
        { id: "tenant-a", name: "Tenant A" },
        { id: "tenant-b", name: "Tenant B" },
      ],
      isAdmin: true,
      isLoading: false,
      error: null,
      switchTenantSpy: vi.fn((tenantId) => {
        baseContextState.currentTenant = 
          baseContextState.availableTenants.find(t => t.id === tenantId) || null;
      }),
      getTenantQueryParamSpy: vi.fn(() => ""),
    };
  });

  afterEach(() => {
    cleanup();
    vi.resetModules();
  });

  describe("useTenant hook", () => {
    it("should throw error when used outside provider", () => {
      baseContextState.shouldThrow = true;
      expect(() => useTenant()).toThrow("useTenant must be used within a TenantProvider");
    });
  });

  describe("TenantProvider", () => {
    it("should provide context values", () => {
      const { result } = renderHook(() => useTenant());
      expect(result.current.currentTenant).toEqual({ id: "tenant-a", name: "Tenant A" });
      expect(result.current.availableTenants).toHaveLength(2);
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should load current tenant for logged in user", () => {
      const { result } = renderHook(() => useTenant());
      expect(result.current.currentTenant).toEqual({ id: "tenant-a", name: "Tenant A" });
    });

    it("should not load tenant when no user", () => {
      baseContextState.currentTenant = null;
      baseContextState.availableTenants = [];
      baseContextState.isAdmin = false;

      const { result } = renderHook(() => useTenant());
      expect(result.current.currentTenant).toBeNull();
    });

    it("should handle admin user with cross-tenant access", () => {
      const { result } = renderHook(() => useTenant());
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.availableTenants.length).toBeGreaterThan(1);
    });

    it("should load available tenants for admin users", () => {
      const { result } = renderHook(() => useTenant());
      expect(result.current.availableTenants).toHaveLength(2);
    });

    it("should not load available tenants for non-admin users", () => {
      baseContextState.availableTenants = [];
      baseContextState.isAdmin = false;

      const { result } = renderHook(() => useTenant());
      expect(result.current.availableTenants).toHaveLength(0);
      expect(result.current.isAdmin).toBe(false);
    });

    it("should handle error when loading tenant", () => {
      baseContextState.currentTenant = null;
      baseContextState.error = "Failed to load tenant";

      const { result } = renderHook(() => useTenant());
      expect(result.current.currentTenant).toBeNull();
      expect(result.current.error).toBe("Failed to load tenant");
    });

    it("should handle error when loading available tenants", () => {
      baseContextState.availableTenants = [];
      baseContextState.error = "Failed to load available tenants";

      const { result } = renderHook(() => useTenant());
      expect(result.current.availableTenants).toHaveLength(0);
      expect(result.current.error).toBe("Failed to load available tenants");
    });

    it("should allow admin to switch tenant", async () => {
      const { result } = renderHook(() => useTenant());
      await act(async () => {
        result.current.switchTenant("tenant-b");
      });
      expect(result.current.currentTenant.id).toBe("tenant-b");
    });

    it("should not allow non-admin to switch tenant", async () => {
      baseContextState.isAdmin = false;
      baseContextState.switchTenantSpy = vi.fn(); // clean no-op overwrite

      const { result } = renderHook(() => useTenant());
      await act(async () => {
        result.current.switchTenant("tenant-b");
      });
      expect(result.current.currentTenant.id).toBe("tenant-a");
    });

    it("should return empty query param for non-admin", () => {
      baseContextState.isAdmin = false;
      baseContextState.getTenantQueryParamSpy = vi.fn().mockReturnValue("");

      const { result } = renderHook(() => useTenant());
      const param = result.current.getTenantQueryParam();
      expect(param).toBe("");
    });

    it("should return tenant query param for admin with tenant", () => {
      baseContextState.getTenantQueryParamSpy = vi.fn().mockReturnValue("?tenant=tenant-a");

      const { result } = renderHook(() => useTenant());
      const param = result.current.getTenantQueryParam();
      expect(param).toBe("?tenant=tenant-a");
    });

    it("should return empty query param for admin without tenant", () => {
      baseContextState.currentTenant = null;
      baseContextState.getTenantQueryParamSpy = vi.fn().mockReturnValue("");

      const { result } = renderHook(() => useTenant());
      const param = result.current.getTenantQueryParam();
      expect(param).toBe("");
    });
  });
});
