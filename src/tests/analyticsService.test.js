/**
 * Tests for Analytics Service
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import analyticsService, {
  generateMockEnergyConsumption,
  generateMockEquipmentHealth,
  generateMockPerformanceMetrics,
  generateReport,
} from "../services/analyticsService";

// Mock apiFetch
vi.mock("../utils/apiFetch", () => ({
  apiGetJson: vi.fn(),
}));

describe("Analytics Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateMockPerformanceMetrics", () => {
    it("should generate performance metrics with required properties", () => {
      const metrics = generateMockPerformanceMetrics();

      expect(metrics).toHaveProperty("overall");
      expect(metrics).toHaveProperty("byDevice");
      expect(metrics).toHaveProperty("trends");
    });

    it("should have overall metrics with valid percentages", () => {
      const metrics = generateMockPerformanceMetrics();

      expect(parseFloat(metrics.overall.efficiency)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(metrics.overall.efficiency)).toBeLessThanOrEqual(100);
      expect(parseFloat(metrics.overall.uptime)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(metrics.overall.uptime)).toBeLessThanOrEqual(100);
    });

    it("should have device-specific metrics", () => {
      const metrics = generateMockPerformanceMetrics();

      expect(Array.isArray(metrics.byDevice)).toBe(true);
      expect(metrics.byDevice.length).toBeGreaterThan(0);

      metrics.byDevice.forEach((device) => {
        expect(device).toHaveProperty("id");
        expect(device).toHaveProperty("name");
        expect(device).toHaveProperty("efficiency");
        expect(device).toHaveProperty("uptime");
        expect(device).toHaveProperty("status");
      });
    });

    it("should have trend data", () => {
      const metrics = generateMockPerformanceMetrics();

      expect(metrics.trends).toHaveProperty("efficiency");
      expect(metrics.trends).toHaveProperty("uptime");
      expect(Array.isArray(metrics.trends.efficiency)).toBe(true);
      expect(metrics.trends.efficiency.length).toBe(24);
    });
  });

  describe("generateMockEquipmentHealth", () => {
    it("should generate equipment health data with required properties", () => {
      const health = generateMockEquipmentHealth();

      expect(health).toHaveProperty("overall");
      expect(health).toHaveProperty("devices");
    });

    it("should have overall health with valid score", () => {
      const health = generateMockEquipmentHealth();

      expect(health.overall.score).toBeGreaterThanOrEqual(0);
      expect(health.overall.score).toBeLessThanOrEqual(100);
      expect(health.overall).toHaveProperty("status");
      expect(health.overall).toHaveProperty("lastMaintenance");
      expect(health.overall).toHaveProperty("nextMaintenance");
    });

    it("should have device health data", () => {
      const health = generateMockEquipmentHealth();

      expect(Array.isArray(health.devices)).toBe(true);
      expect(health.devices.length).toBeGreaterThan(0);

      health.devices.forEach((device) => {
        expect(device).toHaveProperty("id");
        expect(device).toHaveProperty("name");
        expect(device).toHaveProperty("healthScore");
        expect(device).toHaveProperty("status");
        expect(device).toHaveProperty("sensors");
        expect(device).toHaveProperty("predictions");
      });
    });

    it("should have sensor status for each device", () => {
      const health = generateMockEquipmentHealth();

      health.devices.forEach((device) => {
        expect(device.sensors).toHaveProperty("temperature");
        expect(device.sensors).toHaveProperty("pressure");
        expect(device.sensors).toHaveProperty("flow");
      });
    });

    it("should have predictions for each device", () => {
      const health = generateMockEquipmentHealth();

      health.devices.forEach((device) => {
        expect(device.predictions).toHaveProperty("maintenanceDue");
        expect(device.predictions).toHaveProperty("remainingLifetime");
        expect(device.predictions.maintenanceDue).toBeGreaterThan(0);
        expect(device.predictions.remainingLifetime).toBeGreaterThanOrEqual(0);
        expect(device.predictions.remainingLifetime).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("generateMockEnergyConsumption", () => {
    it("should generate energy data with default days", () => {
      const energy = generateMockEnergyConsumption();

      expect(energy).toHaveProperty("total");
      expect(energy).toHaveProperty("average");
      expect(energy).toHaveProperty("peak");
      expect(energy).toHaveProperty("savings");
      expect(energy).toHaveProperty("timeline");
      expect(energy).toHaveProperty("byDevice");
    });

    it("should generate timeline with correct number of days", () => {
      const energy7 = generateMockEnergyConsumption(7);
      const energy30 = generateMockEnergyConsumption(30);

      expect(energy7.timeline).toHaveLength(7);
      expect(energy30.timeline).toHaveLength(30);
    });

    it("should have timeline data with required properties", () => {
      const energy = generateMockEnergyConsumption();

      energy.timeline.forEach((point) => {
        expect(point).toHaveProperty("date");
        expect(point).toHaveProperty("consumption");
        expect(point).toHaveProperty("cost");
        expect(point.consumption).toBeGreaterThan(0);
        expect(point.cost).toBeGreaterThan(0);
      });
    });

    it("should have device breakdown data", () => {
      const energy = generateMockEnergyConsumption();

      expect(Array.isArray(energy.byDevice)).toBe(true);
      expect(energy.byDevice.length).toBeGreaterThan(0);

      energy.byDevice.forEach((device) => {
        expect(device).toHaveProperty("id");
        expect(device).toHaveProperty("name");
        expect(device).toHaveProperty("consumption");
        expect(device).toHaveProperty("percentage");
      });
    });

    it("should have positive energy values", () => {
      const energy = generateMockEnergyConsumption();

      expect(energy.total).toBeGreaterThan(0);
      expect(energy.average).toBeGreaterThan(0);
      expect(energy.peak).toBeGreaterThan(0);
      expect(energy.savings).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generateReport", () => {
    it("should handle blob response for CSV format", async () => {
      const mockBlob = new Blob(["test,data"], { type: "text/csv" });
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob),
        }),
      );

      const result = await generateReport({
        reportType: "performance",
        format: "csv",
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe("blob");
    });

    it("should handle JSON response for other formats", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: "test" }),
        }),
      );

      const result = await generateReport({
        reportType: "performance",
        format: "json",
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe("json");
    });

    it("should handle errors gracefully", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        }),
      );

      const result = await generateReport({
        reportType: "performance",
        format: "csv",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("getPerformanceMetrics", () => {
    it("should fetch performance metrics with tenant filter", async () => {
      const { apiGetJson } = await import("../utils/apiFetch");
      const mockData = { efficiency: 85, uptime: 95 };
      apiGetJson.mockResolvedValueOnce({ data: mockData });

      const result = await analyticsService.getPerformanceMetrics({
        tenantId: "tenant-123",
        startTime: "2024-01-01T00:00:00Z",
        endTime: "2024-01-31T23:59:59Z",
        metric: "efficiency",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.timestamp).toBeDefined();
    });

    it("should handle API errors gracefully", async () => {
      const { apiGetJson } = await import("../utils/apiFetch");
      apiGetJson.mockRejectedValueOnce(new Error("Network error"));

      const result = await analyticsService.getPerformanceMetrics({
        tenantId: "tenant-123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  describe("getEquipmentHealth", () => {
    it("should fetch equipment health data", async () => {
      const { apiGetJson } = await import("../utils/apiFetch");
      const mockHealth = { score: 92, status: "healthy" };
      apiGetJson.mockResolvedValueOnce({ data: mockHealth });

      const result = await analyticsService.getEquipmentHealth({
        tenantId: "tenant-123",
        deviceId: "device-001",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockHealth);
    });

    it("should handle missing device ID", async () => {
      const { apiGetJson } = await import("../utils/apiFetch");
      const mockHealth = { overall: { score: 88 } };
      apiGetJson.mockResolvedValueOnce(mockHealth);

      const result = await analyticsService.getEquipmentHealth({
        tenantId: "tenant-123",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockHealth);
    });
  });

  describe("getEnergyConsumption", () => {
    it("should fetch energy consumption with timeframe", async () => {
      const { apiGetJson } = await import("../utils/apiFetch");
      const mockEnergy = { total: 5000, average: 800 };
      apiGetJson.mockResolvedValueOnce({ data: mockEnergy });

      const result = await analyticsService.getEnergyConsumption({
        tenantId: "tenant-123",
        timeframe: "30d",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEnergy);
    });

    it("should use default timeframe when not provided", async () => {
      const { apiGetJson } = await import("../utils/apiFetch");
      apiGetJson.mockResolvedValueOnce({ data: {} });

      const result = await analyticsService.getEnergyConsumption({
        tenantId: "tenant-123",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Default export", () => {
    it("should export all functions", () => {
      expect(analyticsService).toHaveProperty("getPerformanceMetrics");
      expect(analyticsService).toHaveProperty("generateReport");
      expect(analyticsService).toHaveProperty("getEquipmentHealth");
      expect(analyticsService).toHaveProperty("getEnergyConsumption");
      expect(analyticsService).toHaveProperty("generateMockPerformanceMetrics");
      expect(analyticsService).toHaveProperty("generateMockEquipmentHealth");
      expect(analyticsService).toHaveProperty("generateMockEnergyConsumption");
    });
  });
});
