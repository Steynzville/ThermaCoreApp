export const DEFAULT_ASSUMPTIONS = Object.freeze({
  electricityCost: 0.4,
  feedInTariff: 0.08,
  rebate: 0,
  operatingCostMonthly: 0,
  initialInvestment: 0,
  dieselPricePerLiter: 1.84,
  dieselLitresPerKWh: 0.25,
  dieselCO2KgPerLitre: 2.68,
  dieselDisplacementFraction: 1,
});

export const finite = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;
export const positive = (value) => Math.max(0, finite(value));
export const dateKey = (date = new Date()) => date.toISOString().slice(0, 10);

export function validateAssumptions(values) {
  const result = { ...DEFAULT_ASSUMPTIONS, ...values };
  for (const key of Object.keys(DEFAULT_ASSUMPTIONS)) {
    if (
      result[key] === "" ||
      !Number.isFinite(Number(result[key])) ||
      Number(result[key]) < 0
    ) {
      throw new Error("Assumptions must be finite, non-negative numbers.");
    }
    result[key] = Number(result[key]);
  }
  if (result.dieselDisplacementFraction > 1)
    throw new Error("Diesel displacement share must be between 0 and 1.");
  return result;
}

export function energyTotals(records) {
  const totals = {
    grossKWh: 0,
    parasiticKWh: 0,
    selfConsumedKWh: 0,
    exportedKWh: 0,
    waterLitres: 0,
    observedHours: 0,
    operatingHours: 0,
    repairHours: 0,
    failures: 0,
  };
  for (const row of records) {
    const gross = positive(row.grossKWh);
    const capacity = row.grossKWh == null ? Infinity : gross;
    const parasitic = Math.min(capacity, positive(row.parasiticKWh));
    const self = Math.min(capacity - parasitic, positive(row.selfConsumedKWh));
    // Exports are metered separately. Do not invent exports from missing readings.
    const exported = Math.min(
      capacity - parasitic - self,
      positive(row.exportedKWh),
    );
    totals.grossKWh += gross;
    totals.parasiticKWh += parasitic;
    totals.selfConsumedKWh += self;
    totals.exportedKWh += exported;
    for (const key of [
      "waterLitres",
      "observedHours",
      "repairHours",
      "failures",
    ])
      totals[key] += positive(row[key]);
    totals.operatingHours += Math.min(
      positive(row.operatingHours),
      positive(row.observedHours),
    );
  }
  return totals;
}

function calendarDays(records) {
  const hours = new Map();
  for (const row of records)
    hours.set(
      row.date,
      Math.max(
        hours.get(row.date) || 0,
        Math.min(24, positive(row.observedHours)),
      ),
    );
  return [...hours.values()].reduce((sum, h) => sum + h / 24, 0);
}

export function periodAnalytics(
  records,
  assumptions = DEFAULT_ASSUMPTIONS,
  expectedUnitIds = [],
) {
  const a = validateAssumptions(assumptions);
  const totals = energyTotals(records);
  const days = calendarDays(records);
  // Credit and tariff assumptions are AUD/kWh. Costs are annualised from AUD/month.
  const available = (key) =>
    records.length > 0 &&
    records.every(
      (row) => row[key] != null && Number.isFinite(Number(row[key])),
    );
  const coverageByDate = new Map();
  for (const row of records) {
    const coverage = coverageByDate.get(row.date) || new Map();
    coverage.set(String(row.unitId), positive(row.observedHours));
    coverageByDate.set(row.date, coverage);
  }
  const portfolioCoverageComplete = [...coverageByDate.values()].every(
    (coverage) => {
      const longest = Math.max(...coverage.values());
      return expectedUnitIds.every(
        (id) =>
          coverage.get(String(id)) > 0 &&
          Math.abs(coverage.get(String(id)) - longest) < 0.000001,
      );
    },
  );
  const financialComplete =
    portfolioCoverageComplete &&
    ["grossKWh", "parasiticKWh", "selfConsumedKWh", "exportedKWh"].every(
      available,
    ) &&
    records.every((r) => r.financialCoverageComplete !== false);
  const selfConsumptionValue = available("selfConsumedKWh")
    ? totals.selfConsumedKWh * a.electricityCost
    : null;
  const exportRevenue = available("exportedKWh")
    ? totals.exportedKWh * a.feedInTariff
    : null;
  const incentive = available("selfConsumedKWh")
    ? totals.selfConsumedKWh * a.rebate
    : null;
  const operatingCost = (a.operatingCostMonthly * 12 * days) / 365;
  const netBenefit = financialComplete
    ? selfConsumptionValue + exportRevenue + incentive - operatingCost
    : null;
  const dieselLitres = available("selfConsumedKWh")
    ? totals.selfConsumedKWh *
      a.dieselDisplacementFraction *
      a.dieselLitresPerKWh
    : null;
  const measured = Object.fromEntries(
    [
      "grossKWh",
      "parasiticKWh",
      "selfConsumedKWh",
      "exportedKWh",
      "waterLitres",
    ].map((key) => [key, available(key) ? totals[key] : null]),
  );
  return {
    ...totals,
    ...measured,
    days,
    financialComplete,
    selfConsumptionValue,
    exportRevenue,
    incentive,
    operatingCost,
    netBenefit,
    dieselLitres,
    dieselCost:
      dieselLitres == null ? null : dieselLitres * a.dieselPricePerLiter,
    co2Kg: dieselLitres == null ? null : dieselLitres * a.dieselCO2KgPerLitre,
    availability:
      totals.observedHours > 0
        ? (100 * totals.operatingHours) / totals.observedHours
        : null,
    mttr: totals.failures > 0 ? totals.repairHours / totals.failures : null,
  };
}

