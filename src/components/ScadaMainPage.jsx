/**
 * Unified SCADA Main Page
 *
 * Integrates all SCADA functionality into a single tabbed interface:
 * - Main tabs: Visualization, Alerts, Analytics
 * - Visualization sub-tabs: Overview, Gauges, Trends, Process Flow
 * - Analytics sub-tabs: Performance, Equipment Health, Energy, Predictive
 * - Alerts: 4 colored tiles (no sub-tabs)
 * - Navy blue and gold color scheme
 * - Enterprise-grade professional design
 */

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Eye,
  Gauge,
  GitBranch,
  HeartPulse,
  LayoutGrid,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Component, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdvancedAlertDashboard from "./alerts/AdvancedAlertDashboard";
import PerformanceAnalyticsDashboard from "./analytics/PerformanceAnalyticsDashboard";
import ComprehensiveVisualizationDashboard from "./visualization/ComprehensiveVisualizationDashboard";
import "./Scada/ScadaStyles.css";
import "../styles/theme.css";

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
  const subTabParam = searchParams.get("subtab");

  const [activeTab, setActiveTab] = useState(tabParam || "visualization");
  const [activeVisualizationSubTab, setActiveVisualizationSubTab] = useState(
    subTabParam || "overview",
  );
  const [activeAnalyticsSubTab, setActiveAnalyticsSubTab] =
    useState("performance");

  // Sync tab state with URL parameter on mount and when URL changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
    if (subTabParam && tabParam === "visualization") {
      setActiveVisualizationSubTab(subTabParam);
    } else if (subTabParam && tabParam === "analytics") {
      setActiveAnalyticsSubTab(subTabParam);
    }
    // Clear subtab state when switching to tabs without sub-navigation
    if (tabParam === "alerts" && subTabParam) {
      setSearchParams({ tab: tabParam }, { replace: true });
    }
  }, [tabParam, subTabParam, setSearchParams]);

  // Handle main tab change - update both state and URL
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab === "visualization") {
      setSearchParams(
        { tab: newTab, subtab: activeVisualizationSubTab },
        { replace: true },
      );
    } else if (newTab === "analytics") {
      setSearchParams(
        { tab: newTab, subtab: activeAnalyticsSubTab },
        { replace: true },
      );
    } else {
      setSearchParams({ tab: newTab }, { replace: true });
    }
  };

  // Handle visualization sub-tab change
  const handleVisualizationSubTabChange = (newSubTab) => {
    setActiveVisualizationSubTab(newSubTab);
    setSearchParams({ tab: activeTab, subtab: newSubTab }, { replace: true });
  };

  // Handle analytics sub-tab change
  const handleAnalyticsSubTabChange = (newSubTab) => {
    setActiveAnalyticsSubTab(newSubTab);
    setSearchParams({ tab: activeTab, subtab: newSubTab }, { replace: true });
  };

  return (
    <div
      className={`min-h-screen bg-background w-full transition-all duration-300 ${className}`}
    >
      {/* Header */}
      <div className="bg-background border-b border-border px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="max-w-[2000px] mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-muted rounded-lg">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">
                SCADA Platform
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden xs:block">
                Real-time monitoring, alerts, and analytics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabbed Content */}
      <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="max-w-[2000px] mx-auto">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="scada-tabs-container"
          >
            {/* Main Navigation Tabs */}
            <TabsList className="scada-tabs-list">
              <TabsTrigger value="visualization" className="scada-tab-trigger">
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

            {/* Visualization Tab with Sub-Navigation */}
            <TabsContent value="visualization" className="scada-tab-content">
              <div className="scada-sub-nav">
                <div className="scada-sub-nav-title">Visualization Options</div>
                <div className="scada-sub-tabs-list">
                  <button
                    type="button"
                    onClick={() => handleVisualizationSubTabChange("overview")}
                    className={`scada-sub-tab-trigger ${activeVisualizationSubTab === "overview" ? "active" : ""}`}
                    data-state={
                      activeVisualizationSubTab === "overview"
                        ? "active"
                        : "inactive"
                    }
                  >
                    <LayoutGrid className="scada-sub-tab-icon" />
                    <span>Overview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVisualizationSubTabChange("gauges")}
                    className={`scada-sub-tab-trigger ${activeVisualizationSubTab === "gauges" ? "active" : ""}`}
                    data-state={
                      activeVisualizationSubTab === "gauges"
                        ? "active"
                        : "inactive"
                    }
                  >
                    <Gauge className="scada-sub-tab-icon" />
                    <span>Gauges</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVisualizationSubTabChange("trends")}
                    className={`scada-sub-tab-trigger ${activeVisualizationSubTab === "trends" ? "active" : ""}`}
                    data-state={
                      activeVisualizationSubTab === "trends"
                        ? "active"
                        : "inactive"
                    }
                  >
                    <TrendingUp className="scada-sub-tab-icon" />
                    <span>Trends</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleVisualizationSubTabChange("processflow")
                    }
                    className={`scada-sub-tab-trigger ${activeVisualizationSubTab === "processflow" ? "active" : ""}`}
                    data-state={
                      activeVisualizationSubTab === "processflow"
                        ? "active"
                        : "inactive"
                    }
                  >
                    <GitBranch className="scada-sub-tab-icon" />
                    <span>Process Flow</span>
                  </button>
                </div>
              </div>

              {/* Sub-tab Content */}
              {activeVisualizationSubTab === "overview" && (
                <div className="animate-fadeIn">
                  <ComprehensiveVisualizationDashboard
                    embedded={true}
                    defaultTab="overview"
                  />
                </div>
              )}
              {activeVisualizationSubTab === "gauges" && (
                <div className="animate-fadeIn">
                  <ComprehensiveVisualizationDashboard
                    embedded={true}
                    defaultTab="gauges"
                  />
                </div>
              )}
              {activeVisualizationSubTab === "trends" && (
                <div className="animate-fadeIn">
                  <ComprehensiveVisualizationDashboard
                    embedded={true}
                    defaultTab="trends"
                  />
                </div>
              )}
              {activeVisualizationSubTab === "processflow" && (
                <div className="animate-fadeIn">
                  <ComprehensiveVisualizationDashboard
                    embedded={true}
                    defaultTab="process"
                  />
                </div>
              )}
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent
              value="alerts"
              className="scada-tab-content scada-alerts-content"
            >
              <AdvancedAlertDashboard embedded={true} />
            </TabsContent>

            {/* Analytics Tab with Sub-Navigation */}
            <TabsContent value="analytics" className="scada-tab-content">
              <div className="scada-sub-nav">
                <div className="scada-sub-nav-title">Analytics Options</div>
                <div className="scada-sub-tabs-list">
                  <button
                    type="button"
                    onClick={() => handleAnalyticsSubTabChange("performance")}
                    className={`scada-sub-tab-trigger ${activeAnalyticsSubTab === "performance" ? "active" : ""}`}
                    data-state={
                      activeAnalyticsSubTab === "performance"
                        ? "active"
                        : "inactive"
                    }
                  >
                    <BarChart3 className="scada-sub-tab-icon" />
                    <span>Performance</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnalyticsSubTabChange("health")}
                    className={`scada-sub-tab-trigger ${activeAnalyticsSubTab === "health" ? "active" : ""}`}
                    data-state={
                      activeAnalyticsSubTab === "health" ? "active" : "inactive"
                    }
                  >
                    <HeartPulse className="scada-sub-tab-icon" />
                    <span>Equipment Health</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnalyticsSubTabChange("energy")}
                    className={`scada-sub-tab-trigger ${activeAnalyticsSubTab === "energy" ? "active" : ""}`}
                    data-state={
                      activeAnalyticsSubTab === "energy" ? "active" : "inactive"
                    }
                  >
                    <Zap className="scada-sub-tab-icon" />
                    <span>Energy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnalyticsSubTabChange("predictive")}
                    className={`scada-sub-tab-trigger ${activeAnalyticsSubTab === "predictive" ? "active" : ""}`}
                    data-state={
                      activeAnalyticsSubTab === "predictive"
                        ? "active"
                        : "inactive"
                    }
                  >
                    <Sparkles className="scada-sub-tab-icon" />
                    <span>Predictive</span>
                  </button>
                </div>
              </div>

              {/* Render PerformanceAnalyticsDashboard with defaultTab */}
              <div className="animate-fadeIn">
                <PerformanceAnalyticsDashboard
                  embedded={true}
                  defaultTab={activeAnalyticsSubTab}
                />
              </div>
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
