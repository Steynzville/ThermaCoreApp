import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import UnitSummary from "./UnitSummary";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Package: () => <span data-testid="package-icon">Package</span>,
  Wifi: () => <span data-testid="wifi-icon">Wifi</span>,
  WifiOff: () => <span data-testid="wifioff-icon">WifiOff</span>,
  Wrench: () => <span data-testid="wrench-icon">Wrench</span>,
  AlertTriangle: () => <span data-testid="alert-icon">AlertTriangle</span>,
  Zap: () => <span data-testid="zap-icon">Zap</span>,
}));

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

describe("UnitSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    totalUnits: 15,
    onlineCount: 10,
    offlineCount: 3,
    maintenanceCount: 2,
    alertCount: 4,
    alarmCount: 1,
  };

  // Helper to get a stat button by its aria-label
  const getStatButton = (ariaLabel) => {
    return screen.getByRole("button", { name: ariaLabel });
  };

  // Helper to get a stat value within a specific button
  const getStatValue = (button, value) => {
    return within(button).getByText(String(value));
  };

  describe("Rendering", () => {
    it("should render unit summary with title", () => {
      render(<UnitSummary {...defaultProps} />);
      expect(screen.getByRole("heading", { name: "Unit Summary" })).toBeInTheDocument();
    });

    it("should render all counts correctly with scoped queries", () => {
      render(<UnitSummary {...defaultProps} />);
      
      // Scope each count query to its specific button to avoid collisions
      const totalButton = getStatButton("Filter by total units");
      expect(getStatValue(totalButton, 15)).toBeInTheDocument();
      
      const onlineButton = getStatButton("Filter by online units");
      expect(getStatValue(onlineButton, 10)).toBeInTheDocument();
      
      const offlineButton = getStatButton("Filter by offline units");
      expect(getStatValue(offlineButton, 3)).toBeInTheDocument();
      
      const maintenanceButton = getStatButton("Filter by maintenance units");
      expect(getStatValue(maintenanceButton, 2)).toBeInTheDocument();
      
      const alertsButton = getStatButton("Filter by units with alerts");
      expect(getStatValue(alertsButton, 4)).toBeInTheDocument();
      
      const alarmsButton = getStatButton("Filter by units with alarms");
      expect(getStatValue(alarmsButton, 1)).toBeInTheDocument();
    });

    it("should render all status labels", () => {
      render(<UnitSummary {...defaultProps} />);

      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText("Online")).toBeInTheDocument();
      expect(screen.getByText("Offline")).toBeInTheDocument();
      expect(screen.getByText("Maintenance")).toBeInTheDocument();
      expect(screen.getByText("Alerts")).toBeInTheDocument();
      expect(screen.getByText("Alarms")).toBeInTheDocument();
    });

    it("should render all icons", () => {
      render(<UnitSummary {...defaultProps} />);

      expect(screen.getByTestId("package-icon")).toBeInTheDocument();
      expect(screen.getByTestId("wifi-icon")).toBeInTheDocument();
      expect(screen.getByTestId("wifioff-icon")).toBeInTheDocument();
      expect(screen.getByTestId("wrench-icon")).toBeInTheDocument();
      expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
      expect(screen.getByTestId("zap-icon")).toBeInTheDocument();
    });

    it("should have correct color styling for each status", () => {
      render(<UnitSummary {...defaultProps} />);
      
      // Scope each color check to its specific button
      const totalButton = getStatButton("Filter by total units");
      expect(within(totalButton).getByText("15")).toHaveClass("text-blue-600", "dark:text-blue-400");
      
      const onlineButton = getStatButton("Filter by online units");
      expect(within(onlineButton).getByText("10")).toHaveClass("text-green-600", "dark:text-green-400");
      
      const offlineButton = getStatButton("Filter by offline units");
      expect(within(offlineButton).getByText("3")).toHaveClass("text-gray-600", "dark:text-gray-400");
      
      const maintenanceButton = getStatButton("Filter by maintenance units");
      expect(within(maintenanceButton).getByText("2")).toHaveClass("text-yellow-600", "dark:text-yellow-400");
      
      const alertsButton = getStatButton("Filter by units with alerts");
      expect(within(alertsButton).getByText("4")).toHaveClass("text-orange-600", "dark:text-orange-400");
      
      const alarmsButton = getStatButton("Filter by units with alarms");
      expect(within(alarmsButton).getByText("1")).toHaveClass("text-red-600", "dark:text-red-400");
    });

    it("should have hover styles on buttons", () => {
      render(<UnitSummary {...defaultProps} />);
      
      const buttons = screen.getAllByRole("button");
      buttons.forEach(button => {
        expect(button).toHaveClass("hover:bg-gray-50", "dark:hover:bg-gray-700");
      });
    });

    it("should render with dark mode classes", () => {
      render(<UnitSummary {...defaultProps} />);
      
      const card = document.querySelector(".bg-white.dark\\:bg-gray-800");
      expect(card).toBeInTheDocument();
      
      const heading = document.querySelector(".text-gray-900.dark\\:text-gray-100");
      expect(heading).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("should navigate to correct URL when Total button is clicked", async () => {
      const user = userEvent.setup();
      render(<UnitSummary {...defaultProps} />);
      
      const button = getStatButton("Filter by total units");
      await user.click(button);
      
      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=all");
    });

    it("should navigate to correct URL when Online button is clicked", async () => {
      const user = userEvent.setup();
      render(<UnitSummary {...defaultProps} />);
      
      const button = getStatButton("Filter by online units");
      await user.click(button);
      
      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=online");
    });

    it("should navigate to correct URL when Offline button is clicked", async () => {
      const user = userEvent.setup();
      render(<UnitSummary {...defaultProps} />);
      
      const button = getStatButton("Filter by offline units");
      await user.click(button);
      
      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=offline");
    });

    it("should navigate to correct URL when Maintenance button is clicked", async () => {
      const user = userEvent.setup();
      render(<UnitSummary {...defaultProps} />);
      
      const button = getStatButton("Filter by maintenance units");
      await user.click(button);
      
      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=maintenance");
    });

    it("should navigate to correct URL when Alerts button is clicked", async () => {
      const user = userEvent.setup();
      render(<UnitSummary {...defaultProps} />);
      
      const button = getStatButton("Filter by units with alerts");
      await user.click(button);
      
      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?alerts=true");
    });

    it("should navigate to correct URL when Alarms button is clicked", async () => {
      const user = userEvent.setup();
      render(<UnitSummary {...defaultProps} />);
      
      const button = getStatButton("Filter by units with alarms");
      await user.click(button);
      
      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?alarms=true");
    });

    it("should have proper aria-label on each button for accessibility", () => {
      render(<UnitSummary {...defaultProps} />);
      
      expect(screen.getByRole("button", { name: "Filter by total units" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Filter by online units" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Filter by offline units" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Filter by maintenance units" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Filter by units with alerts" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Filter by units with alarms" })).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should render with zero counts correctly", () => {
      const zeroProps = {
        totalUnits: 0,
        onlineCount: 0,
        offlineCount: 0,
        maintenanceCount: 0,
        alertCount: 0,
        alarmCount: 0,
      };
      
      render(<UnitSummary {...zeroProps} />);
      
      // Each button should have a "0" within it
      const totalButton = getStatButton("Filter by total units");
      expect(within(totalButton).getByText("0")).toBeInTheDocument();
      
      const onlineButton = getStatButton("Filter by online units");
      expect(within(onlineButton).getByText("0")).toBeInTheDocument();
      
      const offlineButton = getStatButton("Filter by offline units");
      expect(within(offlineButton).getByText("0")).toBeInTheDocument();
      
      const maintenanceButton = getStatButton("Filter by maintenance units");
      expect(within(maintenanceButton).getByText("0")).toBeInTheDocument();
      
      const alertsButton = getStatButton("Filter by units with alerts");
      expect(within(alertsButton).getByText("0")).toBeInTheDocument();
      
      const alarmsButton = getStatButton("Filter by units with alarms");
      expect(within(alarmsButton).getByText("0")).toBeInTheDocument();
    });

    it("should handle duplicate count values gracefully", () => {
      const duplicateProps = {
        totalUnits: 5,
        onlineCount: 5,  // Same as total
        offlineCount: 3,
        maintenanceCount: 2,
        alertCount: 4,
        alarmCount: 1,
      };
      
      render(<UnitSummary {...duplicateProps} />);
      
      // Both buttons should have "5" within them
      const totalButton = getStatButton("Filter by total units");
      expect(within(totalButton).getByText("5")).toBeInTheDocument();
      
      const onlineButton = getStatButton("Filter by online units");
      expect(within(onlineButton).getByText("5")).toBeInTheDocument();
      
      // Other values should still be found in their specific buttons
      const offlineButton = getStatButton("Filter by offline units");
      expect(within(offlineButton).getByText("3")).toBeInTheDocument();
      
      const maintenanceButton = getStatButton("Filter by maintenance units");
      expect(within(maintenanceButton).getByText("2")).toBeInTheDocument();
      
      const alertsButton = getStatButton("Filter by units with alerts");
      expect(within(alertsButton).getByText("4")).toBeInTheDocument();
      
      const alarmsButton = getStatButton("Filter by units with alarms");
      expect(within(alarmsButton).getByText("1")).toBeInTheDocument();
    });

    it("should handle large numbers correctly", () => {
      const largeProps = {
        totalUnits: 9999,
        onlineCount: 8888,
        offlineCount: 777,
        maintenanceCount: 66,
        alertCount: 5,
        alarmCount: 4,
      };
      
      render(<UnitSummary {...largeProps} />);
      
      const totalButton = getStatButton("Filter by total units");
      expect(within(totalButton).getByText("9999")).toBeInTheDocument();
      
      const onlineButton = getStatButton("Filter by online units");
      expect(within(onlineButton).getByText("8888")).toBeInTheDocument();
      
      const offlineButton = getStatButton("Filter by offline units");
      expect(within(offlineButton).getByText("777")).toBeInTheDocument();
      
      const maintenanceButton = getStatButton("Filter by maintenance units");
      expect(within(maintenanceButton).getByText("66")).toBeInTheDocument();
      
      const alertsButton = getStatButton("Filter by units with alerts");
      expect(within(alertsButton).getByText("5")).toBeInTheDocument();
      
      const alarmsButton = getStatButton("Filter by units with alarms");
      expect(within(alarmsButton).getByText("4")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper button roles", () => {
      render(<UnitSummary {...defaultProps} />);
      
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(6);
      
      buttons.forEach(button => {
        expect(button).toHaveAttribute("type", "button");
      });
    });

    it("should be keyboard accessible", async () => {
      const user = userEvent.setup();
      render(<UnitSummary {...defaultProps} />);
      
      const button = getStatButton("Filter by total units");
      button.focus();
      expect(document.activeElement).toBe(button);
      
      await user.keyboard("{Enter}");
      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=all");
    });

    it("should have accessible names that describe the filter action", () => {
      render(<UnitSummary {...defaultProps} />);
      
      const totalButton = screen.getByRole("button", { name: "Filter by total units" });
      expect(totalButton).toBeInTheDocument();
      
      // Each button's aria-label should start with "Filter by"
      const buttons = screen.getAllByRole("button");
      buttons.forEach(button => {
        expect(button).toHaveAttribute("aria-label");
        expect(button.getAttribute("aria-label")).toMatch(/^Filter by/);
      });
    });
  });
});
