import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { useTheme } from "../../context/ThemeContext";
import { apiGetJson } from "../../utils/apiFetch";
export default function AccountPreferencesBridge() {
  const { user, updateAccountProfile } = useAuth();
  const { updateSettings } = useSettings();
  const { setTheme } = useTheme();
  useEffect(() => {
    if (!user?.id) return;
    updateSettings({
      soundEnabled: true,
      volume: 0.35,
      refreshInterval: 30000,
      temperatureUnit: "celsius",
      theme: "auto",
    });
    let alive = true;
    apiGetJson("/api/v1/account/settings", { showToastOnError: false })
      .then((result) => {
        if (!alive) return;
        updateSettings(result.preferences);
        setTheme(result.preferences.theme);
        updateAccountProfile?.(result.profile);
      })
      .catch(() => {
        /* Settings displays retryable backend errors on its page. */
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);
  return null;
}
