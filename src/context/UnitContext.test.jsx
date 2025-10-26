import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnitProvider, useUnits } from "./UnitContext";

// Mock the unitService
vi.mock("../services/unitService", () => ({
  getAllUnits: vi.fn(),
  updateUnitName: vi.fn(),
  updateUnitLocation: vi.fn(),
  updateUnitGPS: vi.fn(),
}));

import {
  getAllUnits,
  updateUnitGPS as serviceUpdateUnitGPS,
  updateUnitLocation as serviceUpdateUnitLocation,
  updateUnitName as serviceUpdateUnitName,
} from "../services/unitService";

describe("UnitContext", () => {
  const mockUnits = [
    {
      id: "1",
      name: "Unit 1",
      location: "Building A",
      gpsCoordinates: "40.7128,-74.0060",
    },
    {
      id: "2",
      name: "Unit 2",
      location: "Building B",
      gpsCoordinates: "34.0522,-118.2437",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useUnits hook", () => {
    it("should throw error when used outside provider", () => {
      expect(() => renderHook(() => useUnits())).toThrow(
        "useUnits must be used within a UnitProvider",
      );
    });
  });

  describe("UnitProvider", () => {
    it("should load units on mount", async () => {
      getAllUnits.mockResolvedValue(mockUnits);

      const wrapper = ({ children }) => <UnitProvider>{children}</UnitProvider>;
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.units).toEqual(mockUnits);
      expect(result.current.error).toBeNull();
    });

    it("should handle loading error", async () => {
      const errorMessage = "Failed to load units";
      getAllUnits.mockRejectedValue(new Error(errorMessage));

      const wrapper = ({ children }) => <UnitProvider>{children}</UnitProvider>;
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.units).toEqual([]);
    });

    it("should provide context values", async () => {
      getAllUnits.mockResolvedValue(mockUnits);

      const wrapper = ({ children }) => <UnitProvider>{children}</UnitProvider>;
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toHaveProperty("units");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("updateUnit");
      expect(result.current).toHaveProperty("updateUnitName");
      expect(result.current).toHaveProperty("updateUnitLocation");
      expect(result.current).toHaveProperty("updateUnitGPS");
      expect(result.current).toHaveProperty("getUnit");
      expect(result.current).toHaveProperty("refreshUnits");
    });

    it("should update unit with updateUnit", async () => {
      getAllUnits.mockResolvedValue(mockUnits);

      const wrapper = ({ children }) => <UnitProvider>{children}</UnitProvider>;
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.updateUnit("1", { name: "Updated Unit 1" });

      await waitFor(() => {
        expect(result.current.units[0].name).toBe("Updated Unit 1");
      });

      expect(result.current.units[0].location).toBe("Building A");
    });

    it("should update unit name", async () => {
      getAllUnits.mockResolvedValue(mockUnits);
      serviceUpdateUnitName.mockResolvedValue({});

      const wrapper = ({ children }) => <UnitProvider>{children}</UnitProvider>;
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.updateUnitName("1", "New Name");

      expect(serviceUpdateUnitName).toHaveBeenCalledWith("1", "New Name");

      await waitFor(() => {
        expect(result.current.units[0].name).toBe("New Name");
      });
    });

    it("should update unit location", async () => {
      getAllUnits.mockResolvedValue(mockUnits);
      serviceUpdateUnitLocation.mockResolvedValue({});

      const wrapper = ({ children }) => <UnitProvider>{children}</UnitProvider>;
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.updateUnitLocation("1", "New Location");

      expect(serviceUpdateUnitLocation).toHaveBeenCalledWith(
        "1",
        "New Location",
      );

      await waitFor(() => {
        expect(result.current.units[0].location).toBe("New Location");
      });
    });

    it("should update unit GPS coordinates", async () => {
      getAllUnits.mockResolvedValue(mockUnits);
      serviceUpdateUnitGPS.mockResolvedValue({});

      const wrapper = ({ children }) => <UnitProvider>{children}</UnitProvider>;
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.updateUnitGPS("1", "51.5074,-0.1278");

      expect(serviceUpdateUnitGPS).toHaveBeenCalledWith("1", "51.5074,-0.1278");

      await waitFor(() => {
        expect(result.current.units[0].gpsCoordinates).toBe("51.5074,-0.1278");
      });
    });

    it("should get unit by ID", async () => {
      getAllUnits.mockResolvedValue(mockUnits);

      const wrapper = ({ children }) => <UnitProvider>{children}</UnitProvider>;
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const unit = result.current.getUnit("2");

      expect(unit).toEqual(mockUnits[1]);
    });

    it("should return undefined for non-existent unit ID", async () => {
      getAllUnits.mockResolvedValue(mockUnits);

      const wrapper = ({ children }) => <UnitProvider>{children}</UnitProvider>;
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const unit = result.current.getUnit("999");

      expect(unit).toBeUndefined();
    });

    it("should refresh units", async () => {
      const updatedMockUnits = [
        ...mockUnits,
        {
          id: "3",
          name: "Unit 3",
          location: "Building C",
          gpsCoordinates: "48.8566,2.3522",
        },
      ];
      getAllUnits
        .mockResolvedValueOnce(mockUnits)
        .mockResolvedValueOnce(updatedMockUnits);

      const wrapper = ({ children }) => <UnitProvider>{children}</UnitProvider>;
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Wait for initial load to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.units).toHaveLength(2);
      });

      // Trigger refresh
      await result.current.refreshUnits();

      // Wait for refresh to complete with updated data
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.units).toHaveLength(3);
      });

      expect(getAllUnits).toHaveBeenCalledTimes(2);
    });

    it("should handle refresh error", async () => {
      getAllUnits
        .mockResolvedValueOnce(mockUnits)
        .mockRejectedValueOnce(new Error("Refresh failed"));

      const wrapper = ({ children }) => <UnitProvider>{children}</UnitProvider>;
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();

      await result.current.refreshUnits();

      await waitFor(
        () => {
          expect(result.current.error).toBe("Refresh failed");
        },
        { timeout: 2000 },
      );

      expect(result.current.loading).toBe(false);
      // Units should remain the same from initial load
      expect(result.current.units).toEqual(mockUnits);
    });

    it("should not update units that don't match the ID", async () => {
      getAllUnits.mockResolvedValue(mockUnits);

      const wrapper = ({ children }) => <UnitProvider>{children}</UnitProvider>;
      const { result } = renderHook(() => useUnits(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.updateUnit("1", { name: "Updated Unit 1" });

      await waitFor(() => {
        expect(result.current.units[1].name).toBe("Unit 2");
      });
    });
  });
});
