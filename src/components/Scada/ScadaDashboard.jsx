/**
 * SCADA Dashboard
 *
 * Main SCADA interface with restructured navigation:
 * - Main tabs: Visualization, Alerts, Analytics
 * - Sub-tabs (when Visualization is active): Trends, Process Flow
 * - Navy blue and gold color scheme
 * - Enterprise-grade professional design
 */

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Eye,
  GitBranch,
  TrendingUp,
} from "lucide-react";
import { Component, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdvancedAlertDashboard from "../alerts/AdvancedAlertDashboard";
import PerformanceAnalyticsDashboard from "../analytics/PerformanceAnalyticsDashboard";
import ComprehensiveVisualizationDashboard from "../visualization/ComprehensiveVisualizationDashboard";
import "./ScadaStyles.css";
import "../../styles/theme.css";

// Constants
const DEFAULT_SUBTAB = "trends";

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

const ScadaDashboard = ({ className = "" }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const subTabParam = searchParams.get("subtab");

  const [activeTab, setActiveTab] = useState(tabParam || "visualization");
  const [activeSubTab, setActiveSubTab] = useState(
    subTabParam || DEFAULT_SUBTAB,
  );

  // Sync tab state with URL parameter on mount and when URL changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
    if (subTabParam) {
      setActiveSubTab(subTabParam);
    }
  }, [tabParam, subTabParam]);

  // Handle main tab change - update both state and URL
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    // Reset sub-tab to default when switching to visualization
    if (newTab === "visualization") {
      setSearchParams({ tab: newTab, subtab: activeSubTab }, { replace: true });
    } else {
      setSearchParams({ tab: newTab }, { replace: true });
    }
  };

  // Handle sub-tab change - update both state and URL
  const handleSubTabChange = (newSubTab) => {
    setActiveSubTab(newSubTab);
    setSearchParams({ tab: activeTab, subtab: newSubTab }, { replace: true });
  };

  return (
    <div
      className={`min-h-screen bg-background w-full transition-all duration-300 ${className}`}
    >
      {/* Header */}
      <div className="bg-background border-b border-border px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-[2000px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-card rounded-lg">
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

      {/* Main Tabbed Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-[2000px] mx-auto">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="scada-tabs-container"
          >
            {/* Main Navigation Tabs */}
            <div className="mb-6 pt-[60px] sm:pt-0">
              <TabsList className="scada-tabs-list">
                <TabsTrigger
                  value="visualization"
                  className="scada-tab-trigger"
                >
                  <Eye className="scada-tab-icon" />
                  <span>Visualization</span>
                </TabsTrigger>
                <TabsTrigger value="alerts" className="scada-tab-trigger">
                  <AlertTriangle className="scada-tab-icon" />
                  <span>Alerts</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="scada-tab-trigger">
                  <BarChart3 className="scada-tab-icon" />
                  <span>Analytics</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Visualization Tab with Sub-Navigation */}
            <TabsContent value="visualization" className="scada-tab-content">
              <div className="scada-sub-nav">
                <div className="scada-sub-nav-title">Visualization Options</div>
                <div className="scada-sub-tabs-list">
                  <button
                    type="button"
                    onClick={() => handleSubTabChange("trends")}
                    className={`scada-sub-tab-trigger ${activeSubTab === "trends" ? "active" : ""}`}
                    data-state={
                      activeSubTab === "trends" ? "active" : "inactive"
                    }
                  >
                    <TrendingUp className="scada-sub-tab-icon" />
                    <span>Trends</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubTabChange("processflow")}
                    className={`scada-sub-tab-trigger ${activeSubTab === "processflow" ? "active" : ""}`}
                    data-state={
                      activeSubTab === "processflow" ? "active" : "inactive"
                    }
                  >
                    <GitBranch className="scada-sub-tab-icon" />
                    <span>Process Flow</span>
                  </button>
                </div>
              </div>

              {/* Sub-tab Content */}
              {activeSubTab === "trends" && (
                <div className="animate-fadeIn">
                  <ComprehensiveVisualizationDashboard
                    embedded={true}
                    defaultTab="trends"
                  />
                </div>
              )}
              {activeSubTab === "processflow" && (
                <div className="animate-fadeIn">
                  <ComprehensiveVisualizationDashboard
                    embedded={true}
                    defaultTab="process"
                  />
                </div>
              )}
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts" className="scada-tab-content">
              <AdvancedAlertDashboard
                embedded={true}
                className="mt-4 sm:mt-0"
              />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="scada-tab-content">
              <PerformanceAnalyticsDashboard embedded={true} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// Wrap with error boundary
const ScadaDashboardWithErrorBoundary = (props) => (
  <ScadaErrorBoundary>
    <ScadaDashboard {...props} />
  </ScadaErrorBoundary>
);

export default ScadaDashboardWithErrorBoundary;
