import { useUnits } from "../context/UnitContext";
export default function HistoryView() {
  const { events, scopeLabel, loading, error, isDemoMode } = useUnits();
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Control History</h1>
      <p>
        {scopeLabel} ·{" "}
        {isDemoMode ? "Demo session actions" : "Recorded control actions"}
      </p>
      {loading && <p role="status">Loading history…</p>}
      {error && <p role="alert">{error}</p>}
      {events.map((e) => (
        <article key={e.id} className="border rounded p-4">
          <h2 className="font-semibold">{e.unitName || e.unitId}</h2>
          <p>{e.description}</p>
          <time>{new Date(e.timestamp).toLocaleString()}</time>
        </article>
      ))}
      {!events.length && !loading && (
        <p>No control actions recorded for this portfolio.</p>
      )}
    </div>
  );
}
