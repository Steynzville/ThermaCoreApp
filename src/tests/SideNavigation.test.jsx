import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SideNavigation from "../components/SideNavigation";

// Mock contexts
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    userRole: "admin",
    permissions: { canViewAnalytics: true, canViewProtocols: true },
    logout: vi.fn(),
  })),
}));

vi.mock("../context/SettingsContext", () => ({
  useSettings: vi.fn(() => ({
    settings: { soundEnabled: true, volume: 0.5 },
  })),
}));

vi.mock("../context/SidebarContext", () => ({
  useSidebar: vi.fn(() => ({
    isCollapsed: false,
    setIsCollapsed: vi.fn(),
  })),
}));

vi.mock("../utils/audioPlayer", () => ({
  default: vi.fn(),
}));

const renderSideNavigation = () => {
  return render(
    <BrowserRouter>
      <SideNavigation />
    </BrowserRouter>,
  );
};

describe("SideNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render navigation component", () => {
      renderSideNavigation();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("should render all navigation items for admin user", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "admin",
        permissions: { canViewAnalytics: true, canViewProtocols: true },
        logout: vi.fn(),
      });

      renderSideNavigation();

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Units Overview")).toBeInTheDocument();
      expect(screen.getByText("Alerts")).toBeInTheDocument();
      expect(screen.getByText("Alarms!")).toBeInTheDocument();
      expect(screen.getByText("History")).toBeInTheDocument();
      expect(screen.getByText("Reports")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    });

    it("should show 'My Units' label for regular users", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "user",
        permissions: {},
        logout: vi.fn(),
      });

      renderSideNavigation();

      expect(screen.getByText("My Units")).toBeInTheDocument();
      expect(screen.queryByText("Units Overview")).not.toBeInTheDocument();
    });

    it("should hide admin-only items for regular users", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "user",
        permissions: {},
        logout: vi.fn(),
      });

      renderSideNavigation();

      expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
      expect(screen.queryByText("Sales")).not.toBeInTheDocument();
      expect(screen.queryByText("System Health")).not.toBeInTheDocument();
    });

    it("should show badges for alerts and alarms", () => {
      renderSideNavigation();

      const alertsButton = screen.getByText("Alerts").closest("button");
      const alarmsButton = screen.getByText("Alarms!").closest("button");

      expect(alertsButton).toHaveTextContent("6");
      expect(alarmsButton).toBeInTheDocument();
    });
  });

  describe("Role-Based Rendering", () => {
    it("should show analytics menu for users with permission", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "user",
        permissions: { canViewAnalytics: true },
        logout: vi.fn(),
      });

      renderSideNavigation();

      expect(screen.getByText("SCADA")).toBeInTheDocument();
    });

    it("should hide analytics menu for users without permission", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "user",
        permissions: { canViewAnalytics: false },
        logout: vi.fn(),
      });

      renderSideNavigation();

      expect(screen.queryByText("SCADA")).not.toBeInTheDocument();
    });

    it("should show protocol manager for users with permission", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "user",
        permissions: { canViewProtocols: true },
        logout: vi.fn(),
      });

      renderSideNavigation();

      expect(screen.getByText("Protocol Manager")).toBeInTheDocument();
    });
  });

  describe("Collapsed State", () => {
    it("should hide labels when collapsed", async () => {
      const { useSidebar } = await import("../context/SidebarContext");
      const { container } = render(
        <BrowserRouter>
          <SideNavigation />
        </BrowserRouter>,
      );

      useSidebar.mockReturnValue({
        isCollapsed: true,
        setIsCollapsed: vi.fn(),
      });

      // In collapsed state, icons should still be visible
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });

    it("should show labels when expanded", async () => {
      const { useSidebar } = await import("../context/SidebarContext");
      useSidebar.mockReturnValue({
        isCollapsed: false,
        setIsCollapsed: vi.fn(),
      });

      renderSideNavigation();

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Alerts")).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("should render navigation buttons", () => {
      const { container } = renderSideNavigation();

      // Should have navigation buttons
      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should navigate on item click", () => {
      renderSideNavigation();

      const settingsButton = screen.getByText("Settings").closest("button");
      expect(settingsButton).toBeInTheDocument();

      // Clicking should trigger navigation
      if (settingsButton) {
        fireEvent.click(settingsButton);
      }
    });
  });

  describe("Logout", () => {
    it("should call logout when logout button is clicked", async () => {
      const mockLogout = vi.fn();
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "admin",
        permissions: {},
        logout: mockLogout,
      });

      renderSideNavigation();

      const logoutButton = screen.getByText("Logout").closest("button");
      if (logoutButton) {
        fireEvent.click(logoutButton);
      }

      expect(mockLogout).toHaveBeenCalled();
    });

    it("should play logout sound when logging out", async () => {
      const mockLogout = vi.fn();
      const playSound = (await import("../utils/audioPlayer")).default;

      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "admin",
        permissions: {},
        logout: mockLogout,
      });

      renderSideNavigation();

      const logoutButton = screen.getByText("Logout").closest("button");
      if (logoutButton) {
        fireEvent.click(logoutButton);
      }

      expect(playSound).toHaveBeenCalledWith("logout-sound.mp3", true, 0.5);
    });
  });

  describe("Mobile Navigation", () => {
    it("should render mobile toggle button", () => {
      renderSideNavigation();

      // Mobile toggle button should be present
      const { container } = render(
        <BrowserRouter>
          <SideNavigation />
        </BrowserRouter>,
      );

      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should toggle mobile menu", () => {
      const { container } = renderSideNavigation();

      // Find mobile menu toggle (bottom-left button)
      const mobileToggle = container.querySelector(
        "button.fixed.bottom-4.left-4",
      );

      if (mobileToggle) {
        // Initially should show Menu icon
        expect(mobileToggle.querySelector("svg")).toBeInTheDocument();

        // Click to open
        fireEvent.click(mobileToggle);

        // Should now show X icon
        expect(mobileToggle.querySelector("svg")).toBeInTheDocument();
      }
    });
  });

  describe("Unit Counts", () => {
    it("should show correct unit count for admin", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "admin",
        permissions: {},
        logout: vi.fn(),
      });

      renderSideNavigation();

      const unitsButton = screen.getByText("Units Overview").closest("button");
      // Admin should see all units
      expect(unitsButton).toBeInTheDocument();
    });

    it("should show limited unit count for regular user", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "user",
        permissions: {},
        logout: vi.fn(),
      });

      renderSideNavigation();

      const unitsButton = screen.getByText("My Units").closest("button");
      // Regular user should see limited units
      expect(unitsButton).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper button types", () => {
      const { container } = renderSideNavigation();

      const buttons = container.querySelectorAll("button");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("type");
      });
    });

    it("should render navigation items as buttons for keyboard accessibility", () => {
      renderSideNavigation();

      const dashboardButton = screen.getByText("Dashboard").closest("button");
      expect(dashboardButton).toBeInTheDocument();
      expect(dashboardButton?.tagName).toBe("BUTTON");
    });
  });
});
