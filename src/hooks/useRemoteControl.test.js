import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRemoteControl } from "./useRemoteControl";
import { ThemeProvider } from "../context/ThemeContext";
import { SettingsProvider } from "../context/SettingsContext";
import { AuthProvider } from "../context/AuthContext";

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock("../context/AuthContext", async () => {
  const actual = await vi.importActual("../context/AuthContext");
  return {
    ...actual,
    useAuth: () => mockUseAuth(),
  };
});

// Mock getAuthToken
vi.mock("../utils/authToken", () => ({
  getAuthToken: vi.fn(() => "test-token"),
}));

// Mock apiFetch utilities if used
vi.mock("../utils/apiFetch", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

const TestWrapper = ({ children }) => {
  return React.createElement(
    ThemeProvider,
    null,
    React.createElement(
      SettingsProvider,
      null,
      React.createElement(AuthProvider, null, children)
    )
  );
};

describe("useRemoteControl", () => {
  const unitId = "unit-123";
  const mockToken = "test-token";
  const mockApiBaseUrl = "https://api.test.com";

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Properly mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key) => {
        if (key === "thermacore_token") return mockToken;
        if (key === "thermacore_user") return JSON.stringify({ id: 1, username: "admin" });
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };
    
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    global.localStorage = localStorageMock;
    
    // Mock sessionStorage
    const sessionStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };
    Object.defineProperty(window, "sessionStorage", {
      value: sessionStorageMock,
      writable: true,
      configurable: true,
    });
    global.sessionStorage = sessionStorageMock;
    
    // Mock window properties
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost:3000" },
      writable: true,
      configurable: true,
    });
    
    import.meta.env.VITE_API_BASE_URL = mockApiBaseUrl;

    // Mock the auth context
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, username: "admin", role: "admin" },
      userRole: "admin",
    });

    global.fetch = vi.fn();
  });

  describe("Initial State", () => {
    it("should initialize with default state", async () => {
      // Mock fetch to return an error for this test
      global.fetch.mockRejectedValueOnce(
        new Error("Failed to fetch permissions"),
      );

      const { result } = renderHook(() => useRemoteControl(unitId), {
        wrapper: TestWrapper,
      });

      // Wait for the error state to be set
      await waitFor(() => {
        expect(result.current.error).not.toBe(null);
      });

      expect(result.current.permissions).toBe(null);
    });
  });

  describe("fetchPermissions", () => {
    it("should fetch permissions when authenticated", async () => {
      const mockPermissions = {
        has_remote_control: true,
        can_control_power: true,
        can_control_water: true,
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPermissions,
      });

      const { result } = renderHook(() => useRemoteControl(unitId), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.permissions).toEqual(mockPermissions);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/remote-control/permissions"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        }),
      );
    });

    it("should not fetch when not authenticated", async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        userRole: null,
      });

      const { result } = renderHook(() => useRemoteControl(unitId), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.permissions).toBe(null);
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle fetch error", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const { result } = renderHook(() => useRemoteControl(unitId), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to fetch permissions");
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle network error", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useRemoteControl(unitId), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to fetch permissions");
      });
    });
  });

  describe("controlPower", () => {
    it("should control power when user has permissions", async () => {
      const mockResponse = { success: true, power_on: true };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ has_remote_control: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const { result } = renderHook(() => useRemoteControl(unitId), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.permissions).toEqual({
          has_remote_control: true,
        });
      });

      let response;
      await act(async () => {
        response = await result.current.controlPower(true);
      });

      expect(response).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining(`/api/v1/remote-control/units/${unitId}/power`),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ power_on: true }),
        }),
      );
    });

    it("should throw error when user lacks permissions", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ has_remote_control: false }),
      });

      const { result } = renderHook(() => useRemoteControl(unitId), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.permissions).toEqual({
          has_remote_control: false,
        });
      });

      await expect(result.current.controlPower(true)).rejects.toThrow(
        "Insufficient permissions for remote control",
      );
    });

    it("should handle control power error", async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ has_remote_control: true }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Control failed" }),
        });

      const { result } = renderHook(() => useRemoteControl(unitId), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.permissions?.has_remote_control).toBe(true);
      });

      await expect(result.current.controlPower(true)).rejects.toThrow(
        "Control failed",
      );

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to control power");
      });
    });
  });

  describe("controlWaterProduction", () => {
    it("should control water production when user has permissions", async () => {
      const mockResponse = { success: true, water_production_on: true };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ has_remote_control: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const { result } = renderHook(() => useRemoteControl(unitId), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.permissions).toEqual({
          has_remote_control: true,
        });
      });

      let response;
      await act(async () => {
        response = await result.current.controlWaterProduction(true);
      });

      expect(response).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/remote-control/units/${unitId}/water-production`),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ water_production_on: true }),
        }),
      );
    });

    it("should throw error when user lacks permissions", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ has_remote_control: false }),
      });

      const { result } = renderHook(() => useRemoteControl(unitId), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.permissions?.has_remote_control).toBe(false);
      });

      await expect(result.current.controlWaterProduction(true)).rejects.toThrow(
        "Insufficient permissions for remote control",
      );
    });

    it("should handle water production control error", async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ has_remote_control: true }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Water control failed" }),
        });

      const { result } = renderHook(() => useRemoteControl(unitId), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.permissions?.has_remote_control).toBe(true);
      });

      await expect(result.current.controlWaterProduction(true)).rejects.toThrow(
        "Water control failed",
      );
    });
  });

  describe("getUnitStatus", () => {
    it("should get unit status", async () => {
      const mockStatus = {
        power_on: true,
        water_production_on: false,
        temperature: 75,
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ has_remote_control: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStatus,
        });

      const { result } = renderHook(() => useRemoteControl(unitId), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.permissions).toBeDefined();
      });

      let status;
      await act(async () => {
        status = await result.current.getUnitStatus();
      });

      expect(status).toEqual(mockStatus);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/remote-control/units/${unitId}/status`),
        expect.objectContaining({
          method: "GET",
        }),
      );
    });

    it("should handle status fetch error", async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ has_remote_control: true }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Status fetch failed" }),
        });

      const { result } = renderHook(() => useRemoteControl(unitId), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.permissions).toBeDefined();
      });

      await expect(result.current.getUnitStatus()).rejects.toThrow(
        "Status fetch failed",
      );
    });
  });

  describe("refetchPermissions", () => {
    it("should refetch permissions when called", async () => {
      const initialPermissions = { has_remote_control: false };
      const updatedPermissions = { has_remote_control: true };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialPermissions,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedPermissions,
        });

      const { result } = renderHook(() => useRemoteControl(unitId), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.permissions).toEqual(initialPermissions);
      });

      await act(async () => {
        await result.current.refetchPermissions();
      });

      await waitFor(() => {
        expect(result.current.permissions).toEqual(updatedPermissions);
      });
    });
  });
});
