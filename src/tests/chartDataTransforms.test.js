/**
 * Tests for chartDataTransforms utilities
 *
 * Tests data transformation functions for chart visualizations.
 */

import { describe, expect, it, vi } from "vitest";
import {
  aggregateDataByInterval,
  aggregationFunctions,
  calculateMovingAverage,
  fillDataGaps,
  generateTimeSeriesData,
  getTimeframeConfig,
  normalizeData,
  transformScadaData,
} from "../utils/chartDataTransforms";

describe("chartDataTransforms", () => {
  describe("getTimeframeConfig", () => {
    it("should return day config", () => {
      const config = getTimeframeConfig("day");
      expect(config).toEqual({
        points: 24,
        interval: 60 * 60 * 1000, // 1 hour
        label: "Day View (Hourly)",
      });
    });

    it("should return month config", () => {
      const config = getTimeframeConfig("month");
      expect(config).toEqual({
        points: 30,
        interval: 24 * 60 * 60 * 1000, // 1 day
        label: "Month View (Daily)",
      });
    });

    it("should return year config", () => {
      const config = getTimeframeConfig("year");
      expect(config).toEqual({
        points: 12,
        interval: 30 * 24 * 60 * 60 * 1000, // 1 month
        label: "Year View (Monthly)",
      });
    });

    it("should return 3year config", () => {
      const config = getTimeframeConfig("3year");
      expect(config).toEqual({
        points: 36,
        interval: 30 * 24 * 60 * 60 * 1000,
        label: "3 Year View",
      });
    });

    it("should return 5year config", () => {
      const config = getTimeframeConfig("5year");
      expect(config).toEqual({
        points: 60,
        interval: 30 * 24 * 60 * 60 * 1000,
        label: "5 Year View",
      });
    });

    it("should return 10year config", () => {
      const config = getTimeframeConfig("10year");
      expect(config).toEqual({
        points: 120,
        interval: 30 * 24 * 60 * 60 * 1000,
        label: "10 Year View",
      });
    });

    it("should return alltime config", () => {
      const config = getTimeframeConfig("alltime");
      expect(config).toEqual({
        points: 200,
        interval: 60 * 24 * 60 * 60 * 1000, // 2 months
        label: "All Time View",
      });
    });

    it("should return default config for unknown timeframe", () => {
      const config = getTimeframeConfig("unknown");
      expect(config).toEqual({
        points: 24,
        interval: 60 * 60 * 1000,
        label: "Day View",
      });
    });
  });

  describe("generateDefaultDataPoint", () => {
    it("should generate default data with all required fields", () => {
      // This is an internal function, tested via generateTimeSeriesData
      const data = generateTimeSeriesData("day");
      expect(data[0]).toHaveProperty("timestamp");
      expect(data[0]).toHaveProperty("time");
      expect(data[0]).toHaveProperty("power");
      expect(data[0]).toHaveProperty("tempIn");
      expect(data[0]).toHaveProperty("tempOut");
      expect(data[0]).toHaveProperty("pressure");
      expect(data[0]).toHaveProperty("waterLevel");
    });
  });

  describe("generateTimeSeriesData", () => {
    it("should generate correct number of points for day timeframe", () => {
      const data = generateTimeSeriesData("day");
      expect(data).toHaveLength(24);
    });

    it("should generate correct number of points for month timeframe", () => {
      const data = generateTimeSeriesData("month");
      expect(data).toHaveLength(30);
    });

    it("should use custom data generator when provided", () => {
      const customGenerator = vi.fn((timestamp, index) => ({
        timestamp,
        value: index * 10,
        custom: true,
      }));

      const data = generateTimeSeriesData("day", customGenerator);

      expect(customGenerator).toHaveBeenCalledTimes(24);
      expect(data[0].custom).toBe(true);
      expect(data[0].value).toBe(0);
      expect(data[23].value).toBe(230);
    });

    it("should generate data points with increasing timestamps", () => {
      const data = generateTimeSeriesData("day");

      for (let i = 1; i < data.length; i++) {
        expect(data[i].timestamp).toBeGreaterThan(data[i - 1].timestamp);
      }
    });
  });

  describe("transformScadaData", () => {
    it("should transform raw data with specified metrics", () => {
      const rawData = [
        { timestamp: 1000, temperature: 65, pressure: 120 },
        { timestamp: 2000, temperature: 70, pressure: 125 },
      ];

      const transformed = transformScadaData(rawData, [
        "temperature",
        "pressure",
      ]);

      expect(transformed).toHaveLength(2);
      expect(transformed[0]).toHaveProperty("time");
      expect(transformed[0]).toHaveProperty("timestamp", 1000);
      expect(transformed[0]).toHaveProperty("temperature", 65);
      expect(transformed[0]).toHaveProperty("pressure", 120);
    });

    it("should handle empty data", () => {
      const transformed = transformScadaData([], ["value"]);
      expect(transformed).toEqual([]);
    });

    it("should handle null data", () => {
      const transformed = transformScadaData(null, ["value"]);
      expect(transformed).toEqual([]);
    });

    it("should handle missing metrics gracefully", () => {
      const rawData = [{ timestamp: 1000 }, { timestamp: 2000, value: 50 }];

      const transformed = transformScadaData(rawData, ["value"]);

      expect(transformed).toHaveLength(2);
      expect(transformed[0].value).toBeUndefined();
      expect(transformed[1].value).toBe(50);
    });
  });

  describe("aggregateDataByInterval", () => {
    it("should aggregate data by time interval", () => {
      const data = [
        { timestamp: 1000, value: 10 },
        { timestamp: 1500, value: 20 },
        { timestamp: 2000, value: 30 },
        { timestamp: 2500, value: 40 },
      ];

      const aggregationFn = (points) => ({
        value: points.reduce((sum, p) => sum + p.value, 0) / points.length,
      });

      const aggregated = aggregateDataByInterval(data, 1000, aggregationFn);

      expect(aggregated.length).toBeGreaterThan(0);
      aggregated.forEach((point) => {
        expect(point).toHaveProperty("time");
        expect(point).toHaveProperty("timestamp");
        expect(point).toHaveProperty("value");
      });
    });

    it("should handle empty data", () => {
      const aggregated = aggregateDataByInterval([], 1000, () => ({}));
      expect(aggregated).toEqual([]);
    });
  });

  describe("aggregationFunctions", () => {
    const testData = [
      { temp: 10, pressure: 100 },
      { temp: 20, pressure: 110 },
      { temp: 30, pressure: 120 },
    ];

    it("should calculate average correctly", () => {
      const result = aggregationFunctions.average(testData, [
        "temp",
        "pressure",
      ]);
      expect(result.temp).toBe(20);
      expect(result.pressure).toBe(110);
    });

    it("should calculate max correctly", () => {
      const result = aggregationFunctions.max(testData, ["temp", "pressure"]);
      expect(result.temp).toBe(30);
      expect(result.pressure).toBe(120);
    });

    it("should calculate min correctly", () => {
      const result = aggregationFunctions.min(testData, ["temp", "pressure"]);
      expect(result.temp).toBe(10);
      expect(result.pressure).toBe(100);
    });

    it("should calculate sum correctly", () => {
      const result = aggregationFunctions.sum(testData, ["temp", "pressure"]);
      expect(result.temp).toBe(60);
      expect(result.pressure).toBe(330);
    });

    it("should handle empty arrays", () => {
      const result = aggregationFunctions.average([], ["temp"]);
      expect(result.temp).toBe(0);
    });
  });

  describe("normalizeData", () => {
    it("should normalize data to 0-100 range", () => {
      const data = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 50 },
        { timestamp: 3000, value: 100 },
      ];

      const normalized = normalizeData(data, "value", 0, 100);

      expect(normalized[0].value_normalized).toBe(0);
      expect(normalized[1].value_normalized).toBeCloseTo(44.44, 1);
      expect(normalized[2].value_normalized).toBe(100);
    });

    it("should normalize to custom range", () => {
      const data = [{ value: 0 }, { value: 50 }, { value: 100 }];

      const normalized = normalizeData(data, "value", -1, 1);

      expect(normalized[0].value_normalized).toBe(-1);
      expect(normalized[1].value_normalized).toBe(0);
      expect(normalized[2].value_normalized).toBe(1);
    });

    it("should handle empty data", () => {
      const normalized = normalizeData([], "value");
      expect(normalized).toEqual([]);
    });

    it("should handle data with same values", () => {
      const data = [{ value: 50 }, { value: 50 }, { value: 50 }];
      const normalized = normalizeData(data, "value");
      // When range is 0, data should be returned unchanged
      expect(normalized).toEqual(data);
    });
  });

  describe("calculateMovingAverage", () => {
    it("should calculate moving average with window size 3", () => {
      const data = [
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 20 },
        { timestamp: 3000, value: 30 },
        { timestamp: 4000, value: 40 },
        { timestamp: 5000, value: 50 },
      ];

      const result = calculateMovingAverage(data, "value", 3);

      expect(result[0].value_ma).toBe(10); // First point
      expect(result[1].value_ma).toBe(20); // Second point
      expect(result[2].value_ma).toBe(20); // (10+20+30)/3
      expect(result[3].value_ma).toBeCloseTo(30, 1); // (20+30+40)/3
      expect(result[4].value_ma).toBe(40); // (30+40+50)/3
    });

    it("should handle data smaller than window", () => {
      const data = [{ value: 10 }, { value: 20 }];
      const result = calculateMovingAverage(data, "value", 5);
      expect(result).toEqual(data);
    });

    it("should handle empty data", () => {
      const result = calculateMovingAverage([], "value", 3);
      expect(result).toEqual([]);
    });
  });

  describe("fillDataGaps", () => {
    it("should fill gaps larger than maxGapMs", () => {
      const data = [
        { timestamp: 1000, value: 10 },
        { timestamp: 5000, value: 50 }, // 4 second gap
      ];

      const filled = fillDataGaps(data, 2000, null); // 2 second max gap

      expect(filled.length).toBeGreaterThan(2);
      expect(filled[0].timestamp).toBe(1000);
      expect(filled[filled.length - 1].timestamp).toBe(5000);
    });

    it("should use fill value when provided", () => {
      const data = [
        { timestamp: 1000, value: 10 },
        { timestamp: 5000, value: 50 },
      ];

      const filled = fillDataGaps(data, 2000, 0);

      expect(filled.length).toBeGreaterThan(2);
      const insertedPoint = filled[1];
      expect(insertedPoint.value).toBe(0);
    });

    it("should not fill small gaps", () => {
      const data = [
        { timestamp: 1000, value: 10 },
        { timestamp: 1500, value: 20 },
        { timestamp: 2000, value: 30 },
      ];

      const filled = fillDataGaps(data, 1000, null);

      expect(filled.length).toBe(3); // No gaps filled
    });

    it("should handle empty or small data", () => {
      expect(fillDataGaps([], 1000, null)).toEqual([]);
      expect(fillDataGaps([{ timestamp: 1000 }], 1000, null)).toEqual([
        { timestamp: 1000 },
      ]);
    });
  });
});
