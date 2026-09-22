import ReportConfigurator from "../components/reports/ReportConfigurator";
import TenantSelector from "../components/admin/TenantSwitcher";
import { useUnits } from "../context/UnitContext";
export default function ReportsPage() {
  const { scopeKey, loading } = useUnits();
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <h1 className="text-2xl font-bold">Reports</h1>
        <TenantSelector />
      </div>
      {loading ? (
        <p role="status">Loading portfolio…</p>
      ) : (
        <ReportConfigurator key={scopeKey} />
      )}
    </div>
  );
}
