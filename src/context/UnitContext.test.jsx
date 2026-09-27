import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthProvider } from "./AuthContext";
import { TenantProvider, useTenant } from "./TenantContext";
import { UnitProvider, useUnits } from "./UnitContext";
import { AnalyticsProvider, useAnalytics } from "./AnalyticsContext";
import { getPermissions } from "../utils/permissions";
import * as service from "../services/unitService";
import { apiGetJson } from "../utils/apiFetch";
vi.mock("../services/unitService", () => ({
  getAllUnits: vi.fn(),
  getPortfolioHistory: vi.fn(),
  getPortfolioEvents: vi.fn(),
  resetDemoState: vi.fn(),
  controlUnit: vi.fn(),
  updateUnitFields: vi.fn(),
}));
vi.mock("../utils/apiFetch", () => ({ apiGetJson: vi.fn() }));
const source = [
  {
    id: "B",
    name: "Beta Unit",
    tenantId: 2,
    clientId: 20,
    status: "online",
    currentPower: 90,
  },
  {
    id: "A",
    name: "Alpha Unit",
    tenantId: 1,
    clientId: 10,
    status: "online",
    currentPower: 10,
  },
];
const records = source.map((u) => ({
  unitId: u.id,
  date: new Date().toISOString().slice(0, 10),
  grossKWh: u.currentPower * 2,
  parasiticKWh: 0,
  selfConsumedKWh: u.currentPower,
  exportedKWh: u.currentPower,
  waterLitres: 0,
  observedHours: 2,
  operatingHours: 2,
}));
let state, analytics, unitAnalytics;
function Probe() {
  state = useUnits();
  analytics = useAnalytics();
  const tenant = useTenant();
  unitAnalytics = useAnalytics("A");
  return (
    <>
      <span data-testid="ids">{state.units.map((u) => u.id).join(",")}</span>
      <span data-testid="energy">
        {analytics.analytics.periods.recorded.grossKWh}
      </span>
      <span data-testid="status">
        {state.units.map((u) => u.status).join(",")}
      </span>
      <span data-testid="scope">{state.scopeLabel}</span>
      <span data-testid="loading">{String(state.loading)}</span>
      <button onClick={() => tenant.switchTenant(1)}>Alpha</button>
      <button onClick={() => tenant.switchTenant(2)}>Beta</button>
      <button onClick={() => tenant.switchTenant(null)}>All</button>
    </>
  );
}
const auth = (role, tenant = 1, client = 10, id = 1) => ({
  user: { id, tenantId: tenant, clientId: client },
  userRole: role === "viewer" || role === "operator" ? "user" : role,
  backendRole: role,
  permissions: getPermissions(role),
  isLoading: false,
  isAuthenticated: true,
});
const tree = (value) => (
  <AuthProvider value={value}>
    <TenantProvider>
      <UnitProvider>
        <AnalyticsProvider>
          <Probe />
        </AnalyticsProvider>
      </UnitProvider>
    </TenantProvider>
  </AuthProvider>
);
beforeEach(() => {
  vi.clearAllMocks();
  service.getAllUnits.mockResolvedValue(source);
  service.getPortfolioHistory.mockResolvedValue(records);
  service.getPortfolioEvents.mockResolvedValue([]);
  apiGetJson.mockImplementation(async (url) => ({
    data: url.includes("current")
      ? { id: 1, name: "Alpha", client_id: 10 }
      : [
          { id: 1, name: "Alpha", client_id: 10 },
          { id: 2, name: "Beta", client_id: 20 },
        ],
  }));
});
describe("Shared tenant portfolio", () => {
  it("keeps individual unit costs separate from the portfolio's fixed costs", async () => {
    render(tree(auth("admin")));
    await waitFor(() => expect(state.loading).toBe(false));
    act(() =>
      analytics.setAssumptions({
        operatingCostMonthly: 1000,
        initialInvestment: 20000,
        electricityCost: 0.5,
      }),
    );
    expect(unitAnalytics.assumptions.operatingCostMonthly).toBe(0);
    expect(unitAnalytics.assumptions.initialInvestment).toBe(0);
    expect(unitAnalytics.assumptions.electricityCost).toBe(0.5);
    act(() =>
      unitAnalytics.setAssumptions({
        operatingCostMonthly: 75,
        initialInvestment: 5000,
      }),
    );
    expect(unitAnalytics.assumptions.operatingCostMonthly).toBe(75);
    expect(analytics.assumptions.operatingCostMonthly).toBe(1000);
  });
  it("recalculates all analytics when an admin switches tenant", async () => {
    render(tree(auth("admin")));
    await waitFor(() =>
      expect(screen.getByTestId("ids")).toHaveTextContent("B,A"),
    );
    expect(screen.getByTestId("energy")).toHaveTextContent("200");
    fireEvent.click(screen.getByText("Alpha"));
    expect(screen.getByTestId("ids")).toHaveTextContent(/^A$/);
    expect(screen.getByTestId("energy")).toHaveTextContent(/^20$/);
    fireEvent.click(screen.getByText("Beta"));
    expect(screen.getByTestId("ids")).toHaveTextContent(/^B$/);
    expect(screen.getByTestId("energy")).toHaveTextContent(/^180$/);
    fireEvent.click(screen.getByText("All"));
    expect(state.units).toHaveLength(2);
  });
  it.each(["viewer", "operator", "client_admin"])(
    "%s never sees another tenant's portfolio",
    async (role) => {
      render(tree(auth(role)));
      await waitFor(() =>
        expect(screen.getByTestId("loading")).toHaveTextContent("false"),
      );
      expect(state.units.map((u) => u.id)).toEqual(["A"]);
      fireEvent.click(screen.getByText("Beta"));
      expect(state.units.map((u) => u.id)).toEqual(["A"]);
      expect(state.getUnit("B")).toBeUndefined();
      expect(state.records).toHaveLength(1);
    },
  );
  it("does not broaden an unassigned viewer to the fleet", async () => {
    apiGetJson.mockResolvedValue({ data: null });
    render(tree(auth("viewer", null)));
    await waitFor(() => expect(state.loading).toBe(false));
    expect(state.units).toEqual([]);
  });
  it("keeps assumption overrides separate per tenant", async () => {
    render(tree(auth("admin")));
    await waitFor(() => expect(state.loading).toBe(false));
    fireEvent.click(screen.getByText("Alpha"));
    act(() => analytics.setAssumptions({ electricityCost: 1 }));
    fireEvent.click(screen.getByText("Beta"));
    expect(analytics.assumptions.electricityCost).toBe(0.4);
    fireEvent.click(screen.getByText("Alpha"));
    expect(analytics.assumptions.electricityCost).toBe(1);
  });
  it("updates shared state only after a successful control and records history", async () => {
    render(tree(auth("operator")));
    await waitFor(() => expect(state.loading).toBe(false));
    service.controlUnit.mockResolvedValue({
      unit: { ...source[1], status: "offline" },
      action: { id: "action", unitId: "A" },
    });
    await act(() => state.controlUnit("A", { machinePower: false }));
    expect(screen.getByTestId("status")).toHaveTextContent("offline");
    expect(state.events).toHaveLength(1);
    service.controlUnit.mockRejectedValue(new Error("No acknowledgement"));
    await expect(
      state.controlUnit("A", { machinePower: true }),
    ).rejects.toThrow("acknowledgement");
    expect(state.units[0].status).toBe("offline");
  });
  it("blocks viewer controls and cross-portfolio control attempts before API calls", async () => {
    const { rerender } = render(tree(auth("viewer")));
    await waitFor(() => expect(state.loading).toBe(false));
    await expect(state.controlUnit("A", {})).rejects.toThrow("permission");
    rerender(tree(auth("operator")));
    await waitFor(() => expect(state.loading).toBe(false));
    await expect(state.controlUnit("B", {})).rejects.toThrow("outside");
    expect(service.controlUnit).not.toHaveBeenCalled();
  });
  it("discards an old user's pending portfolio response on logout", async () => {
    let complete;
    service.getAllUnits.mockImplementationOnce(
      () =>
        new Promise((r) => {
          complete = r;
        }),
    );
    const { rerender } = render(tree(auth("admin")));
    await waitFor(() => expect(service.getAllUnits).toHaveBeenCalled());
    rerender(tree({ user: null, backendRole: null }));
    await act(async () => complete(source));
    expect(state.units).toEqual([]);
    expect(state.records).toEqual([]);
  });
  it("surfaces load errors without substituting unscoped data", async () => {
    service.getAllUnits.mockRejectedValue(new Error("Telemetry unavailable"));
    render(tree(auth("admin")));
    await waitFor(() => expect(state.error).toBe("Telemetry unavailable"));
    expect(state.units).toEqual([]);
  });
});
