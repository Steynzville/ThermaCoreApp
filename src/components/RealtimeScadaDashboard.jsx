/**
 * Real-Time SCADA Dashboard Component
 *
 * Displays live industrial monitoring data with tenant-scoped filtering,
 * protocol status, and interactive visualizations.
 */

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  TrendingDown,
  TrendingUp,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
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

import {
  useRealtimeHistoricalData,
  useRealtimeMetrics,
  useRealtimeProtocolStatus,
  useWebSocketStatus,
} from "../hooks/useRealtimeData";
import EnhancedMetricCard from "./EnhancedMetricCard";

// Connection status badge component - moved outside for performance
const ConnectionStatusBadge = ({ isConnected, isReconnecting }) => {
  if (isConnected) {
    return (
      <Badge variant="default" className="gap-1">
        <Wifi className="h-3 w-3" />
        Live
      </Badge>
    );
  } else if (isReconnecting) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Activity className="h-3 w-3 animate-pulse" />
        Reconnecting...
      </Badge>
    );
  } else {
    return (
      <Badge variant="destructive" className="gap-1">
        <WifiOff className="h-3 w-3" />
        Offline
      </Badge>
    );
  }
};

// Metric card component - moved outside for performance
const _MetricCard = ({
  title,
  icon: Icon,
  value,
  subValue,
  trend,
  loading,
}) => {
  const getTrendIcon = () => {
    if (trend === "up")
      return (
        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
      );
    if (trend === "down")
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium truncate">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold flex items-center gap-2">
              {value}
              {getTrendIcon()}
            </div>
            {subValue && (
              <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Protocol status indicator component - moved outside for performance
const ProtocolStatusIndicator = ({ protocol }) => {
  const isOnline = protocol.status === "connected";

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full ${
            isOnline
              ? "bg-green-500 animate-pulse"
              : "bg-gray-400 dark:bg-gray-600"
          }`}
        />
        <div>
          <div className="font-medium">{protocol.name}</div>
          <div className="text-xs text-muted-foreground">
            {protocol.devices} device{protocol.devices !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
      <div className="text-right">
        <Badge variant={isOnline ? "default" : "secondary"}>
          {protocol.status}
        </Badge>
        {isOnline && (
          <div className="text-xs text-muted-foreground mt-1">
            {protocol.dataRate} msg/s
          </div>
        )}
      </div>
    </div>
  );
};

const RealtimeScadaDashboard = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState("24");

  // Real-time data hooks
  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
  } = useRealtimeMetrics();

  const { protocols, loading: protocolsLoading } = useRealtimeProtocolStatus();

  const {
    data: historicalData,
    loading: historicalLoading,
    setTimeRange,
  } = useRealtimeHistoricalData({
    hours: parseInt(selectedTimeRange, 10),
  });

  const { isConnected, isReconnecting } = useWebSocketStatus();

  // Format chart data
  const chartData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return [];

    return historicalData.map((point) => ({
      time: new Date(point.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      temperature: parseFloat(point.temperature),
      pressure: parseFloat(point.pressure),
    }));
  }, [historicalData]);

  // Handle time range change
  const handleTimeRangeChange = (value) => {
    setSelectedTimeRange(value);
    setTimeRange(parseInt(value, 10));
  };

  if (metricsError) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <p>Error loading SCADA dashboard: {metricsError}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Real-Time SCADA Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Live industrial monitoring and control
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
            <ConnectionStatusBadge
              isConnected={isConnected}
              isReconnecting={isReconnecting}
            />
            <Select
              value={selectedTimeRange}
              onValueChange={handleTimeRangeChange}
            >
              <SelectTrigger className="w-32 min-h-[44px] sm:min-h-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last Hour</SelectItem>
                <SelectItem value="24">Last 24h</SelectItem>
                <SelectItem value="168">Last 7 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <EnhancedMetricCard
            title="Active Units"
            icon={CheckCircle}
            value={
              metrics
                ? `${metrics.activeUnits?.value || 0}/${metrics.activeUnits?.total || 0}`
                : "..."
            }
            subValue={
              metrics
                ? `${metrics.activeUnits?.percentage || 0}% operational`
                : null
            }
            trend={metrics?.activeUnits?.trend}
            loading={metricsLoading}
            clickable={true}
            drillDownPath="/grid-view"
            tooltipContent={
              <div>
                <p className="font-semibold mb-1">Active Units Status</p>
                <p className="text-sm">
                  Click to view detailed unit status and control panel
                </p>
              </div>
            }
          />

          <EnhancedMetricCard
            title="Temperature"
            icon={Activity}
            value={
              metrics
                ? `${metrics.temperature?.current || 0}${metrics.temperature?.unit || "°C"}`
                : "..."
            }
            subValue={
              metrics
                ? `Range: ${metrics.temperature?.min}-${metrics.temperature?.max}${metrics.temperature?.unit}`
                : null
            }
            trend={metrics?.temperature?.trend}
            loading={metricsLoading}
            tooltipContent={
              <div>
                <p className="font-semibold mb-1">System Temperature</p>
                <p className="text-sm">
                  Real-time average temperature across all sensors
                </p>
              </div>
            }
          />

          <EnhancedMetricCard
            title="Data Points"
            icon={Database}
            value={
              metrics
                ? (metrics.dataPoints?.count || 0).toLocaleString()
                : "..."
            }
            subValue={
              metrics ? `${metrics.dataPoints?.rate || 0} points/min` : null
            }
            trend={metrics?.dataPoints?.trend}
            loading={metricsLoading}
            clickable={true}
            drillDownPath="/history"
            tooltipContent={
              <div>
                <p className="font-semibold mb-1">Data Collection Rate</p>
                <p className="text-sm">
                  Total data points received from all protocols
                </p>
              </div>
            }
          />

          <EnhancedMetricCard
            title="Data Quality"
            icon={Clock}
            value={metrics ? `${metrics.dataQuality?.score || 0}%` : "..."}
            subValue={metrics ? metrics.dataQuality?.status : null}
            trend={metrics?.dataQuality?.score >= 95 ? "up" : "stable"}
            loading={metricsLoading}
            variant={
              metrics?.dataQuality?.score >= 95
                ? "success"
                : metrics?.dataQuality?.score >= 85
                  ? "warning"
                  : "error"
            }
            tooltipContent={
              <div>
                <p className="font-semibold mb-1">Data Quality Score</p>
                <p className="text-sm">
                  Based on reading frequency, consistency, and sensor health
                </p>
              </div>
            }
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Temperature & Pressure Trends */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Temperature & Pressure Trends</CardTitle>
              <CardDescription>
                Real-time sensor data over selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historicalLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                      Loading chart data...
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={false}
                      name="Temperature (°C)"
                    />
                    <Line
                      type="monotone"
                      dataKey="pressure"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      dot={false}
                      name="Pressure (PSI)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Protocol Status */}
          <Card>
            <CardHeader>
              <CardTitle>Protocol Status</CardTitle>
              <CardDescription>
                Industrial communication protocols
              </CardDescription>
            </CardHeader>
            <CardContent>
              {protocolsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : protocols && protocols.length > 0 ? (
                <div className="space-y-3">
                  {protocols.map((protocol) => (
                    <ProtocolStatusIndicator
                      key={protocol.name}
                      protocol={protocol}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No protocol data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Connection Status Info */}
        {!isConnected && (
          <Card className="border-yellow-500 dark:border-yellow-700">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    Operating in offline mode
                  </p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    Dashboard is displaying cached data. Real-time updates will
                    resume when connection is restored.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RealtimeScadaDashboard;
