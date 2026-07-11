/**
 * Tests for UserUnitDetails Component - Minimal
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import React from "react";

// ============================================================
// Mock ALL dependencies
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

// Mock useRealtimeMetrics to return stable data
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
  default: () => <div data-testid="vital-sign-graph">Mock Graph</div>,
}));

vi.mock("../components/ui/card", () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
}));

vi.mock("../components/unit-details/UnitAlertsTab", () => ({
  default: () => <div data-testid="alerts-tab">Alerts Tab</div>,
}));

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <span>AlertTriangle</span>,
  ArrowLeft: () => <span>ArrowLeft</span>,
  BarChart: () => <span>BarChart</span>,
  BatteryCharging: () => <span>BatteryCharging</span>,
  Calendar: () => <span>Calendar</span>,
  Check: () => <span>Check</span>,
  CheckCircle: () => <span>CheckCircle</span>,
  Cloud: () => <span>Cloud</span>,
  Droplets: () => <span>Droplets</span>,
  Edit2: () => <span>Edit2</span>,
  Gauge: () => <span>Gauge</span>,
  MapPin: () => <span>MapPin</span>,
  Minus: () => <span>Minus</span>,
  Power: () => <span>Power</span>,
  ThermometerSnowflake: () => <span>ThermometerSnowflake</span>,
  ThermometerSun: () => <span>ThermometerSun</span>,
  TrendingDown: () => <span>TrendingDown</span>,
  TrendingUp: () => <span>TrendingUp</span>,
  Wrench: () => <span>Wrench</span>,
  X: () => <span>X</span>,
  Zap: () => <span>Zap</span>,
}));

// ============================================================
// Import the component
// ============================================================
import UserUnitDetails from "../components/UserUnitDetails";

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

const TestWrapper = ({ children, unit = mockUnit }) => {
  return (
    <MemoryRouter initialEntries={[{ pathname: "/units/unit-1", state: { unit } }]}>
      <Routes>
        <Route path="/units/:id" element={children} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe("UserUnitDetails", () => {
  // ============================================================
  // BASIC SMOKE TESTS - Only check that things render
  // ============================================================

  it("should render without crashing", () => {
    const { container } = render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );
    expect(container).toBeDefined();
  });

  it("should render unit name", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("Test Unit A - Detailed View")).toBeInTheDocument();
  });

  it("should render location", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText(/Building A/)).toBeInTheDocument();
  });

  it("should render status badge", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("ONLINE")).toBeInTheDocument();
  });

  it("should render Overview tab content", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("Current Status")).toBeInTheDocument();
    expect(screen.getByText("Unit Information")).toBeInTheDocument();
  });

  it("should render History tab", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("History")).toBeInTheDocument();
  });

  it("should render Alerts tab", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("Alerts")).toBeInTheDocument();
  });

  it("should render Manage Remotely button", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("Manage Remotely")).toBeInTheDocument();
  });

  it("should render Unit Performance button", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("Unit Performance")).toBeInTheDocument();
  });

  it("should render Back to Dashboard button", () => {
    render(
      <TestWrapper>
        <UserUnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
  });

  it("should show 'Unit Not Found' when no unit is provided", () => {
    render(
      <TestWrapper unit={null}>
        <UserUnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("Unit Not Found")).toBeInTheDocument();
  });
});
