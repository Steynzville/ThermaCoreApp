import { Bell, X } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { units } from "../data/mockUnits";

const NotificationBell = ({ className = "" }) => {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [viewedNotifications, setViewedNotifications] = useState(new Set());

  // Mock notifications data
  const alerts = [
    {
      id: 1,
      type: "alert",
      message: "ThermaCore Unit 001 - Unit Offline",
      timestamp: "2025-09-09 14:45",
      alertData: {
        id: 1,
        type: "critical",
        title: "Unit Offline",
        message: "ThermaCore Unit 001 has gone offline and requires immediate attention",
        timestamp: "2025-09-09 14:45"
      }
    },
    {
      id: 2,
      type: "alert",
      message: "ThermaCore Unit 002 - Low Water Level",
      timestamp: "2025-09-09 14:15",
      alertData: {
        id: 2,
        type: "warning",
        title: "Low Water Level",
        message: "Water level has dropped below safe operating threshold",
        timestamp: "2025-09-09 14:15"
      }
    },
    {
      id: 3,
      type: "alert",
      message: "ThermaCore Unit 003 - Maintenance Scheduled",
      timestamp: "2025-09-09 13:30",
      status: "completed",
      alertData: {
        id: 3,
        type: "info",
        title: "Maintenance Scheduled",
        message: "Routine maintenance has been scheduled for this unit",
        timestamp: "2025-09-09 13:30"
      }
    },
    {
      id: 4,
      type: "alert",
      message: "ThermaCore Unit 004 - System Restored",
      timestamp: "2025-09-09 12:00",
      status: "completed",
      alertData: {
        id: 4,
        type: "success",
        title: "System Restored",
        message: "Unit has been successfully restored to normal operation",
        timestamp: "2025-09-09 12:00"
      }
    },
    {
      id: 5,
      type: "alert",
      message: "ThermaCore Unit 005 - Temperature Alert",
      timestamp: "2025-09-09 11:30",
      status: "completed",
      alertData: {
        id: 5,
        type: "warning",
        title: "Temperature Alert",
        message: "Operating temperature has exceeded normal range",
        timestamp: "2025-09-09 11:30"
      }
    },
    {
      id: 6,
      type: "alert",
      message: "ThermaCore Unit 006 - Pressure Drop",
      timestamp: "2025-09-09 10:15",
      alertData: {
        id: 6,
        type: "warning",
        title: "Pressure Drop",
        message: "System pressure has dropped below optimal levels",
        timestamp: "2025-09-09 10:15"
      }
    },
  ];

  const alarms = [
    {
      id: 7,
      type: "alarm",
      message: "ThermaCore Unit 003 - NH3 LEAK DETECTED",
      timestamp: "2025-09-09 15:30",
      alertData: {
        id: 7,
        type: "critical",
        title: "NH3 LEAK DETECTED",
        message: "Critical ammonia leak detected - immediate attention required",
        timestamp: "2025-09-09 15:30"
      }
    },
    {
      id: 8,
      type: "alarm",
      message: "ThermaCore Unit 014 - NH3 LEAK DETECTED",
      timestamp: "2025-09-09 15:15",
      alertData: {
        id: 8,
        type: "critical",
        title: "NH3 LEAK DETECTED",
        message: "Critical ammonia leak detected - immediate attention required",
        timestamp: "2025-09-09 15:15"
      }
    },
  ];

  // Filter alarms and alerts based on user role - user role only sees first 6 units (TC001-TC006)
  const userAlarms = userRole === "admin" ? alarms : alarms.filter(alarm => {
    const unitMatch = alarm.message.match(/ThermaCore Unit (\d+)/);
    return unitMatch && parseInt(unitMatch[1]) <= 6;
  });

  const userAlerts = userRole === "admin" ? alerts : alerts.filter(alert => {
    const unitMatch = alert.message.match(/ThermaCore Unit (\d+)/);
    return unitMatch && parseInt(unitMatch[1]) <= 6;
  });

  // Combine and sort notifications - alarms first, then alerts
  const allNotifications = [...userAlarms, ...userAlerts];
  const unviewedCount = allNotifications.filter(
    (n) => !viewedNotifications.has(n.id),
  ).length;

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Store notifications in localStorage when bell is clicked (opened)
      const unresolvedNotifications = allNotifications.map(notification => {
        if (notification.id === 3 || notification.id === 4 || notification.id === 5) {
          return { ...notification, status: 'completed' };
        } else {
          return { ...notification, status: 'unresolved' };
        }
      });
      localStorage.setItem('unresolvedNotifications', JSON.stringify(unresolvedNotifications));
      
      // Mark all notifications as viewed when opening
      const allIds = new Set(allNotifications.map((n) => n.id));
      setViewedNotifications(allIds);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleNotificationClick = (notification) => {
    // Extract unit number from notification message
    const unitMatch = notification.message.match(/ThermaCore Unit (\d+)/);
    if (unitMatch) {
      const unitNumber = parseInt(unitMatch[1]); // Convert to integer to match system
      
      // Find the actual unit data from mockUnits to ensure it exists
      const unitId = `TC${unitMatch[1].padStart(3, '0')}`;
      const unitData = units.find(unit => unit.id === unitId);
      
      if (unitData) {
        // Create enhanced unit data with the current alert from notification
        const enhancedUnit = {
          ...unitData,
          currentAlert: notification.alertData
        };
        
        // Determine which tab to open based on notification type
        const targetTab = notification.type === "alarm" ? "overview" : "alerts";
        
        // Navigate based on user role - same logic as AlertsView/AlarmsView
        setIsOpen(false);
        if (userRole === "admin") {
          navigate(`/unit-details/${unitNumber}?tab=${targetTab}`, { state: { unit: enhancedUnit } });
        } else {
          navigate(`/unit/${unitNumber}?tab=${targetTab}`, { state: { unit: enhancedUnit } });
        }
      } else {
        console.error(`Unit with ID ${unitId} not found in mock data`);
      }
    }
  };

  const handleViewAllNotifications = () => {
    // Store unresolved notifications in localStorage for the history page
    const unresolvedNotifications = allNotifications.map(notification => {
      if (notification.id === 3 || notification.id === 4 || notification.id === 5) {
        return { ...notification, status: 'completed' };
      } else {
        return { ...notification, status: 'unresolved' };
      }
    });
    localStorage.setItem('unresolvedNotifications', JSON.stringify(unresolvedNotifications));
    
    setIsOpen(false);
    navigate('/history');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell Icon */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unviewedCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unviewedCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h3>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {allNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {allNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                      notification.type === "alarm"
                        ? "bg-red-100 dark:bg-red-900/30"
                        : notification.status === "completed"
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notification.type === "alarm"
                            ? "bg-red-500"
                            : notification.status === "completed"
                            ? "bg-blue-500"
                            : "bg-orange-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            notification.type === "alarm"
                              ? "text-red-900 dark:text-red-100"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {notification.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button 
              onClick={handleViewAllNotifications}
              className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

