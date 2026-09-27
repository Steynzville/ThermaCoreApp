import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { apiPutJson } from "../utils/apiFetch";
import PageHeader from "./PageHeader";
import AudioSettings from "./settings/AudioSettings";
import DisplaySettings from "./settings/DisplaySettings";
import ProfileSettings from "./settings/ProfileSettings";
import ConnectedAccounts from "./settings/ConnectedAccounts";
import PasswordSettings from "./settings/PasswordSettings";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
const defaults = {
  soundEnabled: true,
  volume: 0.35,
  refreshInterval: 30000,
  temperatureUnit: "celsius",
  theme: "auto",
};
export default function SettingsView({ className = "" }) {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [selectedTheme, setSelectedTheme] = useState(theme),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(null);
  useEffect(() => setSelectedTheme(theme), [theme]);
  const save = async (reset) => {
    setBusy(true);
    setError(null);
    setMessage("");
    const preferences = reset
      ? defaults
      : {
          soundEnabled: settings.soundEnabled,
          volume: settings.volume,
          refreshInterval: settings.refreshInterval,
          temperatureUnit: settings.temperatureUnit,
          theme: selectedTheme,
        };
    try {
      const result = await apiPutJson("/api/v1/account/settings", {
        preferences,
      });
      updateSettings(result.preferences);
      setTheme(result.preferences.theme);
      setSelectedTheme(result.preferences.theme);
      setMessage(
        reset ? "Account preferences reset." : "Account preferences saved.",
      );
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-4 lg:p-6 xl:p-8 w-full ${className}`}
    >
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Settings"
          subtitle="Manage your account and application preferences"
        />
        <div className="space-y-6">
          <ProfileSettings />
          <ConnectedAccounts />
          <PasswordSettings />
          <DisplaySettings
            settings={{ display: { theme: selectedTheme } }}
            handleSettingChange={(_category, _key, value) =>
              setSelectedTheme(value)
            }
          />
          <Card className="bg-white dark:bg-gray-900">
            <CardHeader>
              <CardTitle>Monitoring preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label
                htmlFor="account-temperature"
                className="block text-sm font-medium"
              >
                Temperature display
              </label>
              <select
                id="account-temperature"
                className="border rounded p-2 bg-background"
                value={settings.temperatureUnit}
                onChange={(event) =>
                  updateSettings({ temperatureUnit: event.target.value })
                }
              >
                <option value="celsius">Celsius</option>
                <option value="fahrenheit">Fahrenheit</option>
              </select>
              <label
                htmlFor="account-refresh"
                className="block text-sm font-medium"
              >
                Portfolio refresh interval
              </label>
              <select
                id="account-refresh"
                className="border rounded p-2 bg-background"
                value={settings.refreshInterval}
                onChange={(event) =>
                  updateSettings({
                    refreshInterval: Number(event.target.value),
                  })
                }
              >
                {[5000, 15000, 30000, 60000].map((value) => (
                  <option key={value} value={value}>
                    {value / 1000} seconds
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground">
                Live socket updates continue between refreshes. Alert and alarm
                visibility remains enabled. Email/SMS delivery, backup schedules
                and system maintenance are deployment services, not personal
                preferences.
              </p>
            </CardContent>
          </Card>
          <AudioSettings />
          {error && <p role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
          <div className="flex justify-end space-x-4 mt-6">
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => save(true)}
            >
              Reset to Default
            </Button>
            <Button disabled={busy} onClick={() => save(false)}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
