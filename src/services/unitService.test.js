// src/services/userService.test.js
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import {
  getAllAlerts,
  getAllUnits,
  getEventHistory,
  getRecentActions,
  getUnitAlerts,
  getUnitById,
  getUnitDetails,
  getUnitsWithAlarms,
  getUnitsWithAlerts,
  searchUnits,
  updateUnitControls,
  updateUnitGPS,
  updateUnitLocation,
  updateUnitName,
} from "./unitService";

// Mock the data modules
vi.mock("../data/mockUnits", () => ({
  units: [
    {
      id: "1",
      name: "Unit 1",
      status: "Operational",
      location: "Building A",
      hasAlarm: false,
      alerts: [],
      gpsCoordinates: "40.7128,-74.0060",
    },
    {
      id: "2",
      name: "Unit 2",
      status: "Warning",
      location: "Building B",
      hasAlarm: true,
      alerts: [{ id: 1, severity: "Warning", description: "High temperature" }],
      gpsCoordinates: "34.0522,-118.2437",
    },
    {
      id: "3",
      name: "Unit 3",
      status: "Critical",
      location: "Factory Floor",
      hasAlarm: true,
      alerts: [{ id: 2, severity: "Critical", description: "System failure" }],
      gpsCoordinates: "51.5074,-0.1278",
    },
  ],
}));

vi.mock("../mockData", () => ({
  mockUnitDetails: {
    1: {
      installDate: "2023-01-15",
      lastMaintenance: "2024-10-01",
      alerts: [],
      controls: {
        temperature: 20,
        pressure: 100,
      },
    },
    2: {
      installDate: "2022-06-10",
      lastMaintenance: "2024-09-15",
      alerts: [{ id: 1, severity: "Warning", description: "High temperature" }],
      controls: {
        temperature: 25,
        pressure: 110,
      },
    },
    3: {
      installDate: "2021-03-22",
      lastMaintenance: "2024-08-20",
      alerts: [{ id: 2, severity: "Critical", description: "System failure" }],
      controls: {
        temperature: 30,
        pressure: 120,
      },
    },
  },
  mockEventHistory: [
    { id: 1, event: "System started", timestamp: "2024-10-23T10:00:00Z" },
    {
      id: 2,
      event: "Maintenance performed",
      timestamp: "2024-10-22T14:00:00Z",
    },
  ],
  mockRecentActions: [
    {
      id: 1,
      action: "Temperature adjusted",
      timestamp: "2024-10-23T09:00:00Z",
    },
    { id: 2, action: "Pressure reset", timestamp: "2024-10-22T15:00:00Z" },
  ],
}));

