/**
 * Tests for SCADA Service
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import scadaService from "../services/scadaService";
import * as apiFetch from "../utils/apiFetch";

// Mock the apiFetch module
vi.mock("../utils/apiFetch", () => ({
  apiGetJson: vi.fn(),
}));

describe("SCADA Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentMetrics", () => {
    it("should fetch current metrics successfully", async () => {
      const mockMetrics = {
        activeUnits: { value: 10, total: 12 },
        temperature: { current: 72.5 },
        dataPoints: { count: 2500 },
      };

      apiFetch.apiGetJson.mockResolvedValue({ data: mockMetrics });

      const result = await scadaService.getCurrentMetrics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMetrics);
      expect(apiFetch.apiGetJson).toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      apiFetch.apiGetJson.mockRejectedValue(new Error("Network error"));

      const result = await scadaService.getCurrentMetrics();

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("should include tenant ID in request when provided", async () => {
      const tenantId = "tenant-123";
      apiFetch.apiGetJson.mockResolvedValue({ data: {} });

      await scadaService.getCurrentMetrics(tenantId);

      const callUrl = apiFetch.apiGetJson.mock.calls[0][0];
      expect(callUrl).toContain(`tenant_id=${tenantId}`);
    });

    it("should fallback to response if response.data is undefined", async () => {
      const mockRawResponse = { rawField: "rawValue" };
      apiFetch.apiGetJson.mockResolvedValue(mockRawResponse);

      const result = await scadaService.getCurrentMetrics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRawResponse);
    });

    it("should handle error without message in catch block", async () => {
      apiFetch.apiGetJson.mockRejectedValue({});

      const result = await scadaService.getCurrentMetrics();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch current metrics");
      expect(result.data).toBeNull();
    });
  });

  describe("getHistoricalData", () => {
    it("should fetch historical data with parameters", async () => {
      const mockData = [
        { timestamp: "2025-01-01T00:00:00Z", temperature: 70 },
        { timestamp: "2025-01-01T01:00:00Z", temperature: 72 },
      ];

      apiFetch.apiGetJson.mockResolvedValue({ data: mockData });

      const result = await scadaService.getHistoricalData({
        startTime: "2025-01-01T00:00:00Z",
        endTime: "2025-01-01T02:00:00Z",
        interval: "1h",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it("should handle missing parameters", async () => {
      apiFetch.apiGetJson.mockResolvedValue({ data: [] });

      const result = await scadaService.getHistoricalData();

      expect(result.success).toBe(true);
    });

    it("should fetch historical data with all query params", async () => {
      const mockResponse = { data: [] };
      apiFetch.apiGetJson.mockResolvedValue(mockResponse);

      const result = await scadaService.getHistoricalData({
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
  });

  describe("getProtocolStatus", () => {
    it("should fetch protocol status", async () => {
      const mockProtocols = [
        { name: "Modbus", status: "connected" },
        { name: "DNP3", status: "connected" },
      ];

      apiFetch.apiGetJson.mockResolvedValue({ data: mockProtocols });

      const result = await scadaService.getProtocolStatus();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProtocols);
    });

    it("should fetch protocol status with tenant ID", async () => {
      const mockResponse = { data: [] };
      apiFetch.apiGetJson.mockResolvedValue(mockResponse);

      const result = await scadaService.getProtocolStatus("tenant-456");

      expect(result.success).toBe(true);
      expect(apiFetch.apiGetJson).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/protocols/status?tenant_id=tenant-456")
      );
    });
  });

  describe("getDeviceStatus", () => {
    it("should fetch device status", async () => {
      const mockDevices = {
        devices: [],
        total_devices: 0,
        online_devices: 0,
      };

      apiFetch.apiGetJson.mockResolvedValue({ data: mockDevices });

      const result = await scadaService.getDeviceStatus();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDevices);
    });

    it("should fallback to response if response.data is undefined", async () => {
      const mockRawResponse = { rawField: "rawValue" };
      apiFetch.apiGetJson.mockResolvedValue(mockRawResponse);

      const result = await scadaService.getDeviceStatus();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRawResponse);
    });

    it("should handle error without message in catch block", async () => {
      apiFetch.apiGetJson.mockRejectedValue({});

      const result = await scadaService.getDeviceStatus();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch device status");
      expect(result.data).toBeNull();
    });
  });

  describe("getScadaStatus", () => {
    it("should fetch scada status successfully", async () => {
      const mockResponse = { data: { system: "OK" } };
      apiFetch.apiGetJson.mockResolvedValue(mockResponse);

      const result = await scadaService.getScadaStatus();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ system: "OK" });
      expect(apiFetch.apiGetJson).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/scada/status")
      );
    });

    it("should fallback to response if response.data is undefined", async () => {
      const mockRawResponse = { system: "OK_RAW" };
      apiFetch.apiGetJson.mockResolvedValue(mockRawResponse);

      const result = await scadaService.getScadaStatus();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRawResponse);
    });

    it("should handle scada status errors gracefully", async () => {
      apiFetch.apiGetJson.mockRejectedValue(new Error("Scada status failed"));

      const result = await scadaService.getScadaStatus();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Scada status failed");
    });

    it("should handle error without message in catch block", async () => {
      apiFetch.apiGetJson.mockRejectedValue({});

      const result = await scadaService.getScadaStatus();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to fetch SCADA status");
      expect(result.data).toBeNull();
    });
  });

  describe("Mock Data Generators", () => {
    it("should generate realistic mock metrics", () => {
      const metrics = scadaService.generateMockMetrics();

      expect(metrics).toHaveProperty("activeUnits");
      expect(metrics).toHaveProperty("temperature");
      expect(metrics).toHaveProperty("pressure");
      expect(metrics).toHaveProperty("dataPoints");
      expect(metrics).toHaveProperty("dataQuality");

      expect(metrics.activeUnits.value).toBeGreaterThan(0);
      expect(metrics.temperature.current).toBeTruthy();
      expect(metrics.dataQuality.score).toBeGreaterThanOrEqual(0);
      expect(metrics.dataQuality.score).toBeLessThanOrEqual(100);
    });

    it("should generate mock historical data", () => {
      const hours = 24;
      const data = scadaService.generateMockHistoricalData(hours);

      // The function generates one data point per hour for the specified hours
      expect(data).toHaveLength(hours);
      expect(data[0]).toHaveProperty("timestamp");
      expect(data[0]).toHaveProperty("temperature");
      expect(data[0]).toHaveProperty("pressure");
    });

    it("should generate mock historical data with default hours when not specified", () => {
      const data = scadaService.generateMockHistoricalData();

      // If no hours specified, it should default to 24 hours
      expect(data).toHaveLength(24);
      expect(data[0]).toHaveProperty("timestamp");
      expect(data[0]).toHaveProperty("temperature");
      expect(data[0]).toHaveProperty("pressure");
    });

    it("should generate mock protocol status", () => {
      const protocols = scadaService.generateMockProtocolStatus();

      expect(Array.isArray(protocols)).toBe(true);
      expect(protocols.length).toBeGreaterThan(0);

      protocols.forEach((protocol) => {
        expect(protocol).toHaveProperty("name");
        expect(protocol).toHaveProperty("status");
        expect(protocol).toHaveProperty("devices");
        expect(protocol).toHaveProperty("lastUpdate");
      });
    });

    it("should generate mock protocol status with 4 protocols", () => {
      const statuses = scadaService.generateMockProtocolStatus();
      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBe(4);
      expect(statuses[0]).toHaveProperty("name");
      expect(statuses[0]).toHaveProperty("status");
      expect(statuses[0]).toHaveProperty("devices");
    });
  });
});
