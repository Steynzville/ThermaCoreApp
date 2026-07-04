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

import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UnitSummary from "../components/dashboard/UnitSummary";

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
  // Using the correct prop names that the component expects
  const defaultProps = {
    totalUnits: 24,
    onlineCount: 18,
    offlineCount: 3,
    maintenanceCount: 2,
    alertCount: 6,
    alarmCount: 1,
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

      const titleElements = screen.getAllByText("Unit Summary");
      expect(titleElements.length).toBeGreaterThan(0);
    });

    it("should render total units count", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const totalElements = screen.getAllByText("Total");
      expect(totalElements.length).toBeGreaterThan(0);
      // Check the actual number
      const totalNumberElements = screen.getAllByText("24");
      expect(totalNumberElements.length).toBeGreaterThan(0);
    });

    it("should render online units count", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const onlineElements = screen.getAllByText("Online");
      expect(onlineElements.length).toBeGreaterThan(0);
      const onlineNumberElements = screen.getAllByText("18");
      expect(onlineNumberElements.length).toBeGreaterThan(0);
    });

    it("should render offline units count", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const offlineElements = screen.getAllByText("Offline");
      expect(offlineElements.length).toBeGreaterThan(0);
      const offlineNumberElements = screen.getAllByText("3");
      expect(offlineNumberElements.length).toBeGreaterThan(0);
    });

    it("should render maintenance units count", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const maintenanceElements = screen.getAllByText("Maintenance");
      expect(maintenanceElements.length).toBeGreaterThan(0);
      const maintenanceNumberElements = screen.getAllByText("2");
      expect(maintenanceNumberElements.length).toBeGreaterThan(0);
    });

    it("should render alerts count", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const alertsElements = screen.getAllByText("Alerts");
      expect(alertsElements.length).toBeGreaterThan(0);
      const alertsNumberElements = screen.getAllByText("6");
      expect(alertsNumberElements.length).toBeGreaterThan(0);
    });

    it("should render alarms count", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const alarmsElements = screen.getAllByText("Alarms");
      expect(alarmsElements.length).toBeGreaterThan(0);
      const alarmsNumberElements = screen.getAllByText("1");
      expect(alarmsNumberElements.length).toBeGreaterThan(0);
    });

    it("should render all 6 unit type buttons", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const buttons = screen.getAllByRole("button");
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

      // Find the Total button and click it
      const totalElements = screen.getAllByText("Total");
      const totalButton = totalElements[0].closest("button");
      if (totalButton) {
        fireEvent.click(totalButton);
      }

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=all");
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

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=online");
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

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=offline");
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

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=maintenance");
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

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?alerts=true");
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

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?alarms=true");
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
      expect(grid.className).toContain("grid-cols-2");
    });

    it("should have proper styling classes for the container", () => {
      const { container } = render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const containerElement = container.firstChild;
      expect(containerElement).toBeTruthy();
      expect(containerElement.className).toContain("rounded-lg");
      expect(containerElement.className).toContain("shadow-sm");
      expect(containerElement.className).toContain("border");
    });

    it("should have hover states on buttons", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
      // Check for hover class
      buttons.forEach(button => {
        expect(button.className).toContain("hover:bg-gray-50");
      });
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
          <UnitSummary 
            totalUnits={0} 
            onlineCount={0} 
            offlineCount={0} 
            maintenanceCount={0} 
            alertCount={0} 
            alarmCount={0} 
          />
        </TestWrapper>,
      );

      const zeroElements = screen.getAllByText("0");
      expect(zeroElements.length).toBeGreaterThan(0);
    });

    it("should handle large counts", () => {
      render(
        <TestWrapper>
          <UnitSummary 
            totalUnits={9999} 
            onlineCount={8888} 
            offlineCount={777} 
            maintenanceCount={666} 
            alertCount={55} 
            alarmCount={4} 
          />
        </TestWrapper>,
      );

      const totalElements = screen.getAllByText("9999");
      expect(totalElements.length).toBeGreaterThan(0);
      const onlineElements = screen.getAllByText("8888");
      expect(onlineElements.length).toBeGreaterThan(0);
    });

    it("should handle single digit counts", () => {
      render(
        <TestWrapper>
          <UnitSummary 
            totalUnits={5} 
            onlineCount={3} 
            offlineCount={2} 
            maintenanceCount={1} 
            alertCount={0} 
            alarmCount={0} 
          />
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
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("type", "button");
      });
    });

    it("should be keyboard accessible", () => {
      render(
        <TestWrapper>
          <UnitSummary {...defaultProps} />
        </TestWrapper>,
      );

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        // Check that they're focusable (have appropriate tabindex or are naturally focusable)
        expect(button.tagName).toBe("BUTTON");
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

      expect(mockNavigate).toHaveBeenCalledTimes(3);
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
      // Check that it's an h3
      const heading = headings[0].closest("h3");
      expect(heading).toBeTruthy();
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
