// @vitest-environment jsdom
/**
 * Tests for VitalSignGraph Component
 * */

import { fireEvent, render, screen, cleanup, act } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import VitalSignGraph from "../components/VitalSignGraph";
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
    XAxis: ({ dataKey, stroke, className }) => (
      <div
        data-testid="x-axis"
        data-key={dataKey}
        data-stroke={stroke}
        className={className}
      />
    ),
    YAxis: ({ stroke, className }) => (
      <div data-testid="y-axis" data-stroke={stroke} className={className} />
    ),
    Tooltip: ({ contentStyle, labelStyle, itemStyle }) => (
      <div
        data-testid="tooltip"
        data-content-style={JSON.stringify(contentStyle)}
        data-label-style={JSON.stringify(labelStyle)}
        data-item-style={JSON.stringify(itemStyle)}
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
    it("should render timeframe selector", () => {
      render(<VitalSignGraph {...defaultProps} />, { wrapper: TestWrapper });
      const select = screen.getByTestId("timeframe-select");
      expect(select).toBeTruthy();
      expect(screen.getByTestId("select-item-day")).toBeTruthy();
      expect(screen.getByTestId("select-item-month")).toBeTruthy();
      expect(screen.getByTestId("select-item-year")).toBeTruthy();
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
