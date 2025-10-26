import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import UnitSummary from "../components/Dashboard/UnitSummary";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

describe("UnitSummary", () => {
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
      render(<UnitSummary {...defaultProps} />);

      expect(screen.getByText("Unit Summary")).toBeInTheDocument();
    });

    it("should render total units count", () => {
      render(<UnitSummary {...defaultProps} />);

      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText("24")).toBeInTheDocument();
    });

    it("should render online units count", () => {
      render(<UnitSummary {...defaultProps} />);

      expect(screen.getByText("Online")).toBeInTheDocument();
      expect(screen.getByText("18")).toBeInTheDocument();
    });

    it("should render offline units count", () => {
      render(<UnitSummary {...defaultProps} />);

      expect(screen.getByText("Offline")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should render maintenance units count", () => {
      render(<UnitSummary {...defaultProps} />);

      expect(screen.getByText("Maintenance")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should render alerts count", () => {
      render(<UnitSummary {...defaultProps} />);

      expect(screen.getByText("Alerts")).toBeInTheDocument();
      expect(screen.getByText("6")).toBeInTheDocument();
    });

    it("should render alarms count", () => {
      render(<UnitSummary {...defaultProps} />);

      expect(screen.getByText("Alarms")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("should render all 6 unit type buttons", () => {
      render(<UnitSummary {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(6);
    });
  });

  describe("Icons", () => {
    it("should render Package icon for total units", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      // Check for blue icon background (total units)
      const totalIconWrapper = container.querySelector(".bg-blue-100");
      expect(totalIconWrapper).toBeInTheDocument();
    });

    it("should render Wifi icon for online units", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      // Check for green icon background (online units)
      const onlineIconWrapper = container.querySelector(".bg-green-100");
      expect(onlineIconWrapper).toBeInTheDocument();
    });

    it("should render WifiOff icon for offline units", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      // Check for gray icon background (offline units)
      const offlineIconWrapper = container.querySelector(".bg-gray-100");
      expect(offlineIconWrapper).toBeInTheDocument();
    });

    it("should render Wrench icon for maintenance units", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      // Check for yellow icon background (maintenance units)
      const maintenanceIconWrapper = container.querySelector(".bg-yellow-100");
      expect(maintenanceIconWrapper).toBeInTheDocument();
    });

    it("should render AlertTriangle icon for alerts", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      // Check for orange icon background (alerts)
      const alertIconWrapper = container.querySelector(".bg-orange-100");
      expect(alertIconWrapper).toBeInTheDocument();
    });

    it("should render Zap icon for alarms", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      // Check for red icon background (alarms)
      const alarmIconWrapper = container.querySelector(".bg-red-100");
      expect(alarmIconWrapper).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("should navigate to grid view with all filter when total units is clicked", () => {
      render(<UnitSummary {...defaultProps} />);

      const totalButton = screen.getByText("Total").closest("button");
      fireEvent.click(totalButton);

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=all");
    });

    it("should navigate to grid view with online filter when online units is clicked", () => {
      render(<UnitSummary {...defaultProps} />);

      const onlineButton = screen.getByText("Online").closest("button");
      fireEvent.click(onlineButton);

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=online");
    });

    it("should navigate to grid view with offline filter when offline units is clicked", () => {
      render(<UnitSummary {...defaultProps} />);

      const offlineButton = screen.getByText("Offline").closest("button");
      fireEvent.click(offlineButton);

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=offline");
    });

    it("should navigate to grid view with maintenance filter when maintenance units is clicked", () => {
      render(<UnitSummary {...defaultProps} />);

      const maintenanceButton = screen
        .getByText("Maintenance")
        .closest("button");
      fireEvent.click(maintenanceButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        "/grid-view?status=maintenance",
      );
    });

    it("should navigate to grid view with alerts filter when alerts is clicked", () => {
      render(<UnitSummary {...defaultProps} />);

      const alertsButton = screen.getByText("Alerts").closest("button");
      fireEvent.click(alertsButton);

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?alerts=true");
    });

    it("should navigate to grid view with alarms filter when alarms is clicked", () => {
      render(<UnitSummary {...defaultProps} />);

      const alarmsButton = screen.getByText("Alarms").closest("button");
      fireEvent.click(alarmsButton);

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?alarms=true");
    });
  });

  describe("Styling", () => {
    it("should have grid layout with 2 columns", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      const grid = container.querySelector(".grid-cols-2");
      expect(grid).toBeInTheDocument();
    });

    it("should have proper styling classes for the container", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      const mainContainer = container.querySelector(".bg-white");
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer.className).toContain("rounded-lg");
      expect(mainContainer.className).toContain("shadow-sm");
    });

    it("should have hover states on buttons", () => {
      render(<UnitSummary {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button.className).toContain("hover:bg-gray-50");
      });
    });

    it("should have dark mode classes", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      const mainContainer = container.querySelector(".dark\\:bg-gray-800");
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero counts", () => {
      render(
        <UnitSummary
          totalUnits={0}
          onlineCount={0}
          offlineCount={0}
          maintenanceCount={0}
          alertCount={0}
          alarmCount={0}
        />,
      );

      expect(screen.getAllByText("0")).toHaveLength(6);
    });

    it("should handle large counts", () => {
      render(
        <UnitSummary
          totalUnits={9999}
          onlineCount={8888}
          offlineCount={777}
          maintenanceCount={666}
          alertCount={555}
          alarmCount={444}
        />,
      );

      expect(screen.getByText("9999")).toBeInTheDocument();
      expect(screen.getByText("8888")).toBeInTheDocument();
      expect(screen.getByText("777")).toBeInTheDocument();
    });

    it("should handle single digit counts", () => {
      render(
        <UnitSummary
          totalUnits={5}
          onlineCount={3}
          offlineCount={1}
          maintenanceCount={1}
          alertCount={2}
          alarmCount={1}
        />,
      );

      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      // Multiple "1"s are expected
      const ones = screen.getAllByText("1");
      expect(ones.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Responsive Behavior", () => {
    it("should have responsive padding classes", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      const mainContainer = container.querySelector(".p-4");
      expect(mainContainer).toBeInTheDocument();
    });

    it("should have responsive margin classes", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      const mainContainer = container.querySelector(".mb-6");
      expect(mainContainer).toBeInTheDocument();
    });

    it("should have responsive grid gap", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      const grid = container.querySelector(".gap-4");
      expect(grid).toBeInTheDocument();
    });
  });

  describe("Button Behavior", () => {
    it("should have proper button type attribute", () => {
      render(<UnitSummary {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("type", "button");
      });
    });

    it("should be keyboard accessible", () => {
      render(<UnitSummary {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        button.focus();
        expect(document.activeElement).toBe(button);
      });
    });

    it("should handle multiple rapid clicks", () => {
      render(<UnitSummary {...defaultProps} />);

      const totalButton = screen.getByText("Total").closest("button");
      fireEvent.click(totalButton);
      fireEvent.click(totalButton);
      fireEvent.click(totalButton);

      // Should navigate 3 times
      expect(mockNavigate).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=all");
    });
  });

  describe("Accessibility", () => {
    it("should have semantic button elements", () => {
      render(<UnitSummary {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(6);
    });

    it("should have proper text hierarchy", () => {
      render(<UnitSummary {...defaultProps} />);

      const heading = screen.getByText("Unit Summary");
      expect(heading.tagName).toBe("H3");
    });

    it("should have descriptive labels for each unit type", () => {
      render(<UnitSummary {...defaultProps} />);

      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText("Online")).toBeInTheDocument();
      expect(screen.getByText("Offline")).toBeInTheDocument();
      expect(screen.getByText("Maintenance")).toBeInTheDocument();
      expect(screen.getByText("Alerts")).toBeInTheDocument();
      expect(screen.getByText("Alarms")).toBeInTheDocument();
    });
  });

  describe("Color Coding", () => {
    it("should use blue for total units", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      const blueElements = container.querySelectorAll(".text-blue-600");
      expect(blueElements.length).toBeGreaterThan(0);
    });

    it("should use green for online units", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      const greenElements = container.querySelectorAll(".text-green-600");
      expect(greenElements.length).toBeGreaterThan(0);
    });

    it("should use gray for offline units", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      const grayElements = container.querySelectorAll(".text-gray-600");
      expect(grayElements.length).toBeGreaterThan(0);
    });

    it("should use yellow for maintenance units", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      const yellowElements = container.querySelectorAll(".text-yellow-600");
      expect(yellowElements.length).toBeGreaterThan(0);
    });

    it("should use orange for alerts", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      const orangeElements = container.querySelectorAll(".text-orange-600");
      expect(orangeElements.length).toBeGreaterThan(0);
    });

    it("should use red for alarms", () => {
      const { container } = render(<UnitSummary {...defaultProps} />);

      const redElements = container.querySelectorAll(".text-red-600");
      expect(redElements.length).toBeGreaterThan(0);
    });
  });
});
