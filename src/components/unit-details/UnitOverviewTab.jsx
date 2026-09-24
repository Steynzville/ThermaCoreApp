import { AlertTriangle, Zap } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import UnitVitals from "./UnitVitals";
import { useUnits } from "../../context/UnitContext";
import { isAlarm } from "../../utils/conditions";
export default function UnitOverviewTab({ unit }) {
  const { alerts = [] } = useUnits();
  if (!unit) return null;
  return (
    <div className="space-y-6">
      {alerts
        .filter((event) => event.unitId === unit.id)
        .map((event) => {
          const alarm = isAlarm(event);
          const Icon = alarm ? Zap : AlertTriangle;
          return (
            <Card
              key={event.id}
              className={
                alarm
                  ? "bg-red-600 border-red-700 animate-pulse"
                  : "bg-yellow-500 border-yellow-600 dark:bg-yellow-600/30 dark:border-yellow-500"
              }
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Icon
                    className={
                      alarm
                        ? "h-8 w-8 text-white animate-bounce"
                        : "h-6 w-6 text-white dark:text-yellow-400"
                    }
                  />
                  <div>
                    <h3
                      className={
                        alarm
                          ? "text-xl font-bold text-white"
                          : "text-lg font-bold text-white dark:text-yellow-200"
                      }
                    >
                      {alarm ? "🚨" : "⚠️"} {event.title} {alarm ? "🚨" : "⚠️"}
                    </h3>
                    <p
                      className={
                        alarm
                          ? "text-red-100"
                          : "text-yellow-100 dark:text-yellow-300 text-sm"
                      }
                    >
                      {event.message}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      <UnitVitals unit={unit} />
    </div>
  );
}
