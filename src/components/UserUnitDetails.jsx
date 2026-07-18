import {
  AlertTriangle,
  ArrowLeft,
  BarChart,
  BatteryCharging,
  Calendar,
  Check,
  CheckCircle,
  Cloud,
  Droplets,
  Edit2,
  Gauge,
  MapPin,
  Minus,
  Power,
  ThermometerSnowflake,
  ThermometerSun,
  TrendingDown,
  TrendingUp,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useUnits } from "../context/UnitContext";
import { useRealtimeMetrics } from "../hooks/useRealtimeData";
import { Card, CardContent, CardHeader } from "./ui/card";
import UnitAlertsTab from "./unit-details/UnitAlertsTab";
import VitalSignGraph from "./VitalSignGraph";

const UserUnitDetails = ({ className }) => {
  const { formatTemperature } = useSettings();
  const { updateUnitName, updateUnitLocation } = useUnits();
  const { userRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawUnit = location.state?.unit;
  
  // Memoize the unit object to prevent unnecessary re-renders
  const unit = useMemo(() => {
    if (!rawUnit) return null;
    return {
      ...rawUnit,
      batteryLife: rawUnit.batteryLife ?? 85,
      tankCapacity: rawUnit.tankCapacity ?? 800,
    };
  }, [rawUnit]);

  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editedName, setEditedName] = useState(unit?.name || "");
  const [editedLocation, setEditedLocation] = useState(unit?.location || "");

  // Check if unit is offline/switched off
  const isOffline =
    unit?.status === "offline" || unit?.status === "decommissioned";

  // Real-time data hooks for live values
  const { metrics } = useRealtimeMetrics({ useMockData: true });

  // ✅ FIXED: Use `??` instead of `||` to handle numeric 0 correctly
  // ✅ FIXED: Use `??` for all fallback values to preserve legitimate 0 readings
  const liveUnit = useMemo(() => {
    if (!unit) return {};

    const rawTemp = parseFloat(metrics?.temperature?.current);
    const tempBase = Number.isNaN(rawTemp) ? 70 : rawTemp;
    
    const rawPressure = parseFloat(metrics?.pressure?.current);
    const pressureBase = Number.isNaN(rawPressure) ? 100 : rawPressure;
    
    // ✅ FIX: Use ?? instead of || to preserve numeric 0
    const flowInBase = parseFloat(
      metrics?.flow_rate_inlet?.current ??
        metrics?.flowRateInlet?.current ??
        (unit.flowRate !== undefined && unit.flowRate !== null
          ? unit.flowRate
          : 45.5),
    );
    const flowOutBase = parseFloat(
      metrics?.flow_rate_outlet?.current ??
        metrics?.flowRateOutlet?.current ??
        (unit.flowRate !== undefined && unit.flowRate !== null
          ? unit.flowRate * 0.95
          : 42.1),
    );

    const idOffset = (unit.id?.toString() || "").charCodeAt(0) || 0;

    // Only calculate derived values if not offline
    if (isOffline) {
      return {
        ...unit,
        temp_in: undefined,
        temp_out: undefined,
        pressure: undefined,
        flow_rate_inlet: flowInBase,
        flow_rate_outlet: flowOutBase,
      };
    }

    return {
      ...unit,
      temp_in:
        unit.temp_in !== undefined
          ? +(tempBase * 0.4 + (idOffset % 5)).toFixed(1)
          : undefined,
      temp_out:
        unit.temp_out !== undefined
          ? +(tempBase * 0.1 + (idOffset % 3)).toFixed(1)
          : undefined,
      pressure:
        unit.pressure !== undefined
          ? +(pressureBase * 1.5 + (idOffset % 20)).toFixed(1)
          : undefined,
      flow_rate_inlet: +(flowInBase + (idOffset % 5) - 2.5).toFixed(1),
      flow_rate_outlet: +(flowOutBase + (idOffset % 3) - 1.5).toFixed(1),
    };
  }, [metrics, unit, isOffline]);

  // ✅ Helper to safely format pressure, consistent with temperature display
  const formatPressure = (value) => {
    if (value === undefined || value === null || isOffline) return "N/A";
    return `${value} kPa`;
  };

  const getFlowRateColor = (val) => {
    if (val === undefined || val === null || isOffline)
      return "text-gray-900 dark:text-gray-100";
    const num = parseFloat(val);
    if (Number.isNaN(num)) return "text-gray-900 dark:text-gray-100";
    if (num >= 90 || num < 10)
      return "text-red-600 dark:text-red-400 font-bold";
    if (num >= 70) return "text-yellow-600 dark:text-yellow-400 font-semibold";
    return "text-green-600 dark:text-green-400 font-medium";
  };

  const handleSaveName = async () => {
    if (unit) {
      try {
        await updateUnitName(unit.id, editedName);
        setIsEditingName(false);
      } catch (_error) {
        // Reset to original value on error
        setEditedName(unit.name || "");
      }
    }
  };

  const handleSaveLocation = async () => {
    if (unit) {
      try {
        await updateUnitLocation(unit.id, editedLocation);
        setIsEditingLocation(false);
      } catch (_error) {
        // Reset to original value on error
        setEditedLocation(unit.location || "");
      }
    }
  };

  const handleCancelNameEdit = () => {
    setEditedName(unit?.name || "");
    setIsEditingName(false);
  };

  const handleCancelLocationEdit = () => {
    setEditedLocation(unit?.location || "");
    setIsEditingLocation(false);
  };

  if (!unit) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Unit Not Found
          </h1>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Mock historical data for the unit
  const _historicalData = [
    {
      id: 1,
      timestamp: "2024-08-07 14:30",
      event: "Power output increased",
      value: `${unit.powerOutput} kW`,
      trend: "up",
      severity: "info",
    },
    {
      id: 2,
      timestamp: "2024-08-07 12:15",
      event: "Water level normal",
      value: `${unit.waterLevel}%`,
      trend: "stable",
      severity: "info",
    },
    {
      id: 3,
      timestamp: "2024-08-07 10:45",
      event: "Temperature stabilized",
      value: `${unit.temperature}°C`,
      trend: "stable",
      severity: "info",
    },
    {
      id: 4,
      timestamp: "2024-08-06 16:00",
      event: "Maintenance completed",
      value: "System restored",
      trend: "up",
      severity: "success",
    },
    {
      id: 5,
      timestamp: "2024-08-06 09:30",
      event: "Scheduled maintenance started",
      value: "System offline",
      trend: "down",
      severity: "warning",
    },
  ];

  const alertsHistory = [
    {
      id: 1,
      timestamp: "2024-08-05 14:45",
      type: "warning",
      title: "Low Water Level",
      message: "Water level dropped below 80%",
      resolved: true,
      resolvedAt: "2024-08-05 15:30",
    },
    {
      id: 2,
      timestamp: "2024-07-28 11:20",
      type: "info",
      title: "Maintenance Reminder",
      message: "Scheduled maintenance due in 7 days",
      resolved: true,
      resolvedAt: "2024-08-06 09:30",
    },
    {
      id: 3,
      timestamp: "2024-07-15 08:15",
      type: "critical",
      title: "High Temperature Alert",
      message: "Temperature exceeded safe operating limits",
      resolved: true,
      resolvedAt: "2024-07-15 09:45",
    },
  ];

  const _getTrendIcon = (trend) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const _getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "border-l-red-500 bg-red-50 dark:bg-red-900/20";
      case "warning":
        return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
      case "success":
        return "border-l-green-500 bg-green-50 dark:bg-green-900/20";
      default:
        return "border-l-blue-500 bg-blue-50 dark:bg-blue-900/20";
    }
  };

  const getAlertTypeColor = (type) => {
    switch (type) {
      case "critical":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "info":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusColor = (status) => {
    if (!status) return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    
    switch (status) {
      case "online":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "offline":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "decommissioned":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {unit.name} - Detailed View
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Serial Number:{" "}
                {unit.serialNumber || `${(unit.name || "UNIT").toUpperCase()}-001`} •{" "}
                {unit.location || "Unknown Location"}
              </p>
              <div className="flex items-center space-x-2 mb-4">
                {unit.status === "online" ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium px-3 py-1 rounded-full ${getStatusColor(unit.status)}`}
                >
                  {(unit.status || "UNKNOWN").toUpperCase()}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/remote-control", { state: { unit } })
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  data-testid="button-remote-control"
                >
                  {userRole === "admin" && <Zap className="h-4 w-4" />}
                  <span>Manage Remotely</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/unit-performance/${unit.id}`, {
                      state: { unit },
                    })
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  data-testid="button-unit-performance"
                >
                  {userRole === "admin" && <BarChart className="h-4 w-4" />}
                  <span>Unit Performance</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation - No Client Details for users */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: "overview", name: "Overview" },
                { id: "history", name: "History" },
                { id: "alerts", name: "Alerts" },
              ].map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-yellow-500 text-yellow-600 dark:text-yellow-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* NH3 Alarm Alert - Only show if unit has alarm */}
            {unit.hasAlarm && (
              <Card className="bg-red-600 border-red-700 animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Zap className="h-8 w-8 text-white animate-bounce" />
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        🚨 NH3 LEAK DETECTED 🚨
                      </h3>
                      <p className="text-red-100">
                        Critical alarm: Toxic ammonia leak detected in system.
                        Immediate attention required.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Status */}
              <Card className="bg-white dark:bg-gray-900">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Current Status
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Power className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Power Output
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {parseFloat(
                            liveUnit.currentPower ?? unit.currentPower,
                          ).toFixed(1)}{" "}
                          kW
                        </p>
                      </div>
                    </div>

                    {liveUnit.watergeneration && (
                      <div className="flex items-center space-x-3">
                        <Droplets className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Water Level
                          </p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {liveUnit.water_level ?? unit.water_level} L
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-3">
                      <Cloud className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Temp Outside
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {formatTemperature(
                            liveUnit.temp_outside ?? unit.temp_outside,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <ThermometerSnowflake className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Temp In
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {isOffline
                            ? "N/A"
                            : formatTemperature(
                                liveUnit.temp_in !== undefined
                                  ? liveUnit.temp_in
                                  : unit.temp_in,
                              )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <ThermometerSun className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Temp Out
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {isOffline
                            ? "N/A"
                            : formatTemperature(
                                liveUnit.temp_out !== undefined
                                  ? liveUnit.temp_out
                                  : unit.temp_out,
                              )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Droplets className="h-5 w-5 text-cyan-500" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Humidity
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {liveUnit.humidity ?? unit.humidity}%
                        </p>
                      </div>
                    </div>

                    {/* ✅ FIXED: Use formatPressure helper for consistency */}
                    <div className="flex items-center space-x-3">
                      <Gauge className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Pressure
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {isOffline
                            ? "N/A"
                            : formatPressure(
                                liveUnit.pressure !== undefined
                                  ? liveUnit.pressure
                                  : unit.pressure,
                              )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <BatteryCharging className="h-5 w-5 text-green-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Battery Life
                        </p>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 max-w-24 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div
                              className="bg-green-500 h-2.5 rounded-full"
                              style={{
                                width: `${liveUnit.battery_level ?? unit.battery_level}%`,
                              }}
                            ></div>
                          </div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {liveUnit.battery_level ?? unit.battery_level}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Droplets className="h-5 w-5 text-cyan-500 animate-pulse" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Flow Rate Inlet
                        </p>
                        <p
                          className={`text-lg ${getFlowRateColor(liveUnit.flow_rate_inlet)}`}
                        >
                          {isOffline
                            ? "N/A"
                            : `${liveUnit.flow_rate_inlet} L/min`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Droplets className="h-5 w-5 text-blue-500 animate-pulse" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Flow Rate Outlet
                        </p>
                        <p
                          className={`text-lg ${getFlowRateColor(liveUnit.flow_rate_outlet)}`}
                        >
                          {isOffline
                            ? "N/A"
                            : `${liveUnit.flow_rate_outlet} L/min`}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Unit Information */}
              <Card className="bg-white dark:bg-gray-900">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Unit Information
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {/* Machine Name */}
                    <div className="flex items-center space-x-3">
                      <Power className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Machine Name
                        </p>
                        {isEditingName ? (
                          <div className="flex items-center space-x-2 mt-1">
                            <input
                              type="text"
                              value={editedName || ""}
                              onChange={(e) => setEditedName(e.target.value)}
                              className="text-sm font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 flex-1"
                            />
                            <button
                              type="button"
                              onClick={handleSaveName}
                              className="p-1 text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelNameEdit}
                              className="p-1 text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {unit.name}
                            </p>
                            <button
                              type="button"
                              onClick={() => setIsEditingName(true)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Install Date
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {unit.installDate || "2024-01-15"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Wrench className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Last Maintenance
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {unit.lastMaintenance || "2024-07-10"}
                        </p>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Location
                        </p>
                        {isEditingLocation ? (
                          <div className="flex items-center space-x-2 mt-1">
                            <input
                              type="text"
                              value={editedLocation || ""}
                              onChange={(e) =>
                                setEditedLocation(e.target.value)
                              }
                              className="text-sm font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 flex-1"
                            />
                            <button
                              type="button"
                              onClick={handleSaveLocation}
                              className="p-1 text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelLocationEdit}
                              className="p-1 text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {unit.location || "Unknown Location"}
                              </p>
                              <button
                                type="button"
                                onClick={() => setIsEditingLocation(true)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              GPS: {unit.gpsCoordinates || "40.7128, -74.0060"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-6">
            <VitalSignGraph
              title="Power Output History"
              dataKey="power"
              color="#8884d8"
            />
            <VitalSignGraph
              title="Temperature In History"
              dataKey="tempIn"
              color="#82ca9d"
            />
            <VitalSignGraph
              title="Temperature Out History"
              dataKey="tempOut"
              color="#ffc658"
            />
            <VitalSignGraph
              title="Pressure History"
              dataKey="pressure"
              color="#ff7300"
            />
            {unit?.watergeneration && (
              <VitalSignGraph
                title="Water Level History"
                dataKey="waterLevel"
                color="#0088FE"
              />
            )}
          </div>
        )}

        {activeTab === "alerts" && (
          <UnitAlertsTab
            unit={unit}
            alertsHistory={alertsHistory}
            getAlertTypeColor={getAlertTypeColor}
          />
        )}
      </div>
    </div>
  );
};

export default UserUnitDetails;
