import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle,
  Droplets,
  Maximize,
  Minimize,
  Monitor,
  Power,
  RotateCcw,
  Settings,
  Sliders,
  Wifi,
  WifiOff,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useInRouterContext } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import playSound from "../utils/audioPlayer";
import { useUnits } from "../context/UnitContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Switch } from "./ui/switch";

// Connection status pill component
const ConnectionPill = ({ isConnected }) =>
  isConnected ? (
    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
      <Wifi className="h-4 w-4" />
      <span className="text-sm font-medium">Gateway configured</span>
    </div>
  ) : (
    <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">Disconnected</span>
    </div>
  );

const RemoteUnit = ({ unit, navigate, className = "" }) => {
  const { settings } = useSettings();
  const { permissions } = useAuth();
  const { controlUnit, events = [], isDemoMode } = useUnits();
  const hasControlPermission = Boolean(permissions?.canControlUnits);
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [powerSetpoint, setPowerSetpoint] = useState(unit.powerSetpoint ?? 0);
  const [awgSetpoint, setAwgSetpoint] = useState(unit.waterSetpoint ?? 0);
  const machineOn = unit.machinePower ?? unit.status === "online";
  const waterProductionOn = Boolean(unit.waterProductionOn),
    autoSwitchEnabled = Boolean(unit.autoSwitchEnabled);
  const operationMode = unit.operationMode || "Custom";
  const isConnected =
    isDemoMode || Boolean(unit.controlCapabilities?.configured);
  const availableModes = isDemoMode
    ? ["Balanced", "Power Priority", "AWG Water Priority"]
    : unit.controlCapabilities?.operationModes || [];
  const availableCameras = (unit.cameras || []).filter((camera) =>
    /^https:\/\//.test(camera.url),
  );
  const [selectedCamera, setSelectedCamera] = useState(
    availableCameras[0]?.id || "",
  );
  const camera = availableCameras.find(
    (camera) => camera.id === selectedCamera,
  );
  const [videoFeedActive, setVideoFeedActive] = useState(false),
    [feedLoaded, setFeedLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false),
    [videoContainerRef, setVideoContainerRef] = useState(null);
  const [feedKey, setFeedKey] = useState(0);
  const isRefreshing = videoFeedActive && !feedLoaded;
  const actionHistory = events
    .filter((event) => event.unitId === unit.id && event.type === "control")
    .slice(0, 20);
  useEffect(() => {
    setPowerSetpoint(unit.powerSetpoint ?? 0);
    setAwgSetpoint(unit.waterSetpoint ?? 0);
  }, [unit.powerSetpoint, unit.waterSetpoint]);
  useEffect(() => {
    const changed = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  const submit = async (changes, sound) => {
    if (pending || !hasControlPermission) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await controlUnit(unit.id, changes);
      setMessage(
        isDemoMode
          ? "Demo state updated across the portfolio."
          : "Device gateway acknowledged the command. Telemetry updates separately.",
      );
      if (sound) playSound(sound, settings.soundEnabled, settings.volume);
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  };
  const handleMachineToggle = (checked) =>
    submit(
      { machinePower: checked },
      checked ? "power-on.mp3" : "power-off.mp3",
    );
  const handleWaterProductionToggle = (checked) =>
    submit(
      { waterProductionOn: checked },
      checked ? "water-on.mp3" : "water-off.mp3",
    );
  const handleAutoSwitchToggle = (checked) =>
    submit({ autoSwitchEnabled: checked }, "cool-tones.mp3");
  const handleModeSelect = (mode) => submit({ operationMode: mode });
  const handlePowerSetpointChange = (value) => setPowerSetpoint(value),
    handleAwgSetpointChange = (value) => setAwgSetpoint(value);
  const handleCameraChange = (id) => {
    setSelectedCamera(id);
    setFeedLoaded(false);
  };
  const toggleVideoFeed = () => {
    setFeedLoaded(false);
    setVideoFeedActive(!videoFeedActive);
  };
  const handleRefreshFeed = () => {
    setFeedLoaded(false);
    setFeedKey((key) => key + 1);
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await videoContainerRef?.requestFullscreen();
    } catch (error) {
      setError(`Fullscreen unavailable: ${error.message}`);
    }
  };
  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() =>
              navigate(`/unit-details/${encodeURIComponent(unit.id)}`)
            }
            className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Unit Details</span>
          </button>

          <div className="mb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Remote Control - {unit.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Unit ID: {unit.id} • {unit.location}
            </p>
          </div>

          <div className="flex items-center space-x-4 mt-4">
            <ConnectionPill isConnected={isConnected} />
            <div className="flex items-center space-x-2">
              {machineOn ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-500" />
              )}
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full ${
                  machineOn
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                }`}
              >
                {(machineOn ? "online" : "offline").toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <p className="mb-4 text-sm">
          {isDemoMode ? "Demonstration controls" : "Live device controls"} ·
          Measured telemetry status: {unit.status}
        </p>
        {pending && <p role="status">Awaiting device acknowledgement…</p>}
        {error && (
          <p role="alert" className="text-red-600 mb-4">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="mb-4">
            {message}
          </p>
        )}
        {/* Connection Warning */}
        {!isConnected && (
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Connection Lost
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Unable to communicate with the unit. Remote control
                    functions are disabled.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Remote Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Machine Control */}
          <Card className="bg-white dark:bg-gray-900">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Power className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Machine Control
                </h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Machine Power
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Turn the entire machine on or off
                  </p>
                </div>
                {hasControlPermission ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <div className="cursor-pointer">
                        <Switch
                          checked={machineOn}
                          onCheckedChange={() => {}}
                          disabled={
                            !isConnected || pending || !hasControlPermission
                          }
                          aria-label="Machine Power"
                        />
                      </div>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will {machineOn ? "turn off" : "turn on"}{" "}
                          the machine power. This could have significant impact
                          on unit operations.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            handleMachineToggle(!machineOn);
                          }}
                        >
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Switch
                    checked={machineOn}
                    disabled={true}
                    aria-label="Machine Power"
                  />
                )}
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 mb-2">
                  <div
                    className={`w-3 h-3 rounded-full ${machineOn ? "bg-green-500" : "bg-red-500"}`}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Status: {machineOn ? "Running" : "Stopped"}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {machineOn
                    ? "Power is enabled in the latest available control state."
                    : "Power is disabled in the latest available control state."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Water Production Control */}
          {unit.watergeneration && (
            <Card className="bg-white dark:bg-gray-900">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Droplets className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Water Production Control
                  </h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Water Production
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Enable or disable water production
                    </p>
                  </div>
                  {hasControlPermission ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <div className="cursor-pointer">
                          <Switch
                            checked={waterProductionOn}
                            onCheckedChange={() => {}}
                            disabled={
                              !isConnected ||
                              !machineOn ||
                              pending ||
                              !hasControlPermission
                            }
                            aria-label="Water Production"
                          />
                        </div>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Are you absolutely sure?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This action will{" "}
                            {waterProductionOn ? "disable" : "enable"} water
                            production. This could affect water levels.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              handleWaterProductionToggle(!waterProductionOn);
                            }}
                          >
                            Continue
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Switch
                      checked={waterProductionOn}
                      disabled={true}
                      aria-label="Water Production"
                    />
                  )}
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <div
                      className={`w-3 h-3 rounded-full ${waterProductionOn && machineOn ? "bg-blue-500" : "bg-gray-400"}`}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Status:{" "}
                      {waterProductionOn && machineOn ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Current water level:{" "}
                    {(unit?.awgWaterLevel ?? unit?.water_level) != null
                      ? `${unit.awgWaterLevel ?? unit.water_level} L`
                      : "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Thermal & AWG Production Setpoints */}
        <Card className="bg-white dark:bg-gray-900 mt-6">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Sliders className="h-5 w-5 text-indigo-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Thermal &amp; AWG Production Setpoints
              </h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Operation Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  disabled={
                    pending ||
                    !hasControlPermission ||
                    !machineOn ||
                    !availableModes.includes("Balanced")
                  }
                  onClick={() => handleModeSelect("Balanced")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                    operationMode === "Balanced"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  Balanced
                </button>
                <button
                  type="button"
                  disabled={
                    pending ||
                    !hasControlPermission ||
                    !machineOn ||
                    !availableModes.includes("Power Priority")
                  }
                  onClick={() => handleModeSelect("Power Priority")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                    operationMode === "Power Priority"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  Power Priority
                </button>
                <button
                  type="button"
                  disabled={
                    pending ||
                    !hasControlPermission ||
                    !machineOn ||
                    !availableModes.includes("AWG Water Priority")
                  }
                  onClick={() => handleModeSelect("AWG Water Priority")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                    operationMode === "AWG Water Priority"
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  AWG Water Priority
                </button>
              </div>
            </div>

            {/* Power Production Setpoint Slider */}
            <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Power Production Setpoint
                </label>
                <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                  {powerSetpoint} kW
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={
                  unit.controlCapabilities?.limits?.powerSetpoint ??
                  (isDemoMode ? 100 : 0)
                }
                step="0.1"
                value={powerSetpoint}
                onChange={(e) =>
                  handlePowerSetpointChange(Number(e.target.value))
                }
                disabled={!isConnected || pending || !hasControlPermission}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
              />
              <button
                type="button"
                disabled={
                  pending || !hasControlPermission || !isConnected || !machineOn
                }
                onClick={() => submit({ powerSetpoint: Number(powerSetpoint) })}
              >
                Apply power setpoint
              </button>
            </div>

            {/* AWG Water Production Setpoint Slider */}
            {unit.watergeneration && (
              <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    AWG Water Production Setpoint
                  </label>
                  <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                    {awgSetpoint} L/h
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={
                    unit.controlCapabilities?.limits?.waterSetpoint ??
                    (isDemoMode ? 10 : 0)
                  }
                  step="0.1"
                  value={awgSetpoint}
                  onChange={(e) =>
                    handleAwgSetpointChange(Number(e.target.value))
                  }
                  disabled={
                    !isConnected ||
                    !machineOn ||
                    pending ||
                    !hasControlPermission
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                />
                <button
                  type="button"
                  disabled={
                    pending ||
                    !hasControlPermission ||
                    !isConnected ||
                    !machineOn
                  }
                  onClick={() => submit({ waterSetpoint: Number(awgSetpoint) })}
                >
                  Apply water setpoint
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Automatic Control Settings */}
        {unit.watergeneration && (
          <Card className="bg-white dark:bg-gray-900 mt-6">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Settings className="h-5 w-5 text-purple-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Automatic Control Settings
                </h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Automatic Water Control
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enable the configured device water-level control policy
                  </p>
                </div>
                {hasControlPermission ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <div className="cursor-pointer">
                        <Switch
                          checked={autoSwitchEnabled}
                          onCheckedChange={() => {}}
                          disabled={
                            !isConnected ||
                            !machineOn ||
                            pending ||
                            !hasControlPermission
                          }
                          aria-label="Auto Switch"
                        />
                      </div>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will{" "}
                          {autoSwitchEnabled ? "disable" : "enable"} automatic
                          control. This could affect water levels if not
                          monitored.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            handleAutoSwitchToggle(!autoSwitchEnabled);
                          }}
                        >
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Switch
                    checked={autoSwitchEnabled}
                    disabled={true}
                    aria-label="Auto Switch"
                  />
                )}
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Current Level
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {(unit?.awgWaterLevel ?? unit?.water_level) != null
                        ? `${unit.awgWaterLevel ?? unit.water_level} L`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Trigger Level
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {unit.controlCapabilities?.waterTriggerPercent == null
                        ? "Gateway configured"
                        : `${unit.controlCapabilities.waterTriggerPercent}%`}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Auto Status
                    </p>
                    <p
                      className={`text-lg font-semibold ${autoSwitchEnabled ? "text-green-600 dark:text-green-400" : "text-gray-500"}`}
                    >
                      {autoSwitchEnabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Video Feed */}
        <Card className="bg-white dark:bg-gray-900 mt-6">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Camera className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Live Video Feed
              </h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Camera Selection
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose which camera to view
                </p>
              </div>
              <select
                value={selectedCamera}
                onChange={(e) => handleCameraChange(e.target.value)}
                className="w-full sm:w-auto min-w-0 sm:min-w-[200px] px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={!isConnected || pending || !hasControlPermission}
                data-testid="select-camera"
              >
                {availableCameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Video Feed Status
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {videoFeedActive
                      ? feedLoaded
                        ? "Live feed is active"
                        : "Connecting to camera…"
                      : "Click to start live feed"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleVideoFeed}
                  disabled={!camera}
                  className={`w-full sm:w-auto px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                    videoFeedActive
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  data-testid="button-video-feed-toggle"
                >
                  <Monitor className="h-4 w-4" />
                  <span>{videoFeedActive ? "Stop Feed" : "Start Feed"}</span>
                </button>
              </div>

              {/* Video Feed Display Area */}
              <div
                ref={setVideoContainerRef}
                className={`relative bg-gray-400 dark:bg-gray-800 rounded-lg aspect-video flex items-center justify-center border-2 border-dashed border-gray-400 dark:border-gray-600 overflow-hidden ${
                  isFullscreen ? "bg-black" : ""
                } ${isRefreshing ? "animate-pulse" : ""}`}
              >
                {videoFeedActive && camera ? (
                  <video
                    key={`${camera.id}:${feedKey}`}
                    src={camera.url}
                    controls
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full"
                    onLoadedData={() => setFeedLoaded(true)}
                    onError={() => {
                      setFeedLoaded(false);
                      setVideoFeedActive(false);
                      setError(
                        "Camera stream unavailable. Check the configured media gateway.",
                      );
                    }}
                  />
                ) : (
                  <div className="text-center">
                    <Camera className="h-12 w-12 mx-auto" />
                    <p>
                      {camera
                        ? "Video Feed Inactive"
                        : "No camera feed configured for this unit."}
                    </p>
                  </div>
                )}
                {videoFeedActive && (
                  <button
                    type="button"
                    className="absolute bottom-3 left-3 bg-white text-black rounded p-2"
                    onClick={handleRefreshFeed}
                  >
                    Refresh feed
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-gray-800/80 hover:bg-white/90 dark:hover:bg-gray-700/90 text-gray-700 dark:text-gray-200 rounded-lg transition-all duration-200 backdrop-blur-sm shadow-md border border-gray-200/50 dark:border-gray-600/50"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Camera Info */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Resolution
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {camera?.resolution || "Not reported"}
                  </p>
                </div>
                <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Frame Rate
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {camera?.fps ? `${camera.fps} FPS` : "Not reported"}
                  </p>
                </div>
                <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Connection
                  </p>
                  <p
                    className={`text-sm font-semibold ${isConnected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {isConnected ? "Gateway configured" : "Offline"}
                  </p>
                </div>
                <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Status
                  </p>
                  <p
                    className={`text-sm font-semibold ${videoFeedActive ? "text-purple-600 dark:text-purple-400" : "text-gray-500"}`}
                  >
                    {feedLoaded ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Control History */}
        <Card className="bg-white dark:bg-gray-900 mt-6">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recent Control Actions
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Last {actionHistory.length} actions recorded
            </p>
          </CardHeader>
          <CardContent>
            {actionHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No actions recorded yet</p>
                <p className="text-sm mt-1">
                  Actions will appear here when you use the controls above
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {actionHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.action || "Acknowledged control"}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {item.description}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-4 whitespace-nowrap">
                      {item.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function RemoteView({ suppliedUnit, requestedId, navigate = () => {} }) {
  const { units = [], getUnit, loading, error } = useUnits();
  const [selected, setSelected] = useState("");
  const unit = getUnit(suppliedUnit?.id ?? requestedId ?? selected);
  return (
    <>
      <div className="px-6 pt-4">
        {!suppliedUnit && !requestedId && (
          <label>
            Select unit{" "}
            <select
              aria-label="Select unit"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">Choose a unit…</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {loading && <p role="status">Loading units…</p>}
        {error && <p role="alert">{error}</p>}
      </div>
      {unit ? (
        <RemoteUnit key={unit.id} unit={unit} navigate={navigate} />
      ) : (
        <p className="p-6">Select a unit in your portfolio to view controls.</p>
      )}
    </>
  );
}
function RoutedRemote(props) {
  const location = useLocation(),
    navigate = useNavigate();
  return (
    <RemoteView
      suppliedUnit={props.unit}
      requestedId={
        new URLSearchParams(location.search).get("unit") ||
        location.state?.unit?.id
      }
      navigate={navigate}
    />
  );
}
export default function RemoteControl(props) {
  return useInRouterContext() ? (
    <RoutedRemote {...props} />
  ) : (
    <RemoteView suppliedUnit={props.unit} />
  );
}
