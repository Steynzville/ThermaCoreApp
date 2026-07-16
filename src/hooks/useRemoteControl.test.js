import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRemoteControl } from "./useRemoteControl";

// Mock AuthContext
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }) => children,
}));

// Mock getAuthToken
vi.mock("../utils/authToken", () => ({
  getAuthToken: vi.fn(() => "test-token"),
}));

// Import after mocks
import { useAuth } from "../context/AuthContext";
import { getAuthToken } from "../utils/authToken";

describe("useRemoteControl", () => {
  const unitId = "unit-123";
  const mockToken = "test-token";
  const mockApiBaseUrl = "https://api.test.com";
  const originalApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const originalLocalStorage = window.localStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    // ✅ FIX: Use real timers (no fake timers needed for this hook)
    vi.useRealTimers();

    import.meta.env.VITE_API_BASE_URL = mockApiBaseUrl;

    const localStorageMock = {
      getItem: vi.fn((key) => {
        if (key === "thermacore_token") return mockToken;
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, username: "admin", role: "admin" },
      userRole: "admin",
    });

    getAuthToken.mockReturnValue(mockToken);

    global.fetch = vi.fn();
  });

  afterEach(() => {
    import.meta.env.VITE_API_BASE_URL = originalApiBaseUrl;
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
    // ✅ FIX: Reset fetch mock
    global.fetch.mockReset?.();
    vi.clearAllMocks();
  });

  // ✅ FIX: Wrap render in act() to handle async fetch effect
  it("should render without crashing", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Failed to fetch permissions"));
    
    let result;
    await act(async () => {
      const rendered = renderHook(() => useRemoteControl(unitId));
      result = rendered.result;
      // Wait for the fetch to complete
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current).toBeDefined();
    expect(result.current.permissions).toBe(null);
    expect(result.current.isLoading).toBe(false);
  });

  describe("Initial State", () => {
    // ✅ FIX: Already has act() wrapper - good!
    it("should initialize with default state", async () => {
      global.fetch.mockRejectedValueOnce(
        new Error("Failed to fetch permissions"),
      );

      const { result } = renderHook(() => useRemoteControl(unitId));

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.error).toBe("Failed to fetch permissions");
      expect(result.current.permissions).toBe(null);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("fetchPermissions", () => {
    // ✅ FIX: Wrap render and fetch in act()
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

      let result;
      await act(async () => {
        const rendered = renderHook(() => useRemoteControl(unitId));
        result = rendered.result;
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.permissions).toEqual(mockPermissions);
      expect(result.current.isLoading).toBe(false);
      expect(global.fetch).toHaveBeenCalled();
    });

    // ✅ FIX: Wrap render in act()
    it("should not fetch when not authenticated", async () => {
      useAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        userRole: null,
      });

      let result;
      await act(async () => {
        const rendered = renderHook(() => useRemoteControl(unitId));
        result = rendered.result;
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.permissions).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    // ✅ FIX: Wrap render and fetch in act()
    it("should handle fetch error", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      let result;
      await act(async () => {
        const rendered = renderHook(() => useRemoteControl(unitId));
        result = rendered.result;
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.error).toBe("Failed to fetch permissions");
      expect(result.current.isLoading).toBe(false);
    });

    // ✅ FIX: Wrap render and fetch in act()
    it("should handle network error", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      let result;
      await act(async () => {
        const rendered = renderHook(() => useRemoteControl(unitId));
        result = rendered.result;
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.error).toBe("Failed to fetch permissions");
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("controlPower", () => {
    // ✅ FIX: Already has act() wrappers - good!
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

      let result;
      await act(async () => {
        const rendered = renderHook(() => useRemoteControl(unitId));
        result = rendered.result;
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.permissions).toEqual({
        has_remote_control: true,
      });

      let response;
      await act(async () => {
        response = await result.current.controlPower(true);
      });

      expect(response).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalled();
    });

    // ✅ FIX: Already has act() wrappers - good!
    it("should throw error when user lacks permissions", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ has_remote_control: false }),
      });

      let result;
      await act(async () => {
        const rendered = renderHook(() => useRemoteControl(unitId));
        result = rendered.result;
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.permissions).toEqual({
        has_remote_control: false,
      });

      await expect(result.current.controlPower(true)).rejects.toThrow(
        "Insufficient permissions for remote control",
      );
    });

    // ✅ FIX: Already has act() wrappers - good!
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

      let result;
      await act(async () => {
        const rendered = renderHook(() => useRemoteControl(unitId));
        result = rendered.result;
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.permissions?.has_remote_control).toBe(true);

      // Wait for the promise rejection and state update
      await act(async () => {
        try {
          await result.current.controlPower(true);
        } catch (_e) {
          // Expected to throw
        }
      });

      // Now the error should be set
      expect(result.current.error).toBe("Failed to control power");
    });
  });

  describe("controlWaterProduction", () => {
    // ✅ FIX: Already has act() wrappers - good!
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

      let result;
      await act(async () => {
        const rendered = renderHook(() => useRemoteControl(unitId));
        result = rendered.result;
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.permissions).toEqual({
        has_remote_control: true,
      });

      let response;
      await act(async () => {
        response = await result.current.controlWaterProduction(true);
      });

      expect(response).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalled();
    });

    // ✅ FIX: Already has act() wrappers - good!
    it("should throw error when user lacks permissions", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ has_remote_control: false }),
      });

      let result;
      await act(async () => {
        const rendered = renderHook(() => useRemoteControl(unitId));
        result = rendered.result;
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.permissions?.has_remote_control).toBe(false);

      await expect(result.current.controlWaterProduction(true)).rejects.toThrow(
        "Insufficient permissions for remote control",
      );
    });

    // ✅ FIX: Already has act() wrappers - good!
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

      let result;
      await act(async () => {
        const rendered = renderHook(() => useRemoteControl(unitId));
        result = rendered.result;
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.permissions?.has_remote_control).toBe(true);

      // Wait for the promise rejection and state update
      await act(async () => {
        try {
          await result.current.controlWaterProduction(true);
        } catch (_e) {
          // Expected to throw
        }
      });

      // Now the error should be set
      expect(result.current.error).toBe("Failed to control water production");
    });
  });

  describe("getUnitStatus", () => {
    // ✅ FIX: Already has act() wrappers - good!
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

      let result;
      await act(async () => {
        const rendered = renderHook(() => useRemoteControl(unitId));
        result = rendered.result;
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.permissions).toBeDefined();

      let status;
      await act(async () => {
        status = await result.current.getUnitStatus();
      });

      expect(status).toEqual(mockStatus);
      expect(global.fetch).toHaveBeenCalled();
    });

    // ✅ FIX: Already has act() wrappers - good!
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

      let result;
      await act(async () => {
        const rendered = renderHook(() => useRemoteControl(unitId));
        result = rendered.result;
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.permissions).toBeDefined();

      await expect(result.current.getUnitStatus()).rejects.toThrow(
        "Status fetch failed",
      );
    });
  });

  describe("refetchPermissions", () => {
    // ✅ FIX: Already has act() wrappers - good!
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

      let result;
      await act(async () => {
        const rendered = renderHook(() => useRemoteControl(unitId));
        result = rendered.result;
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.permissions).toEqual(initialPermissions);

      await act(async () => {
        await result.current.refetchPermissions();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.permissions).toEqual(updatedPermissions);
    });
  });
});
