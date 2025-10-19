import { useState } from "react";

import { useTheme } from "../context/ThemeContext";

const SettingsView = ({ className }) => {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: false,
      sms: false,
    },
    display: {
      theme: theme || "auto",
      timezone: "UTC",
    },
    security: {
      twoFactor: false,
      sessionTimeout: "30",
    },
    dataRefresh: {
      autoRefresh: true,
      refreshInterval: "30",
      dataRetention: "90",
      backupFrequency: "daily",
    },
    alerts: {
      emailAlerts: false,
      smsAlerts: true,
    },
  });

  const handleSettingChange = (category, setting, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value,
      },
    }));
  };

  const handleSave = () => {
    if (settings.display.theme !== theme) {
      setTheme(settings.display.theme);
    }
    console.log("Saving settings:", settings);
    alert("Settings saved successfully!");
  };

  const handleReset = () => {
    setSettings({
      notifications: {
        email: true,
        push: false,
        sms: false,
      },
      display: {
        theme: "auto",
        timezone: "UTC",
      },
      security: {
        twoFactor: false,
        sessionTimeout: "30",
      },
      dataRefresh: {
        autoRefresh: true,
        refreshInterval: "30",
        dataRetention: "90",
        backupFrequency: "daily",
      },
      alerts: {
        emailAlerts: false,
        smsAlerts: true,
      },
    });
    alert("Settings reset to defaults!");
  };

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-4 lg:p-6 xl:p-8 ${className}`}
    >
      <div className="max-w-4xl mx-auto lg:ml-0 xl:ml-4">
        <PageHeader
          title="Settings"
          subtitle="Manage your account and application preferences"
        />

        <div className="space-y-6">
          <ProfileSettings />
          <NotificationSettings
            settings={settings}
            handleSettingChange={handleSettingChange}
          />
          <DisplaySettings
            settings={settings}
            handleSettingChange={handleSettingChange}
          />
          <DataRefreshSettings
            settings={settings}
            handleSettingChange={handleSettingChange}
          />
          <AlertSettings
            settings={settings}
            handleSettingChange={handleSettingChange}
          />
          <AudioSettings />

          <div className="flex justify-end space-x-4 mt-6">
            <Button variant="outline" onClick={handleReset}>
              Reset to Default
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
