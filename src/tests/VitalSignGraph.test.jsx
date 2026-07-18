// @vitest-environment jsdom
/**
 * Tests for VitalSignGraph Component
 * */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import VitalSignGraph, {
  generateMockData,
  formatXAxisLabel,
  getTickInterval
} from "../components/VitalSignGraph";
import { ThemeProvider } from "../context/ThemeContext";
import { SettingsProvider } from "../context/SettingsContext";

// Mock ResizeObserver which Recharts depends on for responsiveness
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver;

// Mock Recharts components dynamically so we can assert on their props and structures
vi.mock("recharts", () => {
  return {
    ResponsiveContainer: ({ children, height }) => (
      <div data-testid="responsive-container" style={{ height }}>
        {children}
      </div>
    ),
    LineChart: ({ children, data }) => (
      <div data-testid="line-chart" data-points={data ? data.length : 0}>
        {children}
      </div>
    ),
    CartesianGrid: ({ strokeDasharray, stroke, className }) => (
      <div
        data-testid="cartesian-grid"
        data-stroke-dasharray={strokeDasharray}
        data-stroke={stroke}
        className={className}
      />
    ),
    XAxis: ({ dataKey, stroke, className, tickFormatter, interval, tick }) => (
      <div
        data-testid="x-axis"
        data-key={dataKey}
        data-stroke={stroke}
        className={className}
        data-tick-formatter={typeof tickFormatter === 'function' ? 'function' : 'none'}
        data-interval={interval}
        data-tick-font-size={tick?.fontSize}
      />
    ),
    YAxis: ({ stroke, className }) => (
      <div data-testid="y-axis" data-stroke={stroke} className={className} />
    ),
    Tooltip: ({ contentStyle, labelStyle, itemStyle, labelFormatter }) => (
      <div
        data-testid="tooltip"
        data-content-style={JSON.stringify(contentStyle)}
        data-label-style={JSON.stringify(labelStyle)}
        data-item-style={JSON.stringify(itemStyle)}
        data-label-formatter={typeof labelFormatter === 'function' ? 'function' : 'none'}
      />
    ),
    Line: ({ type, dataKey, stroke, activeDot }) => (
      <div
        data-testid="line"
        data-type={type}
        data-key={dataKey}
        data-stroke={stroke}
        data-active-dot={JSON.stringify(activeDot)}
      />
    ),
  };
});

// Mock UI Select component as a standard HTML select to easily trigger selection changes in JSDOM
vi.mock("../components/ui/select", () => {
  return {
    Select: ({ children, value, onValueChange }) => (
      <select
        data-testid="timeframe-select"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {children}
      </select>
    ),
    SelectTrigger: ({ children }) => <>{children}</>,
    SelectValue: () => null,
    SelectContent: ({ children }) => <>{children}</>,
    SelectItem: ({ children, value }) => (
      <option value={value} data-testid={`select-item-${value}`}>
        {children}
      </option>
    ),
  };
});

