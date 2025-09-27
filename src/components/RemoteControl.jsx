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
  Zap,
} from "lucide-react";
import React, { useEffect,useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { useRemoteControl } from "../hooks/useRemoteControl";
import playSound from "../utils/audioPlayer";
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
import { Card, CardContent,CardHeader } from "./ui/card";
import { Switch } from "./ui/switch";

const RemoteControl = ({ className, unit: propUnit, details }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const { isAuthenticated, userRole } = useAuth();

  // Get unit from props (when used as tab) or from location state (when used as standalone page)
  const unit = propUnit || location.state?.unit;
  
  // Remote control permissions and operations
  const { 
    permissions, 
    isLoading: remoteControlLoading, 
    error: remoteControlError,
    controlPower,
    controlWaterProduction
  } = useRemoteControl(unit?.id);

  // Remote control states
  const [machineOn, setMachineOn] = useState(unit?.status === "online");
  const [waterProductionOn, setWaterProductionOn] = useState(
    unit?.watergeneration && unit?.waterProductionOn,
  );
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(
    unit?.autoSwitchEnabled,
  );
  const [isConnected, setIsConnected] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState("cam1");
  const [videoFeedActive, setVideoFeedActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoContainerRef, setVideoContainerRef] = useState(null);
  
  // Remote control operation states
  const [powerControlLoading, setPowerControlLoading] = useState(false);
  const [waterControlLoading, setWaterControlLoading] = useState(false);

  // Listen for fullscreen changes (moved before early return to avoid conditional hook call)
  React.useEffect(() => {
    // Guard for SSR safety
    if (typeof document === 'undefined') {
      return;
    }

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || 
                                       document.webkitFullscreenElement || 
                                       document.msFullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    // Guard webkit and ms prefixed events only when necessary
    if ('webkitFullscreenElement' in document) {
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    }
    if ('msFullscreenElement' in document) {
      document.addEventListener('msfullscreenchange', handleFullscreenChange);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if ('webkitFullscreenElement' in document) {
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      }
      if ('msFullscreenElement' in document) {
        document.removeEventListener('msfullscreenchange', handleFullscreenChange);
      }
    };
  }, []);

  if (!unit) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Unit Not Found
          </h1>
          <button
            onClick={() => (propUnit ? navigate("/grid-view") : navigate(-1))}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {propUnit ? "Return to Grid View" : "Back to Unit Details"}
          </button>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please log in to access remote control features.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Check if permissions are loaded and if user has remote control access
  if (permissions && !permissions.has_remote_control) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Your role ({permissions.role}) does not have remote control permissions.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Only Admin and Operator roles can remotely control units.
          </p>
          <button
            onClick={() => (propUnit ? navigate("/grid-view") : navigate(-1))}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {propUnit ? "Return to Grid View" : "Back to Unit Details"}
          </button>
        </div>
      </div>
    );
  }

  const handleMachineToggle = async (checked) => {
    // Check permissions
    if (!permissions?.has_remote_control) {
      console.warn('User does not have remote control permissions');
      return;
    }

    setPowerControlLoading(true);
    
    try {
      // Call remote control API
      await controlPower(checked);
      
      // Update local state only after successful remote operation
      setMachineOn(checked);

      // Play appropriate audio based on power state
      if (checked) {
        playSound("power-on.mp3", settings.soundEnabled, settings.volume);
      } else {
        playSound("power-off.mp3", settings.soundEnabled, settings.volume);
      }

      // Update unit status based on power state
      if (unit) {
        unit.status = checked ? "online" : "offline";
      }

      // When machine control is toggled to "off", water production and automatic controls should both automatically toggle to "off"
      if (!checked) {
        setWaterProductionOn(false);
        setAutoSwitchEnabled(false);
      }
      
      console.log(
        `Machine ${checked ? "turned on" : "turned off"} for unit ${unit.name}`,
      );
    } catch (error) {
      console.error('Failed to control machine power:', error);
      // Optionally show error message to user
    } finally {
      setPowerControlLoading(false);
    }
  };

  const handleWaterProductionToggle = async (checked) => {
    // Check permissions
    if (!permissions?.has_remote_control) {
      console.warn('User does not have remote control permissions');
      return;
    }

    // Can't enable water production if machine is off
    if (checked && !machineOn) {
      console.warn('Cannot enable water production when machine is offline');
      return;
    }

    setWaterControlLoading(true);
    
    try {
      // Call remote control API
      await controlWaterProduction(checked);
      
      // Update local state only after successful remote operation
      setWaterProductionOn(checked);
    
      // Play appropriate audio based on water state
      if (checked) {
        playSound("water-on.mp3", settings.soundEnabled, settings.volume);
      } else {
        playSound("water-off.mp3", settings.soundEnabled, settings.volume);
      }
    
      // When machine control is toggled to "on" and water production is switched to "off", automatic control should automatically toggle to "off"
      if (machineOn && !checked) {
        setAutoSwitchEnabled(false);
      }
      
      console.log(
        `Water production ${checked ? "enabled" : "disabled"} for unit ${unit.name}`,
      );
    } catch (error) {
      console.error('Failed to control water production:', error);
      // Optionally show error message to user
    } finally {
      setWaterControlLoading(false);
    }
  };

  const handleAutoSwitchToggle = (checked) => {
    setAutoSwitchEnabled(checked);
    playSound("cool-tones.mp3", settings.soundEnabled, settings.volume);
    console.log(
      `Auto switch ${checked ? "enabled" : "disabled"} for unit ${unit.name}`,
    );
  };

  const handleCameraChange = (cameraId) => {
    setSelectedCamera(cameraId);
    console.log(`Camera switched to ${cameraId} for unit ${unit.name}`);
  };

  const toggleVideoFeed = () => {
    const newVideoFeedState = !videoFeedActive;
    setVideoFeedActive(newVideoFeedState);
    
    // Play video-on.mp3 when stopping the video feed, video-off.mp3 when starting
    if (newVideoFeedState) {
      // Starting video feed - play video-off.mp3
      playSound("video-off.mp3", settings.soundEnabled, settings.volume);
    } else {
      // Stopping video feed - play video-on.mp3
      playSound("video-on.mp3", settings.soundEnabled, settings.volume);
    }
    
    console.log(`Video feed ${newVideoFeedState ? "enabled" : "disabled"} for unit ${unit.name}`);
  };

  const toggleFullscreen = async () => {
    // Guard for SSR safety
    if (typeof document === 'undefined') {
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
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const availableCameras = [
    { id: "cam1", name: "Main Unit Camera", position: "" },
    { id: "cam2", name: "Alternate Cam 1", position: "" },
    { id: "cam3", name: "Alternate Cam 2", position: "" },
  ];

  const ConnectionPill = () =>
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

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
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
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-4">
              <ConnectionPill />
              <div className="flex items-center space-x-2">
                {unit.status === "online" ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium px-3 py-1 rounded-full ${unit.status === "online" ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"}`}
                >
                  {unit.status.toUpperCase()}
                </span>
              </div>
            </div>
            
            {/* Permission indicator */}
            {permissions && (
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${permissions.has_remote_control ? 'bg-green-500' : 'bg-orange-500'}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {permissions.role.charAt(0).toUpperCase() + permissions.role.slice(1)} • 
                  {permissions.has_remote_control ? ' Remote Control' : ' View Only'}
                </span>
              </div>
            )}
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
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <div className={`${powerControlLoading ? 'opacity-50' : 'cursor-pointer'}`}>
                      <Switch 
                        checked={machineOn} 
                        onCheckedChange={() => {}} 
                        disabled={powerControlLoading || !permissions?.has_remote_control}
                      />
                      {powerControlLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action will {machineOn ? "turn off" : "turn on"}{" "}
                        the machine power. This could have significant impact on
                        unit operations.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleMachineToggle(!machineOn)}
                      >
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <div className={`${waterControlLoading ? 'opacity-50' : 'cursor-pointer'} relative`}>
                        <Switch
                          checked={waterProductionOn}
                          onCheckedChange={() => {}}
                          disabled={waterControlLoading || !isConnected || !machineOn || !permissions?.has_remote_control}
                        />
                        {waterControlLoading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
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
                          onClick={() =>
                            handleWaterProductionToggle(!waterProductionOn)
                          }
                        >
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <div className="cursor-pointer">
                      <Switch
                        checked={autoSwitchEnabled}
                        onCheckedChange={() => {}}
                        disabled={!isConnected || !machineOn || !permissions?.has_remote_control}
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
                        onClick={() =>
                          handleAutoSwitchToggle(!autoSwitchEnabled)
                        }
                      >
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
                    {videoFeedActive ? "Live feed is active" : "Click to start live feed"}
                  </p>
                </div>
                <button
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
                className={`relative bg-gray-400 dark:bg-gray-800 rounded-lg aspect-video flex items-center justify-center border-2 border-dashed border-gray-400 dark:border-gray-600 ${
                  isFullscreen ? 'bg-black' : ''
                }`}
              >
                {videoFeedActive && isConnected ? (
                  <div className="text-center">
                    <div className="animate-pulse">
                      <Camera className="h-12 w-12 text-white dark:text-purple-400 mx-auto mb-2" />
                      <p className="text-white dark:text-purple-400 font-medium">
                        Live Feed Active
                      </p>
                      <p className="text-sm text-white dark:text-gray-400 mt-1">
                        {availableCameras.find(cam => cam.id === selectedCamera)?.name}
                      </p>
                      {availableCameras.find(cam => cam.id === selectedCamera)?.position && (
                        <p className="text-xs text-gray-200 dark:text-gray-500 mt-1">
                          {availableCameras.find(cam => cam.id === selectedCamera)?.position}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        // Refresh/reconnect logic would go here
                        console.log("Refreshing video feed");
                      }}
                      className="mt-4 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors flex items-center space-x-1 mx-auto"
                      data-testid="button-refresh-feed"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Refresh</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-gray-700 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-700 dark:text-gray-500 font-medium">
                      {!isConnected ? "No Connection" : "Video Feed Inactive"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {!isConnected ? "Unable to connect to cameras" : "Click 'Start Feed' to begin"}
                    </p>
                  </div>
                )}
                
                {/* Fullscreen Toggle Button */}
                <button
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
                  <p className={`text-sm font-semibold ${isConnected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {isConnected ? "Connected" : "Offline"}
                  </p>
                </div>
                <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Status
                  </p>
                  <p className={`text-sm font-semibold ${videoFeedActive ? "text-purple-600 dark:text-purple-400" : "text-gray-500"}`}>
                    {videoFeedActive ? "Active" : "Inactive"}
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
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Water production enabled
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Manual control via remote interface
                  </p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  2024-08-08 14:30
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Machine powered on
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Manual control via remote interface
                  </p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  2024-08-08 14:25
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Auto switch enabled
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Automatic control configuration updated
                  </p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  2024-08-08 09:15
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RemoteControl;
