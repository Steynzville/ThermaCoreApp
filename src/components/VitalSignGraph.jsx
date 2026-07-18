import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

// Helper to format X-axis labels based on timeframe
export const formatXAxisLabel = (timestamp, timeframe) => {
  // FIXED: guard against null/undefined before hitting the Date constructor,
  // since new Date(null) coerces to epoch 0 and passes isNaN() unexpectedly.
  if (timestamp === null || timestamp === undefined) {
    return "";
  }

  const date = new Date(timestamp);

  // Check for invalid date (covers non-numeric/non-date strings, NaN, etc.)
  if (isNaN(date.getTime())) {
    return "";
  }

  switch (timeframe) {
    case "day":
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case "month":
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    case "year":
    case "3year":
    case "5year":
    case "10year":
    case "alltime":
      return date.toLocaleDateString([], { month: 'short', year: 'numeric' });
    default:
      return date.toLocaleString();
  }
};

// Get tick interval based on timeframe to avoid label crowding
export const getTickInterval = (timeframe) => {
  switch (timeframe) {
    case "day":
      return 2; // Every 2 hours
    case "month":
      return 3; // Every 3 days
    case "year":
      return 1; // Every month
    case "3year":
      return 2; // Every 2 months
    case "5year":
      return 3; // Every 3 months
    case "10year":
      return 6; // Every 6 months
    case "alltime":
      return 10; // Every 10 data points
    default:
      return 2;
  }
};

// EXPORTED: So tests can directly verify the switch behavior without UI interaction
export const generateMockData = (timeframe) => {
  const data = [];
  let points = 0;
  let interval = 0;

  switch (timeframe) {
    case "day":
      points = 24; // 24 hours
      interval = 60 * 60 * 1000; // 1 hour
      break;
    case "month":
      points = 30; // 30 days
      interval = 24 * 60 * 60 * 1000; // 1 day
      break;
    case "year":
      points = 12; // 12 months
      interval = 30 * 24 * 60 * 60 * 1000; // 1 month (approx)
      break;
    case "3year":
      points = 36; // 36 months
      interval = 30 * 24 * 60 * 60 * 1000; // 1 month (approx)
      break;
    case "5year":
      points = 60; // 60 months
      interval = 30 * 24 * 60 * 60 * 1000; // 1 month (approx)
      break;
    case "10year":
      points = 120; // 120 months
      interval = 30 * 24 * 60 * 60 * 1000; // 1 month (approx)
      break;
    case "alltime":
      points = 200; // More points for all time
      interval = 60 * 24 * 60 * 60 * 1000; // 2 months (approx)
      break;
    default:
      // Surface unexpected timeframes instead of silently falling back
      console.warn(`VitalSignGraph: Unknown timeframe "${timeframe}", falling back to "day"`);
      points = 24;
      interval = 60 * 60 * 1000;
  }

  const now = Date.now();
  for (let i = 0; i < points; i++) {
    const timestamp = now - (points - 1 - i) * interval;
    data.push({
      // Store the raw epoch timestamp (number), not a pre-formatted locale
      // string. Formatting happens at render time via formatXAxisLabel /
      // the tooltip's labelFormatter, so there's no lossy format-then-reparse
      // round trip (which previously broke under non-US locales / engines
      // whose Date constructor can't reliably parse toLocaleString() output).
      time: timestamp,
      power: parseFloat((Math.random() * 5 + 1).toFixed(2)),
      tempIn: parseFloat((Math.random() * 20 + 15).toFixed(2)),
      tempOut: parseFloat((Math.random() * 20 + 20).toFixed(2)),
      pressure: parseFloat((Math.random() * 5 + 10).toFixed(2)),
      waterLevel: parseFloat((Math.random() * 50 + 50).toFixed(2)),
    });
  }
  return data;
};

const VitalSignGraph = ({ title, dataKey, color }) => {
  const [timeframe, setTimeframe] = useState("day");
  const [data, setData] = useState([]);

  useEffect(() => {
    setData(generateMockData(timeframe));
  }, [timeframe]);

  return (
    <Card className="bg-white dark:bg-gray-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day View (Hourly)</SelectItem>
            <SelectItem value="month">Month View (Daily)</SelectItem>
            <SelectItem value="year">Year View (Monthly)</SelectItem>
            <SelectItem value="3year">3 Year View</SelectItem>
            <SelectItem value="5year">5 Year View</SelectItem>
            <SelectItem value="10year">10 Year View</SelectItem>
            <SelectItem value="alltime">All Time View</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e0e0e0"
                className="dark:stroke-gray-700"
              />
              {/*
                NOTE: this axis is left as the default "category" type (no
                `type="number"` prop), matching how `interval` and
                `tickFormatter` are designed to work against evenly-spaced
                categorical ticks. A `domain` prop was previously added here
                but Recharts only honors `domain` on a "number"-type axis, so
                it was a silent no-op — removed rather than left as dead,
                misleading config.
              */}
              <XAxis
                dataKey="time"
                stroke="#888888"
                className="dark:stroke-gray-400"
                tickFormatter={(value) => formatXAxisLabel(value, timeframe)}
                interval={getTickInterval(timeframe)}
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#888888" className="dark:stroke-gray-400" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card-background)",
                  borderColor: "var(--border-color)",
                }}
                labelStyle={{ color: "var(--text-color)" }}
                itemStyle={{ color: "var(--text-color)" }}
                labelFormatter={(value) => new Date(value).toLocaleString()}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default VitalSignGraph;