// Mock UI Card component
vi.mock("../components/ui/card", () => ({
  Card: ({ children, className }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

// Default mock props
const defaultProps = {
  title: "Power Consumption",
  dataKey: "power",
  color: "#ff0000",
};

// Wrapper with required contexts for the tests
const TestWrapper = ({ children }) => {
  return (
    <ThemeProvider>
      <SettingsProvider>{children}</SettingsProvider>
    </ThemeProvider>
  );
};

describe("VitalSignGraph", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Component Rendering", () => {
    it("should render with default props", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      expect(screen.getByText("Power Consumption")).toBeTruthy();
      expect(screen.getByTestId("line-chart")).toBeTruthy();
    });

    it("should render with custom title", () => {
      render(<VitalSignGraph {...defaultProps} title="Custom Title" />, { wrapper: TestWrapper });
      expect(screen.getByText("Custom Title")).toBeTruthy();
    });

    it("should render with custom dataKey", () => {
      render(<VitalSignGraph {...defaultProps} dataKey="tempIn" />, { wrapper: TestWrapper });
      const line = screen.getByTestId("line");
      expect(line.getAttribute("data-key")).toBe("tempIn");
    });

    it("should render with custom color", () => {
      render(<VitalSignGraph {...defaultProps} color="#00ff00" />, { wrapper: TestWrapper });
      const line = screen.getByTestId("line");
      expect(line.getAttribute("data-stroke")).toBe("#00ff00");
    });

    it("should render all chart components", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      expect(screen.getByTestId("responsive-container")).toBeTruthy();
      expect(screen.getByTestId("line-chart")).toBeTruthy();
      expect(screen.getByTestId("cartesian-grid")).toBeTruthy();
      expect(screen.getByTestId("x-axis")).toBeTruthy();
      expect(screen.getByTestId("y-axis")).toBeTruthy();
      expect(screen.getByTestId("tooltip")).toBeTruthy();
      expect(screen.getByTestId("line")).toBeTruthy();
    });
  });

  describe("Timeframe Selection", () => {
    it("should render timeframe selector with all options", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const select = screen.getByTestId("timeframe-select");
      expect(select).toBeTruthy();

      // Check all select items are rendered
      expect(screen.getByTestId("select-item-day")).toBeTruthy();
      expect(screen.getByTestId("select-item-month")).toBeTruthy();
      expect(screen.getByTestId("select-item-year")).toBeTruthy();
      expect(screen.getByTestId("select-item-3year")).toBeTruthy();
      expect(screen.getByTestId("select-item-5year")).toBeTruthy();
      expect(screen.getByTestId("select-item-10year")).toBeTruthy();
      expect(screen.getByTestId("select-item-alltime")).toBeTruthy();
    });

    it("should generate correct number of data points for default day view", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const chart = screen.getByTestId("line-chart");
      expect(chart.getAttribute("data-points")).toBe("24");
    });

    it("should accept timeframe configuration", async () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const select = screen.getByTestId("timeframe-select");

      await act(async () => {
        fireEvent.change(select, { target: { value: "month" } });
      });

      const chart = screen.getByTestId("line-chart");
      expect(chart.getAttribute("data-points")).toBe("30");
    });

    it.each([
      ["year", "12"],
      ["3year", "36"],
      ["5year", "60"],
      ["10year", "120"],
      ["alltime", "200"],
    ])("should show %s data points for %s timeframe", async (timeframe, expected) => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const select = screen.getByTestId("timeframe-select");

      await act(async () => {
        fireEvent.change(select, { target: { value: timeframe } });
      });

      const chart = screen.getByTestId("line-chart");
      expect(chart.getAttribute("data-points")).toBe(expected);
    });
  });

  describe("Chart Elements", () => {
    it("should render CartesianGrid with correct styling", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const grid = screen.getByTestId("cartesian-grid");
      expect(grid.getAttribute("data-stroke-dasharray")).toBe("3 3");
      expect(grid.getAttribute("data-stroke")).toBe("#e0e0e0");
    });

    it("should render XAxis with time dataKey", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const xAxis = screen.getByTestId("x-axis");
      expect(xAxis.getAttribute("data-key")).toBe("time");
    });

    it("should render XAxis with tick formatter and interval", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const xAxis = screen.getByTestId("x-axis");
      expect(xAxis.getAttribute("data-tick-formatter")).toBe("function");
      expect(xAxis.getAttribute("data-interval")).toBe("2");
      expect(xAxis.getAttribute("data-tick-font-size")).toBe("12");
    });

    it("should render Line with monotone type", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const line = screen.getByTestId("line");
      expect(line.getAttribute("data-type")).toBe("monotone");
    });

    it("should render Tooltip with custom styles", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const tooltip = screen.getByTestId("tooltip");
      const contentStyle = JSON.parse(tooltip.getAttribute("data-content-style"));
      expect(contentStyle.backgroundColor).toBe("var(--card-background)");
      expect(contentStyle.borderColor).toBe("var(--border-color)");
    });

    it("should render Tooltip with label formatter", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const tooltip = screen.getByTestId("tooltip");
      expect(tooltip.getAttribute("data-label-formatter")).toBe("function");
    });
  });

  describe("Dark Mode Support", () => {
    it("should render with dark mode classes", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const card = screen.getByTestId("card");
      expect(card.className).toContain("dark:bg-gray-900");
    });

    it("should apply dark mode to title", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const title = screen.getByText("Power Consumption");
      expect(title.className).toContain("dark:text-gray-100");
    });
  });

  describe("Data Generation", () => {
    it("should generate data with all required fields", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const chart = screen.getByTestId("line-chart");
      expect(chart.getAttribute("data-points")).toBe("24");
    });

    it("should handle different data keys", () => {
      render(<VitalSignGraph {...defaultProps} dataKey="tempOut" />, { wrapper: TestWrapper });
      const line = screen.getByTestId("line");
      expect(line.getAttribute("data-key")).toBe("tempOut");
    });
  });

  describe("Responsive Behavior", () => {
    it("should wrap chart in ResponsiveContainer", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const container = screen.getByTestId("responsive-container");
      expect(container).toBeTruthy();
      expect(container.querySelector('[data-testid="line-chart"]')).toBeTruthy();
    });

    it("should set chart container height", () => {
      const { container } = render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const chartDiv = container.querySelector('div[style*="height: 300px"]');
      expect(chartDiv).toBeTruthy();
    });
  });

  describe("Performance", () => {
    it("should render without errors", () => {
      const { container } = render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      expect(container).toBeTruthy();
    });

    it("should rerender efficiently when props change", () => {
      const { rerender } = render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      expect(screen.getByText("Power Consumption")).toBeTruthy();

      rerender(<VitalSignGraph {...defaultProps} title="Updated Consumption" />);
      expect(screen.getByText("Updated Consumption")).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible card structure", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const headerElement = screen.getByRole("heading", { level: 3 });
      expect(headerElement).toBeTruthy();
      expect(headerElement.textContent).toBe("Power Consumption");
    });

    it("should have accessible select control", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const select = screen.getByTestId("timeframe-select");
      expect(select).toBeTruthy();
    });

    it("should have descriptive title for screen readers", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const title = screen.getByText("Power Consumption");
      expect(title).toBeTruthy();
    });
  });

  describe("Props Validation", () => {
    it("should handle missing title prop", () => {
      const propsWithoutTitle = { ...defaultProps, title: undefined };
      render(<VitalSignGraph {...propsWithoutTitle} />, { wrapper: TestWrapper });
      const line = screen.getByTestId("line");
      expect(line).toBeTruthy();
    });

    it("should handle missing dataKey prop", () => {
      const propsWithoutDataKey = { ...defaultProps, dataKey: undefined };
      render(<VitalSignGraph {...propsWithoutDataKey} />, { wrapper: TestWrapper });
      const line = screen.getByTestId("line");
      expect(line).toBeTruthy();
      expect(line.getAttribute("data-key")).toBeNull();
    });

    it("should handle missing color prop", () => {
      const propsWithoutColor = { ...defaultProps, color: undefined };
      render(<VitalSignGraph {...propsWithoutColor} />, { wrapper: TestWrapper });
      const line = screen.getByTestId("line");
      expect(line).toBeTruthy();
      expect(line.getAttribute("data-stroke")).toBeNull();
    });

    it("should handle all props together", () => {
      render(<VitalSignGraph title="Complete" dataKey="pressure" color="#0000ff" />, { wrapper: TestWrapper });
      expect(screen.getByText("Complete")).toBeTruthy();
      const line = screen.getByTestId("line");
      expect(line.getAttribute("data-key")).toBe("pressure");
      expect(line.getAttribute("data-stroke")).toBe("#0000ff");
    });
  });

  describe("Edge Cases", () => {
    it("should handle component unmount gracefully", () => {
      const { unmount } = render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      expect(() => unmount()).not.toThrow();
    });

    it("should handle multiple rerenders", () => {
      const { rerender } = render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      rerender(<VitalSignGraph {...defaultProps} color="#111" />);
      rerender(<VitalSignGraph {...defaultProps} color="#222" />);
      rerender(<VitalSignGraph {...defaultProps} color="#333" />);
      const line = screen.getByTestId("line");
      expect(line.getAttribute("data-stroke")).toBe("#333");
    });
  });
});

