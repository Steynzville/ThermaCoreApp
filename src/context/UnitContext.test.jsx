// src/context/UnitContext.test.jsx

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import {
  getAllUnits,
  updateUnitGPS as serviceUpdateUnitGPS,
  updateUnitLocation as serviceUpdateUnitLocation,
  updateUnitName as serviceUpdateUnitName,
} from "../services/unitService";

// Mock the service layer only
vi.mock("../services/unitService", () => ({
  getAllUnits: vi.fn(),
  updateUnitName: vi.fn(),
  updateUnitLocation: vi.fn(),
  updateUnitGPS: vi.fn(),
}));

import { UnitProvider, useUnits } from "./UnitContext";

const baseUnits = [
  {
    id: "TC001",
    name: "ThermaCore Unit 001",
    client: "Client A",
    location: "Site Alpha",
    status: "online",
    tempIn: 22.5,
    tempOut: 18.2,
    gpsCoordinates: "34.0522,-118.2437",
  },
  {
    id: "TC002",
    name: "ThermaCore Unit 002",
    client: "Client A",
    location: "Site Beta",
    status: "offline",
    tempIn: 0.0,
    tempOut: 0.0,
    gpsCoordinates: "36.1699,-115.1398",
  },
];

const wrapper = ({ children }) => <UnitProvider>{children}</UnitProvider>;

