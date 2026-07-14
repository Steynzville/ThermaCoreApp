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
  Wifi,
  WifiOff,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import playSound from "../utils/audioPlayer";
import { canControlUnits } from "../utils/permissions";
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
      <span className="text-sm font-medium">Connected</span>
    </div>
  ) : (
    <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">Disconnected</span>
    </div>
  );

// Helper function to format timestamp
const getCurrentTimestamp = () => {
  const now = new Date();
  return now.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

// Action type definitions
const ACTION_TYPES = {
  MACHINE_POWER_ON: 'Machine powered on',
  MACHINE_POWER_OFF: 'Machine powered off',
  WATER_PRODUCTION_ON: 'Water production enabled',
  WATER_PRODUCTION_OFF: 'Water production disabled',
  AUTO_SWITCH_ON: 'Auto switch enabled',
  AUTO_SWITCH_OFF: 'Auto switch disabled',
  VIDEO_FEED_START: 'Video feed started',
  VIDEO_FEED_STOP: 'Video feed stopped',
  CAMERA_CHANGED: 'Camera changed',
  REFRESH_FEED: 'Video feed refreshed',
};

const RemoteControl = ({ className, unit: propUnit, details: _details }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const { backendRole } = useAuth();

  // Check if user has permission to control units
  const hasControlPermission = canControlUnits(backendRole);

  // Get unit from props (when used as tab) or from location state (when used as standalone page)
  const unit = propUnit || location.state?.unit;

  // Remote control states
  const [machineOn, setMachineOn] = useState(unit?.status === "online");
  const [waterProductionOn, setWaterProductionOn] = useState(
    unit?.watergeneration && unit?.waterProductionOn,
  );
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(
    unit?.autoSwitchEnabled || false,
  );
  const [isConnected, setIsConnected] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState("cam1");
  const [videoFeedActive, setVideoFeedActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoContainerRef, setVideoContainerRef] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionHistory, setActionHistory] = useState([
    {
      id: 1,
      action: "Water production enabled",
      description: "Manual control via remote interface",
      timestamp: "2024-08-08 14:30:00",
    },
    {
      id: 2,
      action: "Machine powered on",
      description: "Manual control via remote interface",
      timestamp: "2024-08-08 14:25:00",
    },
    {
      id: 3,
      action: "Auto switch enabled",
      description: "Automatic control configuration updated",
      timestamp: "2024-08-08 09:15:00",
    },
  ]);

  // Use refs to track mounted state and timeout
  const isMountedRef = useRef(true);
  const refreshTimeoutRef = useRef(null);
  const actionIdCounter = useRef(4); // Start after initial items

  // Listen for fullscreen changes
  useEffect(() => {
    // Guard for SSR safety
    if (typeof document === "undefined") {
      return;
    }

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    // Guard webkit and ms prefixed events only when necessary
    if ("webkitFullscreenElement" in document) {
      document.addEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
    }
    if ("msFullscreenElement" in document) {
      document.addEventListener("msfullscreenchange", handleFullscreenChange);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if ("webkitFullscreenElement" in document) {
        document.removeEventListener(
          "webkitfullscreenchange",
          handleFullscreenChange,
        );
      }
      if ("msFullscreenElement" in document) {
        document.removeEventListener(
          "msfullscreenchange",
          handleFullscreenChange,
        );
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clear any pending refresh timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Simulate connection status changes (for demo/development)
  useEffect(() => {
    // This would normally be driven by WebSocket events
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        setIsConnected(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Helper function to add action to history - with debug line
  const addAction = (action, description = "Manual control via remote interface") => {
    const newAction = {
      id: actionIdCounter.current++,
      action,
      description,
      timestamp: getCurrentTimestamp(),
    };
    
    // DEBUG: Log when actions are added
    console.log("Added action:", action, "New length:", actionHistory.length + 1);
    
    // Use functional update to ensure we're working with the latest state
    setActionHistory(prev => {
      const updated = [newAction, ...prev];
      // Keep only last 10 actions
      const result = updated.slice(0, 10);
      console.log("Updated history:", result.map(a => a.action));
      return result;
    });
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
            onClick={() => (propUnit ? navigate("/grid-view") : navigate(-1))}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {propUnit ? "Return to Grid View" : "Back to Unit Details"}
          </button>
        </div>
      </div>
    );
  }

  const handleMachineToggle = (checked) => {
    setMachineOn(checked);

    // Play appropriate audio based on power state
    if (checked) {
      playSound("power-on.mp3", settings.soundEnabled, settings.volume);
      addAction(ACTION_TYPES.MACHINE_POWER_ON, "Machine turned on via remote interface");
    } else {
      playSound("power-off.mp3", settings.soundEnabled, settings.volume);
      addAction(ACTION_TYPES.MACHINE_POWER_OFF, "Machine turned off via remote interface");
    }

    // When machine control is toggled to "off", water production and automatic controls should both automatically toggle to "off"
    if (!checked) {
      setWaterProductionOn(false);
      setAutoSwitchEnabled(false);
      // Add cascade actions with a small delay to ensure they appear after the main action
      setTimeout(() => {
        addAction(ACTION_TYPES.WATER_PRODUCTION_OFF, "Cascaded off - machine power off");
        addAction(ACTION_TYPES.AUTO_SWITCH_OFF, "Cascaded off - machine power off");
      }, 50);
    }
  };

  const handleWaterProductionToggle = (checked) => {
    setWaterProductionOn(checked);

    // Play appropriate audio based on water state
    if (checked) {
      playSound("water-on.mp3", settings.soundEnabled, settings.volume);
      addAction(ACTION_TYPES.WATER_PRODUCTION_ON, "Water production enabled via remote interface");
    } else {
      playSound("water-off.mp3", settings.soundEnabled, settings.volume);
      addAction(ACTION_TYPES.WATER_PRODUCTION_OFF, "Water production disabled via remote interface");
    }

    // When machine control is toggled to "on" and water production is switched to "off", automatic control should automatically toggle to "off"
    if (machineOn && !checked) {
      setAutoSwitchEnabled(false);
      setTimeout(() => {
        addAction(ACTION_TYPES.AUTO_SWITCH_OFF, "Cascaded off - water production off");
      }, 50);
    }
  };

  const handleAutoSwitchToggle = (checked) => {
    setAutoSwitchEnabled(checked);
    playSound("cool-tones.mp3", settings.soundEnabled, settings.volume);
    
    if (checked) {
      addAction(ACTION_TYPES.AUTO_SWITCH_ON, "Auto switch enabled via remote interface");
    } else {
      addAction(ACTION_TYPES.AUTO_SWITCH_OFF, "Auto switch disabled via remote interface");
    }
  };

  const handleCameraChange = (cameraId) => {
    const cameraName = availableCameras.find(cam => cam.id === cameraId)?.name || cameraId;
    setSelectedCamera(cameraId);
    addAction(ACTION_TYPES.CAMERA_CHANGED, `Switched to ${cameraName}`);
  };

  const toggleVideoFeed = () => {
    const newVideoFeedState = !videoFeedActive;
    setVideoFeedActive(newVideoFeedState);

    // Play video-on.mp3 when stopping the video feed, video-off.mp3 when starting
    if (newVideoFeedState) {
      // Starting video feed - play video-off.mp3
      playSound("video-off.mp3", settings.soundEnabled, settings.volume);
      addAction(ACTION_TYPES.VIDEO_FEED_START, "Live video feed started");
    } else {
      // Stopping video feed - play video-on.mp3
      playSound("video-on.mp3", settings.soundEnabled, settings.volume);
      addAction(ACTION_TYPES.VIDEO_FEED_STOP, "Live video feed stopped");
    }
  };

  const handleRefreshFeed = () => {
    if (!videoFeedActive || !isConnected || isRefreshing) {
      return;
    }
    
    // Set refreshing state to trigger animation
    setIsRefreshing(true);
    
    // Record the action immediately
    addAction(ACTION_TYPES.REFRESH_FEED, "Video feed refreshed");
    
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Simulate refresh with a timeout (like fetching a new frame)
    refreshTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsRefreshing(false);
        refreshTimeoutRef.current = null;
      }
    }, 800);
    
    // In a real implementation, this would:
    // 1. Request a new frame from the camera
    // 2. Update the video stream
    // 3. The loading state would be shown during the fetch
  };

  const toggleFullscreen = async () => {
    // Guard for SSR safety
    if (typeof document === "undefined") {
      return;
    }

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (videoContainerRef) {
          if (videoContainerRef.requestFullscreen) {
            await videoContainerRef.requestFullscreen();
          } else if (videoContainerRef.webkitRequestFullscreen) {
            await videoContainerRef.webkitRequestFullscreen();
          } else if (videoContainerRef.msRequestFullscreen) {
            await videoContainerRef.msRequestFullscreen();
          }
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      }
    } catch (_error) {
      // Silent catch for fullscreen errors
    }
  };

  const availableCameras = [
    { id: "cam1", name: "Main Unit Camera", position: "" },
    { id: "cam2", name: "Alternate Cam 1", position: "" },
    { id: "cam3", name: "Alternate Cam 2", position: "" },
  ];

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
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

          {/* Status row placed neatly below the heading */}
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
                          onCheckedChange={() => {}} // This triggers the dialog via the AlertDialogTrigger
                          disabled={!isConnected}
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
                            // Toggle machine state when confirmed
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
                    ? "Machine is currently operational and running normally."
                    : "Machine is currently stopped and not operational."}
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
                            onCheckedChange={() => {}} // This triggers the dialog via the AlertDialogTrigger
                            disabled={!isConnected || !machineOn}
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
                              // Toggle water production state when confirmed
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
                    Current water level: {unit?.water_level} L
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

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
                    Auto Switch On (Water Level &lt; 75%)
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automatically turn on water production when tank level falls
                    below 75%
                  </p>
                </div>
                {hasControlPermission ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <div className="cursor-pointer">
                        <Switch
                          checked={autoSwitchEnabled}
                          onCheckedChange={() => {}} // This triggers the dialog via the AlertDialogTrigger
                          disabled={!isConnected || !machineOn}
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
                            // Toggle auto switch state when confirmed
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
                      {unit?.water_level} L
                    </p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Trigger Level
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      75%
                    </p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-gray-800 rounded-lg">
                    <p
                      className={`text-xs text-gray-600 dark:text-gray-400 mb-1`}
                    >
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
                disabled={!isConnected}
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
                      ? "Live feed is active"
                      : "Click to start live feed"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleVideoFeed}
                  disabled={!isConnected}
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
                {videoFeedActive && isConnected ? (
                  <div className="text-center">
                    {isRefreshing ? (
                      // Loading state during refresh
                      <>
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-3" />
                        <p className="text-white dark:text-purple-400 font-medium">
                          Refreshing feed...
                        </p>
                        <p className="text-sm text-white dark:text-gray-400 mt-1">
                          Fetching latest frame
                        </p>
                      </>
                    ) : (
                      // Normal active feed
                      <>
                        <div className="animate-pulse">
                          <Camera className="h-12 w-12 text-white dark:text-purple-400 mx-auto mb-2" />
                          <p className="text-white dark:text-purple-400 font-medium">
                            Live Feed Active
                          </p>
                          <p className="text-sm text-white dark:text-gray-400 mt-1">
                            {
                              availableCameras.find(
                                (cam) => cam.id === selectedCamera,
                              )?.name
                            }
                          </p>
                          {availableCameras.find((cam) => cam.id === selectedCamera)
                            ?.position && (
                            <p className="text-xs text-gray-200 dark:text-gray-500 mt-1">
                              {
                                availableCameras.find(
                                  (cam) => cam.id === selectedCamera,
                                )?.position
                              }
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleRefreshFeed}
                          disabled={isRefreshing}
                          className="mt-4 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors flex items-center space-x-1 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="button-refresh-feed"
                        >
                          <RotateCcw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                          <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-gray-700 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-700 dark:text-gray-500 font-medium">
                      {!isConnected ? "No Connection" : "Video Feed Inactive"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {!isConnected
                        ? "Unable to connect to cameras"
                        : "Click 'Start Feed' to begin"}
                    </p>
                  </div>
                )}

                {/* Fullscreen Toggle Button */}
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
                    1080p
                  </p>
                </div>
                <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Frame Rate
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    30 FPS
                  </p>
                </div>
                <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Connection
                  </p>
                  <p
                    className={`text-sm font-semibold ${isConnected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {isConnected ? "Connected" : "Offline"}
                  </p>
                </div>
                <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Status
                  </p>
                  <p
                    className={`text-sm font-semibold ${videoFeedActive ? "text-purple-600 dark:text-purple-400" : "text-gray-500"}`}
                  >
                    {videoFeedActive ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Control History - Now dynamic */}
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
                <p className="text-sm mt-1">Actions will appear here when you use the controls above</p>
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
                        {item.action}
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

export default RemoteControl;
