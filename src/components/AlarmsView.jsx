import { AlertTriangle, CheckCircle, Clock, Info, Siren } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useUnits } from "../context/UnitContext";
import { isAlarm, conditionType } from "../utils/conditions";
import PageHeader from "./PageHeader";
import { Card, CardContent } from "./ui/card";

export const getAlarmIcon = (type) => {
  switch (type) {
    case "critical":
      return <Siren className="h-5 w-5 text-red-500" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "info":
      return <Info className="h-5 w-5 text-blue-500" />;
    case "success":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    default:
      return <AlertTriangle className="h-5 w-5 text-gray-500" />;
  }
};

export const getAlarmColor = (type) => {
  switch (type) {
    case "critical":
      return "border-l-red-500 bg-red-50 dark:bg-red-950/20";
    case "warning":
      return "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
    case "info":
      return "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20";
    case "success":
      return "border-l-green-500 bg-green-50 dark:bg-green-950/20";
    default:
      return "border-l-gray-500 bg-gray-50 dark:bg-gray-950/20";
  }
};

const AlarmsView = ({ className = "" }) => {
  const navigate = useNavigate();
  const [query] = useSearchParams();
  const { alerts: conditions = [], loading, error } = useUnits();
  const alarms = conditions
    .filter(
      (event) =>
        isAlarm(event) &&
        (!query.get("unit") || String(event.unitId) === query.get("unit")),
    )
    .map((event) => ({
      ...event,
      type: conditionType(event),
      device: event.unitName,
      title: event.title || event.message,
    }));
  const handleAlarmClick = (event) =>
    navigate(
      `/unit-details/${encodeURIComponent(event.unitId)}?tab=overview&event=${encodeURIComponent(event.id)}`,
    );

  return (
    <div
      className={`min-h-screen bg-gray-50 dark:bg-gray-900 p-3 lg:p-4 xl:p-6 ${className}`}
    >
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Alarms!"
          description="Critical system alarms requiring immediate attention"
        />

        {loading && <p role="status">Loading conditions…</p>}
        {error && <p role="alert">{error}</p>}
        {/* Alarms List */}
        <div className="space-y-3 lg:space-y-4">
          {alarms.map((alarm) => (
            <Card
              key={alarm.id}
              id={`event-${alarm.id}`}
              role="button"
              tabIndex={0}
              aria-current={
                query.get("event") === String(alarm.id) ? "true" : undefined
              }
              style={{
                outline:
                  query.get("event") === String(alarm.id)
                    ? "2px solid #2563eb"
                    : undefined,
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleAlarmClick(alarm);
                }
              }}
              className={`border-l-4 ${getAlarmColor(alarm.type)} cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => handleAlarmClick(alarm)}
            >
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 lg:space-x-4 flex-1">
                    {getAlarmIcon(alarm.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm lg:text-base font-semibold text-gray-900 dark:text-gray-100">
                          {alarm.device} - {alarm.title}
                        </h3>
                        <span className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 flex items-center">
                          <Clock className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
                          {alarm.timestamp}
                        </span>
                      </div>
                      <p className="text-sm lg:text-base text-gray-600 dark:text-gray-300 mb-2">
                        {alarm.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs lg:text-sm font-medium text-blue-600 dark:text-blue-400">
                          Device: {alarm.device}
                        </span>
                        {alarm.acknowledged && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 px-2 py-1 rounded-full">
                            Acknowledged
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {alarms.length === 0 && (
          <Card className="text-center py-8 lg:py-12">
            <CardContent>
              <Siren className="h-12 w-12 lg:h-16 lg:w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No alarms found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                There are no alarms matching your current filter.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AlarmsView;
