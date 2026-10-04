/**
 * Comprehensive Visualization Dashboard
 *
 * Complete SCADA platform dashboard integrating all visualization components:
 * - Industrial gauges and meters
 * - Multi-timeframe trend charts
 * - Process flow diagrams
 * - Real-time alert integration
 */

import { useEffect, useState } from "react";
import { isDemoMode } from "../../config/runtime";
import { useScada } from "../../context/ScadaContext";
import { historyMetrics } from "../../services/unitHistoryService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import IndustrialGauge from "./IndustrialGauge";
import MultiTimeframeTrendChart from "./MultiTimeframeTrendChart";
import ProcessFlowDiagram from "./ProcessFlowDiagram";

const ComprehensiveVisualizationDashboard = ({
  embedded = false,
  defaultTab = "overview",
}) => {
  const [selectedTab, setSelectedTab] = useState(defaultTab);

  const { unit, data: historicalData, period, setPeriod, loading } = useScada();
  useEffect(() => setSelectedTab(defaultTab), [defaultTab]);
  const processNodes = isDemoMode
    ? [
        { id: "pump1", label: "Inlet", icon: "P", x: 100, y: 150 },
        { id: "heat1", label: "Hot outlet", icon: "H", x: 300, y: 150 },
        { id: "tank1", label: "AWG tank", icon: "T", x: 500, y: 150 },
        { id: "valve1", label: "Chill outlet", icon: "V", x: 300, y: 300 },
        { id: "pump2", label: "Chill flow", icon: "P", x: 500, y: 300 },
        { id: "outlet", label: "Electrical", icon: "O", x: 700, y: 250 },
      ]
    : unit?.processDiagram?.nodes || [];
  const processConnections = isDemoMode
    ? [
        { id: "c1", from: "pump1", to: "heat1" },
        { id: "c2", from: "heat1", to: "tank1" },
        { id: "c3", from: "heat1", to: "valve1" },
        { id: "c4", from: "valve1", to: "pump2" },
        { id: "c5", from: "tank1", to: "outlet" },
        { id: "c6", from: "pump2", to: "outlet" },
      ]
    : unit?.processDiagram?.connections || [];
  const channels = {
    pump1: ["flowRateInlet", "L/min"],
    heat1: ["tempOutHot", "°C"],
    tank1: ["awgWaterLevel", "L"],
    valve1: ["tempOutChill", "°C"],
    pump2: ["flowRateOutChill", "L/min"],
    outlet: ["currentPower", "kW"],
  };
  const processLiveData = Object.fromEntries(
    processNodes.map((node) => {
      const [field, measurementUnit] = isDemoMode
        ? channels[node.id]
        : [node.field, node.unit];
      const value = unit?.[field];
      return [
        node.id,
        {
          value,
          unit: measurementUnit,
          status:
            isDemoMode && unit?.status === "online" && value != null
              ? "running"
              : "idle",
        },
      ];
    }),
  );
  const trendMetrics = historyMetrics.map(
    ([label, dataKey, measurementUnit, color]) => ({
      dataKey,
      label: `${label.replace(" History", "")} (${measurementUnit})`,
      color,
      type: "line",
    }),
  );
  const gauges = [
    ["Temperature In", "tempIn", "°C", 100],
    ["Temperature Out - Hot", "tempOutHot", "°C", 100],
    ["Differential Pressure", "differentialPressure", "bar", 10],
    ["Battery Voltage", "batteryVoltage", "V", 30],
    ["Flow Rate Out - Chill", "flowRateOutChill", "L/min", 100],
    ["Flow Rate Out - Hot", "flowRateOutHot", "L/min", 100],
    ["AWG Water Level", "awgWaterLevel", "L", 1000],
    ["Temperature Out - Chill", "tempOutChill", "°C", 100],
    ["Electrical Power", "currentPower", "kW", 100],
    ["Useful Heating", "usefulHeat", "kWth", 100],
    ["Useful Chilling", "usefulChill", "kWth", 100],
    ["Potable AWG Water Production", "waterRate", "L/h", 100],
  ];
  const renderGauge = ([title, field, measurementUnit, max]) => (
    <IndustrialGauge
      key={field}
      title={title}
      value={unit?.[field]}
      min={0}
      max={Math.max(max, unit?.[field] || 0)}
      unit={measurementUnit}
      showThresholds={false}
    />
  );
  return (
    <div className={embedded ? "" : "min-h-screen bg-background p-4 sm:p-6"}>
      <div className={embedded ? "" : "max-w-7xl mx-auto space-y-6"}>
        {/* Header - only show when not embedded */}
        {!embedded && (
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Industrial Visualization Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive real-time monitoring and process visualization
            </p>
          </div>
        )}

        {!processNodes.length && (
          <p className="text-sm text-muted-foreground">
            Process topology is not configured for this unit.
          </p>
        )}
        {loading && <p role="status">Loading measured history…</p>}
        {/* Main Tabs */}
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full"
        >
          {/* Only show tabs when not embedded and defaultTab is "overview" */}
          {!embedded && defaultTab === "overview" && (
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 sm:w-auto sm:inline-flex h-10 p-1 bg-muted text-muted-foreground items-center justify-center rounded-md">
              <TabsTrigger
                value="overview"
                className="min-h-[36px] px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="gauges"
                className="min-h-[36px] px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Gauges
              </TabsTrigger>
              <TabsTrigger
                value="trends"
                className="min-h-[36px] px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Trends
              </TabsTrigger>
              <TabsTrigger
                value="process"
                className="min-h-[36px] px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Process Flow
              </TabsTrigger>
            </TabsList>
          )}

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Gauges Grid */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Critical Metrics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  gauges[0],
                  gauges[2],
                  ["Flow Rate Inlet", "flowRateInlet", "L/min", 100],
                  gauges[6],
                ].map(renderGauge)}
              </div>
            </div>

            {/* Quick Process Status */}
            <ProcessFlowDiagram
              title={
                isDemoMode
                  ? "Illustrative demo process"
                  : "Configured process diagram"
              }
              nodes={processNodes}
              connections={processConnections}
              liveData={processLiveData}
              width={800}
              height={400}
            />

            {/* Recent Trends */}
            <MultiTimeframeTrendChart
              title="Measured Trends"
              data={historicalData || []}
              metrics={trendMetrics}
              defaultTimeframe={period}
              onTimeframeChange={setPeriod}
              height={300}
            />
          </TabsContent>

          {/* Gauges Tab */}
          <TabsContent value="gauges" className="space-y-6 mt-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">All System Gauges</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {gauges.map(renderGauge)}
              </div>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6 mt-6">
            <MultiTimeframeTrendChart
              title="Machine Metric Analysis"
              data={historicalData || []}
              metrics={trendMetrics}
              defaultTimeframe={period}
              onTimeframeChange={setPeriod}
              defaultChartType="line"
              height={400}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MultiTimeframeTrendChart
                title="System Temperature"
                data={historicalData || []}
                metrics={[
                  trendMetrics.find((metric) => metric.dataKey === "tempIn"),
                ]}
                defaultTimeframe={period}
                defaultChartType="area"
                height={300}
                showControls={false}
              />
              <MultiTimeframeTrendChart
                title="System Pressure"
                data={historicalData || []}
                metrics={[
                  trendMetrics.find(
                    (metric) => metric.dataKey === "differentialPressure",
                  ),
                ]}
                defaultTimeframe={period}
                defaultChartType="area"
                height={300}
                showControls={false}
              />
            </div>
          </TabsContent>

          {/* Process Flow Tab */}
          <TabsContent value="process" className="space-y-6 mt-6">
            <ProcessFlowDiagram
              title="Complete Process Flow"
              nodes={processNodes}
              connections={processConnections}
              liveData={processLiveData}
              width={800}
              height={600}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ComprehensiveVisualizationDashboard;
