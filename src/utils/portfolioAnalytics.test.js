import { describe, it, expect } from "vitest";
import { scopeUnits, normalizeUnit } from "./portfolio";
import {
  DEFAULT_ASSUMPTIONS,
  periodAnalytics,
  portfolioAnalytics,
  validateAssumptions,
} from "./portfolioAnalytics";
const units = [
  {
    id: "foreign",
    tenantId: 2,
    clientId: 20,
    currentPower: 90,
    status: "online",
  },
  {
    id: "mine",
    tenantId: 1,
    clientId: 10,
    currentPower: 10,
    parasiticLoad: 1,
    userLoad: 6,
    status: "online",
  },
];
const row = {
  unitId: "mine",
  date: "2026-09-20",
  grossKWh: 100,
  parasiticKWh: 10,
  selfConsumedKWh: 60,
  exportedKWh: 30,
  waterLitres: 50,
  observedHours: 24,
  operatingHours: 20,
  failures: 2,
  repairHours: 4,
};
describe("Portfolio ownership", () => {
  it.each(["viewer", "operator", "user"])(
    "restricts %s by tenant id, not unit order",
    (role) => {
      expect(
        scopeUnits(units, { user: { tenant_id: 1 }, role }).map((u) => u.id),
      ).toEqual(["mine"]);
    },
  );
  it("restricts client admins and rejects a selected foreign tenant", () => {
    expect(
      scopeUnits(units, { user: { client_id: "10" }, role: "client_admin" }),
    ).toHaveLength(1);
    expect(
      scopeUnits(units, {
        user: { client_id: 10 },
        role: "client_admin",
        tenant: { id: 2 },
      }),
    ).toEqual([]);
  });
  it("allows admin selection across tenants", () => {
    expect(
      scopeUnits(units, { user: {}, role: "admin", tenant: { id: 2 } }).map(
        (u) => u.id,
      ),
    ).toEqual(["foreign"]);
  });
  it.each([null, {}, { tenant_id: null }])(
    "does not expose unassigned ownership: %j",
    (user) => {
      expect(
        scopeUnits([{ id: "x", tenantId: null }], { user, role: "viewer" }),
      ).toEqual([]);
    },
  );
  it("normalizes API ownership and preserves acknowledged controls", () => {
    const u = normalizeUnit({
      id: 3,
      tenant_id: 5,
      client_id: 9,
      tenant_name: "Site",
      status: "online",
      pressure: 1000,
      controls: { waterProductionOn: true, machinePower: false },
    });
    expect(u).toMatchObject({
      id: "3",
      tenantId: 5,
      clientId: 9,
      tenantName: "Site",
      differentialPressure: 1,
      waterProductionOn: true,
      machinePower: false,
    });
  });
});
describe("Recorded analytics", () => {
  it("does not report a complete portfolio benefit when a unit is missing or has shorter coverage", () => {
    const now = new Date("2026-09-21");
    expect(
      portfolioAnalytics(units, [row], DEFAULT_ASSUMPTIONS, now).periods
        .recorded.netBenefit,
    ).toBeNull();
    expect(
      portfolioAnalytics(
        units,
        [row, { ...row, unitId: "foreign", observedHours: 12 }],
        DEFAULT_ASSUMPTIONS,
        now,
      ).periods.recorded.netBenefit,
    ).toBeNull();
  });
  it("preserves measured self-use when generation readings are missing", () => {
    const totals = periodAnalytics([{ ...row, grossKWh: null }]);
    expect(totals.selfConsumedKWh).toBe(60);
    expect(totals.netBenefit).toBeNull();
  });
  it("retains water controls for an idle unit with a configured water sensor", () => {
    const u = normalizeUnit({
      id: "A",
      water_generation: false,
      sensors: [{ sensor_type: "water_flow", is_active: true }],
    });
    expect(u.watergeneration).toBe(true);
    expect(u.waterProductionOn).toBe(false);
  });
  it("separates self-use, export, incentive and portfolio costs", () => {
    const p = periodAnalytics([row], {
      ...DEFAULT_ASSUMPTIONS,
      rebate: 0.05,
      operatingCostMonthly: 365,
    });
    expect(p.selfConsumptionValue).toBe(24);
    expect(p.exportRevenue).toBeCloseTo(2.4);
    expect(p.incentive).toBe(3);
    expect(p.operatingCost).toBe(12);
    expect(p.netBenefit).toBeCloseTo(17.4);
    expect(p.availability).toBeCloseTo((100 * 20) / 24);
    expect(p.mttr).toBe(2);
    expect(p.dieselLitres).toBe(15);
    expect(p.co2Kg).toBeCloseTo(40.2);
  });
  it("retains negative benefit and prorates partial days once per portfolio", () => {
    const p = periodAnalytics(
      [
        { ...row, observedHours: 12 },
        { ...row, unitId: "b", observedHours: 12 },
      ],
      { ...DEFAULT_ASSUMPTIONS, operatingCostMonthly: 3650 },
    );
    expect(p.days).toBe(0.5);
    expect(p.operatingCost).toBe(60);
    expect(p.netBenefit).toBeLessThan(0);
  });
  it("filters every period and current metric to selected units", () => {
    const result = portfolioAnalytics(
      [units[1]],
      [row, { ...row, unitId: "foreign", grossKWh: 900 }],
      { ...DEFAULT_ASSUMPTIONS, initialInvestment: 10000 },
      new Date("2026-09-21T12:00:00Z"),
    );
    expect(result.periods.recorded.grossKWh).toBe(100);
    expect(result.power).toEqual({
      gross: 10,
      parasitic: 1,
      self: 6,
      exported: 3,
    });
    expect(result.annualBenefit).toBeCloseTo(26.4 * 365);
    expect(result.roi).toBeCloseTo(96.36);
    expect(result.paybackYears).toBeCloseTo(10000 / (26.4 * 365));
  });
  it("does not annualize days missing a selected unit", () => {
    expect(
      portfolioAnalytics(
        units,
        [row],
        DEFAULT_ASSUMPTIONS,
        new Date("2026-09-21"),
      ).annualBenefit,
    ).toBeNull();
  });
  it("does not invent savings or availability for missing readings", () => {
    const p = periodAnalytics([], DEFAULT_ASSUMPTIONS);
    expect(p.grossKWh).toBeNull();
    expect(p.netBenefit).toBeNull();
    expect(p.availability).toBeNull();
    expect(p.mttr).toBeNull();
    expect(
      periodAnalytics([{ ...row, exportedKWh: null }]).netBenefit,
    ).toBeNull();
    expect(
      periodAnalytics([{ ...row, financialCoverageComplete: false }])
        .netBenefit,
    ).toBeNull();
  });
  it("excludes future readings and uses UTC boundaries", () => {
    const p = portfolioAnalytics(
      [units[1]],
      [row, { ...row, date: "2026-09-21" }, { ...row, date: "2026-09-22" }],
      DEFAULT_ASSUMPTIONS,
      new Date("2026-09-21T01:00:00+02:00"),
    );
    expect(p.periods.today.grossKWh).toBe(100);
    expect(p.periods.recorded.grossKWh).toBe(100);
  });
  it.each([
    { rebate: -1 },
    { electricityCost: Infinity },
    { dieselDisplacementFraction: 1.1 },
    { initialInvestment: "" },
  ])("rejects invalid assumptions: %j", (a) =>
    expect(() => validateAssumptions(a)).toThrow(),
  );
  it("returns no payback for zero investment or non-positive annual benefit", () => {
    const p = portfolioAnalytics(
      [units[1]],
      [row],
      { ...DEFAULT_ASSUMPTIONS, operatingCostMonthly: 10000 },
      new Date("2026-09-21"),
    );
    expect(p.paybackYears).toBeNull();
    expect(p.roi).toBeNull();
  });
});
