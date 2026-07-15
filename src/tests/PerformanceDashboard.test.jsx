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
    id: "unit-1",
    name: "Test Unit 1",
    status: "online",
    efficiency: 85,
    temperature: 65,
    currentPower: 150,
    parasiticLoad: 10,
    userLoad: 50,
    waterGeneration: 100,
  },
  {
    id: "unit-2",
    name: "Test Unit 2",
    status: "online",
    efficiency: 90,
    temperature: 60,
    currentPower: 120,
    parasiticLoad: 8,
    userLoad: 40,
    waterGeneration: 80,
  },
  {
    id: "unit-3",
    name: "Test Unit 3",
    status: "offline",
    efficiency: 0,
    temperature: 25,
    currentPower: 0,
    parasiticLoad: 0,
    userLoad: 0,
    waterGeneration: 0,
  },
  {
    id: "unit-4",
    name: "Test Unit 4",
    status: "online",
    efficiency: 75,
    temperature: 70,
    currentPower: 90,
    parasiticLoad: 5,
    userLoad: 30,
    waterGeneration: 60,
  },
  {
    id: "unit-5",
    name: "Test Unit 5",
    status: "online",
    efficiency: 80,
    temperature: 55,
    currentPower: 110,
    parasiticLoad: 7,
    userLoad: 35,
    waterGeneration: 50,
  },
  {
    id: "unit-6",
    name: "Test Unit 6",
    status: "online",
    efficiency: 95,
    temperature: 50,
    currentPower: 130,
    parasiticLoad: 6,
    userLoad: 45,
    waterGeneration: 70,
  },
  {
    id: "unit-7",
    name: "Test Unit 7",
    status: "online",
    efficiency: 88,
    temperature: 62,
    currentPower: 100,
    parasiticLoad: 4,
    userLoad: 25,
    waterGeneration: 40,
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
          onClick={() => mockFinancialSaveHandler(onSave)}
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
          onClick={() =>
            onSave({
              initialInvestment: 3000000,
            })
          }
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
          onClick={() =>
            onSave({
              dieselPricePerLiter: 2.0,
            })
          }
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
    it("should show all 7 units for admin role", () => {
      mockAuthState = {
        user: { id: "1", username: "admin", role: "admin" },
        isAuthenticated: true,
      };
      const { container } = render(<PerformanceDashboard />);
      
      // All 7 units should be included in the total
      // 150+120+0+90+110+130+100 = 700
      const cards = container.querySelectorAll("[class*='rounded-lg border']");
      const powerCard = cards[0];
      expect(powerCard.textContent).toContain("700.0");
    });

    it("should show only 5 units for user role", () => {
      mockAuthState = {
        user: { id: "2", username: "regularuser", role: "user" },
        isAuthenticated: true,
      };
      const { container } = render(<PerformanceDashboard />);
      
      // Only first 5 units should be included
      // 150+120+0+90+110 = 470
      const cards = container.querySelectorAll("[class*='rounded-lg border']");
      const powerCard = cards[0];
      expect(powerCard.textContent).toContain("470.0");
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
      
      // Should default to user behavior (5 units)
      const cards = container.querySelectorAll("[class*='rounded-lg border']");
      const powerCard = cards[0];
      expect(powerCard.textContent).toContain("470.0");
    });

    it("should fall back to user role when user.role is null", () => {
      mockAuthState = {
        user: { id: "3", username: "unknown", role: null },
        isAuthenticated: true,
      };
      const { container } = render(<PerformanceDashboard />);
      expect(container).toBeInTheDocument();
      
      // Should default to user behavior (5 units)
      const cards = container.querySelectorAll("[class*='rounded-lg border']");
      const powerCard = cards[0];
      expect(powerCard.textContent).toContain("470.0");
    });

    it("should update ROI investment when userRole changes after mount", () => {
      // Start as admin
      mockAuthState = {
        user: { id: "1", username: "admin", role: "admin" },
        isAuthenticated: true,
      };
      const { rerender } = render(<PerformanceDashboard />);
      
      // Open ROI modal to check initial value
      const roiSection = screen.getByText("ROI and Payback Period");
      const settingsButton = roiSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);
      
      expect(
        screen.getByTestId("current-roi-assumptions").textContent,
      ).toContain("2000000");
      
      // Close modal
      fireEvent.click(screen.getByText("Close"));
      
      // Change to user role
      mockAuthState = {
        user: { id: "2", username: "regularuser", role: "user" },
        isAuthenticated: true,
      };
      
      // Re-render with new role
      rerender(<PerformanceDashboard />);
      
      // Re-open modal
      const newRoiSection = screen.getByText("ROI and Payback Period");
      const newSettingsButton = newRoiSection.parentElement.querySelector("button");
      fireEvent.click(newSettingsButton);
      
      // Should now show user investment
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
      const cards = container.querySelectorAll("[class*='rounded-lg border']");
      const powerCard = cards[0];
      expect(powerCard.textContent).toContain("700.0");
    });

    it("should calculate total current power correctly for user", () => {
      mockAuthState = {
        user: { id: "2", username: "regularuser", role: "user" },
        isAuthenticated: true,
      };
      const { container } = render(<PerformanceDashboard />);
      const cards = container.querySelectorAll("[class*='rounded-lg border']");
      const powerCard = cards[0];
      expect(powerCard.textContent).toContain("470.0");
    });

    it("should calculate total parasitic load correctly", () => {
      const { container } = render(<PerformanceDashboard />);
      const cards = container.querySelectorAll("[class*='rounded-lg border']");
      const parasiticCard = cards[1];
      // 10+8+0+5+7+6+4 = 40
      expect(parasiticCard.textContent).toContain("40.0");
    });

    it("should calculate total user load correctly", () => {
      const { container } = render(<PerformanceDashboard />);
      const cards = container.querySelectorAll("[class*='rounded-lg border']");
      const userLoadCard = cards[2];
      // 50+40+0+30+35+45+25 = 225
      expect(userLoadCard.textContent).toContain("225.0");
    });

    it("should calculate total feed-in load correctly", () => {
      const { container } = render(<PerformanceDashboard />);
      const cards = container.querySelectorAll("[class*='rounded-lg border']");
      const feedInCard = cards[3];
      // 700 - 40 - 225 = 435
      expect(feedInCard.textContent).toContain("435.0");
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
    it("should display water generation card when units have waterGeneration", () => {
      render(<PerformanceDashboard />);
      expect(screen.getByText("Total Water Generated")).toBeInTheDocument();
    });

    it("should hide water generation card when no units have waterGeneration", () => {
      // Remove waterGeneration from all units
      mockUnitsData = defaultUnits.map((u) => ({
        ...u,
        waterGeneration: undefined,
      }));
      
      render(<PerformanceDashboard />);
      expect(
        screen.queryByText("Total Water Generated"),
      ).not.toBeInTheDocument();
    });

    it("should hide water generation card when all units have 0 waterGeneration", () => {
      mockUnitsData = defaultUnits.map((u) => ({
        ...u,
        waterGeneration: 0,
      }));
      
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
          id: "unit-1",
          name: "Low Production Unit",
          status: "online",
          efficiency: 10,
          temperature: 25,
          currentPower: 1,
          parasiticLoad: 0,
          userLoad: 1,
          waterGeneration: 0,
        },
      ];
      
      // Set a very high rebate to force negative savings
      mockFinancialSaveHandler = (onSave) => {
        onSave({
          electricityCost: 0.4,
          rebate: 5000, // Very high rebate
          feedInTariff: 0.08,
        });
      };
      
      render(<PerformanceDashboard />);
      
      // Open financial assumptions modal
      const financialSection = screen.getByText("Financial Impact");
      const settingsButton = financialSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);
      
      // Save with high rebate
      fireEvent.click(screen.getByText("Save"));
      
      // Savings should be clamped to 0
      // Look for the savings card with $0.00
      const savingsCards = screen.getAllByText(/Savings \(Today\)/);
      // Find the parent div and check for $0.00
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
      const feedInCard = container.querySelectorAll("[class*='rounded-lg border']")[3];
      // Should show trending up arrow
      expect(feedInCard.textContent).toContain("435.0");
      // The trend icon should be present (we can check via class or presence)
      expect(feedInCard.querySelector('[class*="text-green"]')).toBeInTheDocument();
    });

    it("should show down trend when feed-in load is zero or negative", () => {
      // Use units where total feed-in load is 0 or negative
      mockUnitsData = [
        {
          id: "unit-1",
          name: "Test Unit",
          status: "online",
          efficiency: 10,
          temperature: 25,
          currentPower: 10,
          parasiticLoad: 5,
          userLoad: 5,
          waterGeneration: 0,
        },
      ];
      
      const { container } = render(<PerformanceDashboard />);
      const feedInCard = container.querySelectorAll("[class*='rounded-lg border']")[3];
      // Feed-in load should be 0
      expect(feedInCard.textContent).toContain("0.0");
      // Should show trending down arrow
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
      
      const cards = container.querySelectorAll("[class*='rounded-lg border']");
      const powerCard = cards[0];
      expect(powerCard.textContent).toContain("0.0");
    });

    it("should handle Infinity payback period when annual savings is 0", () => {
      mockUnitsData = [];
      
      render(<PerformanceDashboard />);
      // With no units, savings will be 0, payback should show ∞
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

      const saveButton = screen.getByText("Save");
      fireEvent.click(saveButton);

      expect(
        screen.queryByTestId("financial-assumptions-modal"),
      ).not.toBeInTheDocument();
    });

    it("should save ROI assumptions and close", () => {
      render(<PerformanceDashboard />);
      
      const roiSection = screen.getByText("ROI and Payback Period");
      const settingsButton = roiSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);

      const saveButton = screen.getByText("Save");
      fireEvent.click(saveButton);

      expect(
        screen.queryByTestId("roi-assumptions-modal"),
      ).not.toBeInTheDocument();
    });

    it("should save environmental assumptions and close", () => {
      render(<PerformanceDashboard />);
      
      const envSection = screen.getByText("Environmental Impact");
      const settingsButton = envSection.parentElement.querySelector("button");
      fireEvent.click(settingsButton);

      const saveButton = screen.getByText("Save");
      fireEvent.click(saveButton);

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
      expect(screen.getByText("97.8%")).toBeInTheDocument();
    });

    it("should display MTTR card", () => {
      render(<PerformanceDashboard />);
      expect(screen.getByText("MTTR")).toBeInTheDocument();
      expect(screen.getByText("4.2 hours")).toBeInTheDocument();
    });

    it("should display days since failure card", () => {
      render(<PerformanceDashboard />);
      expect(
        screen.getByText("Consecutive days of Optimal Operation"),
      ).toBeInTheDocument();
      expect(screen.getByText("23 days")).toBeInTheDocument();
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
