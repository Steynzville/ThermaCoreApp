/**
 * Tests for MultiTimeframeTrendChart Component
 *
 * Coverage includes:
 * - Component rendering with multiple chart types
 * - Timeframe selection and data formatting
 * - Chart type switching (line, area, bar, composed)
 * - Data export functionality
 * - Statistics calculation
 * - Dark mode support
 * - Interactive controls
 * - Multiple metrics rendering
 * - Accessibility
 * - CSV escaping for fields with commas/quotes
 */

import { fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import MultiTimeframeTrendChart from "@/components/visualization/MultiTimeframeTrendChart";

// Mock the cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...inputs) => inputs.filter(Boolean).join(" "),
}));

// Select mock using input instead of select to avoid option-matching issues
vi.mock("@radix-ui/react-select", () => ({
  Root: ({ children, value, defaultValue, onValueChange, ...props }) => (
    <div data-testid="select-root" data-value={value ?? defaultValue} {...props}>
      {children}
      <input
        data-testid="select-native"
        aria-hidden="true"
        value={value ?? defaultValue ?? ""}
        onChange={(e) => onValueChange?.(e.target.value)}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
        readOnly
      />
    </div>
  ),
  Trigger: ({ children, ...props }) => (
    <button data-testid="select-trigger" {...props}>
      {children}
    </button>
  ),
  Icon: ({ children, ...props }) => (
    <span data-testid="select-icon" {...props}>{children || "▼"}</span>
  ),
  Viewport: ({ children, ...props }) => (
    <div data-testid="select-viewport" {...props}>{children}</div>
  ),
  ScrollUpButton: ({ children, ...props }) => (
    <div data-testid="select-scroll-up" {...props}>{children || "▲"}</div>
  ),
  ScrollDownButton: ({ children, ...props }) => (
    <div data-testid="select-scroll-down" {...props}>{children || "▼"}</div>
  ),
  Content: ({ children, ...props }) => (
    <div data-testid="select-content" {...props}>{children}</div>
  ),
  Item: ({ children, value, ...props }) => (
    <option data-testid="select-item" value={value} {...props}>
      {children}
    </option>
  ),
  ItemIndicator: ({ children, ...props }) => (
    <span data-testid="select-item-indicator" {...props}>{children || "✓"}</span>
  ),
  ItemText: ({ children, ...props }) => (
    <span data-testid="select-item-text" {...props}>{children}</span>
  ),
  Value: ({ children, placeholder, ...props }) => (
    <span data-testid="select-value" {...props}>{children || placeholder}</span>
  ),
  Portal: ({ children }) => <>{children}</>,
  Group: ({ children, ...props }) => (
    <div data-testid="select-group" {...props}>{children}</div>
  ),
  Label: ({ children, ...props }) => (
    <div data-testid="select-label" {...props}>{children}</div>
  ),
  Separator: ({ ...props }) => <hr data-testid="select-separator" {...props} />,
}));

// Mock Recharts components - simplified to avoid circular dependencies
const chartSpy = vi.fn();

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: (props) => {
    chartSpy({ type: 'line', ...props });
    return (
      <div data-testid="line-chart">
        {props.children}
      </div>
    );
  },
  AreaChart: (props) => {
    chartSpy({ type: 'area', ...props });
    return (
      <div data-testid="area-chart">
        {props.children}
      </div>
    );
  },
  BarChart: (props) => {
    chartSpy({ type: 'bar', ...props });
    return (
      <div data-testid="bar-chart">
        {props.children}
      </div>
    );
  },
  ComposedChart: (props) => {
    chartSpy({ type: 'composed', ...props });
    return (
      <div data-testid="composed-chart">
        {props.children}
      </div>
    );
  },
  Line: ({ dataKey, stroke }) => (
    <div data-testid={`line-${dataKey}`} data-stroke={stroke} />
  ),
  Area: ({ dataKey, fill }) => (
    <div data-testid={`area-${dataKey}`} data-fill={fill} />
  ),
  Bar: ({ dataKey, fill }) => (
    <div data-testid={`bar-${dataKey}`} data-fill={fill} />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: ({ dataKey, angle, textAnchor, height }) => (
    <div data-testid="x-axis" data-key={dataKey} data-angle={angle} data-textanchor={textAnchor} data-height={height} />
  ),
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: ({ content, contentStyle }) => (
    <div data-testid="tooltip" data-content-style={JSON.stringify(contentStyle)}>
      {content || "Tooltip Content"}
    </div>
  ),
  Legend: ({ content }) => (
    <div data-testid="legend">
      {content || "Legend Content"}
    </div>
  ),
}));

