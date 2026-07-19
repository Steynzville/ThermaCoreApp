import {
  AlertTriangle,
  Package,
  Wifi,
  WifiOff,
  Wrench,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Configuration for each stat card - single source of truth
const STAT_CONFIGS = [
  {
    key: "all",
    label: "Total",
    icon: Package,
    color: "blue",
    getValue: (props) => props.totalUnits,
    navigate: "/grid-view?status=all",
    ariaLabel: "Filter by total units",
  },
  {
    key: "online",
    label: "Online",
    icon: Wifi,
    color: "green",
    getValue: (props) => props.onlineCount,
    navigate: "/grid-view?status=online",
    ariaLabel: "Filter by online units",
  },
  {
    key: "offline",
    label: "Offline",
    icon: WifiOff,
    color: "gray",
    getValue: (props) => props.offlineCount,
    navigate: "/grid-view?status=offline",
    ariaLabel: "Filter by offline units",
  },
  {
    key: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    color: "yellow",
    getValue: (props) => props.maintenanceCount,
    navigate: "/grid-view?status=maintenance",
    ariaLabel: "Filter by maintenance units",
  },
  {
    key: "alerts",
    label: "Alerts",
    icon: AlertTriangle,
    color: "orange",
    getValue: (props) => props.alertCount,
    navigate: "/grid-view?alerts=true",
    ariaLabel: "Filter by units with alerts",
  },
  {
    key: "alarms",
    label: "Alarms",
    icon: Zap,
    color: "red",
    getValue: (props) => props.alarmCount,
    navigate: "/grid-view?alarms=true",
    ariaLabel: "Filter by units with alarms",
  },
];

// Color class mapping
const COLOR_CLASSES = {
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
    icon: "text-blue-600 dark:text-blue-400",
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-400",
    icon: "text-green-600 dark:text-green-400",
  },
  gray: {
    bg: "bg-gray-100 dark:bg-gray-700",
    text: "text-gray-600 dark:text-gray-400",
    icon: "text-gray-600 dark:text-gray-400",
  },
  yellow: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-600 dark:text-yellow-400",
    icon: "text-yellow-600 dark:text-yellow-400",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-600 dark:text-orange-400",
    icon: "text-orange-600 dark:text-orange-400",
  },
  red: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-600 dark:text-red-400",
    icon: "text-red-600 dark:text-red-400",
  },
};

const UnitSummary = ({
  totalUnits,
  onlineCount,
  offlineCount,
  maintenanceCount,
  alertCount,
  alarmCount,
}) => {
  const navigate = useNavigate();

  const props = { totalUnits, onlineCount, offlineCount, maintenanceCount, alertCount, alarmCount };

  const handleFilterClick = (navigatePath) => {
    navigate(navigatePath);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Unit Summary
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {STAT_CONFIGS.map((config) => {
          const Icon = config.icon;
          const value = config.getValue(props);
          const colors = COLOR_CLASSES[config.color];

          return (
            <button
              key={config.key}
              type="button"
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
              onClick={() => handleFilterClick(config.navigate)}
              aria-label={config.ariaLabel}
            >
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {config.label}
                </p>
                <p className={`text-lg font-bold ${colors.text}`}>
                  {value}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default UnitSummary;
