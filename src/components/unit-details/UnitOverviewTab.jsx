import UnitVitals from "./UnitVitals";
import { useUnits } from "../../context/UnitContext";
export default function UnitOverviewTab({ unit }) {
  const { alerts } = useUnits();
  return (
    <div className="space-y-5">
      {alerts
        .filter((a) => a.unitId === unit.id)
        .map((a) => (
          <div
            key={a.id}
            className={`p-4 border rounded ${a.severity === "critical" ? "border-red-600 text-red-700" : "border-amber-500"}`}
          >
            <h2 className="font-semibold">{a.title}</h2>
            <p>{a.message}</p>
          </div>
        ))}
      <UnitVitals unit={unit} />
    </div>
  );
}
