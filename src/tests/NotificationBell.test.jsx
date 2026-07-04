import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, afterEach, beforeAll, afterAll, describe, expect, it, vi } from "vitest";

import NotificationBell from "../components/NotificationBell";

const mockNavigate = vi.fn();

// Store original console.error for debugging
const originalConsoleError = console.error;

// Mock dependencies
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AuthContext with proper return values
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    userRole: "admin",
    user: { id: 1, username: "admin" },
    isAuthenticated: true,
  })),
}));

// Mock ThemeContext
vi.mock("../context/ThemeContext", () => ({
  useTheme: vi.fn(() => ({
    theme: "light",
    setTheme: vi.fn(),
  })),
}));

// Mock SettingsContext with proper return values
vi.mock("../context/SettingsContext", () => ({
  useSettings: vi.fn(() => ({
    settings: {
      soundEnabled: false,
      volume: 0.5,
    },
  })),
}));

// Mock deviceStatusService
vi.mock("../services/deviceStatusService", () => ({
  deviceStatusService: {
    addStatusChangeListener: vi.fn(() => vi.fn()), // Returns unsubscribe function
    generateDeviceStatusNotifications: vi.fn(() => []),
  },
}));

// Mock the notifications module with proper data structure
vi.mock("../utils/notifications", () => ({
  getAllNotifications: vi.fn(() => [
    {
      id: 7,
      type: "alarm",
      message: "ThermaCore Unit 003 - NH3 LEAK DETECTED",
      timestamp: "2025-09-09 15:30",
      alertData: {
        id: 7,
        type: "critical",
        title: "NH3 LEAK DETECTED",
        message: "Critical ammonia leak detected - immediate attention required",
        timestamp: "2025-09-09 15:30",
      },
    },
    {
      id: 1,
      type: "alert",
      message: "ThermaCore Unit 001 - Unit Offline",
      timestamp: "2025-09-09 14:45",
      alertData: {
        id: 1,
        type: "critical",
        title: "Unit Offline",
        message: "ThermaCore Unit 001 has gone offline and requires immediate attention",
        timestamp: "2025-09-09 14:45",
      },
    },
    {
      id: 2,
      type: "alert",
      message: "ThermaCore Unit 002 - Low Water Level",
      timestamp: "2025-09-09 14:15",
      alertData: {
        id: 2,
        type: "warning",
        title: "Low Water Level",
        message: "Water level has dropped below safe operating threshold",
        timestamp: "2025-09-09 14:15",
      },
    },
  ]),
  getRoleFilteredAlarms: vi.fn(() => [
    {
      id: 7,
      type: "alarm",
      message: "ThermaCore Unit 003 - NH3 LEAK DETECTED",
      timestamp: "2025-09-09 15:30",
      alertData: {
        id: 7,
        type: "critical",
        title: "NH3 LEAK DETECTED",
        message: "Critical ammonia leak detected - immediate attention required",
        timestamp: "2025-09-09 15:30",
      },
    },
  ]),
  getRoleFilteredAlerts: vi.fn(() => [
    {
      id: 1,
      type: "alert",
      message: "ThermaCore Unit 001 - Unit Offline",
      timestamp: "2025-09-09 14:45",
      alertData: {
        id: 1,
        type: "critical",
        title: "Unit Offline",
        message: "ThermaCore Unit 001 has gone offline and requires immediate attention",
        timestamp: "2025-09-09 14:45",
      },
    },
  ]),
  getDeviceStatusNotifications: vi.fn(() => []),
  getAllCurrentNotificationsForUnit: vi.fn(() => []),
}));

// Mock mockUnits
vi.mock("../data/mockUnits", () => ({
  units: [
    { id: "TC001", name: "ThermaCore Unit 001" },
    { id: "TC002", name: "ThermaCore Unit 002" },
    { id: "TC003", name: "ThermaCore Unit 003" },
    { id: "TC004", name: "ThermaCore Unit 004" },
    { id: "TC005", name: "ThermaCore Unit 005" },
    { id: "TC006", name: "ThermaCore Unit 006" },
    { id: "TC007", name: "ThermaCore Unit 007" },
    { id: "TC008", name: "ThermaCore Unit 008" },
    { id: "TC009", name: "ThermaCore Unit 009" },
    { id: "TC010", name: "ThermaCore Unit 010" },
    { id: "TC011", name: "ThermaCore Unit 011" },
    { id: "TC012", name: "ThermaCore Unit 012" },
    { id: "TC013", name: "ThermaCore Unit 013" },
    { id: "TC014", name: "ThermaCore Unit 014" },
  ],
}));

