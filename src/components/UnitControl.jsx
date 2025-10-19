

import { useEffect,useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useSettings } from "../context/SettingsContext";
import { getUnitById } from "../services/unitService";
import playSound from "../utils/audioPlayer";

const UnitControl = ({ className }) => {
  const { formatTemperature, settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [device, setDevice] = useState(null);
  const [systemPower, setSystemPower] = useState(false);
  const [autoWaterProduction, setAutoWaterProduction] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);

    const loadUnitData = async () => {
      let deviceData = location.state?.device;

      if (!deviceData && id) {
        try {
          deviceData = await getUnitById(id);
        } catch (error) {
          console.error("Error loading unit data:", error);
        }
      }

      if (deviceData) {
        // Ensure all necessary properties are present
        const fullDeviceData = {
          batteryLife: 85,
          pressure: 10,
          tempIn: 25,
          tempOut: 30,
          tankCapacity: 800,
          waterLevel: 65,
          powerOutput: 15,
          ...deviceData,
        };
        fullDeviceData.waterLiters = Math.round(
          (fullDeviceData.waterLevel / 100) * fullDeviceData.tankCapacity,
        );
        setDevice(fullDeviceData);
      }
    };

    loadUnitData();
  }, [id, location.state]);

  useEffect(() => {
    if (hasMounted && device) {
      setSystemPower(device.status === "Operational");
    }
  }, [hasMounted, device]);

  const handlePowerToggle = (newCheckedState) => {
    const action = newCheckedState ? "turn on" : "turn off";
    setSystemPower(newCheckedState);
    // Play appropriate audio based on power state
    if (newCheckedState) {
      playSound("power-on.mp3", settings.soundEnabled, settings.volume);
    } else {
      playSound("power-off.mp3", settings.soundEnabled, settings.volume);
    }
    // You can add any other logic here, like sending a request to a server
    console.log(`Machine has been ${action}d.`);
  };

  const generateAlerts = () => {
    if (!device) return [];

    const alerts = [];
    if (device.batteryLife < 25) {
      alerts.push({
        id: alerts.length + 1,
        type: "Battery",
        message: `Low Battery: ${device.batteryLife}% remaining.`,
        severity: "warning",
      });
    }
    if (device.pressure > 15) {
      alerts.push({
        id: alerts.length + 1,
        type: "Pressure",
        message: `High Pressure: ${device.pressure} bar.`,
        severity: "error",
      });
    }
    if (device.tempIn < 2) {
      alerts.push({
        id: alerts.length + 1,
        type: "Temperature",
        message: `Low Temperature In: ${formatTemperature(device.tempIn)}.`,
        severity: "warning",
      });
    }
    // For demonstration, let's add a mock condition for ammonia leak
    const ammoniaLeakDetected = Math.random() < 0.05; // 5% chance for mock
    if (ammoniaLeakDetected) {
      alerts.push({
        id: alerts.length + 1,
        type: "Ammonia",
        message: "Ammonia leak detected!",
        severity: "error",
      });
    }
    return alerts;
  };

  const handleAutoWaterToggle = () => {
    const newState = !autoWaterProduction;
    setAutoWaterProduction(newState);
    // Play appropriate audio based on water state
    if (newState) {
      playSound("water-on.mp3", settings.soundEnabled, settings.volume);
    } else {
      playSound("water-off.mp3", settings.soundEnabled, settings.volume);
    }
  };

  if (!hasMounted || !device) {
    return (
      <div
        className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {hasMounted ? "Device Not Found" : "Loading..."}
          </h1>
          {hasMounted && (
            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Return to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentAlerts = generateAlerts();

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-6 ${className}`}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {device.name} Control Panel
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {device.location} • Manage unit operations and settings
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {systemPower ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-500" />
              )}
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full ${
                  systemPower
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                }`}
              >
                {systemPower ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>
        </div>

        {/* Alarm Alert - Only show if unit has alarm */}
        {device.hasAlarm && (
          <Card className="bg-red-600 border-red-700 animate-pulse mb-6">
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
                      {systemPower ? device.powerOutput : 0} kW
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Droplets className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Water Level
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {device.waterLevel}% ({device.waterLiters}L /{" "}
                      {device.tankCapacity}L)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Thermometer className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Temp In
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {systemPower ? formatTemperature(device.tempIn) : "--"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Thermometer className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Temp Out
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {systemPower ? formatTemperature(device.tempOut) : "--"}
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
                      {systemPower ? device.pressure : 0} bar
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Battery className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Battery Life
                    </p>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div
                          className={`h-2 rounded-full ${
                            device.batteryLife > 50
                              ? "bg-green-500"
                              : device.batteryLife > 25
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${device.batteryLife}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {device.batteryLife}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Controls */}
          <Card className="bg-white dark:bg-gray-900">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                System Controls
              </h3>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* System Power */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    System Power
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Turn the entire system on or off
                  </p>
                </div>
                <button
                  onClick={() => handlePowerToggle(!systemPower)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    systemPower
                      ? "bg-green-600"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      systemPower ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Auto Water Production */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Auto Water Production
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automatically start when tank level {"<"} 75%
                  </p>
                </div>
                <button
                  onClick={handleAutoWaterToggle}
                  disabled={!systemPower}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoWaterProduction && systemPower
                      ? "bg-yellow-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  } ${!systemPower ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoWaterProduction && systemPower
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Display */}
          {currentAlerts.length > 0 && (
            <Card className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 lg:col-span-2">
              <CardContent className="p-4">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  Active Alerts:
                </h4>
                {currentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start space-x-3 mb-1"
                  >
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {alert.message}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Water Level Alert */}
          {device.waterLevel < 75 && (
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 lg:col-span-2">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Low Water Level Alert
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Water level is at {device.waterLevel}% (
                      {device.waterLiters}L), below the 75% threshold.
                      {autoWaterProduction && systemPower
                        ? " Auto water production will activate."
                        : " Consider enabling auto water production."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Control Status */}
          <Card className="bg-white dark:bg-gray-900">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Control Status
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  System Power
                </span>
                <span
                  className={`text-sm font-medium ${systemPower ? "text-green-600" : "text-red-600"}`}
                >
                  {systemPower ? "ON" : "OFF"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Auto Water Production
                </span>
                <span
                  className={`text-sm font-medium ${autoWaterProduction && systemPower ? "text-yellow-600" : "text-gray-400"}`}
                >
                  {autoWaterProduction && systemPower ? "ENABLED" : "DISABLED"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  System Status
                </span>
                <span
                  className={`text-sm font-medium ${systemPower ? "text-green-600" : "text-red-600"}`}
                >
                  {systemPower ? "OPERATIONAL" : "OFFLINE"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white dark:bg-gray-900">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Quick Actions
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Return to Dashboard</span>
              </button>
              <button
                disabled={!systemPower}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  systemPower
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Advanced Settings</span>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UnitControl;
