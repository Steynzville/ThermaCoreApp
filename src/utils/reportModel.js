import {
  dateKey,
  periodAnalytics,
  validateAssumptions,
} from "./portfolioAnalytics";

export const REPORT_FORMATS = {
  xlsx: "Excel (.xlsx)",
  docx: "Word (.docx)",
  pdf: "PDF (.pdf)",
};
export const REPORT_SECTIONS = {
  units: "Unit inventory and current readings",
  daily: "Daily energy and water",
  alerts: "Current alerts and alarms",
  events: "Recorded control history",
};
export const ASSUMPTION_LABELS = {
  electricityCost: "Avoided grid cost (AUD/kWh)",
  feedInTariff: "Export tariff (AUD/kWh)",
  rebate: "Self-consumption incentive (AUD/kWh)",
  operatingCostMonthly: "Portfolio operating cost (AUD/month)",
  initialInvestment: "Installed portfolio cost (AUD)",
  dieselPricePerLiter: "Diesel price (AUD/L)",
  dieselLitresPerKWh: "Diesel consumption (L/kWh)",
  dieselCO2KgPerLitre: "Diesel combustion factor (kg CO2/L)",
  dieselDisplacementFraction: "Diesel displacement share (0–1)",
};

export function createReport({
  units,
  records,
  alerts = [],
  events = [],
  assumptions,
  scopeLabel,
  selectedIds,
  from,
  to,
  sections = Object.keys(REPORT_SECTIONS),
  format,
  isDemoMode,
  now = new Date(),
}) {
  if (!REPORT_FORMATS[format]) throw new Error("Select Excel, Word or PDF.");
  const validDate = (s) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    dateKey(new Date(s)) === s;
  if (!validDate(from) || !validDate(to) || from > to || to > dateKey(now))
    throw new Error("Choose a valid date range ending today or earlier (UTC).");
  const ids = new Set((selectedIds || []).map(String));
  if (
    !ids.size ||
    [...ids].some((id) => !units.some((u) => String(u.id) === id))
  )
    throw new Error("Select units from your current portfolio.");
  const selected = units.filter((u) => ids.has(String(u.id)));
  const a = validateAssumptions(assumptions);
  const rows = records
    .filter((r) => ids.has(String(r.unitId)) && r.date >= from && r.date <= to)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        String(a.unitId).localeCompare(String(b.unitId)),
    );
  const inPeriod = (item) => {
    const date = String(item.timestamp || "").slice(0, 10);
    return ids.has(String(item.unitId)) && date >= from && date <= to;
  };
  const summary = periodAnalytics(rows, a, [...ids]);
  return {
    title: "ThermaCore Portfolio Report",
    scopeLabel,
    from,
    to,
    generatedAt: now.toISOString(),
    format,
    source: isDemoMode
      ? "Demonstration data — estimates, not measured production"
      : "Recorded telemetry",
    units: selected,
    records: rows,
    alerts: alerts.filter((item) => ids.has(String(item.unitId))),
    events: events.filter(inPeriod),
    sections: sections.filter((s) => REPORT_SECTIONS[s]),
    assumptions: a,
    summary,
    notes: [
      "Dates use UTC. Totals cover available readings in the selected period; missing telemetry is not zero production.",
      "Net benefit requires matching meter intervals and readings for every selected unit on each recorded day. Partial production totals are not a complete portfolio benefit.",
      "Current readings, inventory and current alerts are snapshots at generation time, outside the historical date filter.",
      "Energy is in kWh; power is in kW. Self-consumption and export are valued separately. Incentive applies to self-consumed kWh.",
      "Net benefit = avoided grid cost + export revenue + incentive − operating cost. Costs are prorated using observed calendar-day coverage / 365 × 12 months.",
      "Diesel and combustion CO2 equivalents are comparisons using editable assumptions; they are not additional financial savings or verified emissions credits.",
      "Availability = operating / observed unit-hours. Repair time is unavailable without recorded failures. No lifetime production, tax, finance or degradation is inferred.",
    ],
  };
}

