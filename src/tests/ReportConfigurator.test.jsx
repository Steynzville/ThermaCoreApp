/**
 * Tests for ReportConfigurator Component
 * 
 * Note: Report generation is currently a placeholder (UI prototype).
 * These tests verify the UI, interactions, and state management.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import ReportConfigurator from "../components/reports/ReportConfigurator";

// Mock settings context
vi.mock("../context/SettingsContext", () => ({
  useSettings: () => ({
    settings: {
      soundEnabled: false,
      volume: 0.5,
    },
  }),
}));

// Mock audio player
vi.mock("../utils/audioPlayer", () => ({
  default: vi.fn(),
}));

// Mock alert
const mockAlert = vi.fn();
global.alert = mockAlert;

const mockDataProviders = {
  units: [
    { id: "unit-1", name: "Unit 1", client: "Client A", location: "Location 1" },
    { id: "unit-2", name: "Unit 2", client: "Client B", location: "Location 2" },
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
  ],
};

const mockAvailableUnits = [
  { id: "unit-1", name: "Unit 1", client: "Client A", location: "Location 1" },
  { id: "unit-2", name: "Unit 2", client: "Client B", location: "Location 2" },
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

  // Helper to make the form valid
  const makeFormValid = () => {
    // 1. Select master scope
    const allUnits = screen.getByText("All Units");
    fireEvent.click(allUnits);
    
    // 2. Click "All Time" to clear date range requirement
    const allTimeButton = screen.getByText("All Time");
    fireEvent.click(allTimeButton);
    
    // 3. Select a section
    const energySection = screen.getByText("Energy Production");
    const row = energySection.closest("div");
    const checkbox = row?.querySelector('input[type="checkbox"]');
    if (checkbox) {
      fireEvent.click(checkbox);
    }
  };

  describe("Basic Rendering", () => {
    it("should render without crashing", () => {
      const { container } = renderComponent();
      expect(container).toBeInTheDocument();
    });

    it("should render report type cards", () => {
      renderComponent();
      expect(screen.getByText("Energy Report")).toBeInTheDocument();
      expect(screen.getByText("Water Report")).toBeInTheDocument();
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
  });

  describe("Section Configuration", () => {
    it("should show correct section labels", () => {
      renderComponent();
      expect(screen.getByText("Energy Production")).toBeInTheDocument();
      expect(screen.getByText("Water Production")).toBeInTheDocument();
      expect(screen.getByText("Alerts & Alarms")).toBeInTheDocument();
    });

    it("should respect allowedSections prop", () => {
      render(
        <ReportConfigurator
          allowedSections={["energyProduction"]}
          dataProviders={mockDataProviders}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );
      expect(screen.getByText("Energy Production")).toBeInTheDocument();
      expect(screen.queryByText("Water Production")).not.toBeInTheDocument();
    });
  });

  describe("Report Type Selection", () => {
    it("should select a report type when clicked", () => {
      renderComponent();
      const energyReport = screen.getByText("Energy Report");
      fireEvent.click(energyReport);
      expect(energyReport.closest("button")).toHaveClass("border-blue-500");
    });

    it("should deselect a report type when clicked again", () => {
      renderComponent();
      const energyReport = screen.getByText("Energy Report");
      fireEvent.click(energyReport);
      fireEvent.click(energyReport);
      expect(energyReport.closest("button")).not.toHaveClass("border-blue-500");
    });
  });

  describe("Scope Selection", () => {
    it("should select a scope when clicked", () => {
      renderComponent();
      const singleUnit = screen.getByText("Single Unit");
      fireEvent.click(singleUnit);
      expect(singleUnit.closest("button")).toHaveClass("border-blue-500");
    });

    it("should show unit selection for single scope", () => {
      renderComponent();
      const singleUnit = screen.getByText("Single Unit");
      fireEvent.click(singleUnit);
      expect(screen.getByText("Unit 1")).toBeInTheDocument();
      expect(screen.getByText("Unit 2")).toBeInTheDocument();
    });

    it("should show client selection for client scope", () => {
      renderComponent();
      const clientPortfolio = screen.getByText("Client Portfolio");
      fireEvent.click(clientPortfolio);
      expect(screen.getByText("Client A")).toBeInTheDocument();
      expect(screen.getByText("Client B")).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should disable generate button when form is invalid", () => {
      renderComponent();
      const generateButton = screen.getByText("Generate & Download Report");
      expect(generateButton).toBeDisabled();
    });

    it("should enable generate button when form is valid", async () => {
      renderComponent();
      makeFormValid();
      
      const generateButton = screen.getByText("Generate & Download Report");
      await waitFor(() => {
        expect(generateButton).not.toBeDisabled();
      }, { timeout: 2000 });
    });
  });

  describe("Report Generation (Placeholder)", () => {
    it("should call onGenerate when provided and form is valid", async () => {
      const onGenerate = vi.fn().mockResolvedValue(undefined);
      renderComponent({ onGenerate });
      
      makeFormValid();
      
      const generateButton = screen.getByText("Generate & Download Report");
      
      await waitFor(() => {
        expect(generateButton).not.toBeDisabled();
      }, { timeout: 2000 });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(onGenerate).toHaveBeenCalled();
      });
    });

    it("should show generating state during submission", async () => {
      const onGenerate = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 500)));
      renderComponent({ onGenerate });
      
      makeFormValid();
      
      const generateButton = screen.getByText("Generate & Download Report");
      
      await waitFor(() => {
        expect(generateButton).not.toBeDisabled();
      }, { timeout: 2000 });
      
      fireEvent.click(generateButton);
      
      expect(screen.getByText(/Generating Report/)).toBeInTheDocument();
    });

    it("should show success alert when no onGenerate is provided", async () => {
      renderComponent({ onGenerate: undefined });
      
      makeFormValid();
      
      const generateButton = screen.getByText("Generate & Download Report");
      
      await waitFor(() => {
        expect(generateButton).not.toBeDisabled();
      }, { timeout: 2000 });
      
      fireEvent.click(generateButton);
      
      await new Promise((resolve) => setTimeout(resolve, 3100));
      
      expect(mockAlert).toHaveBeenCalledWith(
        "Report generated successfully! Download will begin shortly."
      );
    });

    it("should handle errors gracefully", async () => {
      const onGenerate = vi.fn().mockRejectedValue(new Error("API Error"));
      renderComponent({ onGenerate });
      
      makeFormValid();
      
      const generateButton = screen.getByText("Generate & Download Report");
      
      await waitFor(() => {
        expect(generateButton).not.toBeDisabled();
      }, { timeout: 2000 });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith("Failed to generate report: API Error");
      });
    });
  });

  describe("Pause Scheduled Reports", () => {
    it("should open alert dialog when pause button is clicked", () => {
      renderComponent({ showPauseScheduled: true });
      const pauseButton = screen.getByText("Pause Scheduled Reports");
      fireEvent.click(pauseButton);
      expect(screen.getByText("Confirm Pause")).toBeInTheDocument();
    });

    it("should close dialog when cancel is clicked", () => {
      renderComponent({ showPauseScheduled: true });
      const pauseButton = screen.getByText("Pause Scheduled Reports");
      fireEvent.click(pauseButton);
      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);
      expect(screen.queryByText("Confirm Pause")).not.toBeInTheDocument();
    });

    it("should confirm pause when pause is clicked", () => {
      renderComponent({ showPauseScheduled: true });
      const pauseButton = screen.getByText("Pause Scheduled Reports");
      fireEvent.click(pauseButton);
      const pauseConfirmButton = screen.getByText("Pause");
      fireEvent.click(pauseConfirmButton);
      expect(mockAlert).toHaveBeenCalledWith("All scheduled reports have been paused.");
    });
  });

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

    it("should enable schedule button when form is valid", async () => {
      renderComponent({ showScheduling: true });
      makeFormValid();
      
      const scheduleButton = screen.getByText("Schedule Report");
      await waitFor(() => {
        expect(scheduleButton).not.toBeDisabled();
      }, { timeout: 2000 });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty allowedScopes array", () => {
      const { container } = render(<ReportConfigurator allowedScopes={[]} />);
      expect(container).toBeInTheDocument();
    });

    it("should handle empty allowedSections array", () => {
      const { container } = render(<ReportConfigurator allowedSections={[]} />);
      expect(container).toBeInTheDocument();
    });

    it("should handle empty dataProviders", () => {
      const { container } = render(
        <ReportConfigurator dataProviders={{ units: [], clients: [], reportTypes: [] }} />
      );
      expect(container).toBeInTheDocument();
    });
  });
});
