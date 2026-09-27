import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { AnalyticsProvider } from "../context/AnalyticsContext";
import { useRealtimeMetrics } from "../hooks/useRealtimeData";
import { apiGetJson } from "../utils/apiFetch";
import TelemetryDashboard from "./TelemetryDashboard";
import ViewAnalytics, {
  formatRevenue,
  renderCustomizedLabel,
} from "./ViewAnalytics";

const state = vi.hoisted(() => ({ portfolio: {}, listener: null }));
vi.mock("../context/UnitContext", () => ({ useUnits: () => state.portfolio }));
vi.mock("../context/TenantContext", () => ({
  useTenant: () => ({ canSwitchTenants: false }),
}));
vi.mock("../config/runtime", () => ({ isDemoMode: false }));
vi.mock("../utils/apiFetch", () => ({ apiGetJson: vi.fn() }));
vi.mock("../services/websocketService", () => ({
  default: {
    getStatus: () => "disconnected",
    onStatusChange: (fn) => {
      state.listener = fn;
      return () => {
        state.listener = null;
      };
    },
  },
}));
const unit = {
  id: "A",
  name: "Actual Alpha",
  status: "online",
  currentPower: 10,
  tempIn: 60,
  tempOutChill: 10,
  differentialPressure: 4,
  healthStatus: "good",
};
beforeEach(() => {
  state.portfolio = {
    units: [unit],
    records: [
      {
        unitId: "A",
        date: "2026-09-01",
        grossKWh: 120,
        selfConsumedKWh: 70,
        exportedKWh: 40,
        observedHours: 24,
        operatingHours: 12,
      },
    ],
    scopeKey: "tenant:1",
    scopeLabel: "Tenant Alpha",
    isDemoMode: false,
    loading: false,
    error: null,
    refreshUnits: vi.fn(),
  };
  apiGetJson.mockResolvedValue({
    data: [
      {
        unitId: "A",
        date: "2026-08-01",
        revenue: 1000,
        productLine: "Heat Core",
      },
      {
        unitId: "A",
        date: "2026-09-01",
        revenue: 2000,
        productLine: "Chill Core",
      },
      {
        unitId: "FOREIGN",
        date: "2026-09-01",
        revenue: 99999999,
        productLine: "Foreign product",
      },
    ],
  });
});
it("renders real commercial totals/growth and rejects foreign sales from an overbroad API response", async () => {
  render(<ViewAnalytics />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Loading commercial records",
  );
  expect((await screen.findAllByText("$3K")).length).toBeGreaterThan(0);
  expect(screen.getByText("100.0%")).toBeInTheDocument();
  expect(screen.queryByText("Foreign product")).not.toBeInTheDocument();
  expect(apiGetJson).toHaveBeenCalledWith("/api/v1/portfolio/sales?unit_ids=A");
  expect(screen.getByText(/Recorded commercial sales/)).toBeInTheDocument();
  expect(screen.getByText("Sales Analytics")).toBeInTheDocument();
});
it("clears commercial data when scope changes and ignores a late prior-tenant response", async () => {
  let resolve;
  apiGetJson.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const { rerender } = render(<ViewAnalytics />);
  state.portfolio = {
    ...state.portfolio,
    units: [{ ...unit, id: "B" }],
    scopeKey: "tenant:2",
  };
  apiGetJson.mockResolvedValue({ data: [] });
  rerender(<ViewAnalytics />);
  await waitFor(() =>
    expect(screen.queryByRole("status")).not.toBeInTheDocument(),
  );
  await act(async () =>
    resolve({
      data: [
        {
          unitId: "A",
          date: "2026-09-01",
          revenue: 99999999,
          productLine: "Old tenant",
        },
      ],
    }),
  );
  expect(screen.queryByText("Old tenant")).not.toBeInTheDocument();
  expect(screen.getByText("$0")).toBeInTheDocument();
  expect(screen.getByText("N/A")).toBeInTheDocument();
});
it("shows commercial API failure with zero/unknown results instead of demonstration revenue", async () => {
  apiGetJson.mockRejectedValue(new Error("Sales service unavailable"));
  render(<ViewAnalytics />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Sales service unavailable",
  );
  expect(screen.getByText("$0")).toBeInTheDocument();
  expect(screen.getByText("N/A")).toBeInTheDocument();
});
it("formats currency boundaries and readable proportional chart labels", () => {
  expect([999, 1000, 999500, 1500000].map(formatRevenue)).toEqual([
    "$999",
    "$1K",
    "$1.00M",
    "$1.50M",
  ]);
  render(
    <svg role="img" aria-label="Sales distribution">
      {renderCustomizedLabel({
        cx: 100,
        cy: 100,
        midAngle: 0,
        innerRadius: 10,
        outerRadius: 50,
        percent: 0.25,
        name: "Heat",
      })}
    </svg>,
  );
  expect(screen.getByText("Heat 25%")).toHaveAttribute("text-anchor", "start");
});
it("shows shared measured telemetry, changes period, refreshes and tracks socket status without changing readings", async () => {
  const { unmount } = render(
    <MemoryRouter>
      <AnalyticsProvider>
        <TelemetryDashboard />
      </AnalyticsProvider>
    </MemoryRouter>,
  );
  expect(
    screen.getByText(/Live API · Stream disconnected/),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Actual Alpha" })).toHaveAttribute(
    "href",
    "/unit-details/A",
  );
  expect(screen.getByText("120 kWh")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Trend period"), {
    target: { value: "7" },
  });
  expect(screen.getByLabelText("Trend period")).toHaveValue("7");
  fireEvent.click(screen.getByText("Refresh readings"));
  expect(state.portfolio.refreshUnits).toHaveBeenCalledOnce();
  act(() => state.listener("connected"));
  expect(screen.getByText(/Stream connected/)).toBeInTheDocument();
  expect(screen.getByText("120 kWh")).toBeInTheDocument();
  unmount();
  expect(state.listener).toBeNull();
});
it("keeps unavailable telemetry empty and exposes loading/errors and explicit demo provenance", () => {
  state.portfolio = {
    ...state.portfolio,
    units: [],
    records: [],
    error: "Telemetry offline",
  };
  const { rerender } = render(
    <MemoryRouter>
      <AnalyticsProvider>
        <TelemetryDashboard />
      </AnalyticsProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Telemetry offline");
  expect(
    screen.getByText("No units assigned to this portfolio."),
  ).toBeInTheDocument();
  expect(
    screen.getByText("No historical readings available for this portfolio."),
  ).toBeInTheDocument();
  state.portfolio = { ...state.portfolio, isDemoMode: true, loading: true };
  rerender(
    <MemoryRouter>
      <AnalyticsProvider>
        <TelemetryDashboard />
      </AnalyticsProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText(/Demonstration data/)).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Loading readings");
  expect(screen.getByText("Refresh readings")).toBeDisabled();
});
function Metrics() {
  const result = useRealtimeMetrics();
  return <output>{JSON.stringify(result)}</output>;
}
it("keeps realtime metrics on the shared portfolio while connection state changes", () => {
  const { rerender } = render(<Metrics />);
  expect(screen.getByRole("status")).toHaveTextContent("disconnected");
  act(() => state.listener("reconnecting"));
  expect(screen.getByRole("status")).toHaveTextContent("reconnecting");
  state.portfolio = { ...state.portfolio, isDemoMode: true };
  rerender(<Metrics />);
  expect(screen.getByRole("status")).toHaveTextContent("demo");
});
