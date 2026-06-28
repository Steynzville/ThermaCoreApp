/**
 * Comprehensive Visualization Dashboard
 *
 * Complete SCADA platform dashboard integrating all visualization components:
 * - Industrial gauges and meters
 * - Multi-timeframe trend charts
 * - Process flow diagrams
 * - Real-time alert integration
 */

import { useState } from "react";
import {
  useRealtimeHistoricalData,
  useRealtimeMetrics,
} from "../../hooks/useRealtimeData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import IndustrialGauge from "./IndustrialGauge";
import MultiTimeframeTrendChart from "./MultiTimeframeTrendChart";
import ProcessFlowDiagram from "./ProcessFlowDiagram";

const ComprehensiveVisualizationDashboard = ({
  embedded = false,
  defaultTab = "overview",
}) => {
  const [selectedTab, setSelectedTab] = useState(defaultTab);

  // Real-time data hooks
  const { metrics } = useRealtimeMetrics({
    useMockData: true,
  });
  const { data: historicalData } = useRealtimeHistoricalData({
    hours: 24,
    useMockData: true,
  });

  // Mock process flow data
  const processNodes = [
    {
      id: "pump1",
      label: "Pump 1",
      icon: "P",
      x: 100,
      y: 150,
      status: "running",
    },
    {
      id: "heat1",
      label: "Heater",
      icon: "H",
      x: 300,
      y: 150,
      status: "running",
    },
    {
      id: "tank1",
      label: "Tank 1",
      icon: "T",
      x: 500,
      y: 150,
      status: "running",
    },
    {
      id: "valve1",
      label: "Valve 1",
      icon: "V",
      x: 300,
      y: 300,
      status: "warning",
    },
    {
      id: "pump2",
      label: "Pump 2",
      icon: "P",
      x: 500,
      y: 300,
      status: "running",
    },
    {
      id: "outlet",
      label: "Outlet",
      icon: "O",
      x: 700,
      y: 250,
      status: "running",
    },
  ];

  const processConnections = [
    { id: "c1", from: "pump1", to: "heat1" },
    { id: "c2", from: "heat1", to: "tank1" },
    { id: "c3", from: "heat1", to: "valve1" },
    { id: "c4", from: "valve1", to: "pump2" },
    { id: "c5", from: "tank1", to: "outlet" },
    { id: "c6", from: "pump2", to: "outlet" },
  ];

  const processLiveData = {
    pump1: { status: "running", value: 45.2, unit: "L/min" },
    heat1: { status: "running", value: 72.5, unit: "°C" },
    tank1: { status: "running", value: 85.0, unit: "%" },
    valve1: { status: "warning", value: 65.0, unit: "%" },
    pump2: { status: "running", value: 38.7, unit: "L/min" },
    outlet: { status: "running", value: 70.1, unit: "°C" },
    c1: { flowRate: 45.2 },
    c2: { flowRate: 35.0 },
    c3: { flowRate: 10.2 },
    c4: { flowRate: 10.2 },
    c5: { flowRate: 35.0 },
    c6: { flowRate: 10.2 },
  };

  // Trend chart metrics configuration
  const trendMetrics = [
    {
      dataKey: "temperature",
      label: "Temperature (°C)",
      color: "#ef4444",
      type: "line",
    },
    {
      dataKey: "pressure",
      label: "Pressure (PSI)",
      color: "#3b82f6",
      type: "line",
    },
    {
      dataKey: "activeUnits",
      label: "Active Units",
      color: "#22c55e",
      type: "bar",
    },
  ];

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
                <IndustrialGauge
                  title="Temperature"
                  value={parseFloat(metrics?.temperature?.current || 70)}
                  min={0}
                  max={100}
                  unit="°C"
                  thresholds={{ low: 20, normal: 60, high: 80 }}
                  size={180}
                />
                <IndustrialGauge
                  title="Pressure"
                  value={parseFloat(metrics?.pressure?.current || 105)}
                  min={0}
                  max={150}
                  unit="PSI"
                  thresholds={{ low: 30, normal: 100, high: 130 }}
                  size={180}
                />
                <IndustrialGauge
                  title="Flow Rate"
                  value={parseFloat(
                    metrics?.flow_rate_inlet?.current ||
                      metrics?.flowRateInlet?.current ||
                      45.5,
                  )}
                  min={0}
                  max={100}
                  unit="L/min"
                  thresholds={{ low: 10, normal: 70, high: 90 }}
                  size={180}
                />
                <IndustrialGauge
                  title="Tank Level"
                  value={85}
                  min={0}
                  max={100}
                  unit="%"
                  thresholds={{ low: 20, normal: 80, high: 95 }}
                  size={180}
                />
              </div>
            </div>

            {/* Quick Process Status */}
            <ProcessFlowDiagram
              title="System Overview"
              nodes={processNodes}
              connections={processConnections}
              liveData={processLiveData}
              width={800}
              height={400}
            />

            {/* Recent Trends */}
            <MultiTimeframeTrendChart
              title="Recent Trends (24h)"
              data={historicalData || []}
              metrics={trendMetrics}
              defaultTimeframe="24h"
              height={300}
            />
          </TabsContent>

          {/* Gauges Tab */}
          <TabsContent value="gauges" className="space-y-6 mt-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">All System Gauges</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <IndustrialGauge
                  title="Temperature Zone 1"
                  value={parseFloat(metrics?.temperature?.current || 72.3)}
                  min={0}
                  max={100}
                  unit="°C"
                  thresholds={{ low: 20, normal: 60, high: 80 }}
                />
                <IndustrialGauge
                  title="Temperature Zone 2"
                  value={parseFloat(
                    (
                      parseFloat(metrics?.temperature?.current || 72.3) * 0.95
                    ).toFixed(1),
                  )}
                  min={0}
                  max={100}
                  unit="°C"
                  thresholds={{ low: 20, normal: 60, high: 80 }}
                />
                <IndustrialGauge
                  title="Pressure Main Line"
                  value={parseFloat(metrics?.pressure?.current || 105)}
                  min={0}
                  max={150}
                  unit="PSI"
                  thresholds={{ low: 30, normal: 100, high: 130 }}
                />
                <IndustrialGauge
                  title="Pressure Secondary"
                  value={parseFloat(
                    (
                      parseFloat(metrics?.pressure?.current || 105) * 0.93
                    ).toFixed(1),
                  )}
                  min={0}
                  max={150}
                  unit="PSI"
                  thresholds={{ low: 30, normal: 100, high: 130 }}
                />
                <IndustrialGauge
                  title="Flow Rate Inlet"
                  value={parseFloat(
                    metrics?.flow_rate_inlet?.current ||
                      metrics?.flowRateInlet?.current ||
                      45.5,
                  )}
                  min={0}
                  max={100}
                  unit="L/min"
                  thresholds={{ low: 10, normal: 70, high: 90 }}
                />
                <IndustrialGauge
                  title="Flow Rate Outlet"
                  value={parseFloat(
                    metrics?.flow_rate_outlet?.current ||
                      metrics?.flowRateOutlet?.current ||
                      42.1,
                  )}
                  min={0}
                  max={100}
                  unit="L/min"
                  thresholds={{ low: 10, normal: 70, high: 90 }}
                />
                <IndustrialGauge
                  title="Tank 1 Level"
                  value={85}
                  min={0}
                  max={100}
                  unit="%"
                  thresholds={{ low: 20, normal: 80, high: 95 }}
                />
                <IndustrialGauge
                  title="Tank 2 Level"
                  value={78}
                  min={0}
                  max={100}
                  unit="%"
                  thresholds={{ low: 20, normal: 80, high: 95 }}
                />
                <IndustrialGauge
                  title="Power Consumption"
                  value={62}
                  min={0}
                  max={100}
                  unit="kW"
                  thresholds={{ low: 10, normal: 70, high: 90 }}
                />
              </div>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6 mt-6">
            <MultiTimeframeTrendChart
              title="Temperature & Pressure Analysis"
              data={historicalData || []}
              metrics={trendMetrics}
              defaultTimeframe="24h"
              defaultChartType="line"
              height={400}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MultiTimeframeTrendChart
                title="System Temperature"
                data={historicalData || []}
                metrics={[trendMetrics[0]]}
                defaultTimeframe="7d"
                defaultChartType="area"
                height={300}
                showControls={false}
              />
              <MultiTimeframeTrendChart
                title="System Pressure"
                data={historicalData || []}
                metrics={[trendMetrics[1]]}
                defaultTimeframe="7d"
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
