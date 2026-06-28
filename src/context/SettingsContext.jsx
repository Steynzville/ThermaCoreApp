import React, { createContext, useContext, useState, useEffect } from "react";

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("thermacore_settings");
    return saved ? JSON.parse(saved) : {
      soundEnabled: true,
      volume: 0.8,
      refreshInterval: 5000,
      temperatureUnit: "C",
      theme: "dark"
    };
  });

  useEffect(() => {
    localStorage.setItem("thermacore_settings", JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const formatTemperature = (celsiusVal) => {
    if (celsiusVal === undefined || celsiusVal === null) return "--";
    const numericVal = parseFloat(celsiusVal);
    if (isNaN(numericVal)) return "--";
    
    if (settings.temperatureUnit === "F") {
      const fahrenheit = (numericVal * 9) / 5 + 32;
      return `${fahrenheit.toFixed(1)}°F`;
    }
    return `${numericVal.toFixed(1)}°C`;
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, formatTemperature }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    const defaultSettings = {
      soundEnabled: true,
      volume: 0.8,
      refreshInterval: 5000,
      temperatureUnit: "C",
      theme: "dark"
    };
    return {
      settings: defaultSettings,
      updateSettings: () => {},
      formatTemperature: (celsiusVal) => {
        if (celsiusVal === undefined || celsiusVal === null) return "--";
        const numericVal = parseFloat(celsiusVal);
        if (isNaN(numericVal)) return "--";
        if (defaultSettings.temperatureUnit === "F") {
          const fahrenheit = (numericVal * 9) / 5 + 32;
          return `${fahrenheit.toFixed(1)}°F`;
        }
        return `${numericVal.toFixed(1)}°C`;
      }
    };
  }
  return context;
};
