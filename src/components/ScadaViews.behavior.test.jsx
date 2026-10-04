import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { ScadaProvider } from "../context/ScadaContext";
import { acknowledgeCondition } from "../services/conditionService";
import { generatePortfolioReport } from "../services/portfolioReportService";
import { getScadaHistory } from "../services/scadaHistoryService";
import { getPortfolioHistory } from "../services/unitService";
import { apiGetJson } from "../utils/apiFetch";
import AdvancedAlertDashboard from "./alerts/AdvancedAlertDashboard";
import PerformanceAnalyticsDashboard from "./analytics/PerformanceAnalyticsDashboard";
import ScadaMainPage from "./ScadaMainPage";

const state = vi.hoisted(() => ({ portfolio: {}, auth: {} }));
vi.mock("../context/UnitContext", () => ({ useUnits: () => state.portfolio }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => state.auth }));
vi.mock("../context/TenantContext", () => ({
  useTenant: () => ({ canSwitchTenants: false }),
}));
vi.mock("../context/AnalyticsContext", () => ({
  useAnalytics: () => ({ assumptions: {} }),
}));
vi.mock("../config/runtime", () => ({ isDemoMode: false }));
vi.mock("../services/scadaHistoryService", () => ({
  getScadaHistory: vi.fn(),
}));
vi.mock("../services/unitService", () => ({ getPortfolioHistory: vi.fn() }));
vi.mock("../utils/apiFetch", () => ({ apiGetJson: vi.fn() }));
vi.mock("../services/portfolioReportService", () => ({
  generatePortfolioReport: vi.fn(),
}));
vi.mock("../services/conditionService", async (original) => ({
  ...(await original()),
  acknowledgeCondition: vi.fn(),
}));
const unit = {
  id: "A",
  name: "Tenant A machine",
  tenantId: 1,
  status: "online",
  healthStatus: "warning",
  currentPower: 12,
  usefulHeat: 18,
  usefulChill: 6,
  waterRate: 4,
  tempIn: 50,
  tempOutHot: 70,
  tempOutChill: 12,
  awgWaterLevel: 30,
  flowRateInlet: 5,
  flowRateOutChill: 6,
  flowRateOutHot: 7,
  differentialPressure: 5,
  batteryVoltage: 24,
  processDiagram: {
    nodes: [
      {
        id: "heat",
        label: "Metered heat",
        field: "usefulHeat",
        unit: "kWth",
        x: 10,
        y: 20,
      },
    ],
    connections: [],
  },
};
const today = new Date().toISOString().slice(0, 10);
beforeEach(() => {
  state.auth = { user: { id: 7 }, permissions: { canControlUnits: true } };
  state.portfolio = {
    units: [unit, { ...unit, id: "B", name: "Tenant B machine" }],
    scopeKey: "tenant:1",
    alerts: [],
    events: [],
    loading: false,
    refreshUnits: vi.fn().mockResolvedValue(),
  };
  getScadaHistory.mockResolvedValue([
    {
      unitId: "A",
      timestamp: `${today}T00:00:00Z`,
      tempIn: 50,
      power: 12,
      usefulHeat: 18,
    },
  ]);
  getPortfolioHistory.mockResolvedValue([
    {
      unitId: "A",
      date: today,
      grossKWh: 120,
      observedHours: 12,
      operatingHours: 6,
    },
    {
      unitId: "B",
      date: today,
      grossKWh: 99999,
      observedHours: 24,
      operatingHours: 24,
    },
  ]);
  apiGetJson.mockResolvedValue({ data: [] });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    Object.fromEntries(
      [
        "clearRect",
        "beginPath",
        "arc",
        "stroke",
        "fill",
        "moveTo",
        "lineTo",
      ].map((k) => [k, vi.fn()]),
    ),
  );
});
function Location() {
  const location = useLocation();
  return <output aria-label="location">{location.search}</output>;
}
it("keeps advanced visualization, analytics and alerts distinct and updates deep-link tabs", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ScadaMainPage />
      <Location />
    </MemoryRouter>,
  );
  expect(await screen.findByText("Critical Metrics")).toBeInTheDocument();
  expect(screen.getByText("Metered heat")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Gauges" }));
  expect(screen.getByText("All System Gauges")).toBeInTheDocument();
  for (const name of [
    "Electrical Power",
    "Useful Heating",
    "Useful Chilling",
    "Potable AWG Water Production",
  ])
    expect(screen.getByText(name)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Trends" }));
  expect(screen.getByText("Machine Metric Analysis")).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Trend metric"), "usefulHeat");
  expect(screen.getByText("18.0")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Process Flow" }));
  expect(
    screen.getByRole("img", { name: "Complete Process Flow" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("location")).toHaveTextContent(
    "subtab=processflow",
  );
  await user.click(screen.getByRole("tab", { name: "Analytics", exact: true }));
  expect(
    (await screen.findAllByText("Production Availability")).length,
  ).toBeGreaterThan(0);
  for (const [name, heading] of [
    ["Equipment Health", "Overall System Health"],
    ["Energy", "Electrical Production Trend"],
    ["Predictive", "Predictive Maintenance Insights"],
  ]) {
    await user.click(screen.getByRole("button", { name }));
    expect(await screen.findByText(heading)).toBeInTheDocument();
  }
  expect(
    screen.getByText(/validated remaining-life model is not configured/),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Alerts", exact: true }));
  expect(screen.getByLabelText("location")).toHaveTextContent("?tab=alerts");
  expect(screen.getByText(/No alerts found/i)).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("SCADA unit"), "B");
  await waitFor(() =>
    expect(getScadaHistory).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "B" }),
      "24h",
    ),
  );
});
it("uses only selected-unit measurements, shows unavailable unsupported metrics and scopes exports", async () => {
  const user = userEvent.setup();
  render(
    <ScadaProvider>
      <PerformanceAnalyticsDashboard />
    </ScadaProvider>,
  );
  expect((await screen.findAllByText("50.0%")).length).toBeGreaterThan(0);
  expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  await user.click(screen.getByRole("tab", { name: "Energy", exact: true }));
  expect(await screen.findByText("120 kWh")).toBeInTheDocument();
  expect(screen.queryByText(/99999/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Export" }));
  await waitFor(() =>
    expect(generatePortfolioReport).toHaveBeenCalledWith(
      state.portfolio,
      {},
      expect.objectContaining({
        scope: "single",
        selectedUnits: ["A"],
        outputFormat: "xlsx",
      }),
      7,
    ),
  );
  generatePortfolioReport.mockRejectedValueOnce(
    new Error("Export unavailable"),
  );
  await user.click(screen.getByRole("button", { name: "Export" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Export unavailable",
  );
});
it("surfaces unavailable live history without replacing it with demo analytics", async () => {
  getPortfolioHistory.mockRejectedValue(new Error("Telemetry service offline"));
  render(
    <ScadaProvider>
      <PerformanceAnalyticsDashboard defaultTab="energy" />
    </ScadaProvider>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Telemetry service offline",
  );
  expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  expect(screen.queryByText("120 kWh")).not.toBeInTheDocument();
});
it("filters advanced conditions by exact unit and preserves acknowledgement failure and permission checks", async () => {
  const user = userEvent.setup();
  state.portfolio.alerts = [
    {
      id: 1,
      unitId: "A",
      category: "alarm",
      title: "NH3 detector",
      message: "Measured NH3 exceeded threshold",
      severity: "critical",
      timestamp: new Date().toISOString(),
    },
    {
      id: 2,
      unitId: "B",
      category: "alert",
      title: "Foreign tenant warning",
      message: "Foreign",
      severity: "warning",
    },
  ];
  const { rerender } = render(
    <ScadaProvider>
      <AdvancedAlertDashboard />
    </ScadaProvider>,
  );
  expect(screen.getByText("NH3 detector")).toBeInTheDocument();
  expect(screen.queryByText("Foreign tenant warning")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Acknowledge" }));
  const dialog = screen.getByRole("dialog");
  await user.type(
    within(dialog).getByPlaceholderText("Enter acknowledgment notes..."),
    "Inspection requested",
  );
  acknowledgeCondition.mockRejectedValueOnce(
    new Error("Acknowledgement rejected"),
  );
  await user.click(within(dialog).getByRole("button", { name: "Acknowledge" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "Acknowledgement rejected",
  );
  expect(state.portfolio.refreshUnits).not.toHaveBeenCalled();
  acknowledgeCondition.mockResolvedValueOnce({});
  await user.click(within(dialog).getByRole("button", { name: "Acknowledge" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(acknowledgeCondition).toHaveBeenLastCalledWith(
    unit,
    expect.objectContaining({ id: 1 }),
    "Inspection requested",
    state.auth.user,
  );
  state.auth.permissions.canControlUnits = false;
  rerender(
    <ScadaProvider>
      <AdvancedAlertDashboard />
    </ScadaProvider>,
  );
  expect(
    screen.queryByRole("button", { name: "Acknowledge" }),
  ).not.toBeInTheDocument();
});
