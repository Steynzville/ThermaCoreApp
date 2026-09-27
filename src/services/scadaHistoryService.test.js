import { describe, it, expect, vi, beforeEach } from "vitest";
const mode = vi.hoisted(() => ({ demo: false }));
const api = vi.hoisted(() => vi.fn());
vi.mock("../config/runtime", () => ({
  get isDemoMode() {
    return mode.demo;
  },
}));
vi.mock("../utils/apiFetch", () => ({ apiGetJson: api }));
import { getScadaHistory } from "./scadaHistoryService";
describe("SCADA history data boundary", () => {
  beforeEach(() => {
    mode.demo = false;
    api.mockReset();
  });
  it("queries the exact unit at bounded minute or hourly resolution", async () => {
    api.mockResolvedValue({
      data: [{ date: "2026-09-25T12:00:00Z", power: 3 }],
    });
    const now = new Date("2026-09-26T12:00:00Z");
    const data = await getScadaHistory({ id: "A/B" }, "1h", now);
    const url = new URL(api.mock.calls[0][0], "https://example.test");
    expect(url.pathname).toBe("/api/v1/units/A%2FB/scada-history");
    expect(url.searchParams.get("resolution")).toBe("minute");
    expect(url.searchParams.get("from")).toBe("2026-09-26T11:00:00.000Z");
    expect(data[0].timestamp).toBe("2026-09-25T12:00:00Z");
    await getScadaHistory({ id: "A" }, "30d", now);
    expect(api.mock.calls[1][0]).toContain("resolution=hour");
  });
  it("never substitutes demo telemetry after a live failure", async () => {
    api.mockRejectedValue(new Error("Unavailable"));
    await expect(getScadaHistory({ id: "A" })).rejects.toThrow("Unavailable");
    await expect(getScadaHistory({ id: "A" }, "invalid")).rejects.toThrow(
      "period",
    );
  });
  it("demo history is deterministic and preserves absent channels", async () => {
    mode.demo = true;
    const unit = { id: "A", demoNominalPower: 10, usefulHeat: 8 };
    const now = new Date("2026-09-26T12:00:00Z");
    const rows = await getScadaHistory(unit, "1h", now);
    expect(rows).toHaveLength(60);
    expect(rows).toEqual(await getScadaHistory(unit, "1h", now));
    expect(
      rows.every(
        (row) =>
          row.source === "demo" &&
          row.usefulHeat > 0 &&
          row.usefulChill === null,
      ),
    ).toBe(true);
    expect(api).not.toHaveBeenCalled();
  });
});
