import { useParams } from "react-router-dom";
import { useUnits } from "../context/UnitContext";
import PerformanceDashboard from "./PerformanceDashboard";
export default function UnitPerformance({ unit }) {
  const { id } = useParams();
  const { getUnit, loading } = useUnits();
  const selected = getUnit(id || unit?.id);
  if (loading) return <p role="status">Loading unit...</p>;
  if (!selected)
    return (
      <p role="alert" className="p-6">
        Unit not found in your portfolio.
      </p>
    );
  return (
    <div className="p-6">
      <PerformanceDashboard unitId={selected.id} />
    </div>
  );
}
