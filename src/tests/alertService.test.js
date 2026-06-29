/**
 * Tests for Alert Service
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import alertService, {
  ALERT_SEVERITY,
  ALERT_STATUS,
  acknowledgeAlert,
  generateMockAlertStatistics,
  generateMockAlerts,
} from "../services/alertService";

// Mock the WebSocket service
vi.mock("../services/websocketService", () => ({
  default: {
    subscribe: vi.fn(() => vi.fn()), // Return unsubscribe function
  },
}));

// Mock apiFetch
vi.mock("../utils/apiFetch", () => ({
  apiGetJson: vi.fn(),
  apiPostJson: vi.fn(),
}));

describe("Alert Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Constants", () => {
    it("should export ALERT_SEVERITY constants", () => {
      expect(ALERT_SEVERITY.CRITICAL).toBe("critical");
      expect(ALERT_SEVERITY.HIGH).toBe("high");
      expect(ALERT_SEVERITY.WARNING).toBe("warning");
      expect(ALERT_SEVERITY.INFO).toBe("info");
    });

    it("should export ALERT_STATUS constants", () => {
      expect(ALERT_STATUS.OPEN).toBe("open");
      expect(ALERT_STATUS.ACKNOWLEDGED).toBe("acknowledged");
      expect(ALERT_STATUS.RESOLVED).toBe("resolved");
      expect(ALERT_STATUS.ESCALATED).toBe("escalated");
    });
  });

  describe("generateMockAlerts", () => {
    it("should generate specified number of mock alerts", () => {
      const alerts = generateMockAlerts(5);
      expect(alerts).toHaveLength(5);
    });

    it("should generate alerts with required properties", () => {
      const alerts = generateMockAlerts(1);
      const alert = alerts[0];

      expect(alert).toHaveProperty("id");
      expect(alert).toHaveProperty("severity");
      expect(alert).toHaveProperty("status");
      expect(alert).toHaveProperty("type");
      expect(alert).toHaveProperty("device");
      expect(alert).toHaveProperty("message");
      expect(alert).toHaveProperty("timestamp");
      expect(alert).toHaveProperty("acknowledged");
    });

    it("should generate alerts with valid severity levels", () => {
      const alerts = generateMockAlerts(10);
      const validSeverities = Object.values(ALERT_SEVERITY);

      alerts.forEach((alert) => {
        expect(validSeverities).toContain(alert.severity);
      });
    });

    it("should sort alerts by timestamp descending", () => {
      const alerts = generateMockAlerts(5);

      for (let i = 0; i < alerts.length - 1; i++) {
        const current = new Date(alerts[i].timestamp);
        const next = new Date(alerts[i + 1].timestamp);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });

  describe("generateMockAlertStatistics", () => {
    it("should generate statistics with required properties", () => {
      const stats = generateMockAlertStatistics();

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("bySeverity");
      expect(stats).toHaveProperty("byStatus");
      expect(stats).toHaveProperty("avgResolutionTime");
      expect(stats).toHaveProperty("mttr");
    });

    it("should have all severity categories in statistics", () => {
      const stats = generateMockAlertStatistics();

      expect(stats.bySeverity).toHaveProperty("critical");
      expect(stats.bySeverity).toHaveProperty("high");
      expect(stats.bySeverity).toHaveProperty("warning");
      expect(stats.bySeverity).toHaveProperty("info");
    });

    it("should have all status categories in statistics", () => {
      const stats = generateMockAlertStatistics();

      expect(stats.byStatus).toHaveProperty("open");
      expect(stats.byStatus).toHaveProperty("acknowledged");
      expect(stats.byStatus).toHaveProperty("resolved");
      expect(stats.byStatus).toHaveProperty("escalated");
    });

    it("should generate positive numbers for all metrics", () => {
      const stats = generateMockAlertStatistics();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.avgResolutionTime).toBeGreaterThan(0);
      expect(stats.mttr).toBeGreaterThan(0);
    });
  });

  describe("acknowledgeAlert", () => {
    it("should handle successful acknowledgment", async () => {
      const { apiPostJson } = await import("../utils/apiFetch");
      const mockResponse = { id: "real-1", acknowledged: true };
      apiPostJson.mockResolvedValueOnce(mockResponse);

      const originalDev = import.meta.env.DEV;
      import.meta.env.DEV = false;

      try {
        const result = await acknowledgeAlert({
          alertId: "real-1",
          userId: "user-1",
          notes: "Test notes",
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockResponse);
        expect(apiPostJson).toHaveBeenCalledWith(
          expect.stringContaining("/api/v1/alarms/real-1/acknowledge"),
          expect.objectContaining({
            user_id: "user-1",
            notes: "Test notes",
          }),
          expect.any(Object)
        );
      } finally {
        import.meta.env.DEV = originalDev;
      }
    });

    it("should handle acknowledgment errors", async () => {
      const { apiPostJson } = await import("../utils/apiFetch");
      
      // Mock both apiPostJson calls to reject, invoking the local fallback
      apiPostJson.mockRejectedValue(new Error("API Error"));

      const originalDev = import.meta.env.DEV;
      import.meta.env.DEV = false;

      try {
        const result = await acknowledgeAlert({
          alertId: "real-1",
          userId: "user-1",
        });

        // The real function implements an ultimate fallback to local acknowledgment on API failure.
        // Therefore, even on API errors, it gracefully returns success: true with local acknowledgment data.
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.id).toBe("real-1");
        expect(result.data.acknowledged).toBe(true);
        expect(result.data.acknowledged_by).toBe("user-1");
        
        // Should have tried both endpoints (alarms and then alerts)
        expect(apiPostJson).toHaveBeenCalledTimes(2);
      } finally {
        import.meta.env.DEV = originalDev;
      }
    });

    it("should handle acknowledgment errors gracefully without message property", async () => {
      const { apiPostJson } = await import("../utils/apiFetch");
      
      // Mock both API calls to fail with an empty object (no message property)
      apiPostJson.mockRejectedValue({});

      const originalDev = import.meta.env.DEV;
      import.meta.env.DEV = false;

      try {
        const result = await acknowledgeAlert({
          alertId: "real-1",
          userId: "user-1",
        });

        // Verifies fallback logic executes successfully and returns success: true
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data.id).toBe("real-1");
        expect(result.data.acknowledged).toBe(true);
        expect(result.data.acknowledged_by).toBe("user-1");
        
        expect(apiPostJson).toHaveBeenCalledTimes(2);
      } finally {
        import.meta.env.DEV = originalDev;
      }
    });
  });

  describe("subscribeToAlerts", () => {
    it("should subscribe to alerts and return unsubscribe function", async () => {
      const { default: websocketService } = await import("../services/websocketService");
      const callback = vi.fn();
      const unsub = alertService.subscribeToAlerts(callback, "tenant-1");

      expect(websocketService.subscribe).toHaveBeenCalledWith("alerts", callback);
      expect(unsub).toBeDefined();
    });
  });

  describe("Default export", () => {
    it("should export all functions", () => {
      expect(alertService).toHaveProperty("getCurrentAlerts");
      expect(alertService).toHaveProperty("acknowledgeAlert");
      expect(alertService).toHaveProperty("getAlertHistory");
      expect(alertService).toHaveProperty("getAlertStatistics");
      expect(alertService).toHaveProperty("subscribeToAlerts");
      expect(alertService).toHaveProperty("generateMockAlerts");
      expect(alertService).toHaveProperty("generateMockAlertStatistics");
    });

    it("should export constants", () => {
      expect(alertService).toHaveProperty("ALERT_SEVERITY");
      expect(alertService).toHaveProperty("ALERT_STATUS");
    });
  });

  describe("getCurrentAlerts", () => {
    it("should fetch alerts with default parameters", async () => {
      const mockAlerts = [{ id: "alert-1", severity: "high" }];
      const { apiGetJson } = await import("../utils/apiFetch");
      apiGetJson.mockResolvedValue({ data: mockAlerts });

      const result = await alertService.getCurrentAlerts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAlerts);
      expect(result.timestamp).toBeDefined();
    });

    it("should fetch alerts with filters", async () => {
      const mockAlerts = [{ id: "alert-1", severity: "critical" }];
      const { apiGetJson } = await import("../utils/apiFetch");
      apiGetJson.mockResolvedValue({ data: mockAlerts });

      const result = await alertService.getCurrentAlerts({
        tenantId: "tenant-1",
        severity: "critical",
        status: "open",
        limit: 25,
      });

      expect(result.success).toBe(true);
      expect(apiGetJson).toHaveBeenCalledWith(
        expect.stringContaining("tenant_id=tenant-1"),
      );
      expect(apiGetJson).toHaveBeenCalledWith(
        expect.stringContaining("severity=critical"),
      );
      expect(apiGetJson).toHaveBeenCalledWith(
        expect.stringContaining("status=open"),
      );
    });

    it("should handle fetch errors gracefully", async () => {
      const { apiGetJson } = await import("../utils/apiFetch");
      apiGetJson.mockRejectedValue(new Error("Network error"));

      const result = await alertService.getCurrentAlerts();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
      expect(result.data).toBeNull();
    });

    it("should handle fetch errors gracefully without message property", async () => {
      const { apiGetJson } = await import("../utils/apiFetch");
      apiGetJson.mockRejectedValueOnce({});

      const result = await alertService.getCurrentAlerts();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch current alerts");
      expect(result.data).toBeNull();
    });

    it("should fallback to raw response if data is undefined", async () => {
      const { apiGetJson } = await import("../utils/apiFetch");
      const mockRawResponse = [{ id: "raw-alert-1" }];
      apiGetJson.mockResolvedValueOnce(mockRawResponse);

      const result = await alertService.getCurrentAlerts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRawResponse);
    });
  });

  describe("getAlertHistory", () => {
    it("should fetch alert history with time range", async () => {
      const mockHistory = [{ id: "alert-1", timestamp: "2024-01-01" }];
      const { apiGetJson } = await import("../utils/apiFetch");
      apiGetJson.mockResolvedValue({ data: mockHistory });

      const result = await alertService.getAlertHistory({
        startTime: "2024-01-01",
        endTime: "2024-01-31",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockHistory);
    });

    it("should handle history fetch errors", async () => {
      const { apiGetJson } = await import("../utils/apiFetch");
      apiGetJson.mockRejectedValue(new Error("Database error"));

      const result = await alertService.getAlertHistory();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Database error");
    });

    it("should handle history fetch errors gracefully without message property", async () => {
      const { apiGetJson } = await import("../utils/apiFetch");
      apiGetJson.mockRejectedValueOnce({});

      const result = await alertService.getAlertHistory();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch alert history");
    });

    it("should fallback to raw response if data is undefined in history fetch", async () => {
      const { apiGetJson } = await import("../utils/apiFetch");
      const mockRawResponse = [{ id: "raw-alert-history-1" }];
      apiGetJson.mockResolvedValueOnce(mockRawResponse);

      const result = await alertService.getAlertHistory();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRawResponse);
    });
  });

  describe("getAlertStatistics", () => {
    it("should fetch statistics with default timeframe", async () => {
      const mockStats = { total: 100, bySeverity: {} };
      const { apiGetJson } = await import("../utils/apiFetch");
      apiGetJson.mockResolvedValue({ data: mockStats });

      const result = await alertService.getAlertStatistics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
    });

    it("should fetch statistics with custom timeframe", async () => {
      const mockStats = { total: 50 };
      const { apiGetJson } = await import("../utils/apiFetch");
      apiGetJson.mockResolvedValue({ data: mockStats });

      const result = await alertService.getAlertStatistics({
        tenantId: "tenant-1",
        timeframe: "7d",
      });

      expect(result.success).toBe(true);
      expect(apiGetJson).toHaveBeenCalledWith(
        expect.stringContaining("timeframe=7d"),
      );
    });

    it("should handle statistics fetch errors", async () => {
      const { apiGetJson } = await import("../utils/apiFetch");
      apiGetJson.mockRejectedValue(new Error("Stats error"));

      const result = await alertService.getAlertStatistics();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Stats error");
    });

    it("should handle statistics fetch errors gracefully without message property", async () => {
      const { apiGetJson } = await import("../utils/apiFetch");
      apiGetJson.mockRejectedValueOnce({});

      const result = await alertService.getAlertStatistics();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch alert statistics");
    });

    it("should fallback to raw response if data is undefined in statistics fetch", async () => {
      const { apiGetJson } = await import("../utils/apiFetch");
      const mockRawResponse = { total: 42 };
      apiGetJson.mockResolvedValueOnce(mockRawResponse);

      const result = await alertService.getAlertStatistics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRawResponse);
    });
  });
});
