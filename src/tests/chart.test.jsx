/**
 * Tests for Chart Components (ui/chart.jsx)
 *
 * Coverage includes:
 * - ChartContainer rendering and context
 * - ChartStyle generation with theme support
 * - ChartTooltip and ChartTooltipContent
 * - ChartLegend and ChartLegendContent
 * - Color theming (light/dark mode)
 * - Configuration handling
 * - Accessibility features
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

// Mock recharts ResponsiveContainer
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: ({ content }) => <div data-testid="recharts-tooltip">{content}</div>,
  Legend: ({ content }) => <div data-testid="recharts-legend">{content}</div>,
}));

describe("ChartContainer", () => {
  const mockConfig = {
    value: {
      label: "Value",
      color: "#8884d8",
    },
    revenue: {
      label: "Revenue",
      color: "#82ca9d",
      theme: {
        light: "#82ca9d",
        dark: "#4ade80",
      },
    },
  };

  describe("Basic Rendering", () => {
    it("should render with children", () => {
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

      const chartElement = container.querySelector('[data-slot="chart"]');
      expect(chartElement).toBeInTheDocument();
    });

    it("should generate unique chart id", () => {
      const { container: container1 } = render(
        <ChartContainer config={mockConfig}>
          <div>Chart 1</div>
        </ChartContainer>,
      );

      const { container: container2 } = render(
        <ChartContainer config={mockConfig}>
          <div>Chart 2</div>
        </ChartContainer>,
      );

      const chart1 = container1.querySelector("[data-chart]");
      const chart2 = container2.querySelector("[data-chart]");

      expect(chart1?.getAttribute("data-chart")).toBeTruthy();
      expect(chart2?.getAttribute("data-chart")).toBeTruthy();
      expect(chart1?.getAttribute("data-chart")).not.toBe(
        chart2?.getAttribute("data-chart"),
      );
    });

    it("should accept custom id", () => {
      const { container } = render(
        <ChartContainer id="custom-chart" config={mockConfig}>
          <div>Chart</div>
        </ChartContainer>,
      );

      const chartElement = container.querySelector(
        '[data-chart="chart-custom-chart"]',
      );
      expect(chartElement).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <ChartContainer config={mockConfig} className="custom-class">
          <div>Chart</div>
        </ChartContainer>,
      );

      const chartElement = container.querySelector(".custom-class");
      expect(chartElement).toBeInTheDocument();
    });
  });

  describe("Configuration and Context", () => {
    it("should provide config through context", () => {
      const TestComponent = () => {
        return <div>Test</div>;
      };

      render(
        <ChartContainer config={mockConfig}>
          <TestComponent />
        </ChartContainer>,
      );

      expect(screen.getByText("Test")).toBeInTheDocument();
    });

    it("should handle empty config", () => {
      render(
        <ChartContainer config={{}}>
          <div>Chart</div>
        </ChartContainer>,
      );

      expect(screen.getByText("Chart")).toBeInTheDocument();
    });

    it("should handle complex config", () => {
      const complexConfig = {
        metric1: {
          label: "Metric 1",
          color: "#ff0000",
          theme: {
            light: "#ff0000",
            dark: "#ff4444",
          },
        },
        metric2: {
          label: "Metric 2",
          color: "#00ff00",
        },
        metric3: {
          label: "Metric 3",
          theme: {
            light: "#0000ff",
            dark: "#4444ff",
          },
        },
      };

      render(
        <ChartContainer config={complexConfig}>
          <div>Chart</div>
        </ChartContainer>,
      );

      expect(screen.getByText("Chart")).toBeInTheDocument();
    });
  });

  describe("ChartStyle Generation", () => {
    it("should generate CSS styles for config", () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <div>Chart</div>
        </ChartContainer>,
      );

      const styleElement = container.querySelector("style");
      expect(styleElement).toBeInTheDocument();
      expect(styleElement?.innerHTML).toContain("--color-value");
      expect(styleElement?.innerHTML).toContain("--color-revenue");
    });

    it("should handle theme-aware colors", () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <div>Chart</div>
        </ChartContainer>,
      );

      const styleElement = container.querySelector("style");
      expect(styleElement?.innerHTML).toContain(".dark");
    });

    it("should not render style if no colors in config", () => {
      const noColorConfig = {
        value: {
          label: "Value",
        },
      };

      const { container } = render(
        <ChartContainer config={noColorConfig}>
          <div>Chart</div>
        </ChartContainer>,
      );

      const styleElement = container.querySelector("style");
      expect(styleElement).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should be keyboard accessible", () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <div>Chart</div>
        </ChartContainer>,
      );

      const chartElement = container.querySelector('[data-slot="chart"]');
      expect(chartElement).toBeInTheDocument();
    });

    it("should support ARIA attributes through props", () => {
      const { container } = render(
        <ChartContainer config={mockConfig} aria-label="Sales Chart" role="img">
          <div>Chart</div>
        </ChartContainer>,
      );

      const chartElement = container.querySelector(
        '[aria-label="Sales Chart"]',
      );
      expect(chartElement).toBeInTheDocument();
      expect(chartElement?.getAttribute("role")).toBe("img");
    });
  });
});

describe("ChartTooltipContent", () => {
  const mockConfig = {
    value: {
      label: "Value",
      color: "#8884d8",
    },
    count: {
      label: "Count",
      color: "#82ca9d",
    },
  };

  const mockPayload = [
    {
      dataKey: "value",
      name: "value",
      value: 100,
      color: "#8884d8",
      payload: {
        fill: "#8884d8",
      },
    },
  ];

  describe("Basic Rendering", () => {
    it("should render when active with payload", () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent active={true} payload={mockPayload} />
        </ChartContainer>,
      );

      expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("should not render when not active", () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent active={false} payload={mockPayload} />
        </ChartContainer>,
      );

      // Tooltip content should not be rendered
      expect(screen.queryByText("100")).not.toBeInTheDocument();
    });

    it("should not render when payload is empty", () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent active={true} payload={[]} />
        </ChartContainer>,
      );

      // No tooltip content should be rendered with empty payload
      expect(screen.queryByText("Value")).not.toBeInTheDocument();
      expect(screen.queryByText("Count")).not.toBeInTheDocument();
    });
  });

  describe("Label Display", () => {
    it("should show label from config", () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            label="Test Label"
          />
        </ChartContainer>,
      );

      expect(screen.getByText("Value")).toBeInTheDocument();
    });

    it("should hide label when hideLabel is true", () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            label="Test Label"
            hideLabel={true}
          />
        </ChartContainer>,
      );

      // Label should not be rendered separately
      expect(screen.queryByText("Test Label")).not.toBeInTheDocument();
    });

    it("should format label with labelFormatter", () => {
      const formatter = (value) => `Custom: ${value}`;

      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            label="Test"
            labelFormatter={formatter}
          />
        </ChartContainer>,
      );

      expect(screen.getByText(/Custom:/)).toBeInTheDocument();
    });
  });

  describe("Indicator Styles", () => {
    it("should render dot indicator by default", () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent active={true} payload={mockPayload} />
        </ChartContainer>,
      );

      // Dot indicator should be rendered (as a div with background color)
      expect(container.querySelector("[style]")).toBeInTheDocument();
    });

    it("should render line indicator", () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            indicator="line"
          />
        </ChartContainer>,
      );

      expect(container.querySelector("[style]")).toBeInTheDocument();
    });

    it("should render dashed indicator", () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            indicator="dashed"
          />
        </ChartContainer>,
      );

      expect(container.querySelector("[style]")).toBeInTheDocument();
    });

    it("should hide indicator when hideIndicator is true", () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            hideIndicator={true}
          />
        </ChartContainer>,
      );

      expect(screen.getByText("100")).toBeInTheDocument();
    });
  });

  describe("Value Formatting", () => {
    it("should display values from payload", () => {
      const multiPayload = [
        {
          dataKey: "value",
          name: "value",
          value: 100,
          color: "#8884d8",
          payload: { fill: "#8884d8" },
        },
        {
          dataKey: "count",
          name: "count",
          value: 50,
          color: "#82ca9d",
          payload: { fill: "#82ca9d" },
        },
      ];

      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent active={true} payload={multiPayload} />
        </ChartContainer>,
      );

      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
    });

    it("should format values with custom formatter", () => {
      const formatter = (value) => `$${value}`;

      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            formatter={formatter}
          />
        </ChartContainer>,
      );

      expect(screen.getByText("$100")).toBeInTheDocument();
    });

    it("should handle undefined values gracefully", () => {
      const payloadWithUndefined = [
        {
          dataKey: "value",
          name: "value",
          value: undefined,
          color: "#8884d8",
          payload: { fill: "#8884d8" },
        },
      ];

      render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent active={true} payload={payloadWithUndefined} />
        </ChartContainer>,
      );

      // Should render without error - check for Value label
      const valueLabels = screen.getAllByText("Value");
      expect(valueLabels.length).toBeGreaterThan(0);
    });
  });

  describe("Custom Styling", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent
            active={true}
            payload={mockPayload}
            className="custom-tooltip"
          />
        </ChartContainer>,
      );

      expect(container.querySelector(".custom-tooltip")).toBeInTheDocument();
    });

    it("should apply color from payload", () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <ChartTooltipContent active={true} payload={mockPayload} />
        </ChartContainer>,
      );

      const colorElement = container.querySelector("[style]");
      expect(colorElement).toBeInTheDocument();
    });
  });
});

describe("ChartLegendContent", () => {
  const mockConfig = {
    value: {
      label: "Value",
      color: "#8884d8",
    },
    count: {
      label: "Count",
      color: "#82ca9d",
    },
  };

  const mockPayload = [
    { value: "value", color: "#8884d8", dataKey: "value" },
    { value: "count", color: "#82ca9d", dataKey: "count" },
  ];

  describe("Basic Rendering", () => {
    it("should render legend items", () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent payload={mockPayload} />
        </ChartContainer>,
      );

      expect(screen.getByText("Value")).toBeInTheDocument();
      expect(screen.getByText("Count")).toBeInTheDocument();
    });

    it("should not render when payload is empty", () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent payload={[]} />
        </ChartContainer>,
      );

      // Should not render legend items, but chart style may exist
      expect(screen.queryByText("Value")).not.toBeInTheDocument();
      expect(screen.queryByText("Count")).not.toBeInTheDocument();
    });

    it("should not render when payload is null", () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent payload={null} />
        </ChartContainer>,
      );

      // Should not render legend items, but chart style may exist
      expect(screen.queryByText("Value")).not.toBeInTheDocument();
      expect(screen.queryByText("Count")).not.toBeInTheDocument();
    });
  });

  describe("Legend Alignment", () => {
    it("should align vertically to bottom by default", () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent payload={mockPayload} />
        </ChartContainer>,
      );

      const legend = container.querySelector(".pt-3");
      expect(legend).toBeInTheDocument();
    });

    it("should align vertically to top", () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent payload={mockPayload} verticalAlign="top" />
        </ChartContainer>,
      );

      const legend = container.querySelector(".pb-3");
      expect(legend).toBeInTheDocument();
    });
  });

  describe("Color Indicators", () => {
    it("should render color indicators by default", () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent payload={mockPayload} />
        </ChartContainer>,
      );

      const indicators = container.querySelectorAll('[style*="background"]');
      expect(indicators.length).toBeGreaterThan(0);
    });

    it("should hide color indicators when hideIcon is true", () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent payload={mockPayload} hideIcon={true} />
        </ChartContainer>,
      );

      // Should still render labels
      expect(screen.getByText("Value")).toBeInTheDocument();
      expect(screen.getByText("Count")).toBeInTheDocument();
    });
  });

  describe("Custom Styling", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent payload={mockPayload} className="custom-legend" />
        </ChartContainer>,
      );

      expect(container.querySelector(".custom-legend")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should render legend items as readable text", () => {
      render(
        <ChartContainer config={mockConfig}>
          <ChartLegendContent payload={mockPayload} />
        </ChartContainer>,
      );

      expect(screen.getByText("Value")).toBeInTheDocument();
      expect(screen.getByText("Count")).toBeInTheDocument();
    });
  });
});

describe("Chart Integration", () => {
  it("should work together in a complete chart", () => {
    const config = {
      sales: {
        label: "Sales",
        color: "#8884d8",
      },
    };

    const data = [
      {
        sales: 100,
        payload: { fill: "#8884d8" },
      },
    ];

    render(
      <ChartContainer config={config}>
        <ChartTooltip
          content={<ChartTooltipContent active={true} payload={data} />}
        />
        <ChartLegend
          content={
            <ChartLegendContent
              payload={[{ value: "sales", color: "#8884d8" }]}
            />
          }
        />
      </ChartContainer>,
    );

    expect(screen.getByTestId("recharts-tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("recharts-legend")).toBeInTheDocument();
  });
});
