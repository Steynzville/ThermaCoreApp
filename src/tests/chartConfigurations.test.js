/**
 * Tests for chartConfigurations utilities
 *
 * Tests chart configuration functions for standardized chart setup.
 */

import { describe, expect, it } from "vitest";
import {
  chartColors,
  chartColorsDark,
  createChartConfig,
  getAreaChartConfig,
  getAxisConfig,
  getBarChartConfig,
  getLegendConfig,
  getLineChartConfig,
  getResponsiveContainerConfig,
  getTimeframeOptions,
  metricConfigurations,
  tickFormatters,
} from "../utils/chartConfigurations";

describe("chartConfigurations", () => {
  describe("chartColors", () => {
    it("should have all color definitions", () => {
      expect(chartColors).toHaveProperty("primary");
      expect(chartColors).toHaveProperty("secondary");
      expect(chartColors).toHaveProperty("warning");
      expect(chartColors).toHaveProperty("danger");
      expect(chartColors).toHaveProperty("info");
      expect(chartColors).toHaveProperty("success");
      expect(chartColors).toHaveProperty("purple");
      expect(chartColors).toHaveProperty("pink");
    });

    it("should have valid hex color values", () => {
      Object.values(chartColors).forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe("chartColorsDark", () => {
    it("should have all dark mode color definitions", () => {
      expect(chartColorsDark).toHaveProperty("primary");
      expect(chartColorsDark).toHaveProperty("secondary");
      expect(chartColorsDark).toHaveProperty("warning");
      expect(chartColorsDark).toHaveProperty("danger");
    });

    it("should have valid hex color values", () => {
      Object.values(chartColorsDark).forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe("getLineChartConfig", () => {
    it("should return default line chart configuration", () => {
      const config = getLineChartConfig();

      expect(config.showGrid).toBe(true);
      expect(config.showTooltip).toBe(true);
      expect(config.strokeWidth).toBe(2);
      expect(config.dot).toBe(false);
      expect(config.smooth).toBe(true);
      expect(config.animationDuration).toBe(300);
    });

    it("should apply custom options", () => {
      const config = getLineChartConfig({
        showGrid: false,
        strokeWidth: 3,
        dot: true,
      });

      expect(config.showGrid).toBe(false);
      expect(config.strokeWidth).toBe(3);
      expect(config.dot).toBe(true);
    });

    it("should include cartesian grid when showGrid is true", () => {
      const config = getLineChartConfig({ showGrid: true });
      expect(config.cartesianGrid).toBeTruthy();
      expect(config.cartesianGrid.strokeDasharray).toBe("3 3");
    });

    it("should exclude cartesian grid when showGrid is false", () => {
      const config = getLineChartConfig({ showGrid: false });
      expect(config.cartesianGrid).toBeNull();
    });

    it("should include tooltip when showTooltip is true", () => {
      const config = getLineChartConfig({ showTooltip: true });
      expect(config.tooltip).toBeTruthy();
      expect(config.tooltip.contentStyle).toBeTruthy();
    });

    it("should exclude tooltip when showTooltip is false", () => {
      const config = getLineChartConfig({ showTooltip: false });
      expect(config.tooltip).toBeNull();
    });

    it("should configure line style based on smooth option", () => {
      const smoothConfig = getLineChartConfig({ smooth: true });
      expect(smoothConfig.line.type).toBe("monotone");

      const linearConfig = getLineChartConfig({ smooth: false });
      expect(linearConfig.line.type).toBe("linear");
    });
  });

  describe("getBarChartConfig", () => {
    it("should return default bar chart configuration", () => {
      const config = getBarChartConfig();

      expect(config.showGrid).toBe(true);
      expect(config.showTooltip).toBe(true);
      expect(config.barSize).toBe(40);
      expect(config.radius).toEqual([8, 8, 0, 0]);
      expect(config.animationDuration).toBe(300);
    });

    it("should apply custom options", () => {
      const config = getBarChartConfig({
        barSize: 50,
        radius: [10, 10, 5, 5],
      });

      expect(config.barSize).toBe(50);
      expect(config.radius).toEqual([10, 10, 5, 5]);
    });

    it("should include grid and tooltip configurations", () => {
      const config = getBarChartConfig();
      expect(config.cartesianGrid).toBeTruthy();
      expect(config.tooltip).toBeTruthy();
    });
  });

  describe("getAreaChartConfig", () => {
    it("should return default area chart configuration", () => {
      const config = getAreaChartConfig();

      expect(config.showGrid).toBe(true);
      expect(config.showTooltip).toBe(true);
      expect(config.fillOpacity).toBe(0.2);
      expect(config.strokeWidth).toBe(2);
      expect(config.smooth).toBe(true);
      expect(config.animationDuration).toBe(300);
    });

    it("should apply custom options", () => {
      const config = getAreaChartConfig({
        fillOpacity: 0.5,
        strokeWidth: 3,
        smooth: false,
      });

      expect(config.fillOpacity).toBe(0.5);
      expect(config.strokeWidth).toBe(3);
      expect(config.smooth).toBe(false);
    });

    it("should configure area style based on smooth option", () => {
      const smoothConfig = getAreaChartConfig({ smooth: true });
      expect(smoothConfig.area.type).toBe("monotone");

      const linearConfig = getAreaChartConfig({ smooth: false });
      expect(linearConfig.area.type).toBe("linear");
    });
  });

  describe("getAxisConfig", () => {
    it("should return X-axis configuration", () => {
      const config = getAxisConfig("x", {
        dataKey: "timestamp",
        label: "Time",
      });

      expect(config.dataKey).toBe("timestamp");
      expect(config.label.value).toBe("Time");
      expect(config.label.position).toBe("insideBottom");
      expect(config.height).toBe(60);
    });

    it("should return Y-axis configuration", () => {
      const config = getAxisConfig("y", {
        dataKey: "value",
        label: "Value",
      });

      expect(config.dataKey).toBe("value");
      expect(config.label.value).toBe("Value");
      expect(config.label.position).toBe("insideLeft");
      expect(config.width).toBe(80);
    });

    it("should handle axis without label", () => {
      const config = getAxisConfig("x", { dataKey: "time" });
      expect(config.label).toBeUndefined();
    });

    it("should include tick formatter when provided", () => {
      const formatter = (val) => `${val}°C`;
      const config = getAxisConfig("y", {
        dataKey: "temp",
        tickFormatter: formatter,
      });

      expect(config.tickFormatter).toBe(formatter);
    });
  });

  describe("getResponsiveContainerConfig", () => {
    it("should return default container configuration", () => {
      const config = getResponsiveContainerConfig();

      expect(config.width).toBe("100%");
      expect(config.height).toBe(300);
      expect(config.minHeight).toBe(200);
    });

    it("should apply custom dimensions", () => {
      const config = getResponsiveContainerConfig({
        width: "80%",
        height: 400,
        minHeight: 250,
      });

      expect(config.width).toBe("80%");
      expect(config.height).toBe(400);
      expect(config.minHeight).toBe(250);
    });
  });

  describe("getLegendConfig", () => {
    it("should return default legend configuration", () => {
      const config = getLegendConfig();

      expect(config.verticalAlign).toBe("top");
      expect(config.height).toBe(36);
      expect(config.iconType).toBe("line");
      expect(config.wrapperStyle.paddingTop).toBe("10px");
    });

    it("should apply custom options", () => {
      const config = getLegendConfig({
        verticalAlign: "bottom",
        height: 50,
        iconType: "circle",
        wrapperStyle: { paddingTop: "20px" },
      });

      expect(config.verticalAlign).toBe("bottom");
      expect(config.height).toBe(50);
      expect(config.iconType).toBe("circle");
      expect(config.wrapperStyle.paddingTop).toBe("20px");
    });
  });

  describe("metricConfigurations", () => {
    it("should have temperature configuration", () => {
      const temp = metricConfigurations.temperature;
      expect(temp.label).toBe("Temperature (°C)");
      expect(temp.unit).toBe("°C");
      expect(temp.color).toBeTruthy();
      expect(temp.domain).toEqual([0, 50]);
    });

    it("should have pressure configuration", () => {
      const pressure = metricConfigurations.pressure;
      expect(pressure.label).toBe("Pressure (PSI)");
      expect(pressure.unit).toBe("PSI");
      expect(pressure.domain).toEqual([0, 100]);
    });

    it("should have power configuration", () => {
      const power = metricConfigurations.power;
      expect(power.label).toBe("Power (kW)");
      expect(power.unit).toBe("kW");
      expect(power.domain).toEqual([0, 10]);
    });

    it("should have all metric types defined", () => {
      expect(metricConfigurations).toHaveProperty("temperature");
      expect(metricConfigurations).toHaveProperty("pressure");
      expect(metricConfigurations).toHaveProperty("power");
      expect(metricConfigurations).toHaveProperty("waterLevel");
      expect(metricConfigurations).toHaveProperty("flowRate");
      expect(metricConfigurations).toHaveProperty("efficiency");
    });
  });

  describe("createChartConfig", () => {
    it("should create line chart config with metrics", () => {
      const config = createChartConfig("line", ["temperature", "pressure"]);

      expect(config.metrics).toHaveLength(2);
      expect(config.metrics[0].key).toBe("temperature");
      expect(config.metrics[1].key).toBe("pressure");
      expect(config.showGrid).toBe(true);
    });

    it("should create bar chart config", () => {
      const config = createChartConfig("bar", ["power"]);

      expect(config.barSize).toBe(40);
      expect(config.metrics).toHaveLength(1);
      expect(config.metrics[0].key).toBe("power");
    });

    it("should create area chart config", () => {
      const config = createChartConfig("area", ["efficiency"]);

      expect(config.fillOpacity).toBe(0.2);
      expect(config.metrics).toHaveLength(1);
    });

    it("should default to line chart for unknown type", () => {
      const config = createChartConfig("unknown", ["temperature"]);

      expect(config.strokeWidth).toBe(2);
      expect(config.smooth).toBe(true);
    });

    it("should handle unknown metrics with defaults", () => {
      const config = createChartConfig("line", ["unknownMetric"]);

      expect(config.metrics[0].key).toBe("unknownMetric");
      expect(config.metrics[0].label).toBe("unknownMetric");
      expect(config.metrics[0].color).toBe(chartColors.primary);
    });
  });

  describe("tickFormatters", () => {
    it("should format numbers with locale", () => {
      expect(tickFormatters.number(1000)).toMatch(/1[,\s]?000/);
    });

    it("should format percentages", () => {
      expect(tickFormatters.percentage(50)).toBe("50%");
    });

    it("should format currency", () => {
      expect(tickFormatters.currency(1000)).toMatch(/\$1[,\s]?000/);
    });

    it("should format temperature", () => {
      expect(tickFormatters.temperature(25)).toBe("25°C");
    });

    it("should format time", () => {
      const timestamp = new Date("2025-10-26T12:30:00Z").getTime();
      const formatted = tickFormatters.time(timestamp);
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });

    it("should format date", () => {
      const timestamp = new Date("2025-10-26T12:30:00Z").getTime();
      const formatted = tickFormatters.date(timestamp);
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it("should format datetime", () => {
      const timestamp = new Date("2025-10-26T12:30:00Z").getTime();
      const formatted = tickFormatters.datetime(timestamp);
      expect(formatted).toBeTruthy();
    });

    it("should format compact numbers", () => {
      expect(tickFormatters.compact(500)).toBe("500");
      expect(tickFormatters.compact(1500)).toBe("1.5K");
      expect(tickFormatters.compact(1500000)).toBe("1.5M");
    });
  });

  describe("getTimeframeOptions", () => {
    it("should return all timeframe options", () => {
      const options = getTimeframeOptions();

      expect(options).toHaveLength(7);
      expect(options[0]).toEqual({ value: "day", label: "Day View (Hourly)" });
      expect(options[1]).toEqual({
        value: "month",
        label: "Month View (Daily)",
      });
      expect(options[2]).toEqual({
        value: "year",
        label: "Year View (Monthly)",
      });
    });

    it("should have correct structure for each option", () => {
      const options = getTimeframeOptions();

      options.forEach((option) => {
        expect(option).toHaveProperty("value");
        expect(option).toHaveProperty("label");
        expect(typeof option.value).toBe("string");
        expect(typeof option.label).toBe("string");
      });
    });
  });
});
