import { useState } from "react";
import { Link } from "react-router-dom";
import { useUnits } from "../context/UnitContext";
export default function AlertsView({ alarmsOnly = false }) {
  const { alerts, scopeLabel, loading, error, isDemoMode } = useUnits();
  const [filter, setFilter] = useState("all");
  const visible = alerts.filter(
    (a) =>
      (!alarmsOnly || a.severity === "critical") &&
      (filter === "all" || a.severity === filter),
  );
  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-bold">{alarmsOnly ? "Alarms" : "Alerts"}</h1>
      <p>
        {scopeLabel} ·{" "}
        {isDemoMode ? "Demonstration data" : "Current unit conditions"}
      </p>
      {loading && <p role="status">Loading alerts…</p>}
      {error && <p role="alert">{error}</p>}
      {!alarmsOnly && (
        <label>
          Severity{" "}
          <select
            aria-label="Severity"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded p-2"
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Information</option>
          </select>
        </label>
      )}
      <div className="space-y-3">
        {visible.map((a) => (
          <article key={a.id} className="border rounded-lg p-4">
            <div className="flex justify-between gap-3">
              <h2 className="font-semibold">{a.title || a.message}</h2>
              <span>{a.severity}</span>
            </div>
            <p>{a.message}</p>
            <Link
              to={`/unit-details/${encodeURIComponent(a.unitId)}`}
              className="underline"
            >
              {a.unitName}
            </Link>
            {a.timestamp && (
              <p className="text-sm text-muted-foreground">
                {new Date(a.timestamp).toLocaleString()}
              </p>
            )}
          </article>
        ))}
      </div>
      {!loading && !error && !visible.length && (
        <p>No current {alarmsOnly ? "alarms" : "alerts"} in this portfolio.</p>
      )}
    </div>
  );
}
