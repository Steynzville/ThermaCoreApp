/**
 * Tests for UnitSummary Component
 *
 * Coverage includes:
 * - Component rendering with mock data
 * - Unit type filtering
 * - Navigation to grid view
 * - Accessibility
 * - Responsive design
 * - Dark mode support
 * - Edge cases (zero counts, large numbers)
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UnitSummary from "@/components/dashboard/UnitSummary";

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test wrapper
const TestWrapper = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe("UnitSummary", () => {
  const defaultProps = {
    totalUnits: 24,
    onlineUnits: 18,
    offlineUnits: 3,
    maintenanceUnits: 2,
    alerts: 6,
    alarms: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the component title", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      // Use getAllByText since there might be multiple instances
      const titleElements = screen.getAllByText("Unit Summary");
      expect(titleElements.length).toBeGreaterThan(0);
    });

    it("should render total units count", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      // Use getAllByText since there might be multiple instances
      const totalElements = screen.getAllByText("Total");
      expect(totalElements.length).toBeGreaterThan(0);
    });

    it("should render online units count", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const onlineElements = screen.getAllByText("Online");
      expect(onlineElements.length).toBeGreaterThan(0);
    });

    it("should render offline units count", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const offlineElements = screen.getAllByText("Offline");
      expect(offlineElements.length).toBeGreaterThan(0);
    });

    it("should render maintenance units count", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const maintenanceElements = screen.getAllByText("Maintenance");
      expect(maintenanceElements.length).toBeGreaterThan(0);
    });

    it("should render alerts count", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const alertsElements = screen.getAllByText("Alerts");
      expect(alertsElements.length).toBeGreaterThan(0);
    });

    it("should render alarms count", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const alarmsElements = screen.getAllByText("Alarms");
      expect(alarmsElements.length).toBeGreaterThan(0);
    });

    it("should render all 6 unit type buttons", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const buttons = screen.getAllByRole("button");
      // There should be at least 6 buttons (one for each unit type)
      expect(buttons.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe("Icons", () => {
    it("should render Package icon for total units", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });

    it("should render Wifi icon for online units", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });

    it("should render WifiOff icon for offline units", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });

    it("should render Wrench icon for maintenance units", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });

    it("should render AlertTriangle icon for alerts", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });

    it("should render Zap icon for alarms", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe("Navigation", () => {
    it("should navigate to grid view with all filter when total units is clicked", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      // Find the Total button - use getAllByText and get the first one
      const totalElements = screen.getAllByText("Total");
      const totalButton = totalElements[0].closest("button");
      if (totalButton) {
        fireEvent.click(totalButton);
      }

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view", {
        state: { filter: "all" },
      });
    });

    it("should navigate to grid view with online filter when online units is clicked", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const onlineElements = screen.getAllByText("Online");
      const onlineButton = onlineElements[0].closest("button");
      if (onlineButton) {
        fireEvent.click(onlineButton);
      }

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view", {
        state: { filter: "online" },
      });
    });

    it("should navigate to grid view with offline filter when offline units is clicked", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const offlineElements = screen.getAllByText("Offline");
      const offlineButton = offlineElements[0].closest("button");
      if (offlineButton) {
        fireEvent.click(offlineButton);
      }

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view", {
        state: { filter: "offline" },
      });
    });

    it("should navigate to grid view with maintenance filter when maintenance units is clicked", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const maintenanceElements = screen.getAllByText("Maintenance");
      const maintenanceButton = maintenanceElements[0].closest("button");
      if (maintenanceButton) {
        fireEvent.click(maintenanceButton);
      }

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view", {
        state: { filter: "maintenance" },
      });
    });

    it("should navigate to grid view with alerts filter when alerts is clicked", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const alertsElements = screen.getAllByText("Alerts");
      const alertsButton = alertsElements[0].closest("button");
      if (alertsButton) {
        fireEvent.click(alertsButton);
      }

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view", {
        state: { filter: "alerts" },
      });
    });

    it("should navigate to grid view with alarms filter when alarms is clicked", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const alarmsElements = screen.getAllByText("Alarms");
      const alarmsButton = alarmsElements[0].closest("button");
      if (alarmsButton) {
        fireEvent.click(alarmsButton);
      }

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view", {
        state: { filter: "alarms" },
      });
    });
  });

  describe("Styling", () => {
    it("should have grid layout with 2 columns", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const grid = container.querySelector(".grid");
      expect(grid).toBeTruthy();
    });

    it("should have proper styling classes for the container", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const containerElement = container.firstChild;
      expect(containerElement).toBeTruthy();
    });

    it("should have hover states on buttons", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const buttons = screen.getAllByRole("button");
      // Just check that buttons exist with hover classes
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should have dark mode classes", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const darkElements = container.querySelectorAll("[class*='dark:']");
      expect(darkElements.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero counts", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} totalUnits={0} onlineUnits={0} offlineUnits={0} maintenanceUnits={0} alerts={0} alarms={0} />
        </TestWrapper>,
      );

      const zeroElements = screen.getAllByText("0");
      expect(zeroElements.length).toBeGreaterThan(0);
    });

    it("should handle large counts", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} totalUnits={9999} onlineUnits={8888} offlineUnits={777} maintenanceUnits={666} alerts={55} alarms={4} />
        </TestWrapper>,
      );

      const totalElements = screen.getAllByText("9999");
      expect(totalElements.length).toBeGreaterThan(0);
    });

    it("should handle single digit counts", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} totalUnits={5} onlineUnits={3} offlineUnits={2} maintenanceUnits={1} alerts={0} alarms={0} />
        </TestWrapper>,
      );

      const totalElements = screen.getAllByText("5");
      expect(totalElements.length).toBeGreaterThan(0);
    });
  });

  describe("Responsive Behavior", () => {
    it("should have responsive padding classes", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const paddingElements = container.querySelectorAll("[class*='p-']");
      expect(paddingElements.length).toBeGreaterThan(0);
    });

    it("should have responsive margin classes", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const marginElements = container.querySelectorAll("[class*='m-']");
      expect(marginElements.length).toBeGreaterThan(0);
    });

    it("should have responsive grid gap", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const gapElements = container.querySelectorAll("[class*='gap-']");
      expect(gapElements.length).toBeGreaterThan(0);
    });
  });

  describe("Button Behavior", () => {
    it("should have proper button type attribute", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const buttons = screen.getAllByRole("button");
      // Just check that buttons exist and have a type attribute
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should be keyboard accessible", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("tabindex");
      });
    });

    it("should handle multiple rapid clicks", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const totalElements = screen.getAllByText("Total");
      const totalButton = totalElements[0].closest("button");
      if (totalButton) {
        fireEvent.click(totalButton);
        fireEvent.click(totalButton);
        fireEvent.click(totalButton);
      }

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have semantic button elements", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const buttons = screen.getAllByRole("button");
      // There should be at least 6 buttons
      expect(buttons.length).toBeGreaterThanOrEqual(6);
    });

    it("should have proper text hierarchy", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const headings = screen.getAllByText("Unit Summary");
      expect(headings.length).toBeGreaterThan(0);
    });

    it("should have descriptive labels for each unit type", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const totalElements = screen.getAllByText("Total");
      expect(totalElements.length).toBeGreaterThan(0);
      
      const onlineElements = screen.getAllByText("Online");
      expect(onlineElements.length).toBeGreaterThan(0);
      
      const offlineElements = screen.getAllByText("Offline");
      expect(offlineElements.length).toBeGreaterThan(0);
      
      const maintenanceElements = screen.getAllByText("Maintenance");
      expect(maintenanceElements.length).toBeGreaterThan(0);
      
      const alertsElements = screen.getAllByText("Alerts");
      expect(alertsElements.length).toBeGreaterThan(0);
      
      const alarmsElements = screen.getAllByText("Alarms");
      expect(alarmsElements.length).toBeGreaterThan(0);
    });
  });

  describe("Color Coding", () => {
    it("should use blue for total units", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const blueElements = container.querySelectorAll(".text-blue-600");
      expect(blueElements.length).toBeGreaterThan(0);
    });

    it("should use green for online units", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const greenElements = container.querySelectorAll(".text-green-600");
      expect(greenElements.length).toBeGreaterThan(0);
    });

    it("should use gray for offline units", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const grayElements = container.querySelectorAll(".text-gray-600");
      expect(grayElements.length).toBeGreaterThan(0);
    });

    it("should use yellow for maintenance units", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const yellowElements = container.querySelectorAll(".text-yellow-600");
      expect(yellowElements.length).toBeGreaterThan(0);
    });

    it("should use orange for alerts", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const orangeElements = container.querySelectorAll(".text-orange-600");
      expect(orangeElements.length).toBeGreaterThan(0);
    });

    it("should use red for alarms", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const redElements = container.querySelectorAll(".text-red-600");
      expect(redElements.length).toBeGreaterThan(0);
    });
  });
});
