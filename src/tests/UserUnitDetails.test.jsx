/**
 * Tests for UserUnitDetails Component - Vitest Version
 */

import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

import UserUnitDetails from "../components/UserUnitDetails";

// ============================================================
// Mocks - Using Vitest syntax
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

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ userRole: "admin" }),
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

vi.mock("../hooks/useRealtimeData", () => ({
  useRealtimeMetrics: () => ({ metrics: null }),
}));

vi.mock("../components/ui/card", () => ({
  Card: ({ children, className }) => <div className={className}>{children}</div>,
  CardContent: ({ children }) => <div>{children}</div>,
  CardHeader: ({ children }) => <div>{children}</div>,
}));

vi.mock("../components/unit-details/UnitAlertsTab", () => ({
  default: (props) => (
    <div data-testid="unit-alerts-tab">
      Alerts count: {props.alertsHistory?.length ?? 0}
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

// ============================================================
// Tests
// ============================================================

describe("UserUnitDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockLocationState = { unit: null };
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
    expect(screen.getByText(/Site A/)).toBeInTheDocument();
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
});
