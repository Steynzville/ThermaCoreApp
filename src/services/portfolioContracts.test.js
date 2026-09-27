import { beforeEach, expect, it, vi } from "vitest";
import { apiFetch, apiGetJson, apiPostJson } from "../utils/apiFetch";
import {
  addSchedule,
  listSchedules,
  updateSchedule,
} from "./reportScheduleService";
import { getUnitHistory } from "./unitHistoryService";
import * as units from "./unitService";

const state = vi.hoisted(() => ({ demo: false, token: "access-token" }));
vi.mock("../config/runtime", () => ({
  get isDemoMode() {
    return state.demo;
  },
}));
vi.mock("../utils/authToken", () => ({ getAuthToken: () => state.token }));
vi.mock("../utils/apiFetch", () => ({
  apiGetJson: vi.fn(),
  apiPostJson: vi.fn(),
  apiFetch: vi.fn(),
}));
beforeEach(() => {
  state.demo = false;
  state.token = "access-token";
  localStorage.clear();
  units.resetDemoState();
});
it("paginates real units and never supplies demo units for empty or unavailable live responses", async () => {
  apiGetJson
    .mockResolvedValueOnce({
      data: [{ id: "A", name: "Actual", tenant_id: 3 }],
      has_next: true,
    })
    .mockResolvedValueOnce({ data: [{ id: "B", tenant_id: 4 }] });
  const loaded = await units.getAllUnits();
  expect(loaded.map((u) => u.id)).toEqual(["A", "B"]);
  expect(loaded[0].tenantId).toBe(3);
  expect(loaded.every((u) => u.source === "live")).toBe(true);
  apiGetJson.mockResolvedValue({ data: [] });
  expect(await units.getAllUnits()).toEqual([]);
  apiGetJson.mockRejectedValue(new Error("API offline"));
  await expect(units.getAllUnits()).rejects.toThrow("API offline");
  state.token = null;
  await expect(units.getAllUnits()).rejects.toThrow("Sign in");
});
it("chunks long-range real portfolio history without gaps, duplicated dates or unselected units", async () => {
  apiGetJson.mockImplementation(async (url) => ({
    data: [
      {
        date: new URL(url, "https://api.example").searchParams.get("from"),
        unitId: "A",
      },
    ],
  }));
  const rows = await units.getPortfolioHistory([{ id: "A" }], {
    from: "2023-01-01",
    to: "2025-01-01",
  });
  const queries = apiGetJson.mock.calls.map(
    ([url]) => new URL(url, "https://api.example").searchParams,
  );
  expect(queries).toHaveLength(3);
  expect(rows).toHaveLength(3);
  expect(queries.every((q) => q.get("unit_ids") === "A")).toBe(true);
  expect(queries[0].get("from")).toBe("2023-01-01");
  expect(queries.at(-1).get("to")).toBe("2025-01-01");
  for (let i = 1; i < queries.length; i++)
    expect(
      +new Date(queries[i].get("from")) - new Date(queries[i - 1].get("to")),
    ).toBe(86400000);
  await expect(
    units.getPortfolioHistory([{ id: "A" }], { from: "bad", to: "2025-01-01" }),
  ).rejects.toThrow("valid history dates");
  expect(await units.getPortfolioHistory([])).toEqual([]);
});
it("paginates both command and condition history while forwarding exact subset/date filters", async () => {
  apiGetJson
    .mockResolvedValueOnce({
      data: [{ id: "old", timestamp: "2026-01-01" }],
      has_next: true,
    })
    .mockResolvedValueOnce({ data: [{ id: "new", timestamp: "2026-01-03" }] })
    .mockResolvedValueOnce({
      data: [{ id: "alarm", timestamp: "2026-01-02" }],
    });
  expect(
    (await units.getPortfolioEvents({ unit_ids: "A", from: "2026-01-01" })).map(
      (e) => e.id,
    ),
  ).toEqual(["new", "alarm", "old"]);
  expect(
    apiGetJson.mock.calls.every(
      ([url]) => url.includes("unit_ids=A") && url.includes("from=2026-01-01"),
    ),
  ).toBe(true);
  expect(apiGetJson.mock.calls[1][0]).toContain("page=2");
});
it("propagates acknowledged live control results and never invents success after gateway failure", async () => {
  const action = { id: "ack", unitId: "A" };
  apiPostJson.mockResolvedValue({
    unit: { id: "A", current_power: 12 },
    action,
  });
  expect(await units.controlUnit({ id: "A" }, { powerSetpoint: 10 })).toEqual({
    unit: expect.objectContaining({ id: "A", currentPower: 12 }),
    action,
  });
  expect(apiPostJson).toHaveBeenCalledWith(
    "/api/v1/remote-control/units/A/controls",
    { powerSetpoint: 10 },
  );
  apiPostJson.mockRejectedValue(
    new Error("Gateway acknowledgement unavailable"),
  );
  await expect(
    units.controlUnit({ id: "A" }, { machinePower: false }),
  ).rejects.toThrow("acknowledgement");
  expect(await units.getRecentActions()).toEqual([]);
  apiFetch.mockResolvedValue({
    json: async () => ({ id: "A", serial_number: "real" }),
  });
  await units.updateUnitFields(
    { id: "A/1" },
    { serialNumber: "real", lastMaintenance: "2026-01-01" },
  );
  expect(apiFetch).toHaveBeenCalledWith("/api/v1/units/A%2F1", {
    method: "PUT",
    body: JSON.stringify({
      serial_number: "real",
      last_maintenance: "2026-01-01",
    }),
  });
  await expect(units.updateUnitGPS("A", {})).rejects.toThrow("not supported");
});
it("retains deterministic demo outputs/history and records simulated controls without contacting hardware", async () => {
  state.demo = true;
  state.token = null;
  const portfolio = await units.getAllUnits();
  expect(portfolio.length).toBeGreaterThan(0);
  const unit = portfolio.find((u) => u.demoNominalHeat > 0);
  expect(unit).toBeDefined();
  const range = { from: "2026-09-01", to: "2026-09-05" };
  const history = await units.getPortfolioHistory([unit], range);
  expect(await units.getPortfolioHistory([unit], range)).toEqual(history);
  const result = await units.controlUnit(unit, { machinePower: false });
  expect(result.unit.status).toBe("offline");
  expect(result.unit.usefulHeat).toBe(0);
  expect((await units.getUnitById(unit.id)).status).toBe("offline");
  expect(await units.getPortfolioEvents()).toEqual([result.action]);
  expect(await units.getPortfolioHistory([unit], range)).toEqual(history);
  await units.updateUnitName(unit.id, "Demo rename");
  expect((await units.searchUnits("Demo rename"))[0].id).toBe(unit.id);
  expect(apiPostJson).not.toHaveBeenCalled();
  expect(apiFetch).not.toHaveBeenCalled();
});
it("does not conceal unauthorized demo API responses or replace server ownership", async () => {
  state.demo = true;
  apiGetJson.mockRejectedValue(new Error("Unauthorized"));
  await expect(units.getAllUnits()).rejects.toThrow("Unauthorized");
  apiGetJson.mockResolvedValue({
    data: [
      { id: "TC001", name: "Server identity", tenant_id: 99, client_id: 88 },
    ],
  });
  expect(
    (await units.getAllUnits()).find((u) => u.id === "TC001"),
  ).toMatchObject({ name: "Server identity", tenantId: 99, clientId: 88 });
});
it("queries long-range unit history and leaves absent live measurements absent", async () => {
  apiGetJson.mockResolvedValue({ data: [] });
  const range = { from: "2020-01-01", to: "2025-01-01" };
  expect(await getUnitHistory({ id: "A/1" }, range)).toEqual([]);
  expect(apiGetJson.mock.calls[0][0]).toContain(
    "/units/A%2F1/history?from=2020-01-01&to=2025-01-01",
  );
  apiGetJson.mockRejectedValue(new Error("Offline"));
  await expect(getUnitHistory({ id: "A" }, range)).rejects.toThrow("Offline");
  await expect(
    getUnitHistory({ id: "A" }, { from: "2000-01-01", to: "2026-01-01" }),
  ).rejects.toThrow("ten years");
  state.demo = true;
  const history = await getUnitHistory(
    {
      id: "D",
      installDate: "2020-01-03",
      demoNominalPower: 5,
      demoNominalHeat: 10,
    },
    { from: "2020-01-01", to: "2020-01-04" },
  );
  expect(history).toHaveLength(2);
  expect(
    history.every(
      (r) => r.source === "demo" && r.power > 0 && r.usefulHeat > 0,
    ),
  ).toBe(true);
});
it("persists live schedule requests and forwards API failures", async () => {
  const config = { selectedUnits: ["A"], outputFormat: "pdf" },
    date = new Date(Date.now() + 86400000);
  apiPostJson.mockResolvedValue({ id: 1 });
  await addSchedule(7, config, date);
  expect(apiPostJson).toHaveBeenCalledWith(
    "/api/v1/portfolio/report-schedules",
    { config, scheduledAt: date.toISOString() },
  );
  apiGetJson.mockResolvedValue({ data: [{ id: 1 }] });
  expect(await listSchedules(7)).toEqual([{ id: 1 }]);
  apiFetch.mockResolvedValue({ json: async () => ({ status: "paused" }) });
  expect(await updateSchedule(7, 1, "paused")).toEqual({ status: "paused" });
  expect(apiFetch).toHaveBeenCalledWith(
    "/api/v1/portfolio/report-schedules/1",
    { method: "PATCH", body: '{"status":"paused"}' },
  );
  apiFetch.mockRejectedValue(new Error("Forbidden"));
  await expect(updateSchedule(7, 1, "processing")).rejects.toThrow("Forbidden");
});
it("isolates demo schedules by account and rejects past dates or missing records", async () => {
  state.demo = true;
  const row = await addSchedule(
    7,
    { selectedUnits: ["D"], outputFormat: "xlsx" },
    new Date(Date.now() + 86400000),
  );
  expect(await listSchedules(8)).toEqual([]);
  expect(await updateSchedule(7, row.id, "paused")).toMatchObject({
    status: "paused",
  });
  expect((await listSchedules(7))[0].status).toBe("paused");
  await expect(updateSchedule(8, row.id, "paused")).rejects.toThrow(
    "not found",
  );
  await expect(addSchedule(7, {}, new Date(0))).rejects.toThrow("future");
  expect(apiPostJson).not.toHaveBeenCalled();
});
