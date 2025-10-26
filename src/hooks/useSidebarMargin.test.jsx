import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSidebarMargin } from "./useSidebarMargin";

// Mock the SidebarContext
vi.mock("../context/SidebarContext", () => ({
  useSidebar: vi.fn(),
}));

import { useSidebar } from "../context/SidebarContext";

describe("useSidebarMargin", () => {
  it("should return expanded margin classes when sidebar is not collapsed", () => {
    useSidebar.mockReturnValue({ isCollapsed: false });

    const { result } = renderHook(() => useSidebarMargin());
    expect(result.current).toBe("lg:ml-56 xl:ml-64");
  });

  it("should return collapsed margin classes when sidebar is collapsed", () => {
    useSidebar.mockReturnValue({ isCollapsed: true });

    const { result } = renderHook(() => useSidebarMargin());
    expect(result.current).toBe("lg:ml-16 xl:ml-20");
  });
});
