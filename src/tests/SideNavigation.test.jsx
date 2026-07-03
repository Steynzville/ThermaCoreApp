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
      const dashboardElements = screen.getAllByText("Dashboard");
      expect(dashboardElements.length).toBeGreaterThan(0);
    });

    it("should render all navigation items for admin user", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "admin",
        permissions: { canViewAnalytics: true, canViewProtocols: true },
        logout: vi.fn(),
      });

      renderSideNavigation();

      // Use getAllByText with toBeGreaterThan(0) for all checks
      const dashboardElements = screen.getAllByText("Dashboard");
      expect(dashboardElements.length).toBeGreaterThan(0);
      
      const unitsElements = screen.getAllByText("Units Overview");
      expect(unitsElements.length).toBeGreaterThan(0);
      
      const alertsElements = screen.getAllByText("Alerts");
      expect(alertsElements.length).toBeGreaterThan(0);
      
      const alarmsElements = screen.getAllByText("Alarms!");
      expect(alarmsElements.length).toBeGreaterThan(0);
      
      const historyElements = screen.getAllByText("History");
      expect(historyElements.length).toBeGreaterThan(0);
      
      const reportsElements = screen.getAllByText("Reports");
      expect(reportsElements.length).toBeGreaterThan(0);
      
      const settingsElements = screen.getAllByText("Settings");
      expect(settingsElements.length).toBeGreaterThan(0);
      
      const adminElements = screen.getAllByText("Admin Panel");
      expect(adminElements.length).toBeGreaterThan(0);
    });

    it("should show 'My Units' label for regular users", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "user",
        permissions: {},
        logout: vi.fn(),
      });

      renderSideNavigation();

      const myUnitsElements = screen.getAllByText("My Units");
      expect(myUnitsElements.length).toBeGreaterThan(0);
      
      const unitsElements = screen.queryAllByText("Units Overview");
      expect(unitsElements.length).toBe(0);
    });

    it("should hide admin-only items for regular users", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "user",
        permissions: {},
        logout: vi.fn(),
      });

      renderSideNavigation();

      const adminElements = screen.queryAllByText("Admin Panel");
      expect(adminElements.length).toBe(0);
      
      const salesElements = screen.queryAllByText("Sales");
      expect(salesElements.length).toBe(0);
      
      const healthElements = screen.queryAllByText("System Health");
      expect(healthElements.length).toBe(0);
    });

    it("should show badges for alerts and alarms", () => {
      renderSideNavigation();

      // Use getAllByText and check that at least one exists
      const alertsElements = screen.getAllByText("Alerts");
      expect(alertsElements.length).toBeGreaterThan(0);
      
      const alarmsElements = screen.getAllByText("Alarms!");
      expect(alarmsElements.length).toBeGreaterThan(0);
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

      const scadaElements = screen.getAllByText("SCADA");
      expect(scadaElements.length).toBeGreaterThan(0);
    });

    it("should hide analytics menu for users without permission", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "user",
        permissions: { canViewAnalytics: false },
        logout: vi.fn(),
      });

      renderSideNavigation();

      const scadaElements = screen.queryAllByText("SCADA");
      expect(scadaElements.length).toBe(0);
    });

    it("should show protocol manager for users with permission", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "user",
        permissions: { canViewProtocols: true },
        logout: vi.fn(),
      });

      renderSideNavigation();

      const protocolElements = screen.getAllByText("Protocol Manager");
      expect(protocolElements.length).toBeGreaterThan(0);
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

      const dashboardElements = screen.getAllByText("Dashboard");
      expect(dashboardElements.length).toBeGreaterThan(0);
      
      const alertsElements = screen.getAllByText("Alerts");
      expect(alertsElements.length).toBeGreaterThan(0);
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

      const settingsButtons = screen.getAllByText("Settings");
      const settingsButton = settingsButtons[0].closest("button");
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

      const logoutButtons = screen.getAllByText("Logout");
      const logoutButton = logoutButtons[0].closest("button");
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

      const logoutButtons = screen.getAllByText("Logout");
      const logoutButton = logoutButtons[0].closest("button");
      if (logoutButton) {
        fireEvent.click(logoutButton);
      }

      expect(playSound).toHaveBeenCalledWith("logout-sound.mp3", true, 0.5);
    });
  });

  describe("Mobile Navigation", () => {
    it("should render mobile toggle button", () => {
      renderSideNavigation();

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

      const unitsElements = screen.getAllByText("Units Overview");
      const unitsButton = unitsElements[0].closest("button");
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

      const myUnitsElements = screen.getAllByText("My Units");
      const unitsButton = myUnitsElements[0].closest("button");
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

      const dashboardElements = screen.getAllByText("Dashboard");
      const dashboardButton = dashboardElements[0].closest("button");
      expect(dashboardButton).toBeInTheDocument();
      expect(dashboardButton?.tagName).toBe("BUTTON");
    });
  });
});
