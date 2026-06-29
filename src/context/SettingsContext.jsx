import { createContext, useContext, useEffect, useState } from "react";

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    // Check both local storage keys for maximum compatibility
    const saved =
      localStorage.getItem("thermacore-settings") ||
      localStorage.getItem("thermacore_settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback to defaults
      }
    }
    return {
      soundEnabled: true,
      volume: 0.35,
      refreshInterval: 5000,
      temperatureUnit: "celsius",
      theme: "dark",
    };
  });

  useEffect(() => {
    // Persist to both keys for compatibility
    const jsonStr = JSON.stringify(settings);
    localStorage.setItem("thermacore-settings", jsonStr);
    localStorage.setItem("thermacore_settings", jsonStr);
  }, [settings]);

  const updateSettings = (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const toggleSound = () => {
    setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const setVolume = (volume) => {
    setSettings((prev) => ({ ...prev, volume }));
  };

  const setTemperatureUnit = (temperatureUnit) => {
    setSettings((prev) => ({ ...prev, temperatureUnit }));
  };

  const formatTemperature = (celsiusVal) => {
    if (celsiusVal === undefined || celsiusVal === null) return "--";
    const numericVal = parseFloat(celsiusVal);
    if (Number.isNaN(numericVal)) return "--";

    const isF =
      settings.temperatureUnit === "fahrenheit" ||
      settings.temperatureUnit === "F";
    if (isF) {
      const fahrenheit = (numericVal * 9) / 5 + 32;
      return `${fahrenheit.toFixed(1)}°F`;
    }
    return `${numericVal.toFixed(1)}°C`;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        toggleSound,
        setVolume,
        setTemperatureUnit,
        formatTemperature,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
