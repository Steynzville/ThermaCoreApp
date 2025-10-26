import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SidebarProvider, useSidebar } from "../context/SidebarContext";

describe("SidebarContext", () => {
  describe("Provider", () => {
    it("should provide default collapsed state", () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      expect(result.current.isCollapsed).toBe(false);
    });

    it("should provide setIsCollapsed function", () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      expect(typeof result.current.setIsCollapsed).toBe("function");
    });
  });

  describe("setIsCollapsed", () => {
    it("should collapse sidebar", () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.setIsCollapsed(true);
      });

      expect(result.current.isCollapsed).toBe(true);
    });

    it("should expand sidebar", () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.setIsCollapsed(true);
      });

      act(() => {
        result.current.setIsCollapsed(false);
      });

      expect(result.current.isCollapsed).toBe(false);
    });

    it("should toggle sidebar state", () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.setIsCollapsed((prev) => !prev);
      });

      expect(result.current.isCollapsed).toBe(true);

      act(() => {
        result.current.setIsCollapsed((prev) => !prev);
      });

      expect(result.current.isCollapsed).toBe(false);
    });
  });

  describe("Error handling", () => {
    it("should throw error when used outside provider", () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSidebar());
      }).toThrow("useSidebar must be used within a SidebarProvider");

      consoleError.mockRestore();
    });
  });

  describe("Multiple updates", () => {
    it("should handle rapid state changes", () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      act(() => {
        result.current.setIsCollapsed(true);
        result.current.setIsCollapsed(false);
        result.current.setIsCollapsed(true);
      });

      expect(result.current.isCollapsed).toBe(true);
    });

    it("should maintain state consistency", () => {
      const { result } = renderHook(() => useSidebar(), {
        wrapper: SidebarProvider,
      });

      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.setIsCollapsed(i % 2 === 0);
        });
      }

      expect(result.current.isCollapsed).toBe(false);
    });
  });
});
