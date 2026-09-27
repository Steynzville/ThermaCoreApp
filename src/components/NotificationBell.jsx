import { Bell, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUnits } from "../context/UnitContext";
import { isAlarm, notificationDestination } from "../utils/conditions";

const NotificationBell = ({ className = "" }) => {
  const { alerts = [], scopeLabel } = useUnits();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [viewed, setViewed] = useState({ scope: null, ids: new Set() });
  const allNotifications = alerts.map((event) => ({
    ...event,
    type: isAlarm(event) ? "alarm" : "alert",
  }));
  const unviewedCount = allNotifications.filter(
    (event) => viewed.scope !== scopeLabel || !viewed.ids.has(event.id),
  ).length;
  const handleBellClick = () => {
    if (!isOpen)
      setViewed({
        scope: scopeLabel,
        ids: new Set(allNotifications.map((event) => event.id)),
      });
    setIsOpen(!isOpen);
  };
  const handleClose = () => setIsOpen(false);
  const handleNotificationClick = (event) => {
    setIsOpen(false);
    navigate(notificationDestination(event));
  };
  const handleViewAllNotifications = () => {
    setIsOpen(false);
    navigate("/history");
  };
  return (
    <div className={`relative ${className}`}>
      {/* Bell Icon */}
      <button
        type="button"
        aria-label={`Notifications (${alerts.length})`}
        aria-expanded={isOpen}
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
              type="button"
              aria-label="Close notifications"
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
                  <button
                    type="button"
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer w-full text-left ${
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
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
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
