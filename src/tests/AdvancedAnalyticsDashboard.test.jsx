/**
 * Tests for AdvancedAnalyticsDashboard Component
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdvancedAnalyticsDashboard, { generateMockData } from "../components/AdvancedAnalyticsDashboard";

// Mock heavy charting and layout libraries
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }) => <div style={{ width: "100%", height: "100%" }}>{children}</div>,
    LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
    BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
    AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
    PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
    Pie: () => <div data-testid="pie">Pie</div>,
    Cell: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
    Line: () => <span>Line</span>,
    Bar: () => <span>Bar</span>,
    Area: () => null,
  };
});

// Mock Ag-Grid
vi.mock("ag-grid-react", () => ({
  AgGridReact: () => <div data-testid="mock-ag-grid">Grid Mock</div>,
}));

// Mock realtime data hooks with correct shape
vi.mock("../hooks/useRealtimeData", () => ({
  useRealtimeMetrics: () => ({
    metrics: {
      activeUnits: { value: 9, percentage: 75 },
      dataPoints: { count: 5000 },
      temperature: { current: 70.1, max: 95.0 },
      dataQuality: { score: 88.8 },
    },
    connectionStatus: "connected",
  }),
  useRealtimeProtocolStatus: () => ({
    protocols: [{ id: "modbus-1", name: "Modbus", status: "connected" }],
    isConnected: true,
  }),
}));

// Mock UI components
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }) => <span data-variant={variant}>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }) => <div>{children}</div>,
  CardDescription: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardTitle: ({ children }) => <div>{children}</div>,
}));

// Use React.createElement to avoid JSX transform issues
vi.mock("@/components/ui/select", () => {
  const React = require("react");
  return {
    Select: ({ value, onValueChange }) =>
      React.createElement(
        "div",
        { "data-testid": "select" },
        React.createElement(
          "select",
          {
            "data-testid": "select-trigger",
            value: value || "24h",
            onChange: (e) => onValueChange(e.target.value),
          },
          React.createElement("option", { value: "1h" }, "Last Hour"),
          React.createElement("option", { value: "24h" }, "Last 24h"),
          React.createElement("option", { value: "7d" }, "Last 7 Days"),
          React.createElement("option", { value: "30d" }, "Last 30 Days")
        )
      ),
    SelectContent: ({ children }) => children,
    SelectItem: () => null,
    SelectTrigger: ({ children }) => children,
    SelectValue: () => null,
  };
});

vi.mock("@/components/ui/tabs", () => {
  const React = require("react");
  return {
    Tabs: ({ children, defaultValue }) => {
      const [active, setActive] = React.useState(defaultValue);
      return React.Children.map(children, (child) =>
        React.cloneElement(child, { activeTab: active, onTabChange: setActive })
      );
    },
    TabsList: ({ children, activeTab, onTabChange }) =>
      React.createElement(
        "div",
        null,
        React.Children.map(children, (c) =>
          React.cloneElement(c, { activeTab, onTabChange })
        )
      ),
    TabsTrigger: ({ children, value, onTabChange }) =>
      React.createElement(
        "button",
        { "data-tab-value": value, onClick: () => onTabChange(value) },
        children
      ),
    TabsContent: ({ children, value, activeTab }) =>
      activeTab === value
        ? React.createElement("div", { "data-testid": `tab-content-${value}` }, children)
        : null,
  };
});

describe("AdvancedAnalyticsDashboard", () => {
  // Simple wait helper - just use a real setTimeout
  const waitForDataLoad = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1100));
  };

  // ============================================================
  // LOADING STATE TESTS
  // ============================================================
  describe("Loading state", () => {
    it("should show loading spinner initially", () => {
      render(<AdvancedAnalyticsDashboard />);
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
      expect(screen.getByText("Loading analytics dashboard...")).toBeInTheDocument();
    });

    it("should render dashboard content after data loads", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      expect(screen.getByText("Advanced Analytics")).toBeInTheDocument();
      expect(screen.getByText("Active Units")).toBeInTheDocument();
    });
  });

  // ============================================================
  // OVERVIEW CARDS TESTS
  // ============================================================
  describe("Overview cards", () => {
    it("should display active units count", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      expect(screen.getByText("9/12")).toBeInTheDocument();
      expect(screen.getByText(/75.0% uptime/)).toBeInTheDocument();
    });

    it("should display data points count", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      expect(screen.getByText("5,000")).toBeInTheDocument();
      expect(screen.getByText("8.3% from last week")).toBeInTheDocument();
    });

    it("should display average temperature", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      expect(screen.getByText("70.1°C")).toBeInTheDocument();
      expect(screen.getByText("Max: 95.0°C")).toBeInTheDocument();
    });

    it("should display data quality score", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      expect(screen.getByText("88.8%")).toBeInTheDocument();
    });
  });

  // ============================================================
  // LIVE BADGE TESTS
  // ============================================================
  describe("Live badge", () => {
    it("should show Live badge when connectionStatus is connected", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      expect(screen.getByText("Live")).toBeInTheDocument();
    });
  });

  // ============================================================
  // TIME RANGE SELECT TESTS
  // ============================================================
  describe("Time range select", () => {
    it("should default to 24h", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const select = screen.getByTestId("select-trigger");
      expect(select).toHaveValue("24h");
    });

    it("should update when selection changes", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const select = screen.getByTestId("select-trigger");
      fireEvent.change(select, { target: { value: "7d" } });
      
      // Allow time for state to update
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      expect(select).toHaveValue("7d");
    });

    it("should update data when time range changes", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      // Initial data points should be 5,000
      expect(screen.getByText("5,000")).toBeInTheDocument();

      // Change to 7d
      const select = screen.getByTestId("select-trigger");
      fireEvent.change(select, { target: { value: "7d" } });

      // Wait for data to update
      await waitForDataLoad();

      // Data points should now be scaled by 7x
      await waitFor(() => {
        expect(screen.getByText("35,000")).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it("should update alert period days when time range changes", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      // Switch to Alerts tab
      const alertsTab = screen.getByText("Alert Analysis");
      fireEvent.click(alertsTab);

      // Default is 1-day for 24h range
      expect(screen.getByText("1-day alert analysis")).toBeInTheDocument();

      // Change to 30d
      const select = screen.getByTestId("select-trigger");
      fireEvent.change(select, { target: { value: "30d" } });

      // Wait for data to update
      await waitForDataLoad();

      // Should now show "30-day alert analysis"
      await waitFor(() => {
        expect(screen.getByText("30-day alert analysis")).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  // ============================================================
  // TAB SWITCHING TESTS
  // ============================================================
  describe("Tab switching", () => {
    it("should show Trends tab by default", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      // Check that all tab triggers are rendered
      expect(screen.getByText("Trends & Performance")).toBeInTheDocument();
      expect(screen.getByText("Anomaly Detection")).toBeInTheDocument();
      expect(screen.getByText("Alert Analysis")).toBeInTheDocument();
      expect(screen.getByText("Unit Comparison")).toBeInTheDocument();

      // Verify only the active tab content is visible
      expect(screen.getByTestId("tab-content-trends")).toBeInTheDocument();
      expect(screen.queryByTestId("tab-content-anomalies")).not.toBeInTheDocument();
      expect(screen.queryByTestId("tab-content-alerts")).not.toBeInTheDocument();
      expect(screen.queryByTestId("tab-content-units")).not.toBeInTheDocument();
    });

    it("should switch to Anomalies tab", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const anomaliesTab = screen.getByText("Anomaly Detection");
      fireEvent.click(anomaliesTab);
      
      // Wait for tab content to update
      await waitFor(() => {
        expect(screen.getByText("Recent Anomalies")).toBeInTheDocument();
      });

      // Verify only the active tab content is visible
      expect(screen.getByTestId("tab-content-anomalies")).toBeInTheDocument();
      expect(screen.queryByTestId("tab-content-trends")).not.toBeInTheDocument();
    });

    it("should switch to Alert Analysis tab", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const alertsTab = screen.getByText("Alert Analysis");
      fireEvent.click(alertsTab);
      
      await waitFor(() => {
        expect(screen.getByText("Alert Patterns")).toBeInTheDocument();
      });

      expect(screen.getByTestId("tab-content-alerts")).toBeInTheDocument();
      expect(screen.queryByTestId("tab-content-trends")).not.toBeInTheDocument();
    });

    it("should switch to Unit Comparison tab", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const unitsTab = screen.getByText("Unit Comparison");
      fireEvent.click(unitsTab);
      
      await waitFor(() => {
        expect(screen.getByText("Boiler Alpha")).toBeInTheDocument();
      });

      expect(screen.getByTestId("tab-content-units")).toBeInTheDocument();
      expect(screen.queryByTestId("tab-content-trends")).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // PERFORMANCE COLOR TESTS
  // ============================================================
  describe("Performance color", () => {
    it("should show green for scores >= 90", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const unitsTab = screen.getByText("Unit Comparison");
      fireEvent.click(unitsTab);
      
      const boilerAlpha = screen.getByText("Boiler Alpha");
      const parent = boilerAlpha.closest('[class*="flex items-center justify-between"]');
      const scoreElement = parent.querySelector('[class*="text-green"]');
      expect(scoreElement).toBeInTheDocument();
      expect(scoreElement.textContent).toBe("98%");
    });

    it("should show yellow for scores 70-89", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const unitsTab = screen.getByText("Unit Comparison");
      fireEvent.click(unitsTab);
      
      const chillerBeta = screen.getByText("Chiller Beta");
      const parent = chillerBeta.closest('[class*="flex items-center justify-between"]');
      const scoreElement = parent.querySelector('[class*="text-yellow"]');
      expect(scoreElement).toBeInTheDocument();
      expect(scoreElement.textContent).toBe("87%");
    });

    it("should show red for scores < 70", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const unitsTab = screen.getByText("Unit Comparison");
      fireEvent.click(unitsTab);
      
      const compressorEpsilon = screen.getByText("Compressor Epsilon");
      const parent = compressorEpsilon.closest('[class*="flex items-center justify-between"]');
      const scoreElement = parent.querySelector('[class*="text-destructive"]');
      expect(scoreElement).toBeInTheDocument();
      expect(scoreElement.textContent).toBe("45%");
    });
  });

  // ============================================================
  // ANOMALY TESTS
  // ============================================================
  describe("Anomalies", () => {
    it("should display anomaly list", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const anomaliesTab = screen.getByText("Anomaly Detection");
      fireEvent.click(anomaliesTab);
      
      await waitFor(() => {
        const sensorIds = screen.getAllByText(/SENS_/);
        expect(sensorIds.length).toBeGreaterThan(0);
      });
      
      expect(screen.getByText("Score: 4.2")).toBeInTheDocument();
      expect(screen.getByText("Score: 3.8")).toBeInTheDocument();
    });

    it("should show temperature unit for temperature anomalies", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const anomaliesTab = screen.getByText("Anomaly Detection");
      fireEvent.click(anomaliesTab);
      
      await waitFor(() => {
        expect(screen.getByText("95.2°C")).toBeInTheDocument();
      });
    });

    it("should show pressure unit for pressure anomalies", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const anomaliesTab = screen.getByText("Anomaly Detection");
      fireEvent.click(anomaliesTab);
      
      await waitFor(() => {
        expect(screen.getByText("145.8 PSI")).toBeInTheDocument();
      });
    });

    it("should calculate average confidence correctly", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const anomaliesTab = screen.getByText("Anomaly Detection");
      fireEvent.click(anomaliesTab);
      
      await waitFor(() => {
        expect(screen.getByText("90.8%")).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // ALERT PATTERN TESTS
  // ============================================================
  describe("Alert patterns", () => {
    it("should display total alerts", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const alertsTab = screen.getByText("Alert Analysis");
      fireEvent.click(alertsTab);
      
      await waitFor(() => {
        expect(screen.getByText("23")).toBeInTheDocument();
        expect(screen.getByText("Total Alerts")).toBeInTheDocument();
      });
    });

    it("should display daily average alerts", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const alertsTab = screen.getByText("Alert Analysis");
      fireEvent.click(alertsTab);
      
      await waitFor(() => {
        expect(screen.getByText("3.3")).toBeInTheDocument();
        expect(screen.getByText("Daily Average")).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // UNIT COMPARISON TESTS
  // ============================================================
  describe("Unit comparison", () => {
    it("should display all units", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const unitsTab = screen.getByText("Unit Comparison");
      fireEvent.click(unitsTab);
      
      await waitFor(() => {
        expect(screen.getByText("Boiler Alpha")).toBeInTheDocument();
        expect(screen.getByText("Chiller Beta")).toBeInTheDocument();
        expect(screen.getByText("HVAC Gamma")).toBeInTheDocument();
        expect(screen.getByText("Pump Delta")).toBeInTheDocument();
        expect(screen.getByText("Compressor Epsilon")).toBeInTheDocument();
      });
    });

    it("should display performance scores for each unit", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const unitsTab = screen.getByText("Unit Comparison");
      fireEvent.click(unitsTab);
      
      await waitFor(() => {
        expect(screen.getByText("98%")).toBeInTheDocument();
        expect(screen.getByText("87%")).toBeInTheDocument();
        expect(screen.getByText("92%")).toBeInTheDocument();
        expect(screen.getByText("76%")).toBeInTheDocument();
        expect(screen.getByText("45%")).toBeInTheDocument();
      });
    });

    it("should display status badges for each unit", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const unitsTab = screen.getByText("Unit Comparison");
      fireEvent.click(unitsTab);
      
      const badges = document.querySelectorAll('[data-variant]');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // CHART RENDERING TESTS
  // ============================================================
  describe("Charts", () => {
    it("should render line chart in Trends tab", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("should render bar chart in Trends tab", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    });

    it("should render pie chart in Alerts tab", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      const alertsTab = screen.getByText("Alert Analysis");
      fireEvent.click(alertsTab);
      
      await waitFor(() => {
        expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
        expect(screen.getByTestId("pie")).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // REAL-TIME BUTTON TESTS
  // ============================================================
  describe("Real-time button", () => {
    it("should render Real-time button", async () => {
      render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();

      expect(screen.getByText("Real-time")).toBeInTheDocument();
    });
  });

  // ============================================================
  // COMPONENT LIFECYCLE TESTS
  // ============================================================
  describe("Component lifecycle", () => {
    it("should mount and unmount without errors", async () => {
      const { unmount } = render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();
      expect(() => unmount()).not.toThrow();
    });

    it("should handle multiple renders", async () => {
      const { rerender } = render(<AdvancedAnalyticsDashboard />);
      await waitForDataLoad();
      expect(() => rerender(<AdvancedAnalyticsDashboard />)).not.toThrow();
    });
  });
});

// ============================================================
// GENERATE MOCK DATA UNIT TESTS
// ============================================================
describe("generateMockData", () => {
  const mockMetrics = {
    activeUnits: { value: 9, percentage: 75 },
    dataPoints: { count: 5000 },
    temperature: { current: 70.1, max: 95.0 },
    dataQuality: { score: 88.8 },
  };

  it("should generate data with default 24h range", () => {
    const data = generateMockData(mockMetrics);
    expect(data.overview.recent_readings).toBe(5000);
    expect(data.overview.active_units).toBe(9);
    expect(data.performance.avg_temperature_24h).toBe(70.1);
    expect(data.alertPatterns.period_days).toBe(1);
  });

  it("should scale data for 1h range", () => {
    const data = generateMockData(mockMetrics, "1h");
    expect(data.overview.recent_readings).toBe(500);
    expect(data.alertPatterns.period_days).toBe(0.1);
    expect(data.alertPatterns.total_potential_alerts).toBe(2);
    expect(data.unitsPerformance[0].reading_count).toBe(14);
  });

  it("should scale data for 7d range", () => {
    const data = generateMockData(mockMetrics, "7d");
    expect(data.overview.recent_readings).toBe(35000);
    expect(data.alertPatterns.period_days).toBe(7);
    expect(data.alertPatterns.total_potential_alerts).toBe(161);
    expect(data.unitsPerformance[0].reading_count).toBe(1008);
  });

  it("should scale data for 30d range", () => {
    const data = generateMockData(mockMetrics, "30d");
    expect(data.overview.recent_readings).toBe(150000);
    expect(data.alertPatterns.period_days).toBe(30);
    expect(data.unitsPerformance[0].reading_count).toBe(4320);
  });

  it("should handle unknown time range by falling back to 24h", () => {
    const data = generateMockData(mockMetrics, "unknown");
    expect(data.overview.recent_readings).toBe(5000);
    expect(data.alertPatterns.period_days).toBe(1);
    expect(data.alertPatterns.total_potential_alerts).toBe(23);
  });

  it("should handle missing metrics gracefully", () => {
    const data = generateMockData(null);
    expect(data.overview.active_units).toBe(10);
    expect(data.overview.recent_readings).toBe(2856);
    expect(data.performance.avg_temperature_24h).toBe(67.8);
    expect(data.alertPatterns.period_days).toBe(1);
  });

  it("should handle custom anomalies array", () => {
    const customAnomalies = [
      {
        sensor_id: "CUSTOM_001",
        unit_id: "UNIT001",
        sensor_type: "temperature",
        value: 100.0,
        timestamp: "2024-01-15T14:32:00Z",
        anomaly_score: 5.0,
        confidence: 95.0,
      },
    ];
    const data = generateMockData(mockMetrics, "24h", customAnomalies);
    expect(data.anomalies).toHaveLength(1);
    expect(data.anomalies[0].sensor_id).toBe("CUSTOM_001");
    expect(data.anomalies[0].value).toBe(100.0);
  });

  it("should handle empty anomalies array", () => {
    const data = generateMockData(mockMetrics, "24h", []);
    expect(data.anomalies).toHaveLength(0);
  });

  it("should use default anomalies when customAnomalies is null", () => {
    const data = generateMockData(mockMetrics, "24h", null);
    expect(data.anomalies).toHaveLength(2);
    expect(data.anomalies[0].sensor_id).toBe("SENS_001");
    expect(data.anomalies[1].sensor_id).toBe("SENS_015");
  });
});
