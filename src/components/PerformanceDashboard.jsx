import { useMemo, useState } from "react";
import { useUnits } from "../context/UnitContext";
import { useAnalytics } from "../context/AnalyticsContext";
import PortfolioAssumptions from "./PortfolioAssumptions";
import { Card, CardContent } from "./ui/card";
const number = (value, decimals = 1) =>
  value == null
    ? "Not available"
    : value.toLocaleString("en-AU", { maximumFractionDigits: decimals });
const money = (value) =>
  value == null
    ? "Not available"
    : new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        maximumFractionDigits: 2,
      }).format(value);
function Metric({ title, value, unit, detail }) {
  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="text-sm text-muted-foreground mb-2">{title}</h3>
        <p className="text-2xl font-semibold">
          {value} <span className="text-sm font-normal">{unit}</span>
        </p>
        {detail && (
          <p className="text-xs text-muted-foreground mt-2">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}
export default function PerformanceDashboard({
  className = "",
  hideHeader = false,
  unitId = null,
}) {
  const { units, loading, error, scopeLabel, isDemoMode } = useUnits();
  const { assumptions, setAssumptions, analytics } = useAnalytics(unitId);
  const [section, setSection] = useState(null);
  const selected = useMemo(
    () => (unitId ? units.filter((u) => u.id === unitId) : units),
    [units, unitId],
  );
  if (loading)
    return (
      <p role="status" className="p-6">
        Loading portfolio analytics...
      </p>
    );
  if (error)
    return (
      <p role="alert" className="p-6 text-red-600">
        {error}
      </p>
    );
  const labels = {
    today: "Today",
    month: "This month",
    recorded: "Recorded total",
  };
  const edit = (title, key) => (
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <button className="text-sm underline" onClick={() => setSection(key)}>
        Edit {key} assumptions
      </button>
    </div>
  );
  return (
    <div className={`space-y-8 ${className}`}>
      {!hideHeader && (
        <h1 className="text-2xl font-bold">Performance Dashboard</h1>
      )}
      <p
        className="text-sm text-muted-foreground"
        data-testid="portfolio-scope"
      >
        {unitId ? selected[0]?.name : scopeLabel} · {selected.length} units ·{" "}
        {isDemoMode ? "Demonstration data" : "Recorded telemetry"} · Dates use
        UTC
      </p>
      {!selected.length && (
        <p role="status">No units are assigned to this portfolio.</p>
      )}
      {unitId && units.length > 1 && (
        <p className="text-sm text-muted-foreground">
          Unit costs are separate from portfolio costs. Enter this unit's
          operating and installed costs in its assumptions.
        </p>
      )}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Energy and water</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {Object.entries(labels).map(([key, label]) => (
            <Metric
              key={key}
              title={`Energy generated (${label})`}
              value={number(analytics.periods[key].grossKWh)}
              unit="kWh"
              detail={
                key === "recorded"
                  ? `Data since ${analytics.recordedStart || "no readings"}`
                  : "Sum of energy recorded in this period"
              }
            />
          ))}
          {selected.some((u) => u.watergeneration) &&
            Object.entries(labels).map(([key, label]) => (
              <Metric
                key={key}
                title={`Water generated (${label})`}
                value={number(analytics.periods[key].waterLitres)}
                unit="L"
              />
            ))}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Current power</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ["gross", "Generation"],
            ["parasitic", "Parasitic load"],
            ["self", "Self-consumption"],
            ["exported", "Export balance"],
          ].map(([key, label]) => (
            <Metric
              key={key}
              title={label}
              value={number(analytics.power[key])}
              unit="kW"
              detail={
                key === "exported"
                  ? "Calculated per unit after parasitic load and self-consumption"
                  : undefined
              }
            />
          ))}
        </div>
      </section>
      <section className="space-y-3">
        {edit("Financial impact", "financial")}
        <div className="grid sm:grid-cols-3 gap-4">
          {Object.entries(labels).map(([key, label]) => (
            <Metric
              key={key}
              title={`Net benefit (${label})`}
              value={money(analytics.periods[key].netBenefit)}
              detail="Avoided grid cost + export income + incentive − operating cost"
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Negative net benefits remain visible. Incentives apply to
          self-consumed kWh. Monthly operating costs are prorated to observed
          calendar-day coverage on a 365-day basis; comparison figures exclude
          finance, tax and degradation.
        </p>
      </section>
      <section className="space-y-3">
        {edit("ROI and payback", "roi")}
        <div className="grid sm:grid-cols-3 gap-4">
          <Metric
            title="Annualised net benefit"
            value={money(analytics.annualBenefit)}
            detail="Based on days with full portfolio coverage in the last 30 days"
          />
          <Metric
            title="Simple annual return"
            value={number(analytics.roi, 2)}
            unit={analytics.roi == null ? "" : "%"}
            detail="Annualised net benefit ÷ installed cost"
          />
          <Metric
            title="Simple payback"
            value={number(analytics.paybackYears, 2)}
            unit={analytics.paybackYears == null ? "" : "years"}
            detail="Requires positive installed cost and annual net benefit"
          />
        </div>
      </section>
      <section className="space-y-3">
        {edit("Diesel comparison", "environmental")}
        <div className="grid sm:grid-cols-3 gap-4">
          {Object.entries(labels).map(([key, label]) => (
            <Metric
              key={key}
              title={`Diesel equivalent (${label})`}
              value={number(analytics.periods[key].dieselLitres)}
              unit="L"
              detail={`${money(analytics.periods[key].dieselCost)} fuel equivalent; ${number(analytics.periods[key].co2Kg)} kg CO2 combustion equivalent`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Comparison only. Uses self-consumed energy × selected diesel
          displacement share × L/kWh. These fuel equivalents are separate from
          the grid-based financial benefit and are not added to it.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Fleet performance</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Metric
            title="Online units"
            value={`${analytics.onlineCount}/${analytics.unitCount}`}
          />
          <Metric
            title="Recorded production availability"
            value={number(analytics.periods.recorded.availability)}
            unit={analytics.periods.recorded.availability == null ? "" : "%"}
            detail="Operating hours ÷ observed unit-hours"
          />
          <Metric
            title="Mean time to repair"
            value={number(analytics.periods.recorded.mttr)}
            unit={analytics.periods.recorded.mttr == null ? "" : "hours"}
            detail="Repair hours ÷ recorded failures; unavailable without failure records"
          />
        </div>
      </section>
      <PortfolioAssumptions
        section={section}
        assumptions={assumptions}
        onSave={setAssumptions}
        onClose={() => setSection(null)}
        scope={unitId ? "unit" : "portfolio"}
      />
    </div>
  );
}
