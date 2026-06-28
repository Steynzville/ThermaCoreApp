import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getAllUnits,
  getUnitById,
  getUnitDetails,
  getUnitAlerts,
  getAllAlerts,
  searchUnits,
  updateUnitControls,
  getEventHistory,
  getRecentActions,
  getUnitsWithAlarms,
  getUnitsWithAlerts,
  updateUnitName,
  updateUnitLocation,
  updateUnitGPS,
} from "../../services/unitService";

// Mock the datasets
vi.mock("../../data/mockUnits", () => {
  return {
    units: [
      {
        id: "unit-1",
        name: "ThermaCore Alpha",
        location: "Basement Room 4",
        hasAlarm: true,
        alerts: ["Sensor Error"],
        gpsCoordinates: "34.0522, -118.2437",
      },
      {
        id: "unit-2",
        name: "ThermaCore Beta",
        location: "Rooftop East",
        hasAlarm: false,
        alerts: [],
        gpsCoordinates: "40.7128, -74.0060",
      },
    ],
  };
});

vi.mock("../../mockData", () => {
  const mockUnitDetails = {
    "unit-1": {
      id: "unit-1",
      name: "ThermaCore Alpha",
      controls: {
        targetTemp: 22,
        fanSpeed: "Auto",
      },
      alerts: [
        { id: "a1", severity: "critical", msg: "Primary cooling fan failure" },
      ],
    },
    "unit-2": {
      id: "unit-2",
      name: "ThermaCore Beta",
      controls: {
        targetTemp: 18,
        fanSpeed: "High",
      },
      alerts: [],
    },
  };

  return {
    mockEventHistory: [
      { id: "evt-1", timestamp: "2026-06-25T10:00:00Z", message: "System Boot" },
    ],
    mockRecentActions: [
      { id: "act-1", timestamp: "2026-06-25T10:05:00Z", action: "Fan override to High" },
    ],
    mockUnitDetails,
  };
});

describe("Unit Service - /src/services/unitService.js", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get all units", async () => {
    const units = await getAllUnits();
    expect(units).toHaveLength(2);
    expect(units[0].id).toBe("unit-1");
  });

  describe("getUnitById", () => {
    it("should return the correct unit if ID exists", async () => {
      const unit = await getUnitById("unit-2");
      expect(unit).not.toBeNull();
      expect(unit.name).toBe("ThermaCore Beta");
    });

    it("should return null if ID does not exist", async () => {
      const unit = await getUnitById("unknown-id");
      expect(unit).toBeNull();
    });
  });

  describe("getUnitDetails", () => {
    it("should return details for an existing unit ID", async () => {
      const details = await getUnitDetails("unit-1");
      expect(details).not.toBeNull();
      expect(details.controls.targetTemp).toBe(22);
    });

    it("should return null if unit details do not exist", async () => {
      const details = await getUnitDetails("unknown-id");
      expect(details).toBeNull();
    });
  });

  describe("getUnitAlerts", () => {
    it("should return alerts array for an existing unit ID", async () => {
      const alerts = await getUnitAlerts("unit-1");
      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe("a1");
    });

    it("should return an empty array if unit has no alerts or does not exist", async () => {
      const emptyAlerts = await getUnitAlerts("unit-2");
      expect(emptyAlerts).toEqual([]);

      const unknownAlerts = await getUnitAlerts("unknown-id");
      expect(unknownAlerts).toEqual([]);
    });
  });

  describe("getAllAlerts", () => {
    it("should flatten and return all alerts from all units", async () => {
      const alerts = await getAllAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].msg).toBe("Primary cooling fan failure");
    });
  });

  describe("searchUnits", () => {
    it("should return an empty array if query is empty or falsy", async () => {
      expect(await searchUnits("")).toEqual([]);
      expect(await searchUnits(null)).toEqual([]);
    });

    it("should filter units by name case-insensitively", async () => {
      const results = await searchUnits("alpha");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("unit-1");
    });

    it("should filter units by location case-insensitively", async () => {
      const results = await searchUnits("rooftop");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("unit-2");
    });

    it("should return empty array if no match found", async () => {
      const results = await searchUnits("Mars");
      expect(results).toHaveLength(0);
    });
  });

  describe("updateUnitControls", () => {
    it("should update and merge controls for existing unit ID", async () => {
      const updated = await updateUnitControls("unit-1", { fanSpeed: "Medium", ecoMode: true });
      expect(updated.controls.fanSpeed).toBe("Medium");
      expect(updated.controls.targetTemp).toBe(22); // Preserved
      expect(updated.controls.ecoMode).toBe(true); // Added
    });

    it("should do nothing and return undefined if unit does not exist", async () => {
      const result = await updateUnitControls("unknown-id", { targetTemp: 30 });
      expect(result).toBeUndefined();
    });
  });

  describe("getEventHistory", () => {
    it("should fetch event history successfully", async () => {
      const history = await getEventHistory();
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe("System Boot");
    });
  });

  describe("getRecentActions", () => {
    it("should fetch recent control actions successfully", async () => {
      const actions = await getRecentActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].action).toBe("Fan override to High");
    });
  });

  describe("getUnitsWithAlarms", () => {
    it("should return only units that have active alarms", async () => {
      const units = await getUnitsWithAlarms();
      expect(units).toHaveLength(1);
      expect(units[0].id).toBe("unit-1");
    });
  });

  describe("getUnitsWithAlerts", () => {
    it("should return only units that have alerts", async () => {
      const units = await getUnitsWithAlerts();
      expect(units).toHaveLength(1);
      expect(units[0].id).toBe("unit-1");
    });
  });

  describe("updateUnitName", () => {
    it("should update unit name for existing unit ID", async () => {
      const updated = await updateUnitName("unit-2", "ThermaCore Super Beta");
      expect(updated.name).toBe("ThermaCore Super Beta");

      const units = await getAllUnits();
      expect(units.find(u => u.id === "unit-2").name).toBe("ThermaCore Super Beta");
    });

    it("should return undefined/null if unit to rename is not found", async () => {
      const result = await updateUnitName("unknown-id", "Invisible");
      expect(result).toBeUndefined();
    });
  });

  describe("updateUnitLocation", () => {
    it("should update unit location for existing unit ID", async () => {
      const updated = await updateUnitLocation("unit-1", "Basement Room 5");
      expect(updated.location).toBe("Basement Room 5");
    });
  });

  describe("updateUnitGPS", () => {
    it("should update unit GPS coordinates for existing unit ID", async () => {
      const updated = await updateUnitGPS("unit-1", "0, 0");
      expect(updated.gpsCoordinates).toBe("0, 0");
    });
  });
});
