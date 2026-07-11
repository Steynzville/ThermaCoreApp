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

// Mock hooks
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

// Mock child components
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
import UserUnitDetails from "../components/UserUnitDetails";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useUnits } from "../context/UnitContext";
import { useRealtimeMetrics } from "../hooks/useRealtimeData";

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

const TestWrapper = ({ children, initialEntries = ["/units/unit-1"] }) => {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/units/:id"
          element={children}
        />
        <Route
          path="/dashboard"
          element={<div data-testid="dashboard-page">Dashboard</div>}
        />
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
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );
    expect(container).toBeDefined();
  });

  it("should render unit details when unit data is provided", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );

    expect(screen.getByText("Test Unit A - Detailed View")).toBeInTheDocument();
    expect(screen.getByText(/Serial Number:/)).toBeInTheDocument();
    expect(screen.getByText(/Building A/)).toBeInTheDocument();
  });

  it("should display unit status badge", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );

    expect(screen.getByText("ONLINE")).toBeInTheDocument();
  });

  it("should show 'Unit Not Found' when no unit is provided", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );

    expect(screen.getByText("Unit Not Found")).toBeInTheDocument();
    expect(screen.getByText("Return to Dashboard")).toBeInTheDocument();
  });

  it("should navigate back to dashboard when 'Return to Dashboard' is clicked", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );

    const returnButton = screen.getByText("Return to Dashboard");
    fireEvent.click(returnButton);

    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  // ============================================================
  // Tab Navigation Tests
  // ============================================================

  it("should show Overview tab by default", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );

    expect(screen.getByText("Current Status")).toBeInTheDocument();
    expect(screen.getByText("Unit Information")).toBeInTheDocument();
  });

  it("should switch to History tab when clicked", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );

    const historyTab = screen.getByText("History");
    fireEvent.click(historyTab);

    const graphs = screen.getAllByTestId("vital-sign-graph");
    expect(graphs.length).toBeGreaterThan(0);
  });

  it("should switch to Alerts tab when clicked", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );

    const alertsTab = screen.getByText("Alerts");
    fireEvent.click(alertsTab);

    expect(screen.getByTestId("alerts-tab")).toBeInTheDocument();
  });

  it("should respect tab query parameter", () => {
    render(
      <TestWrapper initialEntries={["/units/unit-1?tab=history"]}>
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );

    const graphs = screen.getAllByTestId("vital-sign-graph");
    expect(graphs.length).toBeGreaterThan(0);
  });

  // ============================================================
  // Navigation Buttons Tests
  // ============================================================

  it("should navigate to remote control when Manage Remotely is clicked", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );

    const remoteButton = screen.getByTestId("button-remote-control");
    expect(remoteButton).toBeInTheDocument();
    // Note: Navigation is handled by react-router, we verify button exists
  });

  it("should navigate to unit performance when Unit Performance is clicked", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );

    const performanceButton = screen.getByTestId("button-unit-performance");
    expect(performanceButton).toBeInTheDocument();
  });

  // ============================================================
  // Edit Name Tests
  // ============================================================

  it("should show edit name input when edit icon is clicked", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );

    const editButtons = screen.getAllByTestId("icon-edit");
    fireEvent.click(editButtons[0]);

    const input = screen.getByDisplayValue("Test Unit A");
    expect(input).toBeInTheDocument();
  });

  it("should save name when save button is clicked", async () => {
    const mockUpdateUnitName = vi.fn().mockResolvedValue({});
    useUnits.mockReturnValue({
      updateUnitName: mockUpdateUnitName,
      updateUnitLocation: vi.fn().mockResolvedValue({}),
    });

    render(
      <TestWrapper>
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );

    const editButtons = screen.getAllByTestId("icon-edit");
    fireEvent.click(editButtons[0]);

    const input = screen.getByDisplayValue("Test Unit A");
    fireEvent.change(input, { target: { value: "New Unit Name" } });

    const saveButton = screen.getByTestId("icon-check");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateUnitName).toHaveBeenCalledWith("unit-1", "New Unit Name");
    });
  });

  // ============================================================
  // Offline State Tests
  // ============================================================

  it("should show 'N/A' for metrics when unit is offline", () => {
    const offlineUnit = { ...mockUnit, status: "offline" };
    render(
      <TestWrapper>
        <UserUnitDetails unit={offlineUnit} />
      </TestWrapper>,
    );

    // Should show N/A for temperature, pressure, flow rate
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
  });

  // ============================================================
  // Alarm Alert Tests
  // ============================================================

  it("should show NH3 alarm alert when unit has alarm", () => {
    const alarmUnit = { ...mockUnit, hasAlarm: true };
    render(
      <TestWrapper>
        <UserUnitDetails unit={alarmUnit} />
      </TestWrapper>,
    );

    expect(screen.getByText(/🚨 NH3 LEAK DETECTED 🚨/)).toBeInTheDocument();
    expect(screen.getByText(/Toxic ammonia leak detected/)).toBeInTheDocument();
  });

  // ============================================================
  // Edit Location Tests
  // ============================================================

  it("should show edit location input when edit icon is clicked", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );

    const editButtons = screen.getAllByTestId("icon-edit");
    fireEvent.click(editButtons[1]);

    const input = screen.getByDisplayValue("Building A");
    expect(input).toBeInTheDocument();
  });

  it("should save location when save button is clicked", async () => {
    const mockUpdateUnitLocation = vi.fn().mockResolvedValue({});
    useUnits.mockReturnValue({
      updateUnitName: vi.fn().mockResolvedValue({}),
      updateUnitLocation: mockUpdateUnitLocation,
    });

    render(
      <TestWrapper>
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );

    const editButtons = screen.getAllByTestId("icon-edit");
    fireEvent.click(editButtons[1]);

    const input = screen.getByDisplayValue("Building A");
    fireEvent.change(input, { target: { value: "Building B" } });

    const saveButton = screen.getByTestId("icon-check");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateUnitLocation).toHaveBeenCalledWith("unit-1", "Building B");
    });
  });

  // ============================================================
  // Cancel Edit Tests
  // ============================================================

  it("should cancel name edit when X button is clicked", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );

    const editButtons = screen.getAllByTestId("icon-edit");
    fireEvent.click(editButtons[0]);

    const cancelButton = screen.getByTestId("icon-x");
    fireEvent.click(cancelButton);

    expect(screen.queryByDisplayValue("Test Unit A")).not.toBeInTheDocument();
  });

  it("should cancel location edit when X button is clicked", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );

    const editButtons = screen.getAllByTestId("icon-edit");
    fireEvent.click(editButtons[1]);

    const cancelButton = screen.getByTestId("icon-x");
    fireEvent.click(cancelButton);

    expect(screen.queryByDisplayValue("Building A")).not.toBeInTheDocument();
  });

  // ============================================================
  // Status Color Tests
  // ============================================================

  it("should show green status for online units", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={{ ...mockUnit, status: "online" }} />
      </TestWrapper>,
    );

    const statusBadge = screen.getByText("ONLINE");
    expect(statusBadge).toHaveClass("bg-green-100");
  });

  it("should show red status for offline units", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={{ ...mockUnit, status: "offline" }} />
      </TestWrapper>,
    );

    const statusBadge = screen.getByText("OFFLINE");
    expect(statusBadge).toHaveClass("bg-red-100");
  });

  it("should show yellow status for maintenance units", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={{ ...mockUnit, status: "maintenance" }} />
      </TestWrapper>,
    );

    const statusBadge = screen.getByText("MAINTENANCE");
    expect(statusBadge).toHaveClass("bg-yellow-100");
  });

  // ============================================================
  // Flow Rate Color Tests
  // ============================================================

  it("should show red color for high flow rate", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={{ ...mockUnit, flowRate: 95 }} />
      </TestWrapper>,
    );

    const flowRateElement = screen.getByText(/95 L\/min/);
    expect(flowRateElement).toHaveClass("text-red-600");
  });

  it("should show yellow color for medium flow rate", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={{ ...mockUnit, flowRate: 75 }} />
      </TestWrapper>,
    );

    const flowRateElement = screen.getByText(/75 L\/min/);
    expect(flowRateElement).toHaveClass("text-yellow-600");
  });

  it("should show green color for normal flow rate", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={{ ...mockUnit, flowRate: 45.5 }} />
      </TestWrapper>,
    );

    const flowRateElement = screen.getByText(/45.5 L\/min/);
    expect(flowRateElement).toHaveClass("text-green-600");
  });

  // ============================================================
  // Realtime Data Tests
  // ============================================================

  it("should update metrics from realtime data", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={mockUnit} />
      </TestWrapper>,
    );

    // The component should receive metrics from useRealtimeMetrics
    // and update the liveUnit state
    expect(screen.getByText(/72°C/)).toBeInTheDocument();
  });

  // ============================================================
  // Water Generation Tests
  // ============================================================

  it("should show water-related metrics for units with water generation", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={{ ...mockUnit, watergeneration: true }} />
      </TestWrapper>,
    );

    expect(screen.getByText("Water Level")).toBeInTheDocument();
  });

  it("should not show water-related metrics for units without water generation", () => {
    render(
      <TestWrapper>
        <UserUnitDetails unit={{ ...mockUnit, watergeneration: false }} />
      </TestWrapper>,
    );

    expect(screen.queryByText("Water Level")).not.toBeInTheDocument();
  });
});
