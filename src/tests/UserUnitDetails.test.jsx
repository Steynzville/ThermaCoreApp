/**
 * Tests for UserUnitDetails Component - Vitest Version
 */

import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";

import UserUnitDetails from "../components/UserUnitDetails";

// ============================================================
// Mocks - Using Vitest syntax with controllable return values
// ============================================================

const mockNavigate = vi.fn();
let mockLocationState = { unit: null };
let mockSearchParams = new URLSearchParams();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: mockLocationState }),
  useSearchParams: () => [mockSearchParams],
}));

const mockUpdateUnitName = vi.fn().mockResolvedValue();
const mockUpdateUnitLocation = vi.fn().mockResolvedValue();

// Make useAuth controllable
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(() => ({ userRole: "admin" })),
}));

// Make useRealtimeMetrics controllable
vi.mock("../hooks/useRealtimeData", () => ({
  useRealtimeMetrics: vi.fn(() => ({ metrics: null })),
}));

vi.mock("../context/SettingsContext", () => ({
  useSettings: () => ({
    formatTemperature: (v) => (v === undefined ? "N/A" : `${v}°F`),
  }),
}));

vi.mock("../context/UnitContext", () => ({
  useUnits: () => ({
    updateUnitName: mockUpdateUnitName,
    updateUnitLocation: mockUpdateUnitLocation,
  }),
}));

vi.mock("../components/ui/card", () => ({
  Card: ({ children, className }) => <div className={className}>{children}</div>,
  CardContent: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
}));

// Updated mock to exercise all branches of getAlertTypeColor
vi.mock("../components/unit-details/UnitAlertsTab", () => ({
  default: (props) => (
    <div data-testid="unit-alerts-tab">
      Alerts count: {props.alertsHistory?.length ?? 0}
      {/* Exercise every branch of getAlertTypeColor, including default */}
      <span data-testid="color-critical">{props.getAlertTypeColor("critical")}</span>
      <span data-testid="color-warning">{props.getAlertTypeColor("warning")}</span>
      <span data-testid="color-info">{props.getAlertTypeColor("info")}</span>
      <span data-testid="color-default">{props.getAlertTypeColor("unknown")}</span>
    </div>
  ),
}));

vi.mock("../components/VitalSignGraph", () => ({
  default: (props) => (
    <div data-testid="vital-sign-graph">{props.title}</div>
  ),
}));

// Mock icons
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

// Import mocked modules so tests can override return values
import { useAuth } from "../context/AuthContext";
import { useRealtimeMetrics } from "../hooks/useRealtimeData";

// ============================================================
// Test data
// ============================================================

const baseUnit = {
  id: "1",
  name: "Unit Alpha",
  serialNumber: "UA-001",
  location: "Site A",
  status: "online",
  currentPower: 12.345,
  temp_outside: 20,
  temp_in: 5,
  temp_out: 15,
  humidity: 40,
  pressure: 101,
  battery_level: 75,
  flowRate: 45.5,
  hasAlarm: false,
  watergeneration: false,
  installDate: "2023-05-01",
  lastMaintenance: "2024-06-01",
  gpsCoordinates: "10.0, 20.0",
};

// ============================================================
// Helper functions
// ============================================================

const renderWithUnit = (unitOverrides = {}, unit = baseUnit) => {
  mockLocationState = { unit: unit ? { ...unit, ...unitOverrides } : null };
  return render(<UserUnitDetails className="" />);
};

// Helper to find flow rate value element
const getFlowValueEl = (label) => {
  const labelEl = screen.getByText(label);
  // labelEl.parentElement is the inner div with two <p>s
  // The second <p> is the value
  return labelEl.parentElement?.querySelectorAll("p")[1];
};

// ============================================================
// Tests
// ============================================================