const renderNotificationBell = (props = {}) => {
  return render(
    <BrowserRouter>
      <NotificationBell {...props} />
    </BrowserRouter>,
  );
};

describe("NotificationBell", () => {
  beforeAll(() => {
    // Silence React warnings during tests but log errors
    console.error = (...args) => {
      if (args[0]?.includes && args[0].includes('Warning:')) {
        // Filter out React warnings
        return;
      }
      originalConsoleError(...args);
    };
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    // Reset localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("should render without crashing", () => {
    const { container } = renderNotificationBell();
    
    expect(container).toBeTruthy();
    expect(container.firstChild).toBeTruthy();
  });

  describe("Rendering", () => {
    it("should render notification bell button", () => {
      const { container } = renderNotificationBell();

      // Look for the bell button by its aria-label or class
      const buttons = screen.getAllByRole("button");
      // Find the button that contains the Bell icon or has the right classes
      const bellButton = buttons.find(btn => 
        btn.querySelector('svg.lucide-bell') || 
        btn.className.includes('relative') ||
        btn.className.includes('p-2')
      );
      
      expect(bellButton).toBeDefined();
    });

    it("should show notification count badge", async () => {
      renderNotificationBell();

      // Wait for the badge to appear
      await waitFor(
        () => {
          // The badge should show the count (2 notifications)
          const badges = screen.getAllByText("2");
          expect(badges.length).toBeGreaterThan(0);
          
          // Verify at least one badge has the right styling
          const notificationBadge = badges.find(badge => 
            badge.className.includes('bg-red-500') || 
            badge.className.includes('rounded-full') ||
            badge.className.includes('-top-1')
          );
          expect(notificationBadge).toBeDefined();
        },
        { timeout: 3000 },
      );
    });

    it("should apply custom className", () => {
      const { container } = renderNotificationBell({
        className: "custom-class",
      });

      // Find the container with the custom class
      const bellContainer = container.querySelector(".custom-class");
      expect(bellContainer).toBeInTheDocument();
    });

    it("should show no badge when no notifications", async () => {
      // Override the mock to return empty array
      const { getAllNotifications } = await import("../utils/notifications");
      getAllNotifications.mockReturnValueOnce([]);

      renderNotificationBell();

      // Wait to ensure no badge appears
      await waitFor(
        () => {
          const badges = screen.queryAllByText(/[1-9]/);
          // There should be no number badges
          expect(badges.length).toBe(0);
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Notification Panel", () => {
    it("should open notification panel on bell click", async () => {
      renderNotificationBell();

      const buttons = screen.getAllByRole("button");
      // Find the bell button (first button with Bell icon)
      const bellButton = buttons.find(btn => 
        btn.querySelector('svg.lucide-bell') || 
        btn.className.includes('relative')
      );
      
      expect(bellButton).toBeDefined();
      if (bellButton) {
        fireEvent.click(bellButton);
      }

      await waitFor(
        () => {
          const notificationHeaders = screen.getAllByText(/Notifications/i);
          expect(notificationHeaders.length).toBeGreaterThan(0);
        },
        { timeout: 3000 },
      );
    });

    it("should close notification panel on close button click", async () => {
      renderNotificationBell();

      const buttons = screen.getAllByRole("button");
      const bellButton = buttons.find(btn => 
        btn.querySelector('svg.lucide-bell') || 
        btn.className.includes('relative')
      );
      
      expect(bellButton).toBeDefined();
      if (bellButton) {
        fireEvent.click(bellButton);
      }

      // Wait for panel to open
      await waitFor(
        () => {
          const notificationHeaders = screen.getAllByText(/Notifications/i);
          expect(notificationHeaders.length).toBeGreaterThan(0);
        },
        { timeout: 3000 },
      );

      // Find and click close button
      const closeButtons = screen.getAllByRole("button");
      const closeButton = closeButtons.find((btn) =>
        btn.querySelector("svg")?.classList.contains("lucide-x")
      );

      if (closeButton) {
        fireEvent.click(closeButton);
      }

      // Wait for panel to close
      await waitFor(
        () => {
          // The panel should no longer be visible
          const panels = screen.queryAllByText(/View all notifications/i);
          expect(panels.length).toBe(0);
        },
        { timeout: 3000 },
      );
    });

    it("should display notifications in panel", async () => {
      renderNotificationBell();

      const buttons = screen.getAllByRole("button");
      const bellButton = buttons.find(btn => 
        btn.querySelector('svg.lucide-bell') || 
        btn.className.includes('relative')
      );
      
      expect(bellButton).toBeDefined();
      if (bellButton) {
        fireEvent.click(bellButton);
      }

      await waitFor(
        () => {
          // Check for NH3 leak notification
          const nh3Elements = screen.getAllByText(/NH3 LEAK DETECTED/i);
          expect(nh3Elements.length).toBeGreaterThan(0);
          
          // Check for Unit Offline notification
          const offlineElements = screen.getAllByText(/Unit Offline/i);
          expect(offlineElements.length).toBeGreaterThan(0);
        },
        { timeout: 3000 },
      );
    });

    it("should show 'No notifications' when empty", async () => {
      // Override mock to return empty array
      const { getAllNotifications } = await import("../utils/notifications");
      getAllNotifications.mockReturnValueOnce([]);

      renderNotificationBell();

      const buttons = screen.getAllByRole("button");
      const bellButton = buttons.find(btn => 
        btn.querySelector('svg.lucide-bell') || 
        btn.className.includes('relative')
      );
      
      expect(bellButton).toBeDefined();
      if (bellButton) {
        fireEvent.click(bellButton);
      }

      await waitFor(
        () => {
          const emptyElements = screen.getAllByText(/No notifications/i);
          expect(emptyElements.length).toBeGreaterThan(0);
        },
        { timeout: 3000 },
      );
    });

    it("should navigate to history when 'View all notifications' is clicked", async () => {
      renderNotificationBell();

      const buttons = screen.getAllByRole("button");
      const bellButton = buttons.find(btn => 
        btn.querySelector('svg.lucide-bell') || 
        btn.className.includes('relative')
      );
      
      expect(bellButton).toBeDefined();
      if (bellButton) {
        fireEvent.click(bellButton);
      }

      // Wait for panel to open
      await waitFor(
        () => {
          const headers = screen.getAllByText(/Notifications/i);
          expect(headers.length).toBeGreaterThan(0);
        },
        { timeout: 3000 },
      );

      // Find and click "View all notifications" button
      const viewAllButtons = screen.getAllByText(/View all notifications/i);
      expect(viewAllButtons.length).toBeGreaterThan(0);
      
      fireEvent.click(viewAllButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith("/history");
    });

    it("should navigate to unit details when notification is clicked", async () => {
      renderNotificationBell();

      const buttons = screen.getAllByRole("button");
      const bellButton = buttons.find(btn => 
        btn.querySelector('svg.lucide-bell') || 
        btn.className.includes('relative')
      );
      
      expect(bellButton).toBeDefined();
      if (bellButton) {
        fireEvent.click(bellButton);
      }

      // Wait for panel to open
      await waitFor(
        () => {
          const headers = screen.getAllByText(/Notifications/i);
          expect(headers.length).toBeGreaterThan(0);
        },
        { timeout: 3000 },
      );

      // Find and click a notification
      const notificationElements = screen.getAllByText(/ThermaCore Unit 003 - NH3 LEAK DETECTED/i);
      expect(notificationElements.length).toBeGreaterThan(0);
      
      // Click the parent button
      const parentButton = notificationElements[0].closest('button');
      if (parentButton) {
        fireEvent.click(parentButton);
      }

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe("Role-based filtering", () => {
    it("should show notifications for user role", async () => {
      // Change the auth mock to return user role
      const { useAuth } = await import("../context/AuthContext");
      useAuth.mockReturnValueOnce({
        userRole: "user",
        user: { id: 2, username: "user" },
        isAuthenticated: true,
      });

      renderNotificationBell();

      const buttons = screen.getAllByRole("button");
      const bellButton = buttons.find(btn => 
        btn.querySelector('svg.lucide-bell') || 
        btn.className.includes('relative')
      );
      
      expect(bellButton).toBeDefined();
      if (bellButton) {
        fireEvent.click(bellButton);
      }

      // Wait for panel to open and check for notifications
      await waitFor(
        () => {
          const headers = screen.getAllByText(/Notifications/i);
          expect(headers.length).toBeGreaterThan(0);
        },
        { timeout: 3000 },
      );
    });
  });
});
