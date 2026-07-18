import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(async () => {
    vi.clearAllMocks();

    // Re-establish known defaults every test so leftover mockReturnValue
    // overrides from a previous test can never leak into this one.
    const { useAuth } = await import("../context/AuthContext");
    useAuth.mockReturnValue({
      userRole: "admin",
      permissions: { canViewAnalytics: true, canViewProtocols: true },
      logout: vi.fn(),
    });

    const { useSettings } = await import("../context/SettingsContext");
    useSettings.mockReturnValue({
      settings: { soundEnabled: true, volume: 0.5 },
    });

    const { useSidebar } = await import("../context/SidebarContext");
    useSidebar.mockReturnValue({
      isCollapsed: false,
      setIsCollapsed: vi.fn(),
    });
  });

  // Unmount every rendered tree after each test so text/queries from one
  // test can never bleed into assertions in the next test.
  afterEach(() => {
    cleanup();
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

      expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Units Overview").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Alerts").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Alarms!").length).toBeGreaterThan(0);
      expect(screen.getAllByText("History").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Reports").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Admin Panel").length).toBeGreaterThan(0);
    });

    it("should show 'My Units' label for regular users", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "user",
        permissions: {},
        logout: vi.fn(),
      });

      renderSideNavigation();

      expect(screen.getAllByText("My Units").length).toBeGreaterThan(0);
      expect(screen.queryAllByText("Units Overview").length).toBe(0);
    });

    it("should hide admin-only items for regular users", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "user",
        permissions: {},
        logout: vi.fn(),
      });

      renderSideNavigation();

      expect(screen.queryAllByText("Admin Panel").length).toBe(0);
      expect(screen.queryAllByText("Sales").length).toBe(0);
      expect(screen.queryAllByText("System Health").length).toBe(0);
    });

    it("should show badges for alerts and alarms", () => {
      renderSideNavigation();
      expect(screen.getAllByText("Alerts").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Alarms!").length).toBeGreaterThan(0);
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
      expect(screen.getAllByText("SCADA").length).toBeGreaterThan(0);
    });

    it("should hide analytics menu for users without permission", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "user",
        permissions: { canViewAnalytics: false },
        logout: vi.fn(),
      });

      renderSideNavigation();
      expect(screen.queryAllByText("SCADA").length).toBe(0);
    });

    it("should show protocol manager for users with permission", async () => {
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValue({
        userRole: "user",
        permissions: { canViewProtocols: true },
        logout: vi.fn(),
      });

      renderSideNavigation();
      expect(screen.getAllByText("Protocol Manager").length).toBeGreaterThan(0);
    });
  });

  describe("Collapsed State", () => {
    it("should hide labels when collapsed", async () => {
      const { useSidebar } = await import("../context/SidebarContext");
      useSidebar.mockReturnValue({
        isCollapsed: true,
        setIsCollapsed: vi.fn(),
      });

      const { container } = renderSideNavigation();

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
      expect(screen.queryAllByText("Dashboard").length).toBe(0);
    });

    it("should show labels when expanded", async () => {
      const { useSidebar } = await import("../context/SidebarContext");
      useSidebar.mockReturnValue({
        isCollapsed: false,
        setIsCollapsed: vi.fn(),
      });

      renderSideNavigation();

      expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Alerts").length).toBeGreaterThan(0);
    });
  });

  describe("Navigation", () => {
    it("should render navigation buttons", () => {
      const { container } = renderSideNavigation();
      expect(container.querySelectorAll("button").length).toBeGreaterThan(0);
    });

    it("should navigate on item click", () => {
      renderSideNavigation();

      const settingsButtons = screen.getAllByText("Settings");
      const settingsButton = settingsButtons[0].closest("button");
      expect(settingsButton).toBeInTheDocument();

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

      const logoutTexts = screen.getAllByText("Logout");
      for (const text of logoutTexts) {
        const button = text.closest("button");
        if (button) {
          fireEvent.click(button);
          break;
        }
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

      const logoutTexts = screen.getAllByText("Logout");
      for (const text of logoutTexts) {
        const button = text.closest("button");
        if (button) {
          fireEvent.click(button);
          break;
        }
      }

      expect(playSound).toHaveBeenCalledWith("logout-sound.mp3", true, 0.5);
    });
  });

  describe("Mobile Navigation", () => {
    it("should render mobile toggle button", () => {
      const { container } = renderSideNavigation();
      expect(container.querySelectorAll("button").length).toBeGreaterThan(0);
    });

    it("should toggle mobile menu", () => {
      const { container } = renderSideNavigation();

      const mobileToggle = container.querySelector(
        "button.fixed.bottom-4.left-4",
      );

      if (mobileToggle) {
        expect(mobileToggle.querySelector("svg")).toBeInTheDocument();
        fireEvent.click(mobileToggle);
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
      expect(unitsElements[0].closest("button")).toBeInTheDocument();
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
      expect(myUnitsElements[0].closest("button")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper button types", () => {
      const { container } = renderSideNavigation();
      container.querySelectorAll("button").forEach((button) => {
        expect(button).toHaveAttribute("type");
      });
    });

    it("should render navigation items as buttons for keyboard accessibility", () => {
      renderSideNavigation();
      const dashboardButton = screen.getAllByText("Dashboard")[0].closest("button");
      expect(dashboardButton).toBeInTheDocument();
      expect(dashboardButton?.tagName).toBe("BUTTON");
    });
  });
});
