```jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import ScadaMainPage from "./ScadaMainPage";

// Mock child components
vi.mock("./alerts/AdvancedAlertDashboard", () => ({
  default: ({ embedded }) => (
    <div data-testid="mock-alerts-dashboard">Mock Alerts Dashboard {String(embedded)}</div>
  ),
}));

vi.mock("./analytics/PerformanceAnalyticsDashboard", () => ({
  default: ({ embedded, defaultTab }) => (
    <div data-testid="mock-analytics-dashboard">
      Mock Analytics Dashboard - Tab: {defaultTab} - Embedded: {String(embedded)}
    </div>
  ),
}));

// The visualization dashboard mock is defined via vi.hoisted so individual
// tests (e.g. the error boundary test) can swap its implementation at
// runtime with mockImplementation(). A plain vi.doMock() call inside a test
// does NOT work here because ScadaMainPage statically imports this module,
// so it's already resolved via the vi.mock() factory below before any test
// body runs.
const { mockVisualizationDashboard } = vi.hoisted(() => ({
  mockVisualizationDashboard: vi.fn(),
}));

vi.mock("./visualization/ComprehensiveVisualizationDashboard", () => ({
  default: (props) => mockVisualizationDashboard(props),
}));

// Mock react-router-dom
const mockSetSearchParams = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => [
      new URLSearchParams(),
      mockSetSearchParams,
    ],
  };
});

// Mock styles
vi.mock("./Scada/ScadaStyles.css", () => ({}));
vi.mock("../styles/theme.css", () => ({}));

describe("ScadaMainPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore the default (non-throwing) implementation before every test,
    // since some tests override it (see the error boundary test below).
    mockVisualizationDashboard.mockImplementation(({ embedded, defaultTab }) => (
      <div data-testid="mock-visualization-dashboard">
        Mock Visualization Dashboard - Tab: {defaultTab} - Embedded: {String(embedded)}
      </div>
    ));
  });

  const renderWithRouter = (ui, initialEntries = ["/"]) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    );
  };

  it("should render SCADA platform with title and tabs", () => {
    renderWithRouter(<ScadaMainPage />);

    expect(screen.getByRole("heading", { name: "SCADA Platform" })).toBeInTheDocument();
    expect(screen.getByText("Real-time monitoring, alerts, and analytics")).toBeInTheDocument();
    
    expect(screen.getByRole("tab", { name: /visualization/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /alerts/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /analytics/i })).toBeInTheDocument();
  });

  it("should render visualization sub-tabs by default", () => {
    renderWithRouter(<ScadaMainPage />);

    expect(screen.getByText("Visualization Options")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gauges" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trends" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Process Flow" })).toBeInTheDocument();
  });

  it("should display visualization dashboard when on visualization tab", () => {
    renderWithRouter(<ScadaMainPage />);

    expect(screen.getByTestId("mock-visualization-dashboard")).toBeInTheDocument();
    expect(screen.getByText(/Mock Visualization Dashboard/)).toBeInTheDocument();
  });

  it("should switch to Alerts tab when clicked", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaMainPage />);

    const alertsTab = screen.getByRole("tab", { name: /alerts/i });
    await user.click(alertsTab);

    expect(screen.getByTestId("mock-alerts-dashboard")).toBeInTheDocument();
    expect(screen.getByText(/Mock Alerts Dashboard/)).toBeInTheDocument();
  });

  it("should switch to Analytics tab when clicked", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaMainPage />);

    const analyticsTab = screen.getByRole("tab", { name: /analytics/i });
    await user.click(analyticsTab);

    expect(screen.getByTestId("mock-analytics-dashboard")).toBeInTheDocument();
    expect(screen.getByText(/Mock Analytics Dashboard/)).toBeInTheDocument();
  });

  it("should switch visualization sub-tabs correctly", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaMainPage />);

    // Initially on Overview
    expect(screen.getByText(/Tab: overview/)).toBeInTheDocument();

    // Click Gauges
    const gaugesButton = screen.getByRole("button", { name: "Gauges" });
    await user.click(gaugesButton);

    expect(screen.getByText(/Tab: gauges/)).toBeInTheDocument();

    // Click Trends
    const trendsButton = screen.getByRole("button", { name: "Trends" });
    await user.click(trendsButton);

    expect(screen.getByText(/Tab: trends/)).toBeInTheDocument();

    // Click Process Flow
    const processFlowButton = screen.getByRole("button", { name: "Process Flow" });
    await user.click(processFlowButton);

    expect(screen.getByText(/Tab: process/)).toBeInTheDocument();
  });

  it("should switch analytics sub-tabs correctly", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaMainPage />);

    // Switch to Analytics tab first
    const analyticsTab = screen.getByRole("tab", { name: /analytics/i });
    await user.click(analyticsTab);

    // Initially on Performance
    expect(screen.getByText(/Tab: performance/)).toBeInTheDocument();

    // Click Equipment Health
    const healthButton = screen.getByRole("button", { name: "Equipment Health" });
    await user.click(healthButton);

    expect(screen.getByText(/Tab: health/)).toBeInTheDocument();

    // Click Energy
    const energyButton = screen.getByRole("button", { name: "Energy" });
    await user.click(energyButton);

    expect(screen.getByText(/Tab: energy/)).toBeInTheDocument();

    // Click Predictive
    const predictiveButton = screen.getByRole("button", { name: "Predictive" });
    await user.click(predictiveButton);

    expect(screen.getByText(/Tab: predictive/)).toBeInTheDocument();
  });

  it("should update URL when main tab changes", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaMainPage />);

    const alertsTab = screen.getByRole("tab", { name: /alerts/i });
    await user.click(alertsTab);

    expect(mockSetSearchParams).toHaveBeenCalledWith(
      { tab: "alerts" },
      { replace: true }
    );
  });

  it("should update URL when visualization sub-tab changes", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaMainPage />);

    const gaugesButton = screen.getByRole("button", { name: "Gauges" });
    await user.click(gaugesButton);

    expect(mockSetSearchParams).toHaveBeenCalledWith(
      { tab: "visualization", subtab: "gauges" },
      { replace: true }
    );
  });

  it("should update URL when analytics sub-tab changes", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaMainPage />);

    // Switch to Analytics first
    const analyticsTab = screen.getByRole("tab", { name: /analytics/i });
    await user.click(analyticsTab);

    const healthButton = screen.getByRole("button", { name: "Equipment Health" });
    await user.click(healthButton);

    expect(mockSetSearchParams).toHaveBeenCalledWith(
      { tab: "analytics", subtab: "health" },
      { replace: true }
    );
  });

  it("should render with custom className", () => {
    const { container } = renderWithRouter(
      <ScadaMainPage className="custom-scada-class" />
    );

    expect(container.firstChild).toHaveClass("custom-scada-class");
  });

  it("should handle error boundary and display error UI", () => {
    // Force the visualization dashboard mock to throw during render so the
    // ScadaErrorBoundary catches it. Swapping mockImplementation() on the
    // vi.hoisted mock works because ScadaMainPage's import already resolves
    // to this mock function (unlike vi.doMock, which can't affect an
    // already-resolved static import).
    mockVisualizationDashboard.mockImplementation(() => {
      throw new Error("Test error");
    });

    // React logs caught errors to console.error; suppress the noise here.
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithRouter(<ScadaMainPage />);

    // Error boundary should catch and display error UI
    expect(screen.getByText("SCADA Page Error")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload Page" })).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should maintain sub-tab state when switching between main tabs", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaMainPage />);

    // Go to Gauges sub-tab
    const gaugesButton = screen.getByRole("button", { name: "Gauges" });
    await user.click(gaugesButton);
    expect(screen.getByText(/Tab: gauges/)).toBeInTheDocument();

    // Switch to Analytics
    const analyticsTab = screen.getByRole("tab", { name: /analytics/i });
    await user.click(analyticsTab);
    expect(screen.getByText(/Tab: performance/)).toBeInTheDocument();

    // Switch back to Visualization - should remember Gauges
    const visualizationTab = screen.getByRole("tab", { name: /visualization/i });
    await user.click(visualizationTab);
    expect(screen.getByText(/Tab: gauges/)).toBeInTheDocument();
  });

  it("should render all visualization sub-tab icons", () => {
    renderWithRouter(<ScadaMainPage />);

    // Check that all icon buttons are present with correct labels
    expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gauges" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trends" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Process Flow" })).toBeInTheDocument();
  });

  it("should render all analytics sub-tab icons", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaMainPage />);

    // Switch to Analytics tab
    const analyticsTab = screen.getByRole("tab", { name: /analytics/i });
    await user.click(analyticsTab);

    // Check that all analytics sub-tabs are present
    expect(screen.getByRole("button", { name: "Performance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Equipment Health" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Energy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Predictive" })).toBeInTheDocument();
  });

  it("should display active state on visualization sub-tabs", () => {
    renderWithRouter(<ScadaMainPage />);

    const overviewButton = screen.getByRole("button", { name: "Overview" });
    expect(overviewButton).toHaveAttribute("data-state", "active");

    const gaugesButton = screen.getByRole("button", { name: "Gauges" });
    expect(gaugesButton).toHaveAttribute("data-state", "inactive");
  });

  it("should display active state on analytics sub-tabs", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaMainPage />);

    // Switch to Analytics tab
    const analyticsTab = screen.getByRole("tab", { name: /analytics/i });
    await user.click(analyticsTab);

    const performanceButton = screen.getByRole("button", { name: "Performance" });
    expect(performanceButton).toHaveAttribute("data-state", "active");

    const healthButton = screen.getByRole("button", { name: "Equipment Health" });
    expect(healthButton).toHaveAttribute("data-state", "inactive");
  });

  it("should handle tab switching with userEvent", async () => {
    // Radix's Tabs.Trigger needs the fuller pointer/focus event sequence
    // that userEvent simulates to activate a tab; a bare fireEvent.click
    // doesn't reliably trigger Radix's internal activation logic.
    const user = userEvent.setup();
    renderWithRouter(<ScadaMainPage />);

    const alertsTab = screen.getByRole("tab", { name: /alerts/i });
    await user.click(alertsTab);

    expect(screen.getByTestId("mock-alerts-dashboard")).toBeInTheDocument();
  });
});
```
