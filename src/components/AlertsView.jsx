import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Info,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useUnits } from "../context/UnitContext";
import { isAlarm, conditionType } from "../utils/conditions";
import PageHeader from "./PageHeader";
import { Card, CardContent } from "./ui/card";

const AlertsView = ({ className = "" }) => {
  const [alertFilter, setAlertFilter] = useState("all");
  const navigate = useNavigate();
  const [query] = useSearchParams();
  const { alerts: conditions = [], loading, error } = useUnits();
  const alerts = conditions
    .filter(
      (event) =>
        !isAlarm(event) &&
        (!query.get("unit") || String(event.unitId) === query.get("unit")),
    )
    .map((event) => ({
      ...event,
      type: conditionType(event),
      device: event.unitName,
      title: event.title || event.message,
    }));
  const handleAlertClick = (event) =>
    navigate(
      `/unit-details/${encodeURIComponent(event.unitId)}?tab=alerts&event=${encodeURIComponent(event.id)}`,
    );

  const getAlertIcon = (type) => {
    switch (type) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case "critical":
        return "border-l-red-500 bg-red-50 dark:bg-red-950/20";
      case "warning":
        return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
      case "info":
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20";
      case "success":
        return "border-l-green-500 bg-green-50 dark:bg-green-950/20";
      default:
        return "border-l-gray-500 bg-gray-50 dark:bg-gray-950/20";
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (alertFilter === "all") return true;
    return alert.type === alertFilter;
  });

  // Count alerts by type
  const criticalCount = alerts.filter((a) => a.type === "critical").length;
  const warningCount = alerts.filter((a) => a.type === "warning").length;
  const infoCount = alerts.filter((a) => a.type === "info").length;
  const resolvedCount = alerts.filter((a) => a.type === "success").length;

  return (
    <div
      className={`min-h-screen bg-gray-50 dark:bg-gray-900 p-3 lg:p-4 xl:p-6 ${className}`}
    >
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Alerts & Notifications"
          description="Manage system alerts and notifications"
        />

        {loading && <p role="status">Loading conditions…</p>}
        {error && <p role="alert">{error}</p>}
        {/* Alert Summary Cards - Optimized for laptop screens */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
          <Card
            className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 cursor-pointer hover:shadow-md transition-shadow card-hover"
            onClick={() => setAlertFilter("critical")}
          >
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Critical
                  </p>
                  <p className="text-2xl lg:text-3xl font-bold text-red-700 dark:text-red-300">
                    {criticalCount}
                  </p>
                </div>
                <AlertTriangle className="h-6 w-6 lg:h-8 lg:w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 cursor-pointer hover:shadow-md transition-shadow card-hover"
            onClick={() => setAlertFilter("warning")}
          >
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    Warning
                  </p>
                  <p className="text-2xl lg:text-3xl font-bold text-yellow-700 dark:text-yellow-300">
                    {warningCount}
                  </p>
                </div>
                <AlertCircle className="h-6 w-6 lg:h-8 lg:w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-md transition-shadow card-hover"
            onClick={() => setAlertFilter("info")}
          >
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Info
                  </p>
                  <p className="text-2xl lg:text-3xl font-bold text-blue-700 dark:text-blue-300">
                    {infoCount}
                  </p>
                </div>
                <Info className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 cursor-pointer hover:shadow-md transition-shadow card-hover"
            onClick={() => setAlertFilter("success")}
          >
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Resolved
                  </p>
                  <p className="text-2xl lg:text-3xl font-bold text-green-700 dark:text-green-300">
                    {resolvedCount}
                  </p>
                </div>
                <CheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100">
            Recent Alerts ({filteredAlerts.length})
          </h2>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              aria-label="Severity"
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Alerts</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="success">Resolved</option>
            </select>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-3 lg:space-y-4">
          {filteredAlerts.map((alert) => (
            <Card
              key={alert.id}
              id={`event-${alert.id}`}
              role="button"
              tabIndex={0}
              aria-current={
                query.get("event") === String(alert.id) ? "true" : undefined
              }
              style={{
                outline:
                  query.get("event") === String(alert.id)
                    ? "2px solid #2563eb"
                    : undefined,
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleAlertClick(alert);
                }
              }}
              className={`border-l-4 ${getAlertColor(alert.type)} cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => handleAlertClick(alert)}
            >
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 lg:space-x-4 flex-1">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm lg:text-base font-semibold text-gray-900 dark:text-gray-100">
                          {alert.title}
                        </h3>
                        <span className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 flex items-center">
                          <Clock className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
                          {alert.timestamp}
                        </span>
                      </div>
                      <p className="text-sm lg:text-base text-gray-600 dark:text-gray-300 mb-2">
                        {alert.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs lg:text-sm font-medium text-blue-600 dark:text-blue-400">
                          Device: {alert.device}
                        </span>
                        {alert.acknowledged && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 px-2 py-1 rounded-full">
                            Acknowledged
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredAlerts.length === 0 && (
          <Card className="text-center py-8 lg:py-12">
            <CardContent>
              <Info className="h-12 w-12 lg:h-16 lg:w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No alerts found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                There are no alerts matching your current filter.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AlertsView;
