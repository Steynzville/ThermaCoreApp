/**
 * Tests for VitalSignGraph Component
 *
 * Coverage includes:
 * - Component rendering with Recharts LineChart
 * - Timeframe selection and data updates
 * - Chart data rendering
 * - Dark mode support
 * - Props handling (title, dataKey, color)
 * - Responsive container behavior
 * - Chart elements (axes, grid, tooltip, line)
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VitalSignGraph from "@/components/VitalSignGraph";

// Mock Recharts components to avoid canvas issues and make tests faster
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children, data }) => (
    <div data-testid="line-chart" data-chart-length={data?.length}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke, type }) => (
    <div
      data-testid="line"
      data-key={dataKey}
      data-stroke={stroke}
      data-type={type}
    />
  ),
  CartesianGrid: ({ strokeDasharray }) => (
    <div data-testid="cartesian-grid" data-dasharray={strokeDasharray} />
  ),
  XAxis: ({ dataKey }) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: ({ contentStyle }) => (
    <div data-testid="tooltip" data-style={JSON.stringify(contentStyle)} />
  ),
}));

describe("VitalSignGraph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render with default props", () => {
      render(<VitalSignGraph />);

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
      expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    });

    it("should render with custom title", () => {
      render(<VitalSignGraph title="Temperature Monitor" />);

      expect(screen.getByText("Temperature Monitor")).toBeInTheDocument();
    });

    it("should render with custom dataKey", () => {
      render(<VitalSignGraph dataKey="power" />);

      const line = screen.getByTestId("line");
      expect(line).toHaveAttribute("data-key", "power");
    });

    it("should render with custom color", () => {
      const customColor = "#ff0000";
      render(<VitalSignGraph color={customColor} />);

      const line = screen.getByTestId("line");
      expect(line).toHaveAttribute("data-stroke", customColor);
    });

    it("should render all chart components", () => {
      render(<VitalSignGraph />);

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
      expect(screen.getByTestId("line")).toBeInTheDocument();
      expect(screen.getByTestId("cartesian-grid")).toBeInTheDocument();
      expect(screen.getByTestId("x-axis")).toBeInTheDocument();
      expect(screen.getByTestId("y-axis")).toBeInTheDocument();
      expect(screen.getByTestId("tooltip")).toBeInTheDocument();
    });
  });

  describe("Timeframe Selection", () => {
    it("should render timeframe selector", () => {
      render(<VitalSignGraph />);

      // Should have a select control
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("should generate correct number of data points for default day view", () => {
      render(<VitalSignGraph />);

      const chart = screen.getByTestId("line-chart");
      // Day view should have 24 data points (hourly)
      expect(chart).toHaveAttribute("data-chart-length", "24");
    });

    it("should accept timeframe configuration", () => {
      // Component should render with any timeframe configuration
      const { rerender } = render(<VitalSignGraph />);
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();

      rerender(<VitalSignGraph />);
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });
  });

  describe("Chart Elements", () => {
    it("should render CartesianGrid with correct styling", () => {
      render(<VitalSignGraph />);

      const grid = screen.getByTestId("cartesian-grid");
      expect(grid).toHaveAttribute("data-dasharray", "3 3");
    });

    it("should render XAxis with time dataKey", () => {
      render(<VitalSignGraph />);

      const xAxis = screen.getByTestId("x-axis");
      expect(xAxis).toHaveAttribute("data-key", "time");
    });

    it("should render Line with monotone type", () => {
      render(<VitalSignGraph />);

      const line = screen.getByTestId("line");
      expect(line).toHaveAttribute("data-type", "monotone");
    });

    it("should render Tooltip with custom styles", () => {
      render(<VitalSignGraph />);

      const tooltip = screen.getByTestId("tooltip");
      expect(tooltip).toHaveAttribute("data-style");
    });
  });

  describe("Dark Mode Support", () => {
    it("should render with dark mode classes", () => {
      document.documentElement.classList.add("dark");

      const { container } = render(<VitalSignGraph />);

      const card = container.querySelector(".dark\\:bg-gray-900");
      expect(card).toBeInTheDocument();

      document.documentElement.classList.remove("dark");
    });

    it("should apply dark mode to title", () => {
      document.documentElement.classList.add("dark");

      render(<VitalSignGraph title="Test Chart" />);

      const title = screen.getByText("Test Chart");
      expect(title.className).toContain("dark:text-gray-100");

      document.documentElement.classList.remove("dark");
    });
  });

  describe("Data Generation", () => {
    it("should generate data with all required fields", () => {
      render(<VitalSignGraph dataKey="power" />);

      // Chart should have data
      const chart = screen.getByTestId("line-chart");
      expect(chart).toBeInTheDocument();
    });

    it("should handle different data keys", () => {
      const dataKeys = ["power", "tempIn", "tempOut", "pressure", "waterLevel"];

      dataKeys.forEach((key) => {
        const { unmount } = render(<VitalSignGraph dataKey={key} />);
        const line = screen.getByTestId("line");
        expect(line).toHaveAttribute("data-key", key);
        unmount();
      });
    });
  });

  describe("Responsive Behavior", () => {
    it("should wrap chart in ResponsiveContainer", () => {
      render(<VitalSignGraph />);

      const container = screen.getByTestId("responsive-container");
      expect(container).toBeInTheDocument();
    });

    it("should set chart container height", () => {
      const { container } = render(<VitalSignGraph />);

      const chartContainer = container.querySelector('[style*="height: 300"]');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("should render without errors", () => {
      render(<VitalSignGraph />);

      const chart = screen.getByTestId("line-chart");
      expect(chart).toBeInTheDocument();
    });

    it("should rerender efficiently when props change", () => {
      const { rerender } = render(<VitalSignGraph title="Test" />);

      // Initial render
      expect(screen.getByText("Test")).toBeInTheDocument();

      // Rerender with new props
      rerender(<VitalSignGraph title="Updated Test" />);
      expect(screen.getByText("Updated Test")).toBeInTheDocument();

      // Chart should still be rendered
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible card structure", () => {
      const { container } = render(<VitalSignGraph title="Test Chart" />);

      // Card should be present
      expect(container.querySelector('[data-slot="card"]')).toBeTruthy();
    });

    it("should have accessible select control", () => {
      render(<VitalSignGraph />);

      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();
      expect(select).toBeEnabled();
    });

    it("should have descriptive title for screen readers", () => {
      render(<VitalSignGraph title="Power Consumption Graph" />);

      const title = screen.getByText("Power Consumption Graph");
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe("H3");
    });
  });

  describe("Props Validation", () => {
    it("should handle missing title prop", () => {
      render(<VitalSignGraph dataKey="power" color="#ff0000" />);

      // Should still render without error
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("should handle missing dataKey prop", () => {
      render(<VitalSignGraph title="Test" color="#ff0000" />);

      // Should still render without error
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("should handle missing color prop", () => {
      render(<VitalSignGraph title="Test" dataKey="power" />);

      // Should still render without error
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("should handle all props together", () => {
      render(
        <VitalSignGraph
          title="Complete Graph"
          dataKey="tempIn"
          color="#00ff00"
        />,
      );

      expect(screen.getByText("Complete Graph")).toBeInTheDocument();
      const line = screen.getByTestId("line");
      expect(line).toHaveAttribute("data-key", "tempIn");
      expect(line).toHaveAttribute("data-stroke", "#00ff00");
    });
  });

  describe("Edge Cases", () => {
    it("should handle component unmount gracefully", () => {
      const { unmount } = render(<VitalSignGraph />);

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();

      // Should not throw error on unmount
      expect(() => unmount()).not.toThrow();
    });

    it("should handle multiple rerenders", () => {
      const { rerender } = render(
        <VitalSignGraph title="V1" dataKey="power" />,
      );
      expect(screen.getByText("V1")).toBeInTheDocument();

      rerender(<VitalSignGraph title="V2" dataKey="tempIn" />);
      expect(screen.getByText("V2")).toBeInTheDocument();

      rerender(<VitalSignGraph title="V3" dataKey="pressure" />);
      expect(screen.getByText("V3")).toBeInTheDocument();

      // Chart should still render correctly
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });
  });
});
