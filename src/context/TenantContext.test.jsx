/**
 * Tests for TenantContext
 * 
 * Multi-tenancy testing covering:
 * - Tenant loading for authenticated users
 * - Admin vs non-admin tenant access
 * - Client Admin tenant filtering by client_id
 * - Tenant switching (admin only)
 * - Error handling
 * - API integration
 * - Mock tenant generation
 * - System Admin sees all tenants (merged mock + real)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import { apiGetJson } from "../utils/apiFetch";
import { units } from "../data/mockUnits";

// Mock AuthContext
const mockUser = { id: 1, username: "testuser", email: "test@example.com" };
let mockBackendRole = "user";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    backendRole: mockBackendRole,
  })),
}));

// Import the mocked useAuth for manipulation
import { useAuth } from "../context/AuthContext";

// Mock apiFetch
vi.mock("../utils/apiFetch", () => ({
  apiGetJson: vi.fn(),
}));

// Import TenantContext after mocks are set up
import { TenantProvider, useTenant } from "./TenantContext";

// Mock import.meta.env
vi.stubEnv("VITE_API_BASE_URL", "https://test-api.com");

describe("TenantContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBackendRole = "user";
    // Reset mock user
    mockUser.id = 1;
    mockUser.username = "testuser";
    // Reset mock implementations
    vi.mocked(apiGetJson).mockReset();
    // Reset useAuth mock to default
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      backendRole: mockBackendRole,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("useTenant Hook", () => {
    it("should throw error when used outside TenantProvider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useTenant());
      }).toThrow("useTenant must be used within a TenantProvider");
      
      consoleSpy.mockRestore();
    });
  });

  describe("TenantProvider - Initialization", () => {
    it("should initialize with loading state", () => {
      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.currentTenant).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("should load current tenant for authenticated user", async () => {
      const mockTenant = { id: "tenant-1", name: "Test Tenant", features: [] };
      vi.mocked(apiGetJson).mockResolvedValueOnce({
        success: true,
        data: mockTenant,
      });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentTenant).toEqual(mockTenant);
      expect(result.current.error).toBeNull();
    });

    it("should handle admin user with no current tenant (cross-tenant access)", async () => {
      mockBackendRole = "admin";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "admin",
      });
      
      // Mock both calls - current tenant response and available tenants
      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          message: "Admin cross-tenant access",
        })
        .mockResolvedValueOnce({
          success: true,
          data: [],
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentTenant).toBeNull();
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.canSwitchTenants).toBe(true);
    });

    it("should handle API errors gracefully", async () => {
      vi.mocked(apiGetJson).mockRejectedValueOnce(
        new Error("Network error")
      );

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.currentTenant).toBeNull();
    });

    it("should not load tenant when user is not authenticated", async () => {
      // Clear any previous calls
      vi.mocked(apiGetJson).mockClear();
      
      // Mock useAuth to return null user
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        backendRole: null,
      });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentTenant).toBeNull();
      // Verify apiGetJson was NOT called
      expect(apiGetJson).not.toHaveBeenCalled();
    });

    it("should set isAdmin based on backendRole", async () => {
      mockBackendRole = "admin";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "admin",
      });
      
      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          data: { id: "tenant-1", name: "Test Tenant" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: [],
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.canSwitchTenants).toBe(true);
    });

    it("should set isAdmin to false for non-admin users", async () => {
      mockBackendRole = "user";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "user",
      });
      
      vi.mocked(apiGetJson).mockResolvedValueOnce({
        success: true,
        data: { id: "tenant-1", name: "Test Tenant" },
      });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.canSwitchTenants).toBe(false);
    });

    it("should set isClientAdmin based on backendRole", async () => {
      mockBackendRole = "client_admin";
      vi.mocked(useAuth).mockReturnValue({
        user: { ...mockUser, client_id: 1 },
        backendRole: "client_admin",
      });
      
      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          data: { id: "tenant-1", name: "Test Tenant", client_id: 1 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: [{ id: "tenant-1", name: "Test Tenant", client_id: 1 }],
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isClientAdmin).toBe(true);
      expect(result.current.canSwitchTenants).toBe(true);
    });
  });

  describe("Available Tenants - Admin and Client Admin", () => {
    it("should load all available tenants merged with mock tenants for admin users", async () => {
      mockBackendRole = "admin";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "admin",
      });
      
      // Only 3 tenants from backend (ACME)
      const backendTenants = [
        { id: "tenant-1", name: "ACME Sydney", client_id: 1 },
        { id: "tenant-2", name: "ACME Melbourne", client_id: 1 },
        { id: "tenant-3", name: "ACME Brisbane", client_id: 1 },
      ];

      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          data: { id: "tenant-1", name: "ACME Sydney" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: backendTenants,
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have all mock tenants + backend tenants (merged)
      // Get all unique client names from units
      const uniqueClients = new Set();
      units.forEach(unit => {
        if (unit.client?.name) {
          uniqueClients.add(unit.client.name);
        }
      });
      
      // Available tenants should include ALL mock tenants (not just the 3 from backend)
      // The merge should result in at least the number of unique clients from units
      expect(result.current.availableTenants.length).toBeGreaterThanOrEqual(uniqueClients.size);
      
      // Should include the ACME tenants from backend
      const tenantNames = result.current.availableTenants.map(t => t.name);
      expect(tenantNames).toContain("ACME Sydney");
      expect(tenantNames).toContain("ACME Melbourne");
      expect(tenantNames).toContain("ACME Brisbane");
      
      // Should also include other mock tenants from units
      const mockTenantNames = Array.from(uniqueClients);
      mockTenantNames.forEach(name => {
        expect(tenantNames).toContain(name);
      });
    });

    it("should load available tenants filtered by client_id for Client Admin", async () => {
      mockBackendRole = "client_admin";
      vi.mocked(useAuth).mockReturnValue({
        user: { ...mockUser, client_id: 1 },
        backendRole: "client_admin",
      });
      
      const mockTenants = [
        { id: "tenant-1", name: "Facility Alpha", client_id: 1 },
        { id: "tenant-2", name: "Facility Beta", client_id: 2 },
        { id: "tenant-3", name: "Facility Gamma", client_id: 1 },
      ];

      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          data: { id: "tenant-1", name: "Facility Alpha", client_id: 1 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockTenants,
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.availableTenants).toHaveLength(2);
      });

      // Should only see tenants with client_id === 1
      expect(result.current.availableTenants[0].id).toBe("tenant-1");
      expect(result.current.availableTenants[1].id).toBe("tenant-3");
    });

    it("should not load available tenants for non-admin users", async () => {
      mockBackendRole = "user";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "user",
      });
      
      vi.mocked(apiGetJson).mockResolvedValueOnce({
        success: true,
        data: { id: "tenant-1", name: "Test Tenant" },
      });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.availableTenants).toEqual([]);
      expect(apiGetJson).toHaveBeenCalledTimes(1);
    });

    it("should handle API errors when loading available tenants gracefully", async () => {
      mockBackendRole = "admin";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "admin",
      });
      
      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          data: { id: "tenant-1", name: "Tenant A" },
        })
        .mockRejectedValueOnce(
          new Error("Failed to load tenants")
        );

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // On API failure, the provider falls back to mock tenants
      // generated from unit data rather than leaving the list empty.
      await waitFor(() => {
        expect(result.current.availableTenants.length).toBeGreaterThan(0);
      });
      expect(result.current.availableTenants[0]).toHaveProperty("id");
      expect(result.current.availableTenants[0]).toHaveProperty("name");
      expect(result.current.availableTenants[0]).toHaveProperty("unitCount");
      expect(result.current.currentTenant).toBeDefined();
    });

    it("should generate mock tenants from units when API returns empty data", async () => {
      mockBackendRole = "admin";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "admin",
      });
      
      // API returns empty data
      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          data: { id: "tenant-1", name: "Test Tenant" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: [], // Empty tenants array
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have mock tenants from units
      const uniqueClients = new Set();
      units.forEach(unit => {
        if (unit.client?.name) {
          uniqueClients.add(unit.client.name);
        }
      });
      
      expect(result.current.availableTenants).toHaveLength(uniqueClients.size);
      expect(result.current.availableTenants[0]).toHaveProperty('id');
      expect(result.current.availableTenants[0]).toHaveProperty('name');
      expect(result.current.availableTenants[0]).toHaveProperty('unitCount');
    });

    it("should generate mock tenants from units when API fails", async () => {
      mockBackendRole = "admin";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "admin",
      });
      
      // First call for current tenant succeeds, second call for tenants fails
      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          data: { id: "tenant-1", name: "Test Tenant" },
        })
        .mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have mock tenants from units
      const uniqueClients = new Set();
      units.forEach(unit => {
        if (unit.client?.name) {
          uniqueClients.add(unit.client.name);
        }
      });
      
      expect(result.current.availableTenants).toHaveLength(uniqueClients.size);
    });
  });

  describe("Tenant Switching - Admin Only", () => {
    it("should allow admin to switch tenant", async () => {
      mockBackendRole = "admin";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "admin",
      });
      
      const tenants = [
        { id: "tenant-1", name: "Tenant A" },
        { id: "tenant-2", name: "Tenant B" },
      ];

      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          data: { id: "tenant-1", name: "Tenant A" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: tenants,
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.availableTenants).toHaveLength(2);
      });

      act(() => {
        result.current.switchTenant("tenant-2");
      });

      expect(result.current.currentTenant).toEqual({ id: "tenant-2", name: "Tenant B" });
    });

    it("should allow Client Admin to switch tenant", async () => {
      mockBackendRole = "client_admin";
      vi.mocked(useAuth).mockReturnValue({
        user: { ...mockUser, client_id: 1 },
        backendRole: "client_admin",
      });
      
      const tenants = [
        { id: "tenant-1", name: "Facility Alpha", client_id: 1 },
        { id: "tenant-2", name: "Facility Beta", client_id: 1 },
      ];

      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          data: { id: "tenant-1", name: "Facility Alpha", client_id: 1 },
        })
        .mockResolvedValueOnce({
          success: true,
          data: tenants,
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.availableTenants).toHaveLength(2);
      });

      act(() => {
        result.current.switchTenant("tenant-2");
      });

      expect(result.current.currentTenant).toEqual({ id: "tenant-2", name: "Facility Beta", client_id: 1 });
    });

    it("should allow admin to switch to 'All Tenants' (null)", async () => {
      mockBackendRole = "admin";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "admin",
      });
      
      const tenants = [
        { id: "tenant-1", name: "Tenant A" },
        { id: "tenant-2", name: "Tenant B" },
      ];

      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          data: { id: "tenant-1", name: "Tenant A" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: tenants,
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.availableTenants).toHaveLength(2);
      });

      act(() => {
        result.current.switchTenant(null);
      });

      expect(result.current.currentTenant).toBeNull();
    });

    it("should not allow non-admin to switch tenant", async () => {
      mockBackendRole = "user";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "user",
      });
      
      vi.mocked(apiGetJson).mockResolvedValueOnce({
        success: true,
        data: { id: "tenant-1", name: "Tenant A" },
      });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalTenant = result.current.currentTenant;

      act(() => {
        result.current.switchTenant("tenant-2");
      });

      expect(result.current.currentTenant).toEqual(originalTenant);
    });

    it("should do nothing when switching to non-existent tenant", async () => {
      mockBackendRole = "admin";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "admin",
      });
      
      const tenants = [
        { id: "tenant-1", name: "Tenant A" },
        { id: "tenant-2", name: "Tenant B" },
      ];

      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          data: { id: "tenant-1", name: "Tenant A" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: tenants,
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.availableTenants).toHaveLength(2);
      });

      // Set current tenant to tenant-1 first
      act(() => {
        result.current.switchTenant("tenant-1");
      });
      expect(result.current.currentTenant).toEqual({ id: "tenant-1", name: "Tenant A" });

      // Try switching to non-existent tenant - should do nothing
      act(() => {
        result.current.switchTenant("tenant-999");
      });

      // Current tenant should remain tenant-1 (no-op)
      expect(result.current.currentTenant).toEqual({ id: "tenant-1", name: "Tenant A" });
    });
  });

  describe("getTenantQueryParam", () => {
    it("should return empty string for non-admin users", async () => {
      mockBackendRole = "user";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "user",
      });
      
      vi.mocked(apiGetJson).mockResolvedValueOnce({
        success: true,
        data: { id: "tenant-1", name: "Test Tenant" },
      });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.getTenantQueryParam()).toBe("");
    });

    it("should return empty string for admin with no current tenant", async () => {
      mockBackendRole = "admin";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "admin",
      });
      
      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          message: "Admin cross-tenant access",
        })
        .mockResolvedValueOnce({
          success: true,
          data: [],
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentTenant).toBeNull();
      expect(result.current.getTenantQueryParam()).toBe("");
    });

    it("should return tenant query param for admin with current tenant", async () => {
      mockBackendRole = "admin";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "admin",
      });
      
      const tenants = [
        { id: "tenant-1", name: "Tenant A" },
        { id: "tenant-2", name: "Tenant B" },
      ];

      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          data: { id: "tenant-1", name: "Tenant A" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: tenants,
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.availableTenants).toHaveLength(2);
      });

      expect(result.current.getTenantQueryParam()).toBe("?tenant_id=tenant-1");
    });

    it("should update query param after switching tenant", async () => {
      mockBackendRole = "admin";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "admin",
      });
      
      const tenants = [
        { id: "tenant-1", name: "Tenant A" },
        { id: "tenant-2", name: "Tenant B" },
      ];

      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          data: { id: "tenant-1", name: "Tenant A" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: tenants,
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.availableTenants).toHaveLength(2);
      });

      expect(result.current.getTenantQueryParam()).toBe("?tenant_id=tenant-1");

      act(() => {
        result.current.switchTenant("tenant-2");
      });

      expect(result.current.getTenantQueryParam()).toBe("?tenant_id=tenant-2");
    });
  });

  describe("API Integration", () => {
    it("should use VITE_API_BASE_URL from environment", async () => {
      vi.mocked(apiGetJson).mockResolvedValueOnce({
        success: true,
        data: { id: "tenant-1", name: "Test Tenant" },
      });

      renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(apiGetJson).toHaveBeenCalledWith(
          expect.stringContaining("https://test-api.com/api/v1/tenants/current")
        );
      });
    });

    it("should use fallback URL when VITE_API_BASE_URL is not set", async () => {
      const originalEnv = import.meta.env.VITE_API_BASE_URL;
      vi.stubEnv("VITE_API_BASE_URL", undefined);

      try {
        vi.mocked(apiGetJson).mockResolvedValueOnce({
          success: true,
          data: { id: "tenant-1", name: "Test Tenant" },
        });

        renderHook(() => useTenant(), {
          wrapper: TenantProvider,
        });

        await waitFor(() => {
          expect(apiGetJson).toHaveBeenCalledWith(
            expect.stringContaining("https://thermacoreapp.onrender.com/api/v1/tenants/current")
          );
        });
      } finally {
        vi.stubEnv("VITE_API_BASE_URL", originalEnv);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors when loading current tenant", async () => {
      vi.mocked(apiGetJson).mockRejectedValueOnce(
        new Error("Network error")
      );

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Network error");
    });

    it("should handle timeout errors", async () => {
      vi.mocked(apiGetJson).mockRejectedValueOnce(
        new Error("Request timeout")
      );

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Request timeout");
    });

    it("should handle 401 unauthorized errors", async () => {
      vi.mocked(apiGetJson).mockRejectedValueOnce(
        new Error("Unauthorized")
      );

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Unauthorized");
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid tenant switching", async () => {
      mockBackendRole = "admin";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "admin",
      });
      
      const tenants = [
        { id: "tenant-1", name: "Tenant A" },
        { id: "tenant-2", name: "Tenant B" },
        { id: "tenant-3", name: "Tenant C" },
      ];

      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          data: { id: "tenant-1", name: "Tenant A" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: tenants,
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.availableTenants).toHaveLength(3);
      });

      act(() => {
        result.current.switchTenant("tenant-1");
        result.current.switchTenant("tenant-2");
        result.current.switchTenant("tenant-3");
      });

      expect(result.current.currentTenant).toEqual({ id: "tenant-3", name: "Tenant C" });
    });

    it("should handle Client Admin with no client_id", async () => {
      mockBackendRole = "client_admin";
      vi.mocked(useAuth).mockReturnValue({
        user: { ...mockUser, client_id: undefined },
        backendRole: "client_admin",
      });
      
      vi.mocked(apiGetJson)
        .mockResolvedValueOnce({
          success: true,
          data: null,
          message: "No client assigned",
        })
        .mockResolvedValueOnce({
          success: true,
          data: [
            { id: "tenant-1", name: "Facility Alpha", client_id: 1 },
            { id: "tenant-2", name: "Facility Beta", client_id: 2 },
          ],
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still be able to switch tenants
      expect(result.current.isClientAdmin).toBe(true);
      expect(result.current.canSwitchTenants).toBe(true);
    });
  });
});
