/**
 * Tests for PerformanceDashboard Component
 * Tests rendering, user interactions, dialog flows, and role-based filtering
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================
// MOCK SETUP - Using mutable state for per-test control
// ============================================================

// 1. Mutable auth state
let mockAuthState = {
  user: { id: "1", username: "admin", role: "admin" },
  isAuthenticated: true,
};

vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockAuthState,
}));

// 2. Mutable units data - using getter so it's read fresh each time
const defaultUnits = [
  {
    id: "TC001",
    productLine: "Power-Box",
    watergeneration: true,
    currentPower: 0.0,
    parasiticLoad: 0.0,
    userLoad: 0.0,
  },
  {
    id: "TC002",
    productLine: "Power-Box",
    watergeneration: true,
    currentPower: 11.8,
    parasiticLoad: 0.2,
    userLoad: 11.1,
  },
  {
    id: "TC003",
    productLine: "Power-Box",
    watergeneration: true,
    currentPower: 0.0,
    parasiticLoad: 0.0,
    userLoad: 0.0,
  },
  {
    id: "TC004",
    productLine: "Power-Box",
    watergeneration: false,
    currentPower: 13.2,
    parasiticLoad: 0.3,
    userLoad: 12.9,
  },
  {
    id: "TC005",
    productLine: "Power-Box",
    watergeneration: true,
    currentPower: 12.5,
    parasiticLoad: 0.2,
    userLoad: 0.0,
  },
  {
    id: "TC006",
    productLine: "Power-Box",
    watergeneration: true,
    currentPower: 49.5,
    parasiticLoad: 1.0,
    userLoad: 46.9,
  },
  {
    id: "TC007",
    productLine: "Power-Box",
    watergeneration: true,
    currentPower: 6.7,
    parasiticLoad: 0.1,
    userLoad: 5.4,
  },
  {
    id: "TC008",
    productLine: "Power-Box",
    watergeneration: false,
    currentPower: 88.8,
    parasiticLoad: 1.8,
    userLoad: 84.8,
  },
  {
    id: "TC009",
    productLine: "Power-Plus",
    watergeneration: true,
    currentPower: 22.8,
    parasiticLoad: 0.5,
    userLoad: 20.3,
  },
  {
    id: "TC010",
    productLine: "Power-Plus",
    watergeneration: true,
    currentPower: 4.3,
    parasiticLoad: 0.1,
    userLoad: 3.5,
  },
  {
    id: "TC011",
    productLine: "Power-Plus",
    watergeneration: true,
    currentPower: 18.7,
    parasiticLoad: 0.4,
    userLoad: 15.3,
  },
  {
    id: "TC012",
    productLine: "Power-Plus",
    watergeneration: false,
    currentPower: 2.1,
    parasiticLoad: 0.0,
    userLoad: 1.9,
  },
  {
    id: "TC013",
    productLine: "Power-Plus",
    watergeneration: true,
    currentPower: 3.1,
    parasiticLoad: 0.1,
    userLoad: 2.7,
  },
  {
    id: "TC014",
    productLine: "Power-Plus",
    watergeneration: false,
    currentPower: 8.9,
    parasiticLoad: 0.2,
    userLoad: 7.9,
  },
  {
    id: "TC015",
    productLine: "Power-Plus",
    watergeneration: true,
    currentPower: 5.4,
    parasiticLoad: 0.1,
    userLoad: 4.3,
  },
  {
    id: "TC016",
    productLine: "Titan",
    watergeneration: true,
    currentPower: 16.7,
    parasiticLoad: 0.3,
    userLoad: 16.3,
  },
  {
    id: "TC017",
    productLine: "Titan",
    watergeneration: false,
    currentPower: 0.0,
    parasiticLoad: 0.0,
    userLoad: 0.0,
  },
  {
    id: "TC018",
    productLine: "Titan",
    watergeneration: false,
    currentPower: 1.9,
    parasiticLoad: 0.0,
    userLoad: 1.8,
  },
  {
    id: "TC019",
    productLine: "Titan",
    watergeneration: true,
    currentPower: 11.6,
    parasiticLoad: 0.2,
    userLoad: 11.1,
  },
  {
    id: "TC020",
    productLine: "Titan",
    watergeneration: false,
    currentPower: 78.9,
    parasiticLoad: 1.6,
    userLoad: 69.4,
  },
];

let mockUnitsData = [...defaultUnits];

vi.mock("../data/mockUnits", () => ({
  get units() {
    return mockUnitsData;
  },
}));

vi.mock("../utils/formatCurrency", () => ({
  formatCurrency: (value) => `$${value.toFixed(2)}`,
}));

// 3. Mock child components with configurable save handlers
let mockFinancialSaveHandler = (onSave) => {
  onSave({
    electricityCost: 0.5,
    rebate: 60,
    feedInTariff: 0.1,
  });
};

vi.mock("../components/FinancialAssumptions", () => ({
  default: ({ isOpen, onClose, onSave, currentAssumptions }) =>
    isOpen ? (
      <div data-testid="financial-assumptions-modal">
        <h2>Financial Assumptions</h2>
        <button onClick={onClose}>Close</button>
        <button
          onClick={() => {
            mockFinancialSaveHandler(onSave);
            onClose();
          }}
        >
          Save
        </button>
        <div data-testid="current-assumptions">
          {JSON.stringify(currentAssumptions)}
        </div>
      </div>
    ) : null,
}));

vi.mock("../components/ROIAssumptions", () => ({
  default: ({ isOpen, onClose, onSave, currentAssumptions }) =>
    isOpen ? (
      <div data-testid="roi-assumptions-modal">
        <h2>ROI Assumptions</h2>
        <button onClick={onClose}>Close</button>
        <button
          onClick={() => {
            onSave({
              initialInvestment: 3000000,
            });
            onClose();
          }}
        >
          Save
        </button>
        <div data-testid="current-roi-assumptions">
          {JSON.stringify(currentAssumptions)}
        </div>
      </div>
    ) : null,
}));

vi.mock("../components/EnvironmentalAssumptions", () => ({
  default: ({ isOpen, onClose, onSave, currentAssumptions }) =>
    isOpen ? (
      <div data-testid="environmental-assumptions-modal">
        <h2>Environmental Assumptions</h2>
        <button onClick={onClose}>Close</button>
        <button
          onClick={() => {
            onSave({
              dieselPricePerLiter: 2.0,
            });
            onClose();
          }}
        >
          Save
        </button>
        <div data-testid="current-environmental-assumptions">
          {JSON.stringify(currentAssumptions)}
        </div>
      </div>
    ) : null,
}));

import PerformanceDashboard from "../components/PerformanceDashboard";

describe("PerformanceDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to admin role by default
    mockAuthState = {
      user: { id: "1", username: "admin", role: "admin" },
      isAuthenticated: true,
    };
    // Reset units to default
    mockUnitsData = [...defaultUnits];
    // Reset financial save handler
    mockFinancialSaveHandler = (onSave) => {
      onSave({
        electricityCost: 0.5,
        rebate: 60,
        feedInTariff: 0.1,
      });
    };
  });

  // ============================================================
  // RENDERING TESTS
  // ============================================================
  describe("Rendering", () => {
    it("should render without crashing", () => {
      const { container } = render(<PerformanceDashboard />);
      expect(container).toBeInTheDocument();
    });

    it("should render the dashboard title", () => {
      render(<PerformanceDashboard />);
      expect(
        screen.getByText("Performance Dashboard"),
      ).toBeInTheDocument();
    });

    it("should render the dashboard subtitle", () => {
      render(<PerformanceDashboard />);
      expect(
        screen.getByText(
          "Monitor power generation, efficiency, and environmental impact",
        ),
      ).toBeInTheDocument();
    });

    it("should render breadcrumb navigation", () => {
      render(<PerformanceDashboard />);
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Performance")).toBeInTheDocument();
    });

    it("should render Total Power Generated summary card", () => {
      render(<PerformanceDashboard />);
      expect(
        screen.getByText("Total Power Generated"),
      ).toBeInTheDocument();
    });

    it("should render Current Power Generation section", () => {
      render(<PerformanceDashboard />);
      expect(
        screen.getByText("Current Power Generation"),
      ).toBeInTheDocument();
    });

    it("should hide header when hideHeader prop is true", () => {
      render(<PerformanceDashboard hideHeader={true} />);
      expect(
        screen.queryByText("Performance Dashboard"),
      ).not.toBeInTheDocument();
    });

    it("should apply custom className prop", () => {
      const { container } = render(
        <PerformanceDashboard className="custom-class" />,
      );
      expect(container.querySelector(".custom-class")).toBeInTheDocument();
    });
  });

  // ============================================================
  // ROLE-BASED FILTERING TESTS
  // ============================================================
  describe("Role-based filtering", () => {
    it("should show all 20 units for admin role", () => {
      mockAuthState = {
        user: { id: "1", username: "admin", role: "admin" },
        isAuthenticated: true,
      };
      const { container } = render(<PerformanceDashboard />);
      
      // Find the Live: Power Generation card
      const powerCards = container.querySelectorAll('[class*="rounded-lg border"]');
      const powerCard = powerCards[3];
      // Sum of all currentPower values from the 20 units
      // 0+11.8+0+13.2+12.5+49.5+6.7+88.8+22.8+4.3+18.7+2.1+3.1+8.9+5.4+16.7+0+1.9+11.6+78.9 = 356.9
      expect(powerCard.textContent).toContain("356.9");
    });

    it("should show only 5 units for user role", () => {
      mockAuthState = {
        user: { id: "2", username: "regularuser", role: "user" },
        isAuthenticated: true,
      };
      const { container } = render(<PerformanceDashboard />);
      
      const powerCards = container.querySelectorAll('[class*="rounded-lg border"]');
      const powerCard = powerCards[3];
      // Only first 5 units: 0+11.8+0+13.2+12.5 = 37.5
      expect(powerCard.textContent).toContain("37.5");
    });

    it("should use admin ROI investment (2,000,000) for admin role", () => {
      mockAuthState = {
        user: { id: "1", username: "admin", role: "admin" },
        isAuthenticated: true,
      };
      render(<PerformanceDashboard />);
      
      const roiSection = screen.getByText("ROI and Payback Period");
      const settingsButton = roiSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);

      const roiAssumptions = screen.getByTestId("current-roi-assumptions");
      expect(roiAssumptions.textContent).toContain("2000000");
    });

    it("should use user ROI investment (600,000) for user role", () => {
      mockAuthState = {
        user: { id: "2", username: "regularuser", role: "user" },
        isAuthenticated: true,
      };
      render(<PerformanceDashboard />);
      
      const roiSection = screen.getByText("ROI and Payback Period");
      const settingsButton = roiSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);

      const roiAssumptions = screen.getByTestId("current-roi-assumptions");
      expect(roiAssumptions.textContent).toContain("600000");
    });

    it("should fall back to user role when user is undefined", () => {
      mockAuthState = {
        user: null,
        isAuthenticated: false,
      };
      const { container } = render(<PerformanceDashboard />);
      expect(container).toBeInTheDocument();
      
      const powerCards = container.querySelectorAll('[class*="rounded-lg border"]');
      const powerCard = powerCards[3];
      expect(powerCard.textContent).toContain("37.5");
    });

    it("should fall back to user role when user.role is null", () => {
      mockAuthState = {
        user: { id: "3", username: "unknown", role: null },
        isAuthenticated: true,
      };
      const { container } = render(<PerformanceDashboard />);
      expect(container).toBeInTheDocument();
      
      const powerCards = container.querySelectorAll('[class*="rounded-lg border"]');
      const powerCard = powerCards[3];
      expect(powerCard.textContent).toContain("37.5");
    });

    it("should update ROI investment when userRole changes after mount", () => {
      mockAuthState = {
        user: { id: "1", username: "admin", role: "admin" },
        isAuthenticated: true,
      };
      const { rerender } = render(<PerformanceDashboard />);
      
      const roiSection = screen.getByText("ROI and Payback Period");
      const settingsButton = roiSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);
      
      expect(
        screen.getByTestId("current-roi-assumptions").textContent,
      ).toContain("2000000");
      
      fireEvent.click(screen.getByText("Close"));
      
      mockAuthState = {
        user: { id: "2", username: "regularuser", role: "user" },
        isAuthenticated: true,
      };
      
      rerender(<PerformanceDashboard />);
      
      const newRoiSection = screen.getByText("ROI and Payback Period");
      const newSettingsButton = newRoiSection.parentElement.querySelector("button");
      fireEvent.click(newSettingsButton);
      
      expect(
        screen.getByTestId("current-roi-assumptions").textContent,
      ).toContain("600000");
    });
  });

  // ============================================================
  // DATA CALCULATIONS TESTS
  // ============================================================
  describe("Data calculations", () => {
    it("should calculate total current power correctly for admin", () => {
      mockAuthState = {
        user: { id: "1", username: "admin", role: "admin" },
        isAuthenticated: true,
      };
      const { container } = render(<PerformanceDashboard />);
      const powerCards = container.querySelectorAll('[class*="rounded-lg border"]');
      const powerCard = powerCards[3];
      expect(powerCard.textContent).toContain("356.9");
    });

    it("should calculate total current power correctly for user", () => {
      mockAuthState = {
        user: { id: "2", username: "regularuser", role: "user" },
        isAuthenticated: true,
      };
      const { container } = render(<PerformanceDashboard />);
      const powerCards = container.querySelectorAll('[class*="rounded-lg border"]');
      const powerCard = powerCards[3];
      expect(powerCard.textContent).toContain("37.5");
    });

    it("should calculate total parasitic load correctly", () => {
      const { container } = render(<PerformanceDashboard />);
      const powerCards = container.querySelectorAll('[class*="rounded-lg border"]');
      const parasiticCard = powerCards[4];
      // Sum of all parasiticLoad: 0+0.2+0+0.3+0.2+1.0+0.1+1.8+0.5+0.1+0.4+0+0.1+0.2+0.1+0.3+0+0+0.2+1.6 = 7.1
      expect(parasiticCard.textContent).toContain("7.1");
    });

    it("should calculate total user load correctly", () => {
      const { container } = render(<PerformanceDashboard />);
      const powerCards = container.querySelectorAll('[class*="rounded-lg border"]');
      const userLoadCard = powerCards[5];
      // Sum of all userLoad: 0+11.1+0+12.9+0+46.9+5.4+84.8+20.3+3.5+15.3+1.9+2.7+7.9+4.3+16.3+0+1.8+11.1+69.4 = 315.6
      expect(userLoadCard.textContent).toContain("315.6");
    });

    it("should calculate total feed-in load correctly", () => {
      const { container } = render(<PerformanceDashboard />);
      const powerCards = container.querySelectorAll('[class*="rounded-lg border"]');
      const feedInCard = powerCards[6];
      // 356.9 - 7.1 - 315.6 = 34.2
      expect(feedInCard.textContent).toContain("34.2");
    });

    it("should display financial savings cards", () => {
      render(<PerformanceDashboard />);
      expect(screen.getByText(/Savings \(Today\)/)).toBeInTheDocument();
      expect(screen.getByText(/Savings \(This Month\)/)).toBeInTheDocument();
      expect(screen.getByText(/Savings \(All Time\)/)).toBeInTheDocument();
    });

    it("should display ROI and Payback Period cards", () => {
      render(<PerformanceDashboard />);
      expect(screen.getByText("ROI")).toBeInTheDocument();
      expect(screen.getByText("Payback Period")).toBeInTheDocument();
    });

    it("should display environmental impact cards", () => {
      render(<PerformanceDashboard />);
      expect(
        screen.getByText(/Diesel Displaced \(Today\)/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Diesel Displaced \(This Month\)/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Diesel Displaced \(All Time\)/),
      ).toBeInTheDocument();
    });
  });

  // ============================================================
  // WATER GENERATION TESTS
  // ============================================================
  describe("Water generation display", () => {
    it("should display water generation card when units have watergeneration", () => {
      render(<PerformanceDashboard />);
      // With default data, some units have watergeneration: true
      expect(screen.getByText("Total Water Generated")).toBeInTheDocument();
    });

    it("should hide water generation card when no units have watergeneration", () => {
      mockUnitsData = defaultUnits.map((u) => ({
        ...u,
        watergeneration: false,
      }));
      
      render(<PerformanceDashboard />);
      expect(
        screen.queryByText("Total Water Generated"),
      ).not.toBeInTheDocument();
    });

    it("should hide water generation card when watergeneration is undefined", () => {
      mockUnitsData = defaultUnits.map((u) => {
        const { watergeneration, ...rest } = u;
        return rest;
      });
      
      render(<PerformanceDashboard />);
      expect(
        screen.queryByText("Total Water Generated"),
      ).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // SAVINGS CLAMPING TESTS
  // ============================================================
  describe("Savings clamping", () => {
    it("should clamp savings to 0 when they'd otherwise be negative", () => {
      // Use a single unit with very low production
      mockUnitsData = [
        {
          id: "TC001",
          productLine: "Power-Box",
          watergeneration: false,
          currentPower: 1.0,
          parasiticLoad: 0.0,
          userLoad: 1.0,
        },
      ];
      
      // Set a very high rebate to force negative savings
      mockFinancialSaveHandler = (onSave) => {
        onSave({
          electricityCost: 0.4,
          rebate: 5000,
          feedInTariff: 0.08,
        });
      };
      
      render(<PerformanceDashboard />);
      
      const financialSection = screen.getByText("Financial Impact");
      const settingsButton = financialSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);
      
      fireEvent.click(screen.getByText("Save"));
      
      const savingsCards = screen.getAllByText(/Savings \(Today\)/);
      const savingsContainer = savingsCards[0].closest("div");
      expect(savingsContainer.textContent).toContain("$0.00");
    });
  });

  // ============================================================
  // FEED-IN TREND TESTS
  // ============================================================
  describe("Feed-in trend", () => {
    it("should show up trend when feed-in load is positive", () => {
      const { container } = render(<PerformanceDashboard />);
      const feedInCard = container.querySelectorAll('[class*="rounded-lg border"]')[6];
      expect(feedInCard.textContent).toContain("34.2");
      // Should show trending up arrow (green)
      expect(feedInCard.querySelector('[class*="text-green"]')).toBeInTheDocument();
    });

    it("should show down trend when feed-in load is zero or negative", () => {
      // Use units where total feed-in load is 0
      mockUnitsData = [
        {
          id: "TC001",
          productLine: "Power-Box",
          watergeneration: false,
          currentPower: 10.0,
          parasiticLoad: 5.0,
          userLoad: 5.0,
        },
      ];
      
      const { container } = render(<PerformanceDashboard />);
      const feedInCard = container.querySelectorAll('[class*="rounded-lg border"]')[6];
      expect(feedInCard.textContent).toContain("0.0");
      // Should show trending down arrow (red)
      expect(feedInCard.querySelector('[class*="text-red"]')).toBeInTheDocument();
    });
  });

  // ============================================================
  // EMPTY UNITS TESTS
  // ============================================================
  describe("Empty units handling", () => {
    it("should handle empty units data gracefully", () => {
      mockUnitsData = [];
      
      const { container } = render(<PerformanceDashboard />);
      expect(container).toBeInTheDocument();
      
      const powerCards = container.querySelectorAll('[class*="rounded-lg border"]');
      const powerCard = powerCards[3];
      expect(powerCard.textContent).toContain("0.0");
    });

    it("should handle Infinity payback period when annual savings is 0", () => {
      mockUnitsData = [];
      
      render(<PerformanceDashboard />);
      expect(screen.getByText("∞")).toBeInTheDocument();
    });

    it("should show 0% ROI when annual savings is 0", () => {
      mockUnitsData = [];
      
      render(<PerformanceDashboard />);
      expect(screen.getByText("0.00%")).toBeInTheDocument();
    });
  });

  // ============================================================
  // DIALOG TESTS
  // ============================================================
  describe("Dialog interactions", () => {
    it("should open financial assumptions dialog", () => {
      render(<PerformanceDashboard />);
      
      const financialSection = screen.getByText("Financial Impact");
      const settingsButton = financialSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);

      expect(
        screen.getByTestId("financial-assumptions-modal"),
      ).toBeInTheDocument();
    });

    it("should close financial assumptions dialog", () => {
      render(<PerformanceDashboard />);
      
      const financialSection = screen.getByText("Financial Impact");
      const settingsButton = financialSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);

      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      expect(
        screen.queryByTestId("financial-assumptions-modal"),
      ).not.toBeInTheDocument();
    });

    it("should open ROI assumptions dialog", () => {
      render(<PerformanceDashboard />);
      
      const roiSection = screen.getByText("ROI and Payback Period");
      const settingsButton = roiSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);

      expect(
        screen.getByTestId("roi-assumptions-modal"),
      ).toBeInTheDocument();
    });

    it("should close ROI assumptions dialog", () => {
      render(<PerformanceDashboard />);
      
      const roiSection = screen.getByText("ROI and Payback Period");
      const settingsButton = roiSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);

      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      expect(
        screen.queryByTestId("roi-assumptions-modal"),
      ).not.toBeInTheDocument();
    });

    it("should open environmental assumptions dialog", () => {
      render(<PerformanceDashboard />);
      
      const envSection = screen.getByText("Environmental Impact");
      const settingsButton = envSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);

      expect(
        screen.getByTestId("environmental-assumptions-modal"),
      ).toBeInTheDocument();
    });

    it("should close environmental assumptions dialog", () => {
      render(<PerformanceDashboard />);
      
      const envSection = screen.getByText("Environmental Impact");
      const settingsButton = envSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);

      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      expect(
        screen.queryByTestId("environmental-assumptions-modal"),
      ).not.toBeInTheDocument();
    });

    it("should save financial assumptions and close", () => {
      render(<PerformanceDashboard />);
      
      const financialSection = screen.getByText("Financial Impact");
      const settingsButton = financialSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);

      fireEvent.click(screen.getByText("Save"));

      expect(
        screen.queryByTestId("financial-assumptions-modal"),
      ).not.toBeInTheDocument();
    });

    it("should save ROI assumptions and close", () => {
      render(<PerformanceDashboard />);
      
      const roiSection = screen.getByText("ROI and Payback Period");
      const settingsButton = roiSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);

      fireEvent.click(screen.getByText("Save"));

      expect(
        screen.queryByTestId("roi-assumptions-modal"),
      ).not.toBeInTheDocument();
    });

    it("should save environmental assumptions and close", () => {
      render(<PerformanceDashboard />);
      
      const envSection = screen.getByText("Environmental Impact");
      const settingsButton = envSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);

      fireEvent.click(screen.getByText("Save"));

      expect(
        screen.queryByTestId("environmental-assumptions-modal"),
      ).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // FLEET PERFORMANCE TESTS
  // ============================================================
  describe("Fleet performance display", () => {
    it("should display fleet uptime card", () => {
      render(<PerformanceDashboard />);
      expect(screen.getByText("Fleet Uptime")).toBeInTheDocument();
      // The value is rendered as a separate element
      const uptimeValue = screen.getByText("97.8", { exact: false });
      expect(uptimeValue).toBeInTheDocument();
    });

    it("should display MTTR card", () => {
      render(<PerformanceDashboard />);
      expect(screen.getByText("MTTR")).toBeInTheDocument();
      const mttrValue = screen.getByText("4.2", { exact: false });
      expect(mttrValue).toBeInTheDocument();
    });

    it("should display days since failure card", () => {
      render(<PerformanceDashboard />);
      expect(
        screen.getByText("Consecutive days of Optimal Operation"),
      ).toBeInTheDocument();
      const daysValue = screen.getByText("23", { exact: false });
      expect(daysValue).toBeInTheDocument();
    });
  });

  // ============================================================
  // COMPONENT LIFECYCLE TESTS
  // ============================================================
  describe("Component lifecycle", () => {
    it("should mount and unmount without errors", () => {
      const { unmount } = render(<PerformanceDashboard />);
      expect(() => unmount()).not.toThrow();
    });

    it("should handle multiple renders", () => {
      const { rerender } = render(<PerformanceDashboard />);
      expect(() => rerender(<PerformanceDashboard />)).not.toThrow();
      expect(() => rerender(<PerformanceDashboard hideHeader={true} />)).not.toThrow();
    });
  });
});
