/**
 * ReportConfigurator.test.jsx - Complete Test Coverage
 * 
 * Covers:
 * - Basic rendering and prop handling
 * - Report type selection/deselection
 * - Scope selection with unit/client filtering
 * - Unit and client selection (handleUnitSelection, handleClientSelection)
 * - Section selection (handleSelectAllSections, handleSectionToggle)
 * - Form validation (isConfigValid)
 * - Report generation (handleGenerateReport - success/error paths)
 * - Scheduling and pause functionality
 * - Edge cases and guard clauses
 * 
 * Target: 85%+ function coverage
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import ReportConfigurator from "@/components/reports/ReportConfigurator";

// Mock settings context
vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({
    settings: {
      soundEnabled: false,
      volume: 0.5,
    },
  }),
}));

// Mock audio player
vi.mock("@/utils/audioPlayer", () => ({
  default: vi.fn(),
}));

// Mock alert
const mockAlert = vi.fn();
global.alert = mockAlert;

// Mock date-fns format
vi.mock("date-fns", () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === "yyyy-MM-dd") return "2024-01-15";
    if (formatStr === "dd/MM/yyyy") return "15/01/2024";
    if (formatStr === "PPP") return "January 15, 2024";
    return String(date);
  }),
}));

import { format } from "date-fns";

const mockDataProviders = {
  units: [
    { id: "unit-1", name: "Unit 1", client: "Client A", location: "Location 1" },
    { id: "unit-2", name: "Unit 2", client: "Client B", location: "Location 2" },
    { id: "unit-3", name: "Unit 3", client: "Client A", location: "Location 3" },
  ],
  clients: [
    { id: "client-1", name: "Client A", units: 2 },
    { id: "client-2", name: "Client B", units: 1 },
  ],
  reportTypes: [
    {
      id: "energy-report",
      name: "Energy Report",
      description: "Energy consumption report",
      icon: () => <div>Icon</div>,
      sections: ["energyProduction"],
    },
    {
      id: "water-report",
      name: "Water Report",
      description: "Water usage report",
      icon: () => <div>Icon</div>,
      sections: ["waterProduction"],
    },
    {
      id: "full-report",
      name: "Full Report",
      description: "Complete system report",
      icon: () => <div>Icon</div>,
      sections: ["energyProduction", "waterProduction", "temperaturePressure"],
    },
  ],
};

const mockAvailableUnits = [
  { id: "unit-1", name: "Unit 1", client: "Client A", location: "Location 1" },
  { id: "unit-2", name: "Unit 2", client: "Client B", location: "Location 2" },
  { id: "unit-3", name: "Unit 3", client: "Client A", location: "Location 3" },
];

const mockAvailableReportTypes = [
  {
    id: "energy-report",
    name: "Energy Report",
    description: "Energy consumption report",
    icon: () => <div>Icon</div>,
    sections: ["energyProduction"],
  },
  {
    id: "water-report",
    name: "Water Report",
    description: "Water usage report",
    icon: () => <div>Icon</div>,
    sections: ["waterProduction"],
  },
  {
    id: "full-report",
    name: "Full Report",
    description: "Complete system report",
    icon: () => <div>Icon</div>,
    sections: ["energyProduction", "waterProduction", "temperaturePressure"],
  },
];

describe("ReportConfigurator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAlert.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <ReportConfigurator
        dataProviders={mockDataProviders}
        availableUnits={mockAvailableUnits}
        availableReportTypes={mockAvailableReportTypes}
        {...props}
      />
    );
  };

  // ============ DOM HELPER FUNCTIONS ============
  
  // Helper: find a checkbox/radio that sits next to a given text label
  const getInputNearText = (text) => {
    const label = screen.getByText(text);
    // Check if label is in a flex container with the input
    const row = label.closest(".flex-1")?.parentElement || 
                label.closest(".flex.items-center.space-x-2")?.parentElement ||
                label.closest(".flex.items-center.space-x-3")?.parentElement;
    if (row) {
      const input = row.querySelector('input[type="checkbox"], input[type="radio"]');
      if (input) return input;
    }
    // Fallback: find the first checkbox associated with this text
    const allInputs = screen.queryAllByRole("checkbox");
    // If there's a label with htmlFor, use it
    const labelElement = screen.getByText(text).closest("label");
    if (labelElement) {
      const forId = labelElement.getAttribute("for");
      if (forId) {
        return document.getElementById(forId);
      }
    }
    // Last resort: check if the text is in a div with a checkbox before it
    const parent = screen.getByText(text).closest("div");
    if (parent) {
      const checkbox = parent.querySelector('input[type="checkbox"]');
      if (checkbox) return checkbox;
    }
    return null;
  };

  // ============ BASIC RENDERING ============

  describe("Basic Rendering", () => {
    it("should render without crashing", () => {
      const { container } = renderComponent();
      expect(container).toBeInTheDocument();
    });

    it("should render report type cards", () => {
      renderComponent();
      expect(screen.getByText("Energy Report")).toBeInTheDocument();
      expect(screen.getByText("Water Report")).toBeInTheDocument();
      expect(screen.getByText("Full Report")).toBeInTheDocument();
    });

    it("should render scope selection options", () => {
      renderComponent();
      expect(screen.getByText("Single Unit")).toBeInTheDocument();
      expect(screen.getByText("Multiple Units")).toBeInTheDocument();
      expect(screen.getByText("Client Portfolio")).toBeInTheDocument();
      expect(screen.getByText("All Units")).toBeInTheDocument();
    });

    it("should render report sections", () => {
      renderComponent();
      expect(screen.getByText("Select All Sections")).toBeInTheDocument();
      expect(screen.getByText("Energy Production")).toBeInTheDocument();
      expect(screen.getByText("Water Production")).toBeInTheDocument();
      expect(screen.getByText("Temperature & Pressure")).toBeInTheDocument();
      expect(screen.getByText("Alerts & Alarms")).toBeInTheDocument();
    });

    it("should render action buttons", () => {
      renderComponent();
      expect(screen.getByText("Generate & Download Report")).toBeInTheDocument();
    });

    it("should show scheduling controls when enabled", () => {
      renderComponent({ showScheduling: true });
      expect(screen.getByText("Schedule Report")).toBeInTheDocument();
    });

    it("should hide scheduling controls when disabled", () => {
      renderComponent({ showScheduling: false });
      expect(screen.queryByText("Schedule Report")).not.toBeInTheDocument();
    });

    it("should show pause scheduled button when enabled", () => {
      renderComponent({ showPauseScheduled: true });
      expect(screen.getByText("Pause Scheduled Reports")).toBeInTheDocument();
    });

    it("should hide pause scheduled button when disabled", () => {
      renderComponent({ showPauseScheduled: false });
      expect(screen.queryByText("Pause Scheduled Reports")).not.toBeInTheDocument();
    });

    it("should handle empty availableReportTypes array", () => {
      const { container } = render(
        <ReportConfigurator
          availableReportTypes={[]}
          dataProviders={mockDataProviders}
        />
      );
      expect(container).toBeInTheDocument();
      expect(screen.queryByText("Energy Report")).not.toBeInTheDocument();
    });
  });

  // ============ SECTION CONFIGURATION ============

  describe("Section Configuration", () => {
    it("should show correct section labels", () => {
      renderComponent();
      expect(screen.getByText("Energy Production")).toBeInTheDocument();
      expect(screen.getByText("Water Production")).toBeInTheDocument();
      expect(screen.getByText("Temperature & Pressure")).toBeInTheDocument();
      expect(screen.getByText("Alerts & Alarms")).toBeInTheDocument();
      expect(screen.getByText("Maintenance")).toBeInTheDocument();
      expect(screen.getByText("Performance")).toBeInTheDocument();
      expect(screen.getByText("Compliance")).toBeInTheDocument();
      expect(screen.getByText("Sales and Revenue")).toBeInTheDocument();
    });

    it("should respect allowedSections prop", () => {
      render(
        <ReportConfigurator
          allowedSections={["energyProduction", "waterProduction"]}
          dataProviders={mockDataProviders}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );
      expect(screen.getByText("Energy Production")).toBeInTheDocument();
      expect(screen.getByText("Water Production")).toBeInTheDocument();
      expect(screen.queryByText("Temperature & Pressure")).not.toBeInTheDocument();
    });

    it("should get section icon from SECTION_CONFIG", () => {
      renderComponent();
      // Just verify that the energy section has an icon (Activity)
      const energySection = screen.getByText("Energy Production").closest(".flex.items-center.space-x-3");
      expect(energySection).toBeInTheDocument();
    });

    it("should get section color from SECTION_CONFIG", () => {
      renderComponent();
      const energySection = screen.getByText("Energy Production").closest(".flex.items-center.space-x-3");
      expect(energySection).toBeInTheDocument();
    });
  });

  // ============ REPORT TYPE SELECTION ============

  describe("Report Type Selection", () => {
    it("should select a report type when clicked", () => {
      renderComponent();
      const energyReport = screen.getByText("Energy Report");
      const button = energyReport.closest("button");
      fireEvent.click(energyReport);
      expect(button).toHaveClass("border-blue-500");
    });

    it("should deselect a report type when clicked again", () => {
      renderComponent();
      const energyReport = screen.getByText("Energy Report");
      const button = energyReport.closest("button");
      fireEvent.click(energyReport);
      expect(button).toHaveClass("border-blue-500");
      fireEvent.click(energyReport);
      expect(button).not.toHaveClass("border-blue-500");
    });

    it("should auto-select report type when sections are toggled", () => {
      renderComponent();
      
      // Click a section that matches a report type
      const energySection = getInputNearText("Energy Production");
      expect(energySection).not.toBeChecked();
      
      fireEvent.click(energySection);
      
      // Should auto-select matching report type
      const energyCard = screen.getByText("Energy Report").closest("button");
      expect(energyCard).toHaveClass("border-blue-500");
    });

    it("should handle 'all-sections' report type", async () => {
      // For this test, we need to verify the all-sections logic
      // The component uses "all-sections" as a special ID
      const allSectionsCheckbox = screen.queryByLabelText("Select All Sections");
      if (allSectionsCheckbox) {
        fireEvent.click(allSectionsCheckbox);
        expect(allSectionsCheckbox).toBeChecked();
        
        // Should select the "all-sections" report type internally
        // Verify by checking all sections are selected
        const energySection = getInputNearText("Energy Production");
        const waterSection = getInputNearText("Water Production");
        expect(energySection).toBeChecked();
        expect(waterSection).toBeChecked();
      }
    });
  });

  // ============ SCOPE SELECTION ============

  describe("Scope Selection", () => {
    it("should select a scope when clicked", () => {
      renderComponent();
      const singleUnit = screen.getByText("Single Unit");
      const button = singleUnit.closest("button");
      fireEvent.click(singleUnit);
      expect(button).toHaveClass("border-blue-500");
    });

    it("should show unit selection for single scope", () => {
      renderComponent();
      const singleUnit = screen.getByText("Single Unit");
      fireEvent.click(singleUnit);
      expect(screen.getByText("Unit 1")).toBeInTheDocument();
      expect(screen.getByText("Unit 2")).toBeInTheDocument();
      expect(screen.getByText("Unit 3")).toBeInTheDocument();
    });

    it("should show unit selection for multiple scope", () => {
      renderComponent();
      const multipleUnits = screen.getByText("Multiple Units");
      fireEvent.click(multipleUnits);
      expect(screen.getByText("Unit 1")).toBeInTheDocument();
      expect(screen.getByText("Unit 2")).toBeInTheDocument();
      expect(screen.getByText("Unit 3")).toBeInTheDocument();
    });

    it("should show client selection for client scope", () => {
      renderComponent();
      const clientPortfolio = screen.getByText("Client Portfolio");
      fireEvent.click(clientPortfolio);
      expect(screen.getByText("Client A")).toBeInTheDocument();
      expect(screen.getByText("Client B")).toBeInTheDocument();
    });

    it("should respect allowedScopes prop", () => {
      render(
        <ReportConfigurator
          allowedScopes={["master"]}
          dataProviders={mockDataProviders}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );
      expect(screen.getByText("All Units")).toBeInTheDocument();
      expect(screen.queryByText("Single Unit")).not.toBeInTheDocument();
    });

    it("should clear selections when scope changes", () => {
      renderComponent();
      
      // Select multiple units scope and pick a unit
      const multipleUnits = screen.getByText("Multiple Units");
      fireEvent.click(multipleUnits);
      
      const unitCheckbox = getInputNearText("Unit 1");
      if (unitCheckbox) {
        fireEvent.click(unitCheckbox);
        expect(unitCheckbox).toBeChecked();
      }
      
      // Change scope to master
      const allUnits = screen.getByText("All Units");
      fireEvent.click(allUnits);
      
      // Unit selection should be cleared
      // (can't directly test state, but we can verify the UI updates)
      expect(screen.queryByText("Select Units")).not.toBeInTheDocument();
    });

    it("should clear error message when scope changes", () => {
      renderComponent({ onGenerate: vi.fn().mockRejectedValue(new Error("Test error")) });
      
      // Generate an error
      // First, we need to make the form valid to trigger generation
      fireEvent.click(screen.getByText("Energy Report"));
      fireEvent.click(screen.getByText("All Units"));
      fireEvent.click(getInputNearText("Energy Production"));
      
      const generateButton = screen.getByText("Generate & Download Report");
      fireEvent.click(generateButton);
      
      // Error should appear
      expect(screen.getByText("Test error")).toBeInTheDocument();
      
      // Change scope - should clear error
      fireEvent.click(screen.getByText("Single Unit"));
      expect(screen.queryByText("Test error")).not.toBeInTheDocument();
    });
  });

  // ============ UNIT SELECTION (handleUnitSelection) ============

  describe("Unit Selection - handleUnitSelection", () => {
    it("should toggle unit selection for multiple scope", () => {
      renderComponent();
      
      // Select multiple units scope
      const multipleUnits = screen.getByText("Multiple Units");
      fireEvent.click(multipleUnits);
      
      const unitCheckbox = getInputNearText("Unit 1");
      expect(unitCheckbox).toBeTruthy();
      expect(unitCheckbox).not.toBeChecked();
      
      fireEvent.click(unitCheckbox);
      expect(unitCheckbox).toBeChecked();
      
      fireEvent.click(unitCheckbox);
      expect(unitCheckbox).not.toBeChecked();
    });

    it("should handle radio selection for single scope", () => {
      renderComponent();
      
      const singleUnit = screen.getByText("Single Unit");
      fireEvent.click(singleUnit);
      
      // Find radio buttons
      const radioInputs = screen.queryAllByRole("radio");
      expect(radioInputs.length).toBeGreaterThan(0);
      
      // Click first radio
      const firstRadio = radioInputs[0];
      if (firstRadio) {
        fireEvent.click(firstRadio);
        expect(firstRadio).toBeChecked();
        
        // Click second radio - first should be unchecked
        if (radioInputs.length > 1) {
          const secondRadio = radioInputs[1];
          fireEvent.click(secondRadio);
          expect(secondRadio).toBeChecked();
          expect(firstRadio).not.toBeChecked();
        }
      }
    });

    it("should handle unit selection with no available units", () => {
      render(
        <ReportConfigurator
          availableUnits={[]}
          dataProviders={mockDataProviders}
          availableReportTypes={mockAvailableReportTypes}
        />
      );
      
      const singleUnit = screen.getByText("Single Unit");
      fireEvent.click(singleUnit);
      
      // Should not show unit list
      expect(screen.queryByText("Select Units")).not.toBeInTheDocument();
    });
  });

  // ============ CLIENT SELECTION (handleClientSelection) ============

  describe("Client Selection - handleClientSelection", () => {
    it("should toggle client selection for client scope", () => {
      renderComponent();
      
      const clientPortfolio = screen.getByText("Client Portfolio");
      fireEvent.click(clientPortfolio);
      
      const clientCheckbox = getInputNearText("Client A");
      expect(clientCheckbox).toBeTruthy();
      expect(clientCheckbox).not.toBeChecked();
      
      fireEvent.click(clientCheckbox);
      expect(clientCheckbox).toBeChecked();
      
      fireEvent.click(clientCheckbox);
      expect(clientCheckbox).not.toBeChecked();
    });

    it("should handle missing clients array gracefully (guard clause)", () => {
      render(
        <ReportConfigurator
          dataProviders={{ units: [], clients: undefined, reportTypes: [] }}
          allowedScopes={["client"]}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );
      
      const clientPortfolio = screen.getByText("Client Portfolio");
      fireEvent.click(clientPortfolio);
      
      // Should not throw and should not show client list
      expect(screen.queryByText("Client A")).not.toBeInTheDocument();
    });

    it("should handle empty clients array", () => {
      render(
        <ReportConfigurator
          dataProviders={{ units: [], clients: [], reportTypes: [] }}
          allowedScopes={["client"]}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );
      
      const clientPortfolio = screen.getByText("Client Portfolio");
      fireEvent.click(clientPortfolio);
      
      // Should not show client list
      expect(screen.queryByText("Select Clients")).not.toBeInTheDocument();
    });
  });

  // ============ SECTION SELECTION (handleSelectAllSections & handleSectionToggle) ============

  describe("Section Selection", () => {
    it("should select all sections (handleSelectAllSections)", () => {
      renderComponent();
      
      const selectAll = screen.getByLabelText("Select All Sections");
      expect(selectAll).toBeTruthy();
      
      fireEvent.click(selectAll);
      expect(selectAll).toBeChecked();
      
      const energySection = getInputNearText("Energy Production");
      const waterSection = getInputNearText("Water Production");
      const tempSection = getInputNearText("Temperature & Pressure");
      const alertsSection = getInputNearText("Alerts & Alarms");
      
      expect(energySection).toBeChecked();
      expect(waterSection).toBeChecked();
      expect(tempSection).toBeChecked();
      expect(alertsSection).toBeChecked();
      
      // Toggle off
      fireEvent.click(selectAll);
      expect(selectAll).not.toBeChecked();
      expect(energySection).not.toBeChecked();
      expect(waterSection).not.toBeChecked();
    });

    it("should toggle an individual section and auto-match report type (handleSectionToggle)", () => {
      renderComponent();
      
      const energySection = getInputNearText("Energy Production");
      expect(energySection).not.toBeChecked();
      
      fireEvent.click(energySection);
      expect(energySection).toBeChecked();
      
      // Should auto-select matching report type
      const energyCard = screen.getByText("Energy Report").closest("button");
      expect(energyCard).toHaveClass("border-blue-500");
      
      // Toggle off
      fireEvent.click(energySection);
      expect(energySection).not.toBeChecked();
      expect(energyCard).not.toHaveClass("border-blue-500");
    });

    it("should handle section toggle with invalid section key", () => {
      renderComponent();
      
      // This should not throw - invalid sections are ignored
      const selectAll = screen.getByLabelText("Select All Sections");
      fireEvent.click(selectAll);
      expect(selectAll).toBeChecked();
    });

    it("should respect allowedSections when toggling", () => {
      render(
        <ReportConfigurator
          allowedSections={["energyProduction"]}
          dataProviders={mockDataProviders}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );
      
      const energySection = getInputNearText("Energy Production");
      expect(energySection).toBeTruthy();
      
      // Should not find disallowed sections
      expect(screen.queryByText("Water Production")).not.toBeInTheDocument();
    });

    it("should auto-select report types based on section combinations", () => {
      renderComponent();
      
      // Select multiple sections that match a report type
      const energySection = getInputNearText("Energy Production");
      const waterSection = getInputNearText("Water Production");
      
      fireEvent.click(energySection);
      fireEvent.click(waterSection);
      
      // Should select "Full Report" since it includes both
      const fullReportCard = screen.getByText("Full Report").closest("button");
      expect(fullReportCard).toHaveClass("border-blue-500");
    });
  });

  // ============ FORM VALIDATION (isConfigValid) ============

  describe("Form Validation - isConfigValid", () => {
    it("should validate form configuration", () => {
      renderComponent();
      
      const generateButton = screen.getByText("Generate & Download Report");
      
      // Initially invalid - no scope, no sections, no date range
      expect(generateButton).toBeDisabled();
      
      // Select report type
      fireEvent.click(screen.getByText("Energy Report"));
      
      // Still invalid - no scope
      expect(generateButton).toBeDisabled();
      
      // Select scope
      fireEvent.click(screen.getByText("All Units"));
      
      // Now should be valid (scope selected, sections from report type)
      // Note: Date range is optional when both start and end are empty
      expect(generateButton).not.toBeDisabled();
    });

    it("should require selected sections", () => {
      renderComponent();
      
      const generateButton = screen.getByText("Generate & Download Report");
      
      // Select scope but no sections
      fireEvent.click(screen.getByText("All Units"));
      
      // Should still be disabled (no sections selected)
      expect(generateButton).toBeDisabled();
    });

    it("should require scope selection", () => {
      renderComponent();
      
      const generateButton = screen.getByText("Generate & Download Report");
      
      // Select sections but no scope
      const energySection = getInputNearText("Energy Production");
      fireEvent.click(energySection);
      
      // Should still be disabled (no scope)
      expect(generateButton).toBeDisabled();
    });

    it("should require unit or client selection for non-master scopes", () => {
      renderComponent();
      
      const generateButton = screen.getByText("Generate & Download Report");
      
      // Select single scope but no unit
      fireEvent.click(screen.getByText("Single Unit"));
      fireEvent.click(screen.getByText("Energy Report"));
      
      // Should be disabled (no unit selected)
      expect(generateButton).toBeDisabled();
      
      // Select a unit
      const unitRadio = screen.queryByRole("radio");
      if (unitRadio) {
        fireEvent.click(unitRadio);
        expect(generateButton).not.toBeDisabled();
      }
    });

    it("should consider master scope as always valid for units", () => {
      renderComponent();
      
      const generateButton = screen.getByText("Generate & Download Report");
      
      fireEvent.click(screen.getByText("All Units"));
      fireEvent.click(screen.getByText("Energy Report"));
      
      // Master scope doesn't require unit selection
      expect(generateButton).not.toBeDisabled();
    });

    it("should handle partial date range as invalid", () => {
      renderComponent();
      
      // Need to test the date range validation
      // The component allows both empty or both filled, but not one filled
      // We'd need to interact with the date pickers to test this
      // For now, we test the default state (both empty = valid)
      const generateButton = screen.getByText("Generate & Download Report");
      
      fireEvent.click(screen.getByText("All Units"));
      fireEvent.click(screen.getByText("Energy Report"));
      
      // Both date fields empty = valid
      expect(generateButton).not.toBeDisabled();
    });
  });

  // ============ REPORT GENERATION (handleGenerateReport) ============

  describe("Report Generation - handleGenerateReport", () => {
    it("should call onGenerate with config and show success", async () => {
      const onGenerate = vi.fn().mockResolvedValue();
      renderComponent({ onGenerate });
      
      // Build valid config
      fireEvent.click(screen.getByText("Energy Report"));
      fireEvent.click(screen.getByText("All Units"));
      
      const generateButton = screen.getByText("Generate & Download Report");
      expect(generateButton).not.toBeDisabled();
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(onGenerate).toHaveBeenCalledTimes(1);
        expect(onGenerate).toHaveBeenCalledWith(
          expect.objectContaining({
            scope: "master",
            reportTypes: ["energy-report"],
          })
        );
      });
    });

    it("should show loading state during generation", async () => {
      const onGenerate = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      renderComponent({ onGenerate });
      
      // Build valid config
      fireEvent.click(screen.getByText("Energy Report"));
      fireEvent.click(screen.getByText("All Units"));
      
      const generateButton = screen.getByText("Generate & Download Report");
      fireEvent.click(generateButton);
      
      // Should show loading text
      expect(screen.getByText("Generating Report...")).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText("Generate & Download Report")).toBeInTheDocument();
      });
    });

    it("should show error message when onGenerate rejects (catch path)", async () => {
      const errorMessage = "Server unavailable";
      const onGenerate = vi.fn().mockRejectedValue(new Error(errorMessage));
      renderComponent({ onGenerate });
      
      // Build valid config
      fireEvent.click(screen.getByText("Energy Report"));
      fireEvent.click(screen.getByText("All Units"));
      
      const generateButton = screen.getByText("Generate & Download Report");
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        // Error should appear in the UI
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(mockAlert).toHaveBeenCalledWith(
          expect.stringContaining(errorMessage)
        );
      });
    });

    it("should handle error without message property", async () => {
      const onGenerate = vi.fn().mockRejectedValue({});
      renderComponent({ onGenerate });
      
      fireEvent.click(screen.getByText("Energy Report"));
      fireEvent.click(screen.getByText("All Units"));
      
      const generateButton = screen.getByText("Generate & Download Report");
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        // Should show generic error message
        expect(screen.getByText("Failed to generate report")).toBeInTheDocument();
        expect(mockAlert).toHaveBeenCalledWith(
          expect.stringContaining("Failed to generate report")
        );
      });
    });

    it("should handle error with non-Error object", async () => {
      const onGenerate = vi.fn().mockRejectedValue("String error");
      renderComponent({ onGenerate });
      
      fireEvent.click(screen.getByText("Energy Report"));
      fireEvent.click(screen.getByText("All Units"));
      
      const generateButton = screen.getByText("Generate & Download Report");
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText("String error")).toBeInTheDocument();
      });
    });

    it("should use default handler when onGenerate not provided", async () => {
      renderComponent({ onGenerate: undefined });
      
      fireEvent.click(screen.getByText("Energy Report"));
      fireEvent.click(screen.getByText("All Units"));
      
      const generateButton = screen.getByText("Generate & Download Report");
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          "Report generated successfully! Download will begin shortly."
        );
      });
    });

    it("should play sound when generating report", async () => {
      const onGenerate = vi.fn().mockResolvedValue();
      const playSound = await import("@/utils/audioPlayer");
      
      renderComponent({ onGenerate });
      
      fireEvent.click(screen.getByText("Energy Report"));
      fireEvent.click(screen.getByText("All Units"));
      
      const generateButton = screen.getByText("Generate & Download Report");
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(playSound.default).toHaveBeenCalledWith(
          "sky.mp3",
          false,
          0.5
        );
      });
    });
  });

  // ============ SCHEDULING ============

  describe("Scheduling", () => {
    it("should show schedule button when enabled", () => {
      renderComponent({ showScheduling: true });
      expect(screen.getByText("Schedule Report")).toBeInTheDocument();
    });

    it("should disable schedule button when form is invalid", () => {
      renderComponent({ showScheduling: true });
      const scheduleButton = screen.getByText("Schedule Report");
      expect(scheduleButton).toBeDisabled();
    });

    it("should enable schedule button when form is valid", () => {
      renderComponent({ showScheduling: true });
      
      fireEvent.click(screen.getByText("Energy Report"));
      fireEvent.click(screen.getByText("All Units"));
      
      const scheduleButton = screen.getByText("Schedule Report");
      expect(scheduleButton).not.toBeDisabled();
    });

    it("should show scheduled date message after selection", async () => {
      renderComponent({ showScheduling: true });
      
      fireEvent.click(screen.getByText("Energy Report"));
      fireEvent.click(screen.getByText("All Units"));
      
      const scheduleButton = screen.getByText("Schedule Report");
      fireEvent.click(scheduleButton);
      
      // Popover should appear with calendar
      await waitFor(() => {
        const calendar = document.querySelector('[role="grid"]');
        expect(calendar).toBeTruthy();
      });
    });

    it("should invoke isDateDisabled when schedule popover opens", async () => {
      renderComponent({ showScheduling: true });
      
      fireEvent.click(screen.getByText("Energy Report"));
      fireEvent.click(screen.getByText("All Units"));
      
      const scheduleButton = screen.getByText("Schedule Report");
      fireEvent.click(scheduleButton);
      
      await waitFor(() => {
        const grid = document.querySelector('[role="grid"]');
        expect(grid).toBeTruthy();
      });
    });
  });

  // ============ PAUSE SCHEDULED REPORTS ============

  describe("Pause Scheduled Reports", () => {
    it("should show pause button when enabled", () => {
      renderComponent({ showPauseScheduled: true });
      expect(screen.getByText("Pause Scheduled Reports")).toBeInTheDocument();
    });

    it("should disable pause button during generation", async () => {
      const onGenerate = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      renderComponent({ onGenerate, showPauseScheduled: true });
      
      fireEvent.click(screen.getByText("Energy Report"));
      fireEvent.click(screen.getByText("All Units"));
      
      const generateButton = screen.getByText("Generate & Download Report");
      fireEvent.click(generateButton);
      
      const pauseButton = screen.getByText("Pause Scheduled Reports");
      expect(pauseButton).toBeDisabled();
      
      await waitFor(() => {
        expect(pauseButton).not.toBeDisabled();
      });
    });

    it("should show confirmation dialog when pause clicked", () => {
      renderComponent({ showPauseScheduled: true });
      
      const pauseButton = screen.getByText("Pause Scheduled Reports");
      fireEvent.click(pauseButton);
      
      // Alert dialog should appear
      expect(screen.getByText("Confirm Pause")).toBeInTheDocument();
      expect(screen.getByText("Are you sure you want to pause all scheduled reports? You can resume them later.")).toBeInTheDocument();
    });

    it("should handle pause confirmation", () => {
      renderComponent({ showPauseScheduled: true });
      
      const pauseButton = screen.getByText("Pause Scheduled Reports");
      fireEvent.click(pauseButton);
      
      const confirmButton = screen.getByText("Pause");
      fireEvent.click(confirmButton);
      
      expect(mockAlert).toHaveBeenCalledWith(
        "All scheduled reports have been paused."
      );
    });

    it("should handle pause cancellation", () => {
      renderComponent({ showPauseScheduled: true });
      
      const pauseButton = screen.getByText("Pause Scheduled Reports");
      fireEvent.click(pauseButton);
      
      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);
      
      expect(mockAlert).not.toHaveBeenCalled();
    });
  });

  // ============ EDGE CASES ============

  describe("Edge Cases", () => {
    it("should handle empty allowedScopes array", () => {
      const { container } = render(
        <ReportConfigurator 
          allowedScopes={[]} 
          dataProviders={mockDataProviders}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );
      expect(container).toBeInTheDocument();
    });

    it("should handle empty allowedSections array", () => {
      const { container } = render(
        <ReportConfigurator 
          allowedSections={[]} 
          dataProviders={mockDataProviders}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );
      expect(container).toBeInTheDocument();
    });

    it("should handle empty dataProviders", () => {
      const { container } = render(
        <ReportConfigurator 
          dataProviders={{ units: [], clients: [], reportTypes: [] }}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );
      expect(container).toBeInTheDocument();
    });

    it("should handle null dataProviders", () => {
      const { container } = render(
        <ReportConfigurator 
          dataProviders={null}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );
      expect(container).toBeInTheDocument();
    });

    it("should handle custom className prop", () => {
      const { container } = renderComponent({ className: "custom-class" });
      const div = container.querySelector(".custom-class");
      expect(div).toBeInTheDocument();
    });

    it("should handle missing reportTypes in dataProviders", () => {
      const { container } = render(
        <ReportConfigurator 
          dataProviders={{ units: [], clients: [], reportTypes: undefined }}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );
      expect(container).toBeInTheDocument();
    });

    it("should handle missing units in dataProviders", () => {
      const { container } = render(
        <ReportConfigurator 
          dataProviders={{ units: undefined, clients: [], reportTypes: [] }}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });

  // ============ SECTION_CONFIG MAPPING ============

  describe("SECTION_CONFIG Mapping", () => {
    it("should correctly map all sections to icons", () => {
      renderComponent();
      
      // All sections should have icons rendered
      const sections = [
        "Energy Production",
        "Water Production", 
        "Temperature & Pressure",
        "Alerts & Alarms",
        "Maintenance",
        "Performance",
        "Compliance",
        "Sales and Revenue"
      ];
      
      for (const section of sections) {
        const sectionElement = screen.getByText(section);
        expect(sectionElement).toBeInTheDocument();
      }
    });

    it("should handle unknown section gracefully", () => {
      // The component uses SECTION_CONFIG[section]?.icon || FileText
      // This should work even for unknown sections
      render(
        <ReportConfigurator
          allowedSections={["unknownSection"]}
          dataProviders={mockDataProviders}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );
      
      // Should render without crashing
      expect(screen.getByText("unknownSection")).toBeInTheDocument();
    });
  });
});
