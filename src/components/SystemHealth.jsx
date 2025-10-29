import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Database,
  Globe,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { logger } from "../lib/logger";
import { checkAllStatus } from "../services/statusMonitor";
import { Card, CardContent, CardHeader } from "./ui/card";
import "./SystemHealth.css";

const iconMap = {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Server,
  Database,
  Globe,
  Cpu,
};

import PageHeader from "./PageHeader";

const COLORS = {
  Operational: "#28a745",
  "Degraded Performance": "#ffc107",
  Outage: "#dc3545",
};

const StatusIndicator = ({ status }) => (
  <span
    style={{
      height: "15px",
      width: "15px",
      backgroundColor: COLORS[status] || "#6c757d",
      borderRadius: "50%",
      display: "inline-block",
      marginRight: "10px",
    }}
  ></span>
);

const getStatusIcon = (status) => {
  switch (status) {
    case "Operational":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "Degraded Performance":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "Outage":
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <AlertTriangle className="h-5 w-5 text-gray-500" />;
  }
};

const SystemHealth = ({ className }) => {
  const [systemHealthData, setSystemHealthData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      setRefreshing(true);
      const statusData = await checkAllStatus();
      setSystemHealthData(statusData);
      setLastUpdated(new Date());
    } catch (error) {
      logger.error("Error fetching system status", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    fetchStatus();
  };

  const operationalCount = systemHealthData.filter(
    (service) => service.status === "Operational",
  ).length;
  const degradedCount = systemHealthData.filter(
    (service) => service.status === "Degraded Performance",
  ).length;
  const outageCount = systemHealthData.filter(
    (service) => service.status === "Outage",
  ).length;

  // Determine overall system status
  const getOverallStatus = () => {
    if (outageCount > 0) {
      return {
        status: "Outage",
        message: `${outageCount} service${outageCount > 1 ? "s" : ""} experiencing outages`,
        color: "red",
      };
    }
    if (degradedCount > 0) {
      return {
        status: "Degraded",
        message: `${degradedCount} service${degradedCount > 1 ? "s" : ""} experiencing degraded performance`,
        color: "yellow",
      };
    }
    return {
      status: "Operational",
      message: "All systems operational",
      color: "green",
    };
  };

  const overallStatus = getOverallStatus();

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}
    >
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="System Health Status"
          subtitle="Real-time monitoring of all infrastructure components"
        />

        {/* Overall Status Banner */}
        <div
          className={`mb-6 p-4 rounded-lg border ${
            overallStatus.color === "green"
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : overallStatus.color === "yellow"
                ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {overallStatus.color === "green" ? (
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : overallStatus.color === "yellow" ? (
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              )}
              <div>
                <h3
                  className={`font-semibold ${
                    overallStatus.color === "green"
                      ? "text-green-900 dark:text-green-100"
                      : overallStatus.color === "yellow"
                        ? "text-yellow-900 dark:text-yellow-100"
                        : "text-red-900 dark:text-red-100"
                  }`}
                >
                  {overallStatus.status}
                </h3>
                <p
                  className={`text-sm ${
                    overallStatus.color === "green"
                      ? "text-green-700 dark:text-green-300"
                      : overallStatus.color === "yellow"
                        ? "text-yellow-700 dark:text-yellow-300"
                        : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {overallStatus.message}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {lastUpdated && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                type="button"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Info Banner about data sources */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                Live Infrastructure Monitoring
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                This page shows real-time status of infrastructure components
                (frontend, backend, database, WebSocket). Status updates
                automatically every 30 seconds.
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Operational
                  </h3>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {operationalCount}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Degraded
                  </h3>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {degradedCount}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Outages
                  </h3>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {outageCount}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* System Health Table */}
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Service Status Overview
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current status of all infrastructure services
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">
                  Loading system status...
                </span>
              </div>
            ) : systemHealthData.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">
                  No service data available
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                        Service
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                        Provider
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                        Response Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemHealthData.map((service, index) => {
                      const IconComponent = iconMap[service.icon];
                      return (
                        <tr
                          key={service.name}
                          className={`border-b border-gray-100 dark:border-gray-800 ${index % 2 === 0 ? "bg-gray-50 dark:bg-gray-900/50" : ""}`}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                <IconComponent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {service.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-gray-900 dark:text-gray-100">
                              {service.provider}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              <StatusIndicator status={service.status} />
                              {getStatusIcon(service.status)}
                              <span
                                className={`font-medium ${
                                  service.status === "Operational"
                                    ? "text-green-600 dark:text-green-400"
                                    : service.status === "Degraded Performance"
                                      ? "text-yellow-600 dark:text-yellow-400"
                                      : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {service.status}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`font-mono text-sm ${
                                service.responseTime === "N/A"
                                  ? "text-gray-500 dark:text-gray-400"
                                  : parseInt(service.responseTime, 10) > 200
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-green-600 dark:text-green-400"
                              }`}
                            >
                              {service.responseTime}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Service Availability
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current monitoring session
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {systemHealthData.length > 0
                    ? Math.round(
                        (operationalCount / systemHealthData.length) * 100,
                      )
                    : 0}
                  %
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {operationalCount} of {systemHealthData.length} services
                  operational
                </p>
                <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${systemHealthData.length > 0 ? (operationalCount / systemHealthData.length) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Average Response Time
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Across all services
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {systemHealthData.length > 0
                    ? Math.round(
                        systemHealthData.reduce((sum, service) => {
                          const time = parseInt(service.responseTime, 10);
                          return sum + (isNaN(time) ? 0 : time);
                        }, 0) / systemHealthData.length,
                      )
                    : 0}
                  ms
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Current monitoring cycle
                </p>
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Real-time measurements
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
