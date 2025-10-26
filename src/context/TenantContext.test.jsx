import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TenantProvider, useTenant } from "./TenantContext";

// Mock AuthContext
vi.mock("./AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock apiFetch
vi.mock("../utils/apiFetch", () => ({
  apiGetJson: vi.fn(),
}));

import { apiGetJson } from "../utils/apiFetch";
import { useAuth } from "./AuthContext";

describe("TenantContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useTenant hook", () => {
    it("should throw error when used outside provider", () => {
      expect(() => renderHook(() => useTenant())).toThrow(
        "useTenant must be used within a TenantProvider",
      );
    });
  });

  describe("TenantProvider", () => {
    it("should provide context values", async () => {
      useAuth.mockReturnValue({ user: null, backendRole: "user" });
      apiGetJson.mockResolvedValue({ data: null });

      const wrapper = ({ children }) => (
        <TenantProvider>{children}</TenantProvider>
      );

      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty("currentTenant");
      expect(result.current).toHaveProperty("availableTenants");
      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("isAdmin");
      expect(result.current).toHaveProperty("switchTenant");
      expect(result.current).toHaveProperty("getTenantQueryParam");
    });

    it("should load current tenant for logged in user", async () => {
      const mockTenant = { id: 1, name: "Tenant 1" };
      useAuth.mockReturnValue({
        user: { id: 1, email: "user@example.com" },
        backendRole: "user",
      });
      apiGetJson.mockResolvedValue({ data: mockTenant });

      const wrapper = ({ children }) => (
        <TenantProvider>{children}</TenantProvider>
      );

      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current.currentTenant).toEqual(mockTenant);
      });
    });

    it("should not load tenant when no user", async () => {
      useAuth.mockReturnValue({ user: null, backendRole: null });

      const wrapper = ({ children }) => (
        <TenantProvider>{children}</TenantProvider>
      );

      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentTenant).toBeNull();
      expect(apiGetJson).not.toHaveBeenCalled();
    });

    it("should handle admin user with cross-tenant access", async () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: "admin@example.com" },
        backendRole: "admin",
      });
      apiGetJson.mockResolvedValueOnce({ message: "Cross-tenant admin" });

      const wrapper = ({ children }) => (
        <TenantProvider>{children}</TenantProvider>
      );

      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentTenant).toBeNull();
      expect(result.current.isAdmin).toBe(true);
    });

    it("should load available tenants for admin users", async () => {
      const mockTenants = [
        { id: 1, name: "Tenant 1" },
        { id: 2, name: "Tenant 2" },
      ];
      useAuth.mockReturnValue({
        user: { id: 1, email: "admin@example.com" },
        backendRole: "admin",
      });
      apiGetJson
        .mockResolvedValueOnce({ message: "Cross-tenant admin" })
        .mockResolvedValueOnce({ data: mockTenants });

      const wrapper = ({ children }) => (
        <TenantProvider>{children}</TenantProvider>
      );

      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current.availableTenants).toEqual(mockTenants);
      });
    });

    it("should not load available tenants for non-admin users", async () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: "user@example.com" },
        backendRole: "user",
      });
      apiGetJson.mockResolvedValue({ data: { id: 1, name: "Tenant 1" } });

      const wrapper = ({ children }) => (
        <TenantProvider>{children}</TenantProvider>
      );

      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.availableTenants).toEqual([]);
      expect(result.current.isAdmin).toBe(false);
    });

    it("should handle error when loading tenant", async () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: "user@example.com" },
        backendRole: "user",
      });
      apiGetJson.mockRejectedValue(new Error("Network error"));

      const wrapper = ({ children }) => (
        <TenantProvider>{children}</TenantProvider>
      );

      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBe("Network error");
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should handle error when loading available tenants", async () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: "admin@example.com" },
        backendRole: "admin",
      });
      apiGetJson
        .mockResolvedValueOnce({ message: "Cross-tenant admin" })
        .mockRejectedValueOnce(new Error("Network error"));

      const wrapper = ({ children }) => (
        <TenantProvider>{children}</TenantProvider>
      );

      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not set error for available tenants failure
      expect(result.current.availableTenants).toEqual([]);
    });

    it("should allow admin to switch tenant", async () => {
      const mockTenants = [
        { id: 1, name: "Tenant 1" },
        { id: 2, name: "Tenant 2" },
      ];
      useAuth.mockReturnValue({
        user: { id: 1, email: "admin@example.com" },
        backendRole: "admin",
      });
      apiGetJson
        .mockResolvedValueOnce({ message: "Cross-tenant admin" })
        .mockResolvedValueOnce({ data: mockTenants });

      const wrapper = ({ children }) => (
        <TenantProvider>{children}</TenantProvider>
      );

      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current.availableTenants).toEqual(mockTenants);
      });

      // Switch to tenant 2
      result.current.switchTenant(2);

      await waitFor(() => {
        expect(result.current.currentTenant).toEqual(mockTenants[1]);
      });
    });

    it("should not allow non-admin to switch tenant", async () => {
      const mockTenant = { id: 1, name: "Tenant 1" };
      useAuth.mockReturnValue({
        user: { id: 1, email: "user@example.com" },
        backendRole: "user",
      });
      apiGetJson.mockResolvedValue({ data: mockTenant });

      const wrapper = ({ children }) => (
        <TenantProvider>{children}</TenantProvider>
      );

      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current.currentTenant).toEqual(mockTenant);
      });

      // Try to switch tenant (should be ignored)
      result.current.switchTenant(2);

      await waitFor(() => {
        expect(result.current.currentTenant).toEqual(mockTenant);
      });
    });

    it("should return empty query param for non-admin", async () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: "user@example.com" },
        backendRole: "user",
      });
      apiGetJson.mockResolvedValue({ data: { id: 1, name: "Tenant 1" } });

      const wrapper = ({ children }) => (
        <TenantProvider>{children}</TenantProvider>
      );

      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.getTenantQueryParam()).toBe("");
    });

    it("should return tenant query param for admin with tenant", async () => {
      const mockTenants = [
        { id: 1, name: "Tenant 1" },
        { id: 2, name: "Tenant 2" },
      ];
      useAuth.mockReturnValue({
        user: { id: 1, email: "admin@example.com" },
        backendRole: "admin",
      });
      apiGetJson
        .mockResolvedValueOnce({ message: "Cross-tenant admin" })
        .mockResolvedValueOnce({ data: mockTenants });

      const wrapper = ({ children }) => (
        <TenantProvider>{children}</TenantProvider>
      );

      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current.availableTenants).toEqual(mockTenants);
      });

      // Switch to tenant
      result.current.switchTenant(2);

      await waitFor(() => {
        expect(result.current.getTenantQueryParam()).toBe("?tenant_id=2");
      });
    });

    it("should return empty query param for admin without tenant", async () => {
      useAuth.mockReturnValue({
        user: { id: 1, email: "admin@example.com" },
        backendRole: "admin",
      });
      apiGetJson
        .mockResolvedValueOnce({ message: "Cross-tenant admin" })
        .mockResolvedValueOnce({ data: [] });

      const wrapper = ({ children }) => (
        <TenantProvider>{children}</TenantProvider>
      );

      const { result } = renderHook(() => useTenant(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.getTenantQueryParam()).toBe("");
    });
  });
});
