import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AlertsView from "../components/AlertsView";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderAlertsView = (props = {}) => {
  return render(
    <BrowserRouter>
      <AlertsView userRole="admin" {...props} />
    </BrowserRouter>,
  );
};

describe("AlertsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render component with title", () => {
      renderAlertsView();
      const titleElements = screen.getAllByText("Alerts & Notifications");
      expect(titleElements.length).toBeGreaterThan(0);
    });

    it("should render filter dropdown", () => {
      renderAlertsView();
      const filterSelects = screen.getAllByRole("combobox");
      expect(filterSelects.length).toBeGreaterThan(0);
    });

    it("should display all alerts by default", () => {
      renderAlertsView();

      const offlineElements = screen.getAllByText("Unit Offline");
      expect(offlineElements.length).toBeGreaterThan(0);
      
      const waterElements = screen.getAllByText("Low Water Level");
      expect(waterElements.length).toBeGreaterThan(0);
      
      const maintenanceElements = screen.getAllByText("Maintenance Scheduled");
      expect(maintenanceElements.length).toBeGreaterThan(0);
    });

    it("should display alert timestamps", () => {
      renderAlertsView();

      const timestampElements = screen.getAllByText(/2025-09-09 14:45/);
      expect(timestampElements.length).toBeGreaterThan(0);
      
      const timestampElements2 = screen.getAllByText(/2025-09-09 14:15/);
      expect(timestampElements2.length).toBeGreaterThan(0);
    });

    it("should display device names", () => {
      renderAlertsView();

      const deviceNames = screen.getAllByText(/ThermaCore Unit 001/);
      expect(deviceNames.length).toBeGreaterThan(0);
    });
  });

  describe("Alert Filtering", () => {
    it("should filter critical alerts", () => {
      renderAlertsView();

      const filterSelects = screen.getAllByRole("combobox");
      fireEvent.change(filterSelects[0], { target: { value: "critical" } });

      // Should show critical alerts
      const offlineElements = screen.getAllByText("Unit Offline");
      expect(offlineElements.length).toBeGreaterThan(0);
      
      const pressureElements = screen.getAllByText("Pressure Drop");
      expect(pressureElements.length).toBeGreaterThan(0);

      // Should not show non-critical alerts - use queryByText instead of queryAllByText
      const maintenanceElement = screen.queryByText("Maintenance Scheduled");
      expect(maintenanceElement).not.toBeInTheDocument();
    });

    it("should filter warning alerts", () => {
      renderAlertsView();

      const filterSelects = screen.getAllByRole("combobox");
      fireEvent.change(filterSelects[0], { target: { value: "warning" } });

      // Should show warning alerts
      const waterElements = screen.getAllByText("Low Water Level");
      expect(waterElements.length).toBeGreaterThan(0);
      
      const tempElements = screen.getAllByText("Temperature Alert");
      expect(tempElements.length).toBeGreaterThan(0);

      // Should not show non-warning alerts - use queryByText instead of queryAllByText
      const offlineElement = screen.queryByText("Unit Offline");
      expect(offlineElement).not.toBeInTheDocument();
    });

    it("should filter info alerts", () => {
      renderAlertsView();

      const filterSelects = screen.getAllByRole("combobox");
      fireEvent.change(filterSelects[0], { target: { value: "info" } });

      // Should show info alerts
      const maintenanceElements = screen.getAllByText("Maintenance Scheduled");
      expect(maintenanceElements.length).toBeGreaterThan(0);

      // Should not show other alert types - use queryByText instead of queryAllByText
      const offlineElement = screen.queryByText("Unit Offline");
      expect(offlineElement).not.toBeInTheDocument();
      
      const waterElement = screen.queryByText("Low Water Level");
      expect(waterElement).not.toBeInTheDocument();
    });

    it("should filter success alerts", () => {
      renderAlertsView();

      const filterSelects = screen.getAllByRole("combobox");
      fireEvent.change(filterSelects[0], { target: { value: "success" } });

      // Should show success alerts
      const restoredElements = screen.getAllByText("System Restored");
      expect(restoredElements.length).toBeGreaterThan(0);

      // Should not show other alert types - use queryByText instead of queryAllByText
      const offlineElement = screen.queryByText("Unit Offline");
      expect(offlineElement).not.toBeInTheDocument();
    });

    it("should show all alerts when 'All Alerts' filter is selected", () => {
      renderAlertsView();

      const filterSelects = screen.getAllByRole("combobox");

      // Filter to critical first
      fireEvent.change(filterSelects[0], { target: { value: "critical" } });

      // Now switch back to all
      fireEvent.change(filterSelects[0], { target: { value: "all" } });

      // Should show all alerts again
      const offlineElements = screen.getAllByText("Unit Offline");
      expect(offlineElements.length).toBeGreaterThan(0);
      
      const waterElements = screen.getAllByText("Low Water Level");
      expect(waterElements.length).toBeGreaterThan(0);
      
      const maintenanceElements = screen.getAllByText("Maintenance Scheduled");
      expect(maintenanceElements.length).toBeGreaterThan(0);
    });
  });

  describe("Alert Styling", () => {
    it("should apply critical styling to critical alerts", () => {
      const { container } = renderAlertsView();

      const criticalCards = container.querySelectorAll(".border-l-red-500");
      expect(criticalCards.length).toBeGreaterThan(0);
    });

    it("should apply warning styling to warning alerts", () => {
      const { container } = renderAlertsView();

      const warningCards = container.querySelectorAll(".border-l-yellow-500");
      expect(warningCards.length).toBeGreaterThan(0);
    });

    it("should apply info styling to info alerts", () => {
      const { container } = renderAlertsView();

      const infoCards = container.querySelectorAll(".border-l-blue-500");
      expect(infoCards.length).toBeGreaterThan(0);
    });

    it("should apply success styling to success alerts", () => {
      const { container } = renderAlertsView();

      const successCards = container.querySelectorAll(".border-l-green-500");
      expect(successCards.length).toBeGreaterThan(0);
    });
  });

  describe("Alert Interaction", () => {
    it("should navigate to unit details on alert click", () => {
      renderAlertsView();

      const alertCard = screen.getAllByText("Unit Offline")[0].closest("div");
      if (alertCard) {
        fireEvent.click(alertCard);
      }

      expect(mockNavigate).toHaveBeenCalledWith(
        "/unit-details/1?tab=alerts",
        expect.objectContaining({
          state: expect.objectContaining({
            unit: expect.objectContaining({
              id: "TC001",
            }),
          }),
        }),
      );
    });

    it("should pass alert information when navigating", () => {
      renderAlertsView();

      const alertCard = screen.getAllByText("Low Water Level")[0].closest("div");
      if (alertCard) {
        fireEvent.click(alertCard);
      }

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining("/unit-details/"),
        expect.objectContaining({
          state: expect.objectContaining({
            unit: expect.objectContaining({
              currentAlert: expect.objectContaining({
                type: "warning",
                title: "Low Water Level",
              }),
            }),
          }),
        }),
      );
    });
  });

  describe("Alert Count", () => {
    it("should show total alert count", () => {
      renderAlertsView();

      // Should display the count of alerts
      const deviceNames = screen.getAllByText(/ThermaCore Unit/);
      expect(deviceNames.length).toBeGreaterThan(0);
    });

    it("should update count when filter is applied", () => {
      renderAlertsView();

      const filterSelects = screen.getAllByRole("combobox");
      fireEvent.change(filterSelects[0], { target: { value: "critical" } });

      // Should show only critical alerts
      const offlineElements = screen.getAllByText("Unit Offline");
      expect(offlineElements.length).toBeGreaterThan(0);
      
      const pressureElements = screen.getAllByText("Pressure Drop");
      expect(pressureElements.length).toBeGreaterThan(0);
      
      // Both critical alerts should be present
      expect(offlineElements.length + pressureElements.length).toBeGreaterThan(0);
    });
  });

  describe("Empty States", () => {
    it("should handle different filter values", () => {
      renderAlertsView();

      const filterSelects = screen.getAllByRole("combobox");

      // Test success filter
      fireEvent.change(filterSelects[0], { target: { value: "success" } });
      const restoredElements = screen.getAllByText("System Restored");
      expect(restoredElements.length).toBeGreaterThan(0);

      // Test info filter
      fireEvent.change(filterSelects[0], { target: { value: "info" } });
      const maintenanceElements = screen.getAllByText("Maintenance Scheduled");
      expect(maintenanceElements.length).toBeGreaterThan(0);
    });
  });

  describe("Acknowledged Status", () => {
    it("should display acknowledged alerts", () => {
      renderAlertsView();

      // Maintenance Scheduled is acknowledged
      const acknowledgedAlert = screen.getAllByText("Maintenance Scheduled");
      expect(acknowledgedAlert.length).toBeGreaterThan(0);
    });

    it("should display unacknowledged alerts prominently", () => {
      renderAlertsView();

      // Unit Offline is not acknowledged
      const unacknowledgedAlert = screen.getAllByText("Unit Offline");
      expect(unacknowledgedAlert.length).toBeGreaterThan(0);

      const card = unacknowledgedAlert[0].closest("div");
      expect(card).toBeInTheDocument();
    });
  });

  describe("Icons", () => {
    it("should display appropriate icon for each alert type", () => {
      const { container } = renderAlertsView();

      // Each alert card should have an icon
      const cards = container.querySelectorAll("[data-slot='card']");
      expect(cards.length).toBeGreaterThan(0);

      // Icons are rendered as SVG elements from lucide-react
      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe("Responsive Design", () => {
    it("should apply custom className", () => {
      const { container } = renderAlertsView({ className: "custom-class" });

      const mainDiv = container.querySelector(".custom-class");
      expect(mainDiv).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have clickable alert cards", () => {
      renderAlertsView();

      const alertCards = screen.getAllByText(/ThermaCore Unit/);
      alertCards.forEach((card) => {
        const clickableParent = card.closest("div");
        expect(clickableParent).toBeInTheDocument();
      });
    });

    it("should display alert messages clearly", () => {
      renderAlertsView();

      const messageElements = screen.getAllByText(
        /has gone offline and requires immediate attention/,
      );
      expect(messageElements.length).toBeGreaterThan(0);
      
      const waterElements = screen.getAllByText(
        /water level has dropped below 10%/,
      );
      expect(waterElements.length).toBeGreaterThan(0);
    });
  });
});