describe("unitService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe("getAllUnits", () => {
    it("should return all units", async () => {
      const units = await getAllUnits();
      expect(units).toHaveLength(3);
      expect(units[0]).toHaveProperty("id", "1");
      expect(units[0]).toHaveProperty("name", "Unit 1");
    });

    it("should return a promise", () => {
      const result = getAllUnits();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("getUnitById", () => {
    it("should return a unit by ID", async () => {
      const unit = await getUnitById("1");
      expect(unit).toBeDefined();
      expect(unit.id).toBe("1");
      expect(unit.name).toBe("Unit 1");
    });

    it("should return null for non-existent unit", async () => {
      const unit = await getUnitById("999");
      expect(unit).toBeNull();
    });

    it("should return a promise", () => {
      const result = getUnitById("1");
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe("getUnitDetails", () => {
    it("should return unit details by ID", async () => {
      const details = await getUnitDetails("1");
      expect(details).toBeDefined();
      expect(details).toHaveProperty("installDate");
      expect(details).toHaveProperty("lastMaintenance");
      expect(details).toHaveProperty("controls");
    });

    it("should return null for non-existent unit details", async () => {
      const details = await getUnitDetails("999");
      expect(details).toBeNull();
    });

    it("should include alerts in details", async () => {
      const details = await getUnitDetails("2");
      expect(details.alerts).toBeDefined();
      expect(details.alerts).toHaveLength(1);
    });
  });

  describe("getUnitAlerts", () => {
    it("should return alerts for a unit", async () => {
      const alerts = await getUnitAlerts("2");
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toHaveProperty("severity", "Warning");
    });

    it("should return empty array for unit with no alerts", async () => {
      const alerts = await getUnitAlerts("1");
      expect(alerts).toEqual([]);
    });

    it("should return empty array for non-existent unit", async () => {
      const alerts = await getUnitAlerts("999");
      expect(alerts).toEqual([]);
    });
  });

  describe("getAllAlerts", () => {
    it("should return all alerts from all units", async () => {
      const alerts = await getAllAlerts();
      expect(alerts).toBeInstanceOf(Array);
      expect(alerts.length).toBeGreaterThan(0);
    });

    it("should flatten alerts from all units", async () => {
      const alerts = await getAllAlerts();
      // We have 2 units with alerts in mockData
      expect(alerts).toHaveLength(2);
    });
  });

  describe("searchUnits", () => {
    it("should search units by name", async () => {
      const results = await searchUnits("Unit 1");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Unit 1");
    });

    it("should search units by location", async () => {
      const results = await searchUnits("Building");
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it("should be case insensitive", async () => {
      const results = await searchUnits("building a");
      expect(results).toHaveLength(1);
      expect(results[0].location).toBe("Building A");
    });

    it("should return empty array for empty query", async () => {
      const results = await searchUnits("");
      expect(results).toEqual([]);
    });

    it("should return empty array for no matches", async () => {
      const results = await searchUnits("NonExistent");
      expect(results).toEqual([]);
    });

    it("should handle null query", async () => {
      const results = await searchUnits(null);
      expect(results).toEqual([]);
    });

    it("should handle undefined query", async () => {
      const results = await searchUnits(undefined);
      expect(results).toEqual([]);
    });
  });

  describe("updateUnitControls", () => {
    it("should update unit controls", async () => {
      const newControls = { temperature: 22, pressure: 105 };
      const result = await updateUnitControls("1", newControls);
      expect(result).toBeDefined();
      expect(result.controls.temperature).toBe(22);
      expect(result.controls.pressure).toBe(105);
    });

    it("should merge controls with existing values", async () => {
      const partialControls = { temperature: 23 };
      const result = await updateUnitControls("1", partialControls);
      expect(result.controls.temperature).toBe(23);
      // Pressure should still exist from previous update or original
      expect(result.controls).toHaveProperty("pressure");
    });

    it("should return details even for non-existent unit", async () => {
      const result = await updateUnitControls("999", { temperature: 20 });
      expect(result).toBeUndefined();
    });
  });

  describe("getEventHistory", () => {
    it("should return event history", async () => {
      const history = await getEventHistory();
      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBeGreaterThan(0);
    });

    it("should return events with correct structure", async () => {
      const history = await getEventHistory();
      expect(history[0]).toHaveProperty("id");
      expect(history[0]).toHaveProperty("event");
      expect(history[0]).toHaveProperty("timestamp");
    });
  });

  describe("getRecentActions", () => {
    it("should return recent actions", async () => {
      const actions = await getRecentActions();
      expect(actions).toBeInstanceOf(Array);
      expect(actions.length).toBeGreaterThan(0);
    });

    it("should return actions with correct structure", async () => {
      const actions = await getRecentActions();
      expect(actions[0]).toHaveProperty("id");
      expect(actions[0]).toHaveProperty("action");
      expect(actions[0]).toHaveProperty("timestamp");
    });
  });

  describe("getUnitsWithAlarms", () => {
    it("should return units with alarms", async () => {
      const units = await getUnitsWithAlarms();
      expect(units).toBeInstanceOf(Array);
      expect(units.every((u) => u.hasAlarm)).toBe(true);
    });

    it("should only return units with hasAlarm flag", async () => {
      const units = await getUnitsWithAlarms();
      expect(units).toHaveLength(2); // Units 2 and 3 have alarms
    });
  });

  describe("getUnitsWithAlerts", () => {
    it("should return units with alerts", async () => {
      const units = await getUnitsWithAlerts();
      expect(units).toBeInstanceOf(Array);
      expect(units.every((u) => u.alerts && u.alerts.length > 0)).toBe(true);
    });

    it("should filter units by alerts array", async () => {
      const units = await getUnitsWithAlerts();
      expect(units).toHaveLength(2); // Units 2 and 3 have alerts
    });
  });

  describe("updateUnitName", () => {
    it("should update unit name", async () => {
      const result = await updateUnitName("1", "New Unit Name");
      expect(result).toBeDefined();
      expect(result.name).toBe("New Unit Name");
      expect(result.id).toBe("1");
    });

    it("should return updated unit object", async () => {
      const result = await updateUnitName("2", "Updated Name");
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("location");
    });

    it("should return unit for non-existent ID", async () => {
      const result = await updateUnitName("999", "Non-existent");
      expect(result).toBeUndefined();
    });
  });

  describe("updateUnitLocation", () => {
    it("should update unit location", async () => {
      const result = await updateUnitLocation("1", "New Location");
      expect(result).toBeDefined();
      expect(result.location).toBe("New Location");
      expect(result.id).toBe("1");
    });

    it("should return updated unit object", async () => {
      const result = await updateUnitLocation("2", "Updated Location");
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("status");
    });

    it("should return unit for non-existent ID", async () => {
      const result = await updateUnitLocation("999", "Nowhere");
      expect(result).toBeUndefined();
    });
  });

  describe("updateUnitGPS", () => {
    it("should update unit GPS coordinates", async () => {
      const newGPS = "37.7749,-122.4194";
      const result = await updateUnitGPS("1", newGPS);
      expect(result).toBeDefined();
      expect(result.gpsCoordinates).toBe(newGPS);
      expect(result.id).toBe("1");
    });

    it("should return updated unit object", async () => {
      const result = await updateUnitGPS("2", "48.8566,2.3522");
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("location");
    });

    it("should return unit for non-existent ID", async () => {
      const result = await updateUnitGPS("999", "0,0");
      expect(result).toBeUndefined();
    });
  });

  describe("Promise behavior", () => {
    it("all functions should return promises", async () => {
      expect(getAllUnits()).toBeInstanceOf(Promise);
      expect(getUnitById("1")).toBeInstanceOf(Promise);
      expect(getUnitDetails("1")).toBeInstanceOf(Promise);
      expect(getUnitAlerts("1")).toBeInstanceOf(Promise);
      expect(getAllAlerts()).toBeInstanceOf(Promise);
      expect(searchUnits("test")).toBeInstanceOf(Promise);
      expect(updateUnitControls("1", {})).toBeInstanceOf(Promise);
      expect(getEventHistory()).toBeInstanceOf(Promise);
      expect(getRecentActions()).toBeInstanceOf(Promise);
      expect(getUnitsWithAlarms()).toBeInstanceOf(Promise);
      expect(getUnitsWithAlerts()).toBeInstanceOf(Promise);
      expect(updateUnitName("1", "test")).toBeInstanceOf(Promise);
      expect(updateUnitLocation("1", "test")).toBeInstanceOf(Promise);
      expect(updateUnitGPS("1", "0,0")).toBeInstanceOf(Promise);
    });
  });
});
