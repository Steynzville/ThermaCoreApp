import React, { createContext, useContext, useEffect,useState } from "react";

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    soundEnabled: true,
    volume: 0.35, // Default volume (0.0 to 1.0)
    temperatureUnit: "celsius", // 'celsius' or 'fahrenheit'
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("thermacore-settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error("Error loading settings from localStorage:", error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("thermacore-settings", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleSound = () => {
    updateSetting("soundEnabled", !settings.soundEnabled);
  };

  const toggleTemperatureUnit = () => {
    updateSetting(
      "temperatureUnit",
      settings.temperatureUnit === "celsius" ? "fahrenheit" : "celsius",
    );
  };

  const setTemperatureUnit = (unit) => {
    updateSetting("temperatureUnit", unit);
  };

  const setVolume = (volume) => {
    updateSetting("volume", volume);
  };

  const convertTemperature = (celsius) => {
    if (settings.temperatureUnit === "fahrenheit") {
      return (celsius * 9) / 5 + 32;
    }
    return celsius;
  };

  const formatTemperature = (celsius, showUnit = true) => {
    if (celsius === null || celsius === undefined) {
      return "N/A";
    }
    const converted = convertTemperature(celsius);
    const rounded = Math.round(converted * 10) / 10; // Round to 1 decimal place
    const unit = settings.temperatureUnit === "celsius" ? "°C" : "°F";
    return showUnit ? `${rounded}${unit}` : rounded;
  };

  const value = {
    settings,
    updateSetting,
    toggleSound,
    toggleTemperatureUnit,
    setTemperatureUnit,
    setVolume,
    convertTemperature,
    formatTemperature,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