// ============================================================
// generateMockData Unit Tests - Covers ALL switch branches
// ============================================================

describe("generateMockData", () => {
  it("should generate 24 points for day", () => {
    const data = generateMockData("day");
    expect(data).toHaveLength(24);
  });

  it("should generate 30 points for month", () => {
    const data = generateMockData("month");
    expect(data).toHaveLength(30);
  });

  it("should generate 12 points for year", () => {
    const data = generateMockData("year");
    expect(data).toHaveLength(12);
  });

  it("should generate 36 points for 3year", () => {
    const data = generateMockData("3year");
    expect(data).toHaveLength(36);
  });

  it("should generate 60 points for 5year", () => {
    const data = generateMockData("5year");
    expect(data).toHaveLength(60);
  });

  it("should generate 120 points for 10year", () => {
    const data = generateMockData("10year");
    expect(data).toHaveLength(120);
  });

  it("should generate 200 points for alltime", () => {
    const data = generateMockData("alltime");
    expect(data).toHaveLength(200);
  });

  it("should fall back to day view (24 points) for an unrecognized timeframe", () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const data = generateMockData("bogus");
    expect(data).toHaveLength(24);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown timeframe "bogus"')
    );

    consoleWarnSpy.mockRestore();
  });

  it("should generate points with all expected fields", () => {
    const data = generateMockData("day");
    data.forEach((point) => {
      expect(point).toHaveProperty("time");
      expect(point).toHaveProperty("power");
      expect(point).toHaveProperty("tempIn");
      expect(point).toHaveProperty("tempOut");
      expect(point).toHaveProperty("pressure");
      expect(point).toHaveProperty("waterLevel");
    });
  });

  it("should generate data with values in expected ranges", () => {
    const data = generateMockData("day");
    data.forEach((point) => {
      expect(point.power).toBeGreaterThanOrEqual(1);
      expect(point.power).toBeLessThanOrEqual(6);
      expect(point.tempIn).toBeGreaterThanOrEqual(15);
      expect(point.tempIn).toBeLessThanOrEqual(35);
      expect(point.tempOut).toBeGreaterThanOrEqual(20);
      expect(point.tempOut).toBeLessThanOrEqual(40);
      expect(point.pressure).toBeGreaterThanOrEqual(10);
      expect(point.pressure).toBeLessThanOrEqual(15);
      expect(point.waterLevel).toBeGreaterThanOrEqual(50);
      expect(point.waterLevel).toBeLessThanOrEqual(100);
    });
  });

  it("should generate timestamps as numbers (not formatted strings)", () => {
    const data = generateMockData("day");
    data.forEach((point) => {
      expect(typeof point.time).toBe("number");
      expect(point.time).toBeGreaterThan(0);
    });
  });

  it("should generate timestamps in chronological order", () => {
    const data = generateMockData("day");
    for (let i = 1; i < data.length; i++) {
      expect(data[i].time).toBeGreaterThan(data[i - 1].time);
    }
  });

  it("should generate different data on subsequent calls", () => {
    const data1 = generateMockData("day");
    const data2 = generateMockData("day");

    // Check if any value differs across the entire array. Comparing the
    // whole array (rather than a single field on point 0) keeps this
    // deterministic in practice -- the odds of every field on every point
    // colliding between two independent runs are effectively zero, unlike
    // checking a single value pair.
    const allSame = data1.every((point, index) => {
      return point.power === data2[index].power &&
             point.tempIn === data2[index].tempIn &&
             point.tempOut === data2[index].tempOut &&
             point.pressure === data2[index].pressure &&
             point.waterLevel === data2[index].waterLevel;
    });

    expect(allSame).toBe(false);
  });
});

