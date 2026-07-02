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

const mockConfig = {
  value: { label: "Value", color: "#8884d8" },
  revenue: { label: "Revenue", color: "#82ca9d" },
};

describe("ChartContainer", () => {
  it("should render children", () => {
    render(
      <ChartContainer config={mockConfig}>
        <div>Chart Content</div>
      </ChartContainer>,
    );

    expect(screen.getByText("Chart Content")).toBeInTheDocument();
  });

  it("should render ResponsiveContainer", () => {
    render(
      <ChartContainer config={mockConfig}>
        <div>Chart</div>
      </ChartContainer>,
    );

    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
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

    expect(screen.getByText("Chart")).toBeInTheDocument();
  });
});

describe("ChartTooltipContent", () => {
  const mockPayload = [
    {
      dataKey: "value",
      value: 100,
      name: "value",
    },
  ];

  it("should render value when active", () => {
    render(
      <ChartContainer config={mockConfig}>
        <ChartTooltipContent active payload={mockPayload} />
      </ChartContainer>,
    );

    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("should not render when inactive", () => {
    render(
      <ChartContainer config={mockConfig}>
        <ChartTooltipContent active={false} payload={mockPayload} />
      </ChartContainer>,
    );

    expect(screen.queryByText("100")).not.toBeInTheDocument();
  });

  it("should not render with empty payload", () => {
    render(
      <ChartContainer config={mockConfig}>
        <ChartTooltipContent active payload={[]} />
      </ChartContainer>,
    );

    expect(screen.queryByText("100")).not.toBeInTheDocument();
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

    expect(screen.getByText("$100")).toBeInTheDocument();
  });

  it("should render multiple values", () => {
    const payload = [
      { dataKey: "value", value: 100 },
      { dataKey: "count", value: 50 },
    ];

    render(
      <ChartContainer config={mockConfig}>
        <ChartTooltipContent active payload={payload} />
      </ChartContainer>,
    );

    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("should handle undefined values safely", () => {
    const payload = [{ dataKey: "value", value: undefined }];

    render(
      <ChartContainer config={mockConfig}>
        <ChartTooltipContent active payload={payload} />
      </ChartContainer>,
    );

    // should not crash
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });
});

describe("ChartLegendContent", () => {
  const payload = [
    { value: "value", dataKey: "value" },
    { value: "revenue", dataKey: "revenue" },
  ];

  it("should render legend labels", () => {
    render(
      <ChartContainer config={mockConfig}>
        <ChartLegendContent payload={payload} />
      </ChartContainer>,
    );

    expect(screen.getByText("Value")).toBeInTheDocument();
    expect(screen.getByText("Revenue")).toBeInTheDocument();
  });

  it("should not render empty payload", () => {
    render(
      <ChartContainer config={mockConfig}>
        <ChartLegendContent payload={[]} />
      </ChartContainer>,
    );

    expect(screen.queryByText("Value")).not.toBeInTheDocument();
  });

  it("should handle null payload", () => {
    render(
      <ChartContainer config={mockConfig}>
        <ChartLegendContent payload={null} />
      </ChartContainer>,
    );

    expect(screen.queryByText("Value")).not.toBeInTheDocument();
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
    render(
      <ChartContainer config={mockConfig}>
        <ChartTooltip
          content={
            <ChartTooltipContent active payload={[{ value: 100 }]} />
          }
        />
        <ChartLegend
          content={
            <ChartLegendContent
              payload={[{ value: "value", dataKey: "value" }]}
            />
          }
        />
      </ChartContainer>,
    );

    expect(screen.getByTestId("recharts-tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("recharts-legend")).toBeInTheDocument();
  });
});
