import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { beforeEach, it, expect, vi } from "vitest";
import PerformanceDashboard from "../components/PerformanceDashboard";
import AlertsView from "../components/AlertsView";
import NotificationBell from "../components/NotificationBell";
import RemoteControl from "../components/RemoteControl";
import UnitDetails from "../components/UnitDetails";
import {
  DEFAULT_ASSUMPTIONS,
  portfolioAnalytics,
} from "../utils/portfolioAnalytics";
const { data, auth } = vi.hoisted(() => ({
  data: {},
  auth: { permissions: { canControlUnits: true, canManageUnits: true } },
}));
vi.mock("../context/UnitContext", () => ({ useUnits: () => data }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../context/SettingsContext", () => ({
  useSettings: () => ({
    formatTemperature: (n) => (n == null ? "N/A" : `${n}°C`),
    settings: {},
  }),
}));
vi.mock("../context/AnalyticsContext", () => ({
  useAnalytics: () => ({
    assumptions: DEFAULT_ASSUMPTIONS,
    analytics: portfolioAnalytics(data.units, data.records),
    setAssumptions: vi.fn(),
  }),
}));
const unit = {
  id: "A",
  name: "Alpha Unit",
  tenantId: 1,
  tenantName: "Alpha",
  status: "online",
  currentPower: 10,
  userLoad: 6,
  parasiticLoad: 1,
  client: {},
  watergeneration: true,
  waterProductionOn: true,
};
beforeEach(() => {
  auth.permissions = { canControlUnits: true, canManageUnits: true };
  Object.assign(data, {
    units: [unit],
    records: [
      {
        unitId: "A",
        date: new Date().toISOString().slice(0, 10),
        grossKWh: 100,
        selfConsumedKWh: 60,
        parasiticKWh: 10,
        exportedKWh: 30,
        observedHours: 12,
      },
    ],
    alerts: [
      {
        id: "a",
        unitId: "A",
        unitName: "Alpha Unit",
        message: "Alpha warning",
        severity: "warning",
      },
    ],
    events: [],
    loading: false,
    error: null,
    scopeLabel: "Alpha",
    isDemoMode: true,
    controlUnit: vi.fn().mockResolvedValue(unit),
    getUnit: (id) => data.units.find((u) => u.id === id),
  });
});
it("updates displayed performance statistics when the selected portfolio changes", () => {
  const { rerender } = render(<PerformanceDashboard />);
  expect(
    screen.getByText("Energy generated (Recorded total)").parentElement,
  ).toHaveTextContent("100");
  data.units = [{ ...unit, id: "B", currentPower: 50 }];
  data.records = [{ ...data.records[0], unitId: "B", grossKWh: 500 }];
  data.scopeLabel = "Beta";
  rerender(<PerformanceDashboard />);
  expect(screen.getByTestId("portfolio-scope")).toHaveTextContent("Beta");
  expect(
    screen.getByText("Energy generated (Recorded total)").parentElement,
  ).toHaveTextContent("500");
});
it("alerts and notifications render the same scoped conditions", () => {
  render(
    <MemoryRouter>
      <AlertsView />
      <NotificationBell />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("button", { name: "Notifications (1)" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Notifications (1)" }));
  expect(screen.getAllByText(/Alpha warning/)).toHaveLength(3);
  expect(screen.queryByText(/Beta warning/)).not.toBeInTheDocument();
});
it("shows gateway errors without claiming a successful control", async () => {
  data.controlUnit.mockRejectedValue(new Error("Gateway unavailable"));
  render(<RemoteControl unit={unit} />);
  fireEvent.click(screen.getByText("Turn power off"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Gateway unavailable",
  );
  expect(data.controlUnit).toHaveBeenCalledWith("A", { machinePower: false });
  expect(screen.getByText("Turn power off")).toBeInTheDocument();
});
it("disables all controls for a viewer", () => {
  auth.permissions.canControlUnits = false;
  render(<RemoteControl unit={unit} />);
  expect(screen.getByText("Turn power off")).toBeDisabled();
  expect(screen.getByText("Apply power setpoint")).toBeDisabled();
});
it("does not accept foreign unit data smuggled in route state", () => {
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/unit/B",
          state: { unit: { id: "B", name: "Foreign Unit" } },
        },
      ]}
    >
      <Routes>
        <Route path="/unit/:id" element={<UnitDetails />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText("Unit Not Found")).toBeInTheDocument();
  expect(screen.queryByText("Foreign Unit")).not.toBeInTheDocument();
});
it("resolves an authorized deep link without navigation state", () => {
  render(
    <MemoryRouter initialEntries={["/unit/A"]}>
      <Routes>
        <Route path="/unit/:id" element={<UnitDetails />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText("Alpha Unit")).toBeInTheDocument();
  expect(screen.queryByText("Unit Not Found")).not.toBeInTheDocument();
});
