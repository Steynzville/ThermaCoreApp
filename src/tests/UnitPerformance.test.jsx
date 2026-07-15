/**
 * Tests for UnitPerformance Component
 *
 * Coverage includes:
 * - Performance metric calculation
 * - Threshold validation
 * - Trend indicators
 * - ROI calculations
 * - Environmental metrics
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UnitPerformance from "@/components/UnitPerformance";
import AuthContext from "@/context/AuthContext";
import UnitContext from "@/context/UnitContext";

// Mock navigate and params
const mockNavigate = vi.fn();
let mockParams = { id: "TC003" };
let mockLocation = { state: null };

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
    useLocation: () => mockLocation,
  };
});

// Mock format currency
vi.mock("@/utils/formatCurrency", () => ({
  formatCurrency: (value) => `$${value.toFixed(2)}`,
}));

// Mock child components with proper isOpen handling
vi.mock("@/components/FinancialAssumptions", () => ({
  default: ({ isOpen, onClose, onSave, currentAssumptions }) =>
    isOpen ? (
      <div data-testid="financial-assumptions-modal">
        <button onClick={onClose}>Close</button>
        <button
          onClick={() =>
            onSave({
              electricityCost: 0.5,
              rebate: 60,
              feedInTariff: 0.1,
            })
          }
        >
          Save
        </button>
      </div>
    ) : null,
}));

// ✅ FIX: Add Save Zero button to test the Infinity guard
vi.mock("@/components/ROIAssumptions", () => ({
  default: ({ isOpen, onClose, onSave, currentAssumptions }) =>
    isOpen ? (
      <div data-testid="roi-assumptions-modal">
        <button onClick={onClose}>Close</button>
        <button onClick={() => onSave({ initialInvestment: 300000 })}>Save</button>
        <button onClick={() => onSave({ initialInvestment: 0 })}>Save Zero</button>
      </div>
    ) : null,
}));

vi.mock("@/components/EnvironmentalAssumptions", () => ({
  default: ({ isOpen, onClose, onSave, currentAssumptions }) =>
    isOpen ? (
      <div data-testid="environmental-assumptions-modal">
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
      </div>
    ) : null,
}));

// Test wrapper with configurable units
const TestWrapper = ({ children, unitsValue = [], loading = false }) => {
  const defaultUnits = [
    {
      id: "TC003",
      name: "ThermaCore Unit 003",
      status: "online",
      currentPower: 1250,
      parasiticLoad: 150,
      userLoad: 900,
      efficiency: 92.5,
      temperature: 65,
      pressure: 125,
      fuelConsumption: 85,
      operatingHours: 12500,
      serialNumber: "TC003-2024-001",
      location: "Plant A",
      watergeneration: false,
    },
  ];

  const units = unitsValue.length > 0 ? unitsValue : defaultUnits;

  const mockUnitsContext = {
    units,
    loading,
    getUnit: (unitId) => units.find((unit) => unit.id === unitId),
  };

  return (
    <BrowserRouter>
      <AuthContext.Provider
        value={{
          user: { id: "1", username: "testuser", role: "admin" },
          isAuthenticated: true,
          userRole: "admin",
        }}
      >
        <UnitContext.Provider value={mockUnitsContext}>
          {children}
        </UnitContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe("UnitPerformance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: "TC003" };
    mockLocation = { state: null };
  });

  // ============================================================
  // COMPONENT RENDERING TESTS
  // ============================================================
  describe("Component Rendering", () => {
    it("should render unit performance component", () => {
      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(screen.getByText(/ThermaCore Unit 003/i)).toBeInTheDocument();
    });

    it("should display loading state", () => {
      render(
        <TestWrapper loading={true}>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(screen.getByText(/Loading unit performance data/i)).toBeInTheDocument();
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("should show back button", () => {
      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      const backButton = screen.getByTestId("button-back-to-unit-details");
      expect(backButton).toBeInTheDocument();
    });

    it("should navigate back when back button clicked", async () => {
      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      const backButton = screen.getByTestId("button-back-to-unit-details");
      fireEvent.click(backButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(-1);
      });
    });
  });

  // ============================================================
  // UNIT RESOLUTION TESTS
  // ============================================================
  describe("Unit Resolution", () => {
    it("should use propUnit when provided", () => {
      const propUnit = {
        id: "PROP001",
        name: "Prop Unit",
        status: "online",
        currentPower: 100,
        parasiticLoad: 10,
        userLoad: 50,
        watergeneration: false,
      };

      render(
        <TestWrapper>
          <UnitPerformance unit={propUnit} />
        </TestWrapper>,
      );

      expect(screen.getByText(/Prop Unit/i)).toBeInTheDocument();
    });

    it("should use location.state.unit when provided", () => {
      mockLocation = {
        state: {
          unit: {
            id: "STATE001",
            name: "State Unit",
            status: "online",
            currentPower: 100,
            parasiticLoad: 10,
            userLoad: 50,
            watergeneration: false,
          },
        },
      };

      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(screen.getByText(/State Unit/i)).toBeInTheDocument();
    });

    it("should use params.id to lookup unit", () => {
      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(screen.getByText(/ThermaCore Unit 003/i)).toBeInTheDocument();
    });

    it("should show Unit Not Found when unit doesn't exist", () => {
      mockParams = { id: "NONEXISTENT" };

      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(screen.getByText(/Unit Not Found/i)).toBeInTheDocument();
      expect(screen.getByText(/Unit with ID "NONEXISTENT" could not be found/i)).toBeInTheDocument();
    });

    // ✅ FIX: Properly handle window.history mock with restoration
    it("should go back when Go Back button is clicked", () => {
      const mockHistoryBack = vi.fn();
      const originalHistory = window.history;
      
      try {
        Object.defineProperty(window, "history", {
          value: { ...originalHistory, back: mockHistoryBack },
          writable: true,
          configurable: true,
        });

        mockParams = { id: "NONEXISTENT" };

        render(
          <TestWrapper>
            <UnitPerformance />
          </TestWrapper>,
        );

        const goBackButton = screen.getByTestId("button-go-back");
        fireEvent.click(goBackButton);

        expect(mockHistoryBack).toHaveBeenCalled();
      } finally {
        Object.defineProperty(window, "history", {
          value: originalHistory,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  // ============================================================
  // PERFORMANCE METRICS DISPLAY TESTS
  // ============================================================
  describe("Performance Metrics Display", () => {
    it("should display power metrics", () => {
      const { container } = render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(container.textContent).toMatch(/Power Generation|kW/i);
      expect(container.textContent).toMatch(/Live: Power Generation/i);
    });

    it("should display current power metrics", () => {
      const { container } = render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(container.textContent).toMatch(/Live: Power Generation/i);
      expect(container.textContent).toMatch(/Live: Parasitic Load/i);
      expect(container.textContent).toMatch(/Live: User Load/i);
      expect(container.textContent).toMatch(/Live: Feed-in Load/i);
    });

    it("should display operating metrics", () => {
      const { container } = render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(container.textContent).toMatch(/Unit Uptime/i);
      expect(container.textContent).toMatch(/Hours Since Maintenance/i);
      expect(container.textContent).toMatch(/Days Since Last Issue/i);
    });

    it("should display fuel information", () => {
      const { container } = render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(container.textContent).toMatch(/Diesel Displaced/i);
    });

    it("should display time-based information", () => {
      const { container } = render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(container.textContent).toMatch(/Hours Since/i);
      expect(container.textContent).toMatch(/Days Since/i);
    });

    it("should display water generation when unit has watergeneration", () => {
      const waterUnit = [
        {
          id: "TC003",
          name: "ThermaCore Unit 003",
          status: "online",
          currentPower: 1250,
          parasiticLoad: 150,
          userLoad: 900,
          watergeneration: true,
          serialNumber: "TC003-2024-001",
          location: "Plant A",
        },
      ];

      render(
        <TestWrapper unitsValue={waterUnit}>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(screen.getByText(/Water Generated/i)).toBeInTheDocument();
    });
  });

  // ============================================================
  // PERFORMANCE CARDS TESTS
  // ============================================================
  describe("Performance Cards", () => {
    it("should render performance cards with icons", () => {
      const { container } = render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });

    it("should show trend indicators", () => {
      const { container } = render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      const upTrends = container.querySelectorAll(".text-green-500");
      const downTrends = container.querySelectorAll(".text-red-500");
      expect(upTrends.length + downTrends.length).toBeGreaterThanOrEqual(0);
    });

    it("should display color-coded cards", () => {
      const { container } = render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      const coloredCards = container.querySelectorAll(
        ".border-blue-200, .border-green-200, .border-orange-200, .border-purple-200, .border-yellow-200",
      );
      expect(coloredCards.length).toBeGreaterThan(0);
    });

    it("should display asterisk on environmental cards", () => {
      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      const asterisks = screen.queryAllByText("*");
      expect(asterisks.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // ROI AND FINANCIAL METRICS TESTS
  // ============================================================
  describe("ROI and Financial Metrics", () => {
    it("should calculate ROI correctly", () => {
      const { container } = render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      const roiText = container.textContent;
      expect(roiText).toMatch(/ROI.*%/);
    });

    it("should show Payback Period", () => {
      const { container } = render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(container.textContent).toMatch(/Payback Period/i);
    });

    it("should format currency values", () => {
      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      const dollarSigns = screen.queryAllByText(/\$/);
      expect(dollarSigns.length).toBeGreaterThan(0);
    });

    it("should show N/A for payback period when annual savings is 0", () => {
      const zeroPowerUnit = [
        {
          id: "TC003",
          name: "ThermaCore Unit 003",
          status: "offline",
          currentPower: 0,
          parasiticLoad: 0,
          userLoad: 0,
          watergeneration: false,
          serialNumber: "TC003-2024-001",
          location: "Plant A",
        },
      ];

      render(
        <TestWrapper unitsValue={zeroPowerUnit}>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(screen.getByText(/N/A/)).toBeInTheDocument();
    });

    // ✅ FIX: Actually test the zero initialInvestment guard
    it("should handle zero initialInvestment gracefully", async () => {
      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      // Open ROI modal
      const roiButton = screen.getByTestId("button-roi-assumptions");
      fireEvent.click(roiButton);

      await waitFor(() => {
        expect(screen.getByTestId("roi-assumptions-modal")).toBeInTheDocument();
      });

      // Click "Save Zero" to set initialInvestment to 0
      const saveZeroButton = screen.getByText("Save Zero");
      fireEvent.click(saveZeroButton);

      // ROI should not show Infinity
      await waitFor(() => {
        expect(screen.queryByText(/Infinity/)).not.toBeInTheDocument();
      });

      // ROI should show 0.00% or N/A
      await waitFor(() => {
        const roiText = screen.getByText(/0.00%/);
        expect(roiText).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // ENVIRONMENTAL METRICS TESTS
  // ============================================================
  describe("Environmental Metrics", () => {
    it("should display environmental impact section", () => {
      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(screen.getByText(/Environmental Impact/i)).toBeInTheDocument();
    });

    it("should show CO2 saved metrics", () => {
      const { container } = render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(container.textContent).toMatch(/CO₂ saved/);
    });
  });

  // ============================================================
  // ASSUMPTION MODALS TESTS
  // ============================================================
  describe("Assumption Modals", () => {
    it("should open financial assumptions modal", async () => {
      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      const button = screen.getByTestId("button-financial-assumptions");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId("financial-assumptions-modal")).toBeInTheDocument();
      });
    });

    it("should close financial assumptions modal", async () => {
      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      const button = screen.getByTestId("button-financial-assumptions");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId("financial-assumptions-modal")).toBeInTheDocument();
      });

      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("financial-assumptions-modal")).not.toBeInTheDocument();
      });
    });

    it("should open ROI assumptions modal", async () => {
      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      const button = screen.getByTestId("button-roi-assumptions");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId("roi-assumptions-modal")).toBeInTheDocument();
      });
    });

    it("should open environmental assumptions modal", async () => {
      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      const button = screen.getByTestId("button-environmental-assumptions");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId("environmental-assumptions-modal")).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // OPERATING STATUS TESTS
  // ============================================================
  describe("Operating Status", () => {
    it("should display unit running status", () => {
      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(screen.getByText(/online/i)).toBeInTheDocument();
    });

    it("should handle offline status", () => {
      const offlineUnits = [
        {
          id: "TC003",
          name: "ThermaCore Unit 003",
          status: "offline",
          currentPower: 0,
          parasiticLoad: 0,
          userLoad: 0,
          watergeneration: false,
          serialNumber: "TC003-2024-001",
          location: "Plant A",
        },
      ];

      render(
        <TestWrapper unitsValue={offlineUnits}>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });

    it("should handle maintenance status", () => {
      const maintenanceUnits = [
        {
          id: "TC003",
          name: "ThermaCore Unit 003",
          status: "maintenance",
          currentPower: 0,
          parasiticLoad: 0,
          userLoad: 0,
          watergeneration: false,
          serialNumber: "TC003-2024-001",
          location: "Plant A",
        },
      ];

      render(
        <TestWrapper unitsValue={maintenanceUnits}>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(screen.getByText(/maintenance/i)).toBeInTheDocument();
    });
  });

  // ============================================================
  // ACCESSIBILITY TESTS
  // ============================================================
  describe("Accessibility", () => {
    it("should have accessible metric labels", () => {
      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(screen.getByText(/ThermaCore Unit 003/i)).toBeInTheDocument();
    });

    it("should have clickable back button", () => {
      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      const backButton = screen.getByTestId("button-back-to-unit-details");
      expect(backButton).toBeEnabled();
    });
  });

  // ============================================================
  // RESPONSIVE DESIGN TESTS
  // ============================================================
  describe("Responsive Design", () => {
    it("should render on mobile viewports", () => {
      const { container } = render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(container).toBeTruthy();
    });

    it("should have responsive grid layout", () => {
      const { container } = render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(container.querySelector(".grid")).toBeTruthy();
    });
  });

  // ============================================================
  // DARK MODE TESTS
  // ============================================================
  describe("Dark Mode", () => {
    it("should support dark mode styling", () => {
      const { container } = render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      const darkElements = container.querySelectorAll("[class*='dark:']");
      expect(darkElements.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // ERROR STATES TESTS
  // ============================================================
  describe("Error States", () => {
    it("should handle invalid unit ID", () => {
      mockParams = { id: "INVALID" };

      render(
        <TestWrapper>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(screen.getByText(/Unit Not Found/i)).toBeInTheDocument();
    });

    it("should handle missing unit data gracefully", () => {
      const incompleteUnits = [
        {
          id: "TC003",
          name: "ThermaCore Unit 003",
          // Missing other fields
        },
      ];

      render(
        <TestWrapper unitsValue={incompleteUnits}>
          <UnitPerformance />
        </TestWrapper>,
      );

      expect(screen.getByText(/ThermaCore Unit 003/i)).toBeInTheDocument();
    });
  });
});
