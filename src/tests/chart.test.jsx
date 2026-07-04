/**
 * Tests for Chart Components (ui/chart.jsx)
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

/**
 * Recharts mocks (stable + minimal DOM surface)
 */
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: ({ content }) => (
    <div data-testid="recharts-tooltip">{content}</div>
  ),
  Legend: ({ content }) => (
    <div data-testid="recharts-legend">{content}</div>
  ),
}));

// Mock the cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...inputs) => inputs.filter(Boolean).join(" "),
}));

const mockConfig = {
  value: { label: "Value", color: "#8884d8" },
  revenue: { label: "Revenue", color: "#82ca9d" },
  count: { label: "Count", color: "#ff7300" },
};

describe("ChartContainer", () => {
  it("should render children", () => {
    render(
      <ChartContainer config={mockConfig}>
        <div>Chart Content</div>
      </ChartContainer>,
    );

    const elements = screen.getAllByText("Chart Content");
    expect(elements.length).toBeGreaterThan(0);
  });

  it("should render ResponsiveContainer", () => {
    render(
      <ChartContainer config={mockConfig}>
        <div>Chart</div>
      </ChartContainer>,
    );

    const elements = screen.getAllByTestId("responsive-container");
    expect(elements.length).toBeGreaterThan(0);
  });

  it("should apply data-slot attribute", () => {
    const { container } = render(
      <ChartContainer config={mockConfig}>
        <div>Chart</div>
      </ChartContainer>,
    );

    expect(container.querySelector('[data-slot="chart"]')).toBeTruthy();
  });

  it("should generate unique chart ids", () => {
    const { container: c1 } = render(
      <ChartContainer config={mockConfig}>
        <div>Chart 1</div>
      </ChartContainer>,
    );

    const { container: c2 } = render(
      <ChartContainer config={mockConfig}>
        <div>Chart 2</div>
      </ChartContainer>,
    );

    const id1 = c1.querySelector("[data-chart]")?.getAttribute("data-chart");
    const id2 = c2.querySelector("[data-chart]")?.getAttribute("data-chart");

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it("should accept custom id", () => {
    const { container } = render(
      <ChartContainer id="custom-chart" config={mockConfig}>
        <div>Chart</div>
      </ChartContainer>,
    );

    expect(container.querySelector('[data-chart="chart-custom-chart"]')).toBeTruthy();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <ChartContainer config={mockConfig} className="custom-class">
        <div>Chart</div>
      </ChartContainer>,
    );

    expect(container.querySelector(".custom-class")).toBeTruthy();
  });

  it("should handle empty config safely", () => {
    render(
      <ChartContainer config={{}}>
        <div>Chart</div>
      </ChartContainer>,
    );

    const elements = screen.getAllByText("Chart");
    expect(elements.length).toBeGreaterThan(0);
  });
});

describe("ChartTooltipContent", () => {
  const mockPayload = [
    {
      dataKey: "value",
      value: 100,
      name: "value",
      color: "#8884d8",
      payload: {
        fill: "#8884d8",
        value: 100,
      },
    },
  ];

  it("should render value when active", () => {
    render(
      <ChartContainer config={mockConfig}>
        <ChartTooltipContent active payload={mockPayload} />
      </ChartContainer>,
    );

    const elements = screen.getAllByText("100");
    expect(elements.length).toBeGreaterThan(0);
  });

  it("should not render when inactive", () => {
    render(
      <ChartContainer config={mockConfig}>
        <ChartTooltipContent active={false} payload={mockPayload} />
      </ChartContainer>,
    );

    const elements = screen.queryAllByText("100");
    expect(elements.length).toBe(0);
  });

  it("should not render with empty payload", () => {
    render(
      <ChartContainer config={mockConfig}>
        <ChartTooltipContent active payload={[]} />
      </ChartContainer>,
    );

    const elements = screen.queryAllByText("100");
    expect(elements.length).toBe(0);
  });

  it("should format values", () => {
    render(
      <ChartContainer config={mockConfig}>
        <ChartTooltipContent
          active
          payload={mockPayload}
          formatter={(v) => `$${v}`}
        />
      </ChartContainer>,
    );

    const elements = screen.getAllByText("$100");
    expect(elements.length).toBeGreaterThan(0);
  });

  it("should render multiple values", () => {
    const payload = [
      {
        dataKey: "value",
        value: 100,
        name: "value",
        color: "#8884d8",
        payload: { fill: "#8884d8", value: 100 },
      },
      {
        dataKey: "count",
        value: 50,
        name: "count",
        color: "#ff7300",
        payload: { fill: "#ff7300", count: 50 },
      },
    ];

    render(
      <ChartContainer config={mockConfig}>
        <ChartTooltipContent active payload={payload} />
      </ChartContainer>,
    );

    const elements100 = screen.getAllByText("100");
    const elements50 = screen.getAllByText("50");
    expect(elements100.length).toBeGreaterThan(0);
    expect(elements50.length).toBeGreaterThan(0);
  });

  it("should handle undefined values safely", () => {
    const payload = [
      {
        dataKey: "value",
        value: undefined,
        name: "value",
        color: "#8884d8",
        payload: { fill: "#8884d8", value: undefined },
      },
    ];

    render(
      <ChartContainer config={mockConfig}>
        <ChartTooltipContent active payload={payload} />
      </ChartContainer>,
    );

    // Should render without crashing - verify the component renders
    const containerElements = screen.getAllByTestId("responsive-container");
    expect(containerElements.length).toBeGreaterThan(0);
  });
});

describe("ChartLegendContent", () => {
  const payload = [
    { value: "value", dataKey: "value", color: "#8884d8" },
    { value: "revenue", dataKey: "revenue", color: "#82ca9d" },
  ];

  it("should render legend labels", () => {
    render(
      <ChartContainer config={mockConfig}>
        <ChartLegendContent payload={payload} />
      </ChartContainer>,
    );

    const valueElements = screen.getAllByText("Value");
    const revenueElements = screen.getAllByText("Revenue");
    expect(valueElements.length).toBeGreaterThan(0);
    expect(revenueElements.length).toBeGreaterThan(0);
  });

  it("should not render empty payload", () => {
    render(
      <ChartContainer config={mockConfig}>
        <ChartLegendContent payload={[]} />
      </ChartContainer>,
    );

    const elements = screen.queryAllByText("Value");
    expect(elements.length).toBe(0);
  });

  it("should handle null payload", () => {
    render(
      <ChartContainer config={mockConfig}>
        <ChartLegendContent payload={null} />
      </ChartContainer>,
    );

    const elements = screen.queryAllByText("Value");
    expect(elements.length).toBe(0);
  });

  it("should apply custom className", () => {
    const { container } = render(
      <ChartContainer config={mockConfig}>
        <ChartLegendContent payload={payload} className="custom-legend" />
      </ChartContainer>,
    );

    expect(container.querySelector(".custom-legend")).toBeTruthy();
  });
});

describe("Chart Integration", () => {
  it("should render tooltip and legend together", () => {
    const tooltipPayload = [
      {
        dataKey: "value",
        value: 100,
        name: "value",
        color: "#8884d8",
        payload: { fill: "#8884d8", value: 100 },
      },
    ];
    
    const legendPayload = [
      { value: "value", dataKey: "value", color: "#8884d8" },
    ];

    render(
      <ChartContainer config={mockConfig}>
        <ChartTooltip
          content={
            <ChartTooltipContent active payload={tooltipPayload} />
          }
        />
        <ChartLegend
          content={
            <ChartLegendContent payload={legendPayload} />
          }
        />
      </ChartContainer>,
    );

    const tooltipElements = screen.getAllByTestId("recharts-tooltip");
    const legendElements = screen.getAllByTestId("recharts-legend");
    expect(tooltipElements.length).toBeGreaterThan(0);
    expect(legendElements.length).toBeGreaterThan(0);
    
    // Verify content is rendered
    const valueElements = screen.getAllByText("100");
    expect(valueElements.length).toBeGreaterThan(0);
  });
});
