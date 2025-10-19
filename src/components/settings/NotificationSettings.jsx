import { Bell } from "lucide-react";
import React from "react";

import { Card, CardContent,CardHeader } from "../ui/card";

const NotificationSettings = ({ settings, handleSettingChange }) => {
  return (
    <Card className="bg-white dark:bg-gray-900">
      <CardHeader className="flex flex-row items-center space-x-2">
        <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Notifications
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Email Notifications
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Receive alerts via email
            </p>
          </div>
          <button
            onClick={() =>
              handleSettingChange(
                "notifications",
                "email",
                !settings.notifications.email,
              )
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.notifications.email
                ? "bg-blue-600"
                : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.notifications.email ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Push Notifications
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Receive push notifications in browser
            </p>
          </div>
          <button
            onClick={() =>
              handleSettingChange(
                "notifications",
                "push",
                !settings.notifications.push,
              )
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.notifications.push
                ? "bg-blue-600"
                : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.notifications.push ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
