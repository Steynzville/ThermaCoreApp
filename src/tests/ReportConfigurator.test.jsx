/**
 * Tests for ReportConfigurator Component
 * 
 * Note: Report generation is currently a placeholder (UI prototype).
 * These tests verify the UI, interactions, and state management.
 * When real report generation is implemented, additional tests will be added.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
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

// Mock console.error
const mockConsoleError = vi.fn();
console.error = mockConsoleError;

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
    mockConsoleError.mockClear();
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

  // Helper to fill the form using direct DOM queries
  const fillValidForm = () => {
    // Click Single Unit scope
    const singleUnit = screen.getByText("Single Unit");
    fireEvent.click(singleUnit);

    // Click Unit 1
    const unit1 = screen.getByText("Unit 1");
    fireEvent.click(unit1);

    // Find and check Energy Production section
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

    it("should render with default props", () => {
      const { container } = render(<ReportConfigurator />);
      expect(container.firstChild).toBeInTheDocument();
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

  describe("Section Configuration", () => {
    it("should show correct section labels", () => {
      renderComponent();
      expect(screen.getByText("Energy Production")).toBeInTheDocument();
      expect(screen.getByText("Water Production")).toBeInTheDocument();
      expect(screen.getByText("Alerts & Alarms")).toBeInTheDocument();
      expect(screen.getByText("Compliance")).toBeInTheDocument();
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
    it("should select a report type when clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const energyReport = screen.getByText("Energy Report");
      await user.click(energyReport);

      expect(energyReport.closest("button")).toHaveClass("border-blue-500");
    });

    it("should deselect a report type when clicked again", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const energyReport = screen.getByText("Energy Report");
      await user.click(energyReport);
      await user.click(energyReport);

      expect(energyReport.closest("button")).not.toHaveClass("border-blue-500");
    });
  });

  describe("Scope Selection", () => {
    it("should select a scope when clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const singleUnit = screen.getByText("Single Unit");
      await user.click(singleUnit);

      expect(singleUnit.closest("button")).toHaveClass("border-blue-500");
    });

    it("should show unit selection for single scope", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const singleUnit = screen.getByText("Single Unit");
      await user.click(singleUnit);

      expect(screen.getByText("Unit 1")).toBeInTheDocument();
      expect(screen.getByText("Unit 2")).toBeInTheDocument();
    });

    it("should show client selection for client scope", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const clientPortfolio = screen.getByText("Client Portfolio");
      await user.click(clientPortfolio);

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
  });

  describe("Form Validation", () => {
    it("should disable generate button when form is invalid", () => {
      renderComponent();
      const generateButton = screen.getByText("Generate & Download Report");
      expect(generateButton).toBeDisabled();
    });

    it("should enable generate button when form is valid", async () => {
      renderComponent();
      fillValidForm();

      const generateButton = screen.getByText("Generate & Download Report");
      await waitFor(() => {
        expect(generateButton).not.toBeDisabled();
      });
    });

    it("should allow master scope without unit/client selection", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const allUnits = screen.getByText("All Units");
      await user.click(allUnits);

      // Select a section
      const energySection = screen.getByText("Energy Production");
      const row = energySection.closest("div");
      const checkbox = row?.querySelector('input[type="checkbox"]');
      if (checkbox) {
        fireEvent.click(checkbox);
      }

      const generateButton = screen.getByText("Generate & Download Report");
      await waitFor(() => {
        expect(generateButton).not.toBeDisabled();
      });
    });
  });

  describe("Report Generation (Placeholder)", () => {
    it("should call onGenerate when provided", async () => {
      const onGenerate = vi.fn().mockResolvedValue(undefined);
      renderComponent({ onGenerate });

      fillValidForm();

      const generateButton = screen.getByText("Generate & Download Report");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(onGenerate).toHaveBeenCalled();
      });
    });

    it("should show generating state during submission", async () => {
      const onGenerate = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      renderComponent({ onGenerate });

      fillValidForm();

      const generateButton = screen.getByText("Generate & Download Report");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Generating Report\.\.\./)).toBeInTheDocument();
      });
    });

    it("should show success alert when no onGenerate is provided", async () => {
      renderComponent({ onGenerate: undefined });

      fillValidForm();

      const generateButton = screen.getByText("Generate & Download Report");
      fireEvent.click(generateButton);

      // Wait for the timeout to complete (3 seconds in the component)
      await new Promise((resolve) => setTimeout(resolve, 3100));

      expect(mockAlert).toHaveBeenCalledWith(
        "Report generated successfully! Download will begin shortly."
      );
    });

    it("should handle errors gracefully", async () => {
      const onGenerate = vi.fn().mockRejectedValue(new Error("API Error"));
      renderComponent({ onGenerate });

      fillValidForm();

      const generateButton = screen.getByText("Generate & Download Report");
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith("Failed to generate report: API Error");
      });
    });
  });

  describe("Pause Scheduled Reports", () => {
    it("should open alert dialog when pause button is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent({ showPauseScheduled: true });

      const pauseButton = screen.getByText("Pause Scheduled Reports");
      await user.click(pauseButton);

      expect(screen.getByText("Confirm Pause")).toBeInTheDocument();
    });

    it("should close dialog when cancel is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent({ showPauseScheduled: true });

      const pauseButton = screen.getByText("Pause Scheduled Reports");
      await user.click(pauseButton);

      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      expect(screen.queryByText("Confirm Pause")).not.toBeInTheDocument();
    });

    it("should confirm pause when pause is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent({ showPauseScheduled: true });

      const pauseButton = screen.getByText("Pause Scheduled Reports");
      await user.click(pauseButton);

      const pauseConfirmButton = screen.getByText("Pause");
      await user.click(pauseConfirmButton);

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
      fillValidForm();

      const scheduleButton = screen.getByText("Schedule Report");
      await waitFor(() => {
        expect(scheduleButton).not.toBeDisabled();
      });
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

    it("should handle missing clients in dataProviders gracefully", () => {
      const { container } = render(
        <ReportConfigurator
          dataProviders={{ units: [], clients: undefined, reportTypes: [] }}
          allowedScopes={["client"]}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });
});
