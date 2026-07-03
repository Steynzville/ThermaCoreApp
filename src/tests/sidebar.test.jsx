/**
 * Tests for Sidebar UI Component
 *
 * Tests basic rendering, state management, and provider functionality.
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "../components/ui/sidebar";

// Mock window methods for Sidebar
beforeEach(() => {
  window.addEventListener = vi.fn();
  window.removeEventListener = vi.fn();
  window.clearTimeout = vi.fn();
  window.setTimeout = vi.fn().mockImplementation((cb) => {
    cb();
    return 123;
  });
});

// Mock use-mobile hook
vi.mock("../hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

describe("Sidebar Component", () => {
  it("should render sidebar with provider", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarHeader>Header</SidebarHeader>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const elements = screen.getAllByText("Header");
    expect(elements.length).toBeGreaterThan(0);
  });

  it("should render sidebar menu with items", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>Test Item</SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const elements = screen.getAllByText("Test Item");
    expect(elements.length).toBeGreaterThan(0);
  });

  it("should render sidebar with footer", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
          <SidebarFooter>Footer Content</SidebarFooter>
        </Sidebar>
      </SidebarProvider>,
    );

    const elements = screen.getAllByText("Footer Content");
    expect(elements.length).toBeGreaterThan(0);
  });
});
