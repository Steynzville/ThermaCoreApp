import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SettingsProvider, useSettings } from "../context/SettingsContext";

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("SettingsContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Provider", () => {
    it("should provide default settings", () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      expect(result.current.settings).toBeDefined();
      expect(result.current.settings.soundEnabled).toBe(true);
      expect(result.current.settings.volume).toBe(0.35);
      expect(result.current.settings.temperatureUnit).toBe("celsius");
    });

    it("should load settings from localStorage on mount", () => {
      const savedSettings = {
        soundEnabled: false,
        volume: 0.5,
        temperatureUnit: "fahrenheit",
      };
      localStorage.setItem(
        "thermacore-settings",
        JSON.stringify(savedSettings),
      );

      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      expect(result.current.settings.soundEnabled).toBe(false);
      expect(result.current.settings.volume).toBe(0.5);
      expect(result.current.settings.temperatureUnit).toBe("fahrenheit");
    });

    it("should handle invalid JSON in localStorage gracefully", () => {
      localStorage.setItem("thermacore-settings", "invalid json");

      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      // Should fallback to defaults
      expect(result.current.settings.soundEnabled).toBe(true);
      expect(result.current.settings.volume).toBe(0.35);
    });
  });

  describe("toggleSound", () => {
    it("should toggle sound on/off", () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      act(() => {
        result.current.toggleSound();
      });

      expect(result.current.settings.soundEnabled).toBe(false);

      act(() => {
        result.current.toggleSound();
      });

      expect(result.current.settings.soundEnabled).toBe(true);
    });

    it("should persist sound setting to localStorage", () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      act(() => {
        result.current.toggleSound();
      });

      const saved = JSON.parse(
        localStorage.getItem("thermacore-settings") || "{}",
      );
      expect(saved.soundEnabled).toBe(false);
    });
  });

  describe("setVolume", () => {
    it("should update volume", () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      act(() => {
        result.current.setVolume(0.7);
      });

      expect(result.current.settings.volume).toBe(0.7);
    });

    it("should persist volume to localStorage", () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      act(() => {
        result.current.setVolume(0.8);
      });

      const saved = JSON.parse(
        localStorage.getItem("thermacore-settings") || "{}",
      );
      expect(saved.volume).toBe(0.8);
    });

    it("should allow any volume value (no clamping)", () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      act(() => {
        result.current.setVolume(1.5);
      });

      expect(result.current.settings.volume).toBe(1.5);

      act(() => {
        result.current.setVolume(-0.5);
      });

      expect(result.current.settings.volume).toBe(-0.5);
    });
  });

  describe("setTemperatureUnit", () => {
    it("should update temperature unit to fahrenheit", () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      act(() => {
        result.current.setTemperatureUnit("fahrenheit");
      });

      expect(result.current.settings.temperatureUnit).toBe("fahrenheit");
    });

    it("should update temperature unit to celsius", () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      act(() => {
        result.current.setTemperatureUnit("celsius");
      });

      expect(result.current.settings.temperatureUnit).toBe("celsius");
    });

    it("should persist temperature unit to localStorage", () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      act(() => {
        result.current.setTemperatureUnit("fahrenheit");
      });

      const saved = JSON.parse(
        localStorage.getItem("thermacore-settings") || "{}",
      );
      expect(saved.temperatureUnit).toBe("fahrenheit");
    });
  });

  describe("Error handling", () => {
    it("should throw error when used outside provider", () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSettings());
      }).toThrow("useSettings must be used within a SettingsProvider");

      consoleError.mockRestore();
    });
  });

  describe("Multiple updates", () => {
    it("should handle multiple rapid updates", () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      act(() => {
        result.current.toggleSound();
        result.current.setVolume(0.5);
        result.current.setTemperatureUnit("fahrenheit");
      });

      expect(result.current.settings.soundEnabled).toBe(false);
      expect(result.current.settings.volume).toBe(0.5);
      expect(result.current.settings.temperatureUnit).toBe("fahrenheit");
    });

    it("should persist all settings after multiple updates", () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      act(() => {
        result.current.toggleSound();
        result.current.setVolume(0.6);
        result.current.setTemperatureUnit("fahrenheit");
      });

      const saved = JSON.parse(
        localStorage.getItem("thermacore-settings") || "{}",
      );
      expect(saved.soundEnabled).toBe(false);
      expect(saved.volume).toBe(0.6);
      expect(saved.temperatureUnit).toBe("fahrenheit");
    });
  });
});
