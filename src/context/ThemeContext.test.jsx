import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "../context/ThemeContext";

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage with proper persistence
let store = {};
const localStorageMock = {
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

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("ThemeContext", () => {
  beforeEach(() => {
    // Reset localStorage before each test
    localStorage.clear();
    // Remove dark class from document
    document.documentElement.classList.remove("dark");
    // Reset matchMedia
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  // Helper to wait for effects to run - using flushPromises approach
  const waitForEffects = async () => {
    await act(async () => {
      // Use a combination of microtask and macrotask to ensure all effects have run
      await new Promise((resolve) => {
        // Use queueMicrotask to run after microtasks
        queueMicrotask(() => {
          // Then use setTimeout to run after macrotasks
          setTimeout(resolve, 0);
        });
      });
    });
  };

  describe("Provider", () => {
    it("should provide default theme values", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBeDefined();
      expect(result.current.actualTheme).toBeDefined();
    });

    it("should load theme from localStorage on mount", async () => {
      localStorage.setItem("theme", "dark");

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // Wait for useEffect to run
      await waitForEffects();

      expect(result.current.theme).toBe("dark");
    });

    it("should default to auto theme when no saved preference", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe("auto");
    });

    it("should support auto theme preference", () => {
      localStorage.setItem("theme", "auto");

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBe("auto");
    });
  });

  describe("setTheme", () => {
    it("should change theme to dark", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("dark");
      });

      expect(result.current.theme).toBe("dark");
    });

    it("should change theme to light", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("light");
      });

      expect(result.current.theme).toBe("light");
    });

    it("should change theme to auto", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("auto");
      });

      expect(result.current.theme).toBe("auto");
    });

    it("should persist theme to localStorage", async () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("dark");
      });

      // Wait for the effect to run and save to localStorage
      await waitForEffects();

      expect(localStorage.getItem("theme")).toBe("dark");
    });

    it("should apply dark class to document element when theme is dark", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("dark");
      });

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should remove dark class when theme is light", () => {
      document.documentElement.classList.add("dark");

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("light");
      });

      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("actualTheme", () => {
    it("should return dark when theme is dark", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("dark");
      });

      expect(result.current.actualTheme).toBe("dark");
    });

    it("should return light when theme is light", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("light");
      });

      expect(result.current.actualTheme).toBe("light");
    });

    it("should return system preference when theme is auto", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("auto");
      });

      // actualTheme should be either 'light' or 'dark' based on system
      expect(["light", "dark"]).toContain(result.current.actualTheme);
    });
  });

  describe("toggleTheme", () => {
    it("should toggle from light to dark", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("light");
      });

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("dark");
    });

    it("should toggle from dark to light", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("dark");
      });

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("light");
    });
  });

  describe("System theme detection", () => {
    it("should detect dark mode from system preferences when in auto mode", () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("auto");
      });

      expect(result.current.actualTheme).toBe("dark");
    });

    it("should detect light mode from system preferences when in auto mode", () => {
      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("auto");
      });

      expect(result.current.actualTheme).toBe("light");
    });
  });

  describe("Error handling", () => {
    it("should throw error when used outside provider", () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow("useTheme must be used within a ThemeProvider");

      consoleError.mockRestore();
    });
  });

  describe("Theme transitions", () => {
    it("should handle multiple theme changes", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("dark");
      });
      expect(result.current.theme).toBe("dark");

      act(() => {
        result.current.setTheme("light");
      });
      expect(result.current.theme).toBe("light");

      act(() => {
        result.current.setTheme("auto");
      });
      expect(result.current.theme).toBe("auto");
    });

    it("should persist theme across multiple changes", async () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme("dark");
      });

      await waitForEffects();

      expect(localStorage.getItem("theme")).toBe("dark");

      act(() => {
        result.current.setTheme("light");
      });

      await waitForEffects();

      expect(localStorage.getItem("theme")).toBe("light");
    });
  });
});