// ============================================================
// formatXAxisLabel Tests
// ============================================================

describe("formatXAxisLabel", () => {
  const baseTimestamp = new Date("2026-07-19T15:30:00.000Z").getTime();

  it("should format as time for day timeframe", () => {
    const result = formatXAxisLabel(baseTimestamp, "day");
    // Should contain hour and minute
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("should format as month/day for month timeframe", () => {
    const result = formatXAxisLabel(baseTimestamp, "month");
    // Should contain month abbreviation and day
    expect(result).toMatch(/[A-Za-z]{3}\s+\d{1,2}/);
  });

  it("should format as month/year for year timeframe", () => {
    const result = formatXAxisLabel(baseTimestamp, "year");
    // Should contain month abbreviation and year
    expect(result).toMatch(/[A-Za-z]{3}\s+\d{4}/);
  });

  it("should format as month/year for 3year timeframe", () => {
    const result = formatXAxisLabel(baseTimestamp, "3year");
    expect(result).toMatch(/[A-Za-z]{3}\s+\d{4}/);
  });

  it("should format as month/year for 5year timeframe", () => {
    const result = formatXAxisLabel(baseTimestamp, "5year");
    expect(result).toMatch(/[A-Za-z]{3}\s+\d{4}/);
  });

  it("should format as month/year for 10year timeframe", () => {
    const result = formatXAxisLabel(baseTimestamp, "10year");
    expect(result).toMatch(/[A-Za-z]{3}\s+\d{4}/);
  });

  it("should format as month/year for alltime timeframe", () => {
    const result = formatXAxisLabel(baseTimestamp, "alltime");
    expect(result).toMatch(/[A-Za-z]{3}\s+\d{4}/);
  });

  it("should return full locale string for unknown timeframe", () => {
    const result = formatXAxisLabel(baseTimestamp, "bogus");
    // Should contain some date info
    expect(result).toContain("2026");
  });

  it("should handle a non-date string gracefully", () => {
    const result = formatXAxisLabel("not a timestamp", "day");
    expect(result).toBe("");
  });

  it("should handle null timestamp gracefully", () => {
    // FIXED: new Date(null) coerces to epoch 0, a *valid* date, so this only
    // returns "" because of the explicit null/undefined guard in
    // formatXAxisLabel -- not because of the isNaN(getTime()) check.
    const result = formatXAxisLabel(null, "day");
    expect(result).toBe("");
  });

  it("should handle undefined timestamp gracefully", () => {
    const result = formatXAxisLabel(undefined, "day");
    expect(result).toBe("");
  });
});

// ============================================================
// getTickInterval Tests
// ============================================================

describe("getTickInterval", () => {
  it("should return 2 for day timeframe", () => {
    expect(getTickInterval("day")).toBe(2);
  });

  it("should return 3 for month timeframe", () => {
    expect(getTickInterval("month")).toBe(3);
  });

  it("should return 1 for year timeframe", () => {
    expect(getTickInterval("year")).toBe(1);
  });

  it("should return 2 for 3year timeframe", () => {
    expect(getTickInterval("3year")).toBe(2);
  });

  it("should return 3 for 5year timeframe", () => {
    expect(getTickInterval("5year")).toBe(3);
  });

  it("should return 6 for 10year timeframe", () => {
    expect(getTickInterval("10year")).toBe(6);
  });

  it("should return 10 for alltime timeframe", () => {
    expect(getTickInterval("alltime")).toBe(10);
  });

  it("should return 2 for unknown timeframe", () => {
    expect(getTickInterval("bogus")).toBe(2);
  });
});
