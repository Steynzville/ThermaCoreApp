/**
 * Tests for UnitDetails Component
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// ============================================================
// Mock dependencies
// ============================================================

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    userRole: "admin",
  })),
}));

vi.mock("../context/SettingsContext", () => ({
  useSettings: vi.fn(() => ({
    formatTemperature: (temp) => `${temp}°C`,
  })),
}));

vi.mock("../context/UnitContext", () => ({
  useUnits: vi.fn(() => ({
    updateUnitName: vi.fn().mockResolvedValue({}),
    updateUnitLocation: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock("../hooks/useRealtimeData", () => ({
  useRealtimeMetrics: vi.fn(() => ({
    metrics: {
      temperature: { current: 72 },
      pressure: { current: 105 },
      flow_rate_inlet: { current: 47.2 },
      flow_rate_outlet: { current: 43.8 },
    },
  })),
}));

vi.mock("../components/VitalSignGraph", () => ({
  default: ({ title }) => (
    <div data-testid="vital-sign-graph">
      <h4>{title}</h4>
      <div>Mock Graph</div>
    </div>
  ),
}));

vi.mock("../components/ui/card", () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
}));

vi.mock("../components/unit-details/UnitAlertsTab", () => ({
  default: ({ unit }) => (
    <div data-testid="alerts-tab">
      <h3>Alerts</h3>
      <div>Unit: {unit?.name || "Unknown"}</div>
    </div>
  ),
}));

vi.mock("../components/unit-details/UnitHistoryTab", () => ({
  default: () => <div data-testid="history-tab">History Tab</div>,
}));

vi.mock("../components/unit-details/UnitOverviewTab", () => ({
  default: ({ unit }) => (
    <div data-testid="overview-tab">
      <h3>Overview</h3>
      <div>Unit: {unit?.name || "Unknown"}</div>
    </div>
  ),
}));

vi.mock("../components/unit-details/UnitStatusHeader", () => ({
  default: ({ unit }) => (
    <div data-testid="unit-status-header">
      <h2>{unit?.name || "Unknown Unit"}</h2>
      <span>Status: {unit?.status || "Unknown"}</span>
    </div>
  ),
}));

vi.mock("../components/unit-details/UnitTabNavigation", () => ({
  default: ({ activeTab, setActiveTab, tabs }) => (
    <div data-testid="unit-tab-navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-testid={`tab-${tab.id}`}
          onClick={() => setActiveTab(tab.id)}
          className={activeTab === tab.id ? "active" : ""}
        >
          {tab.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../components/unit-details/UnitVitals", () => ({
  default: ({ unit }) => (
    <div data-testid="unit-vitals">
      <h3>Vitals</h3>
      <div>Unit: {unit?.name || "Unknown"}</div>
    </div>
  ),
}));

// Mock icons
vi.mock("lucide-react", () => ({
  AlertTriangle: () => <span data-testid="icon-alert-triangle">AlertTriangle</span>,
  ArrowLeft: () => <span data-testid="icon-arrow-left">ArrowLeft</span>,
  BarChart: () => <span data-testid="icon-bar-chart">BarChart</span>,
  BatteryCharging: () => <span data-testid="icon-battery-charging">BatteryCharging</span>,
  Calendar: () => <span data-testid="icon-calendar">Calendar</span>,
  Check: () => <span data-testid="icon-check">Check</span>,
  CheckCircle: () => <span data-testid="icon-check-circle">CheckCircle</span>,
  Cloud: () => <span data-testid="icon-cloud">Cloud</span>,
  Droplets: () => <span data-testid="icon-droplets">Droplets</span>,
  Edit2: () => <span data-testid="icon-edit">Edit2</span>,
  Gauge: () => <span data-testid="icon-gauge">Gauge</span>,
  MapPin: () => <span data-testid="icon-map-pin">MapPin</span>,
  Minus: () => <span data-testid="icon-minus">Minus</span>,
  Power: () => <span data-testid="icon-power">Power</span>,
  ThermometerSnowflake: () => <span data-testid="icon-thermometer-snow">ThermometerSnowflake</span>,
  ThermometerSun: () => <span data-testid="icon-thermometer-sun">ThermometerSun</span>,
  TrendingDown: () => <span data-testid="icon-trending-down">TrendingDown</span>,
  TrendingUp: () => <span data-testid="icon-trending-up">TrendingUp</span>,
  Wrench: () => <span data-testid="icon-wrench">Wrench</span>,
  X: () => <span data-testid="icon-x">X</span>,
  Zap: () => <span data-testid="icon-zap">Zap</span>,
}));

// ============================================================
// Import the REAL component
// ============================================================
import UnitDetails from "../components/UnitDetails";

// Mock unit data
const mockUnit = {
  id: "unit-1",
  name: "Test Unit A",
  location: "Building A",
  status: "online",
  serialNumber: "SN-12345",
  powerOutput: 150,
  currentPower: 142.5,
  waterLevel: 85,
  watergeneration: true,
  temp_outside: 25,
  temp_in: 22,
  temp_out: 18,
  humidity: 60,
  pressure: 101.3,
  battery_level: 85,
  flowRate: 45.5,
  hasAlarm: false,
  installDate: "2024-01-15",
  lastMaintenance: "2024-07-10",
  gpsCoordinates: "40.7128, -74.0060",
};

// ============================================================
// Test Wrapper
// ============================================================
const TestWrapper = ({ children, unit = mockUnit }) => {
  return (
    <MemoryRouter initialEntries={[{ pathname: "/units/unit-1", state: { unit } }]}>
      <Routes>
        <Route path="/units/:id" element={children} />
        <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
        <Route path="/remote-control" element={<div data-testid="remote-control-page">Remote Control</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe("UnitDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Basic Rendering Tests
  // ============================================================

  it("should render without crashing", () => {
    const { container } = render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(container).toBeDefined();
  });

  it("should render unit name", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("Test Unit A")).toBeInTheDocument();
  });

  it("should render location", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText(/Building A/)).toBeInTheDocument();
  });

  it("should render status badge", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("ONLINE")).toBeInTheDocument();
  });

  // ============================================================
  // Tab Navigation Tests
  // ============================================================

  it("should show Overview tab by default", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByTestId("overview-tab")).toBeInTheDocument();
  });

  it("should switch to Alerts tab when clicked", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    const alertsTab = screen.getByTestId("tab-alerts");
    fireEvent.click(alertsTab);

    expect(screen.getByTestId("alerts-tab")).toBeInTheDocument();
  });

  it("should switch to History tab when clicked", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    const historyTab = screen.getByTestId("tab-history");
    fireEvent.click(historyTab);

    expect(screen.getByTestId("history-tab")).toBeInTheDocument();
  });

  it("should switch to Vitals tab when clicked", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    const vitalsTab = screen.getByTestId("tab-vitals");
    fireEvent.click(vitalsTab);

    expect(screen.getByTestId("unit-vitals")).toBeInTheDocument();
  });

  // ============================================================
  // Navigation Buttons Tests
  // ============================================================

  it("should render Back to Dashboard button", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
  });

  it("should navigate to dashboard when Back button is clicked", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    const backButton = screen.getByText("Back to Dashboard");
    fireEvent.click(backButton);

    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("should render Manage Remotely button", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("Manage Remotely")).toBeInTheDocument();
  });

  it("should navigate to remote control when Manage Remotely is clicked", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    const remoteButton = screen.getByText("Manage Remotely");
    fireEvent.click(remoteButton);

    expect(screen.getByTestId("remote-control-page")).toBeInTheDocument();
  });

  // ============================================================
  // Unit Not Found Tests
  // ============================================================

  it("should show 'Unit Not Found' when no unit is provided", () => {
    render(
      <TestWrapper unit={null}>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("Unit Not Found")).toBeInTheDocument();
  });

  it("should show Return to Dashboard button when unit not found", () => {
    render(
      <TestWrapper unit={null}>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("Return to Dashboard")).toBeInTheDocument();
  });

  // ============================================================
  // Unit Status Tests
  // ============================================================

  it("should show online status badge", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("ONLINE")).toBeInTheDocument();
  });

  it("should show offline status badge", () => {
    const offlineUnit = { ...mockUnit, status: "offline" };
    render(
      <TestWrapper unit={offlineUnit}>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("OFFLINE")).toBeInTheDocument();
  });

  it("should show maintenance status badge", () => {
    const maintenanceUnit = { ...mockUnit, status: "maintenance" };
    render(
      <TestWrapper unit={maintenanceUnit}>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("MAINTENANCE")).toBeInTheDocument();
  });

  it("should show decommissioned status badge", () => {
    const decommissionedUnit = { ...mockUnit, status: "decommissioned" };
    render(
      <TestWrapper unit={decommissionedUnit}>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("DECOMMISSIONED")).toBeInTheDocument();
  });

  // ============================================================
  // Edit Name Tests
  // ============================================================

  it("should show edit name input when edit icon is clicked", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    const editButtons = screen.getAllByTestId("icon-edit");
    fireEvent.click(editButtons[0]);

    expect(screen.getByDisplayValue("Test Unit A")).toBeInTheDocument();
  });

  it("should cancel name edit when X button is clicked", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    const editButtons = screen.getAllByTestId("icon-edit");
    fireEvent.click(editButtons[0]);

    const cancelButton = screen.getByTestId("icon-x");
    fireEvent.click(cancelButton);

    expect(screen.queryByDisplayValue("Test Unit A")).not.toBeInTheDocument();
  });

  // ============================================================
  // Edit Location Tests
  // ============================================================

  it("should show edit location input when edit icon is clicked", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    const editButtons = screen.getAllByTestId("icon-edit");
    fireEvent.click(editButtons[1]);

    expect(screen.getByDisplayValue("Building A")).toBeInTheDocument();
  });

  it("should cancel location edit when X button is clicked", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    const editButtons = screen.getAllByTestId("icon-edit");
    fireEvent.click(editButtons[1]);

    const cancelButton = screen.getByTestId("icon-x");
    fireEvent.click(cancelButton);

    expect(screen.queryByDisplayValue("Building A")).not.toBeInTheDocument();
  });

  // ============================================================
  // Alarm Alert Tests
  // ============================================================

  it("should show alarm alert when unit has alarm", () => {
    const alarmUnit = { ...mockUnit, hasAlarm: true };
    render(
      <TestWrapper unit={alarmUnit}>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText(/NH3 LEAK DETECTED/)).toBeInTheDocument();
  });

  it("should not show alarm alert when unit has no alarm", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.queryByText(/NH3 LEAK DETECTED/)).not.toBeInTheDocument();
  });

  // ============================================================
  // Offline State Tests
  // ============================================================

  it("should show N/A for metrics when unit is offline", () => {
    const offlineUnit = { ...mockUnit, status: "offline" };
    render(
      <TestWrapper unit={offlineUnit}>
        <UnitDetails />
      </TestWrapper>,
    );

    // Should show N/A for temperature, pressure, flow rate
    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThan(0);
  });

  // ============================================================
  // Water Generation Tests
  // ============================================================

  it("should show water-related metrics for units with water generation", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("Water Level")).toBeInTheDocument();
  });

  it("should not show water-related metrics for units without water generation", () => {
    const noWaterUnit = { ...mockUnit, watergeneration: false };
    render(
      <TestWrapper unit={noWaterUnit}>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.queryByText("Water Level")).not.toBeInTheDocument();
  });

  // ============================================================
  // Unit Vitals Tests
  // ============================================================

  it("should show Unit Vitals when Vitals tab is active", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    const vitalsTab = screen.getByTestId("tab-vitals");
    fireEvent.click(vitalsTab);

    expect(screen.getByTestId("unit-vitals")).toBeInTheDocument();
  });
});
