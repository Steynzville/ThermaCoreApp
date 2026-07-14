/**
 * Tests for TenantContext
 * 
 * Multi-tenancy testing covering:
 * - Tenant loading for authenticated users
 * - Admin vs non-admin tenant access
 * - Tenant switching (admin only)
 * - Error handling
 * - API integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import { TenantProvider, useTenant } from "../context/TenantContext";
import { apiGetJson } from "../utils/apiFetch";

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
    vi.resetModules();
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
      
      vi.mocked(apiGetJson).mockResolvedValueOnce({
        success: true,
        message: "Admin cross-tenant access",
      });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentTenant).toBeNull();
      expect(result.current.isAdmin).toBe(true);
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

      expect(result.current.isAdmin).toBe(true);
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
    });
  });

  describe("Available Tenants - Admin Only", () => {
    it("should load available tenants for admin users", async () => {
      mockBackendRole = "admin";
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        backendRole: "admin",
      });
      
      const mockTenants = [
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
          data: mockTenants,
        });

      const { result } = renderHook(() => useTenant(), {
        wrapper: TenantProvider,
      });

      await waitFor(() => {
        expect(result.current.availableTenants).toHaveLength(3);
      });

      expect(result.current.availableTenants).toEqual(mockTenants);
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

      expect(result.current.availableTenants).toEqual([]);
      expect(result.current.currentTenant).toBeDefined();
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

      act(() => {
        result.current.switchTenant("tenant-999");
      });

      expect(result.current.currentTenant).toBeNull();
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
      
      vi.mocked(apiGetJson).mockResolvedValueOnce({
        success: true,
        message: "Admin cross-tenant access",
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

      vi.stubEnv("VITE_API_BASE_URL", originalEnv);
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
  });
});