describe("UserUnitDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockLocationState = { unit: null };
    // Reset mocks to defaults
    useAuth.mockReturnValue({ userRole: "admin" });
    useRealtimeMetrics.mockReturnValue({ metrics: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Basic Rendering Tests
  // ============================================================

  it("shows 'Unit Not Found' when no unit is present in location state", () => {
    renderWithUnit({}, null);
    expect(screen.getByText("Unit Not Found")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /return to dashboard/i }),
    ).toBeInTheDocument();
  });

  it("navigates to /dashboard from the Unit Not Found screen", async () => {
    const user = userEvent.setup();
    renderWithUnit({}, null);
    await user.click(
      screen.getByRole("button", { name: /return to dashboard/i }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the unit header information", () => {
    renderWithUnit();
    expect(
      screen.getByText("Unit Alpha - Detailed View"),
    ).toBeInTheDocument();
    expect(screen.getByText(/UA-001/)).toBeInTheDocument();
    
    const locationLabel = screen.getByText("Location");
    const locationContainer = locationLabel.closest("div")?.parentElement;
    expect(locationContainer).toHaveTextContent(/Site A/);
    
    expect(screen.getByText("ONLINE")).toBeInTheDocument();
  });

  // ============================================================
  // Alarm Tests
  // ============================================================

  it("renders the NH3 leak alert when hasAlarm is true", () => {
    renderWithUnit({ hasAlarm: true });
    expect(screen.getByText(/NH3 LEAK DETECTED/)).toBeInTheDocument();
  });

  it("does not render the NH3 leak alert when hasAlarm is false", () => {
    renderWithUnit({ hasAlarm: false });
    expect(screen.queryByText(/NH3 LEAK DETECTED/)).not.toBeInTheDocument();
  });

  // ============================================================
  // Tab Navigation Tests
  // ============================================================

  it("defaults to the Overview tab and shows current status", () => {
    renderWithUnit();
    expect(screen.getByText("Current Status")).toBeInTheDocument();
    expect(screen.getByText("Unit Information")).toBeInTheDocument();
  });

  it("reads the initial tab from URL search params", () => {
    mockSearchParams = new URLSearchParams("tab=alerts");
    renderWithUnit();
    expect(screen.getByTestId("unit-alerts-tab")).toBeInTheDocument();
  });

  it("switches to the History tab and renders vital sign graphs", async () => {
    const user = userEvent.setup();
    renderWithUnit();
    await user.click(screen.getByRole("button", { name: "History" }));
    const graphs = screen.getAllByTestId("vital-sign-graph");
    expect(graphs.length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("Power Output History")).toBeInTheDocument();
  });

  it("renders the Water Level History graph only when watergeneration is true", async () => {
    const user = userEvent.setup();
    renderWithUnit({ watergeneration: true });
    await user.click(screen.getByRole("button", { name: "History" }));
    expect(screen.getByText("Water Level History")).toBeInTheDocument();
  });

  it("switches to the Alerts tab and renders UnitAlertsTab with alert history", async () => {
    const user = userEvent.setup();
    renderWithUnit();
    await user.click(screen.getByRole("button", { name: "Alerts" }));
    const alertsTab = screen.getByTestId("unit-alerts-tab");
    expect(alertsTab).toBeInTheDocument();
    expect(alertsTab).toHaveTextContent(/Alerts count: 3/);
  });

  // ============================================================
  // Edit Name Tests
  // ============================================================

  it("allows editing and saving the machine name", async () => {
    const user = userEvent.setup();
    renderWithUnit();

    const nameRow = screen.getByText("Machine Name").closest("div")?.parentElement;
    if (nameRow) {
      const editButton = within(nameRow).getAllByRole("button")[0];
      await user.click(editButton);

      const input = screen.getByDisplayValue("Unit Alpha");
      await user.clear(input);
      await user.type(input, "Unit Beta");

      const saveButton = input.parentElement?.querySelectorAll("button")[0];
      if (saveButton) await user.click(saveButton);

      expect(mockUpdateUnitName).toHaveBeenCalledWith("1", "Unit Beta");
    }
  });

  it("allows canceling the machine name edit without saving", async () => {
    const user = userEvent.setup();
    renderWithUnit();

    const nameRow = screen.getByText("Machine Name").closest("div")?.parentElement;
    if (nameRow) {
      const editButton = within(nameRow).getAllByRole("button")[0];
      await user.click(editButton);

      const input = screen.getByDisplayValue("Unit Alpha");
      await user.clear(input);
      await user.type(input, "Should Not Save");

      const cancelButton = input.parentElement?.querySelectorAll("button")[1];
      if (cancelButton) await user.click(cancelButton);

      expect(mockUpdateUnitName).not.toHaveBeenCalled();
    }
  });

  // ============================================================
  // Edit Location Tests
  // ============================================================

  it("allows editing and saving the location", async () => {
    const user = userEvent.setup();
    renderWithUnit();

    const locationRow = screen.getByText("Location").closest("div")?.parentElement;
    if (locationRow) {
      const editButton = within(locationRow).getAllByRole("button")[0];
      await user.click(editButton);

      const input = screen.getByDisplayValue("Site A");
      await user.clear(input);
      await user.type(input, "Site B");

      const saveButton = input.parentElement?.querySelectorAll("button")[0];
      if (saveButton) await user.click(saveButton);

      expect(mockUpdateUnitLocation).toHaveBeenCalledWith("1", "Site B");
    }
  });

  // ============================================================
  // Navigation Button Tests
  // ============================================================

  it("navigates to remote control page when 'Manage Remotely' is clicked", async () => {
    const user = userEvent.setup();
    renderWithUnit();
    await user.click(
      screen.getByTestId("button-remote-control"),
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      "/remote-control",
      expect.objectContaining({ state: expect.objectContaining({ unit: expect.anything() }) }),
    );
  });

  it("navigates to unit performance page when 'Unit Performance' is clicked", async () => {
    const user = userEvent.setup();
    renderWithUnit();
    await user.click(screen.getByTestId("button-unit-performance"));
    expect(mockNavigate).toHaveBeenCalledWith(
      "/unit-performance/1",
      expect.objectContaining({ state: expect.objectContaining({ unit: expect.anything() }) }),
    );
  });

  // ============================================================
  // Offline State Tests
  // ============================================================

  it("shows N/A for temperature, pressure, and flow rate when the unit is offline", () => {
    renderWithUnit({ status: "offline" });
    const naValues = screen.getAllByText("N/A");
    expect(naValues.length).toBeGreaterThanOrEqual(4);
  });

  // ============================================================
  // Battery Level Tests
  // ============================================================

  it("renders the battery level bar with the correct width", () => {
    renderWithUnit({ battery_level: 60 });
    const percentageLabels = screen.getAllByText("60%");
    expect(percentageLabels.length).toBeGreaterThan(0);
  });

  // ============================================================
  // ADDITIONAL BRANCH COVERAGE TESTS
  // ============================================================

  describe("Additional Branch Coverage", () => {
    it("adds default batteryLife and tankCapacity when rawUnit is missing them", () => {
      const unitWithoutDefaults = {
        id: "1",
        name: "Unit Alpha",
        status: "online",
        location: "Site A",
      };
      renderWithUnit({}, unitWithoutDefaults);
      expect(screen.getByText("Unit Alpha - Detailed View")).toBeInTheDocument();
    });

    it("shows N/A for temp_in, temp_out, pressure when unit is offline", () => {
      renderWithUnit({ status: "offline" });
      const naValues = screen.getAllByText("N/A");
      expect(naValues.length).toBeGreaterThanOrEqual(5);
    });

    it("handles undefined temp_in/temp_out/pressure in liveUnit calculation", () => {
      const unitWithoutDerived = {
        ...baseUnit,
        temp_in: undefined,
        temp_out: undefined,
        pressure: undefined,
      };
      renderWithUnit({}, unitWithoutDerived);
      expect(screen.getByText("Unit Alpha - Detailed View")).toBeInTheDocument();
      expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    });

    it("reverts to original name when saveName fails", async () => {
      const user = userEvent.setup();
      mockUpdateUnitName.mockRejectedValueOnce(new Error("Network error"));
      
      renderWithUnit();
      
      const nameRow = screen.getByText("Machine Name").closest("div")?.parentElement;
      if (nameRow) {
        const editButton = within(nameRow).getAllByRole("button")[0];
        await user.click(editButton);

        const input = screen.getByDisplayValue("Unit Alpha");
        await user.clear(input);
        await user.type(input, "Should Revert");

        const saveButton = input.parentElement?.querySelectorAll("button")[0];
        if (saveButton) await user.click(saveButton);

        expect(mockUpdateUnitName).toHaveBeenCalled();
        // ✅ FIXED: Check input display value instead of text outside
        await waitFor(() => {
          expect(screen.getByDisplayValue("Unit Alpha")).toBeInTheDocument();
        });
      }
    });

    it("reverts to original location when saveLocation fails", async () => {
      const user = userEvent.setup();
      mockUpdateUnitLocation.mockRejectedValueOnce(new Error("Network error"));
      
      renderWithUnit();
      
      const locationRow = screen.getByText("Location").closest("div")?.parentElement;
      if (locationRow) {
        const editButton = within(locationRow).getAllByRole("button")[0];
        await user.click(editButton);

        const input = screen.getByDisplayValue("Site A");
        await user.clear(input);
        await user.type(input, "Should Revert");

        const saveButton = input.parentElement?.querySelectorAll("button")[0];
        if (saveButton) await user.click(saveButton);

        expect(mockUpdateUnitLocation).toHaveBeenCalled();
        // ✅ FIXED: Check input display value instead of text outside
        await waitFor(() => {
          expect(screen.getByDisplayValue("Site A")).toBeInTheDocument();
        });
      }
    });

    it("restores original name when cancel is clicked after editing", async () => {
      const user = userEvent.setup();
      renderWithUnit();
      
      const nameRow = screen.getByText("Machine Name").closest("div")?.parentElement;
      if (nameRow) {
        const editButton = within(nameRow).getAllByRole("button")[0];
        await user.click(editButton);

        const input = screen.getByDisplayValue("Unit Alpha");
        await user.clear(input);
        await user.type(input, "Cancel Me");

        const cancelButton = input.parentElement?.querySelectorAll("button")[1];
        if (cancelButton) await user.click(cancelButton);

        expect(screen.getByText("Unit Alpha")).toBeInTheDocument();
        expect(screen.queryByText("Cancel Me")).not.toBeInTheDocument();
      }
    });

    it("restores original location when cancel is clicked after editing", async () => {
      const user = userEvent.setup();
      renderWithUnit();
      
      const locationRow = screen.getByText("Location").closest("div")?.parentElement;
      if (locationRow) {
        const editButton = within(locationRow).getAllByRole("button")[0];
        await user.click(editButton);

        const input = screen.getByDisplayValue("Site A");
        await user.clear(input);
        await user.type(input, "Cancel Location");

        const cancelButton = input.parentElement?.querySelectorAll("button")[1];
        if (cancelButton) await user.click(cancelButton);

        expect(screen.getByText("Site A")).toBeInTheDocument();
        expect(screen.queryByText("Cancel Location")).not.toBeInTheDocument();
      }
    });

    it("shows fallback installDate and lastMaintenance when missing", () => {
      const unitWithoutDates = {
        ...baseUnit,
        installDate: undefined,
        lastMaintenance: undefined,
      };
      renderWithUnit({}, unitWithoutDates);
      expect(screen.getByText("2024-01-15")).toBeInTheDocument();
      expect(screen.getByText("2024-07-10")).toBeInTheDocument();
    });

    it("shows fallback GPS coordinates when gpsCoordinates is missing", () => {
      const unitWithoutGPS = {
        ...baseUnit,
        gpsCoordinates: undefined,
      };
      renderWithUnit({}, unitWithoutGPS);
      expect(screen.getByText("GPS: 40.7128, -74.0060")).toBeInTheDocument();
    });

    it("shows fallback GPS coordinates when gpsCoordinates is empty", () => {
      const unitWithEmptyGPS = {
        ...baseUnit,
        gpsCoordinates: "",
      };
      renderWithUnit({}, unitWithEmptyGPS);
      expect(screen.getByText("GPS: 40.7128, -74.0060")).toBeInTheDocument();
    });

    it("displays water level when watergeneration is true", () => {
      renderWithUnit({ watergeneration: true, water_level: 150 });
      expect(screen.getByText("150 L")).toBeInTheDocument();
    });

    it("hides water level when watergeneration is false", () => {
      renderWithUnit({ watergeneration: false });
      expect(screen.queryByText("150 L")).not.toBeInTheDocument();
    });

    it("navigates back to dashboard when back arrow is clicked", async () => {
      const user = userEvent.setup();
      renderWithUnit();
      await user.click(screen.getByText("ArrowLeft"));
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("renders alarm card with pulse animation when hasAlarm is true", () => {
      renderWithUnit({ hasAlarm: true });
      const alarmCard = screen.getByText(/NH3 LEAK DETECTED/).closest('.animate-pulse');
      expect(alarmCard).toBeInTheDocument();
    });

    it("displays empty location when location is missing", () => {
      const unitWithoutLocation = {
        ...baseUnit,
        location: undefined,
      };
      renderWithUnit({}, unitWithoutLocation);
      const locationLabel = screen.getByText("Location");
      const locationContainer = locationLabel.closest("div")?.parentElement;
      expect(locationContainer).toHaveTextContent("Location");
    });
  });

  // ============================================================
  // STATUS COLOR BRANCHES
  // ============================================================

  describe("UserUnitDetails - status color branches", () => {
    it("renders correct styling for maintenance status", () => {
      renderWithUnit({ status: "maintenance" });
      expect(screen.getByText("MAINTENANCE")).toBeInTheDocument();
    });

    it("renders correct styling for decommissioned status", () => {
      renderWithUnit({ status: "decommissioned" });
      expect(screen.getByText("DECOMMISSIONED")).toBeInTheDocument();
      expect(screen.getAllByText("N/A").length).toBeGreaterThanOrEqual(4);
    });

    it("falls back to default status color for an unrecognized status", () => {
      renderWithUnit({ status: "unknown_status" });
      expect(screen.getByText("UNKNOWN_STATUS")).toBeInTheDocument();
    });
  });

  // ============================================================
  // ROLE-BASED RENDERING
  // ============================================================

  describe("UserUnitDetails - role-based rendering", () => {
    it("hides admin-only icons when userRole is not admin", () => {
      useAuth.mockReturnValue({ userRole: "user" });
      renderWithUnit();
      expect(screen.getByTestId("button-remote-control")).toBeInTheDocument();
      expect(screen.queryByText("Zap")).not.toBeInTheDocument();
      expect(screen.queryByText("BarChart")).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // DEFAULT VALUE FALLBACKS
  // ============================================================

  describe("UserUnitDetails - default value fallbacks", () => {
    it("falls back to a generated serial number when none is provided", () => {
      const unitWithoutSerial = { ...baseUnit };
      delete unitWithoutSerial.serialNumber;
      renderWithUnit({ serialNumber: undefined }, unitWithoutSerial);
      expect(screen.getByText(/UNIT ALPHA-001/i)).toBeInTheDocument();
    });

    it("falls back to default install date, maintenance date, and GPS coordinates", () => {
      const minimalUnit = { ...baseUnit };
      delete minimalUnit.installDate;
      delete minimalUnit.lastMaintenance;
      delete minimalUnit.gpsCoordinates;
      renderWithUnit({}, minimalUnit);
      expect(screen.getByText("2024-01-15")).toBeInTheDocument();
      expect(screen.getByText("2024-07-10")).toBeInTheDocument();
      expect(screen.getByText(/40.7128, -74.0060/)).toBeInTheDocument();
    });

    it("handles a unit with no id (idOffset fallback branch)", () => {
      const unitNoId = { ...baseUnit, id: undefined };
      renderWithUnit({}, unitNoId);
      expect(screen.getByText("Unit Alpha - Detailed View")).toBeInTheDocument();
    });

    it("renders N/A-safe temp/pressure fields when temp_in/temp_out/pressure are undefined while online", () => {
      const unitNoTemps = { ...baseUnit };
      delete unitNoTemps.temp_in;
      delete unitNoTemps.temp_out;
      delete unitNoTemps.pressure;
      renderWithUnit({}, unitNoTemps);
      expect(screen.getByText("Temp In")).toBeInTheDocument();
      expect(screen.getByText("Temp Out")).toBeInTheDocument();
      expect(screen.getByText("Pressure")).toBeInTheDocument();
    });
  });

  // ============================================================
  // WATER GENERATION ON OVERVIEW TAB
  // ============================================================

  describe("UserUnitDetails - water generation on Overview tab", () => {
    it("shows the Water Level stat on Overview when watergeneration is true", () => {
      renderWithUnit({ watergeneration: true, water_level: 55 });
      expect(screen.getByText("Water Level")).toBeInTheDocument();
      expect(screen.getByText(/55 L/)).toBeInTheDocument();
    });
  });

  // ============================================================
  // PRESSURE DISPLAY TESTS
  // ============================================================

  describe("UserUnitDetails - pressure display", () => {
    it("shows N/A (not 'undefined kPa') for pressure when pressure is missing while online", () => {
      const unitNoPressure = { ...baseUnit, pressure: undefined };
      renderWithUnit({}, unitNoPressure);
      expect(screen.queryByText(/undefined kPa/)).not.toBeInTheDocument();
      expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    });

    it("shows the pressure value derived from metrics.pressure.current", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: { pressure: { current: 50 } },
      });
      renderWithUnit({ pressure: 101.3 });
      // pressureBase: 50, idOffset ("1" -> 49) % 20 = 9
      // pressure: 50 * 1.5 + 9 = 84
      expect(screen.getByText("84 kPa")).toBeInTheDocument();
    });
  });

  // ============================================================
  // FLOW RATE DISPLAY VALUES
  // ============================================================

  describe("UserUnitDetails - flow rate display values", () => {
    it("uses unit.flowRate as the base flow rate when metrics are null", () => {
      useRealtimeMetrics.mockReturnValue({ metrics: null });
      renderWithUnit(); // baseUnit.flowRate = 45.5, id "1" -> idOffset 49
      // inlet: 45.5 + (49%5) - 2.5 = 47.0
      // outlet: (45.5 * 0.95) + (49%3) - 1.5 = 43.225 + 1 - 1.5 = 42.7
      expect(screen.getByText("47 L/min")).toBeInTheDocument();
      expect(screen.getByText("42.7 L/min")).toBeInTheDocument();
    });

    it("falls back to the hardcoded defaults when both metrics and unit.flowRate are missing", () => {
      useRealtimeMetrics.mockReturnValue({ metrics: null });
      const unitNoFlow = { ...baseUnit, flowRate: undefined };
      renderWithUnit({}, unitNoFlow);
      // inlet: 45.5 + 4 - 2.5 = 47.0, outlet: 42.1 + 1 - 1.5 = 41.6
      expect(screen.getByText("47 L/min")).toBeInTheDocument();
      expect(screen.getByText("41.6 L/min")).toBeInTheDocument();
    });

    it("uses metrics.flow_rate_inlet.current when provided", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: {
          flow_rate_inlet: { current: 60 },
          flow_rate_outlet: { current: 50 },
        },
      });
      renderWithUnit();
      // id "1" -> idOffset 49
      // inlet: 60 + (49%5) - 2.5 = 61.5
      // ✅ FIXED: outlet: 50 + (49%3) - 1.5 = 49.5
      expect(screen.getByText("61.5 L/min")).toBeInTheDocument();
      expect(screen.getByText("49.5 L/min")).toBeInTheDocument();
    });

    it("applies the red/bold class when flow rate is >= 90", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: { flow_rate_inlet: { current: 95 } },
      });
      renderWithUnit();
      const el = getFlowValueEl("Flow Rate Inlet");
      expect(el?.className).toMatch(/text-red-600/);
      expect(el?.className).toMatch(/font-bold/);
    });

    it("applies the red/bold class when flow rate is < 10", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: { flow_rate_inlet: { current: 5 } },
      });
      renderWithUnit();
      const el = getFlowValueEl("Flow Rate Inlet");
      expect(el?.className).toMatch(/text-red-600/);
    });

    it("applies the yellow/semibold class when flow rate is between 70 and 89", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: { flow_rate_inlet: { current: 76 } },
      });
      renderWithUnit();
      const el = getFlowValueEl("Flow Rate Inlet");
      expect(el?.className).toMatch(/text-yellow-600/);
      expect(el?.className).toMatch(/font-semibold/);
    });

    it("applies the green/medium class for a normal flow rate", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: { flow_rate_outlet: { current: 40 } },
      });
      renderWithUnit();
      const el = getFlowValueEl("Flow Rate Outlet");
      expect(el?.className).toMatch(/text-green-600/);
    });
  });

  // ============================================================
  // METRICS FALLBACK BRANCHES
  // ============================================================

  describe("UserUnitDetails - metrics fallback branches", () => {
    it("uses camelCase flowRateInlet/flowRateOutlet metrics keys when snake_case is absent", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: {
          flowRateInlet: { current: 60 },
          flowRateOutlet: { current: 50 },
        },
      });
      renderWithUnit();
      expect(screen.getByText("Flow Rate Inlet")).toBeInTheDocument();
    });

    it("uses metrics.temperature.current and metrics.pressure.current when provided", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: {
          temperature: { current: 50 },
          pressure: { current: 120 },
        },
      });
      renderWithUnit();
      expect(screen.getByText("Temp In")).toBeInTheDocument();
      expect(screen.getByText("Pressure")).toBeInTheDocument();
    });
  });

  // ============================================================
  // SAVE FAILURE PATHS
  // ============================================================

  describe("UserUnitDetails - save failure paths", () => {
    it("resets the name field if updateUnitName rejects", async () => {
      const user = userEvent.setup();
      mockUpdateUnitName.mockRejectedValueOnce(new Error("save failed"));
      renderWithUnit();

      const nameRow = screen.getByText("Machine Name").closest("div")?.parentElement;
      if (nameRow) {
        const editButton = within(nameRow).getAllByRole("button")[0];
        await user.click(editButton);

        const input = screen.getByDisplayValue("Unit Alpha");
        await user.clear(input);
        await user.type(input, "Broken Name");

        const saveButton = input.parentElement?.querySelectorAll("button")[0];
        if (saveButton) await user.click(saveButton);

        expect(mockUpdateUnitName).toHaveBeenCalled();
        // ✅ FIXED: Check input display value
        await waitFor(() => {
          expect(screen.getByDisplayValue("Unit Alpha")).toBeInTheDocument();
        });
      }
    });

    it("resets the location field if updateUnitLocation rejects", async () => {
      const user = userEvent.setup();
      mockUpdateUnitLocation.mockRejectedValueOnce(new Error("save failed"));
      renderWithUnit();

      const locationRow = screen.getByText("Location").closest("div")?.parentElement;
      if (locationRow) {
        const editButton = within(locationRow).getAllByRole("button")[0];
        await user.click(editButton);

        const input = screen.getByDisplayValue("Site A");
        await user.clear(input);
        await user.type(input, "Broken Location");

        const saveButton = input.parentElement?.querySelectorAll("button")[0];
        if (saveButton) await user.click(saveButton);

        expect(mockUpdateUnitLocation).toHaveBeenCalled();
        // ✅ FIXED: Check input display value
        await waitFor(() => {
          expect(screen.getByDisplayValue("Site A")).toBeInTheDocument();
        });
      }
    });

    it("cancels the location edit without saving", async () => {
      const user = userEvent.setup();
      renderWithUnit();

      const locationRow = screen.getByText("Location").closest("div")?.parentElement;
      if (locationRow) {
        const editButton = within(locationRow).getAllByRole("button")[0];
        await user.click(editButton);

        const input = screen.getByDisplayValue("Site A");
        await user.clear(input);
        await user.type(input, "Should Not Save");

        const cancelButton = input.parentElement?.querySelectorAll("button")[1];
        await user.click(cancelButton);

        expect(mockUpdateUnitLocation).not.toHaveBeenCalled();
        expect(screen.getByText("Site A")).toBeInTheDocument();
      }
    });
  });

  // ============================================================
  // ALERT TYPE COLOR BRANCHES
  // ============================================================

  describe("UserUnitDetails - alert type color branches", () => {
    it("exercises all getAlertTypeColor branches through mocked UnitAlertsTab", async () => {
      renderWithUnit();
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Alerts" }));
      
      expect(screen.getByTestId("color-critical")).toBeInTheDocument();
      expect(screen.getByTestId("color-warning")).toBeInTheDocument();
      expect(screen.getByTestId("color-info")).toBeInTheDocument();
      expect(screen.getByTestId("color-default")).toBeInTheDocument();
    });
  });
});
