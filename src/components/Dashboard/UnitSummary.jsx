

import { useNavigate } from "react-router-dom";

const UnitSummary = ({
  totalUnits,
  onlineCount,
  offlineCount,
  maintenanceCount,
  alertCount,
  alarmCount,
}) => {
  const navigate = useNavigate();

  const handleFilterClick = (filterType) => {
    switch (filterType) {
      case 'all':
        navigate('/grid-view?status=all');
        break;
      case 'online':
        navigate('/grid-view?status=online');
        break;
      case 'offline':
        navigate('/grid-view?status=offline');
        break;
      case 'maintenance':
        navigate('/grid-view?status=maintenance');
        break;
      case 'alerts':
        navigate('/grid-view?alerts=true');
        break;
      case 'alarms':
        navigate('/grid-view?alarms=true');
        break;
      default:
        navigate('/grid-view');
    }
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Unit Summary
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Total Units */}
        <div 
          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
          onClick={() => handleFilterClick('all')}
        >
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Total
            </p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {totalUnits}
            </p>
          </div>
        </div>

        {/* Online Units */}
        <div 
          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
          onClick={() => handleFilterClick('online')}
        >
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Online
            </p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {onlineCount}
            </p>
          </div>
        </div>

        {/* Offline Units */}
        <div 
          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
          onClick={() => handleFilterClick('offline')}
        >
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Offline
            </p>
            <p className="text-lg font-bold text-gray-600 dark:text-gray-400">
              {offlineCount}
            </p>
          </div>
        </div>

        {/* Maintenance Units */}
        <div 
          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
          onClick={() => handleFilterClick('maintenance')}
        >
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Maintenance
            </p>
            <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
              {maintenanceCount}
            </p>
          </div>
        </div>

        {/* Alert Units */}
        <div 
          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
          onClick={() => handleFilterClick('alerts')}
        >
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Alerts
            </p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {alertCount}
            </p>
          </div>
        </div>

        {/* Alarm Units */}
        <div 
          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
          onClick={() => handleFilterClick('alarms')}
        >
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Alarms
            </p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {alarmCount}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitSummary;
