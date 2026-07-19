/**
 * Tests for ComprehensiveVisualizationDashboard Component
 *
 * Tests basic rendering, embedded/tab-list branches, tab switching,
 * metric fallback branches (optional chaining + `||` defaults), and
 * the historicalData fallback branch.
 *
 * COMPONENT BEHAVIOR (Intentional Design):
 * - Tabs navigation ONLY renders when `!embedded && defaultTab === "overview"`
 * - When defaultTab is "gauges", "trends", or "process", the navigation tabs are hidden
 * - This is intentional for "locked" single-view mode
 * - The component can be used in two modes:
 *   1. Full dashboard (defaultTab: "overview") - with navigation
 *   2. Embedded single-view (defaultTab: "gauges" | "trends" | "process") - no navigation
 *
 * NOTE: Radix Tabs typically unmounts inactive TabsContent by default
 *       (no forceMount). If your Tabs implementation behaves differently,
 *       the queryByText(...).toBeNull() assertions may need adjustment.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ComprehensiveVisualizationDashboard from "../components/visualization/ComprehensiveVisualizationDashboard";
import { AuthProvider } from "../context/AuthContext";
import { TenantProvider } from "../context/TenantContext";
import {
  useRealtimeHistoricalData,
  useRealtimeMetrics,
} from "../hooks/useRealtimeData";

// Mock useRealtimeData hook so each test can control the returned shape
vi.mock("../hooks/useRealtimeData", () => ({
  useRealtimeMetrics: vi.fn(),
  useRealtimeHistoricalData: vi.fn(),
}));

// Mock child components. IndustrialGauge renders title/value so we can
// assert on which branch of the `metrics?.x?.current || default` chain fired.
vi.mock("../components/visualization/IndustrialGauge", () => ({
  default: ({ title, value }) => (
    <div data-testid="industrial-gauge">
      {title}: {value}
    </div>
  ),
}));

// MultiTimeframeTrendChart mock renders all relevant props for testing
vi.mock("../components/visualization/MultiTimeframeTrendChart", () => ({
  default: ({ title, showControls = true, defaultChartType, defaultTimeframe }) => (
    <div data-testid="trend-chart">
      Chart: {title} 
      {!showControls && "(controls hidden)"}
      {defaultChartType && ` (chartType: ${defaultChartType})`}
      {defaultTimeframe && ` (timeframe: ${defaultTimeframe})`}
    </div>
  ),
}));

// ProcessFlowDiagram mock renders dimensions for assertion
vi.mock("../components/visualization/ProcessFlowDiagram", () => ({
  default: ({ title, width, height }) => (
    <div data-testid="process-flow">
      Flow: {title} ({width}x{height})
    </div>
  ),
}));

describe("ComprehensiveVisualizationDashboard Component", () => {
  beforeEach(() => {
    useRealtimeMetrics.mockReturnValue({ metrics: {} });
    useRealtimeHistoricalData.mockReturnValue({ data: [] });
  });

  const renderComponent = (props = {}) => {
    return render(
      <AuthProvider>
        <TenantProvider>
          <ComprehensiveVisualizationDashboard {...props} />
        </TenantProvider>
      </AuthProvider>,
    );
  };

  describe("basic rendering", () => {
    it("should render without crashing", () => {
      const { container } = renderComponent();
      expect(container).toBeTruthy();
    });

    it("should render in embedded mode", () => {
      const { container } = renderComponent({ embedded: true });
      expect(container).toBeTruthy();
    });

    it("should initialize with tab state", () => {
      const { container } = renderComponent();
      expect(container).toBeTruthy();
    });
  });

  describe("embedded / header / tab-list branches", () => {
    it("renders header and tab list when not embedded with default overview tab", () => {
      renderComponent();
      expect(
        screen.getByText("Industrial Visualization Dashboard"),
      ).toBeTruthy();
      expect(screen.getByText("Overview")).toBeTruthy();
      expect(screen.getByText("Gauges")).toBeTruthy();
    });

    it("hides header and tab list when embedded", () => {
      renderComponent({ embedded: true });
      expect(
        screen.queryByText("Industrial Visualization Dashboard"),
      ).toBeNull();
      expect(screen.queryByText("Overview")).toBeNull();
    });

    it.each(["gauges", "trends", "process"])(
      "hides tab list when defaultTab is %s (intentional design)",
      (tab) => {
        const { unmount } = renderComponent({ embedded: false, defaultTab: tab });
        expect(screen.queryByText("Overview")).toBeNull();
        unmount();
      },
    );

    it("omits the min-h-screen wrapper class when embedded", () => {
      const { container } = renderComponent({ embedded: true });
      expect(container.querySelector(".min-h-screen")).toBeNull();
      expect(container.querySelector(".max-w-7xl")).toBeNull();
    });

    it("applies the default (non-embedded) wrapper classes", () => {
      const { container } = renderComponent({ embedded: false });
      expect(container.querySelector(".min-h-screen")).toBeTruthy();
      expect(container.querySelector(".max-w-7xl")).toBeTruthy();
    });
  });

  describe("tab switching / defaultTab branches", () => {
    it("renders gauges tab content directly when defaultTab is gauges", () => {
      const { unmount } = renderComponent({ defaultTab: "gauges" });
      expect(screen.getByText(/All System Gauges/)).toBeTruthy();
      // Overview content should not be visible (tab not active)
      expect(screen.queryByText(/Critical Metrics/)).toBeNull();
      // Tab list should not be visible (intentional design)
      expect(screen.queryByText("Overview")).toBeNull();
      unmount();
    });

    it("renders trends tab content directly when defaultTab is trends", () => {
      const { unmount } = renderComponent({ defaultTab: "trends" });
      expect(screen.getByText(/Temperature & Pressure Analysis/)).toBeTruthy();
      expect(screen.queryByText(/Critical Metrics/)).toBeNull();
      // Tab list should not be visible (intentional design)
      expect(screen.queryByText("Overview")).toBeNull();
      unmount();
    });

    it("renders process tab content directly when defaultTab is process", () => {
      const { unmount } = renderComponent({ defaultTab: "process" });
      expect(screen.getByText(/Complete Process Flow/)).toBeTruthy();
      expect(screen.queryByText(/Critical Metrics/)).toBeNull();
      // Tab list should not be visible (intentional design)
      expect(screen.queryByText("Overview")).toBeNull();
      unmount();
    });

    it("switches from overview to gauges tab on trigger click", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Gauges"));
      expect(screen.getByText(/All System Gauges/)).toBeTruthy();
    });

    it("switches from overview to process tab on trigger click", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Process Flow"));
      expect(screen.getByText(/Complete Process Flow/)).toBeTruthy();
    });

    it("switches overview -> gauges -> trends via sequential clicks", () => {
      // TabsList only renders when defaultTab is "overview" (intentional design)
      renderComponent();
      
      // Start on overview
      expect(screen.getByText(/Recent Trends \(24h\)/)).toBeTruthy();
      
      // Switch to gauges
      fireEvent.click(screen.getByText("Gauges"));
      expect(screen.getByText(/All System Gauges/)).toBeTruthy();
      
      // Switch to trends (tab list still visible because we started from overview)
      fireEvent.click(screen.getByText("Trends"));
      expect(screen.getByText(/Temperature & Pressure Analysis/)).toBeTruthy();
    });

    it("switches overview -> trends -> process via sequential clicks", () => {
      // TabsList only renders when defaultTab is "overview" (intentional design)
      renderComponent();
      
      // Switch to trends
      fireEvent.click(screen.getByText("Trends"));
      expect(screen.getByText(/Temperature & Pressure Analysis/)).toBeTruthy();
      
      // Switch to process
      fireEvent.click(screen.getByText("Process Flow"));
      expect(screen.getByText(/Complete Process Flow/)).toBeTruthy();
    });

    it("handles defaultTab with invalid value gracefully without crashing", () => {
      const { unmount } = renderComponent({ defaultTab: "invalid" });
      // Header still renders (controlled by !embedded, not defaultTab)
      expect(
        screen.getByText("Industrial Visualization Dashboard"),
      ).toBeTruthy();
      // No tab content should be active
      expect(screen.queryByText(/Critical Metrics/)).toBeNull();
      expect(screen.queryByText(/All System Gauges/)).toBeNull();
      // Tab list should not be visible
      expect(screen.queryByText("Overview")).toBeNull();
      unmount();
    });
  });

  describe("metrics fallback branches (optional chaining + || defaults)", () => {
    it("falls back to default gauge values when metrics is an empty object", () => {
      useRealtimeMetrics.mockReturnValue({ metrics: {} });
      renderComponent();
      expect(screen.getByText(/Temperature: 70/)).toBeTruthy();
      expect(screen.getByText(/Pressure: 105/)).toBeTruthy();
      expect(screen.getByText(/Flow Rate: 45.5/)).toBeTruthy();
    });

    it("falls back to default gauge values when metrics is undefined", () => {
      useRealtimeMetrics.mockReturnValue({ metrics: undefined });
      renderComponent();
      expect(screen.getByText(/Temperature: 70/)).toBeTruthy();
      expect(screen.getByText(/Pressure: 105/)).toBeTruthy();
    });

    it("uses provided temperature and pressure values when present", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: {
          temperature: { current: "88.5" },
          pressure: { current: "120" },
        },
      });
      renderComponent();
      expect(screen.getByText(/Temperature: 88.5/)).toBeTruthy();
      expect(screen.getByText(/Pressure: 120/)).toBeTruthy();
    });

    it("handles temperature.current being undefined while temperature exists", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: {
          temperature: { current: undefined },
          pressure: { current: "120" },
        },
      });
      renderComponent();
      expect(screen.getByText(/Temperature: 70/)).toBeTruthy(); // falls back to default
      expect(screen.getByText(/Pressure: 120/)).toBeTruthy();
    });

    it("handles pressure.current being null while pressure exists", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: {
          temperature: { current: "88.5" },
          pressure: { current: null },
        },
      });
      renderComponent();
      expect(screen.getByText(/Temperature: 88.5/)).toBeTruthy();
      expect(screen.getByText(/Pressure: 105/)).toBeTruthy(); // falls back to default
    });

    it("prefers flow_rate_inlet (snake_case) when present", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: { flow_rate_inlet: { current: "55.5" } },
      });
      renderComponent();
      expect(screen.getByText(/Flow Rate: 55.5/)).toBeTruthy();
    });

    it("falls back to flowRateInlet (camelCase) when snake_case is absent", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: { flowRateInlet: { current: "33.3" } },
      });
      renderComponent();
      expect(screen.getByText(/Flow Rate: 33.3/)).toBeTruthy();
    });

    it("falls back to default when both snake_case and camelCase flowRateInlet are absent", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: { somethingElse: { current: "50" } },
      });
      renderComponent();
      expect(screen.getByText(/Flow Rate: 45.5/)).toBeTruthy();
    });

    it("handles flow_rate_inlet.current being undefined", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: { flow_rate_inlet: { current: undefined } },
      });
      renderComponent();
      expect(screen.getByText(/Flow Rate: 45.5/)).toBeTruthy();
    });

    it("prefers flow_rate_outlet (snake_case) in the gauges tab", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: { flow_rate_outlet: { current: "20.2" } },
      });
      const { unmount } = renderComponent({ defaultTab: "gauges" });
      expect(screen.getByText(/Flow Rate Outlet: 20.2/)).toBeTruthy();
      unmount();
    });

    it("falls back to flowRateOutlet (camelCase) in the gauges tab when snake_case is absent", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: { flowRateOutlet: { current: "18.1" } },
      });
      const { unmount } = renderComponent({ defaultTab: "gauges" });
      expect(screen.getByText(/Flow Rate Outlet: 18.1/)).toBeTruthy();
      unmount();
    });

    it("falls back to gauges-tab defaults when metrics is empty", () => {
      useRealtimeMetrics.mockReturnValue({ metrics: {} });
      const { unmount } = renderComponent({ defaultTab: "gauges" });
      expect(screen.getByText(/Temperature Zone 1: 72.3/)).toBeTruthy();
      expect(screen.getByText(/Pressure Main Line: 105/)).toBeTruthy();
      expect(screen.getByText(/Flow Rate Inlet: 45.5/)).toBeTruthy();
      expect(screen.getByText(/Flow Rate Outlet: 42.1/)).toBeTruthy();
      unmount();
    });

    it("handles gauges tab with temperature.current undefined", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: {
          temperature: { current: undefined },
          pressure: { current: "120" },
        },
      });
      const { unmount } = renderComponent({ defaultTab: "gauges" });
      expect(screen.getByText(/Temperature Zone 1: 72.3/)).toBeTruthy();
      expect(screen.getByText(/Pressure Main Line: 120/)).toBeTruthy();
      unmount();
    });

    it("handles gauges tab with flow_rate_inlet.current undefined but flowRateInlet present", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: {
          flow_rate_inlet: { current: undefined },
          flowRateInlet: { current: "50.5" },
        },
      });
      const { unmount } = renderComponent({ defaultTab: "gauges" });
      expect(screen.getByText(/Flow Rate Inlet: 50.5/)).toBeTruthy();
      unmount();
    });

    it("handles gauges tab with both flow_rate_outlet and flowRateOutlet undefined", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: {
          flow_rate_outlet: { current: undefined },
          flowRateOutlet: { current: undefined },
        },
      });
      const { unmount } = renderComponent({ defaultTab: "gauges" });
      expect(screen.getByText(/Flow Rate Outlet: 42.1/)).toBeTruthy();
      unmount();
    });
  });

  describe("historicalData fallback branch", () => {
    it("falls back to an empty array when historicalData is null", () => {
      useRealtimeHistoricalData.mockReturnValue({ data: null });
      renderComponent();
      expect(screen.getByText(/Recent Trends \(24h\)/)).toBeTruthy();
    });

    it("falls back to an empty array when historicalData is undefined", () => {
      useRealtimeHistoricalData.mockReturnValue({ data: undefined });
      renderComponent();
      expect(screen.getByText(/Recent Trends \(24h\)/)).toBeTruthy();
    });

    it("uses provided historicalData array when present", () => {
      useRealtimeHistoricalData.mockReturnValue({
        data: [{ timestamp: "2026-01-01", temperature: 50 }],
      });
      renderComponent();
      expect(screen.getByText(/Recent Trends \(24h\)/)).toBeTruthy();
    });
  });

  describe("child component prop branches", () => {
    it("passes width 800 and height 400 to ProcessFlowDiagram in overview tab", () => {
      renderComponent();
      expect(screen.getByText(/Flow: System Overview \(800x400\)/)).toBeTruthy();
    });

    it("passes width 800 and height 600 to ProcessFlowDiagram in process tab", () => {
      const { unmount } = renderComponent({ defaultTab: "process" });
      expect(screen.getByText(/Flow: Complete Process Flow \(800x600\)/)).toBeTruthy();
      unmount();
    });

    it("sets showControls={true} (default) for overview tab chart", () => {
      renderComponent();
      // Should NOT show "controls hidden"
      expect(screen.queryByText(/controls hidden/)).toBeNull();
    });

    it("sets showControls={false} for System Temperature and System Pressure charts in trends tab", () => {
      const { unmount } = renderComponent({ defaultTab: "trends" });
      const charts = screen.getAllByTestId("trend-chart");
      expect(charts.length).toBe(3); // Main + System Temperature + System Pressure
      
      const hiddenControlsCharts = screen.getAllByText(/controls hidden/);
      expect(hiddenControlsCharts.length).toBe(2); // System Temperature + System Pressure
      unmount();
    });

    it("sets defaultChartType='line' for main chart and 'area' for System Temperature/Pressure charts in trends tab", () => {
      const { unmount } = renderComponent({ defaultTab: "trends" });
      
      // Main chart uses 'line'
      const lineCharts = screen.getAllByText(/chartType: line/);
      expect(lineCharts.length).toBe(1);
      
      // System Temperature and System Pressure use 'area'
      const areaCharts = screen.getAllByText(/chartType: area/);
      expect(areaCharts.length).toBe(2);
      unmount();
    });

    it("sets defaultTimeframe='24h' for main chart and '7d' for System Temperature/Pressure charts in trends tab", () => {
      const { unmount } = renderComponent({ defaultTab: "trends" });
      
      // Main chart uses '24h'
      const twentyFourHourCharts = screen.getAllByText(/timeframe: 24h/);
      expect(twentyFourHourCharts.length).toBe(1);
      
      // System Temperature and System Pressure use '7d'
      const sevenDayCharts = screen.getAllByText(/timeframe: 7d/);
      expect(sevenDayCharts.length).toBe(2);
      unmount();
    });

    it("sets defaultTimeframe='24h' for overview tab chart", () => {
      renderComponent();
      expect(screen.getByText(/timeframe: 24h/)).toBeTruthy();
    });
  });

  describe("edge cases and additional branches", () => {
    it("handles parsing of string metric values", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: {
          temperature: { current: "99.9" },
          pressure: { current: "149.9" },
        },
      });
      renderComponent();
      expect(screen.getByText(/Temperature: 99.9/)).toBeTruthy();
      expect(screen.getByText(/Pressure: 149.9/)).toBeTruthy();
    });

    it("handles numeric metric values (not strings)", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: {
          temperature: { current: 88.5 },
          pressure: { current: 120 },
        },
      });
      renderComponent();
      expect(screen.getByText(/Temperature: 88.5/)).toBeTruthy();
      expect(screen.getByText(/Pressure: 120/)).toBeTruthy();
    });

    it("handles negative metric values without triggering fallback", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: {
          temperature: { current: "-10" },
          pressure: { current: "-5" },
        },
      });
      renderComponent();
      // Negative values are truthy strings, so they don't trigger fallback
      expect(screen.getByText(/Temperature: -10/)).toBeTruthy();
      expect(screen.getByText(/Pressure: -5/)).toBeTruthy();
    });

    it("handles zero metric values without triggering fallback", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: {
          temperature: { current: "0" },
          pressure: { current: "0" },
        },
      });
      renderComponent();
      // "0" is a truthy string, so it doesn't trigger fallback
      expect(screen.getByText(/Temperature: 0/)).toBeTruthy();
      expect(screen.getByText(/Pressure: 0/)).toBeTruthy();
    });

    it("renders with empty historicalData array", () => {
      useRealtimeHistoricalData.mockReturnValue({ data: [] });
      renderComponent();
      expect(screen.getByText(/Recent Trends \(24h\)/)).toBeTruthy();
    });
  });
});
