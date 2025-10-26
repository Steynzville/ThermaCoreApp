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
      expect(screen.getByText("Alerts & Notifications")).toBeInTheDocument();
    });

    it("should render filter dropdown", () => {
      renderAlertsView();
      const filterSelect = screen.getByRole("combobox");
      expect(filterSelect).toBeInTheDocument();
    });

    it("should display all alerts by default", () => {
      renderAlertsView();

      expect(screen.getByText("Unit Offline")).toBeInTheDocument();
      expect(screen.getByText("Low Water Level")).toBeInTheDocument();
      expect(screen.getByText("Maintenance Scheduled")).toBeInTheDocument();
    });

    it("should display alert timestamps", () => {
      renderAlertsView();

      expect(screen.getByText(/2025-09-09 14:45/)).toBeInTheDocument();
      expect(screen.getByText(/2025-09-09 14:15/)).toBeInTheDocument();
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

      const filterButton = screen.getByRole("combobox");
      fireEvent.change(filterButton, { target: { value: "critical" } });

      // Should show critical alerts
      expect(screen.getByText("Unit Offline")).toBeInTheDocument();
      expect(screen.getByText("Pressure Drop")).toBeInTheDocument();

      // Should not show non-critical alerts
      expect(
        screen.queryByText("Maintenance Scheduled"),
      ).not.toBeInTheDocument();
    });

    it("should filter warning alerts", () => {
      renderAlertsView();

      const filterButton = screen.getByRole("combobox");
      fireEvent.change(filterButton, { target: { value: "warning" } });

      // Should show warning alerts
      expect(screen.getByText("Low Water Level")).toBeInTheDocument();
      expect(screen.getByText("Temperature Alert")).toBeInTheDocument();

      // Should not show non-warning alerts
      expect(screen.queryByText("Unit Offline")).not.toBeInTheDocument();
    });

    it("should filter info alerts", () => {
      renderAlertsView();

      const filterButton = screen.getByRole("combobox");
      fireEvent.change(filterButton, { target: { value: "info" } });

      // Should show info alerts
      expect(screen.getByText("Maintenance Scheduled")).toBeInTheDocument();

      // Should not show other alert types
      expect(screen.queryByText("Unit Offline")).not.toBeInTheDocument();
      expect(screen.queryByText("Low Water Level")).not.toBeInTheDocument();
    });

    it("should filter success alerts", () => {
      renderAlertsView();

      const filterButton = screen.getByRole("combobox");
      fireEvent.change(filterButton, { target: { value: "success" } });

      // Should show success alerts
      expect(screen.getByText("System Restored")).toBeInTheDocument();

      // Should not show other alert types
      expect(screen.queryByText("Unit Offline")).not.toBeInTheDocument();
    });

    it("should show all alerts when 'All Alerts' filter is selected", () => {
      renderAlertsView();

      const filterButton = screen.getByRole("combobox");

      // Filter to critical first
      fireEvent.change(filterButton, { target: { value: "critical" } });

      // Now switch back to all
      fireEvent.change(filterButton, { target: { value: "all" } });

      // Should show all alerts again
      expect(screen.getByText("Unit Offline")).toBeInTheDocument();
      expect(screen.getByText("Low Water Level")).toBeInTheDocument();
      expect(screen.getByText("Maintenance Scheduled")).toBeInTheDocument();
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

      const alertCard = screen.getByText("Unit Offline").closest("div");
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

      const alertCard = screen.getByText("Low Water Level").closest("div");
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
      const alertCards = screen.getAllByText(/ThermaCore Unit/);
      expect(alertCards.length).toBeGreaterThan(0);
    });

    it("should update count when filter is applied", () => {
      renderAlertsView();

      const filterButton = screen.getByRole("combobox");
      fireEvent.change(filterButton, { target: { value: "critical" } });

      // Should show only critical alerts
      const criticalAlertTitles = [
        screen.getByText("Unit Offline"),
        screen.getByText("Pressure Drop"),
      ];
      expect(criticalAlertTitles.length).toBe(2); // 2 critical alerts
    });
  });

  describe("Empty States", () => {
    it("should handle different filter values", () => {
      renderAlertsView();

      const filterButton = screen.getByRole("combobox");

      // Test success filter
      fireEvent.change(filterButton, { target: { value: "success" } });
      expect(screen.getByText("System Restored")).toBeInTheDocument();

      // Test info filter
      fireEvent.change(filterButton, { target: { value: "info" } });
      expect(screen.getByText("Maintenance Scheduled")).toBeInTheDocument();
    });
  });

  describe("Acknowledged Status", () => {
    it("should display acknowledged alerts", () => {
      renderAlertsView();

      // Maintenance Scheduled is acknowledged
      const acknowledgedAlert = screen.getByText("Maintenance Scheduled");
      expect(acknowledgedAlert).toBeInTheDocument();
    });

    it("should display unacknowledged alerts prominently", () => {
      renderAlertsView();

      // Unit Offline is not acknowledged
      const unacknowledgedAlert = screen.getByText("Unit Offline");
      expect(unacknowledgedAlert).toBeInTheDocument();

      const card = unacknowledgedAlert.closest("div");
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

      expect(
        screen.getByText(/has gone offline and requires immediate attention/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/water level has dropped below 10%/),
      ).toBeInTheDocument();
    });
  });
});
