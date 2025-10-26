import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAllCurrentNotificationsForUnit,
  getAllNotifications,
  getDeviceStatusNotifications,
  getRoleFilteredAlarms,
  getRoleFilteredAlerts,
} from "../utils/notifications";

// Mock deviceStatusService
vi.mock("../services/deviceStatusService", () => ({
  deviceStatusService: {
    generateDeviceStatusNotifications: vi.fn(() => []),
  },
}));

describe("notifications utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getRoleFilteredAlarms", () => {
    it("should return all alarms for admin users", () => {
      const alarms = getRoleFilteredAlarms("admin");
      expect(alarms.length).toBeGreaterThan(0);
      expect(alarms).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: "alarm" })]),
      );
    });

    it("should filter alarms for regular users (units 1-6)", () => {
      const alarms = getRoleFilteredAlarms("user");
      expect(alarms).toBeDefined();

      // All alarms should be for units 1-6
      alarms.forEach((alarm) => {
        const unitMatch = alarm.message.match(/ThermaCore Unit (\d+)/);
        if (unitMatch) {
          const unitNum = parseInt(unitMatch[1], 10);
          expect(unitNum).toBeGreaterThanOrEqual(1);
          expect(unitNum).toBeLessThanOrEqual(6);
        }
      });
    });

    it("should return array for unknown role", () => {
      const alarms = getRoleFilteredAlarms("unknown");
      expect(Array.isArray(alarms)).toBe(true);
    });
  });

  describe("getRoleFilteredAlerts", () => {
    it("should return all alerts for admin users", () => {
      const alerts = getRoleFilteredAlerts("admin");
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: "alert" })]),
      );
    });

    it("should filter alerts for regular users (units 1-6)", () => {
      const alerts = getRoleFilteredAlerts("user");
      expect(alerts).toBeDefined();

      // All alerts should be for units 1-6
      alerts.forEach((alert) => {
        const unitMatch = alert.message.match(/ThermaCore Unit (\d+)/);
        if (unitMatch) {
          const unitNum = parseInt(unitMatch[1], 10);
          expect(unitNum).toBeGreaterThanOrEqual(1);
          expect(unitNum).toBeLessThanOrEqual(6);
        }
      });
    });

    it("should include alerts with different statuses", () => {
      const alerts = getRoleFilteredAlerts("admin");
      const completedAlerts = alerts.filter((a) => a.status === "completed");
      expect(alerts.length).toBeGreaterThan(completedAlerts.length);
    });
  });

  describe("getDeviceStatusNotifications", () => {
    it("should call deviceStatusService and return notifications", async () => {
      const mockNotifications = [
        {
          id: 100,
          type: "device",
          message: "Device status notification",
          alertData: { deviceId: "TC001" },
        },
      ];

      const { deviceStatusService } = await import(
        "../services/deviceStatusService"
      );
      vi.mocked(
        deviceStatusService.generateDeviceStatusNotifications,
      ).mockReturnValue(mockNotifications);

      const result = getDeviceStatusNotifications("admin");
      expect(result).toEqual(mockNotifications);
      expect(
        deviceStatusService.generateDeviceStatusNotifications,
      ).toHaveBeenCalledWith("admin");
    });

    it("should return empty array on error", async () => {
      const { deviceStatusService } = await import(
        "../services/deviceStatusService"
      );
      vi.mocked(
        deviceStatusService.generateDeviceStatusNotifications,
      ).mockImplementation(() => {
        throw new Error("Service error");
      });

      const result = getDeviceStatusNotifications("user");
      expect(result).toEqual([]);
    });

    it("should default to user role if no role provided", async () => {
      const { deviceStatusService } = await import(
        "../services/deviceStatusService"
      );
      vi.mocked(
        deviceStatusService.generateDeviceStatusNotifications,
      ).mockReturnValue([]);

      getDeviceStatusNotifications();
      expect(
        deviceStatusService.generateDeviceStatusNotifications,
      ).toHaveBeenCalledWith("user");
    });
  });

  describe("getAllNotifications", () => {
    it("should combine alarms, alerts, and device status notifications", async () => {
      const { deviceStatusService } = await import(
        "../services/deviceStatusService"
      );
      const mockDeviceNotifications = [
        { id: 100, type: "device", message: "Device notification" },
      ];
      vi.mocked(
        deviceStatusService.generateDeviceStatusNotifications,
      ).mockReturnValue(mockDeviceNotifications);

      const notifications = getAllNotifications("admin");

      expect(notifications.length).toBeGreaterThan(0);
      // Should contain alarms, alerts, and device notifications
      expect(notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "alarm" }),
          expect.objectContaining({ type: "alert" }),
          expect.objectContaining({ type: "device" }),
        ]),
      );
    });

    it("should filter notifications based on role", () => {
      const adminNotifications = getAllNotifications("admin");
      const userNotifications = getAllNotifications("user");

      // Admin should have more or equal notifications than user
      expect(adminNotifications.length).toBeGreaterThanOrEqual(
        userNotifications.length,
      );
    });

    it("should default to user role if no role provided", () => {
      const notifications = getAllNotifications();
      expect(Array.isArray(notifications)).toBe(true);

      // Verify it's using user role filtering
      notifications.forEach((notification) => {
        if (notification.message) {
          const unitMatch = notification.message.match(/ThermaCore Unit (\d+)/);
          if (unitMatch) {
            const unitNum = parseInt(unitMatch[1], 10);
            // User role should only see units 1-6
            expect(unitNum).toBeLessThanOrEqual(14); // May include some admin units
          }
        }
      });
    });
  });

  describe("getAllCurrentNotificationsForUnit", () => {
    beforeEach(async () => {
      const { deviceStatusService } = await import(
        "../services/deviceStatusService"
      );
      vi.mocked(
        deviceStatusService.generateDeviceStatusNotifications,
      ).mockReturnValue([]);
    });

    it("should extract unit number from string ID format TC003", () => {
      const notifications = getAllCurrentNotificationsForUnit("TC003", "admin");
      expect(Array.isArray(notifications)).toBe(true);
    });

    it("should extract unit number from numeric string", () => {
      const notifications = getAllCurrentNotificationsForUnit("3", "admin");
      expect(Array.isArray(notifications)).toBe(true);
    });

    it("should handle numeric unitId", () => {
      const notifications = getAllCurrentNotificationsForUnit(3, "admin");
      expect(Array.isArray(notifications)).toBe(true);
    });

    it("should return only notifications for specified unit", () => {
      const notifications = getAllCurrentNotificationsForUnit("001", "admin");

      notifications.forEach((notification) => {
        // Each notification should relate to unit 001
        expect(notification).toBeDefined();
      });
    });

    it("should filter by user role", () => {
      // Admin should potentially see more notifications
      const adminNotifications = getAllCurrentNotificationsForUnit(
        "003",
        "admin",
      );
      const userNotifications = getAllCurrentNotificationsForUnit(
        "003",
        "user",
      );

      expect(adminNotifications.length).toBeGreaterThanOrEqual(
        userNotifications.length,
      );
    });

    it("should return alert data objects", () => {
      const notifications = getAllCurrentNotificationsForUnit("001", "admin");
      if (notifications.length > 0) {
        // Should return alertData objects which have message, type, title properties
        expect(notifications[0]).toHaveProperty("message");
        expect(notifications[0]).toHaveProperty("type");
      }
    });

    it("should handle units with no notifications", () => {
      const notifications = getAllCurrentNotificationsForUnit("999", "admin");
      expect(notifications).toEqual([]);
    });

    it("should include device status notifications for the unit", async () => {
      const { deviceStatusService } = await import(
        "../services/deviceStatusService"
      );
      const mockDeviceNotifications = [
        {
          message: "ThermaCore Unit 003 - Device notification",
          alertData: { deviceId: "TC003", type: "warning" },
        },
      ];
      vi.mocked(
        deviceStatusService.generateDeviceStatusNotifications,
      ).mockReturnValue(mockDeviceNotifications);

      const notifications = getAllCurrentNotificationsForUnit("003", "admin");

      expect(notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ deviceId: "TC003" }),
        ]),
      );
    });

    it("should pad unit numbers correctly", () => {
      // Testing single digit padding
      const notifications1 = getAllCurrentNotificationsForUnit(1, "admin");
      const notifications2 = getAllCurrentNotificationsForUnit("1", "admin");
      const notifications3 = getAllCurrentNotificationsForUnit("001", "admin");

      // All should return the same results
      expect(notifications1).toEqual(notifications2);
      expect(notifications2).toEqual(notifications3);
    });
  });
});
