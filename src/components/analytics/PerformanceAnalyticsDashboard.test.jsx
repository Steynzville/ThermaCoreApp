import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import PerformanceAnalyticsDashboard from "./PerformanceAnalyticsDashboard";

// Mock services and contexts
vi.mock("../../services/analyticsService", () => ({
  default: {
    generateMockPerformanceMetrics: vi.fn(),
    generateMockEquipmentHealth: vi.fn(),
    generateMockEnergyConsumption: vi.fn(),
    generateReport: vi.fn(),
  },
}));

vi.mock("../../context/TenantContext", () => ({
  useTenant: vi.fn(),
}));

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="xaxis" />,
  YAxis: () => <div data-testid="yaxis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

// Mock UI components
vi.mock("../ui/badge", () => ({
  Badge: ({ children, variant }) => <span data-testid="badge" data-variant={variant}>{children}</span>,
}));

vi.mock("../ui/button", () => ({
  Button: ({ children, onClick, disabled, variant, size, className }) => (
    <button
      data-testid="button"
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock("../ui/card", () => ({
  Card: ({ children, className }) => <div data-testid="card" className={className}>{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardContent: ({ children, className }) => <div data-testid="card-content" className={className}>{children}</div>,
  CardTitle: ({ children, className }) => <div data-testid="card-title" className={className}>{children}</div>,
}));

vi.mock("../ui/select", () => ({
  Select: ({ children, value, onValueChange }) => (
    <div data-testid="select" data-value={value}>
      <select
        data-testid="select-native"
        value={value}
        onChange={(e) => onValueChange && onValueChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  ),
  SelectTrigger: ({ children, className }) => <div data-testid="select-trigger" className={className}>{children}</div>,
  SelectValue: () => <span data-testid="select-value">Select value</span>,
  SelectContent: ({ children }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }) => <option data-testid="select-item" value={value}>{children}</option>,
}));

// Tabs mock: the real shadcn/Radix Tabs only mounts the TabsContent panel
// matching the active value, and TabsTrigger clicks call onValueChange.
// A naive mock that just renders `children` unconditionally would render
// ALL FOUR panels simultaneously (Performance + Health + Energy +
// Predictive all at once), which breaks getByText everywhere since device
// names like "Turbine 1" appear in every panel. This mock uses shared
// closure state (set by Tabs on every render) so TabsContent can check
// whether its `value` matches the currently active tab, and TabsTrigger
// can actually trigger a tab switch.
vi.mock("../ui/tabs", () => {
  let activeValue;
  let changeHandler;

  return {
    Tabs: ({ children, value, onValueChange }) => {
      activeValue = value;
      changeHandler = onValueChange;
      return (
        <div data-testid="tabs" data-value={value}>
          {children}
        </div>
      );
    },
    TabsList: ({ children, className }) => (
      <div data-testid="tabs-list" className={className}>
        {children}
      </div>
    ),
    TabsTrigger: ({ children, value }) => (
      <button
        data-testid="tabs-trigger"
        data-value={value}
        onClick={() => changeHandler && changeHandler(value)}
      >
        {children}
      </button>
    ),
    TabsContent: ({ children, value }) => {
      if (activeValue !== value) return null;
      return (
        <div data-testid="tabs-content" data-value={value}>
          {children}
        </div>
      );
    },
  };
});

// Mock icons
vi.mock("lucide-react", () => ({
  Activity: () => <span data-testid="activity-icon">Activity</span>,
  AlertCircle: () => <span data-testid="alert-icon">AlertCircle</span>,
  BarChart3: () => <span data-testid="barchart-icon">BarChart3</span>,
  Calendar: () => <span data-testid="calendar-icon">Calendar</span>,
  Download: () => <span data-testid="download-icon">Download</span>,
  Shield: () => <span data-testid="shield-icon">Shield</span>,
  TrendingUp: () => <span data-testid="trending-icon">TrendingUp</span>,
  Zap: () => <span data-testid="zap-icon">Zap</span>,
}));

// Import mocked modules
import analyticsService from "../../services/analyticsService";
import { useTenant } from "../../context/TenantContext";

const mockPerformanceMetrics = {
  overall: {
    efficiency: 88,
    uptime: 99,
    availability: 95,
    quality: 99.5,
  },
  trends: {
    efficiency: [
      { hour: "00:00", value: 85 },
      { hour: "01:00", value: 88 },
    ],
  },
  byDevice: [
    { id: "device-1", name: "Turbine 1", status: "running", efficiency: 90, uptime: 98 },
    { id: "device-2", name: "Pump 1", status: "running", efficiency: 85, uptime: 97 },
  ],
};

const mockEquipmentHealth = {
  overall: {
    score: 87,
    lastMaintenance: "2026-07-01T00:00:00Z",
    nextMaintenance: "2026-08-01T00:00:00Z",
  },
  devices: [
    {
      id: "device-1",
      name: "Turbine 1",
      status: "healthy",
      healthScore: 92,
      sensors: {
        temperature: "good",
        pressure: "good",
        flow: "good",
      },
      predictions: {
        remainingLifetime: 85,
        maintenanceDue: 14,
      },
    },
    {
      id: "device-2",
      name: "Pump 1",
      status: "warning",
      healthScore: 75,
      sensors: {
        temperature: "good",
        pressure: "warning",
        flow: "good",
      },
      predictions: {
        remainingLifetime: 60,
        maintenanceDue: 7,
      },
    },
  ],
};

const mockEnergyData = {
  total: 4500,
  average: 642,
  peak: 850,
  savings: 12,
  timeline: [
    { date: "2026-07-01", consumption: 600 },
    { date: "2026-07-02", consumption: 650 },
  ],
  byDevice: [
    { id: "device-1", name: "Turbine 1", consumption: 4500, percentage: 100 },
    { id: "device-2", name: "Pump 1", consumption: 3000, percentage: 67 },
  ],
};

describe("PerformanceAnalyticsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTenant.mockReturnValue({
      currentTenant: { id: "tenant-1", name: "Tenant 1" },
    });
    analyticsService.generateMockPerformanceMetrics.mockReturnValue(mockPerformanceMetrics);
    analyticsService.generateMockEquipmentHealth.mockReturnValue(mockEquipmentHealth);
    analyticsService.generateMockEnergyConsumption.mockReturnValue(mockEnergyData);
    analyticsService.generateReport.mockResolvedValue({
      success: true,
      type: "blob",
      data: new Blob(["test"]),
    });
  });

  it("should load analytics data on mount", async () => {
    // The component's load effect is synchronous (no real await), so by
    // the time render() returns, React has already flushed past the
    // initial "loading" render into the loaded state — the
    // "Loading analytics..." text is never actually observable here.
    // Assert what's actually verifiable: the service functions ran and
    // the dashboard ends up populated.
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Performance Trends")).toBeInTheDocument();
    });

    expect(analyticsService.generateMockPerformanceMetrics).toHaveBeenCalled();
    expect(analyticsService.generateMockEquipmentHealth).toHaveBeenCalled();
    expect(analyticsService.generateMockEnergyConsumption).toHaveBeenCalledWith(7);
  });

  it("should render full dashboard when not embedded", async () => {
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Performance Analytics")).toBeInTheDocument();
      expect(screen.getByText("Comprehensive system analytics and reporting")).toBeInTheDocument();
      expect(screen.getByText("Last 7 Days")).toBeInTheDocument();
    });
  });

  it("should render embedded dashboard without header", async () => {
    render(<PerformanceAnalyticsDashboard embedded={true} />);

    await waitFor(() => {
      expect(screen.queryByText("Performance Analytics")).not.toBeInTheDocument();
      expect(screen.queryByText("Last 7 Days")).not.toBeInTheDocument();
    });
  });

  it("should display performance KPI cards", async () => {
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      // "Efficiency"/"Uptime" are used both as the KPI card label AND as
      // the per-device sub-label in the Device Performance list below, so
      // they appear 3 times each — assert presence via getAllByText and
      // rely on the (unique) percentage values for the real check.
      expect(screen.getAllByText("Efficiency").length).toBeGreaterThan(0);
      expect(screen.getByText("88%")).toBeInTheDocument();
      expect(screen.getAllByText("Uptime").length).toBeGreaterThan(0);
      expect(screen.getByText("99%")).toBeInTheDocument();
      expect(screen.getByText("Availability")).toBeInTheDocument();
      expect(screen.getByText("95%")).toBeInTheDocument();
      expect(screen.getByText("Quality")).toBeInTheDocument();
      expect(screen.getByText("99.5%")).toBeInTheDocument();
    });
  });

  it("should display performance trends chart", async () => {
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Performance Trends")).toBeInTheDocument();
      expect(screen.getByTestId("area-chart")).toBeInTheDocument();
    });
  });

  it("should display device performance list", async () => {
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Device Performance")).toBeInTheDocument();
      expect(screen.getByText("Turbine 1")).toBeInTheDocument();
      expect(screen.getByText("Pump 1")).toBeInTheDocument();
    });
  });

  it("should switch tabs", async () => {
    const user = userEvent.setup();
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Performance Trends")).toBeInTheDocument();
    });

    // Find and click Equipment Health tab
    const tabs = screen.getAllByTestId("tabs-trigger");
    const healthTab = tabs.find(tab => tab.textContent.includes("Equipment Health"));
    await user.click(healthTab);

    await waitFor(() => {
      expect(screen.getByText("Overall System Health")).toBeInTheDocument();
      expect(screen.getByText("87")).toBeInTheDocument();
    });
  });

  it("should display equipment health tab content", async () => {
    const user = userEvent.setup();
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Performance Trends")).toBeInTheDocument();
    });

    const tabs = screen.getAllByTestId("tabs-trigger");
    const healthTab = tabs.find(tab => tab.textContent.includes("Equipment Health"));
    await user.click(healthTab);

    await waitFor(() => {
      expect(screen.getByText("Overall System Health")).toBeInTheDocument();
      expect(screen.getByText("Status: Healthy")).toBeInTheDocument();
      expect(screen.getByText("Turbine 1")).toBeInTheDocument();
      expect(screen.getByText("Pump 1")).toBeInTheDocument();
    });
  });

  it("should display energy tab content", async () => {
    const user = userEvent.setup();
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Performance Trends")).toBeInTheDocument();
    });

    const tabs = screen.getAllByTestId("tabs-trigger");
    const energyTab = tabs.find(tab => tab.textContent.includes("Energy"));
    await user.click(energyTab);

    await waitFor(() => {
      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText("4500")).toBeInTheDocument();
      // "kWh" is used as a standalone label on both the Total card and
      // the Peak card, so it appears twice.
      expect(screen.getAllByText("kWh").length).toBeGreaterThan(0);
      expect(screen.getByText("Average")).toBeInTheDocument();
      expect(screen.getByText("642")).toBeInTheDocument();
    });
  });

  it("should display predictive maintenance tab content", async () => {
    const user = userEvent.setup();
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Performance Trends")).toBeInTheDocument();
    });

    const tabs = screen.getAllByTestId("tabs-trigger");
    const predictiveTab = tabs.find(tab => tab.textContent.includes("Predictive"));
    await user.click(predictiveTab);

    await waitFor(() => {
      expect(screen.getByText("Predictive Maintenance Insights")).toBeInTheDocument();
      expect(screen.getByText("Maintenance Recommended")).toBeInTheDocument();
      // "Remaining Lifetime" is rendered once per device (2 devices).
      expect(screen.getAllByText("Remaining Lifetime").length).toBeGreaterThan(0);
    });
  });

  it("should handle timeframe change", async () => {
    const user = userEvent.setup();
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Performance Trends")).toBeInTheDocument();
    });

    const select = screen.getByTestId("select-native");
    await user.selectOptions(select, "30d");

    expect(analyticsService.generateMockEnergyConsumption).toHaveBeenCalledWith(30);
  });

  it("should handle export report", async () => {
    const user = userEvent.setup();
    // Mock URL.createObjectURL and document.createElement
    const mockCreateObjectURL = vi.fn(() => "blob:test");
    const mockRevokeObjectURL = vi.fn();
    const mockClick = vi.fn();
    const mockRemove = vi.fn();

    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Capture the REAL createElement before overriding it. The original
    // version called `document.createElement(tag)` inside its own
    // fallback branch — since that reassigns document.createElement to
    // itself, any non-"a" tag (i.e. every div/button/etc React renders)
    // recursed into the mock infinitely and crashed the test.
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tag) => {
        if (tag === "a") {
          return {
            href: "",
            download: "",
            click: mockClick,
            remove: mockRemove,
          };
        }
        return originalCreateElement(tag);
      });

    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Performance Trends")).toBeInTheDocument();
    });

    const buttons = screen.getAllByTestId("button");
    const exportButton = buttons.find(btn => btn.textContent.includes("Export"));
    await user.click(exportButton);

    // handleExportReport is async and not awaited by the onClick handler,
    // so give it a tick to resolve before asserting.
    await waitFor(() => {
      expect(analyticsService.generateReport).toHaveBeenCalledWith(
        expect.objectContaining({
          reportType: "performance",
          format: "csv",
        })
      );
    });

    createElementSpy.mockRestore();
  });

  it("should display energy consumption chart", async () => {
    const user = userEvent.setup();
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Performance Trends")).toBeInTheDocument();
    });

    const tabs = screen.getAllByTestId("tabs-trigger");
    const energyTab = tabs.find(tab => tab.textContent.includes("Energy"));
    await user.click(energyTab);

    await waitFor(() => {
      expect(screen.getByText("Energy Consumption Trend")).toBeInTheDocument();
      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    });
  });

  it("should display energy pie chart", async () => {
    const user = userEvent.setup();
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Performance Trends")).toBeInTheDocument();
    });

    const tabs = screen.getAllByTestId("tabs-trigger");
    const energyTab = tabs.find(tab => tab.textContent.includes("Energy"));
    await user.click(energyTab);

    await waitFor(() => {
      expect(screen.getByText("Consumption by Device")).toBeInTheDocument();
      expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    });
  });

  it("should display device breakdown in energy tab", async () => {
    const user = userEvent.setup();
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Performance Trends")).toBeInTheDocument();
    });

    const tabs = screen.getAllByTestId("tabs-trigger");
    const energyTab = tabs.find(tab => tab.textContent.includes("Energy"));
    await user.click(energyTab);

    await waitFor(() => {
      expect(screen.getByText("Device Breakdown")).toBeInTheDocument();
      expect(screen.getByText("Turbine 1")).toBeInTheDocument();
      expect(screen.getByText("Pump 1")).toBeInTheDocument();
    });
  });

  it("should display sensor status in health tab", async () => {
    const user = userEvent.setup();
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Performance Trends")).toBeInTheDocument();
    });

    const tabs = screen.getAllByTestId("tabs-trigger");
    const healthTab = tabs.find(tab => tab.textContent.includes("Equipment Health"));
    await user.click(healthTab);

    await waitFor(() => {
      expect(screen.getByText("Sensor Status")).toBeInTheDocument();
      expect(screen.getAllByText("good").length).toBeGreaterThan(0);
      expect(screen.getAllByText("warning").length).toBeGreaterThan(0);
    });
  });

  it("should display maintenance recommendations", async () => {
    const user = userEvent.setup();
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Performance Trends")).toBeInTheDocument();
    });

    const tabs = screen.getAllByTestId("tabs-trigger");
    const predictiveTab = tabs.find(tab => tab.textContent.includes("Predictive"));
    await user.click(predictiveTab);

    await waitFor(() => {
      expect(screen.getByText("Maintenance Recommended")).toBeInTheDocument();
    });
  });

  it("should display health score with correct color", async () => {
    const user = userEvent.setup();
    render(<PerformanceAnalyticsDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Performance Trends")).toBeInTheDocument();
    });

    const tabs = screen.getAllByTestId("tabs-trigger");
    const healthTab = tabs.find(tab => tab.textContent.includes("Equipment Health"));
    await user.click(healthTab);

    await waitFor(() => {
      expect(screen.getByText("87")).toBeInTheDocument();
      expect(screen.getByText("92")).toBeInTheDocument();
      expect(screen.getByText("75")).toBeInTheDocument();
    });
  });

  it("should handle defaultTab prop", async () => {
    render(<PerformanceAnalyticsDashboard embedded={false} defaultTab="health" />);

    await waitFor(() => {
      expect(screen.getByText("Overall System Health")).toBeInTheDocument();
    });
  });

  it("should use defaultTab when embedded", async () => {
    render(<PerformanceAnalyticsDashboard embedded={true} defaultTab="energy" />);

    await waitFor(() => {
      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText("4500")).toBeInTheDocument();
    });
  });
});
