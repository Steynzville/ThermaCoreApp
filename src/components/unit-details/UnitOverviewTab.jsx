import { AlertTriangle, Zap } from "lucide-react";

import { Card, CardContent } from "../ui/card";
import UnitVitals from "./UnitVitals";

const UnitOverviewTab = ({ unit }) => {
  if (!unit) return null;

  const diffPressure = unit.differentialPressure !== undefined ? parseFloat(unit.differentialPressure) : undefined;
  const batteryVoltage = unit.batteryVoltage !== undefined ? parseFloat(unit.batteryVoltage) : undefined;

  // Differential Pressure Alarms
  const isNh3Leak = diffPressure !== undefined && diffPressure < 4;
  const isHighPressure = diffPressure !== undefined && diffPressure > 6;

  // Battery Voltage Alarms
  const isLowBatteryVoltage = batteryVoltage !== undefined && batteryVoltage < 23;
  const isHighBatteryVoltage = batteryVoltage !== undefined && batteryVoltage > 27;
  const isBatteryAlert = isLowBatteryVoltage || isHighBatteryVoltage;

  const showNh3LeakAlarm = Boolean(unit.hasAlarm || isNh3Leak);
  const showHighPressureAlarm = Boolean(isHighPressure);

  return (
    <div className="space-y-6">
      {/* NH3 Leak Alarm - Only show if unit has alarm or differentialPressure < 4 bar */}
      {showNh3LeakAlarm && (
        <Card className="bg-red-600 border-red-700 animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Zap className="h-8 w-8 text-white animate-bounce" />
              <div>
                <h3 className="text-xl font-bold text-white">
                  🚨 NH3 LEAK DETECTED 🚨
                </h3>
                <p className="text-red-100">
                  Critical alarm: Toxic ammonia leak detected in system (Differential Pressure &lt; 4 bar).
                  Immediate attention and maintenance alert required.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* High Differential Pressure / Auto-Shutdown Alarm */}
      {showHighPressureAlarm && (
        <Card className="bg-red-700 border-red-800 animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Zap className="h-8 w-8 text-white animate-bounce" />
              <div>
                <h3 className="text-xl font-bold text-white">
                  🚨 HIGH DIFFERENTIAL PRESSURE - AUTO SHUTDOWN 🚨
                </h3>
                <p className="text-red-100">
                  Critical alarm: Differential pressure exceeds 6 bar ({diffPressure} bar).
                  Auto-shutdown triggered and maintenance alert issued.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Battery Voltage Alert */}
      {isBatteryAlert && (
        <Card className="bg-yellow-500 border-yellow-600 dark:bg-yellow-600/30 dark:border-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-white dark:text-yellow-400" />
              <div>
                <h3 className="text-lg font-bold text-white dark:text-yellow-200">
                  ⚠️ BATTERY VOLTAGE ALERT ⚠️
                </h3>
                <p className="text-yellow-100 dark:text-yellow-300 text-sm">
                  {isLowBatteryVoltage
                    ? `Low Battery Voltage Alert: ${batteryVoltage}V (Threshold < 23V).`
                    : `High Battery Voltage Alert: ${batteryVoltage}V (Threshold > 27V).`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <UnitVitals unit={unit} />
    </div>
  );
};

export default UnitOverviewTab;