// Tabs mock with proper onValueChange wiring
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, value, onValueChange, ...props }) => (
    <div data-testid="tabs-root" data-value={value} {...props}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { onValueChange, currentValue: value })
          : child,
      )}
    </div>
  ),
  TabsList: ({ children, onValueChange, currentValue, ...props }) => (
    <div data-testid="tabs-list" {...props}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { onValueChange, currentValue })
          : child,
      )}
    </div>
  ),
  TabsTrigger: ({ children, value, onValueChange, currentValue, ...props }) => (
    <button
      data-testid="tabs-trigger"
      data-value={value}
      data-active={currentValue === value}
      onClick={() => onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  ),
  TabsContent: ({ children, value, ...props }) => (
    <div data-testid="tabs-content" data-value={value} {...props}>
      {children}
    </div>
  ),
}));

describe("MultiTimeframeTrendChart", () => {
  const mockMetrics = [
    {
      dataKey: "temperature",
      label: "Temperature",
      color: "#ff0000",
      unit: "°C",
    },
    {
      dataKey: "pressure",
      label: "Pressure",
      color: "#00ff00",
      unit: "PSI",
    },
  ];

  const mockData = [
    { timestamp: Date.now() - 3600000, temperature: 25, pressure: 100 },
    { timestamp: Date.now() - 1800000, temperature: 26, pressure: 101 },
    { timestamp: Date.now(), temperature: 27, pressure: 102 },
  ];

  let mockAnchor;
  let createElementSpy;
  let originalBlob;

  beforeEach(() => {
    vi.clearAllMocks();
    chartSpy.mockClear();
    
    originalBlob = global.Blob;
    
    window.Image = vi.fn().mockImplementation(() => ({
      src: '',
      onload: null,
      onerror: null,
      complete: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    
    mockAnchor = {
      click: vi.fn(),
      download: '',
      href: '',
    };
    
    const originalCreateElement = document.createElement.bind(document);
    
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return mockAnchor;
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    cleanup();
    if (createElementSpy) {
      createElementSpy.mockRestore();
    }
    document.documentElement.classList.remove("dark");
    global.Blob = originalBlob;
  });

  describe("Basic Rendering", () => {
    it("should render with default props", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      const titleElements = screen.getAllByText("Trend Analysis");
      expect(titleElements.length).toBeGreaterThan(0);
      
      const chartElements = screen.getAllByTestId("line-chart");
      expect(chartElements.length).toBeGreaterThan(0);
      
      expect(chartSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'line' }));
    });

    it("should render with custom title", () => {
      render(
        <MultiTimeframeTrendChart
          title="Custom Trend"
          data={mockData}
          metrics={mockMetrics}
        />,
      );

      const titleElements = screen.getAllByText("Custom Trend");
      expect(titleElements.length).toBeGreaterThan(0);
    });

    it("should render all metrics", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      const tempElements = screen.getAllByTestId("line-temperature");
      const pressureElements = screen.getAllByTestId("line-pressure");
      expect(tempElements.length).toBeGreaterThan(0);
      expect(pressureElements.length).toBeGreaterThan(0);
    });

    it("should render chart container", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      const containerElements = screen.getAllByTestId("responsive-container");
      expect(containerElements.length).toBeGreaterThan(0);
    });

    it("should hide controls when showControls is false", () => {
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          showControls={false}
        />,
      );

      const selectTriggers = screen.queryAllByTestId("select-trigger");
      expect(selectTriggers.length).toBe(0);
    });
  });

  describe("Chart Type Selection", () => {
    it("should render line chart by default", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      const charts = screen.getAllByTestId("line-chart");
      expect(charts.length).toBeGreaterThan(0);
      expect(chartSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'line' }));
    });

    it("should render area chart when selected", () => {
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          defaultChartType="area"
        />,
      );

      expect(screen.getAllByTestId("area-chart").length).toBeGreaterThan(0);
      expect(chartSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'area' }));
      expect(screen.getAllByTestId("area-temperature").length).toBeGreaterThan(0);
    });

    it("should render bar chart when selected", () => {
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          defaultChartType="bar"
        />,
      );

      expect(screen.getAllByTestId("bar-chart").length).toBeGreaterThan(0);
      expect(chartSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'bar' }));
      expect(screen.getAllByTestId("bar-temperature").length).toBeGreaterThan(0);
    });

    it("should render composed chart with mixed bar/line metrics", () => {
      const composedMetrics = [
        { dataKey: "temperature", label: "Temperature", type: "line" },
        { dataKey: "pressure", label: "Pressure", type: "bar" },
      ];

      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={composedMetrics}
          defaultChartType="composed"
        />,
      );

      expect(screen.getAllByTestId("composed-chart").length).toBeGreaterThan(0);
      expect(chartSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'composed' }));
      expect(screen.getAllByTestId("line-temperature").length).toBeGreaterThan(0);
      expect(screen.getAllByTestId("bar-pressure").length).toBeGreaterThan(0);
    });

    it("should render line for metrics without type in composed chart", () => {
      const mixedMetrics = [
        { dataKey: "temperature", label: "Temperature" },
        { dataKey: "pressure", label: "Pressure", type: "line" },
      ];
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mixedMetrics}
          defaultChartType="composed"
        />,
      );

      const lineElements = screen.getAllByTestId(/line-/);
      expect(lineElements.length).toBeGreaterThan(0);
    });
  });

  describe("Chart Type Switching Interaction", () => {
    it("should switch chart type when a tab is clicked", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getAllByTestId("line-chart").length).toBeGreaterThan(0);

      const barTrigger = screen
        .getAllByTestId("tabs-trigger")
        .find((el) => el.getAttribute("data-value") === "bar");
      fireEvent.click(barTrigger);

      expect(screen.getAllByTestId("bar-chart").length).toBeGreaterThan(0);
      expect(chartSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'bar' }));
    });
  });

  describe("Timeframe Selection", () => {
    it.each(["1h", "24h", "7d", "30d"])(
      "should format data and render axis correctly for %s timeframe",
      (timeframe) => {
        render(
          <MultiTimeframeTrendChart
            data={mockData}
            metrics={mockMetrics}
            defaultTimeframe={timeframe}
          />,
        );

        expect(screen.getAllByTestId("x-axis")[0]).toBeInTheDocument();

        const timeframeMap = {
          "1h": "last hour",
          "24h": "last 24 hours",
          "7d": "last 7 days",
          "30d": "last 30 days",
        };
        // Case-sensitive: footer renders lowercased label
        expect(
          screen.getByText(new RegExp(timeframeMap[timeframe])),
        ).toBeInTheDocument();
      },
    );

    it("should switch timeframe via select and update data points label", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      const select = screen.getByTestId("select-native");
      fireEvent.change(select, { target: { value: "7d" } });

      // Case-sensitive regex avoids colliding with "Last 7 Days" dropdown option
      expect(screen.getByText(/last 7 days/)).toBeInTheDocument();
    });

    it("should set angle to -45 for 7d timeframe", () => {
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          defaultTimeframe="7d"
        />,
      );

      const xAxis = screen.getByTestId("x-axis");
      expect(xAxis).toHaveAttribute("data-angle", "-45");
      expect(xAxis).toHaveAttribute("data-textanchor", "end");
    });

    it("should set angle to -45 for 30d timeframe", () => {
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          defaultTimeframe="30d"
        />,
      );

      const xAxis = screen.getByTestId("x-axis");
      expect(xAxis).toHaveAttribute("data-angle", "-45");
      expect(xAxis).toHaveAttribute("data-textanchor", "end");
    });

    it("should set angle to 0 for 24h timeframe", () => {
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          defaultTimeframe="24h"
        />,
      );

      const xAxis = screen.getByTestId("x-axis");
      expect(xAxis).toHaveAttribute("data-angle", "0");
      expect(xAxis).toHaveAttribute("data-textanchor", "middle");
    });
  });

  describe("Export Functionality", () => {
    it("should trigger default CSV export when no onExport prop given", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      const exportButton = screen.getByText(/export/i).closest("button");
      fireEvent.click(exportButton);

      expect(createElementSpy).toHaveBeenCalledWith("a");
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.download).toMatch(/^trend-data-24h\.csv$/);
    });

    it("should call custom onExport handler when provided", () => {
      const onExport = vi.fn();
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          onExport={onExport}
        />,
      );

      const exportButton = screen.getByText(/export/i).closest("button");
      fireEvent.click(exportButton);

      expect(onExport).toHaveBeenCalledTimes(1);
      expect(onExport).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ temperature: expect.any(Number) })]),
        expect.any(Object),
      );
      expect(mockAnchor.click).not.toHaveBeenCalled();
    });

    it("should handle empty data in export", () => {
      render(
        <MultiTimeframeTrendChart data={[]} metrics={mockMetrics} />,
      );

      const exportButton = screen.getByText(/export/i).closest("button");
      expect(exportButton).toBeInTheDocument();
      
      expect(() => fireEvent.click(exportButton)).not.toThrow();
    });

    // ✅ NEW: CSV escaping test
    it("should escape CSV fields containing commas", () => {
      const blobSpy = vi.fn();
      const OriginalBlob = global.Blob;
      global.Blob = vi.fn().mockImplementation((parts, opts) => {
        blobSpy(parts[0]);
        return new OriginalBlob(parts, opts);
      });

      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          defaultTimeframe="7d"
        />,
      );

      const exportButton = screen.getByText(/export/i).closest("button");
      fireEvent.click(exportButton);

      const csvContent = blobSpy.mock.calls[0][0];
      // 7d formatting produces "Jan 1, 03 AM"-style strings containing a comma
      expect(csvContent).toMatch(/"[^"]*,[^"]*"/);

      global.Blob = OriginalBlob;
    });
  });

  describe("Statistics Calculation", () => {
    it("should display upward trend styling when values increase", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getByText("27.0")).toBeInTheDocument();
      expect(screen.getAllByText(/↑/).length).toBeGreaterThan(0);
    });

    it("should display downward trend styling when values decrease", () => {
      const decreasingData = [
        { timestamp: Date.now() - 3600000, temperature: 30, pressure: 105 },
        { timestamp: Date.now() - 1800000, temperature: 28, pressure: 103 },
        { timestamp: Date.now(), temperature: 25, pressure: 100 },
      ];

      render(
        <MultiTimeframeTrendChart data={decreasingData} metrics={mockMetrics} />,
      );

      expect(screen.getAllByText(/↓/).length).toBeGreaterThan(0);
    });

    it("should not render a stat block for a metric absent from the data", () => {
      const extraMetrics = [
        ...mockMetrics,
        { dataKey: "humidity", label: "Humidity" },
      ];

      render(
        <MultiTimeframeTrendChart data={mockData} metrics={extraMetrics} />,
      );

      expect(screen.queryByText("Humidity")).not.toBeInTheDocument();
    });

    it("should compute zero trend for a single data point", () => {
      const singlePoint = [{ timestamp: Date.now(), temperature: 25, pressure: 100 }];

      render(
        <MultiTimeframeTrendChart data={singlePoint} metrics={mockMetrics} />,
      );

      expect(screen.getAllByText(/↑ 0\.0%/).length).toBeGreaterThan(0);
    });

    it("should filter out NaN values when computing statistics", () => {
      const dirtyData = [
        { timestamp: Date.now() - 3600000, temperature: "not-a-number", pressure: 100 },
        { timestamp: Date.now(), temperature: 26, pressure: 101 },
      ];

      render(
        <MultiTimeframeTrendChart data={dirtyData} metrics={mockMetrics} />,
      );

      expect(screen.getByText("26.0")).toBeInTheDocument();
    });
  });

  describe("Dark Mode Detection", () => {
    afterEach(() => {
      document.documentElement.classList.remove("dark");
    });

    it("should use light tooltip styling by default", () => {
      render(<MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />);

      const tooltip = screen.getAllByTestId("tooltip")[0];
      const style = JSON.parse(tooltip.getAttribute("data-content-style"));
      expect(style.backgroundColor).toBe("rgba(255, 255, 255, 0.95)");
    });

    it("should apply dark tooltip styling when the dark class is present on mount", () => {
      document.documentElement.classList.add("dark");

      render(<MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />);

      const tooltip = screen.getAllByTestId("tooltip")[0];
      const style = JSON.parse(tooltip.getAttribute("data-content-style"));
      expect(style.backgroundColor).toBe("rgba(31, 41, 55, 0.95)");
    });

    it("should switch tooltip styling when the dark class is toggled after mount", async () => {
      render(<MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />);

      let tooltip = screen.getAllByTestId("tooltip")[0];
      expect(JSON.parse(tooltip.getAttribute("data-content-style")).backgroundColor).toBe(
        "rgba(255, 255, 255, 0.95)",
      );

      document.documentElement.classList.add("dark");

      // MutationObserver callbacks run as microtasks; flush them
      await waitFor(() => {
        tooltip = screen.getAllByTestId("tooltip")[0];
        expect(JSON.parse(tooltip.getAttribute("data-content-style")).backgroundColor).toBe(
          "rgba(31, 41, 55, 0.95)",
        );
      });
    });
  });

  describe("Edge Cases", () => {
    it("should render gracefully with empty data", () => {
      render(<MultiTimeframeTrendChart data={[]} metrics={mockMetrics} />);

      expect(screen.getByText(/0 data points/i)).toBeInTheDocument();
      expect(screen.queryByText("27.0")).not.toBeInTheDocument();
    });

    it("should handle undefined metrics gracefully", () => {
      const { container } = render(
        <MultiTimeframeTrendChart data={mockData} metrics={undefined} />,
      );
      expect(container).toBeTruthy();
    });

    it("should handle empty metrics array", () => {
      const { container } = render(
        <MultiTimeframeTrendChart data={mockData} metrics={[]} />,
      );
      expect(container).toBeTruthy();
    });

    it("should handle undefined data gracefully", () => {
      const { container } = render(
        <MultiTimeframeTrendChart data={undefined} metrics={mockMetrics} />,
      );
      expect(container).toBeTruthy();
    });

    it("should handle default timeframe not in options", () => {
      const { container } = render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          defaultTimeframe="invalid"
        />,
      );
      expect(container).toBeTruthy();
    });

    it("should handle default chart type not in options", () => {
      const { container } = render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          defaultChartType="invalid"
        />,
      );
      expect(container).toBeTruthy();
    });

    it("should handle null values in data", () => {
      const dataWithNull = [
        { timestamp: Date.now() - 3600000, temperature: 25, pressure: null },
        { timestamp: Date.now() - 1800000, temperature: null, pressure: 101 },
        { timestamp: Date.now(), temperature: 27, pressure: 102 },
      ];
      const { container } = render(
        <MultiTimeframeTrendChart data={dataWithNull} metrics={mockMetrics} />,
      );
      expect(container).toBeTruthy();
    });

    it("should handle metrics with missing color", () => {
      const metricsWithoutColor = [
        { dataKey: "temperature", label: "Temperature" },
        { dataKey: "pressure", label: "Pressure" },
      ];
      const { container } = render(
        <MultiTimeframeTrendChart data={mockData} metrics={metricsWithoutColor} />,
      );
      expect(container).toBeTruthy();
    });
  });

  describe("Data Points Info", () => {
    it("should show data points count", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getByText(/3 data points/)).toBeInTheDocument();
    });

    it("should show correct timeframe in data points info", () => {
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          defaultTimeframe="7d"
        />,
      );

      expect(screen.getByText(/last 7 days/)).toBeInTheDocument();
    });
  });
});
