/**
 * Tests for UserUnitDetails Component
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
    userRole: "user",
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
  default: ({ unit, alertsHistory }) => (
    <div data-testid="alerts-tab">
      <h3>Alerts</h3>
      <div data-testid="alert-count">Alert Count: {alertsHistory?.length || 0}</div>
      <div>Unit: {unit?.name || "Unknown"}</div>
    </div>
  ),
}));

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
import UserUnitDetails from "../components/UserUnitDetails";

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
        <Route path="/unit-performance/:id" element={<div data-testid="unit-performance-page">Unit Performance</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe("UserUnitDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Basic Rendering Tests
  // ============================================================

  it("should render without crashing", () => {
    const { container } = render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );
    expect(container).toBeDefined();
  });

  it("should render unit details when unit data is provided", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );

    expect(screen.getByText("Test Unit A - Detailed View")).toBeInTheDocument();
    expect(screen.getByText(/Building A/)).toBeInTheDocument();
  });

  it("should show 'Unit Not Found' when no unit is provided", () => {
    render(
      <TestWrapper unit={null}>
        <UserUnitDetails />
      </TestWrapper>,
    );

    expect(screen.getByText("Unit Not Found")).toBeInTheDocument();
  });

  // ============================================================
  // Tab Navigation Tests
  // ============================================================

  it("should show Overview tab by default", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );

    expect(screen.getByText("Current Status")).toBeInTheDocument();
  });

  it("should switch to History tab when clicked", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );

    const historyTab = screen.getByText("History");
    fireEvent.click(historyTab);

    expect(screen.getAllByTestId("vital-sign-graph").length).toBeGreaterThan(0);
  });

  it("should switch to Alerts tab when clicked", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );

    const alertsTab = screen.getByText("Alerts");
    fireEvent.click(alertsTab);

    expect(screen.getByTestId("alerts-tab")).toBeInTheDocument();
  });

  // ============================================================
  // Navigation Buttons Tests
  // ============================================================

  it("should show Manage Remotely button", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );

    expect(screen.getByTestId("button-remote-control")).toBeInTheDocument();
  });

  it("should show Unit Performance button", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );

    expect(screen.getByTestId("button-unit-performance")).toBeInTheDocument();
  });

  // ============================================================
  // Status Tests
  // ============================================================

  it("should show status badge", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );

    expect(screen.getByText("ONLINE")).toBeInTheDocument();
  });

  it("should show 'N/A' for metrics when unit is offline", () => {
    const offlineUnit = { ...mockUnit, status: "offline" };
    render(
      <TestWrapper unit={offlineUnit}>
        <UserUnitDetails />
      </TestWrapper>,
    );

    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
  });

  // ============================================================
  // Alarm Alert Tests
  // ============================================================

  it("should show alarm alert when unit has alarm", () => {
    const alarmUnit = { ...mockUnit, hasAlarm: true };
    render(
      <TestWrapper unit={alarmUnit}>
        <UserUnitDetails />
      </TestWrapper>,
    );

    expect(screen.getByText(/NH3 LEAK DETECTED/)).toBeInTheDocument();
  });

  // ============================================================
  // Water Generation Tests
  // ============================================================

  it("should show water-related metrics for units with water generation", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );

    expect(screen.getByText("Water Level")).toBeInTheDocument();
  });

  it("should not show water-related metrics for units without water generation", () => {
    const noWaterUnit = { ...mockUnit, watergeneration: false };
    render(
      <TestWrapper unit={noWaterUnit}>
        <UserUnitDetails />
      </TestWrapper>,
    );

    expect(screen.queryByText("Water Level")).not.toBeInTheDocument();
  });
});
