/**
 * Tests for UnitDetails Component
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

// This mock now calls getAlertTypeColor for every alert type so all branches
// of that function are exercised.
vi.mock("../components/unit-details/UnitAlertsTab", () => ({
  default: ({ unit, alertsHistory, getAlertTypeColor }) => (
    <div data-testid="alerts-tab">
      <h3>Alerts</h3>
      <div>Unit: {unit?.name || "Unknown"}</div>
      <div>Alert Count: {alertsHistory?.length || 0}</div>
      {["critical", "warning", "info", "unknown-type"].map((type) => (
        <div key={type} data-testid={`alert-color-${type}`}>
          {getAlertTypeColor?.(type)}
        </div>
      ))}
    </div>
  ),
}));

// This mock now calls each handler prop so branch coverage for
// handleSendEmail / handleCallClient / handleScheduleMaintenance is exercised.
vi.mock("../components/unit-details/UnitClientTab", () => ({
  default: ({ unit, handleSendEmail, handleCallClient, handleScheduleMaintenance }) => (
    <div data-testid="client-tab">
      <h3>Client Information</h3>
      <div>Unit: {unit?.name || "Unknown"}</div>
      <button data-testid="send-email-btn" onClick={() => handleSendEmail(unit?.clientEmail)}>
        Send Email
      </button>
      <button data-testid="call-client-btn" onClick={() => handleCallClient(unit?.clientPhone)}>
        Call Client
      </button>
      <button data-testid="schedule-maintenance-btn" onClick={() => handleScheduleMaintenance()}>
        Schedule Maintenance
      </button>
    </div>
  ),
}));

vi.mock("../components/RemoteControl", () => ({
  default: ({ unit }) => (
    <div data-testid="remote-control-tab">
      <h3>Remote Control</h3>
      <div>Unit: {unit?.name || "Unknown"}</div>
      <div>Water Production On: {String(unit?.waterProductionOn)}</div>
      <div>Auto Switch: {String(unit?.autoSwitchEnabled)}</div>
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
  clientEmail: "client@example.com",
  clientPhone: "555-1234",
};

// ============================================================
// Test Wrapper
// ============================================================
const TestWrapper = ({ children, unit = mockUnit, initialTab }) => {
  const search = initialTab ? `?tab=${initialTab}` : "";
  return (
    <MemoryRouter
      initialEntries={[{ pathname: "/units/unit-1", search, state: { unit } }]}
    >
      <Routes>
        <Route path="/units/:id" element={children} />
        <Route path="/grid-view" element={<div data-testid="grid-view-page">Grid View</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe("UnitDetails", () => {
  let confirmSpy;
  let alertSpy;

  beforeEach(() => {
    vi.clearAllMocks();

    // Stub window.location so href assignment doesn't blow up in jsdom
    delete window.location;
    window.location = { href: "" };

    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    alertSpy.mockRestore();
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

  it("should apply a custom className to the root wrapper", () => {
    const { container } = render(
      <TestWrapper>
        <UnitDetails className="custom-class" />
      </TestWrapper>,
    );
    expect(container.querySelector(".custom-class")).toBeInTheDocument();
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

    fireEvent.click(screen.getByTestId("tab-alerts"));
    expect(screen.getByTestId("alerts-tab")).toBeInTheDocument();
  });

  it("should switch to History tab when clicked", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId("tab-history"));
    expect(screen.getByTestId("history-tab")).toBeInTheDocument();
  });

  it("should switch to Client tab when clicked", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId("tab-client"));
    expect(screen.getByTestId("client-tab")).toBeInTheDocument();
  });

  it("should switch to Remote Control tab when clicked", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId("tab-remote-control"));
    expect(screen.getByTestId("remote-control-tab")).toBeInTheDocument();
  });

  // ============================================================
  // Initial tab from search params
  // ============================================================

  it("should honor an initial tab of 'history' from the URL", () => {
    render(
      <TestWrapper initialTab="history">
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByTestId("history-tab")).toBeInTheDocument();
  });

  it("should honor an initial tab of 'alerts' from the URL", () => {
    render(
      <TestWrapper initialTab="alerts">
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByTestId("alerts-tab")).toBeInTheDocument();
  });

  it("should honor an initial tab of 'client' from the URL", () => {
    render(
      <TestWrapper initialTab="client">
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByTestId("client-tab")).toBeInTheDocument();
  });

  it("should honor an initial tab of 'remote-control' from the URL", () => {
    render(
      <TestWrapper initialTab="remote-control">
        <UnitDetails />
      </TestWrapper>,
    );
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

    fireEvent.click(screen.getByText("Return to Grid View"));
    expect(screen.getByTestId("grid-view-page")).toBeInTheDocument();
  });

  // ============================================================
  // Unit Status Tests (covers every getStatusColor branch)
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

  it("should fall back to the default status color for an unrecognized status", () => {
    const unknownStatusUnit = { ...mockUnit, status: "weird-status" };
    render(
      <TestWrapper unit={unknownStatusUnit}>
        <UnitDetails />
      </TestWrapper>,
    );
    expect(screen.getByTestId("status-badge")).toHaveTextContent("WEIRD-STATUS");
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
  // Alerts Tab Content Tests (covers every getAlertTypeColor branch)
  // ============================================================

  it("should show alerts tab with alert count", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId("tab-alerts"));

    expect(screen.getByTestId("alerts-tab")).toBeInTheDocument();
    expect(screen.getByText("Alert Count: 3")).toBeInTheDocument();
  });

  it("should resolve the correct color class for each alert type", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId("tab-alerts"));

    expect(screen.getByTestId("alert-color-critical")).toHaveTextContent(
      "text-red-600",
    );
    expect(screen.getByTestId("alert-color-warning")).toHaveTextContent(
      "text-yellow-600",
    );
    expect(screen.getByTestId("alert-color-info")).toHaveTextContent(
      "text-blue-600",
    );
    // default/fallback branch
    expect(screen.getByTestId("alert-color-unknown-type")).toHaveTextContent(
      "text-gray-600",
    );
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

    fireEvent.click(screen.getByTestId("tab-client"));

    expect(screen.getByTestId("client-tab")).toBeInTheDocument();
    expect(screen.getByText(/Unit: Test Unit A/)).toBeInTheDocument();
  });

  it("should send an email when confirmed and an email address exists", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId("tab-client"));
    fireEvent.click(screen.getByTestId("send-email-btn"));

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining("client@example.com"),
    );
    expect(window.location.href).toBe("mailto:client@example.com");
  });

  it("should not navigate to mailto when the email confirm is cancelled", () => {
    confirmSpy.mockReturnValue(false);

    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId("tab-client"));
    fireEvent.click(screen.getByTestId("send-email-btn"));

    expect(confirmSpy).toHaveBeenCalled();
    expect(window.location.href).toBe("");
  });

  it("should alert when no client email is available", () => {
    const noEmailUnit = { ...mockUnit, clientEmail: undefined };
    render(
      <TestWrapper unit={noEmailUnit}>
        <UnitDetails />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId("tab-client"));
    fireEvent.click(screen.getByTestId("send-email-btn"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Client email address not available.",
    );
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("should call the client when confirmed and a phone number exists", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId("tab-client"));
    fireEvent.click(screen.getByTestId("call-client-btn"));

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining("555-1234"),
    );
    expect(window.location.href).toBe("tel:555-1234");
  });

  it("should not navigate to tel when the call confirm is cancelled", () => {
    confirmSpy.mockReturnValue(false);

    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId("tab-client"));
    fireEvent.click(screen.getByTestId("call-client-btn"));

    expect(confirmSpy).toHaveBeenCalled();
    expect(window.location.href).toBe("");
  });

  it("should alert when no client phone is available", () => {
    const noPhoneUnit = { ...mockUnit, clientPhone: undefined };
    render(
      <TestWrapper unit={noPhoneUnit}>
        <UnitDetails />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId("tab-client"));
    fireEvent.click(screen.getByTestId("call-client-btn"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Client phone number not available.",
    );
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("should show a placeholder alert when scheduling maintenance is confirmed", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId("tab-client"));
    fireEvent.click(screen.getByTestId("schedule-maintenance-btn"));

    expect(confirmSpy).toHaveBeenCalledWith(
      "Do you want to open your calendar to schedule maintenance?",
    );
    expect(alertSpy).toHaveBeenCalledWith(
      "Opening calendar application (placeholder action).",
    );
  });

  it("should do nothing further when scheduling maintenance is cancelled", () => {
    confirmSpy.mockReturnValue(false);

    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId("tab-client"));
    fireEvent.click(screen.getByTestId("schedule-maintenance-btn"));

    expect(confirmSpy).toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
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

    fireEvent.click(screen.getByTestId("tab-remote-control"));

    expect(screen.getByTestId("remote-control-tab")).toBeInTheDocument();
    expect(screen.getByText(/Unit: Test Unit A/)).toBeInTheDocument();
  });

  it("should pass computed waterProductionOn and autoSwitchEnabled to RemoteControl", () => {
    render(
      <TestWrapper>
        <UnitDetails />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId("tab-remote-control"));

    expect(screen.getByText("Water Production On: true")).toBeInTheDocument();
    expect(screen.getByText("Auto Switch: true")).toBeInTheDocument();
  });

  it("should reflect waterProductionOn as false when watergeneration is false", () => {
    const noWaterUnit = { ...mockUnit, watergeneration: false };
    render(
      <TestWrapper unit={noWaterUnit}>
        <UnitDetails />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId("tab-remote-control"));

    expect(screen.getByText("Water Production On: false")).toBeInTheDocument();
  });
});
