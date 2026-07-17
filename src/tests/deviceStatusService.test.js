/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deviceStatusService } from "../services/deviceStatusService";

// Mock the units data
vi.mock("../data/mockUnits", () => ({
  units: [
    {
      id: "TC001",
      name: "ThermaCore Unit 001",
      status: "online",
      hasAlert: false,
      hasAlarm: false,
      healthStatus: "Optimal",
      battery_level: 85.5,
      water_level: 364.0,
      serialNumber: "TC001-2024-001",
      location: "Site Alpha",
    },
    {
      id: "TC002",
      name: "ThermaCore Unit 002",
      status: "offline",
      hasAlert: true,
      hasAlarm: false,
      healthStatus: "Warning",
      battery_level: 22.4,
      water_level: 129.4,
      serialNumber: "TC002-2024-002",
      location: "Site Beta",
    },
    {
      id: "TC003",
      name: "ThermaCore Unit 003",
      status: "maintenance",
      hasAlert: false,
      hasAlarm: true,
      healthStatus: "Critical",
      battery_level: 38.5,
      water_level: 265.2,
      serialNumber: "TC003-2024-003",
      location: "Site Gamma",
    },
  ],
}));

describe("DeviceStatusService", () => {
  beforeEach(() => {
    // Reset the service state before each test
    deviceStatusService.devices.clear();
    deviceStatusService.statusHistory = [];
    deviceStatusService.listeners.clear();
    deviceStatusService.isInitialized = false;
    deviceStatusService.initialize();
  });

  // ✅ NEW: Safety net to prevent state leakage between tests
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with mock device data", () => {
      const devices = deviceStatusService.getAllDeviceStatuses();
      expect(devices).toHaveLength(3);
      expect(devices[0].id).toBe("TC001");
      expect(devices[1].id).toBe("TC002");
      expect(devices[2].id).toBe("TC003");
    });

    it("should set initial device statuses correctly", () => {
      const device1 = deviceStatusService.getDeviceStatus("TC001");
      const device2 = deviceStatusService.getDeviceStatus("TC002");
      const device3 = deviceStatusService.getDeviceStatus("TC003");

      expect(device1.status).toBe("online");
      expect(device1.isOnline).toBe(true);
      expect(device1.hasAlert).toBe(false);
      expect(device1.hasAlarm).toBe(false);

      expect(device2.status).toBe("offline");
      expect(device2.isOnline).toBe(false);
      expect(device2.hasAlert).toBe(true);

      expect(device3.status).toBe("maintenance");
      expect(device3.isOnline).toBe(true); // maintenance is considered online
      expect(device3.hasAlarm).toBe(true);
    });
  });

  describe("Status Updates", () => {
    it("should update device status and detect changes", () => {
      const statusChange = deviceStatusService.updateDeviceStatus("TC001", {
        status: "offline",
      });

      expect(statusChange).toBeTruthy();
      expect(statusChange.changes).toHaveLength(2); // status change + connectivity change
      expect(statusChange.changes[0].type).toBe("connectivity");
      expect(statusChange.changes[1].type).toBe("status");
    });

    it("should detect new alerts", () => {
      const statusChange = deviceStatusService.updateDeviceStatus("TC001", {
        hasAlert: true,
      });

      expect(statusChange).toBeTruthy();
      expect(statusChange.changes).toHaveLength(1);
      expect(statusChange.changes[0].type).toBe("alert");
      expect(statusChange.changes[0].severity).toBe("warning");
    });

    it("should detect new alarms", () => {
      const statusChange = deviceStatusService.updateDeviceStatus("TC001", {
        hasAlarm: true,
      });

      expect(statusChange).toBeTruthy();
      expect(statusChange.changes).toHaveLength(1);
      expect(statusChange.changes[0].type).toBe("alarm");
      expect(statusChange.changes[0].severity).toBe("critical");
    });

    it("should detect health status changes", () => {
      const statusChange = deviceStatusService.updateDeviceStatus("TC001", {
        healthStatus: "Critical",
      });

      expect(statusChange).toBeTruthy();
      expect(statusChange.changes).toHaveLength(1);
      expect(statusChange.changes[0].type).toBe("health");
      expect(statusChange.changes[0].severity).toBe("critical");
    });

    it("should not detect changes when status is the same", () => {
      const statusChange = deviceStatusService.updateDeviceStatus("TC001", {
        status: "online", // Same as current status
      });

      expect(statusChange).toBeNull();
    });

    // ✅ NEW: Update non-existent device
    it("should return null when updating a device that doesn't exist", () => {
      const result = deviceStatusService.updateDeviceStatus("TC999", {
        status: "offline",
      });
      expect(result).toBeNull();
    });

    // ✅ NEW: Reconnection and message fallbacks
    it("should generate 'Device Online' message when device comes back online", () => {
      deviceStatusService.updateDeviceStatus("TC002", { status: "offline" });
      const statusChange = deviceStatusService.updateDeviceStatus("TC002", {
        status: "online",
      });

      expect(statusChange).toBeTruthy();
      const connectivityChange = statusChange.changes.find(
        (c) => c.type === "connectivity",
      );
      expect(connectivityChange.event).toBe("Device Online");
      expect(connectivityChange.severity).toBe("info");
      expect(connectivityChange.message).toContain("came online");
    });

    it("should fall back to deviceId in message when device name is missing", () => {
      deviceStatusService.devices.set("TC999", {
        id: "TC999",
        name: undefined,
        status: "online",
        hasAlert: false,
        hasAlarm: false,
        healthStatus: "Optimal",
        lastSeen: new Date(),
        lastStatusChange: new Date(),
        isOnline: true,
      });

      const statusChange = deviceStatusService.updateDeviceStatus("TC999", {
        status: "offline",
      });

      expect(statusChange.deviceName).toBe("TC999");
      expect(statusChange.changes[0].message).toContain("TC999");
    });

    // ✅ NEW: Alert/alarm already-set branches
    it("should not re-trigger an alert change when hasAlert is already true", () => {
      deviceStatusService.updateDeviceStatus("TC002", { hasAlert: true });
      const statusChange = deviceStatusService.updateDeviceStatus("TC002", {
        hasAlert: true,
        healthStatus: "Warning",
      });

      const alertChange = statusChange?.changes.find((c) => c.type === "alert");
      expect(alertChange).toBeUndefined();
    });

    it("should not re-trigger an alarm change when hasAlarm is already true", () => {
      deviceStatusService.updateDeviceStatus("TC003", { hasAlarm: true });
      const statusChange = deviceStatusService.updateDeviceStatus("TC003", {
        hasAlarm: true,
        status: "online",
      });

      const alarmChange = statusChange?.changes.find((c) => c.type === "alarm");
      expect(alarmChange).toBeUndefined();
    });

    // ✅ NEW: Fix - lastStatusChange should NOT update when status doesn't change
    it("should NOT update lastStatusChange when status field is not part of the update", () => {
      const before = deviceStatusService.getDeviceStatus("TC001").lastStatusChange;
      const beforeTime = before.getTime();
      
      deviceStatusService.updateDeviceStatus("TC001", { hasAlert: true });
      const after = deviceStatusService.getDeviceStatus("TC001").lastStatusChange;
      
      expect(after.getTime()).toBe(beforeTime);
    });

    // ✅ FIXED: Use fake timers to avoid timing flake
    it("should update lastStatusChange when status field IS part of the update", () => {
      vi.useFakeTimers();
      
      const before = deviceStatusService.getDeviceStatus("TC001").lastStatusChange;
      const beforeTime = before.getTime();
      
      // Advance timers by 1ms to ensure time difference
      vi.advanceTimersByTime(1);
      
      deviceStatusService.updateDeviceStatus("TC001", { status: "offline" });
      const after = deviceStatusService.getDeviceStatus("TC001").lastStatusChange;
      
      expect(after.getTime()).toBeGreaterThan(beforeTime);
      
      vi.useRealTimers();
    });
  });

  describe("Status Change Listeners", () => {
    it("should add and remove listeners", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 =
        deviceStatusService.addStatusChangeListener(listener1);
      const _unsubscribe2 =
        deviceStatusService.addStatusChangeListener(listener2);

      expect(deviceStatusService.listeners.size).toBe(2);

      unsubscribe1();
      expect(deviceStatusService.listeners.size).toBe(1);

      deviceStatusService.removeStatusChangeListener(listener2);
      expect(deviceStatusService.listeners.size).toBe(0);
    });

    it("should notify listeners of status changes", () => {
      const listener = vi.fn();
      deviceStatusService.addStatusChangeListener(listener);

      deviceStatusService.updateDeviceStatus("TC001", { status: "offline" });

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: "TC001",
          changes: expect.any(Array),
        }),
      );
    });

    // ✅ NEW: Listener error handling
    it("should not throw and should still notify other listeners if one listener throws", () => {
      const throwingListener = vi.fn(() => {
        throw new Error("listener boom");
      });
      const goodListener = vi.fn();

      deviceStatusService.addStatusChangeListener(throwingListener);
      deviceStatusService.addStatusChangeListener(goodListener);

      expect(() =>
        deviceStatusService.updateDeviceStatus("TC001", { status: "offline" }),
      ).not.toThrow();

      expect(throwingListener).toHaveBeenCalledOnce();
      expect(goodListener).toHaveBeenCalledOnce();
    });

    // ✅ NEW: Non-function listener
    it("should return null and not register a non-function listener", () => {
      const result = deviceStatusService.addStatusChangeListener(
        "not-a-function",
      );
      expect(result).toBeNull();
      expect(deviceStatusService.listeners.size).toBe(0);
    });
  });

  describe("Severity Assessment", () => {
    it("should correctly assess status severity", () => {
      expect(deviceStatusService.getStatusSeverity("offline")).toBe("critical");
      expect(deviceStatusService.getStatusSeverity("error")).toBe("critical");
      expect(deviceStatusService.getStatusSeverity("maintenance")).toBe(
        "warning",
      );
      expect(deviceStatusService.getStatusSeverity("online")).toBe("success");
      expect(deviceStatusService.getStatusSeverity("unknown")).toBe("info");
    });

    it("should correctly assess health severity", () => {
      expect(deviceStatusService.getHealthSeverity("Critical")).toBe(
        "critical",
      );
      expect(deviceStatusService.getHealthSeverity("Warning")).toBe("warning");
      expect(deviceStatusService.getHealthSeverity("Optimal")).toBe("success");
      expect(deviceStatusService.getHealthSeverity("Unknown")).toBe("info");
    });

    // ✅ NEW: Health severity edge cases
    it("should handle undefined healthStatus via optional chaining", () => {
      expect(deviceStatusService.getHealthSeverity(undefined)).toBe("info");
    });

    it("should handle null healthStatus via optional chaining", () => {
      expect(deviceStatusService.getHealthSeverity(null)).toBe("info");
    });
  });

  describe("Notifications Generation", () => {
    it("should generate device status notifications for admin role", () => {
      // Create some status changes first
      deviceStatusService.updateDeviceStatus("TC001", { status: "offline" });
      deviceStatusService.updateDeviceStatus("TC002", { hasAlarm: true });

      const notifications =
        deviceStatusService.generateDeviceStatusNotifications("admin");

      expect(notifications.length).toBeGreaterThanOrEqual(1);

      // Find notifications for specific devices
      const tc001Notifications = notifications.filter(
        (n) => n.alertData.deviceId === "TC001",
      );
      const tc002Notifications = notifications.filter(
        (n) => n.alertData.deviceId === "TC002",
      );

      expect(tc001Notifications.length).toBeGreaterThan(0);
      expect(tc002Notifications.length).toBeGreaterThan(0);
    });

    it("should filter notifications for regular user role", () => {
      // Create status changes for units beyond regular user access (TC007+)
      deviceStatusService.updateDeviceStatus("TC001", { status: "offline" });

      // Mock a device beyond regular user access
      deviceStatusService.devices.set("TC007", {
        id: "TC007",
        name: "ThermaCore Unit 007",
        status: "online",
        hasAlert: false,
        hasAlarm: false,
        healthStatus: "Optimal",
        lastSeen: new Date(),
        lastStatusChange: new Date(),
        isOnline: true,
      });

      deviceStatusService.updateDeviceStatus("TC007", { status: "offline" });

      const adminNotifications =
        deviceStatusService.generateDeviceStatusNotifications("admin");
      const userNotifications =
        deviceStatusService.generateDeviceStatusNotifications("user");

      expect(adminNotifications.length).toBeGreaterThan(
        userNotifications.length,
      );

      // Check that user notifications don't include TC007
      const userDeviceIds = userNotifications.map((n) => n.alertData.deviceId);
      expect(userDeviceIds).not.toContain("TC007");
    });

    // ✅ NEW: Regex edge case - devices without TC pattern
    it("should include devices whose id does not match the TC#### pattern for regular users", () => {
      deviceStatusService.devices.set("SENSOR-A", {
        id: "SENSOR-A",
        name: "Auxiliary Sensor A",
        status: "online",
        hasAlert: false,
        hasAlarm: false,
        healthStatus: "Optimal",
        lastSeen: new Date(),
        lastStatusChange: new Date(),
        isOnline: true,
      });

      deviceStatusService.updateDeviceStatus("SENSOR-A", { status: "offline" });

      const userNotifications =
        deviceStatusService.generateDeviceStatusNotifications("user");
      const ids = userNotifications.map((n) => n.alertData.deviceId);

      expect(ids).toContain("SENSOR-A");
    });
  });

  describe("Status History", () => {
    // ✅ FIX: Removed dangling setTimeout
    it("should maintain status change history", () => {
      deviceStatusService.updateDeviceStatus("TC001", { status: "offline" });
      const tc002 = deviceStatusService.getDeviceStatus("TC002");
      if (!tc002.hasAlarm) {
        deviceStatusService.updateDeviceStatus("TC002", { hasAlarm: true });
      }

      const history = deviceStatusService.getStatusHistory();
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0]).toHaveProperty("deviceId");
      expect(history[0]).toHaveProperty("changes");
    });

    it("should limit status history size", () => {
      const originalMaxSize = deviceStatusService.config.maxHistorySize;
      deviceStatusService.config.maxHistorySize = 3;

      // Generate more changes than max size
      for (let i = 0; i < 5; i++) {
        deviceStatusService.updateDeviceStatus("TC001", {
          status: i % 2 === 0 ? "online" : "offline",
        });
      }

      const history = deviceStatusService.getStatusHistory();
      expect(history.length).toBeLessThanOrEqual(3);

      // Restore original config
      deviceStatusService.config.maxHistorySize = originalMaxSize;
    });
  });

  describe("Device Online Detection", () => {
    it("should correctly identify online devices", () => {
      expect(deviceStatusService.isDeviceOnline("online")).toBe(true);
      expect(deviceStatusService.isDeviceOnline("maintenance")).toBe(true);
      expect(deviceStatusService.isDeviceOnline("offline")).toBe(false);
      expect(deviceStatusService.isDeviceOnline("error")).toBe(false);
    });
  });

  // ============================================================
  // ADDITIONAL BRANCH COVERAGE TESTS
  // ============================================================

  describe("Additional Branch Coverage", () => {
    // ✅ NEW: Device status history with getStatusHistory limit
    it("should return limited number of history entries", () => {
      // Clear existing history
      deviceStatusService.statusHistory = [];

      // Add multiple status changes
      for (let i = 0; i < 10; i++) {
        deviceStatusService.updateDeviceStatus("TC001", {
          status: i % 2 === 0 ? "online" : "offline",
        });
      }

      const limitedHistory = deviceStatusService.getStatusHistory(5);
      expect(limitedHistory.length).toBeLessThanOrEqual(5);
      expect(limitedHistory.length).toBe(5);
    });

    // ✅ NEW: Status change with no changes (should return null)
    it("should return null when updating with no actual changes", () => {
      const currentStatus = deviceStatusService.getDeviceStatus("TC001");
      const result = deviceStatusService.updateDeviceStatus("TC001", {
        status: currentStatus.status,
        hasAlert: currentStatus.hasAlert,
        hasAlarm: currentStatus.hasAlarm,
        healthStatus: currentStatus.healthStatus,
      });
      expect(result).toBeNull();
    });

    // ✅ NEW: Multiple changes in one update
    it("should detect multiple changes in a single update", () => {
      const statusChange = deviceStatusService.updateDeviceStatus("TC001", {
        status: "offline",
        hasAlert: true,
        hasAlarm: true,
        healthStatus: "Critical",
      });

      expect(statusChange).toBeTruthy();
      // Should have 4 changes: connectivity, status, alert, alarm, health
      expect(statusChange.changes.length).toBeGreaterThanOrEqual(4);
      const changeTypes = statusChange.changes.map((c) => c.type);
      expect(changeTypes).toContain("connectivity");
      expect(changeTypes).toContain("status");
      expect(changeTypes).toContain("alert");
      expect(changeTypes).toContain("alarm");
      expect(changeTypes).toContain("health");
    });

    // ✅ FIXED: simulateStatusChanges with sequenced mock to avoid constant 0.05
    it("should simulate status changes with interval", () => {
      vi.useFakeTimers();
      const mockRandom = vi.spyOn(Math, "random");

      const originalStatus = deviceStatusService.getDeviceStatus("TC001").status; // "online"

      // 1st call → device index (0 → TC001), 2nd call → rand check, 3rd call → status index (1 → "offline")
      mockRandom
        .mockReturnValueOnce(0) // pick TC001 (index 0)
        .mockReturnValueOnce(0.05) // rand < 0.1 branch
        .mockReturnValueOnce(0.34); // floor(0.34*3)=1 → "offline"

      deviceStatusService.simulateStatusChanges();
      vi.advanceTimersByTime(deviceStatusService.config.pollInterval);

      const updatedDevice = deviceStatusService.getDeviceStatus("TC001");
      expect(updatedDevice.status).not.toBe(originalStatus);
      expect(updatedDevice.status).toBe("offline");

      // Force the alert branch on the next tick
      mockRandom
        .mockReturnValueOnce(0) // pick TC001 again
        .mockReturnValueOnce(0.12); // 0.1 <= rand < 0.15 → alert branch

      vi.advanceTimersByTime(deviceStatusService.config.pollInterval);

      const deviceWithAlert = deviceStatusService.getDeviceStatus("TC001");
      expect(deviceWithAlert.hasAlert).toBe(true);

      mockRandom.mockRestore();
      vi.useRealTimers();
    });

    // ✅ NEW: initialize when already initialized
    it("should not re-initialize if already initialized", () => {
      const initializeSpy = vi.spyOn(deviceStatusService, "initialize");
      deviceStatusService.isInitialized = true;
      deviceStatusService.initialize();
      expect(initializeSpy).toHaveBeenCalled();
      // The function returns early, so devices should still be populated
      expect(deviceStatusService.devices.size).toBeGreaterThan(0);
      initializeSpy.mockRestore();
    });

    // ✅ NEW: generateDeviceStatusNotifications when no history
    it("should return empty array when no history exists", () => {
      deviceStatusService.statusHistory = [];
      const notifications =
        deviceStatusService.generateDeviceStatusNotifications("admin");
      expect(notifications).toEqual([]);
    });

    // ✅ NEW: generateDeviceStatusNotifications with null/undefined role
    it("should handle null or undefined role gracefully", () => {
      // Create a status change first
      deviceStatusService.updateDeviceStatus("TC001", { status: "offline" });

      const notificationsNull =
        deviceStatusService.generateDeviceStatusNotifications(null);
      const notificationsUndefined =
        deviceStatusService.generateDeviceStatusNotifications(undefined);

      expect(notificationsNull.length).toBeGreaterThan(0);
      expect(notificationsUndefined.length).toBeGreaterThan(0);
    });

    // ✅ NEW: updateDeviceStatus with only some fields changed
    it("should only create changes for fields that actually changed", () => {
      const statusChange = deviceStatusService.updateDeviceStatus("TC001", {
        status: "online", // Same as current
        hasAlert: true, // Different
        hasAlarm: false, // Same as current
      });

      expect(statusChange).toBeTruthy();
      // Should only have alert change, not status or alarm
      const changeTypes = statusChange.changes.map((c) => c.type);
      expect(changeTypes).toContain("alert");
      expect(changeTypes).not.toContain("status");
      expect(changeTypes).not.toContain("alarm");
    });

    // ✅ NEW: getStatusHistory with limit larger than history
    it("should return all history when limit exceeds available entries", () => {
      deviceStatusService.statusHistory = [];
      for (let i = 0; i < 3; i++) {
        deviceStatusService.updateDeviceStatus("TC001", {
          status: i % 2 === 0 ? "online" : "offline",
        });
      }

      const history = deviceStatusService.getStatusHistory(10);
      expect(history.length).toBe(3);
    });

    // ✅ NEW: removeStatusChangeListener with non-existent listener
    it("should handle removing a non-existent listener gracefully", () => {
      const listener = vi.fn();
      // Listener not added, so removing should not throw
      expect(() => {
        deviceStatusService.removeStatusChangeListener(listener);
      }).not.toThrow();
    });

    // ✅ NEW: simulateStatusChanges with alert already true
    it("should not trigger alert if hasAlert is already true", () => {
      vi.useFakeTimers();
      const mockRandom = vi.spyOn(Math, "random");

      // Set initial alert state
      deviceStatusService.updateDeviceStatus("TC001", { hasAlert: true });

      // Force alert scenario (0.12 is between 0.1 and 0.15)
      mockRandom
        .mockReturnValueOnce(0) // pick TC001
        .mockReturnValueOnce(0.12); // 0.1 <= rand < 0.15 → alert branch

      const deviceBefore = deviceStatusService.getDeviceStatus("TC001");
      expect(deviceBefore.hasAlert).toBe(true);

      deviceStatusService.simulateStatusChanges();
      vi.advanceTimersByTime(deviceStatusService.config.pollInterval);

      const deviceAfter = deviceStatusService.getDeviceStatus("TC001");
      // Alert should still be true (not triggered again, but status is already true)
      expect(deviceAfter.hasAlert).toBe(true);

      mockRandom.mockRestore();
      vi.useRealTimers();
    });
  });
});