export function reportTables(report) {
  const s = report.summary;
  const display = (value) =>
    value == null
      ? "Not available"
      : typeof value === "number"
        ? Math.round(value * 1000) / 1000
        : String(value);
  const table = (title, headers, rows) => ({
    title,
    headers,
    rows: rows.map((row) => row.map(display)),
  });
  const tables = [
    table(
      "Period summary",
      ["Metric", "Value", "Unit"],
      [
        ["Selected units", report.units.length, "units"],
        ["Recorded days (coverage equivalent)", s.days, "days"],
        ["Energy generated", s.grossKWh, "kWh"],
        ["Parasitic energy", s.parasiticKWh, "kWh"],
        ["Self-consumed energy", s.selfConsumedKWh, "kWh"],
        ["Exported energy", s.exportedKWh, "kWh"],
        ["Water generated", s.waterLitres, "L"],
        ["Avoided grid cost", s.selfConsumptionValue, "AUD"],
        ["Export revenue", s.exportRevenue, "AUD"],
        ["Incentive", s.incentive, "AUD"],
        ["Operating cost", s.operatingCost, "AUD"],
        ["Net benefit", s.netBenefit, "AUD"],
        ["Diesel equivalent", s.dieselLitres, "L"],
        ["Diesel fuel cost equivalent", s.dieselCost, "AUD"],
        ["Combustion CO2 equivalent", s.co2Kg, "kg CO2"],
        ["Observed unit-hours", s.observedHours, "hours"],
        ["Recorded availability", s.availability, "%"],
        ["Mean time to repair", s.mttr, "hours"],
      ],
    ),
  ];
  if (report.sections.includes("units")) {
    tables.push(
      table(
        "Unit inventory",
        [
          "Unit",
          "Tenant",
          "Location",
          "Status",
          "Installed",
          "Last maintenance",
        ],
        report.units.map((u) => [
          u.name,
          u.tenantName,
          u.location,
          u.status,
          u.installDate,
          u.lastMaintenance,
        ]),
      ),
    );
    tables.push(
      table(
        "Current readings",
        [
          "Unit ID",
          "Power (kW)",
          "Parasitic (kW)",
          "User load (kW)",
          "Inlet (°C)",
          "Pressure (bar)",
        ],
        report.units.map((u) => [
          u.id,
          u.currentPower,
          u.parasiticLoad,
          u.userLoad,
          u.tempIn,
          u.differentialPressure,
        ]),
      ),
    );
  }
  if (report.sections.includes("daily"))
    tables.push(
      table(
        "Daily production",
        [
          "Date (UTC)",
          "Unit ID",
          "Gross (kWh)",
          "Self (kWh)",
          "Export (kWh)",
          "Water (L)",
          "Observed (h)",
        ],
        report.records.map((r) => [
          r.date,
          r.unitId,
          r.grossKWh,
          r.selfConsumedKWh,
          r.exportedKWh,
          r.waterLitres,
          r.observedHours,
        ]),
      ),
    );
  if (report.sections.includes("alerts"))
    tables.push(
      table(
        "Current alerts",
        ["Unit", "Severity", "Message", "Timestamp (UTC)"],
        report.alerts.map((r) => [
          r.unitName,
          r.severity || r.type,
          r.message || r.title,
          r.timestamp,
        ]),
      ),
    );
  if (report.sections.includes("events"))
    tables.push(
      table(
        "Control history",
        ["Unit", "Action", "Timestamp (UTC)"],
        report.events.map((r) => [
          r.unitName || r.unitId,
          r.description,
          r.timestamp,
        ]),
      ),
    );
  tables.push(
    table(
      "Calculation assumptions",
      ["Assumption", "Value"],
      Object.entries(ASSUMPTION_LABELS).map(([key, label]) => [
        label,
        report.assumptions[key],
      ]),
    ),
  );
  return tables;
}
