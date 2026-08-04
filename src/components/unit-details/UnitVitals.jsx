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

  const isOffline =
    unit.status === "offline" ||
    unit.status === "decommissioned" ||
    unit.status === "maintenance";

  const { metrics } = useRealtimeMetrics({ useMockData: true });
  const [liveUnit, setLiveUnit] = useState(unit);

  useEffect(() => {
    setLiveUnit(unit);
  }, [unit]);

  useEffect(() => {
    if (metrics && !isOffline) {
      setLiveUnit((prev) => {
        const rawTemp = parseFloat(metrics.temperature?.current);
        const tempBase = Number.isNaN(rawTemp) ? 70 : rawTemp;

        const rawPressure = parseFloat(metrics.pressure?.current);
        const pressureBase = Number.isNaN(rawPressure) ? 100 : rawPressure;

        const flowInBase = parseFloat(
          metrics.flow_rate_inlet?.current ??
            metrics.flowRateInlet?.current ??
            45.5,
        );
        const flowOutBase = parseFloat(
          metrics.flow_rate_outlet?.current ??
            metrics.flowRateOutlet?.current ??
            42.1,
        );

        const idOffset = (prev.id?.toString() || "").charCodeAt(0) || 0;

        return {
          ...prev,
          tempIn:
            prev.tempIn !== undefined || prev.temp_in !== undefined
              ? +(tempBase * 0.3 + 10 + (idOffset % 5)).toFixed(1)
              : undefined,
          tempOutChill:
            prev.tempOutChill !== undefined || prev.temp_out !== undefined
              ? +(tempBase * 0.15 + 5 + (idOffset % 4)).toFixed(1)
              : undefined,
          tempOutHot:
            prev.tempOutHot !== undefined
              ? +(tempBase * 0.2 + 30 + (idOffset % 6)).toFixed(1)
              : undefined,
          differentialPressure:
            prev.differentialPressure !== undefined
              ? +((pressureBase / 25) + 1 + (idOffset % 3)).toFixed(1)
              : prev.pressure !== undefined
              ? +(pressureBase * 1.5 + (idOffset % 20)).toFixed(1)
              : undefined,
          flowRateOutChill: +(flowInBase + (idOffset % 5) - 2.5).toFixed(1),
          flowRateOutHot: +(flowOutBase + (idOffset % 3) - 1.5).toFixed(1),
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

  // Values resolution
  const ambientTemp = liveUnit.ambientTemp ?? unit.ambientTemp ?? liveUnit.temp_outside ?? unit.temp_outside;
  const ambientHumidity = liveUnit.ambientHumidity ?? unit.ambientHumidity ?? liveUnit.humidity ?? unit.humidity;
  const tempIn = liveUnit.tempIn ?? unit.tempIn ?? liveUnit.temp_in ?? unit.temp_in;
  const tempOutChill = liveUnit.tempOutChill ?? unit.tempOutChill ?? liveUnit.temp_out ?? unit.temp_out;
  const tempOutHot = liveUnit.tempOutHot ?? unit.tempOutHot;
  const awgWaterLevel = liveUnit.awgWaterLevel ?? unit.awgWaterLevel ?? liveUnit.water_level ?? unit.water_level;
  const diffPressure = liveUnit.differentialPressure ?? unit.differentialPressure ?? liveUnit.pressure ?? unit.pressure;
  const batteryVal = liveUnit.batteryVoltage ?? unit.batteryVoltage ?? liveUnit.battery_level ?? unit.battery_level;

  const flowRateOutChill =
    liveUnit.flowRateOutChill ??
    unit.flowRateOutChill ??
    liveUnit.flow_rate_inlet ??
    unit.flowRate ??
    42.5;

  const flowRateOutHot =
    liveUnit.flowRateOutHot ??
    unit.flowRateOutHot ??
    liveUnit.flow_rate_outlet ??
    (unit.flowRate !== undefined && unit.flowRate !== null
      ? +(unit.flowRate * 0.95).toFixed(1)
      : 35.2);

  const handleSaveName = async () => {
    try {
      await updateUnitName(unit.id, editedName);
      setIsEditingName(false);
    } catch (_error) {
      setEditedName(unit.name || "");
    }
  };

  const handleSaveLocation = async () => {
    try {
      await updateUnitLocation(unit.id, editedLocation);
      setIsEditingLocation(false);
    } catch (_error) {
      setEditedLocation(unit.location || "");
    }
  };

  const handleSaveGPS = async () => {
    try {
      await updateUnitGPS(unit.id, editedGPS);
      setIsEditingGPS(false);
    } catch (_error) {
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
      const mapsUrl = `https://maps.google.com/maps?q=${encodeURIComponent(unit.location || "Current Location")}`;
      window.open(mapsUrl, "_blank");
    }
  };

  const formatDiffPressure = (val) => {
    if (val === undefined || val === null) return "N/A";
    const num = parseFloat(val);
    if (Number.isNaN(num)) return "N/A";
    return num <= 20 ? `${num} bar` : `${num} kPa`;
  };

  const formatBattery = (val) => {
    if (val === undefined || val === null) return "N/A";
    const num = parseFloat(val);
    if (Number.isNaN(num)) return "N/A";
    return num > 30 ? `${num}%` : `${num}V`;
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
            {/* Power Output */}
            <div className="flex items-center space-x-3">
              <Power className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Power Output
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {parseFloat(
                    liveUnit.currentPower ?? unit.currentPower ?? 0,
                  ).toFixed(1)}{" "}
                  kW
                </p>
              </div>
            </div>

            {/* AWG Water Level */}
            {liveUnit.watergeneration && (
              <div className="flex items-center space-x-3">
                <Droplets className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    AWG Water Level
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {awgWaterLevel !== undefined ? `${awgWaterLevel} L` : "N/A"}
                  </p>
                </div>
              </div>
            )}

            {/* Ambient Temp */}
            <div className="flex items-center space-x-3">
              <Cloud className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ambient Temp
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {ambientTemp !== undefined ? formatTemperature(ambientTemp) : "N/A"}
                </p>
              </div>
            </div>

            {/* Ambient Humidity */}
            <div className="flex items-center space-x-3">
              <Droplets className="h-5 w-5 text-cyan-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ambient Humidity
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {ambientHumidity !== undefined ? `${ambientHumidity}%` : "N/A"}
                </p>
              </div>
            </div>

            {/* Temp In */}
            <div className="flex items-center space-x-3">
              <ThermometerSnowflake className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Temp In
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {isOffline || tempIn === undefined
                    ? "N/A"
                    : formatTemperature(tempIn)}
                </p>
              </div>
            </div>

            {/* Temp Out - Chill */}
            <div className="flex items-center space-x-3">
              <ThermometerSnowflake className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Temp Out - Chill
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {isOffline || tempOutChill === undefined
                    ? "N/A"
                    : formatTemperature(tempOutChill)}
                </p>
              </div>
            </div>

            {/* Temp Out - Hot */}
            <div className="flex items-center space-x-3">
              <ThermometerSun className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Temp Out - Hot
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {isOffline || tempOutHot === undefined
                    ? "N/A"
                    : formatTemperature(tempOutHot)}
                </p>
              </div>
            </div>

            {/* Differential Pressure */}
            <div className="flex items-center space-x-3">
              <Gauge className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Differential Pressure
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {isOffline ? "N/A" : formatDiffPressure(diffPressure)}
                </p>
              </div>
            </div>

            {/* Battery */}
            <div className="flex items-center space-x-3">
              <BatteryCharging className="h-5 w-5 text-green-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Battery
                </p>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 max-w-24 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div
                      className="bg-green-500 h-2.5 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, parseFloat(batteryVal) || 0))}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {formatBattery(batteryVal)}
                  </p>
                </div>
              </div>
            </div>

            {/* Flow Rate Out - Chill */}
            <div className="flex items-center space-x-3">
              <Droplets className="h-5 w-5 text-cyan-500 animate-pulse" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Flow Rate Out - Chill
                </p>
                <p className={`text-lg ${getFlowRateColor(flowRateOutChill)}`}>
                  {isOffline ? "N/A" : `${flowRateOutChill} L/min`}
                </p>
              </div>
            </div>

            {/* Flow Rate Out - Hot */}
            <div className="flex items-center space-x-3">
              <Droplets className="h-5 w-5 text-blue-500 animate-pulse" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Flow Rate Out - Hot
                </p>
                <p className={`text-lg ${getFlowRateColor(flowRateOutHot)}`}>
                  {isOffline ? "N/A" : `${flowRateOutHot} L/min`}
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
