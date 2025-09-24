import React from "react";
import { Card, CardHeader, CardContent } from "../ui/card";
import { Globe } from "lucide-react";

const UnitSettings = ({ settings, handleSettingChange }) => {
  return (
    <Card className="bg-white dark:bg-gray-900">
      <CardHeader className="flex flex-row items-center space-x-2">
        <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Unit Settings
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Temperature Unit
          </label>
          <select
            value={settings.units.temperatureUnit}
            onChange={(e) =>
              handleSettingChange("units", "temperatureUnit", e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="celsius">Celsius</option>
            <option value="fahrenheit">Fahrenheit</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnitSettings;
