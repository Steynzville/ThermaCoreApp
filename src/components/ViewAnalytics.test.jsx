import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ViewAnalytics, { formatRevenue, renderCustomizedLabel } from "./ViewAnalytics";

// Mock dependencies
vi.mock("./PageHeader", () => ({
  default: ({ title, subtitle }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock("./ui/card", () => ({
  Card: ({ children, className }) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
  Activity: () => <span>Activity Icon</span>,
  BarChart3: () => <span>BarChart3 Icon</span>,
  TrendingUp: () => <span>TrendingUp Icon</span>,
  Zap: () => <span>Zap Icon</span>,
}));

// ✅ FIX: Capture formatters in an array to avoid duplicate testid conflicts
let capturedFormatters = [];
let chartInstances = {
  barCharts: [],
  lineCharts: [],
  pies: [],
};

vi.mock("recharts", () => ({
  Bar: ({ dataKey }) => <span data-testid={`bar-${dataKey}`}>Bar</span>,
  BarChart: ({ children, data }) => {
    const id = `barchart-${chartInstances.barCharts.length}`;
    chartInstances.barCharts.push({ id, dataLength: data?.length || 0 });
    return (
      <div data-testid={id} data-points={data?.length || 0}>
        {children}
      </div>
    );
  },
  CartesianGrid: () => null,
  Cell: () => null,
  Legend: () => null,
  Line: ({ dataKey }) => <span data-testid={`line-${dataKey}`}>Line</span>,
  LineChart: ({ children, data }) => {
    const id = `linechart-${chartInstances.lineCharts.length}`;
    chartInstances.lineCharts.push({ id, dataLength: data?.length || 0 });
    return (
      <div data-testid={id} data-points={data?.length || 0}>
        {children}
      </div>
    );
  },
  Pie: ({ data, label }) => {
    const id = `pie-${chartInstances.pies.length}`;
    chartInstances.pies.push({ id, dataLength: data?.length || 0 });
    return (
      <div data-testid={id} data-points={data?.length || 0}>
        {label && label({ 
          cx: 50, 
          cy: 50, 
          midAngle: 0, 
          innerRadius: 0, 
          outerRadius: 100, 
          percent: 0.4, 
          name: "Power-Box" 
        })}
      </div>
    );
  },
  PieChart: ({ children }) => <div data-testid="piechart">{children}</div>,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Tooltip: ({ formatter }) => {
    if (formatter) {
      capturedFormatters.push(formatter);
    }
    return null;
  },
  XAxis: () => null,
  YAxis: () => null,
}));

describe("ViewAnalytics", () => {
  beforeEach(() => {
    // Reset captured data
    capturedFormatters = [];
    chartInstances = {
      barCharts: [],
      lineCharts: [],
      pies: [],
    };
  });

  // ============================================================
  // RENDERING TESTS
  // ============================================================
  describe("Rendering", () => {
    it("should render page title", () => {
      render(<ViewAnalytics />);
      expect(screen.getByText("Sales Analytics")).toBeInTheDocument();
    });

    it("should render page subtitle", () => {
      render(<ViewAnalytics />);
      expect(
        screen.getByText("Detailed performance metrics and trends"),
      ).toBeInTheDocument();
    });

    it("should apply custom className prop", () => {
      const { container } = render(<ViewAnalytics className="custom-class" />);
      expect(container.querySelector(".custom-class")).toBeInTheDocument();
    });
  });

  // ============================================================
  // SUMMARY METRICS TESTS
  // ============================================================
  describe("Summary metrics", () => {
    it("should display total units as 20", () => {
      render(<ViewAnalytics />);
      expect(screen.getByText("Total Units")).toBeInTheDocument();
      expect(screen.getByText("20")).toBeInTheDocument();
    });

    it("should display total revenue as $11.77M", () => {
      render(<ViewAnalytics />);
      expect(screen.getByText("Total Revenue")).toBeInTheDocument();
      expect(screen.getByText("$11.77M")).toBeInTheDocument();
    });

    it("should display active units", () => {
      render(<ViewAnalytics />);
      expect(screen.getByText("Active Units")).toBeInTheDocument();
      expect(screen.getByText("17")).toBeInTheDocument();
    });

    it("should display avg growth", () => {
      render(<ViewAnalytics />);
      expect(screen.getByText("Avg Growth")).toBeInTheDocument();
      expect(screen.getByText("+8.5%")).toBeInTheDocument();
    });
  });

  // ============================================================
  // CHART PRESENCE TESTS
  // ============================================================
  describe("Chart presence", () => {
    it("should render monthly growth trend chart", () => {
      render(<ViewAnalytics />);
      expect(screen.getByText("Monthly Growth Trend")).toBeInTheDocument();
      expect(
        screen.getByText("Cumulative units sold and revenue over time"),
      ).toBeInTheDocument();
    });

    it("should render product categories chart", () => {
      render(<ViewAnalytics />);
      expect(screen.getByText("Product Categories")).toBeInTheDocument();
      expect(
        screen.getByText("Distribution by product category"),
      ).toBeInTheDocument();
    });

    it("should render revenue by product line chart", () => {
      render(<ViewAnalytics />);
      expect(screen.getByText("Revenue by Product Line")).toBeInTheDocument();
      expect(
        screen.getByText("Total revenue breakdown by product category"),
      ).toBeInTheDocument();
    });

    it("should render average price chart", () => {
      render(<ViewAnalytics />);
      expect(
        screen.getByText("Average Price by Product Line"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Average unit price for each product category"),
      ).toBeInTheDocument();
    });

    it("should render product category distribution pie chart", () => {
      render(<ViewAnalytics />);
      expect(
        screen.getByText("Product Category Distribution"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Pie chart showing product category distribution"),
      ).toBeInTheDocument();
    });
  });

  // ============================================================
  // ICON TESTS
  // ============================================================
  describe("Icons", () => {
    it("should render all metric icons", () => {
      render(<ViewAnalytics />);
      expect(screen.getByText("BarChart3 Icon")).toBeInTheDocument();
      expect(screen.getByText("TrendingUp Icon")).toBeInTheDocument();
      expect(screen.getByText("Activity Icon")).toBeInTheDocument();
      expect(screen.getByText("Zap Icon")).toBeInTheDocument();
    });
  });

  // ============================================================
  // DATA FLOW TESTS
  // ============================================================
  describe("Data flow to charts", () => {
    it("should pass 3 categories to the pie chart", () => {
      render(<ViewAnalytics />);
      expect(screen.getByTestId("pie-0")).toHaveAttribute("data-points", "3");
    });

    it("should pass revenue data to the revenue chart", () => {
      render(<ViewAnalytics />);
      expect(screen.getByTestId("bar-revenue")).toBeInTheDocument();
    });

    it("should pass avgPrice data to the average price chart", () => {
      render(<ViewAnalytics />);
      expect(screen.getByTestId("bar-avgPrice")).toBeInTheDocument();
    });

    it("should pass value data to the product categories chart", () => {
      render(<ViewAnalytics />);
      expect(screen.getByTestId("bar-value")).toBeInTheDocument();
    });

    it("should pass 6 months to the trend chart", () => {
      render(<ViewAnalytics />);
      expect(screen.getByTestId("linechart-0")).toHaveAttribute("data-points", "6");
    });

    it("should pass units data to the trend chart", () => {
      render(<ViewAnalytics />);
      expect(screen.getByTestId("line-units")).toBeInTheDocument();
    });

    it("should pass revenue data to the trend chart", () => {
      render(<ViewAnalytics />);
      expect(screen.getByTestId("line-revenue")).toBeInTheDocument();
    });

    it("should have 3 bar charts rendered", () => {
      render(<ViewAnalytics />);
      expect(chartInstances.barCharts).toHaveLength(3);
    });

    it("should have 1 line chart rendered", () => {
      render(<ViewAnalytics />);
      expect(chartInstances.lineCharts).toHaveLength(1);
    });

    it("should have 1 pie chart rendered", () => {
      render(<ViewAnalytics />);
      expect(chartInstances.pies).toHaveLength(1);
    });
  });

  // ============================================================
  // TOOLTIP FORMATTER TESTS
  // ============================================================
  describe("Tooltip formatter", () => {
    it("should capture formatters from all charts with formatters", () => {
      render(<ViewAnalytics />);
      // Should capture formatters from: LineChart (1), Revenue BarChart (1), AvgPrice BarChart (1)
      // Total: 3 formatters
      expect(capturedFormatters).toHaveLength(3);
    });

    it("should format line-chart revenue tooltip as [value, label] tuple", () => {
      render(<ViewAnalytics />);
      // First formatter is from the LineChart (monthly trend)
      const lineChartFormatter = capturedFormatters[0];
      expect(lineChartFormatter(1000000, "revenue")).toEqual(["$1.00M", "Revenue"]);
      expect(lineChartFormatter(5, "units")).toEqual([5, "Units"]);
    });

    it("should format bar-chart revenue tooltip as a plain string", () => {
      render(<ViewAnalytics />);
      // Second formatter is from the Revenue BarChart
      const barChartFormatter = capturedFormatters[1];
      expect(barChartFormatter(1000000)).toBe("$1.00M");
    });

    it("should format avg-price bar-chart tooltip as a plain string", () => {
      render(<ViewAnalytics />);
      // Third formatter is from the AvgPrice BarChart
      const avgPriceFormatter = capturedFormatters[2];
      expect(avgPriceFormatter(45000)).toBe("$45K");
    });

    it("should handle edge values in line chart formatter", () => {
      render(<ViewAnalytics />);
      const lineChartFormatter = capturedFormatters[0];
      // ✅ FIX: Use actual boundary values
      // At the boundary - should show as $1.00M
      expect(lineChartFormatter(999500, "revenue")).toEqual(["$1.00M", "Revenue"]);
      // Just below the boundary - should show as $999K
      expect(lineChartFormatter(999499, "revenue")).toEqual(["$999K", "Revenue"]);
    });
  });

  // ============================================================
  // RENDER CUSTOMIZED LABEL TESTS
  // ============================================================
  describe("renderCustomizedLabel", () => {
    it("should render label with name and percentage", () => {
      const result = renderCustomizedLabel({
        cx: 50,
        cy: 50,
        midAngle: 0,
        innerRadius: 0,
        outerRadius: 100,
        percent: 0.4,
        name: "Power-Box",
      });

      expect(result.props.children).toBe("Power-Box 40%");
    });

    it("should handle different percentages", () => {
      const result = renderCustomizedLabel({
        cx: 50,
        cy: 50,
        midAngle: 0,
        innerRadius: 0,
        outerRadius: 100,
        percent: 0.75,
        name: "Titan",
      });

      expect(result.props.children).toBe("Titan 75%");
    });

    it("should handle zero percent", () => {
      const result = renderCustomizedLabel({
        cx: 50,
        cy: 50,
        midAngle: 0,
        innerRadius: 0,
        outerRadius: 100,
        percent: 0,
        name: "Empty",
      });

      expect(result.props.children).toBe("Empty 0%");
    });

    it("should use textAnchor='start' when x > cx", () => {
      // ✅ FIX: Use unambiguous angle 45° which puts x > cx
      const result = renderCustomizedLabel({
        cx: 50,
        cy: 50,
        midAngle: 45,
        innerRadius: 0,
        outerRadius: 100,
        percent: 0.4,
        name: "Power-Box",
      });

      expect(result.props.textAnchor).toBe("start");
    });

    it("should use textAnchor='end' when x <= cx", () => {
      // ✅ FIX: Use unambiguous angle 135° which puts x < cx
      const result = renderCustomizedLabel({
        cx: 50,
        cy: 50,
        midAngle: 135,
        innerRadius: 0,
        outerRadius: 100,
        percent: 0.4,
        name: "Power-Box",
      });

      expect(result.props.textAnchor).toBe("end");
    });
  });

  // ============================================================
  // FORMAT REVENUE TESTS
  // ============================================================
  describe("formatRevenue", () => {
    it("formats millions with 2 decimal places", () => {
      expect(formatRevenue(11774988)).toBe("$11.77M");
      expect(formatRevenue(1000000)).toBe("$1.00M");
      expect(formatRevenue(1500000)).toBe("$1.50M");
    });

    it("formats thousands with 0 decimal places", () => {
      expect(formatRevenue(45000)).toBe("$45K");
      expect(formatRevenue(1000)).toBe("$1K");
      expect(formatRevenue(999499)).toBe("$999K");
    });

    it("formats small amounts with $", () => {
      expect(formatRevenue(500)).toBe("$500");
      expect(formatRevenue(0)).toBe("$0");
      expect(formatRevenue(999)).toBe("$999");
    });

    // ✅ FIX: Test the boundary correctly with actual values
    it("handles the 999.5K-1M boundary correctly", () => {
      // 999500 and above should show as $1.00M
      expect(formatRevenue(999500)).toBe("$1.00M");
      expect(formatRevenue(999750)).toBe("$1.00M");
      expect(formatRevenue(1000000)).toBe("$1.00M");
      // 999499 and below should show as $999K
      expect(formatRevenue(999499)).toBe("$999K");
    });

    it("handles edge cases correctly", () => {
      // Values slightly below the boundary
      expect(formatRevenue(999400)).toBe("$999K");
      // Values at the boundary should show as $1.00M
      expect(formatRevenue(999500)).toBe("$1.00M");
      // Values just above the boundary
      expect(formatRevenue(1000499)).toBe("$1.00M");
    });
  });
});