describe("UnitContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    getAllUnits.mockResolvedValue(structuredClone(baseUnits));
    serviceUpdateUnitName.mockResolvedValue();
    serviceUpdateUnitLocation.mockResolvedValue();
    serviceUpdateUnitGPS.mockResolvedValue();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============ SECTION 1: useUnits Hook Tests ============

  describe("useUnits hook", () => {
    it("should throw error when used outside provider", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() => renderHook(() => useUnits())).toThrow(
        "useUnits must be used within a UnitProvider"
      );
      spy.mockRestore();
    });
  });

  // ============ SECTION 2: Initialization Tests ============

  describe("UnitProvider initialization", () => {
    it("should start loading then load units on mount", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      // Should be loading initially
      expect(result.current.loading).toBe(true);
      expect(result.current.units).toHaveLength(0);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.units).toHaveLength(2);
      expect(result.current.error).toBeNull();
      expect(getAllUnits).toHaveBeenCalledTimes(1);
    });

    it("should handle loading error", async () => {
      getAllUnits.mockRejectedValueOnce(new Error("Failed to load units"));
      
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBe("Failed to load units");
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.units).toHaveLength(0);
      expect(getAllUnits).toHaveBeenCalledTimes(1);
    });

    it("should provide all context values", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.units).toBeDefined();
      expect(result.current.loading).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.getUnit).toBeDefined();
      expect(result.current.updateUnitName).toBeDefined();
      expect(result.current.updateUnitLocation).toBeDefined();
      expect(result.current.updateUnitGPS).toBeDefined();
      expect(result.current.updateUnit).toBeDefined();
      expect(result.current.refreshUnits).toBeDefined();
    });

    it("should cleanup on unmount and not update state or warn", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      getAllUnits.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(baseUnits), 100))
      );

      const { unmount } = renderHook(() => useUnits(), { wrapper });
      unmount();

      await new Promise((resolve) => setTimeout(resolve, 150));

      const unmountWarnings = consoleSpy.mock.calls.filter((call) =>
        String(call[0]).includes("unmounted component")
      );
      expect(unmountWarnings).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });

  // ============ SECTION 3: updateUnit Tests ============

  describe("updateUnit", () => {
    it("should update a specific unit", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateUnit("TC001", { status: "offline", tempIn: 25.0 });
      });

      const updated = result.current.getUnit("TC001");
      expect(updated.status).toBe("offline");
      expect(updated.tempIn).toBe(25.0);
    });

    it("should not update units that don't match the ID", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateUnit("TC999", { name: "Should not update" });
      });

      expect(result.current.getUnit("TC001").name).toBe("ThermaCore Unit 001");
      expect(result.current.getUnit("TC002").name).toBe("ThermaCore Unit 002");
    });

    it("should handle multiple updates to the same unit", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateUnit("TC001", { status: "offline" });
      });
      
      act(() => {
        result.current.updateUnit("TC001", { tempIn: 30.0 });
      });

      const updated = result.current.getUnit("TC001");
      expect(updated.status).toBe("offline");
      expect(updated.tempIn).toBe(30.0);
    });
  });

  // ============ SECTION 4: updateUnitName Tests ============

  describe("updateUnitName", () => {
    it("should update unit name and call the service", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateUnitName("TC001", "Updated Name");
      });

      expect(serviceUpdateUnitName).toHaveBeenCalledWith("TC001", "Updated Name");
      expect(result.current.getUnit("TC001").name).toBe("Updated Name");
      expect(result.current.error).toBeNull();
    });

    it("should handle service error and set error state (no re-throw)", async () => {
      const errorMessage = "Failed to update name";
      serviceUpdateUnitName.mockRejectedValueOnce(new Error(errorMessage));
      
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // No re-throw, so no need for .rejects
      await act(async () => {
        await result.current.updateUnitName("TC001", "New Name");
      });

      // Error state should be set
      expect(result.current.error).toBe(errorMessage);
      
      // Service was called
      expect(serviceUpdateUnitName).toHaveBeenCalledWith("TC001", "New Name");
      
      // Unit name should NOT be updated because the service failed
      expect(result.current.getUnit("TC001").name).toBe("ThermaCore Unit 001");
    });

    it("should clear previous error on success", async () => {
      // First, set an error state
      getAllUnits.mockRejectedValueOnce(new Error("Initial error"));
      
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.error).toBe("Initial error");
      });

      // Reset getAllUnits for the update
      getAllUnits.mockResolvedValue(baseUnits);

      // Successful update should clear error
      await act(async () => {
        await result.current.updateUnitName("TC001", "Updated Name");
      });

      expect(result.current.error).toBeNull();
      expect(result.current.getUnit("TC001").name).toBe("Updated Name");
    });
  });

  // ============ SECTION 5: updateUnitLocation Tests ============

  describe("updateUnitLocation", () => {
    it("should update unit location and call the service", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateUnitLocation("TC001", "New Site");
      });

      expect(serviceUpdateUnitLocation).toHaveBeenCalledWith("TC001", "New Site");
      expect(result.current.getUnit("TC001").location).toBe("New Site");
      expect(result.current.error).toBeNull();
    });

    it("should handle service error and set error state (no re-throw)", async () => {
      const errorMessage = "Failed to update location";
      serviceUpdateUnitLocation.mockRejectedValueOnce(new Error(errorMessage));
      
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateUnitLocation("TC001", "New Site");
      });

      expect(result.current.error).toBe(errorMessage);
      expect(serviceUpdateUnitLocation).toHaveBeenCalledWith("TC001", "New Site");
      expect(result.current.getUnit("TC001").location).toBe("Site Alpha");
    });

    it("should clear previous error on success", async () => {
      // First, set an error state
      getAllUnits.mockRejectedValueOnce(new Error("Initial error"));
      
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.error).toBe("Initial error");
      });

      // Reset getAllUnits for the update
      getAllUnits.mockResolvedValue(baseUnits);

      // Successful update should clear error
      await act(async () => {
        await result.current.updateUnitLocation("TC001", "New Site");
      });

      expect(result.current.error).toBeNull();
      expect(result.current.getUnit("TC001").location).toBe("New Site");
    });
  });

  // ============ SECTION 6: updateUnitGPS Tests ============

  describe("updateUnitGPS", () => {
    it("should update unit GPS coordinates and call the service", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateUnitGPS("TC001", "12.3456,78.9012");
      });

      expect(serviceUpdateUnitGPS).toHaveBeenCalledWith("TC001", "12.3456,78.9012");
      expect(result.current.getUnit("TC001").gpsCoordinates).toBe("12.3456,78.9012");
      expect(result.current.error).toBeNull();
    });

    it("should handle service error and set error state (no re-throw)", async () => {
      const errorMessage = "Failed to update GPS";
      serviceUpdateUnitGPS.mockRejectedValueOnce(new Error(errorMessage));
      
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateUnitGPS("TC001", "12.3456,78.9012");
      });

      expect(result.current.error).toBe(errorMessage);
      expect(serviceUpdateUnitGPS).toHaveBeenCalledWith("TC001", "12.3456,78.9012");
      expect(result.current.getUnit("TC001").gpsCoordinates).toBe("34.0522,-118.2437");
    });

    it("should clear previous error on success", async () => {
      // First, set an error state
      getAllUnits.mockRejectedValueOnce(new Error("Initial error"));
      
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.error).toBe("Initial error");
      });

      // Reset getAllUnits for the update
      getAllUnits.mockResolvedValue(baseUnits);

      // Successful update should clear error
      await act(async () => {
        await result.current.updateUnitGPS("TC001", "12.3456,78.9012");
      });

      expect(result.current.error).toBeNull();
      expect(result.current.getUnit("TC001").gpsCoordinates).toBe("12.3456,78.9012");
    });
  });

  // ============ SECTION 7: getUnit Tests ============

  describe("getUnit", () => {
    it("should get unit by ID", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const unit = result.current.getUnit("TC001");
      expect(unit).toBeDefined();
      expect(unit.id).toBe("TC001");
      expect(unit.name).toBe("ThermaCore Unit 001");
    });

    it("should return undefined for non-existent unit ID", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.getUnit("TC999")).toBeUndefined();
    });

    it("should return correct unit for each ID", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const unit1 = result.current.getUnit("TC001");
      const unit2 = result.current.getUnit("TC002");
      
      expect(unit1.id).toBe("TC001");
      expect(unit2.id).toBe("TC002");
    });
  });

  // ============ SECTION 8: refreshUnits Tests ============

  describe("refreshUnits", () => {
    it("should refresh units data", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.units).toHaveLength(2);
      });
      
      expect(getAllUnits).toHaveBeenCalledTimes(1);

      const newUnits = [
        {
          id: "TC003",
          name: "ThermaCore Unit 003",
          client: "Client B",
          location: "Site Gamma",
          status: "online",
          tempIn: 23.0,
          tempOut: 19.0,
          gpsCoordinates: "40.7128,-74.0060",
        },
      ];

      getAllUnits.mockResolvedValueOnce(newUnits);

      let refreshPromise;
      act(() => {
        refreshPromise = result.current.refreshUnits();
      });
      
      expect(result.current.loading).toBe(true);

      await act(async () => {
        await refreshPromise;
      });

      expect(result.current.units).toHaveLength(1);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(getAllUnits).toHaveBeenCalledTimes(2);
    });

    it("should clear existing error on successful refresh", async () => {
      // First load fails
      getAllUnits
        .mockRejectedValueOnce(new Error("Initial error"))
        .mockResolvedValueOnce(baseUnits);

      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.error).toBe("Initial error");
      });

      // Refresh should clear the error
      await act(async () => {
        await result.current.refreshUnits();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.units).toHaveLength(2);
    });

    it("should handle refresh error", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.units).toHaveLength(2);
      });

      const errorMessage = "Failed to refresh";
      getAllUnits.mockRejectedValueOnce(new Error(errorMessage));

      await act(async () => {
        await result.current.refreshUnits();
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
      expect(result.current.units).toHaveLength(2);
      expect(getAllUnits).toHaveBeenCalledTimes(2);
    });

    it("should set loading state during refresh with fake timers", async () => {
      vi.useFakeTimers();
      
      getAllUnits
        .mockResolvedValueOnce(baseUnits)
        .mockImplementationOnce(
          () => new Promise((resolve) => setTimeout(() => resolve(baseUnits), 100))
        );

      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await act(async () => { 
        await vi.runAllTimersAsync(); 
      });

      expect(result.current.loading).toBe(false);

      let refreshPromise;
      act(() => { 
        refreshPromise = result.current.refreshUnits(); 
      });
      expect(result.current.loading).toBe(true);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
        await refreshPromise;
      });
      
      expect(result.current.loading).toBe(false);
      
      vi.useRealTimers();
    });
  });

  // ============ SECTION 9: Error Handling Tests ============

  describe("Error handling", () => {
    it("should set error when getAllUnits fails during initial load", async () => {
      const errorMessage = "Network error";
      getAllUnits.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.loading).toBe(false);
      });
    });

    it("should not update units when refresh fails", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.units).toHaveLength(2);
      });

      const originalUnits = result.current.units;
      getAllUnits.mockRejectedValueOnce(new Error("Refresh failed"));

      await act(async () => {
        await result.current.refreshUnits();
      });

      expect(result.current.units).toEqual(originalUnits);
      expect(result.current.error).toBe("Refresh failed");
    });

    it("should clear error on successful refresh", async () => {
      // Initial load fails
      getAllUnits
        .mockRejectedValueOnce(new Error("Initial error"))
        .mockResolvedValueOnce(baseUnits);

      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.error).toBe("Initial error");
      });

      // Refresh succeeds
      await act(async () => {
        await result.current.refreshUnits();
      });

      expect(result.current.error).toBeNull();
    });

    it("should chain errors correctly (error persists until success)", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const errorMessage = "Update failed";
      serviceUpdateUnitName.mockRejectedValueOnce(new Error(errorMessage));

      // First update fails
      await act(async () => {
        await result.current.updateUnitName("TC001", "New Name");
      });

      expect(result.current.error).toBe(errorMessage);

      // Second update succeeds (should clear error)
      await act(async () => {
        await result.current.updateUnitName("TC001", "Final Name");
      });

      expect(result.current.error).toBeNull();
      expect(result.current.getUnit("TC001").name).toBe("Final Name");
    });
  });

  // ============ SECTION 10: UseMemo Dependency Tests ============

  describe("Memoization", () => {
    it("should memoize context value dependencies correctly", async () => {
      const { result, rerender } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialUnits = result.current.units;
      const initialGetUnit = result.current.getUnit;
      const initialUpdateUnit = result.current.updateUnit;

      rerender();

      expect(result.current.units).toBe(initialUnits);
      expect(result.current.getUnit).toBe(initialGetUnit);
      expect(result.current.updateUnit).toBe(initialUpdateUnit);
    });

    it("should update memoized values when units change", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialGetUnit = result.current.getUnit;

      await act(async () => {
        await result.current.updateUnitName("TC001", "New Name");
      });

      const newGetUnit = result.current.getUnit;
      expect(newGetUnit).not.toBe(initialGetUnit);
    });
  });

  // ============ SECTION 11: Edge Cases ============

  describe("Edge cases", () => {
    it("should handle empty units array", async () => {
      getAllUnits.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.units).toHaveLength(0);
      });

      expect(result.current.getUnit("TC001")).toBeUndefined();
    });

    it("should handle null/undefined values in updateUnit", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateUnit("TC001", { 
          status: null,
          tempIn: undefined 
        });
      });

      const updated = result.current.getUnit("TC001");
      expect(updated.status).toBeNull();
      expect(updated.tempIn).toBeUndefined();
    });

    it("should handle multiple simultaneous updates", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.updateUnit("TC001", { status: "offline" });
        result.current.updateUnit("TC002", { status: "online" });
      });

      const unit1 = result.current.getUnit("TC001");
      const unit2 = result.current.getUnit("TC002");
      
      expect(unit1.status).toBe("offline");
      expect(unit2.status).toBe("online");
    });
  });

  // ============ SECTION 12: Integration-Style Tests ============

  describe("Integration scenarios", () => {
    it("should update unit name and then refresh to get latest data", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateUnitName("TC001", "Temporary Name");
      });

      expect(result.current.getUnit("TC001").name).toBe("Temporary Name");

      const freshUnits = [
        {
          id: "TC001",
          name: "Server Name",
          client: "Client A",
          location: "Site Alpha",
          status: "online",
          tempIn: 22.5,
          tempOut: 18.2,
          gpsCoordinates: "34.0522,-118.2437",
        },
        {
          id: "TC002",
          name: "ThermaCore Unit 002",
          client: "Client A",
          location: "Site Beta",
          status: "offline",
          tempIn: 0.0,
          tempOut: 0.0,
          gpsCoordinates: "36.1699,-115.1398",
        },
      ];
      
      getAllUnits.mockResolvedValueOnce(freshUnits);
      
      await act(async () => {
        await result.current.refreshUnits();
      });

      expect(result.current.getUnit("TC001").name).toBe("Server Name");
    });

    it("should maintain other unit properties when updating one field", async () => {
      const { result } = renderHook(() => useUnits(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const originalUnit = result.current.getUnit("TC001");
      
      await act(async () => {
        await result.current.updateUnitName("TC001", "New Name Only");
      });

      const updatedUnit = result.current.getUnit("TC001");
      
      expect(updatedUnit.name).toBe("New Name Only");
      expect(updatedUnit.id).toBe(originalUnit.id);
      expect(updatedUnit.client).toBe(originalUnit.client);
      expect(updatedUnit.location).toBe(originalUnit.location);
      expect(updatedUnit.status).toBe(originalUnit.status);
      expect(updatedUnit.tempIn).toBe(originalUnit.tempIn);
      expect(updatedUnit.tempOut).toBe(originalUnit.tempOut);
      expect(updatedUnit.gpsCoordinates).toBe(originalUnit.gpsCoordinates);
    });
  });
});
