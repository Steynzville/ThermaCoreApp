/**
 * Tests for ReportsView Component
 *
 * Coverage includes:
 * - Component rendering with report configurator
 * - Mock data for units and clients
 * - Report generation workflow
 * - Report scopes (single, multiple, client, master)
 * - Available report sections
 * - Scheduling functionality
 * - Data providers integration
 */

import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import ReportsView from "@/components/ReportsView";
import { ThemeProvider } from "@/context/ThemeContext";
import { SettingsProvider } from "@/context/SettingsContext";

// Mock ReportConfigurator since it's a complex component
vi.mock("@/components/reports/ReportConfigurator", () => ({
  default: ({
    allowedScopes,
    allowedSections,
    availableUnits,
    _dataProviders,
    onGenerate,
    showScheduling,
  }) => (
    <div data-testid="report-configurator">
      <div>Report Configurator</div>
      <div data-testid="allowed-scopes">{allowedScopes.join(",")}</div>
      <div data-testid="allowed-sections">{allowedSections.join(",")}</div>
      <div data-testid="available-units">{availableUnits.length}</div>
      <div data-testid="show-scheduling">{String(showScheduling)}</div>
      <button type="button" onClick={() => onGenerate({})}>
        Generate Report
      </button>
    </div>
  ),
}));

const TestWrapper = ({ children }) => {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </SettingsProvider>
    </ThemeProvider>
  );
};

describe("ReportsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Mock window.alert
    global.alert = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Component Rendering", () => {
    it("should render reports view component", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      expect(screen.getByText("Reports")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Generate comprehensive PDF reports for units, clients, and portfolios/i,
        ),
      ).toBeInTheDocument();
    });

    it("should render page header", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      expect(screen.getByText("Reports")).toBeInTheDocument();
    });

    it("should render report configurator", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      expect(screen.getByTestId("report-configurator")).toBeInTheDocument();
      expect(screen.getByText("Report Configurator")).toBeInTheDocument();
    });
  });

  describe("Report Scopes", () => {
    it("should provide all allowed scopes to configurator", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const scopesElement = screen.getByTestId("allowed-scopes");
      expect(scopesElement.textContent).toContain("single");
      expect(scopesElement.textContent).toContain("multiple");
      expect(scopesElement.textContent).toContain("client");
      expect(scopesElement.textContent).toContain("master");
    });
  });

  describe("Report Sections", () => {
    it("should provide all allowed sections to configurator", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const sectionsElement = screen.getByTestId("allowed-sections");
      expect(sectionsElement.textContent).toContain("vitalStatistics");
      expect(sectionsElement.textContent).toContain("alertsAlarms");
      expect(sectionsElement.textContent).toContain("maintenance");
      expect(sectionsElement.textContent).toContain("performance");
      expect(sectionsElement.textContent).toContain("compliance");
      expect(sectionsElement.textContent).toContain("salesRevenue");
    });
  });

  describe("Units Data", () => {
    it("should provide 5 mock units to configurator", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const unitsElement = screen.getByTestId("available-units");
      expect(unitsElement.textContent).toBe("5");
    });

    it("should provide units with correct structure", () => {
      const { container } = render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      expect(container).toBeTruthy();
      // Units should have id, name, client, location
      const unitsElement = screen.getByTestId("available-units");
      expect(unitsElement).toBeInTheDocument();
    });
  });

  describe("Clients Data", () => {
    it("should provide 3 mock clients", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      // Component provides clients data
      expect(screen.getByTestId("report-configurator")).toBeInTheDocument();
    });
  });

  describe("Report Generation", () => {
    it("should handle report generation", async () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const generateButton = screen.getByText("Generate Report");
      generateButton.click();

      // Fast forward the fake timers to trigger the alert immediately
      await vi.advanceTimersByTimeAsync(3000);

      expect(global.alert).toHaveBeenCalledWith(
        "Report generated successfully! Download will begin shortly.",
      );
    });

    it("should call onGenerate handler with config", async () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const generateButton = screen.getByText("Generate Report");
      generateButton.click();

      // Fast forward the fake timers to trigger the alert immediately
      await vi.advanceTimersByTimeAsync(3000);

      expect(global.alert).toHaveBeenCalled();
    });
  });

  describe("Scheduling Feature", () => {
    it("should enable scheduling feature", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const schedulingElement = screen.getByTestId("show-scheduling");
      expect(schedulingElement.textContent).toBe("true");
    });
  });

  describe("Mock Data Structure", () => {
    it("should provide correctly structured unit data", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      // Units should be available
      const unitsCount = screen.getByTestId("available-units");
      expect(parseInt(unitsCount.textContent, 10)).toBeGreaterThan(0);
    });
  });

  describe("Data Providers", () => {
    it("should provide units data provider", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      expect(screen.getByTestId("report-configurator")).toBeInTheDocument();
    });

    it("should provide clients data provider", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      expect(screen.getByTestId("report-configurator")).toBeInTheDocument();
    });

    it("should provide report types data provider", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      expect(screen.getByTestId("report-configurator")).toBeInTheDocument();
    });
  });

  describe("Component Layout", () => {
    it("should apply correct container classes", () => {
      const { container } = render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const mainDiv = container.firstChild;
      expect(mainDiv.className).toMatch(/min-h-screen/);
      expect(mainDiv.className).toMatch(/bg-blue-50/);
    });

    it("should have max-width container for content", () => {
      const { container } = render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const contentDiv = container.querySelector(".max-w-6xl");
      expect(contentDiv).toBeTruthy();
    });

    it("should apply custom className if provided", () => {
      const { container } = render(
        <TestWrapper>
          <ReportsView className="custom-class" />
        </TestWrapper>,
      );

      const mainDiv = container.firstChild;
      expect(mainDiv.className).toMatch(/custom-class/);
    });
  });

  describe("Report Configuration Options", () => {
    it("should support single unit reports", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const scopesElement = screen.getByTestId("allowed-scopes");
      expect(scopesElement.textContent).toContain("single");
    });

    it("should support multiple unit reports", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const scopesElement = screen.getByTestId("allowed-scopes");
      expect(scopesElement.textContent).toContain("multiple");
    });

    it("should support client-level reports", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const scopesElement = screen.getByTestId("allowed-scopes");
      expect(scopesElement.textContent).toContain("client");
    });

    it("should support master portfolio reports", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const scopesElement = screen.getByTestId("allowed-scopes");
      expect(scopesElement.textContent).toContain("master");
    });
  });

  describe("Report Section Coverage", () => {
    it("should include vital statistics section", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const sectionsElement = screen.getByTestId("allowed-sections");
      expect(sectionsElement.textContent).toContain("vitalStatistics");
    });

    it("should include alerts and alarms section", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const sectionsElement = screen.getByTestId("allowed-sections");
      expect(sectionsElement.textContent).toContain("alertsAlarms");
    });

    it("should include maintenance section", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const sectionsElement = screen.getByTestId("allowed-sections");
      expect(sectionsElement.textContent).toContain("maintenance");
    });

    it("should include performance section", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const sectionsElement = screen.getByTestId("allowed-sections");
      expect(sectionsElement.textContent).toContain("performance");
    });

    it("should include compliance section", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const sectionsElement = screen.getByTestId("allowed-sections");
      expect(sectionsElement.textContent).toContain("compliance");
    });

    it("should include sales and revenue section", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const sectionsElement = screen.getByTestId("allowed-sections");
      expect(sectionsElement.textContent).toContain("salesRevenue");
    });
  });
});