export function portfolioAnalytics(
  units,
  records,
  assumptions = DEFAULT_ASSUMPTIONS,
  now = new Date(),
) {
  const ids = new Set(units.map((u) => String(u.id)));
  const today = dateKey(now);
  const scoped = records.filter(
    (r) => ids.has(String(r.unitId)) && r.date <= today,
  );
  const month = today.slice(0, 7);
  const selectedIds = [...ids];
  const periods = {
    today: periodAnalytics(
      scoped.filter((r) => r.date === today),
      assumptions,
      selectedIds,
    ),
    month: periodAnalytics(
      scoped.filter((r) => r.date.startsWith(month)),
      assumptions,
      selectedIds,
    ),
    recorded: periodAnalytics(scoped, assumptions, selectedIds),
  };
  const recentStart = dateKey(new Date(now.getTime() - 30 * 86400000));
  const candidates = scoped.filter(
    (r) => r.date >= recentStart && r.date < today,
  );
  const completeDates = new Set(
    candidates
      .filter((r) =>
        units.every((unit) =>
          candidates.some(
            (other) =>
              other.date === r.date &&
              String(other.unitId) === String(unit.id) &&
              positive(other.observedHours) >= 23.99,
          ),
        ),
      )
      .map((r) => r.date),
  );
  const completed = candidates.filter((r) => completeDates.has(r.date));
  const recent = periodAnalytics(completed, assumptions, selectedIds);
  const annualBenefit =
    recent.days > 0 && recent.netBenefit != null
      ? (recent.netBenefit / recent.days) * 365
      : null;
  const investment = positive(assumptions.initialInvestment);
  const power = units.reduce(
    (sum, u) => {
      const gross = u.status === "online" ? positive(u.currentPower) : 0;
      const parasitic = Math.min(gross, positive(u.parasiticLoad));
      const self = Math.min(gross - parasitic, positive(u.userLoad));
      return {
        gross: sum.gross + gross,
        parasitic: sum.parasitic + parasitic,
        self: sum.self + self,
        exported: sum.exported + Math.max(0, gross - parasitic - self),
      };
    },
    { gross: 0, parasitic: 0, self: 0, exported: 0 },
  );
  return {
    periods,
    power,
    records: scoped,
    annualBenefit,
    roi:
      investment > 0 && annualBenefit != null
        ? (annualBenefit / investment) * 100
        : null,
    paybackYears:
      investment > 0 && annualBenefit > 0 ? investment / annualBenefit : null,
    recordedStart: scoped.map((r) => r.date).sort()[0] || null,
    unitCount: units.length,
    onlineCount: units.filter((u) => u.status === "online").length,
  };
}

export function metricsForUnits(units) {
  const online = units.filter((u) => u.status === "online");
  const average = (key) => {
    const values = online
      .map((u) => u[key])
      .filter((n) => n != null && Number.isFinite(Number(n)));
    return values.length
      ? values.reduce((sum, n) => sum + Number(n), 0) / values.length
      : null;
  };
  const metric = (key, label, unit) => ({
    current: average(key),
    label,
    unit,
    trend: "stable",
  });
  return {
    activeUnits: {
      value: online.length,
      count: online.length,
      total: units.length,
      percentage: units.length ? (100 * online.length) / units.length : 0,
      trend: "stable",
    },
    dataQuality: {
      percentage: units.length
        ? Math.round((online.length / units.length) * 100)
        : 0,
      trend: "stable",
    },
    temperature: metric("tempIn", "Inlet temperature", "°C"),
    pressure: metric("differentialPressure", "Pressure", "bar"),
    flowRateInlet: metric("flowRateInlet", "Inlet flow", "L/min"),
    flowRateOutlet: metric("flowRateOutChill", "Outlet flow", "L/min"),
    dataPoints: { total: units.length, rate: 0 },
    timestamp: new Date().toISOString(),
  };
}
