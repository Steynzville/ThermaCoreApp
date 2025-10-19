import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import React from "react";

import { useAuth } from "../../context/AuthContext";
import { getAllCurrentNotificationsForUnit } from "../../utils/notifications";
import { Card, CardContent } from "../ui/card";

const UnitAlertsTab = ({ unit, alertsHistory, getAlertTypeColor }) => {
  const { userRole } = useAuth();
  
  // Get all current notifications for this unit with role-based filtering
  const currentNotifications = getAllCurrentNotificationsForUnit(unit.id, userRole);
  
  // Helper function to get border color based on alert type
  const getBorderColor = (type) => {
    switch (type) {
      case "critical":
        return "border-l-red-500";
      case "warning":
        return "border-l-yellow-500";
      case "info":
        return "border-l-blue-500";
      case "success":
        return "border-l-green-500";
      default:
        return "border-l-gray-500";
    }
  };

  // Helper function to get icon color based on alert type
  const getIconColor = (type) => {
    switch (type) {
      case "critical":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "info":
        return "text-blue-600 dark:text-blue-400";
      case "success":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Current Alerts
      </h3>

      {currentNotifications && currentNotifications.length > 0 ? (
        <>
          {currentNotifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`bg-white dark:bg-gray-900 border-l-4 ${getBorderColor(notification.type)}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle
                    className={`h-5 w-5 mt-0.5 ${getIconColor(notification.type)}`}
                  />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {notification.timestamp}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      ) : (
        <Card className="bg-white dark:bg-gray-900">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No active alerts
            </p>
          </CardContent>
        </Card>
      )}

      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-8">
        Alerts History
      </h3>

      {alertsHistory.map((alert) => (
        <Card key={alert.id} className="bg-white dark:bg-gray-900">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4
                    className={`text-sm font-medium ${getAlertTypeColor(alert.type)}`}
                  >
                    {alert.title}
                  </h4>
                  {alert.resolved && (
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded">
                      Resolved
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {alert.message}
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Created: {alert.timestamp}</span>
                  </div>
                  {alert.resolved && (
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Resolved: {alert.resolvedAt}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UnitAlertsTab;
