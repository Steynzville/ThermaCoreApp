
const DataRefreshSettings = ({ settings, handleSettingChange }) => {
  return (
    <Card className="bg-white dark:bg-gray-900">
      <CardHeader className="flex flex-row items-center space-x-2">
        <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Data & Refresh
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Auto Refresh
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatically refresh data
            </p>
          </div>
          <button
            onClick={() =>
              handleSettingChange(
                "dataRefresh",
                "autoRefresh",
                !settings.dataRefresh.autoRefresh,
              )
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.dataRefresh.autoRefresh
                ? "bg-blue-600"
                : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.dataRefresh.autoRefresh
                  ? "translate-x-6"
                  : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {settings.dataRefresh.autoRefresh && (
          <FormFieldGroup
            id="refreshInterval"
            label="Refresh Interval (seconds)"
            type="number"
            value={settings.dataRefresh.refreshInterval}
            onChange={(e) =>
              handleSettingChange(
                "dataRefresh",
                "refreshInterval",
                e.target.value,
              )
            }
            inputClassName="min-10 max-300"
          />
        )}

        <FormFieldGroup
          id="dataRetention"
          label="Data Retention (days)"
          type="number"
          value={settings.dataRefresh.dataRetention}
          onChange={(e) =>
            handleSettingChange("dataRefresh", "dataRetention", e.target.value)
          }
          inputClassName="min-30 max-365"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Backup Frequency
          </label>
          <select
            value={settings.dataRefresh.backupFrequency}
            onChange={(e) =>
              handleSettingChange(
                "dataRefresh",
                "backupFrequency",
                e.target.value,
              )
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataRefreshSettings;
