/**
 * Unified SCADA Main Page
 *
 * Integrates all SCADA functionality into a single tabbed interface:
 * - Visualization Dashboard (gauges, charts, process flows)
 * - Alert Management (real-time alerts, acknowledgment workflow)
 * - Performance Analytics (KPIs, equipment health, predictive maintenance)
 */

import { Activity, AlertTriangle } from "lucide-react";
import { Component, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdvancedAlertDashboard from "./alerts/AdvancedAlertDashboard";
import PerformanceAnalyticsDashboard from "./analytics/PerformanceAnalyticsDashboard";
import ComprehensiveVisualizationDashboard from "./visualization/ComprehensiveVisualizationDashboard";

// Error Boundary Component
class ScadaErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(_error, _errorInfo) {
    // Error is already captured in state for display
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              SCADA Page Error
            </h2>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ScadaMainPage = ({ className = "" }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "visualization");

  // Sync tab state with URL parameter on mount and when URL changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Handle tab change - update both state and URL
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  return (
    <div
      className={`min-h-screen bg-background w-full transition-all duration-300 ${className}`}
    >
      {/* Header */}
      <div className="bg-card border-b px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-[2000px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                SCADA Platform
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Real-time monitoring, alerts, and analytics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-[2000px] mx-auto">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex h-10 p-1 bg-muted text-muted-foreground items-center justify-center rounded-md">
              <TabsTrigger value="visualization" className="min-h-[36px] px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                Visualization
              </TabsTrigger>
              <TabsTrigger value="alerts" className="min-h-[36px] px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                Alerts
              </TabsTrigger>
              <TabsTrigger value="analytics" className="min-h-[36px] px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visualization" className="mt-6">
              <ComprehensiveVisualizationDashboard embedded={true} />
            </TabsContent>

            <TabsContent value="alerts" className="mt-6">
              <AdvancedAlertDashboard embedded={true} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <PerformanceAnalyticsDashboard embedded={true} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// Wrap with error boundary
const ScadaMainPageWithErrorBoundary = (props) => (
  <ScadaErrorBoundary>
    <ScadaMainPage {...props} />
  </ScadaErrorBoundary>
);

export default ScadaMainPageWithErrorBoundary;
