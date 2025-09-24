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
import React, { useState } from "react";

import { useSettings } from "../../context/SettingsContext";
import { useUnits } from "../../context/UnitContext";
import { Card, CardContent,CardHeader } from "../ui/card";

const UnitVitals = ({ unit }) => {
  const { formatTemperature } = useSettings();
  const { updateUnitName, updateUnitLocation, updateUnitGPS } = useUnits();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isEditingGPS, setIsEditingGPS] = useState(false);
  const [editedName, setEditedName] = useState(unit.name || "");
  const [editedLocation, setEditedLocation] = useState(unit.location || "");
  const [editedGPS, setEditedGPS] = useState(
    unit.gpsCoordinates || "40.7128° N, 74.0060° W",
  );

  // Check if unit is offline/switched off or in maintenance
  const isOffline =
    unit.status === "offline" ||
    unit.status === "decommissioned" ||
    unit.status === "maintenance";

  const handleSaveName = async () => {
    try {
      await updateUnitName(unit.id, editedName);
      setIsEditingName(false);
    } catch (error) {
      console.error("Failed to update unit name:", error);
      // Reset to original value on error
      setEditedName(unit.name || "");
    }
  };

  const handleSaveLocation = async () => {
    try {
      await updateUnitLocation(unit.id, editedLocation);
      setIsEditingLocation(false);
    } catch (error) {
      console.error("Failed to update unit location:", error);
      // Reset to original value on error
      setEditedLocation(unit.location || "");
    }
  };

  const handleSaveGPS = async () => {
    try {
      await updateUnitGPS(unit.id, editedGPS);
      setIsEditingGPS(false);
    } catch (error) {
      console.error("Failed to update unit GPS:", error);
      // Reset to original value on error
      setEditedGPS(unit.gpsCoordinates || "40.7128° N, 74.0060° W");
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
    setEditedGPS(unit.gpsCoordinates || "40.7128° N, 74.0060° W");
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
                  {parseFloat(unit.currentPower).toFixed(1)} kW
                </p>
              </div>
            </div>

            {unit.watergeneration && (
              <div className="flex items-center space-x-3">
                <Droplets className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Water Level
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {unit.water_level} L
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
                  {formatTemperature(unit.temp_outside)}
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
                  {isOffline ? "N/A" : formatTemperature(unit.temp_in)}
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
                  {isOffline ? "N/A" : formatTemperature(unit.temp_out)}
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
                  {unit.humidity}%
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
                  {isOffline ? "N/A" : `${unit.pressure} kPa`}
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
                      style={{ width: `${unit.battery_level}%` }}
                    ></div>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {unit.battery_level}%
                  </p>
                </div>
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
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="text-sm font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 flex-1"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-1 text-green-600 hover:text-green-700"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
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
                      value={editedLocation}
                      onChange={(e) => setEditedLocation(e.target.value)}
                      className="text-sm font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 flex-1"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveLocation}
                      className="p-1 text-green-600 hover:text-green-700"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
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
                            value={editedGPS}
                            onChange={(e) => setEditedGPS(e.target.value)}
                            className="text-xs text-gray-500 dark:text-gray-500 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 flex-1"
                            placeholder="Enter GPS coordinates"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveGPS}
                            className="p-1 text-green-600 hover:text-green-700"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={handleCancelGPSEdit}
                            className="p-1 text-red-600 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 flex-1">
                          <p className="text-xs text-gray-500 dark:text-gray-500 flex-1">
                            GPS:{" "}
                            {unit.gpsCoordinates || "40.7128° N, 74.0060° W"}
                          </p>
                          <button
                            onClick={() => setIsEditingGPS(true)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            title="Edit GPS coordinates"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
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
