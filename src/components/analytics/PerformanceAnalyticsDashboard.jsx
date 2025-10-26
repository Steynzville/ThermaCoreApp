/**
 * Performance Analytics Dashboard
 *
 * Comprehensive analytics dashboard for performance monitoring,
 * equipment health, energy consumption, and predictive maintenance.
 */

import {
  Activity,
  AlertCircle,
  BarChart3,
  Calendar,
  Download,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTenant } from "../../context/TenantContext";
import analyticsService from "../../services/analyticsService";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

const PerformanceAnalyticsDashboard = ({ embedded = false }) => {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState("7d");
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [equipmentHealth, setEquipmentHealth] = useState(null);
  const [energyData, setEnergyData] = useState(null);
  const [activeTab, setActiveTab] = useState("performance");

  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);

    // Load mock data for development
    setPerformanceMetrics(analyticsService.generateMockPerformanceMetrics());
    setEquipmentHealth(analyticsService.generateMockEquipmentHealth());
    setEnergyData(
      analyticsService.generateMockEnergyConsumption(
        selectedTimeframe === "30d" ? 30 : 7,
      ),
    );

    setLoading(false);
  }, [selectedTimeframe]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const handleExportReport = async (reportType, format) => {
    const result = await analyticsService.generateReport({
      tenantId: currentTenant?.id,
      reportType,
      format,
      startTime: new Date(Date.now() - 7 * 86400000).toISOString(),
      endTime: new Date().toISOString(),
    });

    if (result.success && result.type === "blob") {
      // Download the blob
      const url = window.URL.createObjectURL(result.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}-report-${new Date().toISOString().split("T")[0]}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const getHealthColor = (score) => {
    if (score >= 85) return "text-green-600 dark:text-green-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getHealthStatus = (score) => {
    if (score >= 85) return "Healthy";
    if (score >= 70) return "Warning";
    return "Critical";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "min-h-screen bg-background p-4 sm:p-6"}>
      <div className={embedded ? "" : "max-w-7xl mx-auto space-y-6"}>
        {/* Header - only show when not embedded */}
        {!embedded && (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Performance Analytics
              </h1>
              <p className="text-muted-foreground mt-1">
                Comprehensive system analytics and reporting
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedTimeframe}
                onValueChange={setSelectedTimeframe}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportReport("performance", "csv")}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        )}

        {/* Timeframe and Export controls - show when embedded */}
        {embedded && (
          <div className="flex items-center justify-end gap-2 mb-4">
            <Select
              value={selectedTimeframe}
              onValueChange={setSelectedTimeframe}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportReport("performance", "csv")}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="health">Equipment Health</TabsTrigger>
            <TabsTrigger value="energy">Energy</TabsTrigger>
            <TabsTrigger value="predictive">Predictive</TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6 mt-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Efficiency
                      </p>
                      <p className="text-2xl font-bold">
                        {performanceMetrics?.overall.efficiency}%
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Uptime</p>
                      <p className="text-2xl font-bold">
                        {performanceMetrics?.overall.uptime}%
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Availability
                      </p>
                      <p className="text-2xl font-bold">
                        {performanceMetrics?.overall.availability}%
                      </p>
                    </div>
                    <Shield className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Quality</p>
                      <p className="text-2xl font-bold">
                        {performanceMetrics?.overall.quality}%
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceMetrics?.trends.efficiency}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Efficiency %"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Device Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Device Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceMetrics?.byDevice.map((device) => (
                    <div key={device.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{device.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {device.id}
                          </p>
                        </div>
                        <Badge
                          variant={
                            device.status === "running" ? "success" : "warning"
                          }
                        >
                          {device.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Efficiency
                          </p>
                          <p className="text-lg font-bold">
                            {device.efficiency}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Uptime
                          </p>
                          <p className="text-lg font-bold">{device.uptime}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Equipment Health Tab */}
          <TabsContent value="health" className="space-y-6 mt-6">
            {/* Overall Health */}
            <Card>
              <CardHeader>
                <CardTitle>Overall System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-4xl font-bold ${getHealthColor(equipmentHealth?.overall.score)}`}
                    >
                      {equipmentHealth?.overall.score}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Status: {getHealthStatus(equipmentHealth?.overall.score)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Last Maintenance
                    </p>
                    <p className="text-sm font-medium">
                      {new Date(
                        equipmentHealth?.overall.lastMaintenance,
                      ).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Next Maintenance
                    </p>
                    <p className="text-sm font-medium">
                      {new Date(
                        equipmentHealth?.overall.nextMaintenance,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Device Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {equipmentHealth?.devices.map((device) => (
                <Card key={device.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{device.name}</CardTitle>
                      <Badge
                        variant={
                          device.status === "healthy" ? "success" : "warning"
                        }
                      >
                        {device.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">
                            Health Score
                          </span>
                          <span
                            className={`text-2xl font-bold ${getHealthColor(device.healthScore)}`}
                          >
                            {device.healthScore}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">
                          Sensor Status
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-muted rounded">
                            <p className="text-xs text-muted-foreground">
                              Temp
                            </p>
                            <p
                              className={`text-sm font-medium ${device.sensors.temperature === "good" ? "text-green-600" : "text-yellow-600"}`}
                            >
                              {device.sensors.temperature}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-muted rounded">
                            <p className="text-xs text-muted-foreground">
                              Press
                            </p>
                            <p
                              className={`text-sm font-medium ${device.sensors.pressure === "good" ? "text-green-600" : "text-yellow-600"}`}
                            >
                              {device.sensors.pressure}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-muted rounded">
                            <p className="text-xs text-muted-foreground">
                              Flow
                            </p>
                            <p
                              className={`text-sm font-medium ${device.sensors.flow === "good" ? "text-green-600" : "text-yellow-600"}`}
                            >
                              {device.sensors.flow}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Maintenance in {device.predictions.maintenanceDue}{" "}
                            days
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Energy Tab */}
          <TabsContent value="energy" className="space-y-6 mt-6">
            {/* Energy Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{energyData?.total}</p>
                      <p className="text-xs text-muted-foreground">kWh</p>
                    </div>
                    <Zap className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Average</p>
                    <p className="text-2xl font-bold">{energyData?.average}</p>
                    <p className="text-xs text-muted-foreground">kWh/day</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Peak</p>
                    <p className="text-2xl font-bold">{energyData?.peak}</p>
                    <p className="text-xs text-muted-foreground">kWh</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-950/20">
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Savings
                    </p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {energyData?.savings}%
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      vs. last period
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Energy Consumption Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Energy Consumption Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={energyData?.timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="consumption"
                      name="Consumption (kWh)"
                      fill="#3b82f6"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Energy by Device */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Consumption by Device</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={energyData?.byDevice}
                        dataKey="consumption"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {energyData?.byDevice.map((entry, index) => (
                          <Cell
                            key={`cell-${entry.device}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Device Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {energyData?.byDevice.map((device, index) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium">{device.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {device.consumption} kWh
                            </p>
                          </div>
                        </div>
                        <Badge>{device.percentage}%</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Predictive Maintenance Tab */}
          <TabsContent value="predictive" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Predictive Maintenance Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                        Maintenance Recommended
                      </h4>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                        TC003 shows increased vibration patterns. Schedule
                        inspection within 15 days.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {equipmentHealth?.devices.map((device) => (
                      <div key={device.id} className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-3">{device.name}</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Remaining Lifetime
                            </span>
                            <span className="text-sm font-medium">
                              {device.predictions.remainingLifetime}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{
                                width: `${device.predictions.remainingLifetime}%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Next Maintenance
                            </span>
                            <span className="font-medium">
                              {device.predictions.maintenanceDue} days
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PerformanceAnalyticsDashboard;
