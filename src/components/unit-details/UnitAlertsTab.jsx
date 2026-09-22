import { useUnits } from "../../context/UnitContext";
export default function UnitAlertsTab({ unit }) {
  const { alerts } = useUnits();
  const current = alerts.filter((a) => a.unitId === unit.id);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Current alerts</h2>
      {current.map((a) => (
        <article className="border rounded p-4" key={a.id}>
          <h3>
            {a.title} · {a.severity}
          </h3>
          <p>{a.message}</p>
          {a.timestamp && <time>{new Date(a.timestamp).toLocaleString()}</time>}
        </article>
      ))}
      {!current.length && <p>No current alerts for this unit.</p>}
    </div>
  );
}
