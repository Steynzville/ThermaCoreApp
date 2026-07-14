import {
  BatteryCharging,
  Calendar,
  Check,
  Cloud,
  Droplets,
  Edit2,
  Gauge,
  MapPin,
  Navigation,
  Power,
  ThermometerSnowflake,
  ThermometerSun,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useSettings } from "../../context/SettingsContext";
import { useUnits } from "../../context/UnitContext";
import { useRealtimeMetrics } from "../../hooks/useRealtimeData";
import { Card, CardContent, CardHeader } from "../ui/card";

// A single source of truth for "no GPS set yet" — avoids seeding the edit
// field (and the saved value, if the user hits Save without noticing) with
// a real-world New York coordinate.
const GPS_PLACEHOLDER = "Not set";

const UnitVitals = ({ unit }) => {
  const { formatTemperature } = useSettings();
  const { updateUnitName, updateUnitLocation, updateUnitGPS } = useUnits();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isEditingGPS, setIsEditingGPS] = useState(false);
  const [editedName, setEditedName] = useState(unit.name || "");
  const [editedLocation, setEditedLocation] = useState(unit.location || "");
  const [editedGPS, setEditedGPS] = useState(unit.gpsCoordinates || "");

  // Check if unit is offline/switched off or in maintenance
  const isOffline =
    unit.status === "offline" ||
    unit.status === "decommissioned" ||
    unit.status === "maintenance";

  // Real-time data hooks for live values
  const { metrics } = useRealtimeMetrics({ useMockData: true });
  const [liveUnit, setLiveUnit] = useState(unit);

  useEffect(() => {
    setLiveUnit(unit);
  }, [unit]);

  useEffect(() => {
    if (metrics && !isOffline) {
      setLiveUnit((prev) => {
        const tempBase = parseFloat(metrics.temperature?.current) || 70;
        const pressureBase = parseFloat(metrics.pressure?.current) || 100;
        const flowInBase = parseFloat(
          metrics.flow_rate_inlet?.current ||
            metrics.flowRateInlet?.current ||
            45.5,
        );
        const flowOutBase = parseFloat(
          metrics.flow_rate_outlet?.current ||
            metrics.flowRateOutlet?.current ||
            42.1,
        );

        const idOffset = (prev.id?.toString() || "").charCodeAt(0) || 0;

        return {
          ...prev,
          temp_in:
            prev.temp_in !== undefined
              ? +(tempBase * 0.4 + (idOffset % 5)).toFixed(1)
              : undefined,
          temp_out:
            prev.temp_out !== undefined
              ? +(tempBase * 0.1 + (idOffset % 3)).toFixed(1)
              : undefined,
          pressure:
            prev.pressure !== undefined
              ? +(pressureBase * 1.5 + (idOffset % 20)).toFixed(1)
              : undefined,
          flow_rate_inlet: +(flowInBase + (idOffset % 5) - 2.5).toFixed(1),
          flow_rate_outlet: +(flowOutBase + (idOffset % 3) - 1.5).toFixed(1),
        };
      });
    }
  }, [metrics, isOffline]);

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

  // Resolve inlet/outlet flow rate values once, using nullish coalescing so
  // a legitimate reading of 0 isn't mistaken for "missing" and replaced by
  // the mock defaults (the previous `||` / truthy checks did exactly that).
  const flowRateInlet =
    liveUnit.flow_rate_inlet ?? unit.flowRate ?? 45.5;
  const flowRateOutlet =
    liveUnit.flow_rate_outlet ??
    (unit.flowRate !== undefined && unit.flowRate !== null
      ? +(unit.flowRate * 0.95).toFixed(1)
      : 42.1);

  const handleSaveName = async () => {
    try {
      await updateUnitName(unit.id, editedName);
      setIsEditingName(false);
    } catch (_error) {
      // Reset to original value on error
      setEditedName(unit.name || "");
    }
  };

  const handleSaveLocation = async () => {
    try {
      await updateUnitLocation(unit.id, editedLocation);
      setIsEditingLocation(false);
    } catch (_error) {
      // Reset to original value on error
      setEditedLocation(unit.location || "");
    }
  };

  const handleSaveGPS = async () => {
    try {
      await updateUnitGPS(unit.id, editedGPS);
      setIsEditingGPS(false);
    } catch (_error) {
      // Reset to original value on error
      setEditedGPS(unit.gpsCoordinates || "");
    }
  };

  const handleCancelNameEdit = () => {
    setEditedName(unit.name || "");
    setIsEditingName(false);
  };

  const handleCancelLocationEdit = () => {
    setEditedLocation(unit.location || "");
    setIsEditingLocation(false);
  };

  const handleCancelGPSEdit = () => {
    setEditedGPS(unit.gpsCoordinates || "");
    setIsEditingGPS(false);
  };

  const handleOpenMaps = () => {
    if (window.confirm("Do you want to open Maps to select a GPS location?")) {
      // This would open the user's default maps application
      // On mobile devices, this typically opens the native Maps app
      // On desktop, it opens the default web browser with maps
      const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(unit.location || "Current Location")}`;
      window.open(mapsUrl, "_blank");
    }
  };

  return (
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

            <div className="flex items-center space-x-3">
              <Gauge className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pressure
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {isOffline
                    ? "N/A"
                    : `${liveUnit.pressure !== undefined ? liveUnit.pressure : unit.pressure} kPa`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <BatteryCharging className="h-5 w-5 text-green-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Battery Level
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
                <p className={`text-lg ${getFlowRateColor(flowRateInlet)}`}>
                  {isOffline ? "N/A" : `${flowRateInlet} L/min`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Droplets className="h-5 w-5 text-blue-500 animate-pulse" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Flow Rate Outlet
                </p>
                <p className={`text-lg ${getFlowRateColor(flowRateOutlet)}`}>
                  {isOffline ? "N/A" : `${flowRateOutlet} L/min`}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unit Information */}
      <Card className="bg-white dark:bg-gray-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Unit Information
            </h3>
          </div>
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
                  {unit.installDate}
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
                  {unit.lastMaintenance}
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
                      onChange={(e) => setEditedLocation(e.target.value)}
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
                        {unit.location}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsEditingLocation(true)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      {isEditingGPS ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <input
                            type="text"
                            value={editedGPS || ""}
                            onChange={(e) => setEditedGPS(e.target.value)}
                            className="text-xs text-gray-500 dark:text-gray-500 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 flex-1"
                            placeholder="Enter GPS coordinates"
                          />
                          <button
                            type="button"
                            onClick={handleSaveGPS}
                            className="p-1 text-green-600 hover:text-green-700"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelGPSEdit}
                            className="p-1 text-red-600 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 flex-1">
                          <p className="text-xs text-gray-500 dark:text-gray-500 flex-1">
                            GPS: {unit.gpsCoordinates || GPS_PLACEHOLDER}
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsEditingGPS(true)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            title="Edit GPS coordinates"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={handleOpenMaps}
                            className="p-1 text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Open Maps to select location"
                          >
                            <Navigation className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnitVitals;
