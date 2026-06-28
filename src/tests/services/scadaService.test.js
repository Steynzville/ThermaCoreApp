/**
 * Tests for SCADA Service - focused on branch coverage
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDeviceStatus,
  getScadaStatus,
  getCurrentMetrics,
  getHistoricalData,
  getProtocolStatus,
  generateMockMetrics,
  generateMockHistoricalData,
  generateMockProtocolStatus,
} from "../../services/scadaService";
import * as apiFetch from "../../utils/apiFetch";

// Mock the apiFetch module
vi.mock("../../utils/apiFetch", () => ({
  apiGetJson: vi.fn(),
}));

describe("SCADA Service - Branch Coverage Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDeviceStatus", () => {
    it("should fallback to response if response.data is undefined", async () => {
      const mockRawResponse = { rawField: "rawValue" };
      apiFetch.apiGetJson.mockResolvedValue(mockRawResponse);

      const result = await getDeviceStatus("tenant-1");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRawResponse);
    });

    it("should handle error with message in catch block", async () => {
      const errorMessage = "Device retrieval failed";
      apiFetch.apiGetJson.mockRejectedValue(new Error(errorMessage));

      const result = await getDeviceStatus("tenant-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
      expect(result.data).toBeNull();
    });

    it("should handle error without message in catch block", async () => {
      apiFetch.apiGetJson.mockRejectedValue({});

      const result = await getDeviceStatus("tenant-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch device status");
      expect(result.data).toBeNull();
    });
  });

  describe("getScadaStatus", () => {
    it("should fetch scada status successfully with data property", async () => {
      const mockResponse = { data: { system: "OK" } };
      apiFetch.apiGetJson.mockResolvedValue(mockResponse);

      const result = await getScadaStatus();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ system: "OK" });
      expect(apiFetch.apiGetJson).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/scada/status")
      );
    });

    it("should fallback to response if response.data is undefined", async () => {
      const mockRawResponse = { system: "OK_RAW" };
      apiFetch.apiGetJson.mockResolvedValue(mockRawResponse);

      const result = await getScadaStatus();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRawResponse);
    });

    it("should handle error with message in catch block", async () => {
      const errorMessage = "Scada status failed";
      apiFetch.apiGetJson.mockRejectedValue(new Error(errorMessage));

      const result = await getScadaStatus();

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
      expect(result.data).toBeNull();
    });

    it("should handle error without message in catch block", async () => {
      apiFetch.apiGetJson.mockRejectedValue({});

      const result = await getScadaStatus();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch SCADA status");
      expect(result.data).toBeNull();
    });
  });

  describe("getCurrentMetrics", () => {
    it("should fetch current metrics successfully without tenant ID", async () => {
      const mockResponse = { data: { activeUnits: 5 } };
      apiFetch.apiGetJson.mockResolvedValue(mockResponse);

      const result = await getCurrentMetrics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
      expect(apiFetch.apiGetJson).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/scada/current-metrics")
      );
    });

    it("should fetch current metrics successfully with tenant ID", async () => {
      const mockResponse = { data: { activeUnits: 5 } };
      apiFetch.apiGetJson.mockResolvedValue(mockResponse);

      const result = await getCurrentMetrics("tenant-abc");

      expect(result.success).toBe(true);
      expect(apiFetch.apiGetJson).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/scada/current-metrics?tenant_id=tenant-abc")
      );
    });

    it("should handle current metrics errors gracefully", async () => {
      apiFetch.apiGetJson.mockRejectedValue(new Error("Network Error"));

      const result = await getCurrentMetrics();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network Error");
    });
  });

  describe("getHistoricalData", () => {
    it("should fetch historical data successfully with all query params", async () => {
      const mockResponse = { data: [] };
      apiFetch.apiGetJson.mockResolvedValue(mockResponse);

      const result = await getHistoricalData({
        tenantId: "tenant-123",
        startTime: "2026-06-26T00:00:00Z",
        endTime: "2026-06-27T00:00:00Z",
        interval: "1h",
      });

      expect(result.success).toBe(true);
      expect(apiFetch.apiGetJson).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/scada/historical-data?tenant_id=tenant-123&start_time=2026-06-26T00%3A00%3A00Z&end_time=2026-06-27T00%3A00%3A00Z&interval=1h")
      );
    });

    it("should handle historical data errors gracefully", async () => {
      apiFetch.apiGetJson.mockRejectedValue(new Error("Timeout"));

      const result = await getHistoricalData();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Timeout");
    });
  });

  describe("getProtocolStatus", () => {
    it("should fetch protocol status successfully with tenant ID", async () => {
      const mockResponse = { data: [] };
      apiFetch.apiGetJson.mockResolvedValue(mockResponse);

      const result = await getProtocolStatus("tenant-456");

      expect(result.success).toBe(true);
      expect(apiFetch.apiGetJson).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/protocols/status?tenant_id=tenant-456")
      );
    });

    it("should handle protocol status errors gracefully", async () => {
      apiFetch.apiGetJson.mockRejectedValue(new Error("Unauthorized"));

      const result = await getProtocolStatus();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });
  });

  describe("Mock Data Generators", () => {
    it("should generate mock metrics successfully with correct shape", () => {
      const metrics = generateMockMetrics();
      expect(metrics).toHaveProperty("activeUnits");
      expect(metrics).toHaveProperty("temperature");
      expect(metrics).toHaveProperty("pressure");
      expect(metrics).toHaveProperty("dataPoints");
      expect(metrics).toHaveProperty("dataQuality");
    });

    it("should generate mock historical data correctly", () => {
      const historical = generateMockHistoricalData(12);
      expect(Array.isArray(historical)).toBe(true);
      expect(historical.length).toBeGreaterThan(0);
      expect(historical[0]).toHaveProperty("timestamp");
      expect(historical[0]).toHaveProperty("temperature");
      expect(historical[0]).toHaveProperty("pressure");
    });

    it("should generate mock protocol status with multiple protocols", () => {
      const statuses = generateMockProtocolStatus();
      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBe(4);
      expect(statuses[0]).toHaveProperty("name");
      expect(statuses[0]).toHaveProperty("status");
      expect(statuses[0]).toHaveProperty("devices");
    });
  });
});
