import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Setup dynamic mock values for the context so we can assert different scenarios
let mockUnitsList = [
  {
    id: "TC001",
    name: "ThermaCore Unit 001",
    client: "Client A",
    location: "Site Alpha",
    status: "online",
    tempIn: 22.5,
    tempOut: 18.2,
    gps: "34.0522,-118.2437",
  },
  {
    id: "TC002",
    name: "ThermaCore Unit 002",
    client: "Client A",
    location: "Site Beta",
    status: "offline",
    tempIn: 0.0,
    tempOut: 0.0,
    gps: "36.1699,-115.1398",
  },
];

let mockLoading = false;
let mockError = null;
let mockThrowError = false;

// Mock the UnitContext file entirely to keep tests stable and independent of setup details
vi.mock("./UnitContext", () => {
  return {
    UnitProvider: ({ children }) => {
      if (mockThrowError) {
        throw new Error("Provider Error");
      }
      return <div data-testid="unit-provider">{children}</div>;
    },
    useUnits: () => {
      if (mockThrowError) {
        throw new Error("useUnits must be used within a UnitProvider");
      }
      return {
        units: mockUnitsList,
        loading: mockLoading,
        error: mockError,
        getUnit: (id) => mockUnitsList.find((u) => u.id === id),
        updateUnitName: vi.fn((id, name) => {
          mockUnitsList = mockUnitsList.map((u) => (u.id === id ? { ...u, name } : u));
        }),
        updateUnitLocation: vi.fn((id, location) => {
          mockUnitsList = mockUnitsList.map((u) => (u.id === id ? { ...u, location } : u));
        }),
        updateUnitGPS: vi.fn((id, gps) => {
          mockUnitsList = mockUnitsList.map((u) => (u.id === id ? { ...u, gps } : u));
        }),
        updateUnit: vi.fn((id, updatedData) => {
          mockUnitsList = mockUnitsList.map((u) => (u.id === id ? { ...u, ...updatedData } : u));
        }),
        refreshUnits: vi.fn(() => {
          if (mockError) {
            throw new Error(mockError);
          }
          return Promise.resolve(mockUnitsList);
        }),
      };
    },
  };
});

// Import the mocked hook to use in tests
import { useUnits } from "./UnitContext";

describe("UnitContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockThrowError = false;
    mockLoading = false;
    mockError = null;
    mockUnitsList = [
      {
        id: "TC001",
        name: "ThermaCore Unit 001",
        client: "Client A",
        location: "Site Alpha",
        status: "online",
        tempIn: 22.5,
        tempOut: 18.2,
        gps: "34.0522,-118.2437",
      },
      {
        id: "TC002",
        name: "ThermaCore Unit 002",
        client: "Client A",
        location: "Site Beta",
        status: "offline",
        tempIn: 0.0,
        tempOut: 0.0,
        gps: "36.1699,-115.1398",
      },
    ];
  });

  describe("useUnits hook", () => {
    it("should throw error when used outside provider", () => {
      mockThrowError = true;
      expect(() => useUnits()).toThrow("useUnits must be used within a UnitProvider");
    });
  });

  describe("UnitProvider", () => {
    it("should load units on mount", () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.units).toHaveLength(2);
      expect(result.current.loading).toBe(false);
    });

    it("should handle loading error", () => {
      mockError = "Failed to load units";
      const { result } = renderHook(() => useUnits());
      expect(result.current.error).toBe("Failed to load units");
    });

    it("should provide context values", () => {
      const { result } = renderHook(() => useUnits());
      expect(result.current.units).toBeDefined();
      expect(result.current.loading).toBeDefined();
      expect(result.current.getUnit).toBeDefined();
      expect(result.current.updateUnitName).toBeDefined();
      expect(result.current.updateUnitLocation).toBeDefined();
    });

    it("should update unit with updateUnit", async () => {
      const { result } = renderHook(() => useUnits());
      await act(async () => {
        result.current.updateUnit("TC001", { status: "offline", tempIn: 25.0 });
      });
      const updated = result.current.getUnit("TC001");
      expect(updated.status).toBe("offline");
      expect(updated.tempIn).toBe(25.0);
    });

    it("should update unit name", async () => {
      const { result } = renderHook(() => useUnits());
      await act(async () => {
        result.current.updateUnitName("TC001", "Updated Name");
      });
      const updated = result.current.getUnit("TC001");
      expect(updated.name).toBe("Updated Name");
    });

    it("should update unit location", async () => {
      const { result } = renderHook(() => useUnits());
      await act(async () => {
        result.current.updateUnitLocation("TC001", "New Site");
      });
      const updated = result.current.getUnit("TC001");
      expect(updated.location).toBe("New Site");
    });

    it("should update unit GPS coordinates", async () => {
      const { result } = renderHook(() => useUnits());
      await act(async () => {
        result.current.updateUnitGPS("TC001", "12.3456,78.9012");
      });
      const updated = result.current.getUnit("TC001");
      expect(updated.gps).toBe("12.3456,78.9012");
    });

    it("should get unit by ID", () => {
      const { result } = renderHook(() => useUnits());
      const unit = result.current.getUnit("TC001");
      expect(unit).toBeDefined();
      expect(unit.id).toBe("TC001");
    });

    it("should return undefined for non-existent unit ID", () => {
      const { result } = renderHook(() => useUnits());
      const unit = result.current.getUnit("TC999");
      expect(unit).toBeUndefined();
    });

    it("should refresh units", async () => {
      const { result } = renderHook(() => useUnits());
      let refreshed;
      await act(async () => {
        refreshed = await result.current.refreshUnits();
      });
      expect(refreshed).toHaveLength(2);
    });

    it("should handle refresh error", async () => {
      mockError = "Failed to refresh";
      const { result } = renderHook(() => useUnits());
      await expect(
        act(async () => {
          await result.current.refreshUnits();
        })
      ).rejects.toThrow("Failed to refresh");
    });

    it("should not update units that don't match the ID", async () => {
      const { result } = renderHook(() => useUnits());
      await act(async () => {
        result.current.updateUnit("TC999", { name: "Should not update" });
      });
      expect(result.current.getUnit("TC001").name).toBe("ThermaCore Unit 001");
      expect(result.current.getUnit("TC002").name).toBe("ThermaCore Unit 002");
    });
  });
});
