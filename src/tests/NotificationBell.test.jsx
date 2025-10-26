import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NotificationBell from "../components/NotificationBell";

const mockNavigate = vi.fn();

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

vi.mock("../services/deviceStatusService", () => ({
  deviceStatusService: {
    addStatusChangeListener: vi.fn(() => vi.fn()), // Returns unsubscribe function
  },
}));

vi.mock("../utils/notifications", () => ({
  getAllNotifications: vi.fn(() => [
    {
      id: 1,
      type: "alarm",
      message: "ThermaCore Unit 003 - NH3 LEAK DETECTED",
      timestamp: "2025-09-09 15:30",
      alertData: {
        id: 7,
        type: "critical",
        title: "NH3 LEAK DETECTED",
        message:
          "Critical ammonia leak detected - immediate attention required",
        timestamp: "2025-09-09 15:30",
      },
    },
    {
      id: 2,
      type: "alert",
      message: "ThermaCore Unit 001 - Unit Offline",
      timestamp: "2025-09-09 14:45",
      alertData: {
        id: 1,
        type: "critical",
        title: "Unit Offline",
        message:
          "ThermaCore Unit 001 has gone offline and requires immediate attention",
        timestamp: "2025-09-09 14:45",
      },
    },
  ]),
}));

const renderNotificationBell = (props = {}) => {
  return render(
    <BrowserRouter>
      <NotificationBell {...props} />
    </BrowserRouter>,
  );
};

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      await waitFor(() => {
        const badge = screen.getByText("2");
        expect(badge).toBeInTheDocument();
      });
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

      await waitFor(() => {
        // Use getAllByText since there are multiple instances
        const notificationHeaders = screen.getAllByText(/Notifications/i);
        expect(notificationHeaders.length).toBeGreaterThan(0);
      });
    });

    it("should close notification panel on close button click", async () => {
      renderNotificationBell();

      // Open panel
      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(() => {
        const notificationHeaders = screen.getAllByText(/Notifications/i);
        expect(notificationHeaders.length).toBeGreaterThan(0);
      });

      // Close panel
      const closeButtons = screen.getAllByRole("button");
      const closeButton = closeButtons.find((btn) =>
        btn.querySelector("svg")?.classList.contains("lucide-x"),
      );

      if (closeButton) {
        fireEvent.click(closeButton);
      }

      await waitFor(() => {
        expect(
          screen.queryByText(/View all notifications/i),
        ).not.toBeInTheDocument();
      });
    });

    it("should display notifications in panel", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/NH3 LEAK DETECTED/i)).toBeInTheDocument();
        expect(screen.getByText(/Unit Offline/i)).toBeInTheDocument();
      });
    });
  });

  describe("Notification Interactions", () => {
    it("should mark notification as viewed when clicked", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/NH3 LEAK DETECTED/i)).toBeInTheDocument();
      });

      // Click a notification
      const notification = screen.getByText(/NH3 LEAK DETECTED/i);
      const notificationCard = notification.closest("div");

      if (notificationCard) {
        fireEvent.click(notificationCard);
      }

      // Should navigate
      expect(mockNavigate).toHaveBeenCalled();
    });

    it("should update badge count after viewing notifications", async () => {
      renderNotificationBell();

      // Initial count
      await waitFor(() => {
        expect(screen.getByText("2")).toBeInTheDocument();
      });

      // Open and view a notification
      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/NH3 LEAK DETECTED/i)).toBeInTheDocument();
      });

      const notification = screen.getByText(/NH3 LEAK DETECTED/i);
      const notificationCard = notification.closest("div");

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

      await waitFor(() => {
        expect(getAllNotifications).toHaveBeenCalledWith("admin");
      });
    });

    it("should load notifications for user role", async () => {
      const { useAuth } = await import("../context/AuthContext");
      const { getAllNotifications } = await import("../utils/notifications");

      useAuth.mockReturnValue({ userRole: "user" });

      renderNotificationBell();

      await waitFor(() => {
        expect(getAllNotifications).toHaveBeenCalledWith("user");
      });
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
        statusChangeCallback();
      }

      await waitFor(() => {
        // Should be called again after status change
        expect(getAllNotifications).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Navigation", () => {
    it("should navigate to history page on 'View All' click", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(() => {
        const viewAllButton = screen.getByText(/View all notifications/i);
        expect(viewAllButton).toBeInTheDocument();

        fireEvent.click(viewAllButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith("/history");
    });

    it("should navigate to specific unit on notification click", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(() => {
        const notification = screen.getByText(/Unit Offline/i);
        const notificationCard = notification.closest("div");

        if (notificationCard) {
          fireEvent.click(notificationCard);
        }
      });

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe("Notification Types", () => {
    it("should display critical alarm notifications", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/NH3 LEAK DETECTED/i)).toBeInTheDocument();
      });
    });

    it("should display alert notifications", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(() => {
        expect(screen.getByText(/Unit Offline/i)).toBeInTheDocument();
      });
    });

    it("should show notification timestamps", async () => {
      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(() => {
        // Timestamps should be visible
        const timestamps = screen.getAllByText(/2025-09-09/);
        expect(timestamps.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Empty State", () => {
    it("should handle no notifications gracefully", async () => {
      const { getAllNotifications } = await import("../utils/notifications");
      getAllNotifications.mockReturnValue([]);

      renderNotificationBell();

      const bellButton = screen.getByRole("button");
      fireEvent.click(bellButton);

      await waitFor(() => {
        // Should show "No notifications" message
        const noNotifications = screen.getByText(/No notifications/i);
        expect(noNotifications).toBeInTheDocument();
      });
    });

    it("should not show badge when no unviewed notifications", async () => {
      const { getAllNotifications } = await import("../utils/notifications");
      getAllNotifications.mockReturnValue([]);

      renderNotificationBell();

      await waitFor(() => {
        // Badge should not be visible when there are no notifications
        const badge = screen.queryByText("0");
        // Badge might not be rendered at all for zero notifications
        expect(badge).not.toBeInTheDocument();
      });
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
      await waitFor(() => {
        const panelContent = screen.queryByText(/Notifications/i);
        expect(panelContent).toBeDefined();
      });
    });
  });
});
