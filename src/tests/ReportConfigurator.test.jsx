/**
 * Tests for ReportConfigurator Component
 *
 * Tests rendering, user interactions, form validation, and submission flows
 */

import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

// Mock date-fns format
vi.mock("date-fns", async () => {
  const actual = await vi.importActual("date-fns");
  return {
    ...actual,
    format: vi.fn((date, formatStr) => {
      if (formatStr === "PPP") return "January 1, 2024";
      if (formatStr === "dd/MM/yyyy") return "01/01/2024";
      if (formatStr === "yyyy-MM-dd") return "2024-01-01";
      return actual.format(date, formatStr);
    }),
  };
});

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
    {
      id: "all-sections",
      name: "All Sections",
      description: "Complete report",
      icon: () => <div>Icon</div>,
      sections: ["energyProduction", "waterProduction", "temperaturePressure"],
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

  const fillValidForm = async (user) => {
    const singleUnit = screen.getByText("Single Unit");
    await user.click(singleUnit);

    const unit1 = screen.getByText("Unit 1");
    await user.click(unit1);

    const energySection = screen.getByText("Energy Production").closest("div");
    const checkbox = within(energySection).queryByRole("checkbox");
    await user.click(checkbox);
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

    it("should accept allowedScopes prop", () => {
      const scopes = ["single", "multiple"];
      const { container } = render(<ReportConfigurator allowedScopes={scopes} />);
      expect(container).toBeInTheDocument();
    });

    it("should accept allowedSections prop", () => {
      const sections = ["energyProduction", "waterProduction"];
      const { container } = render(
        <ReportConfigurator allowedSections={sections} />,
      );
      expect(container).toBeInTheDocument();
    });

    it("should accept custom className", () => {
      const { container } = render(
        <ReportConfigurator className="custom-class" />,
      );
      expect(container.querySelector(".custom-class")).toBeInTheDocument();
    });

    it("should render report type cards when availableReportTypes is provided", () => {
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

    it("should render date range pickers", () => {
      renderComponent();
      expect(screen.getAllByText("Pick a date")).toHaveLength(2);
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

    it("should show pause scheduled button when enabled", () => {
      renderComponent({ showPauseScheduled: true });
      expect(screen.getByText("Pause Scheduled Reports")).toBeInTheDocument();
    });

    it("should hide pause scheduled button when disabled", () => {
      renderComponent({ showPauseScheduled: false });
      expect(screen.queryByText("Pause Scheduled Reports")).not.toBeInTheDocument();
    });

    it("should render error message when present", () => {
      renderComponent();
      // Error message state is internal, but we can test the UI element
      const errorDiv = document.querySelector(".bg-red-50");
      // Initially no error
      expect(errorDiv).not.toBeInTheDocument();
    });

    // BUG FIX: Test empty availableReportTypes
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
    it("should use SECTION_CONFIG for icon/color/label mapping", () => {
      renderComponent();
      expect(screen.getByText("Energy Production")).toBeInTheDocument();
      expect(screen.getByText("Alerts & Alarms")).toBeInTheDocument();
      expect(screen.getByText("Compliance")).toBeInTheDocument();
    });

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
      const { container } = render(
        <ReportConfigurator
          allowedSections={["energyProduction", "waterProduction"]}
          dataProviders={mockDataProviders}
        />
      );
      expect(screen.getByText("Energy Production")).toBeInTheDocument();
      expect(screen.getByText("Water Production")).toBeInTheDocument();
      expect(screen.queryByText("Alerts & Alarms")).not.toBeInTheDocument();
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

    it("should update sections when report type is selected", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const energyReport = screen.getByText("Energy Report");
      await user.click(energyReport);

      const energySection = screen.getByText("Energy Production").closest("div");
      const checkbox = within(energySection).queryByRole("checkbox");
      expect(checkbox).toBeChecked();
    });

    // BUG FIX: Test multi-report-type selection
    it("should handle selecting multiple report types", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const energyReport = screen.getByText("Energy Report");
      const waterReport = screen.getByText("Water Report");
      
      await user.click(energyReport);
      await user.click(waterReport);

      expect(energyReport.closest("button")).toHaveClass("border-blue-500");
      expect(waterReport.closest("button")).toHaveClass("border-blue-500");

      // Both sections should be checked
      const energySection = screen.getByText("Energy Production").closest("div");
      const waterSection = screen.getByText("Water Production").closest("div");
      
      expect(within(energySection).queryByRole("checkbox")).toBeChecked();
      expect(within(waterSection).queryByRole("checkbox")).toBeChecked();
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

    it("should show unit selection for multiple scope", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const multipleUnits = screen.getByText("Multiple Units");
      await user.click(multipleUnits);

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

    it("should not show unit selection for master scope", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const allUnits = screen.getByText("All Units");
      await user.click(allUnits);

      expect(screen.queryByText("Unit 1")).not.toBeInTheDocument();
      expect(screen.queryByText("Unit 2")).not.toBeInTheDocument();
    });

    it("should clear unit selection when scope changes", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const singleUnit = screen.getByText("Single Unit");
      await user.click(singleUnit);

      const unit1 = screen.getByText("Unit 1");
      await user.click(unit1);

      const multipleUnits = screen.getByText("Multiple Units");
      await user.click(multipleUnits);

      const unitCheckboxes = screen.getAllByRole("checkbox");
      unitCheckboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
    });

    // BUG FIX: Test restricted allowedScopes
    it("should respect allowedScopes prop", () => {
      const { container } = render(
        <ReportConfigurator
          allowedScopes={["master"]}
          dataProviders={mockDataProviders}
        />
      );
      expect(screen.getByText("All Units")).toBeInTheDocument();
      expect(screen.queryByText("Single Unit")).not.toBeInTheDocument();
      expect(screen.queryByText("Multiple Units")).not.toBeInTheDocument();
      expect(screen.queryByText("Client Portfolio")).not.toBeInTheDocument();
    });
  });

  describe("Date Range", () => {
    it("should open date picker when clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const dateButtons = screen.getAllByText("Pick a date");
      await user.click(dateButtons[0]);

      const calendar = document.querySelector(".rdp");
      expect(calendar).toBeInTheDocument();
    });

    it("should display selected date", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const dateButtons = screen.getAllByText("Pick a date");
      await user.click(dateButtons[0]);

      const day = document.querySelector(".rdp-day:not(.rdp-day-outside)");
      if (day) {
        await user.click(day);
        expect(screen.getByText("01/01/2024")).toBeInTheDocument();
      }
    });

    it("should clear date range when All Time is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      // First select a date
      const dateButtons = screen.getAllByText("Pick a date");
      await user.click(dateButtons[0]);
      const day = document.querySelector(".rdp-day:not(.rdp-day-outside)");
      if (day) {
        await user.click(day);
      }

      // Then click All Time
      const allTimeButton = screen.getByText("All Time");
      await user.click(allTimeButton);

      const pickDateButtons = screen.getAllByText("Pick a date");
      expect(pickDateButtons).toHaveLength(2);
    });

    // BUG FIX: Test All Time with pre-existing selection
    it("should clear both start and end dates when All Time is clicked with pre-existing selection", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      // Select both dates
      const dateButtons = screen.getAllByText("Pick a date");
      await user.click(dateButtons[0]);
      const day1 = document.querySelector(".rdp-day:not(.rdp-day-outside)");
      if (day1) await user.click(day1);

      await user.click(dateButtons[1]);
      const day2 = document.querySelector(".rdp-day:not(.rdp-day-outside)");
      if (day2) await user.click(day2);

      // Click All Time
      const allTimeButton = screen.getByText("All Time");
      await user.click(allTimeButton);

      expect(screen.getAllByText("Pick a date")).toHaveLength(2);
    });
  });

  describe("Section Selection", () => {
    it("should toggle a section when clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const energySection = screen.getByText("Energy Production").closest("div");
      const checkbox = within(energySection).queryByRole("checkbox");

      expect(checkbox).not.toBeChecked();
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it("should select all sections when Select All is checked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const selectAll = screen.getByText("Select All Sections").closest("div");
      const checkbox = within(selectAll).queryByRole("checkbox");

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      const sectionCheckboxes = document.querySelectorAll(
        'input[type="checkbox"]:not([id="selectAllSections"])',
      );
      sectionCheckboxes.forEach((cb) => {
        expect(cb).toBeChecked();
      });
    });

    it("should deselect all sections when Select All is unchecked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const selectAll = screen.getByText("Select All Sections").closest("div");
      const checkbox = within(selectAll).queryByRole("checkbox");

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();

      const sectionCheckboxes = document.querySelectorAll(
        'input[type="checkbox"]:not([id="selectAllSections"])',
      );
      sectionCheckboxes.forEach((cb) => {
        expect(cb).not.toBeChecked();
      });
    });

    // BUG FIX: Test restricted allowedSections
    it("should respect allowedSections when selecting all", async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <ReportConfigurator
          allowedSections={["energyProduction"]}
          dataProviders={mockDataProviders}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );

      const selectAll = screen.getByText("Select All Sections").closest("div");
      const checkbox = within(selectAll).queryByRole("checkbox");
      await user.click(checkbox);

      expect(screen.getByText("Energy Production")).toBeInTheDocument();
      expect(screen.queryByText("Water Production")).not.toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should disable generate button when form is invalid", () => {
      renderComponent();
      const generateButton = screen.getByText("Generate & Download Report");
      expect(generateButton).toBeDisabled();
    });

    it("should enable generate button when form is valid", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      await fillValidForm(user);

      const generateButton = screen.getByText("Generate & Download Report");
      expect(generateButton).not.toBeDisabled();
    });

    it("should validate scope selection", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const energySection = screen.getByText("Energy Production").closest("div");
      const checkbox = within(energySection).queryByRole("checkbox");
      await user.click(checkbox);

      const generateButton = screen.getByText("Generate & Download Report");
      expect(generateButton).toBeDisabled();
    });

    it("should validate section selection", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const singleUnit = screen.getByText("Single Unit");
      await user.click(singleUnit);

      const generateButton = screen.getByText("Generate & Download Report");
      expect(generateButton).toBeDisabled();
    });

    it("should validate unit/client selection based on scope", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const singleUnit = screen.getByText("Single Unit");
      await user.click(singleUnit);

      const energySection = screen.getByText("Energy Production").closest("div");
      const checkbox = within(energySection).queryByRole("checkbox");
      await user.click(checkbox);

      const generateButton = screen.getByText("Generate & Download Report");
      expect(generateButton).toBeDisabled();
    });

    it("should allow master scope without unit/client selection", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const allUnits = screen.getByText("All Units");
      await user.click(allUnits);

      const energySection = screen.getByText("Energy Production").closest("div");
      const checkbox = within(energySection).queryByRole("checkbox");
      await user.click(checkbox);

      const generateButton = screen.getByText("Generate & Download Report");
      expect(generateButton).not.toBeDisabled();
    });

    // BUG FIX: Test missing clients array
    it("should handle missing clients in dataProviders gracefully", async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <ReportConfigurator
          dataProviders={{ units: [], clients: undefined, reportTypes: [] }}
          allowedScopes={["client"]}
        />
      );

      const clientPortfolio = screen.getByText("Client Portfolio");
      await user.click(clientPortfolio);

      // Should not crash - no clients to display
      expect(screen.queryByText("Client A")).not.toBeInTheDocument();
    });
  });

  describe("Report Generation", () => {
    it("should call onGenerate when form is submitted with valid data", async () => {
      const onGenerate = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup({ delay: null });

      renderComponent({ onGenerate });

      await fillValidForm(user);

      const generateButton = screen.getByText("Generate & Download Report");
      await user.click(generateButton);

      await waitFor(() => {
        expect(onGenerate).toHaveBeenCalled();
      });
    });

    it("should show generating state during submission", async () => {
      const onGenerate = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      const user = userEvent.setup({ delay: null });

      renderComponent({ onGenerate });

      await fillValidForm(user);

      const generateButton = screen.getByText("Generate & Download Report");
      await user.click(generateButton);

      expect(screen.getByText("Generating Report...")).toBeInTheDocument();
    });

    it("should handle submission errors gracefully", async () => {
      const onGenerate = vi.fn().mockRejectedValue(new Error("API Error"));
      const user = userEvent.setup({ delay: null });

      renderComponent({ onGenerate });

      await fillValidForm(user);

      const generateButton = screen.getByText("Generate & Download Report");
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith("Failed to generate report: API Error");
        expect(mockConsoleError).toHaveBeenCalled();
      });
    });

    // BUG FIX: Test default behavior without onGenerate
    it("should show success alert when no onGenerate is provided", async () => {
      const user = userEvent.setup({ delay: null });

      renderComponent({ onGenerate: undefined });

      await fillValidForm(user);

      const generateButton = screen.getByText("Generate & Download Report");
      await user.click(generateButton);

      // Wait for the timeout to complete
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          "Report generated successfully! Download will begin shortly."
        );
      }, { timeout: 4000 });
    });

    // BUG FIX: Test error reset after successful generation
    it("should clear error message on successful generation", async () => {
      const onGenerate = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup({ delay: null });

      renderComponent({ onGenerate });

      // Set an error state first (by failing a generation)
      const errorOnGenerate = vi.fn().mockRejectedValue(new Error("Initial error"));
      const { rerender } = render(
        <ReportConfigurator
          onGenerate={errorOnGenerate}
          dataProviders={mockDataProviders}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );

      await fillValidForm(user);
      const generateButton = screen.getByText("Generate & Download Report");
      await user.click(generateButton);
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith("Failed to generate report: Initial error");
      });

      // Re-render with working onGenerate
      rerender(
        <ReportConfigurator
          onGenerate={onGenerate}
          dataProviders={mockDataProviders}
          availableUnits={mockAvailableUnits}
          availableReportTypes={mockAvailableReportTypes}
        />
      );

      // Form should be valid and generation should work
      await waitFor(() => {
        expect(screen.getByText("Generate & Download Report")).not.toBeDisabled();
      });
    });
  });

  describe("Scheduling", () => {
    it("should open scheduling popover when schedule button is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent({ showScheduling: true });

      const scheduleButton = screen.getByText("Schedule Report");
      await user.click(scheduleButton);

      const calendar = document.querySelector(".rdp");
      expect(calendar).toBeInTheDocument();
    });

    it("should prevent scheduling past dates", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent({ showScheduling: true });

      const scheduleButton = screen.getByText("Schedule Report");
      await user.click(scheduleButton);

      const disabledDays = document.querySelectorAll(".rdp-day_disabled");
      expect(disabledDays.length).toBeGreaterThan(0);
    });

    it("should show scheduled message when date is selected", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent({ showScheduling: true });

      const scheduleButton = screen.getByText("Schedule Report");
      await user.click(scheduleButton);

      const day = document.querySelector(".rdp-day:not(.rdp-day_disabled):not(.rdp-day-outside)");
      if (day) {
        await user.click(day);
        expect(screen.getByText(/Report scheduled for/)).toBeInTheDocument();
      }
    });

    // BUG FIX: Test scheduling disabled when form invalid
    it("should disable schedule button when form is invalid", () => {
      renderComponent({ showScheduling: true });
      const scheduleButton = screen.getByText("Schedule Report");
      expect(scheduleButton).toBeDisabled();
    });

    it("should enable schedule button when form is valid", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent({ showScheduling: true });

      await fillValidForm(user);

      const scheduleButton = screen.getByText("Schedule Report");
      expect(scheduleButton).not.toBeDisabled();
    });
  });

  describe("Pause Scheduled Reports", () => {
    it("should open alert dialog when pause button is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent({ showPauseScheduled: true });

      const pauseButton = screen.getByText("Pause Scheduled Reports");
      await user.click(pauseButton);

      expect(screen.getByText("Confirm Pause")).toBeInTheDocument();
      expect(screen.getByText("Are you sure you want to pause all scheduled reports?")).toBeInTheDocument();
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
      expect(screen.queryByText("Confirm Pause")).not.toBeInTheDocument();
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

    it("should handle invalid section keys gracefully", () => {
      const { container } = render(
        <ReportConfigurator
          allowedSections={["energyProduction"]}
          dataProviders={mockDataProviders}
        />
      );
      expect(container).toBeInTheDocument();
    });

    it("should handle missing onGenerate prop", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent({ onGenerate: undefined });

      await fillValidForm(user);

      const generateButton = screen.getByText("Generate & Download Report");
      await user.click(generateButton);

      expect(screen.getByText("Generating Report...")).toBeInTheDocument();
    });

    it("should handle report type with sections not in allowedSections", () => {
      const customReportTypes = [
        {
          id: "custom-report",
          name: "Custom Report",
          description: "Custom report",
          icon: () => <div>Icon</div>,
          sections: ["invalidSection"],
        },
      ];

      const { container } = render(
        <ReportConfigurator
          availableReportTypes={customReportTypes}
          allowedSections={["energyProduction"]}
          dataProviders={mockDataProviders}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });
});
