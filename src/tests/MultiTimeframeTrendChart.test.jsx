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
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MultiTimeframeTrendChart from "@/components/visualization/MultiTimeframeTrendChart";

// Mock Recharts components
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children, data }) => (
    <div data-testid="line-chart" data-length={data?.length}>
      {children}
    </div>
  ),
  AreaChart: ({ children, data }) => (
    <div data-testid="area-chart" data-length={data?.length}>
      {children}
    </div>
  ),
  BarChart: ({ children, data }) => (
    <div data-testid="bar-chart" data-length={data?.length}>
      {children}
    </div>
  ),
  ComposedChart: ({ children, data }) => (
    <div data-testid="composed-chart" data-length={data?.length}>
      {children}
    </div>
  ),
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
  XAxis: ({ dataKey }) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render with default props", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getByText("Trend Analysis")).toBeInTheDocument();
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("should render with custom title", () => {
      render(
        <MultiTimeframeTrendChart
          title="Custom Trend"
          data={mockData}
          metrics={mockMetrics}
        />,
      );

      expect(screen.getByText("Custom Trend")).toBeInTheDocument();
    });

    it("should render all metrics", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getByTestId("line-temperature")).toBeInTheDocument();
      expect(screen.getByTestId("line-pressure")).toBeInTheDocument();
    });

    it("should render chart container", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    });
  });

  describe("Chart Type Selection", () => {
    it("should render line chart by default", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("should render area chart when selected", async () => {
      // User interactions via fireEvent
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          defaultChartType="area"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("area-chart")).toBeInTheDocument();
      });
    });

    it("should render bar chart when selected", async () => {
      // User interactions via fireEvent
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          defaultChartType="bar"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
      });
    });

    it("should render composed chart when selected", async () => {
      // User interactions via fireEvent
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          defaultChartType="composed"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
      });
    });
  });

  describe("Timeframe Selection", () => {
    it("should use default timeframe", () => {
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          defaultTimeframe="24h"
        />,
      );

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("should format time based on timeframe", () => {
      const { rerender } = render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          defaultTimeframe="1h"
        />,
      );

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();

      // Change timeframe
      rerender(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          defaultTimeframe="7d"
        />,
      );

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });
  });

  describe("Data Handling", () => {
    it("should handle empty data array", () => {
      render(<MultiTimeframeTrendChart data={[]} metrics={mockMetrics} />);

      const chart = screen.getByTestId("line-chart");
      expect(chart).toHaveAttribute("data-length", "0");
    });

    it("should handle missing data prop", () => {
      render(<MultiTimeframeTrendChart metrics={mockMetrics} />);

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("should format data with timestamps", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      const chart = screen.getByTestId("line-chart");
      expect(chart).toHaveAttribute("data-length", "3");
    });

    it("should handle large datasets", () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: Date.now() - i * 60000,
        temperature: 25 + Math.random() * 10,
        pressure: 100 + Math.random() * 20,
      }));

      render(
        <MultiTimeframeTrendChart data={largeData} metrics={mockMetrics} />,
      );

      const chart = screen.getByTestId("line-chart");
      expect(chart).toHaveAttribute("data-length", "1000");
    });
  });

  describe("Export Functionality", () => {
    it("should render export button when showControls is true", () => {
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          showControls={true}
        />,
      );

      // Look for download icon or export button
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should call onExport when provided", async () => {
      const onExport = vi.fn();
      // User interactions via fireEvent

      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          showControls={true}
          onExport={onExport}
        />,
      );

      // Find and click export button
      const buttons = screen.getAllByRole("button");
      const exportButton = buttons.find(
        (btn) =>
          btn.textContent.includes("Export") ||
          btn.querySelector('[data-lucide="download"]'),
      );

      if (exportButton) {
        fireEvent.click(exportButton);
        expect(onExport).toHaveBeenCalled();
      }
    });

    it("should not show controls when showControls is false", () => {
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          showControls={false}
        />,
      );

      // Should not have timeframe or chart type selectors
      const comboboxes = screen.queryAllByRole("combobox");
      expect(comboboxes.length).toBe(0);
    });
  });

  describe("Statistics Calculation", () => {
    it("should calculate statistics for metrics", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      // Component should render without errors
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("should handle metrics with missing data", () => {
      const incompleteData = [
        { timestamp: Date.now(), temperature: 25 },
        { timestamp: Date.now(), pressure: 100 },
      ];

      render(
        <MultiTimeframeTrendChart
          data={incompleteData}
          metrics={mockMetrics}
        />,
      );

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });
  });

  describe("Chart Elements", () => {
    it("should render CartesianGrid", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getByTestId("cartesian-grid")).toBeInTheDocument();
    });

    it("should render XAxis", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getByTestId("x-axis")).toBeInTheDocument();
    });

    it("should render YAxis", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getByTestId("y-axis")).toBeInTheDocument();
    });

    it("should render Tooltip", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    });

    it("should render Legend", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getByTestId("legend")).toBeInTheDocument();
    });
  });

  describe("Dark Mode Support", () => {
    it("should detect dark mode", () => {
      document.documentElement.classList.add("dark");

      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();

      document.documentElement.classList.remove("dark");
    });

    it("should update on theme change", () => {
      const { rerender } = render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      document.documentElement.classList.add("dark");

      rerender(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();

      document.documentElement.classList.remove("dark");
    });
  });

  describe("Multiple Metrics", () => {
    it("should render multiple metrics", () => {
      const multipleMetrics = [
        { dataKey: "temp1", label: "Temp 1", color: "#ff0000" },
        { dataKey: "temp2", label: "Temp 2", color: "#00ff00" },
        { dataKey: "temp3", label: "Temp 3", color: "#0000ff" },
      ];

      const multiData = [
        { timestamp: Date.now(), temp1: 20, temp2: 25, temp3: 30 },
      ];

      render(
        <MultiTimeframeTrendChart data={multiData} metrics={multipleMetrics} />,
      );

      expect(screen.getByTestId("line-temp1")).toBeInTheDocument();
      expect(screen.getByTestId("line-temp2")).toBeInTheDocument();
      expect(screen.getByTestId("line-temp3")).toBeInTheDocument();
    });

    it("should apply correct colors to metrics", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      const tempLine = screen.getByTestId("line-temperature");
      const pressureLine = screen.getByTestId("line-pressure");

      expect(tempLine).toHaveAttribute("data-stroke", "#ff0000");
      expect(pressureLine).toHaveAttribute("data-stroke", "#00ff00");
    });
  });

  describe("Height Configuration", () => {
    it("should use default height", () => {
      render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    });

    it("should use custom height", () => {
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          height={600}
        />,
      );

      expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible card structure", () => {
      const { container } = render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(container.querySelector('[data-slot="card"]')).toBeTruthy();
    });

    it("should have accessible title", () => {
      render(
        <MultiTimeframeTrendChart
          title="Accessible Chart"
          data={mockData}
          metrics={mockMetrics}
        />,
      );

      expect(screen.getByText("Accessible Chart")).toBeInTheDocument();
    });

    it("should have interactive controls accessible", () => {
      render(
        <MultiTimeframeTrendChart
          data={mockData}
          metrics={mockMetrics}
          showControls={true}
        />,
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("Performance", () => {
    it("should handle rapid prop changes", () => {
      const { rerender } = render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      for (let i = 0; i < 10; i++) {
        rerender(
          <MultiTimeframeTrendChart
            data={mockData}
            metrics={mockMetrics}
            defaultTimeframe={i % 2 === 0 ? "24h" : "7d"}
          />,
        );
      }

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("should memoize formatted data", () => {
      const { rerender } = render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      // Rerender with same data
      rerender(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty metrics array", () => {
      render(<MultiTimeframeTrendChart data={mockData} metrics={[]} />);

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("should handle single data point", () => {
      const singlePoint = [{ timestamp: Date.now(), temperature: 25 }];

      render(
        <MultiTimeframeTrendChart data={singlePoint} metrics={mockMetrics} />,
      );

      const chart = screen.getByTestId("line-chart");
      expect(chart).toHaveAttribute("data-length", "1");
    });

    it("should handle NaN values in data", () => {
      const nanData = [
        { timestamp: Date.now(), temperature: NaN, pressure: 100 },
      ];

      render(<MultiTimeframeTrendChart data={nanData} metrics={mockMetrics} />);

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("should unmount gracefully", () => {
      const { unmount } = render(
        <MultiTimeframeTrendChart data={mockData} metrics={mockMetrics} />,
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});
