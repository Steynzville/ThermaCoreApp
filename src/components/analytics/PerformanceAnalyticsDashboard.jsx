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
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useScada } from "../../context/ScadaContext";
import { useUnits } from "../../context/UnitContext";
import { useAuth } from "../../context/AuthContext";
import { useAnalytics } from "../../context/AnalyticsContext";
import { getPortfolioHistory } from "../../services/unitService";
import { generatePortfolioReport } from "../../services/portfolioReportService";
import { apiGetJson } from "../../utils/apiFetch";
import { isDemoMode } from "../../config/runtime";
import {
  scadaAnalytics,
  thresholdProjections,
  scadaPercent,
  scadaDate,
} from "../../utils/scadaAnalytics";
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

const PerformanceAnalyticsDashboard = ({
  embedded = false,
  defaultTab = "performance",
}) => {
  const { unit, data: machineHistory } = useScada();
  const portfolio = useUnits();
  const { user } = useAuth();
  const { assumptions } = useAnalytics();
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState("7d");
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [dataset, setDataset] = useState({
    id: null,
    records: [],
    schedules: [],
  });
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(
    Date.now() - (selectedTimeframe === "30d" ? 29 : 6) * 86400000,
  )
    .toISOString()
    .slice(0, 10);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    if (!unit) {
      setLoading(false);
      return;
    }
    Promise.all([
      getPortfolioHistory([unit], { from, to }),
      isDemoMode
        ? Promise.resolve().then(() =>
            JSON.parse(
              localStorage.getItem(
                `thermacore:demo:maintenance:${user?.id}:${unit.tenantId}:${unit.id}`,
              ) || "[]",
            ),
          )
        : apiGetJson(
            `/api/v1/units/${encodeURIComponent(unit.id)}/maintenance`,
          ).then((result) => result.data || []),
    ])
      .then(([records, schedules]) => {
        if (alive) setDataset({ id: unit.id, records, schedules });
      })
      .catch((failure) => {
        if (alive) {
          setError(failure.message);
          setDataset({ id: unit.id, records: [], schedules: [] });
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [unit?.id, portfolio.scopeKey, from, to, user?.id]);
  const { performanceMetrics, equipmentHealth, energyData } = useMemo(
    () =>
      scadaAnalytics(
        unit,
        dataset.id === unit?.id ? dataset.records : [],
        dataset.id === unit?.id ? dataset.schedules : [],
        from,
        to,
      ),
    [unit, dataset, from, to],
  );
  const projections = thresholdProjections(unit, machineHistory);

  // Sync active tab only when the defaultTab prop itself changes externally —
  // not whenever it merely differs from the user's current tab selection.
  // (Comparing defaultTab directly against activeTab here would revert any
  // user-initiated tab click straight back to defaultTab on every render.)
  const prevDefaultTabRef = useRef(defaultTab);
  useEffect(() => {
    if (defaultTab !== prevDefaultTabRef.current) {
      setActiveTab(defaultTab);
      prevDefaultTabRef.current = defaultTab;
    }
  }, [defaultTab]);

  const handleExportReport = async () => {
    if (!unit) return;
    setExporting(true);
    setError(null);
    try {
      await generatePortfolioReport(
        portfolio,
        assumptions,
        {
          scope: "single",
          selectedUnits: [unit.id],
          dateRange: { startDate: from, endDate: to },
          reportSections: {
            vitalStatistics: true,
            energyProduction: true,
            waterProduction: true,
            maintenance: true,
            alertsAlarms: true,
          },
          outputFormat: "xlsx",
        },
        user?.id,
      );
    } catch (failure) {
      setError(failure.message);
    } finally {
      setExporting(false);
    }
  };

  const getHealthColor = (score) => {
    if (!Number.isFinite(score)) return "text-muted-foreground";
    if (score >= 85) return "text-green-600 dark:text-green-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getHealthStatus = (score) => {
    if (!Number.isFinite(score)) return unit?.healthStatus || "Unknown";
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
                onClick={handleExportReport}
                disabled={exporting || !unit}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        )}

        {embedded && (
          <div className="flex items-center gap-3">
            <select
              aria-label="SCADA analysis period"
              className="border rounded p-2 bg-background"
              value={selectedTimeframe}
              onChange={(event) => setSelectedTimeframe(event.target.value)}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <Button onClick={handleExportReport} disabled={exporting || !unit}>
              Export Excel
            </Button>
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        <p className="text-sm text-muted-foreground">
          Production availability uses measured operating hours / observed
          hours. Coverage uses observed hours / selected calendar hours. Energy
          totals cover measured intervals only. Efficiency needs an input-energy
          meter; quality and health scores need validated source data. No
          lifetime model or savings baseline is configured.
        </p>
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {!embedded && (
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="health">Equipment Health</TabsTrigger>
              <TabsTrigger value="energy">Energy</TabsTrigger>
              <TabsTrigger value="predictive">Predictive</TabsTrigger>
            </TabsList>
          )}

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6 mt-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Efficiency
                      </p>
                      <p className="text-2xl font-bold text-foreground dark:text-white">
                        {scadaPercent(performanceMetrics?.overall.efficiency)}
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
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Production Availability
                      </p>
                      <p className="text-2xl font-bold text-foreground dark:text-white">
                        {scadaPercent(performanceMetrics?.overall.uptime)}
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
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Observed Coverage
                      </p>
                      <p className="text-2xl font-bold text-foreground dark:text-white">
                        {scadaPercent(performanceMetrics?.overall.availability)}
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
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Quality
                      </p>
                      <p className="text-2xl font-bold text-foreground dark:text-white">
                        {scadaPercent(performanceMetrics?.overall.quality)}
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
                <CardTitle className="text-foreground dark:text-white">
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceMetrics?.trends.efficiency}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-gray-200 dark:stroke-gray-700"
                    />
                    <XAxis
                      dataKey="hour"
                      className="text-gray-600 dark:text-gray-400"
                      tick={{ fill: "currentColor" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      className="text-gray-600 dark:text-gray-400"
                      tick={{ fill: "currentColor" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: "var(--foreground)",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Production availability %"
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
                <CardTitle className="text-foreground dark:text-white">
                  Device Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceMetrics?.byDevice.map((device) => (
                    <div
                      key={device.id}
                      className="p-4 border rounded-lg bg-card dark:bg-gray-800"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground dark:text-white">
                            {device.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
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
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Efficiency
                          </p>
                          <p className="text-lg font-bold text-foreground dark:text-white">
                            {scadaPercent(device.efficiency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Production Availability
                          </p>
                          <p className="text-lg font-bold text-foreground dark:text-white">
                            {scadaPercent(device.uptime)}
                          </p>
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
                <CardTitle className="text-foreground dark:text-white">
                  Overall System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-4xl font-bold ${getHealthColor(equipmentHealth?.overall.score)}`}
                    >
                      {equipmentHealth?.overall.score ?? "Unavailable"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Status: {getHealthStatus(equipmentHealth?.overall.score)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Last Maintenance
                    </p>
                    <p className="text-sm font-medium text-foreground dark:text-white">
                      {scadaDate(equipmentHealth?.overall.lastMaintenance)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      Next Maintenance
                    </p>
                    <p className="text-sm font-medium text-foreground dark:text-white">
                      {scadaDate(equipmentHealth?.overall.nextMaintenance)}
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
                      <CardTitle className="text-lg text-foreground dark:text-white">
                        {device.name}
                      </CardTitle>
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
                          <span className="text-sm text-gray-600 dark:text-gray-300">
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
                        <p className="text-sm font-medium text-foreground dark:text-white mb-2">
                          Sensor Status
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-muted dark:bg-gray-700 rounded">
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              Temp
                            </p>
                            <p
                              className={`text-sm font-medium ${device.sensors.temperature === "good" ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}
                            >
                              {device.sensors.temperature}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-muted dark:bg-gray-700 rounded">
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              Press
                            </p>
                            <p
                              className={`text-sm font-medium ${device.sensors.pressure === "good" ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}
                            >
                              {device.sensors.pressure}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-muted dark:bg-gray-700 rounded">
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              Flow
                            </p>
                            <p
                              className={`text-sm font-medium ${device.sensors.flow === "good" ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}
                            >
                              {device.sensors.flow}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-300">
                            {device.predictions.maintenanceDue == null
                              ? "No scheduled maintenance"
                              : `Maintenance in ${device.predictions.maintenanceDue} days`}
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
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Total
                      </p>
                      <p className="text-2xl font-bold text-foreground dark:text-white">
                        {energyData?.total}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        kWh
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Average
                    </p>
                    <p className="text-2xl font-bold text-foreground dark:text-white">
                      {energyData?.average}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      kWh/day
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Peak
                    </p>
                    <p className="text-2xl font-bold text-foreground dark:text-white">
                      {energyData?.peak}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      kWh
                    </p>
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
                      {scadaPercent(energyData?.savings)}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      vs. last period
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Electrical Production Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground dark:text-white">
                  Electrical Production Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={energyData?.timeline}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-gray-200 dark:stroke-gray-700"
                    />
                    <XAxis
                      dataKey="date"
                      className="text-gray-600 dark:text-gray-400"
                      tick={{ fill: "currentColor" }}
                    />
                    <YAxis
                      className="text-gray-600 dark:text-gray-400"
                      tick={{ fill: "currentColor" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        color: "var(--foreground)",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="consumption"
                      name="Production (kWh)"
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
                  <CardTitle className="text-foreground dark:text-white">
                    Production by Device
                  </CardTitle>
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
                            key={`cell-${entry.id}`}
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
                  <CardTitle className="text-foreground dark:text-white">
                    Device Breakdown
                  </CardTitle>
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
                            <p className="text-sm font-medium text-foreground dark:text-white">
                              {device.name}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
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
                <CardTitle className="text-foreground dark:text-white">
                  Predictive Maintenance Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                        Maintenance Outlook
                      </h4>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                        {projections.length
                          ? projections
                              .map(
                                (item) =>
                                  `${item.sensor}: linear trend reaches ${item.threshold} ${item.unit} in approximately ${item.days} days (R² ${item.r2}).`,
                              )
                              .join(" ")
                          : "No supported threshold projection is available for the selected unit. A validated remaining-life model is not configured."}{" "}
                        Trend extrapolation is advisory and does not replace
                        alarms or the maintenance schedule.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {equipmentHealth?.devices.map((device) => (
                      <div
                        key={device.id}
                        className="p-4 border rounded-lg bg-card dark:bg-gray-800"
                      >
                        <h4 className="font-semibold text-foreground dark:text-white mb-3">
                          {device.name}
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              Remaining Lifetime
                            </span>
                            <span className="text-sm font-medium text-foreground dark:text-white">
                              {scadaPercent(
                                device.predictions.remainingLifetime,
                              )}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{
                                width: `${device.predictions.remainingLifetime ?? 0}%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-300">
                              Next Maintenance
                            </span>
                            <span className="font-medium text-foreground dark:text-white">
                              {device.predictions.maintenanceDue == null
                                ? "Not scheduled"
                                : `${device.predictions.maintenanceDue} days`}
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
