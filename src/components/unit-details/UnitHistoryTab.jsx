import { useUnits } from "../../context/UnitContext";
import VitalSignGraph from "../VitalSignGraph";
export default function UnitHistoryTab({ unit }) {
  const { records, events } = useUnits();
  const rows = records.filter((r) => r.unitId === unit.id);
  return (
    <div className="space-y-5">
      <VitalSignGraph
        title="Recorded energy (kWh/day)"
        dataKey="grossKWh"
        color="#147D92"
        data={rows}
      />
      {unit.watergeneration && (
        <VitalSignGraph
          title="Recorded water (L/day)"
          dataKey="waterLitres"
          color="#06b6d4"
          data={rows}
        />
      )}
      <h2 className="font-semibold">Recorded controls</h2>
      {events
        .filter((e) => e.unitId === unit.id)
        .map((e) => (
          <article key={e.id} className="border rounded p-4">
            {e.description} · {new Date(e.timestamp).toLocaleString()}
          </article>
        ))}
      <p className="text-sm text-muted-foreground">
        Only available recorded history is shown. Instantaneous readings are on
        the overview tab.
      </p>
    </div>
  );
}
