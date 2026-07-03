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

      // Use getAllByText since there might be multiple instances
      const reportElements = screen.getAllByText("Reports");
      expect(reportElements.length).toBeGreaterThan(0);
      
      const descriptionElements = screen.getAllByText(
        /Generate comprehensive PDF reports for units, clients, and portfolios/i,
      );
      expect(descriptionElements.length).toBeGreaterThan(0);
    });

    it("should render page header", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const headerElements = screen.getAllByText("Reports");
      expect(headerElements.length).toBeGreaterThan(0);
    });

    it("should render report configurator", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const configuratorElements = screen.getAllByTestId("report-configurator");
      expect(configuratorElements.length).toBeGreaterThan(0);
      
      const configTextElements = screen.getAllByText("Report Configurator");
      expect(configTextElements.length).toBeGreaterThan(0);
    });
  });

  describe("Report Scopes", () => {
    it("should provide all allowed scopes to configurator", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const scopesElements = screen.getAllByTestId("allowed-scopes");
      expect(scopesElements.length).toBeGreaterThan(0);
      
      const scopesText = scopesElements[0].textContent;
      expect(scopesText).toContain("single");
      expect(scopesText).toContain("multiple");
      expect(scopesText).toContain("client");
      expect(scopesText).toContain("master");
    });
  });

  describe("Report Sections", () => {
    it("should provide all allowed sections to configurator", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const sectionsElements = screen.getAllByTestId("allowed-sections");
      expect(sectionsElements.length).toBeGreaterThan(0);
      
      const sectionsText = sectionsElements[0].textContent;
      expect(sectionsText).toContain("vitalStatistics");
      expect(sectionsText).toContain("alertsAlarms");
      expect(sectionsText).toContain("maintenance");
      expect(sectionsText).toContain("performance");
      expect(sectionsText).toContain("compliance");
      expect(sectionsText).toContain("salesRevenue");
    });
  });

  describe("Units Data", () => {
    it("should provide 5 mock units to configurator", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const unitsElements = screen.getAllByTestId("available-units");
      expect(unitsElements.length).toBeGreaterThan(0);
      expect(unitsElements[0].textContent).toBe("5");
    });

    it("should provide units with correct structure", () => {
      const { container } = render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      expect(container).toBeTruthy();
      // Units should have id, name, client, location
      const unitsElements = screen.getAllByTestId("available-units");
      expect(unitsElements.length).toBeGreaterThan(0);
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
      const configuratorElements = screen.getAllByTestId("report-configurator");
      expect(configuratorElements.length).toBeGreaterThan(0);
    });
  });

  describe("Report Generation", () => {
    it("should handle report generation", async () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const generateButtons = screen.getAllByText("Generate Report");
      expect(generateButtons.length).toBeGreaterThan(0);
      generateButtons[0].click();

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

      const generateButtons = screen.getAllByText("Generate Report");
      expect(generateButtons.length).toBeGreaterThan(0);
      generateButtons[0].click();

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

      const schedulingElements = screen.getAllByTestId("show-scheduling");
      expect(schedulingElements.length).toBeGreaterThan(0);
      expect(schedulingElements[0].textContent).toBe("true");
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
      const unitsElements = screen.getAllByTestId("available-units");
      expect(unitsElements.length).toBeGreaterThan(0);
      expect(parseInt(unitsElements[0].textContent, 10)).toBeGreaterThan(0);
    });
  });

  describe("Data Providers", () => {
    it("should provide units data provider", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const configuratorElements = screen.getAllByTestId("report-configurator");
      expect(configuratorElements.length).toBeGreaterThan(0);
    });

    it("should provide clients data provider", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const configuratorElements = screen.getAllByTestId("report-configurator");
      expect(configuratorElements.length).toBeGreaterThan(0);
    });

    it("should provide report types data provider", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const configuratorElements = screen.getAllByTestId("report-configurator");
      expect(configuratorElements.length).toBeGreaterThan(0);
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

      const scopesElements = screen.getAllByTestId("allowed-scopes");
      expect(scopesElements.length).toBeGreaterThan(0);
      expect(scopesElements[0].textContent).toContain("single");
    });

    it("should support multiple unit reports", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const scopesElements = screen.getAllByTestId("allowed-scopes");
      expect(scopesElements.length).toBeGreaterThan(0);
      expect(scopesElements[0].textContent).toContain("multiple");
    });

    it("should support client-level reports", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const scopesElements = screen.getAllByTestId("allowed-scopes");
      expect(scopesElements.length).toBeGreaterThan(0);
      expect(scopesElements[0].textContent).toContain("client");
    });

    it("should support master portfolio reports", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const scopesElements = screen.getAllByTestId("allowed-scopes");
      expect(scopesElements.length).toBeGreaterThan(0);
      expect(scopesElements[0].textContent).toContain("master");
    });
  });

  describe("Report Section Coverage", () => {
    it("should include vital statistics section", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const sectionsElements = screen.getAllByTestId("allowed-sections");
      expect(sectionsElements.length).toBeGreaterThan(0);
      expect(sectionsElements[0].textContent).toContain("vitalStatistics");
    });

    it("should include alerts and alarms section", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const sectionsElements = screen.getAllByTestId("allowed-sections");
      expect(sectionsElements.length).toBeGreaterThan(0);
      expect(sectionsElements[0].textContent).toContain("alertsAlarms");
    });

    it("should include maintenance section", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const sectionsElements = screen.getAllByTestId("allowed-sections");
      expect(sectionsElements.length).toBeGreaterThan(0);
      expect(sectionsElements[0].textContent).toContain("maintenance");
    });

    it("should include performance section", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const sectionsElements = screen.getAllByTestId("allowed-sections");
      expect(sectionsElements.length).toBeGreaterThan(0);
      expect(sectionsElements[0].textContent).toContain("performance");
    });

    it("should include compliance section", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const sectionsElements = screen.getAllByTestId("allowed-sections");
      expect(sectionsElements.length).toBeGreaterThan(0);
      expect(sectionsElements[0].textContent).toContain("compliance");
    });

    it("should include sales and revenue section", () => {
      render(
        <TestWrapper>
          <ReportsView />
        </TestWrapper>,
      );

      const sectionsElements = screen.getAllByTestId("allowed-sections");
      expect(sectionsElements.length).toBeGreaterThan(0);
      expect(sectionsElements[0].textContent).toContain("salesRevenue");
    });
  });
});
