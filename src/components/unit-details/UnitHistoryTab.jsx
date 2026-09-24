import { useEffect, useState } from "react";
import { useUnits } from "../../context/UnitContext";
import {
  getUnitHistory,
  historyMetrics,
} from "../../services/unitHistoryService";
import VitalSignGraph from "../VitalSignGraph";
const iso = (date) => date.toISOString().slice(0, 10);
const rangeFor = (days) => ({
  from: iso(new Date(Date.now() - (days - 1) * 86400000)),
  to: iso(new Date()),
});
export default function UnitHistoryTab({ unit }) {
  const { events = [], isDemoMode } = useUnits();
  const [period, setPeriod] = useState("30");
  const [range, setRange] = useState(() => rangeFor(30));
  const [state, setState] = useState({ rows: [], loading: true, error: "" });
  useEffect(() => {
    let active = true;
    setState({ rows: [], loading: true, error: "" });
    getUnitHistory(unit, range)
      .then((rows) => {
        if (active) setState({ rows, loading: false, error: "" });
      })
      .catch((error) => {
        if (active)
          setState({ rows: [], loading: false, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [unit.id, range.from, range.to]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center">
        <label>
          Historical period{" "}
          <select
            aria-label="Historical period"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
              if (event.target.value !== "custom")
                setRange(rangeFor(Number(event.target.value)));
            }}
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="365">1 year</option>
            <option value="1826">5 years</option>
            <option value="custom">Custom dates</option>
          </select>
        </label>
        {period === "custom" &&
          ["from", "to"].map((key) => (
            <label key={key}>
              {key === "from" ? "From" : "To"}{" "}
              <input
                type="date"
                aria-label={`History ${key}`}
                value={range[key]}
                max={iso(new Date())}
                onChange={(event) =>
                  setRange({ ...range, [key]: event.target.value })
                }
              />
            </label>
          ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {isDemoMode
          ? "Demonstration history"
          : "Recorded daily means from good-quality telemetry; missing observations remain gaps"}
        . UTC dates. Up to ten years per query.
      </p>
      {state.loading && <p role="status">Loading history…</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {historyMetrics
        .filter(([, key]) => key !== "awgWaterLevel" || unit.watergeneration)
        .map(([title, key, units, color]) => (
          <VitalSignGraph
            key={key}
            title={title}
            dataKey={key}
            color={color}
            data={state.rows}
            units={units}
            externallyRanged
          />
        ))}
      <h2 className="font-semibold">Recorded events</h2>
      {events
        .filter(
          (event) =>
            event.unitId === unit.id &&
            event.timestamp?.slice(0, 10) >= range.from &&
            event.timestamp?.slice(0, 10) <= range.to,
        )
        .map((event) => (
          <article key={event.id} className="border rounded p-4">
            {event.description || event.message} ·{" "}
            {new Date(event.timestamp).toLocaleString()}
          </article>
        ))}
    </div>
  );
}
