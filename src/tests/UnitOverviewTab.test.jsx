import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import UnitOverviewTab from "../components/unit-details/UnitOverviewTab";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Zap: ({ className }) => <svg data-testid="zap-icon" className={className} />,
  AlertTriangle: ({ className }) => <svg data-testid="alert-triangle-icon" className={className} />,
}));

// Mock UI components
vi.mock("../components/ui/card", () => ({
  Card: ({ children, className }) => <div data-testid="card" className={className}>{children}</div>,
  CardContent: ({ children, className }) => <div data-testid="card-content" className={className}>{children}</div>,
}));

// Mock UnitVitals component
vi.mock("../components/unit-details/UnitVitals", () => ({
  default: ({ unit }) => <div data-testid="unit-vitals" data-unit-id={unit.id}>Unit Vitals: {unit.name}</div>,
}));

describe("UnitOverviewTab", () => {
  const mockUnitWithAlarm = {
    id: "TC001",
    name: "Unit 1",
    hasAlarm: true,
    status: "online",
  };

  const mockUnitWithoutAlarm = {
    id: "TC002",
    name: "Unit 2",
    hasAlarm: false,
    status: "online",
  };

  describe("basic rendering", () => {
    it("renders UnitVitals component", () => {
      render(<UnitOverviewTab unit={mockUnitWithoutAlarm} />);
      
      const unitVitals = screen.getByTestId("unit-vitals");
      expect(unitVitals).toBeInTheDocument();
      expect(unitVitals).toHaveAttribute("data-unit-id", "TC002");
      expect(unitVitals).toHaveTextContent("Unit Vitals: Unit 2");
    });

    it("renders with correct container class", () => {
      const { container } = render(<UnitOverviewTab unit={mockUnitWithoutAlarm} />);
      
      const containerDiv = container.firstChild;
      expect(containerDiv).toHaveClass("space-y-6");
    });
  });

  describe("alarm alert display", () => {
    it("shows alarm alert when unit has alarm", () => {
      render(<UnitOverviewTab unit={mockUnitWithAlarm} />);
      
      // Check for alarm card
      const card = screen.getByTestId("card");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("bg-red-600");
      expect(card).toHaveClass("border-red-700");
      expect(card).toHaveClass("animate-pulse");
      
      // Check for alarm content
      expect(screen.getByText("🚨 NH3 LEAK DETECTED 🚨")).toBeInTheDocument();
      expect(screen.getByText(/Critical alarm: Toxic ammonia leak detected in system/)).toBeInTheDocument();
      
      // Check for Zap icon
      const zapIcon = screen.getByTestId("zap-icon");
      expect(zapIcon).toBeInTheDocument();
      expect(zapIcon).toHaveClass("h-8");
      expect(zapIcon).toHaveClass("w-8");
      expect(zapIcon).toHaveClass("text-white");
      expect(zapIcon).toHaveClass("animate-bounce");
    });

    it("shows NH3 leak alarm when differential pressure is less than 4 bar", () => {
      const unitLowPressure = {
        id: "TC003",
        name: "Unit 3",
        hasAlarm: false,
        differentialPressure: 3.2,
      };
      render(<UnitOverviewTab unit={unitLowPressure} />);

      expect(screen.getByText("🚨 NH3 LEAK DETECTED 🚨")).toBeInTheDocument();
      expect(screen.getByText(/Critical alarm: Toxic ammonia leak detected in system/)).toBeInTheDocument();
    });

    it("shows High Differential Pressure alarm when differential pressure exceeds 6 bar", () => {
      const unitHighPressure = {
        id: "TC004",
        name: "Unit 4",
        hasAlarm: false,
        differentialPressure: 7.5,
      };
      render(<UnitOverviewTab unit={unitHighPressure} />);

      expect(screen.getByText("🚨 HIGH DIFFERENTIAL PRESSURE - AUTO SHUTDOWN 🚨")).toBeInTheDocument();
      expect(screen.getByText(/Differential pressure exceeds 6 bar \(7.5 bar\)/)).toBeInTheDocument();
    });

    it("shows Low Battery Voltage alert when battery voltage is below 23V", () => {
      const unitLowBattery = {
        id: "TC005",
        name: "Unit 5",
        hasAlarm: false,
        batteryVoltage: 21.8,
      };
      render(<UnitOverviewTab unit={unitLowBattery} />);

      expect(screen.getByText("⚠️ BATTERY VOLTAGE ALERT ⚠️")).toBeInTheDocument();
      expect(screen.getByText(/Low Battery Voltage Alert: 21.8V \(Threshold < 23V\)/)).toBeInTheDocument();
    });

    it("shows High Battery Voltage alert when battery voltage is above 27V", () => {
      const unitHighBattery = {
        id: "TC006",
        name: "Unit 6",
        hasAlarm: false,
        batteryVoltage: 28.4,
      };
      render(<UnitOverviewTab unit={unitHighBattery} />);

      expect(screen.getByText("⚠️ BATTERY VOLTAGE ALERT ⚠️")).toBeInTheDocument();
      expect(screen.getByText(/High Battery Voltage Alert: 28.4V \(Threshold > 27V\)/)).toBeInTheDocument();
    });

    it("does not show alarm alert when unit does not have alarm and metrics are within normal ranges", () => {
      const unitNormal = {
        ...mockUnitWithoutAlarm,
        differentialPressure: 5.0,
        batteryVoltage: 24.5,
      };
      render(<UnitOverviewTab unit={unitNormal} />);
      
      // Alarm card should not be present
      expect(screen.queryByText("🚨 NH3 LEAK DETECTED 🚨")).not.toBeInTheDocument();
      expect(screen.queryByText("🚨 HIGH DIFFERENTIAL PRESSURE - AUTO SHUTDOWN 🚨")).not.toBeInTheDocument();
      expect(screen.queryByText("⚠️ BATTERY VOLTAGE ALERT ⚠️")).not.toBeInTheDocument();
      
      // Zap icon should not be present (only in alarm card)
      expect(screen.queryByTestId("zap-icon")).not.toBeInTheDocument();
    });

    it("renders alarm card with correct structure", () => {
      render(<UnitOverviewTab unit={mockUnitWithAlarm} />);
      
      const cardContent = screen.getByTestId("card-content");
      expect(cardContent).toHaveClass("p-4");
      
      // Check for flex layout
      const flexContainer = cardContent.querySelector('.flex');
      expect(flexContainer).toBeInTheDocument();
      expect(flexContainer).toHaveClass('items-center');
      expect(flexContainer).toHaveClass('space-x-3');
      
      // Check for title
      const title = screen.getByText("🚨 NH3 LEAK DETECTED 🚨");
      expect(title).toHaveClass("text-xl");
      expect(title).toHaveClass("font-bold");
      expect(title).toHaveClass("text-white");
      
      // Check for description
      const description = screen.getByText(/Critical alarm: Toxic ammonia leak detected in system/);
      expect(description).toHaveClass("text-red-100");
    });
  });

  describe("unit data prop", () => {
    it("passes unit prop to UnitVitals", () => {
      render(<UnitOverviewTab unit={mockUnitWithAlarm} />);
      
      const unitVitals = screen.getByTestId("unit-vitals");
      expect(unitVitals).toHaveAttribute("data-unit-id", "TC001");
      expect(unitVitals).toHaveTextContent("Unit Vitals: Unit 1");
    });

    it("handles unit with different ID and name", () => {
      const customUnit = {
        id: "TC099",
        name: "Custom Unit",
        hasAlarm: false,
      };
      
      render(<UnitOverviewTab unit={customUnit} />);
      
      const unitVitals = screen.getByTestId("unit-vitals");
      expect(unitVitals).toHaveAttribute("data-unit-id", "TC099");
      expect(unitVitals).toHaveTextContent("Unit Vitals: Custom Unit");
    });
  });

  describe("edge cases", () => {
    it("handles unit with hasAlarm being undefined", () => {
      const unitWithUndefinedAlarm = {
        id: "TC003",
        name: "Unit 3",
        hasAlarm: undefined,
      };
      
      render(<UnitOverviewTab unit={unitWithUndefinedAlarm} />);
      
      // Should not show alarm
      expect(screen.queryByText("🚨 NH3 LEAK DETECTED 🚨")).not.toBeInTheDocument();
      
      // Should still render UnitVitals
      expect(screen.getByTestId("unit-vitals")).toBeInTheDocument();
    });

    it("handles unit with hasAlarm being null", () => {
      const unitWithNullAlarm = {
        id: "TC004",
        name: "Unit 4",
        hasAlarm: null,
      };
      
      render(<UnitOverviewTab unit={unitWithNullAlarm} />);
      
      // Should not show alarm
      expect(screen.queryByText("🚨 NH3 LEAK DETECTED 🚨")).not.toBeInTheDocument();
      
      // Should still render UnitVitals
      expect(screen.getByTestId("unit-vitals")).toBeInTheDocument();
    });

    it("handles unit with hasAlarm being truthy (true)", () => {
      const unitWithTruthyAlarm = {
        id: "TC005",
        name: "Unit 5",
        hasAlarm: true,
      };
      
      render(<UnitOverviewTab unit={unitWithTruthyAlarm} />);
      
      // Should show alarm
      expect(screen.getByText("🚨 NH3 LEAK DETECTED 🚨")).toBeInTheDocument();
      expect(screen.getByTestId("zap-icon")).toBeInTheDocument();
    });

    it("handles unit with hasAlarm being truthy (non-boolean)", () => {
      const unitWithNonBooleanAlarm = {
        id: "TC006",
        name: "Unit 6",
        hasAlarm: "alarm-string", // truthy but not boolean
      };
      
      render(<UnitOverviewTab unit={unitWithNonBooleanAlarm} />);
      
      // Should still show alarm since it's truthy
      expect(screen.getByText("🚨 NH3 LEAK DETECTED 🚨")).toBeInTheDocument();
      expect(screen.getByTestId("zap-icon")).toBeInTheDocument();
    });

    it("handles unit with missing hasAlarm property", () => {
      const unitWithoutHasAlarm = {
        id: "TC007",
        name: "Unit 7",
        // hasAlarm property is missing
      };
      
      render(<UnitOverviewTab unit={unitWithoutHasAlarm} />);
      
      // Should not show alarm
      expect(screen.queryByText("🚨 NH3 LEAK DETECTED 🚨")).not.toBeInTheDocument();
      
      // Should still render UnitVitals
      expect(screen.getByTestId("unit-vitals")).toBeInTheDocument();
    });
  });

  describe("alarm alert animation classes", () => {
    it("applies pulse animation to alarm card", () => {
      render(<UnitOverviewTab unit={mockUnitWithAlarm} />);
      
      const card = screen.getByTestId("card");
      expect(card).toHaveClass("animate-pulse");
    });

    it("applies bounce animation to Zap icon", () => {
      render(<UnitOverviewTab unit={mockUnitWithAlarm} />);
      
      const zapIcon = screen.getByTestId("zap-icon");
      expect(zapIcon).toHaveClass("animate-bounce");
    });
  });
});
