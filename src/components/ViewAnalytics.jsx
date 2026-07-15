import { Activity, BarChart3, TrendingUp, Zap } from "lucide-react";
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

import PageHeader from "./PageHeader";
import { Card, CardContent, CardHeader } from "./ui/card";

// ✅ FIX: Format revenue correctly with proper boundary handling
export const formatRevenue = (amount) => {
  // Round to nearest integer to handle floating point edge cases
  const roundedAmount = Math.round(amount);
  // Use 999500 as the threshold for displaying as millions
  // This catches values that should show as $1.00M (like 999500 → $1.00M)
  if (roundedAmount >= 999500) {
    return `$${(roundedAmount / 1000000).toFixed(2)}M`;
  }
  if (roundedAmount >= 1000) {
    return `$${(roundedAmount / 1000).toFixed(0)}K`;
  }
  return `$${roundedAmount}`;
};

// REALISTIC SALES DATA BASED ON ACTUAL 20 UNITS
const analyticsData = [
  {
    name: "Power-Box",
    sales: 8,
    revenue: 360000,
    avgPrice: 45000,
    fill: "#3B82F6",
  },
  {
    name: "Power-Plus",
    sales: 7,
    revenue: 4097688,
    avgPrice: 585384,
    fill: "#10B981",
  },
  {
    name: "Titan",
    sales: 5,
    revenue: 7317300,
    avgPrice: 1463460,
    fill: "#F59E0B",
  },
];

// Update summary metrics
const summaryData = {
  totalSales: 20,
  totalRevenue: 11774988,
  activeUnits: 17,
  avgGrowth: "+8.5%",
};

// Update category distribution
const categoryData = [
  { name: "Power-Box", value: 8 },
  { name: "Power-Plus", value: 7 },
  { name: "Titan", value: 5 },
];

// Update monthly trend to show realistic growth
const monthlyTrend = [
  { month: "Jan", units: 3, revenue: 1766248 },
  { month: "Feb", units: 5, revenue: 2943746 },
  { month: "Mar", units: 8, revenue: 4709994 },
  { month: "Apr", units: 12, revenue: 7064991 },
  { month: "May", units: 16, revenue: 9419988 },
  { month: "Jun", units: 20, revenue: 11774988 },
];

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="currentColor"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize="10"
      fontWeight="bold"
      className="text-gray-900 dark:text-white"
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ✅ FIX: Add default className to prevent "undefined" in DOM
const ViewAnalytics = ({ className = "" }) => {
  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}
    >
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Sales Analytics"
          subtitle="Detailed performance metrics and trends"
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Units
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {summaryData.totalSales}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Revenue
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatRevenue(summaryData.totalRevenue)}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Units
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {summaryData.activeUnits}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Avg Growth
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {summaryData.avgGrowth}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Growth Trend Chart */}
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Monthly Growth Trend
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cumulative units sold and revenue over time
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-200 dark:stroke-gray-700"
                  />
                  <XAxis
                    dataKey="month"
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <YAxis className="text-gray-600 dark:text-gray-400" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    formatter={(value, name) => {
                      if (name === "revenue") {
                        return [formatRevenue(value), "Revenue"];
                      }
                      return [value, "Units"];
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="units"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                    name="Units"
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#82ca9d"
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Vehicle Categories Bar Chart */}
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Product Categories
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Distribution by product category
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-200 dark:stroke-gray-700"
                  />
                  <XAxis
                    dataKey="name"
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <YAxis className="text-gray-600 dark:text-gray-400" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue by Product Bar Chart */}
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Revenue by Product Line
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total revenue breakdown by product category
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-200 dark:stroke-gray-700"
                  />
                  <XAxis
                    dataKey="name"
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <YAxis className="text-gray-600 dark:text-gray-400" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => formatRevenue(value)}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Average Price by Product */}
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Average Price by Product Line
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Average unit price for each product category
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-200 dark:stroke-gray-700"
                  />
                  <XAxis
                    dataKey="name"
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <YAxis className="text-gray-600 dark:text-gray-400" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => formatRevenue(value)}
                  />
                  <Legend />
                  <Bar dataKey="avgPrice" name="Avg Price" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Pie Chart Section */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Product Category Distribution
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pie chart showing product category distribution
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={entry.name || `cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#E0E0E0",
                    color: "#000000",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewAnalytics;
