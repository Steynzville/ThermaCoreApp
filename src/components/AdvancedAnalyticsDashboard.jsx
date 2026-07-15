import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  useRealtimeMetrics,
  useRealtimeProtocolStatus,
} from "../hooks/useRealtimeData";

// Single source of truth for time range configuration
const TIME_RANGE_CONFIG = {
  "1h":  { factor: 0.1, periodDays: 0.1, label: "Last Hour" },
  "24h": { factor: 1,   periodDays: 1,   label: "Last 24h" },
  "7d":  { factor: 7,   periodDays: 7,   label: "Last 7 Days" },
  "30d": { factor: 30,  periodDays: 30,  label: "Last 30 Days" },
};

// Export for testing
export const generateMockData = (metrics, timeRange = "24h", customAnomalies = null) => {
  // Get config for the time range, fallback to 24h if unknown
  const config = TIME_RANGE_CONFIG[timeRange] ?? TIME_RANGE_CONFIG["24h"];
  const { factor, periodDays } = config;

  // Use custom anomalies if provided, otherwise use defaults
  const defaultAnomalies = [
    {
      sensor_id: "SENS_001",
      unit_id: "UNIT003",
      sensor_type: "temperature",
      value: 95.2,
      timestamp: "2024-01-15T14:32:00Z",
      anomaly_score: 4.2,
      confidence: 89.5,
    },
    {
      sensor_id: "SENS_015",
      unit_id: "UNIT002",
      sensor_type: "pressure",
      value: 145.8,
      timestamp: "2024-01-15T13:18:00Z",
      anomaly_score: 3.8,
      confidence: 92.1,
    },
  ];

  return {
    overview: {
      total_units: 12,
      active_units: metrics?.activeUnits?.value || 10,
      total_sensors: 48,
      recent_readings: Math.round((metrics?.dataPoints?.count || 2856) * factor),
      uptime_percentage: parseFloat(
        metrics?.activeUnits?.percentage || 83.3,
      ),
    },
    trends: {
      current_week_readings: Math.round(19992 * factor),
      previous_week_readings: Math.round(18456 * factor),
      trend_percentage: 8.3,
    },
    performance: {
      avg_temperature_24h: parseFloat(
        metrics?.temperature?.current || 67.8,
      ),
      max_temperature_24h: parseFloat(
        metrics?.temperature?.max || 89.4,
      ),
      data_quality_score: metrics?.dataQuality?.score || 94.2,
    },
    unitsPerformance: [
      {
        unit_id: "UNIT001",
        unit_name: "Boiler Alpha",
        performance_score: 98,
        status: "online",
        reading_count: Math.round(144 * factor),
      },
      {
        unit_id: "UNIT002",
        unit_name: "Chiller Beta",
        performance_score: 87,
        status: "online",
        reading_count: Math.round(140 * factor),
      },
      {
        unit_id: "UNIT003",
        unit_name: "HVAC Gamma",
        performance_score: 92,
        status: "online",
        reading_count: Math.round(138 * factor),
      },
      {
        unit_id: "UNIT004",
        unit_name: "Pump Delta",
        performance_score: 76,
        status: "maintenance",
        reading_count: Math.round(89 * factor),
      },
      {
        unit_id: "UNIT005",
        unit_name: "Compressor Epsilon",
        performance_score: 45,
        status: "offline",
        reading_count: Math.round(12 * factor),
      },
    ],
    temperatureTrends: [
      { timestamp: "00:00", temperature: 65.2, pressure: 98.5 },
      { timestamp: "04:00", temperature: 67.8, pressure: 102.1 },
      { timestamp: "08:00", temperature: 72.4, pressure: 105.8 },
      { timestamp: "12:00", temperature: 78.9, pressure: 108.2 },
      { timestamp: "16:00", temperature: 81.3, pressure: 110.6 },
      { timestamp: "20:00", temperature: 75.6, pressure: 106.9 },
      { timestamp: "24:00", temperature: 69.1, pressure: 103.4 },
    ],
    alertPatterns: {
      period_days: periodDays,
      total_potential_alerts: Math.round(23 * factor),
      avg_alerts_per_day: Math.round((3.3 * factor) * 10) / 10,
      sensor_type_breakdown: {
        temperature: Math.round(12 * factor),
        pressure: Math.round(7 * factor),
        flow: Math.round(4 * factor),
      },
    },
    anomalies: customAnomalies !== null ? customAnomalies : defaultAnomalies,
  };
};

const AdvancedAnalyticsDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState("24h");

  // Real-time data hooks
  const { metrics: realtimeMetrics, connectionStatus } = useRealtimeMetrics({
    useMockData: true,
  });

  // Protocol status for future use
  useRealtimeProtocolStatus({
    useMockData: true,
  });

  // Use stable dependency - JSON string of metrics to detect actual changes
  const metricsKey = JSON.stringify(realtimeMetrics);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      // Simulate API call with current metrics
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockData = generateMockData(realtimeMetrics, selectedTimeRange);
      setDashboardData(mockData);
      setLoading(false);
    };

    fetchDashboardData();
  }, [metricsKey, selectedTimeRange]);

  const formatValue = (value, unit = "") => {
    if (typeof value === "number") {
      return `${value.toFixed(1)}${unit}`;
    }
    return value;
  };

  const getPerformanceColor = (score) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-destructive";
  };

  const getTrendIcon = (percentage) => {
    if (percentage > 0) {
      return (
        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
      );
    } else if (percentage < 0) {
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    }
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-spinner">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Loading analytics dashboard...
          </p>
        </div>
      </div>
    );
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Advanced Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive SCADA system performance insights
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            {connectionStatus === "connected" && (
              <Badge variant="default" className="gap-1">
                <Activity className="h-3 w-3" />
                Live
              </Badge>
            )}
            <Select
              value={selectedTimeRange}
              onValueChange={setSelectedTimeRange}
            >
              <SelectTrigger className="w-32 min-h-[44px] sm:min-h-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Real-time
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium truncate">
                Active Units
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.overview.active_units}/
                {dashboardData.overview.total_units}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatValue(dashboardData.overview.uptime_percentage)}% uptime
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium truncate">
                Data Points
              </CardTitle>
              <Activity className="h-4 w-4 text-primary flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.overview.recent_readings.toLocaleString()}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {getTrendIcon(dashboardData.trends.trend_percentage)}
                <span className="ml-1">
                  {formatValue(dashboardData.trends.trend_percentage)}% from
                  last week
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium truncate">
                Avg Temperature
              </CardTitle>
              <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatValue(
                  dashboardData.performance.avg_temperature_24h,
                  "°C",
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Max:{" "}
                {formatValue(
                  dashboardData.performance.max_temperature_24h,
                  "°C",
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium truncate">
                Data Quality
              </CardTitle>
              <Clock className="h-4 w-4 text-primary flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatValue(dashboardData.performance.data_quality_score)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Based on reading frequency
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList>
            <TabsTrigger value="trends">Trends & Performance</TabsTrigger>
            <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
            <TabsTrigger value="alerts">Alert Analysis</TabsTrigger>
            <TabsTrigger value="units">Unit Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Temperature & Pressure Trends</CardTitle>
                  <CardDescription>
                    24-hour system performance overview
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dashboardData.temperatureTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        stroke="#8884d8"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="pressure"
                        stroke="#82ca9d"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Unit Performance Scores</CardTitle>
                  <CardDescription>
                    Performance ranking across all units
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={dashboardData.unitsPerformance}
                      layout="horizontal"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="unit_name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="performance_score" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="anomalies">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    Recent Anomalies
                  </CardTitle>
                  <CardDescription>
                    Machine learning detected anomalies in sensor readings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.anomalies.map((anomaly) => (
                      <div
                        key={`${anomaly.unit_id}-${anomaly.timestamp}`}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline">
                              {anomaly.sensor_type}
                            </Badge>
                            <span className="text-sm text-muted-foreground truncate">
                              {anomaly.unit_id}
                            </span>
                          </div>
                          <div className="text-lg font-semibold">
                            {formatValue(
                              anomaly.value,
                              anomaly.sensor_type === "temperature"
                                ? "°C"
                                : anomaly.sensor_type === "pressure"
                                  ? " PSI"
                                  : "",
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(anomaly.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-sm font-medium">
                            Score: {formatValue(anomaly.anomaly_score)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatValue(anomaly.confidence)}% confidence
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Anomaly Statistics</CardTitle>
                  <CardDescription>
                    Detection performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Detected</span>
                      <span className="font-semibold">
                        {dashboardData.anomalies.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Confidence</span>
                      <span className="font-semibold">
                        {formatValue(
                          dashboardData.anomalies.length > 0
                            ? dashboardData.anomalies.reduce(
                                (sum, a) => sum + a.confidence,
                                0,
                              ) / dashboardData.anomalies.length
                            : 0,
                        )}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Detection Methods</span>
                      <span className="font-semibold">3 Active</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-xs text-gray-500 mb-2">
                        Methods Used
                      </div>
                      <div className="space-y-1">
                        <Badge variant="secondary" className="text-xs">
                          Z-Score Analysis
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          IQR Detection
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Moving Average
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Alert Patterns</CardTitle>
                  <CardDescription>
                    {dashboardData.alertPatterns.period_days}-day alert analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {dashboardData.alertPatterns.total_potential_alerts}
                      </div>
                      <div className="text-sm text-gray-600">Total Alerts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatValue(
                          dashboardData.alertPatterns.avg_alerts_per_day,
                        )}
                      </div>
                      <div className="text-sm text-gray-600">Daily Average</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alert Distribution by Sensor Type</CardTitle>
                  <CardDescription>Breakdown of alert sources</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={Object.entries(
                          dashboardData.alertPatterns.sensor_type_breakdown,
                        ).map(([key, value], index) => ({
                          name: key,
                          value,
                          fill: COLORS[index % COLORS.length],
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(
                          dashboardData.alertPatterns.sensor_type_breakdown,
                        ).map(([key, _value], index) => (
                          <Cell
                            key={`cell-${key}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="units">
            <Card>
              <CardHeader>
                <CardTitle>Unit Performance Comparison</CardTitle>
                <CardDescription>
                  Detailed performance metrics across all units
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {dashboardData.unitsPerformance.map((unit, _index) => (
                    <div
                      key={unit.unit_id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">
                            {unit.unit_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold">{unit.unit_name}</div>
                          <div className="text-sm text-gray-600">
                            {unit.unit_id}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div
                            className={`text-lg font-bold ${getPerformanceColor(unit.performance_score)}`}
                          >
                            {unit.performance_score}%
                          </div>
                          <div className="text-xs text-gray-500">
                            Performance
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">
                            {unit.reading_count}
                          </div>
                          <div className="text-xs text-gray-500">Readings</div>
                        </div>
                        <Badge
                          variant={
                            unit.status === "online"
                              ? "default"
                              : unit.status === "maintenance"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {unit.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;
