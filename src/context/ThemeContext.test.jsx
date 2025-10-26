import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  describe("Provider", () => {
    it("should provide default theme values", () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.theme).toBeDefined();
      expect(result.current.actualTheme).toBeDefined();
    });

    it("should load theme from localStorage on mount", () => {
      localStorage.setItem("theme", "dark");

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

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

      // Wait for effect to run
      await new Promise((resolve) => setTimeout(resolve, 0));

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
        matches: false, // No dark preference
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

      // Wait for effect
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(localStorage.getItem("theme")).toBe("dark");

      act(() => {
        result.current.setTheme("light");
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(localStorage.getItem("theme")).toBe("light");
    });
  });
});
