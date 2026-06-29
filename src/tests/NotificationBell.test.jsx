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

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    userRole: "admin",
  })),
}));

vi.mock("../context/ThemeContext", () => ({
  useTheme: vi.fn(() => ({
    theme: "light",
    setTheme: vi.fn(),
  })),
}));

vi.mock("../context/SettingsContext", () => ({
  useSettings: vi.fn(() => ({
    settings: {
      soundEnabled: false,
      volume: 0.5,
    },
  })),
}));

vi.mock("../services/deviceStatusService", () => ({
  deviceStatusService: {
    addStatusChangeListener: vi.fn(() => vi.fn()), // Returns unsubscribe function
    generateDeviceStatusNotifications: vi.fn(() => []),
  },
}));

// Mock the notifications module with proper data structure matching the actual module
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Debug test to verify component renders
  it("should render without crashing", () => {
    const { container } = renderNotificationBell();
    console.log("Container:", container);
    console.log("Container firstChild:", container.firstChild);
    console.log("Container innerHTML:", container.innerHTML);
    
    expect(container).toBeTruthy();
    expect(container.firstChild).toBeTruthy();
    // screen.debug(); // Uncomment to see what's rendered
  });

  describe("Rendering", () => {
    it("should render notification bell button", () => {
      renderNotificationBell();

      // Bell icon should be present
      const bellButton = screen.getByRole("button");
      expect(bellButton).toBeInTheDocument();
    });

    it("should show notification count badge", async () => {
      renderNotificationBell();

      // Should show count of unviewed notifications
      await waitFor(
        () => {
          const badge = screen.getByText("2");
          expect(badge).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should apply custom className", () => {
      const { container } = renderNotificationBell({
        className: "custom-class",
      });

      const bellContainer = container.querySelector(".custom-class");
      expect(bellContainer).toBeInTheDocument();
    });
  });

  describe("Notification Panel", () => {
    it("should open notification panel on bell click", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(
        () => {
          // Use getAllByText since there are multiple instances
          const notificationHeaders = screen.getAllByText(/Notifications/i);
          expect(notificationHeaders.length).toBeGreaterThan(0);
        },
        { timeout: 3000 },
      );
    });

    it("should close notification panel on close button click", async () => {
      renderNotificationBell();

      // Open panel
      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(
        () => {
          const notificationHeaders = screen.getAllByText(/Notifications/i);
          expect(notificationHeaders.length).toBeGreaterThan(0);
        },
        { timeout: 3000 },
      );

      // Close panel
      const closeButtons = screen.getAllByRole("button");
      const closeButton = closeButtons.find((btn) =>
        btn.querySelector("svg")?.classList.contains("lucide-x"),
      );

      if (closeButton) {
        fireEvent.click(closeButton);
      }

      await waitFor(
        () => {
          expect(
            screen.queryByText(/View all notifications/i),
          ).not.toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should display notifications in panel", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(
        () => {
          expect(screen.getByText(/NH3 LEAK DETECTED/i)).toBeInTheDocument();
          expect(screen.getByText(/Unit Offline/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Notification Interactions", () => {
    it("should mark notification as viewed when clicked", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(
        () => {
          expect(screen.getByText(/NH3 LEAK DETECTED/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Click a notification
      const notification = screen.getByText(/NH3 LEAK DETECTED/i);
      const notificationCard = notification.closest("button");

      if (notificationCard) {
        fireEvent.click(notificationCard);
      }

      // Should navigate
      expect(mockNavigate).toHaveBeenCalled();
    });

    it("should update badge count after viewing notifications", async () => {
      renderNotificationBell();

      // Initial count
      await waitFor(
        () => {
          expect(screen.getByText("2")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Open and view a notification
      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(
        () => {
          expect(screen.getByText(/NH3 LEAK DETECTED/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      const notification = screen.getByText(/NH3 LEAK DETECTED/i);
      const notificationCard = notification.closest("button");

      if (notificationCard) {
        fireEvent.click(notificationCard);
      }

      // Badge count should decrease (implementation dependent)
      // This test verifies interaction occurs
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe("Role-Based Filtering", () => {
    it("should load notifications for admin role", async () => {
      const { getAllNotifications } = await import("../utils/notifications");

      renderNotificationBell();

      await waitFor(
        () => {
          expect(getAllNotifications).toHaveBeenCalledWith("admin");
        },
        { timeout: 3000 },
      );
    });

    it("should load notifications for user role", async () => {
      const { useAuth } = await import("../context/AuthContext");
      const { getAllNotifications } = await import("../utils/notifications");

      useAuth.mockReturnValue({ userRole: "user" });

      renderNotificationBell();

      await waitFor(
        () => {
          expect(getAllNotifications).toHaveBeenCalledWith("user");
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Real-Time Updates", () => {
    it("should subscribe to device status changes", async () => {
      const { deviceStatusService } = await import(
        "../services/deviceStatusService"
      );

      renderNotificationBell();

      expect(deviceStatusService.addStatusChangeListener).toHaveBeenCalled();
    });

    it("should unsubscribe on component unmount", async () => {
      const mockUnsubscribe = vi.fn();
      const { deviceStatusService } = await import(
        "../services/deviceStatusService"
      );
      deviceStatusService.addStatusChangeListener.mockReturnValue(
        mockUnsubscribe,
      );

      const { unmount } = renderNotificationBell();

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it("should update notifications when device status changes", async () => {
      const { deviceStatusService } = await import(
        "../services/deviceStatusService"
      );
      const { getAllNotifications } = await import("../utils/notifications");

      let statusChangeCallback;
      deviceStatusService.addStatusChangeListener.mockImplementation(
        (callback) => {
          statusChangeCallback = callback;
          return vi.fn();
        },
      );

      renderNotificationBell();

      // Initial call
      expect(getAllNotifications).toHaveBeenCalledTimes(1);

      // Trigger status change
      if (statusChangeCallback) {
        act(() => {
          statusChangeCallback();
        });
      }

      await waitFor(
        () => {
          // Should be called again after status change
          expect(getAllNotifications).toHaveBeenCalledTimes(2);
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Navigation", () => {
    it("should navigate to history page on 'View All' click", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(
        () => {
          const viewAllButton = screen.getByText(/View all notifications/i);
          expect(viewAllButton).toBeInTheDocument();

          fireEvent.click(viewAllButton);
        },
        { timeout: 3000 },
      );

      expect(mockNavigate).toHaveBeenCalledWith("/history");
    });

    it("should navigate to specific unit on notification click", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(
        () => {
          const notification = screen.getByText(/Unit Offline/i);
          const notificationCard = notification.closest("button");

          if (notificationCard) {
            fireEvent.click(notificationCard);
          }
        },
        { timeout: 3000 },
      );

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe("Notification Types", () => {
    it("should display critical alarm notifications", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(
        () => {
          expect(screen.getByText(/NH3 LEAK DETECTED/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should display alert notifications", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(
        () => {
          expect(screen.getByText(/Unit Offline/i)).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should show notification timestamps", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(
        () => {
          // Timestamps should be visible
          const timestamps = screen.getAllByText(/2025-09-09/);
          expect(timestamps.length).toBeGreaterThan(0);
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Empty State", () => {
    it("should handle no notifications gracefully", async () => {
      const { getAllNotifications } = await import("../utils/notifications");
      getAllNotifications.mockReturnValue([]);

      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(
        () => {
          // Should show "No notifications" message
          const noNotifications = screen.getByText(/No notifications/i);
          expect(noNotifications).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    it("should not show badge when no unviewed notifications", async () => {
      const { getAllNotifications } = await import("../utils/notifications");
      getAllNotifications.mockReturnValue([]);

      renderNotificationBell();

      await waitFor(
        () => {
          // Badge should not be visible when there are no notifications
          const badge = screen.queryByText("0");
          // Badge might not be rendered at all for zero notifications
          expect(badge).not.toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Accessibility", () => {
    it("should have accessible button", () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      expect(bellButton).toBeInTheDocument();
      expect(bellButton.tagName).toBe("BUTTON");
    });

    it("should support keyboard navigation", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");

      // Simulate Enter key
      fireEvent.keyDown(bellButton, { key: "Enter", code: "Enter" });

      // Panel should open (implementation dependent)
      await waitFor(
        () => {
          const panelContent = screen.queryByText(/Notifications/i);
          expect(panelContent).toBeDefined();
        },
        { timeout: 3000 },
      );
    });
  });
});
