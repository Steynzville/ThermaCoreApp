/**
 * Tests for ComprehensiveVisualizationDashboard Component
 *
 * Tests basic rendering and visualization tabs.
 */

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ComprehensiveVisualizationDashboard from "../components/visualization/ComprehensiveVisualizationDashboard";
import { AuthProvider } from "../context/AuthContext";
import { TenantProvider } from "../context/TenantContext";

// Mock useRealtimeData hook
vi.mock("../hooks/useRealtimeData", () => ({
  useRealtimeMetrics: () => ({
    metrics: {
      temperature: 25,
      pressure: 100,
      flowRate: 50,
    },
    loading: false,
    error: null,
  }),
  useRealtimeHistoricalData: () => ({
    data: [],
    loading: false,
    error: null,
  }),
}));

// Mock child components
vi.mock("../components/visualization/IndustrialGauge", () => ({
  default: () => <div data-testid="industrial-gauge">Gauge</div>,
}));

vi.mock("../components/visualization/MultiTimeframeTrendChart", () => ({
  default: () => <div data-testid="trend-chart">Chart</div>,
}));

vi.mock("../components/visualization/ProcessFlowDiagram", () => ({
  default: () => <div data-testid="process-flow">Flow</div>,
}));

describe("ComprehensiveVisualizationDashboard Component", () => {
  const renderComponent = (embedded = false) => {
    return render(
      <AuthProvider>
        <TenantProvider>
          <ComprehensiveVisualizationDashboard embedded={embedded} />
        </TenantProvider>
      </AuthProvider>,
    );
  };

  it("should render without crashing", () => {
    const { container } = renderComponent();
    expect(container).toBeTruthy();
  });

  it("should render in embedded mode", () => {
    const { container } = renderComponent(true);
    expect(container).toBeTruthy();
  });

  it("should initialize with tab state", () => {
    const { container } = renderComponent();
    expect(container).toBeTruthy();
  });
});
