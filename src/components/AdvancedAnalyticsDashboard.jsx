import PerformanceDashboard from "./PerformanceDashboard";
import TenantSwitcher from "./admin/TenantSwitcher";
export default function AdvancedAnalyticsDashboard() {
  return (
    <div className="p-6 space-y-5">
      <TenantSwitcher />
      <PerformanceDashboard />
    </div>
  );
}
