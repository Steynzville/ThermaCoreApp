/**
 * Multi-Timeframe Trend Chart Component
 *
 * Advanced trend visualization with multiple timeframe support,
 * data correlation, and historical analysis capabilities.
 */

import { Download, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

const TIMEFRAME_OPTIONS = [
  { value: "1h", label: "Last Hour", interval: "1m" },
  { value: "24h", label: "Last 24 Hours", interval: "5m" },
  { value: "7d", label: "Last 7 Days", interval: "1h" },
  { value: "30d", label: "Last 30 Days", interval: "6h" },
];

const CHART_TYPES = [
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "bar", label: "Bar" },
  { value: "composed", label: "Combined" },
];

const MultiTimeframeTrendChart = ({
  title = "Trend Analysis",
  data = [],
  metrics = [],
  defaultTimeframe = "24h",
  defaultChartType = "line",
  showControls = true,
  height = 400,
  onExport,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState(defaultTimeframe);
  const [selectedChartType, setSelectedChartType] = useState(defaultChartType);
  const selectedMetrics = useMemo(() => metrics.map((m) => m.dataKey), [metrics]);
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode for tooltip styling
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const formatTimeByTimeframe = useCallback((timestamp, timeframe) => {
    const date = new Date(timestamp);
    switch (timeframe) {
      case "1h":
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
      case "24h":
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
      case "7d":
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
        });
      case "30d":
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      default:
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
    }
  }, []);

  // Format data based on timeframe
  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((point) => ({
      ...point,
      time: formatTimeByTimeframe(point.timestamp, selectedTimeframe),
      timestamp: point.timestamp,
    }));
  }, [data, selectedTimeframe, formatTimeByTimeframe]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!formattedData || formattedData.length === 0) return {};

    const stats = {};
    metrics.forEach((metric) => {
      const values = formattedData
        .map((d) => parseFloat(d[metric.dataKey]))
        .filter((v) => !Number.isNaN(v));

      if (values.length > 0) {
        const firstValue = values[0];
        const lastValue = values[values.length - 1];
        const trend = values.length > 1 && firstValue !== 0
          ? ((lastValue - firstValue) / firstValue) * 100
          : 0;

        stats[metric.dataKey] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          current: lastValue,
          trend,
        };
      }
    });
    return stats;
  }, [formattedData, metrics]);

  const handleExport = () => {
    if (onExport) {
      onExport(formattedData, statistics);
    } else {
      const csv = convertToCSV(formattedData);
      downloadCSV(csv, `trend-data-${selectedTimeframe}.csv`);
    }
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return "";

    const headers = [
      "timestamp",
      "time",
      ...metrics.map((m) => m.dataKey),
    ].join(",");
    const rows = data.map((row) =>
      [
        row.timestamp,
        row.time,
        ...metrics.map((m) => row[m.dataKey] ?? ""),
      ].join(","),
    );

    return [headers, ...rows].join("\n");
  };

  const downloadCSV = (csv, filename) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderChart = () => {
    const commonProps = {
      data: formattedData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    const axes = (
      <>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 12 }}
          angle={
            selectedTimeframe === "7d" || selectedTimeframe === "30d" ? -45 : 0
          }
          textAnchor={
            selectedTimeframe === "7d" || selectedTimeframe === "30d"
              ? "end"
              : "middle"
          }
          height={
            selectedTimeframe === "7d" || selectedTimeframe === "30d" ? 80 : 60
          }
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark
              ? "rgba(31, 41, 55, 0.95)"
              : "rgba(255, 255, 255, 0.95)",
            border: isDark ? "1px solid #374151" : "1px solid #ccc",
            borderRadius: "4px",
            color: isDark ? "#f3f4f6" : "#111827",
          }}
        />
        <Legend />
      </>
    );

    switch (selectedChartType) {
      case "area":
        return (
          <AreaChart {...commonProps}>
            {axes}
            {metrics.map(
              (metric, index) =>
                selectedMetrics.includes(metric.dataKey) && (
                  <Area
                    key={metric.dataKey}
                    type="monotone"
                    dataKey={metric.dataKey}
                    stroke={metric.color || `hsl(${index * 137.5}, 70%, 50%)`}
                    fill={metric.color || `hsl(${index * 137.5}, 70%, 50%)`}
                    fillOpacity={0.3}
                    name={metric.label}
                    strokeWidth={2}
                  />
                ),
            )}
          </AreaChart>
        );

      case "bar":
        return (
          <BarChart {...commonProps}>
            {axes}
            {metrics.map(
              (metric, index) =>
                selectedMetrics.includes(metric.dataKey) && (
                  <Bar
                    key={metric.dataKey}
                    dataKey={metric.dataKey}
                    fill={metric.color || `hsl(${index * 137.5}, 70%, 50%)`}
                    name={metric.label}
                  />
                ),
            )}
          </BarChart>
        );

      case "composed":
        return (
          <ComposedChart {...commonProps}>
            {axes}
            {metrics.map((metric, index) => {
              if (!selectedMetrics.includes(metric.dataKey)) return null;

              if (metric.type === "bar") {
                return (
                  <Bar
                    key={metric.dataKey}
                    dataKey={metric.dataKey}
                    fill={metric.color || `hsl(${index * 137.5}, 70%, 50%)`}
                    name={metric.label}
                  />
                );
              }
              return (
                <Line
                  key={metric.dataKey}
                  type="monotone"
                  dataKey={metric.dataKey}
                  stroke={metric.color || `hsl(${index * 137.5}, 70%, 50%)`}
                  name={metric.label}
                  strokeWidth={2}
                  dot={false}
                />
              );
            })}
          </ComposedChart>
        );

      default: // line
        return (
          <LineChart {...commonProps}>
            {axes}
            {metrics.map(
              (metric, index) =>
                selectedMetrics.includes(metric.dataKey) && (
                  <Line
                    key={metric.dataKey}
                    type="monotone"
                    dataKey={metric.dataKey}
                    stroke={metric.color || `hsl(${index * 137.5}, 70%, 50%)`}
                    name={metric.label}
                    strokeWidth={2}
                    dot={false}
                  />
                ),
            )}
          </LineChart>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>

          {showControls && (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selectedTimeframe}
                onValueChange={setSelectedTimeframe}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Tabs
                value={selectedChartType}
                onValueChange={setSelectedChartType}
              >
                <TabsList className="bg-background dark:bg-card-foreground/10 border border-border dark:border-border/50">
                  {CHART_TYPES.map((type) => (
                    <TabsTrigger
                      key={type.value}
                      value={type.value}
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:border-primary dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:shadow-sm dark:data-[state=active]:border-primary"
                    >
                      {type.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Statistics Summary */}
        {Object.keys(statistics).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {metrics.map((metric) => {
              const stat = statistics[metric.dataKey];
              if (!stat) return null;

              return (
                <div key={metric.dataKey} className="p-2 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground">
                    {metric.label}
                  </div>
                  <div className="text-lg font-bold">
                    {stat.current.toFixed(1)}
                  </div>
                  <div
                    className={`text-xs ${stat.trend >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {stat.trend >= 0 ? "↑" : "↓"}{" "}
                    {Math.abs(stat.trend).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>

        {/* Data Points Info */}
        <div className="text-xs text-muted-foreground dark:text-white text-center mt-2">
          {formattedData.length} data points over{" "}
          {TIMEFRAME_OPTIONS.find(
            (t) => t.value === selectedTimeframe,
          )?.label.toLowerCase()}
        </div>
      </CardContent>
    </Card>
  );
};

export default MultiTimeframeTrendChart;
