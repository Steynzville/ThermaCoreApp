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
  });
});
