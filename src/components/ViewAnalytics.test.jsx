import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ViewAnalytics from "./ViewAnalytics";

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

vi.mock("recharts", () => ({
  Bar: () => null,
  BarChart: ({ children }) => <div>{children}</div>,
  CartesianGrid: () => null,
  Cell: () => null,
  Legend: () => null,
  Line: () => null,
  LineChart: ({ children }) => <div>{children}</div>,
  Pie: () => null,
  PieChart: ({ children }) => <div>{children}</div>,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

describe("ViewAnalytics", () => {
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

  it("should render all metric icons", () => {
    render(<ViewAnalytics />);
    expect(screen.getByText("BarChart3 Icon")).toBeInTheDocument();
    expect(screen.getByText("TrendingUp Icon")).toBeInTheDocument();
    expect(screen.getByText("Activity Icon")).toBeInTheDocument();
    expect(screen.getByText("Zap Icon")).toBeInTheDocument();
  });
});
