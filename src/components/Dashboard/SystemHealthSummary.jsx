import { TrendingUp } from "lucide-react";
import React from "react";

import { units } from "../../data/mockUnits";

// System Health Summary
const SystemHealthSummary = ({ userRole }) => {
  const totalUnits = units.length;
  const onlineUnits = units.filter((unit) => unit.status === "online").length;
  const offlineUnits = units.filter((unit) => unit.status === "offline").length;
  const unitsWithAlerts = units.filter((unit) => unit.hasAlert).length;

  const healthScore = Math.round((onlineUnits / totalUnits) * 100);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            System Health
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Overall system performance
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {healthScore}%
          </div>
          <div className="text-sm text-green-600 dark:text-green-400 flex items-center">
            <TrendingUp className="h-3 w-3 mr-1" />
            +2.3% this week
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {onlineUnits}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Online</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-yellow-600">
            {unitsWithAlerts}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Alerts</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-red-600">{offlineUnits}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Offline
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthSummary;
