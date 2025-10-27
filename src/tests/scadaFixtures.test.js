import { describe, expect, it } from "vitest";
import {
  generateAlarmData,
  generateSCADAMetrics,
  generateSystemHealthData,
  generateTimeSeriesData,
} from "../fixtures/scadaFixtures";

describe("scadaFixtures", () => {
  describe("generateSCADAMetrics", () => {
    it("generates SCADA metrics with default values", () => {
      const metrics = generateSCADAMetrics();
      expect(metrics).toHaveProperty("timestamp");
      expect(metrics).toHaveProperty("temperature");
      expect(metrics).toHaveProperty("pressure");
      expect(metrics).toHaveProperty("flowRate");
    });

    it("applies overrides to metrics", () => {
      const metrics = generateSCADAMetrics({ temperature: 100 });
      expect(metrics.temperature).toBe(100);
    });
  });

  describe("generateTimeSeriesData", () => {
    it("generates time series data with default points", () => {
      const data = generateTimeSeriesData(10);
      expect(data).toHaveLength(10);
      expect(data[0]).toHaveProperty("timestamp");
      expect(data[0]).toHaveProperty("value");
    });

    it("generates increasing trend data", () => {
      const data = generateTimeSeriesData(10, { trend: "increasing" });
      expect(data).toHaveLength(10);
    });

    it("generates decreasing trend data", () => {
      const data = generateTimeSeriesData(10, { trend: "decreasing" });
      expect(data).toHaveLength(10);
    });

    it("generates random trend data", () => {
      const data = generateTimeSeriesData(10, { trend: "random" });
      expect(data).toHaveLength(10);
    });
  });

  describe("generateAlarmData", () => {
    it("generates alarm data", () => {
      const alarms = generateAlarmData(5);
      expect(alarms).toHaveLength(5);
      if (alarms.length > 0) {
        expect(alarms[0]).toHaveProperty("id");
        expect(alarms[0]).toHaveProperty("severity");
        expect(alarms[0]).toHaveProperty("message");
      }
    });
  });

  describe("generateSystemHealthData", () => {
    it("generates system health data", () => {
      const health = generateSystemHealthData();
      expect(health).toHaveProperty("overallHealth");
      expect(health).toHaveProperty("activeAlarms");
      expect(health).toHaveProperty("systemStatus");
    });
  });
});
