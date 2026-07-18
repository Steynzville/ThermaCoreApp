import { act, renderHook, waitFor } from "@testing-library/react";
import { cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { SettingsProvider, useSettings } from "../context/SettingsContext";

// Mock localStorage with a proper mock that works with the component
const createLocalStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => {
      return store[key] || null;
    },
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
};

// Setup localStorage mock before each test
const setupLocalStorageMock = () => {
  const mock = createLocalStorageMock();
  Object.defineProperty(window, "localStorage", {
    value: mock,
    writable: true,
    configurable: true,
  });
  return mock;
};

describe("SettingsContext", () => {
  let localStorageMock;

  beforeEach(() => {
    localStorageMock = setupLocalStorageMock();
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
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
      localStorageMock.setItem(
        "thermacore-settings",
        JSON.stringify(savedSettings),
      );

      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      // The settings should be loaded synchronously from the initial state
      expect(result.current.settings.soundEnabled).toBe(false);
      expect(result.current.settings.volume).toBe(0.5);
      expect(result.current.settings.temperatureUnit).toBe("fahrenheit");
    });

    it("should handle invalid JSON in localStorage gracefully", () => {
      localStorageMock.setItem("thermacore-settings", "invalid json");

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

    it("should persist sound setting to localStorage", async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      act(() => {
        result.current.toggleSound();
      });

      // Use waitFor to wait for the effect to run
      await waitFor(() => {
        const saved = JSON.parse(
          localStorageMock.getItem("thermacore-settings") || "{}",
        );
        expect(saved.soundEnabled).toBe(false);
      });
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

    it("should persist volume to localStorage", async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      act(() => {
        result.current.setVolume(0.8);
      });

      await waitFor(() => {
        const saved = JSON.parse(
          localStorageMock.getItem("thermacore-settings") || "{}",
        );
        expect(saved.volume).toBe(0.8);
      });
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

    it("should persist temperature unit to localStorage", async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      act(() => {
        result.current.setTemperatureUnit("fahrenheit");
      });

      await waitFor(() => {
        const saved = JSON.parse(
          localStorageMock.getItem("thermacore-settings") || "{}",
        );
        expect(saved.temperatureUnit).toBe("fahrenheit");
      });
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

    it("should persist all settings after multiple updates", async () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: SettingsProvider,
      });

      act(() => {
        result.current.toggleSound();
        result.current.setVolume(0.6);
        result.current.setTemperatureUnit("fahrenheit");
      });

      await waitFor(() => {
        const saved = JSON.parse(
          localStorageMock.getItem("thermacore-settings") || "{}",
        );
        expect(saved.soundEnabled).toBe(false);
        expect(saved.volume).toBe(0.6);
        expect(saved.temperatureUnit).toBe("fahrenheit");
      });
    });
  });
});
