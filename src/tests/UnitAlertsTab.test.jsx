import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import UnitAlertsTab from "../components/unit-details/UnitAlertsTab";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  AlertTriangle: ({ className }) => <svg data-testid="alert-triangle" className={className} />,
  CheckCircle: ({ className }) => <svg data-testid="check-circle" className={className} />,
  Clock: ({ className }) => <svg data-testid="clock" className={className} />,
}));

// Mock UI components
vi.mock("../components/ui/card", () => ({
  Card: ({ children, className }) => <div data-testid="card" className={className}>{children}</div>,
  CardContent: ({ children, className }) => <div data-testid="card-content" className={className}>{children}</div>,
}));

// Mock AuthContext
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock notifications utils
vi.mock("../utils/notifications", () => ({
  getAllCurrentNotificationsForUnit: vi.fn(),
}));

import { useAuth } from "../context/AuthContext";
import { getAllCurrentNotificationsForUnit } from "../utils/notifications";

describe("UnitAlertsTab", () => {
  const mockUnit = {
    id: "TC001",
    name: "Unit 1",
  };

  const mockGetAlertTypeColor = vi.fn((type) => {
    switch (type) {
      case "critical": return "text-red-600";
      case "warning": return "text-yellow-600";
      case "info": return "text-blue-600";
      case "success": return "text-green-600";
      default: return "text-gray-600";
    }
  });

  const mockAlertsHistory = [
    {
      id: "alert1",
      title: "Temperature Warning",
      message: "Temperature exceeded threshold",
      type: "warning",
      timestamp: "2024-01-01 10:00:00",
      resolved: true,
      resolvedAt: "2024-01-01 10:30:00",
    },
    {
      id: "alert2",
      title: "Power Failure",
      message: "Unit lost power",
      type: "critical",
      timestamp: "2024-01-02 14:00:00",
      resolved: false,
      resolvedAt: null,
    },
    {
      id: "alert3",
      title: "Maintenance Complete",
      message: "Unit maintenance completed successfully",
      type: "success",
      timestamp: "2024-01-03 09:00:00",
      resolved: true,
      resolvedAt: "2024-01-03 09:15:00",
    },
  ];

  const mockCurrentNotifications = [
    {
      id: "notif1",
      title: "Active Alarm",
      message: "Unit is in alarm state",
      type: "critical",
      timestamp: "2024-01-04 08:00:00",
    },
    {
      id: "notif2",
      title: "Warning Alert",
      message: "Unit requires attention",
      type: "warning",
      timestamp: "2024-01-04 09:00:00",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ userRole: "admin" });
  });

  const renderWithMocks = (
    currentNotifications = mockCurrentNotifications,
    userRole = "admin"
  ) => {
    useAuth.mockReturnValue({ userRole });
    getAllCurrentNotificationsForUnit.mockReturnValue(currentNotifications);
    
    return render(
      <UnitAlertsTab
        unit={mockUnit}
        alertsHistory={mockAlertsHistory}
        getAlertTypeColor={mockGetAlertTypeColor}
      />
    );
  };

  describe("basic rendering", () => {
    it("renders the current alerts section", () => {
      renderWithMocks();
      
      expect(screen.getByText("Current Alerts")).toBeInTheDocument();
    });

    it("renders the alerts history section", () => {
      renderWithMocks();
      
      expect(screen.getByText("Alerts History")).toBeInTheDocument();
    });

    it("calls getAllCurrentNotificationsForUnit with correct parameters", () => {
      renderWithMocks();
      
      expect(getAllCurrentNotificationsForUnit).toHaveBeenCalledWith(
        "TC001",
        "admin"
      );
    });
  });

  describe("current notifications", () => {
    it("displays current notifications when present", () => {
      renderWithMocks();
      
      expect(screen.getByText("Active Alarm")).toBeInTheDocument();
      expect(screen.getByText("Unit is in alarm state")).toBeInTheDocument();
      expect(screen.getByText("Warning Alert")).toBeInTheDocument();
      expect(screen.getByText("Unit requires attention")).toBeInTheDocument();
    });

    it("displays timestamp for notifications", () => {
      renderWithMocks();
      
      expect(screen.getByText("2024-01-04 08:00:00")).toBeInTheDocument();
      expect(screen.getByText("2024-01-04 09:00:00")).toBeInTheDocument();
    });

    it("applies correct border color for critical notification", () => {
      renderWithMocks();
      
      const cards = screen.getAllByTestId("card");
      const criticalCard = cards[0];
      expect(criticalCard).toHaveClass("border-l-red-500");
    });

    it("applies correct border color for warning notification", () => {
      renderWithMocks();
      
      const cards = screen.getAllByTestId("card");
      const warningCard = cards[1];
      expect(warningCard).toHaveClass("border-l-yellow-500");
    });

    it("applies correct icon color for critical notification", () => {
      renderWithMocks();
      
      const icons = screen.getAllByTestId("alert-triangle");
      const criticalIcon = icons[0];
      expect(criticalIcon).toHaveClass("text-red-600");
      expect(criticalIcon).toHaveClass("dark:text-red-400");
    });

    it("applies correct icon color for warning notification", () => {
      renderWithMocks();
      
      const icons = screen.getAllByTestId("alert-triangle");
      const warningIcon = icons[1];
      expect(warningIcon).toHaveClass("text-yellow-600");
      expect(warningIcon).toHaveClass("dark:text-yellow-400");
    });
  });

  describe("no current notifications", () => {
    it("displays 'No active alerts' message when no notifications", () => {
      getAllCurrentNotificationsForUnit.mockReturnValue([]);
      useAuth.mockReturnValue({ userRole: "admin" });
      
      render(
        <UnitAlertsTab
          unit={mockUnit}
          alertsHistory={[]}
          getAlertTypeColor={mockGetAlertTypeColor}
        />
      );
      
      const checkIcons = screen.getAllByTestId("check-circle");
      expect(checkIcons.length).toBeGreaterThan(0);
      
      const noAlertsText = screen.getByText("No active alerts");
      expect(noAlertsText).toBeInTheDocument();
    });

    it("displays checkmark icon when no notifications", () => {
      getAllCurrentNotificationsForUnit.mockReturnValue([]);
      useAuth.mockReturnValue({ userRole: "admin" });
      
      render(
        <UnitAlertsTab
          unit={mockUnit}
          alertsHistory={[]}
          getAlertTypeColor={mockGetAlertTypeColor}
        />
      );
      
      const checkIcons = screen.getAllByTestId("check-circle");
      expect(checkIcons.length).toBeGreaterThan(0);
      
      const noAlertsIcon = checkIcons[0];
      expect(noAlertsIcon).toHaveClass("text-green-500");
    });

    it("does not display any notification cards when no notifications", () => {
      getAllCurrentNotificationsForUnit.mockReturnValue([]);
      useAuth.mockReturnValue({ userRole: "admin" });
      
      render(
        <UnitAlertsTab
          unit={mockUnit}
          alertsHistory={[]}
          getAlertTypeColor={mockGetAlertTypeColor}
        />
      );
      
      const alertTriangles = screen.queryAllByTestId("alert-triangle");
      expect(alertTriangles).toHaveLength(0);
    });
  });

  describe("alerts history", () => {
    it("displays all history alerts", () => {
      renderWithMocks();
      
      expect(screen.getByText("Temperature Warning")).toBeInTheDocument();
      expect(screen.getByText("Power Failure")).toBeInTheDocument();
      expect(screen.getByText("Maintenance Complete")).toBeInTheDocument();
    });

    it("shows 'Resolved' badge for resolved alerts", () => {
      renderWithMocks();
      
      const resolvedBadges = screen.getAllByText("Resolved");
      expect(resolvedBadges).toHaveLength(2);
    });

    it("does not show 'Resolved' badge for unresolved alerts", () => {
      renderWithMocks();
      
      const powerFailure = screen.getByText("Power Failure");
      const parent = powerFailure.closest('[data-testid="card-content"]');
      expect(parent).not.toHaveTextContent("Resolved");
    });

    it("displays created timestamp for all alerts", () => {
      renderWithMocks();
      
      expect(screen.getByText("Created: 2024-01-01 10:00:00")).toBeInTheDocument();
      expect(screen.getByText("Created: 2024-01-02 14:00:00")).toBeInTheDocument();
      expect(screen.getByText("Created: 2024-01-03 09:00:00")).toBeInTheDocument();
    });

    it("displays resolved timestamp for resolved alerts", () => {
      renderWithMocks();
      
      expect(screen.getByText("Resolved: 2024-01-01 10:30:00")).toBeInTheDocument();
      expect(screen.getByText("Resolved: 2024-01-03 09:15:00")).toBeInTheDocument();
    });

    it("does not display resolved timestamp for unresolved alerts", () => {
      renderWithMocks();
      
      expect(screen.queryByText("Resolved: null")).not.toBeInTheDocument();
    });

    it("calls getAlertTypeColor for each alert", () => {
      renderWithMocks();
      
      expect(mockGetAlertTypeColor).toHaveBeenCalledTimes(3);
      expect(mockGetAlertTypeColor).toHaveBeenCalledWith("warning");
      expect(mockGetAlertTypeColor).toHaveBeenCalledWith("critical");
      expect(mockGetAlertTypeColor).toHaveBeenCalledWith("success");
    });
  });

  describe("role-based filtering", () => {
    it("calls getAllCurrentNotificationsForUnit with user role", () => {
      renderWithMocks(mockCurrentNotifications, "user");
      
      expect(getAllCurrentNotificationsForUnit).toHaveBeenCalledWith(
        "TC001",
        "user"
      );
    });

    it("applies different role when user is not admin", () => {
      useAuth.mockReturnValue({ userRole: "viewer" });
      getAllCurrentNotificationsForUnit.mockReturnValue(mockCurrentNotifications);
      
      render(
        <UnitAlertsTab
          unit={mockUnit}
          alertsHistory={mockAlertsHistory}
          getAlertTypeColor={mockGetAlertTypeColor}
        />
      );
      
      expect(getAllCurrentNotificationsForUnit).toHaveBeenCalledWith(
        "TC001",
        "viewer"
      );
    });
  });

  describe("styling", () => {
    it("applies dark mode classes to cards", () => {
      renderWithMocks();
      
      const cards = screen.getAllByTestId("card");
      cards.forEach(card => {
        expect(card).toHaveClass("dark:bg-gray-900");
      });
    });

    it("applies correct alert history card styles", () => {
      renderWithMocks();
      
      const cards = screen.getAllByTestId("card");
      const historyCard = cards[2];
      expect(historyCard).toHaveClass("bg-white");
      expect(historyCard).toHaveClass("dark:bg-gray-900");
    });

    it("applies correct text colors for alert titles", () => {
      renderWithMocks();
      
      const warningTitle = screen.getByText("Temperature Warning");
      expect(warningTitle).toHaveClass("text-yellow-600");
      
      const criticalTitle = screen.getByText("Power Failure");
      expect(criticalTitle).toHaveClass("text-red-600");
      
      const successTitle = screen.getByText("Maintenance Complete");
      expect(successTitle).toHaveClass("text-green-600");
    });
  });

  describe("edge cases", () => {
    it("handles null currentNotifications gracefully", () => {
      getAllCurrentNotificationsForUnit.mockReturnValue(null);
      useAuth.mockReturnValue({ userRole: "admin" });
      
      render(
        <UnitAlertsTab
          unit={mockUnit}
          alertsHistory={mockAlertsHistory}
          getAlertTypeColor={mockGetAlertTypeColor}
        />
      );
      
      expect(screen.getByText("No active alerts")).toBeInTheDocument();
    });

    it("handles undefined currentNotifications gracefully", () => {
      getAllCurrentNotificationsForUnit.mockReturnValue(undefined);
      useAuth.mockReturnValue({ userRole: "admin" });
      
      render(
        <UnitAlertsTab
          unit={mockUnit}
          alertsHistory={mockAlertsHistory}
          getAlertTypeColor={mockGetAlertTypeColor}
        />
      );
      
      expect(screen.getByText("No active alerts")).toBeInTheDocument();
    });

    it("handles empty alertsHistory", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      getAllCurrentNotificationsForUnit.mockReturnValue([]);
      
      render(
        <UnitAlertsTab
          unit={mockUnit}
          alertsHistory={[]}
          getAlertTypeColor={mockGetAlertTypeColor}
        />
      );
      
      expect(screen.getByText("Current Alerts")).toBeInTheDocument();
      expect(screen.getByText("Alerts History")).toBeInTheDocument();
      expect(screen.getByText("No active alerts")).toBeInTheDocument();
      expect(screen.queryByText("Temperature Warning")).not.toBeInTheDocument();
    });

    it("handles alertsHistory with empty array", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      getAllCurrentNotificationsForUnit.mockReturnValue([]);
      
      render(
        <UnitAlertsTab
          unit={mockUnit}
          alertsHistory={[]}
          getAlertTypeColor={mockGetAlertTypeColor}
        />
      );
      
      expect(screen.getByText("Current Alerts")).toBeInTheDocument();
      expect(screen.getByText("Alerts History")).toBeInTheDocument();
      // No alerts should be displayed
      expect(screen.queryByText("Temperature Warning")).not.toBeInTheDocument();
    });

    it("handles alert with null resolvedAt", () => {
      const alertWithNullResolved = [
        {
          id: "alert4",
          title: "Test Alert",
          message: "Test message",
          type: "info",
          timestamp: "2024-01-05 10:00:00",
          resolved: false,
          resolvedAt: null,
        },
      ];
      
      useAuth.mockReturnValue({ userRole: "admin" });
      getAllCurrentNotificationsForUnit.mockReturnValue([]);
      
      render(
        <UnitAlertsTab
          unit={mockUnit}
          alertsHistory={alertWithNullResolved}
          getAlertTypeColor={mockGetAlertTypeColor}
        />
      );
      
      expect(screen.queryByText("Resolved: null")).not.toBeInTheDocument();
    });

    it("handles getAlertTypeColor being provided", () => {
      useAuth.mockReturnValue({ userRole: "admin" });
      getAllCurrentNotificationsForUnit.mockReturnValue([]);
      
      render(
        <UnitAlertsTab
          unit={mockUnit}
          alertsHistory={mockAlertsHistory}
          getAlertTypeColor={mockGetAlertTypeColor}
        />
      );
      
      expect(screen.getByText("Current Alerts")).toBeInTheDocument();
      expect(screen.getByText("Alerts History")).toBeInTheDocument();
      expect(screen.getByText("Temperature Warning")).toBeInTheDocument();
      expect(screen.getByText("Power Failure")).toBeInTheDocument();
      expect(screen.getByText("Maintenance Complete")).toBeInTheDocument();
    });
  });

  describe("alert type colors", () => {
    it("returns correct border color for each type", () => {
      const notifications = [
        { id: "n1", title: "Critical", message: "Critical", type: "critical", timestamp: "2024-01-01" },
        { id: "n2", title: "Warning", message: "Warning", type: "warning", timestamp: "2024-01-01" },
        { id: "n3", title: "Info", message: "Info", type: "info", timestamp: "2024-01-01" },
        { id: "n4", title: "Success", message: "Success", type: "success", timestamp: "2024-01-01" },
      ];
      
      getAllCurrentNotificationsForUnit.mockReturnValue(notifications);
      useAuth.mockReturnValue({ userRole: "admin" });
      
      render(
        <UnitAlertsTab
          unit={mockUnit}
          alertsHistory={[]}
          getAlertTypeColor={mockGetAlertTypeColor}
        />
      );
      
      const cards = screen.getAllByTestId("card");
      expect(cards[0]).toHaveClass("border-l-red-500");
      expect(cards[1]).toHaveClass("border-l-yellow-500");
      expect(cards[2]).toHaveClass("border-l-blue-500");
      expect(cards[3]).toHaveClass("border-l-green-500");
    });
  });
});
