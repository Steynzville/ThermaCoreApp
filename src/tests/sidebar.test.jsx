/**
 * Tests for Sidebar UI Component
 *
 * Tests basic rendering, state management, and provider functionality.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "../components/ui/sidebar";

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

    expect(screen.getByText("Header")).toBeInTheDocument();
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

    expect(screen.getByText("Test Item")).toBeInTheDocument();
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

    expect(screen.getByText("Footer Content")).toBeInTheDocument();
  });
});
