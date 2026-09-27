import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import ComprehensiveVisualizationDashboard from "./visualization/ComprehensiveVisualizationDashboard";
import { ScadaProvider } from "../context/ScadaContext";
import PerformanceDashboard from "./PerformanceDashboard";
import AdvancedAlertDashboard from "./alerts/AdvancedAlertDashboard";
import TenantSwitcher from "./admin/TenantSwitcher";
export default function ScadaMainPage() {
  const [params, setParams] = useSearchParams();
  const tab = ["visualization", "alerts", "analytics"].includes(
    params.get("tab"),
  )
    ? params.get("tab")
    : "visualization";
  return (
    <ScadaProvider>
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap justify-between gap-4">
          <h1 className="text-2xl font-bold">SCADA Dashboard</h1>
          <TenantSwitcher />
        </div>
        <Tabs value={tab} onValueChange={(value) => setParams({ tab: value })}>
          <TabsList>
            <TabsTrigger value="visualization">Visualization</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="visualization">
            <ComprehensiveVisualizationDashboard />
          </TabsContent>
          <TabsContent value="alerts">
            <AdvancedAlertDashboard embedded />
          </TabsContent>
          <TabsContent value="analytics">
            <PerformanceDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </ScadaProvider>
  );
}
