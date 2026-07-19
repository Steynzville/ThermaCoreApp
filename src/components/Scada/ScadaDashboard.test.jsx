import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import ScadaDashboard from "./ScadaDashboard";

// Mock child components
vi.mock("../alerts/AdvancedAlertDashboard", () => ({
  default: ({ embedded, className }) => (
    <div data-testid="mock-alerts-dashboard">
      Mock Alerts Dashboard - Embedded: {String(embedded)} - Class: {className || "none"}
    </div>
  ),
}));

vi.mock("../analytics/PerformanceAnalyticsDashboard", () => ({
  default: ({ embedded }) => (
    <div data-testid="mock-analytics-dashboard">
      Mock Analytics Dashboard - Embedded: {String(embedded)}
    </div>
  ),
}));

// Mock visualization dashboard with vi.hoisted for error boundary testing
const { mockVisualizationDashboard } = vi.hoisted(() => ({
  mockVisualizationDashboard: vi.fn().mockImplementation(({ embedded, defaultTab }) => (
    <div data-testid="mock-visualization-dashboard">
      Mock Visualization Dashboard - Tab: {defaultTab} - Embedded: {String(embedded)}
    </div>
  )),
}));

vi.mock("../visualization/ComprehensiveVisualizationDashboard", () => ({
  default: (props) => mockVisualizationDashboard(props),
}));

// Mock react-router-dom
const mockSetSearchParams = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => {
      const [searchParams, setSearchParams] = actual.useSearchParams();
      const wrappedSetSearchParams = (...args) => {
        mockSetSearchParams(...args);
        return setSearchParams(...args);
      };
      return [searchParams, wrappedSetSearchParams];
    },
  };
});

// Mock styles
vi.mock("./ScadaStyles.css", () => ({}));
vi.mock("../../styles/theme.css", () => ({}));

