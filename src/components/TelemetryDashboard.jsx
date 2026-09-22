import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useUnits } from "../context/UnitContext";
import { useAnalytics } from "../context/AnalyticsContext";
import { useWebSocketStatus } from "../hooks/useRealtimeData";
import TenantSwitcher from "./admin/TenantSwitcher";
import { Card, CardContent } from "./ui/card";
const value = (number, unit = "") =>
  number == null
    ? "Not available"
    : `${Number(number).toLocaleString("en-AU", { maximumFractionDigits: 2 })} ${unit}`;
export default function TelemetryDashboard({ embedded = false }) {
  const {
    units,
    records,
    loading,
    error,
    scopeLabel,
    isDemoMode,
    refreshUnits,
  } = useUnits();
  const { analytics } = useAnalytics();
  const { status } = useWebSocketStatus();
  const [days, setDays] = useState(30);
  const history = useMemo(() => {
    const map = new Map();
    for (const row of records) {
      const day = map.get(row.date) || {
        date: row.date,
        gross: null,
        self: null,
        exported: null,
      };
      for (const [source, target] of [
        ["grossKWh", "gross"],
        ["selfConsumedKWh", "self"],
        ["exportedKWh", "exported"],
      ])
        if (row[source] != null) day[target] = (day[target] || 0) + row[source];
      map.set(row.date, day);
    }
    return [...map.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);
  }, [records, days]);
  return (
    <div className={embedded ? "space-y-5" : "p-6 space-y-5"}>
      {!embedded && (
        <div className="flex flex-wrap justify-between gap-4">
          <h1 className="text-2xl font-bold">Portfolio Telemetry</h1>
          <TenantSwitcher />
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-3">
        <p>
          {scopeLabel} ·{" "}
          {isDemoMode ? "Demonstration data" : `Live API · Stream ${status}`} ·
          UTC dates
        </p>
        <button
          type="button"
          className="underline"
          disabled={loading}
          onClick={refreshUnits}
        >
          Refresh readings
        </button>
      </div>
      {loading && <p role="status">Loading readings…</p>}
      {error && <p role="alert">{error}</p>}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          ["Online units", `${analytics.onlineCount} / ${units.length}`],
          ["Current power", value(analytics.power.gross, "kW")],
          [
            "Recorded energy",
            value(analytics.periods.recorded.grossKWh, "kWh"),
          ],
        ].map(([label, text]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <h2 className="text-sm text-muted-foreground">{label}</h2>
              <p className="text-2xl font-semibold">{text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <section className="border rounded-lg p-4 space-y-4">
        <div className="flex justify-between">
          <h2 className="font-semibold">Daily recorded energy (kWh)</h2>
          <label>
            Period{" "}
            <select
              aria-label="Trend period"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>
        </div>
        {history.length ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="gross"
                  name="Generated kWh"
                  stroke="#147D92"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="self"
                  name="Self-consumed kWh"
                  stroke="#D99A27"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="exported"
                  name="Exported kWh"
                  stroke="#638A48"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p>No historical readings available for this portfolio.</p>
        )}
        <p className="text-xs text-muted-foreground">
          Gaps are not filled. Live totals require configured power and load
          meters. Today's values cover only recorded hours.
        </p>
      </section>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <caption className="text-left font-semibold py-3">
            Current unit readings
          </caption>
          <thead>
            <tr>
              {[
                "Unit",
                "Status",
                "Power",
                "Inlet",
                "Outlet",
                "Pressure",
                "Health",
              ].map((label) => (
                <th className="text-left border-b p-3" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id}>
                <td className="p-3 border-b">
                  <Link className="underline" to={`/unit-details/${u.id}`}>
                    {u.name}
                  </Link>
                </td>
                {[
                  u.status,
                  value(u.currentPower, "kW"),
                  value(u.tempIn, "°C"),
                  value(u.tempOutChill, "°C"),
                  value(u.differentialPressure, "bar"),
                  u.healthStatus,
                ].map((text, i) => (
                  <td className="p-3 border-b" key={i}>
                    {text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!units.length && !loading && (
          <p className="py-4">No units assigned to this portfolio.</p>
        )}
      </div>
    </div>
  );
}
