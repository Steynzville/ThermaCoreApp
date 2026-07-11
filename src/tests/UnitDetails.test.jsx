/**
 * Tests for UnitDetails Component
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// ============================================================
// Mock ALL subcomponents with proper exports
// ============================================================

vi.mock("../components/unit-details/UnitStatusHeader", () => ({
  default: ({ unit, getStatusColor }) => (
    <div data-testid="unit-status-header">
      <h2>{unit?.name || "Unknown Unit"}</h2>
      <span data-testid="status-badge" className={getStatusColor?.(unit?.status) || ""}>
        {unit?.status?.toUpperCase() || "UNKNOWN"}
      </span>
    </div>
  ),
}));

vi.mock("../components/unit-details/UnitTabNavigation", () => ({
  default: ({ activeTab, setActiveTab }) => (
    <div data-testid="unit-tab-navigation">
      <button
        data-testid="tab-overview"
        onClick={() => setActiveTab("overview")}
        className={activeTab === "overview" ? "active" : ""}
      >
        Overview
      </button>
      <button
        data-testid="tab-history"
        onClick={() => setActiveTab("history")}
        className={activeTab === "history" ? "active" : ""}
      >
        History
      </button>
      <button
        data-testid="tab-alerts"
        onClick={() => setActiveTab("alerts")}
        className={activeTab === "alerts" ? "active" : ""}
      >
        Alerts
      </button>
      <button
        data-testid="tab-client"
        onClick={() => setActiveTab("client")}
        className={activeTab === "client" ? "active" : ""}
      >
        Client
      </button>
      <button
        data-testid="tab-remote-control"
        onClick={() => setActiveTab("remote-control")}
        className={activeTab === "remote-control" ? "active" : ""}
      >
        Remote Control
      </button>
    </div>
  ),
}));

vi.mock("../components/unit-details/UnitOverviewTab", () => ({
  default: ({ unit }) => (
    <div data-testid="overview-tab">
      <h3>Overview</h3>
      <div>Unit: {unit?.name || "Unknown"}</div>
      <div>Location: {unit?.location || "Unknown"}</div>
    </div>
  ),
}));

vi.mock("../components/unit-details/UnitHistoryTab", () => ({
  default: () => <div data-testid="history-tab">History Tab Content</div>,
}));

vi.mock("../components/unit-details/UnitAlertsTab", () => ({
  default: ({ unit, alertsHistory }) => (
    <div data-testid="alerts-tab">
      <h3>Alerts</h3>
      <div>Unit: {unit?.name || "Unknown"}</div>
      <div>Alert Count: {alertsHistory?.length || 0}</div>
    </div>
  ),
}));

vi.mock("../components/unit-details/UnitClientTab", () => ({
  default: ({ unit }) => (
    <div data-testid="client-tab">
      <h3>Client Information</h3>
      <div>Unit: {unit?.name || "Unknown"}</div>
    </div>
  ),
}));

vi.mock("../components/RemoteControl", () => ({
  default: ({ unit }) => (
    <div data-testid="remote-control-tab">
      <h3>Remote Control</h3>
      <div>Unit: {unit?.name || "Unknown"}</div>
    </div>
  ),
}));

// Mock icons
vi.mock("lucide-react", () => ({
  Minus: () => <span data-testid="icon-minus">Minus</span>,
  TrendingDown: () => <span data-testid="icon-trending-down">TrendingDown</span>,
  TrendingUp: () => <span data-testid="icon-trending-up">TrendingUp</span>,
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
        <Route path="/grid-view" element={<div data-testid="grid-view-page">Grid View</div>} />
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
    expect(screen.getByTestId("status-badge")).toHaveTextContent("ONLINE");
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

  it("should switch to Client tab when clicked", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    const clientTab = screen.getByTestId("tab-client");
    fireEvent.click(clientTab);

    expect(screen.getByTestId("client-tab")).toBeInTheDocument();
  });

  it("should switch to Remote Control tab when clicked", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    const remoteTab = screen.getByTestId("tab-remote-control");
    fireEvent.click(remoteTab);

    expect(screen.getByTestId("remote-control-tab")).toBeInTheDocument();
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

  it("should show Return to Grid View button when unit not found", () => {
    render(
      <TestWrapper unit={null}>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByText("Return to Grid View")).toBeInTheDocument();
  });

  it("should navigate to grid view when Return button is clicked", () => {
    render(
      <TestWrapper unit={null}>
        <UnitDetails />
      </TestWrapper>,
    );

    const returnButton = screen.getByText("Return to Grid View");
    fireEvent.click(returnButton);

    expect(screen.getByTestId("grid-view-page")).toBeInTheDocument();
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
    expect(screen.getByTestId("status-badge")).toHaveTextContent("ONLINE");
  });

  it("should show offline status badge", () => {
    const offlineUnit = { ...mockUnit, status: "offline" };
    render(
      <TestWrapper unit={offlineUnit}>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByTestId("status-badge")).toHaveTextContent("OFFLINE");
  });

  it("should show maintenance status badge", () => {
    const maintenanceUnit = { ...mockUnit, status: "maintenance" };
    render(
      <TestWrapper unit={maintenanceUnit}>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByTestId("status-badge")).toHaveTextContent("MAINTENANCE");
  });

  it("should show decommissioned status badge", () => {
    const decommissionedUnit = { ...mockUnit, status: "decommissioned" };
    render(
      <TestWrapper unit={decommissionedUnit}>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByTestId("status-badge")).toHaveTextContent("DECOMMISSIONED");
  });

  // ============================================================
  // Overview Tab Content Tests
  // ============================================================

  it("should show overview content with unit details", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    expect(screen.getByTestId("overview-tab")).toBeInTheDocument();
    expect(screen.getByText(/Unit: Test Unit A/)).toBeInTheDocument();
    expect(screen.getByText(/Location: Building A/)).toBeInTheDocument();
  });

  // ============================================================
  // Alerts Tab Content Tests
  // ============================================================

  it("should show alerts tab with alert count", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    const alertsTab = screen.getByTestId("tab-alerts");
    fireEvent.click(alertsTab);

    expect(screen.getByTestId("alerts-tab")).toBeInTheDocument();
    expect(screen.getByText("Alert Count: 3")).toBeInTheDocument();
  });

  // ============================================================
  // Client Tab Content Tests
  // ============================================================

  it("should show client tab content", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    const clientTab = screen.getByTestId("tab-client");
    fireEvent.click(clientTab);

    expect(screen.getByTestId("client-tab")).toBeInTheDocument();
    expect(screen.getByText(/Unit: Test Unit A/)).toBeInTheDocument();
  });

  // ============================================================
  // Remote Control Tab Content Tests
  // ============================================================

  it("should show remote control tab content", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    const remoteTab = screen.getByTestId("tab-remote-control");
    fireEvent.click(remoteTab);

    expect(screen.getByTestId("remote-control-tab")).toBeInTheDocument();
    expect(screen.getByText(/Unit: Test Unit A/)).toBeInTheDocument();
  });
});