describe("ScadaDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the visualization dashboard mock to default implementation
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
    renderWithRouter(<ScadaDashboard />);

    expect(screen.getByRole("heading", { name: "SCADA Platform" })).toBeInTheDocument();
    expect(screen.getByText("Real-time monitoring, alerts, and analytics")).toBeInTheDocument();
    
    expect(screen.getByRole("tab", { name: /visualization/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /alerts/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /analytics/i })).toBeInTheDocument();
  });

  it("should render visualization sub-tabs by default (Trends and Process Flow)", () => {
    renderWithRouter(<ScadaDashboard />);

    expect(screen.getByText("Visualization Options")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Trends" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Process Flow" })).toBeInTheDocument();
  });

  it("should display Trends as default sub-tab", () => {
    renderWithRouter(<ScadaDashboard />);

    expect(screen.getByTestId("mock-visualization-dashboard")).toBeInTheDocument();
    expect(screen.getByText(/Tab: trends/)).toBeInTheDocument();
  });

  it("should display visualization dashboard when on visualization tab", () => {
    renderWithRouter(<ScadaDashboard />);

    expect(screen.getByTestId("mock-visualization-dashboard")).toBeInTheDocument();
    expect(screen.getByText(/Mock Visualization Dashboard/)).toBeInTheDocument();
  });

  it("should switch to Alerts tab when clicked", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaDashboard />);

    const alertsTab = screen.getByRole("tab", { name: /alerts/i });
    await user.click(alertsTab);

    expect(screen.getByTestId("mock-alerts-dashboard")).toBeInTheDocument();
    expect(screen.getByText(/Mock Alerts Dashboard/)).toBeInTheDocument();
  });

  it("should switch to Analytics tab when clicked", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaDashboard />);

    const analyticsTab = screen.getByRole("tab", { name: /analytics/i });
    await user.click(analyticsTab);

    expect(screen.getByTestId("mock-analytics-dashboard")).toBeInTheDocument();
    expect(screen.getByText(/Mock Analytics Dashboard/)).toBeInTheDocument();
  });

  it("should switch visualization sub-tabs correctly", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaDashboard />);

    // Initially on Trends
    expect(screen.getByText(/Tab: trends/)).toBeInTheDocument();

    // Click Process Flow
    const processFlowButton = screen.getByRole("tab", { name: "Process Flow" });
    await user.click(processFlowButton);

    expect(screen.getByText(/Tab: process/)).toBeInTheDocument();

    // Click Trends back
    const trendsButton = screen.getByRole("tab", { name: "Trends" });
    await user.click(trendsButton);

    expect(screen.getByText(/Tab: trends/)).toBeInTheDocument();
  });

  it("should update URL when main tab changes", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaDashboard />);

    const alertsTab = screen.getByRole("tab", { name: /alerts/i });
    await user.click(alertsTab);

    expect(mockSetSearchParams).toHaveBeenCalledWith(
      { tab: "alerts", subtab: "trends" },
      { replace: true }
    );
  });

  it("should update URL when visualization sub-tab changes", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaDashboard />);

    const processFlowButton = screen.getByRole("tab", { name: "Process Flow" });
    await user.click(processFlowButton);

    expect(mockSetSearchParams).toHaveBeenCalledWith(
      { tab: "visualization", subtab: "processflow" },
      { replace: true }
    );
  });

  it("should reset sub-tab to Trends when switching back to Visualization", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaDashboard />);

    // Go to Process Flow sub-tab
    const processFlowButton = screen.getByRole("tab", { name: "Process Flow" });
    await user.click(processFlowButton);
    expect(screen.getByText(/Tab: process/)).toBeInTheDocument();

    // Switch to Analytics
    const analyticsTab = screen.getByRole("tab", { name: /analytics/i });
    await user.click(analyticsTab);
    expect(screen.getByTestId("mock-analytics-dashboard")).toBeInTheDocument();

    // Switch back to Visualization - should reset to Trends (DEFAULT_SUBTAB)
    const visualizationTab = screen.getByRole("tab", { name: /visualization/i });
    await user.click(visualizationTab);
    expect(screen.getByText(/Tab: trends/)).toBeInTheDocument();
    expect(mockSetSearchParams).toHaveBeenCalledWith(
      { tab: "visualization", subtab: "trends" },
      { replace: true }
    );
  });

  it("should render with custom className", () => {
    const { container } = renderWithRouter(
      <ScadaDashboard className="custom-scada-class" />
    );

    expect(container.firstChild).toHaveClass("custom-scada-class");
  });

  it("should handle error boundary and display error UI", () => {
    // Force the visualization dashboard mock to throw during render
    mockVisualizationDashboard.mockImplementation(() => {
      throw new Error("Test error");
    });

    // React logs caught errors to console.error; suppress the noise here.
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithRouter(<ScadaDashboard />);

    // Error boundary should catch and display error UI
    expect(screen.getByText("SCADA Page Error")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload Page" })).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should render both visualization sub-tab icons", () => {
    renderWithRouter(<ScadaDashboard />);

    expect(screen.getByRole("tab", { name: "Trends" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Process Flow" })).toBeInTheDocument();
  });

  it("should display active state on visualization sub-tabs", () => {
    renderWithRouter(<ScadaDashboard />);

    const trendsButton = screen.getByRole("tab", { name: "Trends" });
    expect(trendsButton).toHaveAttribute("data-state", "active");
    expect(trendsButton).toHaveAttribute("aria-selected", "true");

    const processFlowButton = screen.getByRole("tab", { name: "Process Flow" });
    expect(processFlowButton).toHaveAttribute("data-state", "inactive");
    expect(processFlowButton).toHaveAttribute("aria-selected", "false");
  });

  it("should handle tab switching with userEvent", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaDashboard />);

    const alertsTab = screen.getByRole("tab", { name: /alerts/i });
    await user.click(alertsTab);

    expect(screen.getByTestId("mock-alerts-dashboard")).toBeInTheDocument();
  });

  it("should default to 'trends' sub-tab when no URL params provided", () => {
    renderWithRouter(<ScadaDashboard />);

    const trendsButton = screen.getByRole("tab", { name: "Trends" });
    expect(trendsButton).toHaveAttribute("data-state", "active");
    
    expect(screen.getByText(/Tab: trends/)).toBeInTheDocument();
  });

  it("should use URL params for initial tab state", () => {
    renderWithRouter(
      <ScadaDashboard />,
      ["/?tab=alerts"]
    );

    expect(screen.getByTestId("mock-alerts-dashboard")).toBeInTheDocument();
  });

  it("should use URL params for initial sub-tab state", () => {
    renderWithRouter(
      <ScadaDashboard />,
      ["/?tab=visualization&subtab=processflow"]
    );

    expect(screen.getByText(/Tab: process/)).toBeInTheDocument();
    const processFlowButton = screen.getByRole("tab", { name: "Process Flow" });
    expect(processFlowButton).toHaveAttribute("data-state", "active");
  });

  it("should have proper accessibility attributes on sub-tabs", () => {
    renderWithRouter(<ScadaDashboard />);
    
    const subTabList = screen.getByRole("tablist", { name: "Visualization sub-tabs" });
    expect(subTabList).toBeInTheDocument();
    
    const trendsTab = screen.getByRole("tab", { name: "Trends" });
    expect(trendsTab).toHaveAttribute("aria-selected", "true");
    expect(trendsTab).toHaveAttribute("aria-controls", "subtab-trends");
    expect(trendsTab).toHaveAttribute("id", "tab-trends");
    
    const processFlowTab = screen.getByRole("tab", { name: "Process Flow" });
    expect(processFlowTab).toHaveAttribute("aria-selected", "false");
    expect(processFlowTab).toHaveAttribute("aria-controls", "subtab-processflow");
    expect(processFlowTab).toHaveAttribute("id", "tab-processflow");
  });

  // ✅ FIXED: Hidden panels queried by id, not by accessible name
  it("should have proper tabpanel accessibility attributes", () => {
    const { container } = renderWithRouter(<ScadaDashboard />);
    
    // Visible panel can be found by accessible name
    const trendsPanel = screen.getByRole("tabpanel", { name: "Trends" });
    expect(trendsPanel).toHaveAttribute("aria-labelledby", "tab-trends");
    expect(trendsPanel).not.toHaveAttribute("hidden");
    
    // Hidden panels cannot be found by accessible name (accname spec limitation)
    // Query by id instead
    const processPanel = container.querySelector("#subtab-processflow");
    expect(processPanel).toHaveAttribute("aria-labelledby", "tab-processflow");
    expect(processPanel).toHaveAttribute("hidden");
  });

  // ✅ FIXED: Hidden panels queried by id, not by accessible name
  it("should render all sub-tab panels in the DOM but only show the active one", async () => {
    const user = userEvent.setup();
    const { container } = renderWithRouter(<ScadaDashboard />);
    
    // Visible panel - accessible by role + name
    const trendsPanel = screen.getByRole("tabpanel", { name: "Trends" });
    expect(trendsPanel).toBeInTheDocument();
    expect(trendsPanel).not.toHaveAttribute("hidden");
    
    // Hidden panel - query by id instead of accessible name
    const processPanel = container.querySelector("#subtab-processflow");
    expect(processPanel).toBeInTheDocument();
    expect(processPanel).toHaveAttribute("hidden");
    
    // Switch to Process Flow using userEvent
    const processFlowButton = screen.getByRole("tab", { name: "Process Flow" });
    await user.click(processFlowButton);
    
    // Now Process Flow should be visible and Trends hidden
    const processPanelNowVisible = screen.getByRole("tabpanel", { name: "Process Flow" });
    expect(processPanelNowVisible).not.toHaveAttribute("hidden");
    
    const trendsPanelNowHidden = container.querySelector("#subtab-trends");
    expect(trendsPanelNowHidden).toHaveAttribute("hidden");
  });

  it("should pass correct dashboardTab value to ComprehensiveVisualizationDashboard", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ScadaDashboard />);
    
    // Trends uses dashboardTab "trends"
    expect(screen.getByText(/Tab: trends/)).toBeInTheDocument();
    
    // Click Process Flow - uses dashboardTab "process"
    const processFlowButton = screen.getByRole("tab", { name: "Process Flow" });
    await user.click(processFlowButton);
    expect(screen.getByText(/Tab: process/)).toBeInTheDocument();
  });
});
