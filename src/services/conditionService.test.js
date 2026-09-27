import { describe, it, expect, vi, beforeEach } from "vitest";
const api = vi.hoisted(() => vi.fn());
vi.mock("../config/runtime", () => ({ isDemoMode: false }));
vi.mock("../utils/apiFetch", () => ({ apiPostJson: api }));
vi.mock("./unitService", () => ({ updateUnitFields: vi.fn() }));
import { acknowledgeCondition, conditionStatistics } from "./conditionService";
describe("condition acknowledgement", () => {
  beforeEach(() => api.mockReset());
  it("requires an actual same-unit condition and propagates backend failure", async () => {
    await expect(
      acknowledgeCondition(
        { id: "A" },
        { unitId: "B", conditionId: 1 },
        "",
        {},
      ),
    ).rejects.toThrow("outside");
    await expect(
      acknowledgeCondition({ id: "A" }, { unitId: "A" }, "", {}),
    ).rejects.toThrow("gateway");
    expect(api).not.toHaveBeenCalled();
    api.mockRejectedValue(new Error("Permission denied"));
    await expect(
      acknowledgeCondition(
        { id: "A" },
        { unitId: "A", conditionId: 4 },
        "Investigating",
        {},
      ),
    ).rejects.toThrow("Permission denied");
    expect(api).toHaveBeenCalledWith(
      "/api/v1/units/A/conditions/4/acknowledge",
      { notes: "Investigating" },
    );
  });
  it("does not count acknowledgement as resolution or fabricate resolution times", () => {
    expect(
      conditionStatistics([{ severity: "critical", status: "acknowledged" }]),
    ).toEqual({
      bySeverity: { critical: 1, warning: 0 },
      byStatus: { resolved: 0 },
      avgResolutionTime: "Unavailable",
    });
    expect(
      conditionStatistics([
        {
          timestamp: "2026-01-01T00:00:00Z",
          resolved_at: "2026-01-01T00:12:00Z",
          status: "resolved",
        },
      ]).avgResolutionTime,
    ).toBe(12);
  });
});
