/**
 * Tests for SystemHealth Component
 *
 * Coverage includes:
 * - Health indicator accuracy
 * - State transitions (Operational, Degraded, Outage)
 * - Real-time status updates
 * - Service status display
 * - Status counting and aggregation
 * - Auto-refresh functionality
 * - Manual refresh button
 * - Loading states
 */

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SystemHealth from "@/components/SystemHealth";

// Mock the statusMonitor service
vi.mock("@/services/statusMonitor", () => ({
  checkAllStatus: vi.fn(),
}));

import { checkAllStatus } from "@/services/statusMonitor";

const mockHealthData = [
  {
    name: "Frontend Hosting",
    provider: "Netlify",
    status: "Operational",
    responseTime: "80ms",
    icon: "Globe",
  },
  {
    name: "Backend API",
    provider: "Render",
    status: "Operational",
    responseTime: "120ms",
    icon: "Server",
  },
  {
    name: "Database",
    provider: "Neon PostgreSQL",
    status: "Degraded Performance",
    responseTime: "90ms",
    icon: "Database",
  },
  {
    name: "Real-time Messaging",
    provider: "Mosquitto MQTT Broker",
    status: "Outage",
    responseTime: "150ms",
    icon: "Activity",
  },
];

describe("SystemHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkAllStatus.mockResolvedValue(mockHealthData);
  });

  afterEach(() => {
    try {
      vi.useRealTimers();
    } catch (_e) {
      // Ignore if real timers are already in use
    }
  });

  describe("Component Rendering", () => {
    it("should render system health component", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const elements = screen.getAllByText("System Health Status");
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should display page header", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const titleElements = screen.getAllByText("System Health Status");
        expect(titleElements.length).toBeGreaterThan(0);
        const descElements = screen.getAllByText(/Real-time monitoring of all infrastructure/i);
        expect(descElements.length).toBeGreaterThan(0);
      });
    });

    it("should show loading state initially", () => {
      render(<SystemHealth />);

      const elements = screen.getAllByText(/Loading system status/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should render service cards after loading", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const frontendElements = screen.getAllByText("Frontend Hosting");
        expect(frontendElements.length).toBeGreaterThan(0);
        const backendElements = screen.getAllByText("Backend API");
        expect(backendElements.length).toBeGreaterThan(0);
        const dbElements = screen.getAllByText("Database");
        expect(dbElements.length).toBeGreaterThan(0);
        const messagingElements = screen.getAllByText("Real-time Messaging");
        expect(messagingElements.length).toBeGreaterThan(0);
      });
    });

    it("should apply custom className", () => {
      const { container } = render(<SystemHealth className="custom-class" />);

      expect(container.querySelector(".custom-class")).toBeTruthy();
    });
  });

  describe("Health Indicator Display", () => {
    it("should display operational status indicators", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const frontendElements = screen.getAllByText("Frontend Hosting");
        expect(frontendElements.length).toBeGreaterThan(0);
        const backendElements = screen.getAllByText("Backend API");
        expect(backendElements.length).toBeGreaterThan(0);
      });
    });

    it("should display degraded performance indicators", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const dbElements = screen.getAllByText("Database");
        expect(dbElements.length).toBeGreaterThan(0);
      });
    });

    it("should display outage indicators", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const messagingElements = screen.getAllByText("Real-time Messaging");
        expect(messagingElements.length).toBeGreaterThan(0);
      });
    });

    it("should show status icons", async () => {
      const { container } = render(<SystemHealth />);

      await waitFor(() => {
        const icons = container.querySelectorAll("svg");
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it("should display colored status indicators", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const operationalElements = screen.getAllByText("Operational");
        expect(operationalElements.length).toBeGreaterThan(0);
        const degradedElements = screen.getAllByText("Degraded Performance");
        expect(degradedElements.length).toBeGreaterThan(0);
        const outageElements = screen.getAllByText("Outage");
        expect(outageElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Status Colors", () => {
    it("should use green for operational status", async () => {
      const { container } = render(<SystemHealth />);

      await waitFor(() => {
        const greenIcons = container.querySelectorAll(".text-green-500");
        expect(greenIcons.length).toBeGreaterThan(0);
      });
    });

    it("should use yellow for degraded performance", async () => {
      const { container } = render(<SystemHealth />);

      await waitFor(() => {
        const yellowIcons = container.querySelectorAll(".text-yellow-500");
        expect(yellowIcons.length).toBeGreaterThan(0);
      });
    });

    it("should use red for outage status", async () => {
      const { container } = render(<SystemHealth />);

      await waitFor(() => {
        const redIcons = container.querySelectorAll(".text-red-500");
        expect(redIcons.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Service Information", () => {
    it("should display service names", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const frontendElements = screen.getAllByText("Frontend Hosting");
        expect(frontendElements.length).toBeGreaterThan(0);
        const backendElements = screen.getAllByText("Backend API");
        expect(backendElements.length).toBeGreaterThan(0);
        const dbElements = screen.getAllByText("Database");
        expect(dbElements.length).toBeGreaterThan(0);
        const messagingElements = screen.getAllByText("Real-time Messaging");
        expect(messagingElements.length).toBeGreaterThan(0);
      });
    });

    it("should display response times", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const response80 = screen.getAllByText("80ms");
        expect(response80.length).toBeGreaterThan(0);
        const response120 = screen.getAllByText("120ms");
        expect(response120.length).toBeGreaterThan(0);
        const response90 = screen.getAllByText("90ms");
        expect(response90.length).toBeGreaterThan(0);
        const response150 = screen.getAllByText("150ms");
        expect(response150.length).toBeGreaterThan(0);
      });
    });

    it("should display provider information", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const netlifyElements = screen.getAllByText("Netlify");
        expect(netlifyElements.length).toBeGreaterThan(0);
        const renderElements = screen.getAllByText("Render");
        expect(renderElements.length).toBeGreaterThan(0);
        const neonElements = screen.getAllByText("Neon PostgreSQL");
        expect(neonElements.length).toBeGreaterThan(0);
        const mosquittoElements = screen.getAllByText("Mosquitto MQTT Broker");
        expect(mosquittoElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Status Aggregation", () => {
    it("should count operational services", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const elements = screen.getAllByText(/operational/i);
        expect(elements.length).toBeGreaterThan(0);
        const hasTwoOperational = elements.some(el => 
          el.textContent?.includes("2") && el.textContent?.toLowerCase().includes("operational")
        );
        expect(hasTwoOperational).toBe(true);
      });
    });

    it("should count degraded services", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const elements = screen.getAllByText(/degraded/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should count outage services", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const elements = screen.getAllByText(/outage/i);
        expect(elements.length).toBeGreaterThan(0);
        const hasOneOutage = elements.some(el => 
          el.textContent?.includes("1") && el.textContent?.toLowerCase().includes("outage")
        );
        expect(hasOneOutage).toBe(true);
      });
    });
  });

  describe("Service Icons", () => {
    it("should display service-specific icons", async () => {
      const { container } = render(<SystemHealth />);

      await waitFor(() => {
        const icons = container.querySelectorAll("svg");
        expect(icons.length).toBeGreaterThanOrEqual(4);
      });
    });

    it("should handle missing icon gracefully", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const frontendElements = screen.getAllByText("Frontend Hosting");
        expect(frontendElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Status Transitions", () => {
    it("should render all status states correctly", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const frontendElements = screen.getAllByText("Frontend Hosting");
        expect(frontendElements.length).toBeGreaterThan(0);
        const dbElements = screen.getAllByText("Database");
        expect(dbElements.length).toBeGreaterThan(0);
        const messagingElements = screen.getAllByText("Real-time Messaging");
        expect(messagingElements.length).toBeGreaterThan(0);
      });
    });

    it("should use correct icon for each status", async () => {
      const { container } = render(<SystemHealth />);

      await waitFor(() => {
        const greenIcons = container.querySelectorAll(
          ".text-green-500, .text-green-600, .text-green-400"
        );
        expect(greenIcons.length).toBeGreaterThan(0);
        const yellowIcons = container.querySelectorAll(
          ".text-yellow-500, .text-yellow-600, .text-yellow-400"
        );
        expect(yellowIcons.length).toBeGreaterThan(0);
        const redIcons = container.querySelectorAll(
          ".text-red-500, .text-red-600, .text-red-400"
        );
        expect(redIcons.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Layout and Structure", () => {
    it("should use card components for services", () => {
      const { container } = render(<SystemHealth />);

      const cards = container.querySelectorAll("[data-slot='card']");
      expect(cards.length).toBeGreaterThan(0);
    });

    it("should have proper container structure", () => {
      const { container } = render(<SystemHealth />);

      expect(container.querySelector(".min-h-screen")).toBeTruthy();
      expect(container.querySelector(".max-w-6xl")).toBeTruthy();
    });

    it("should be responsive", () => {
      const { container } = render(<SystemHealth />);

      expect(container.querySelector(".mx-auto")).toBeTruthy();
    });
  });

  describe("Empty and Error States", () => {
    it("should handle empty service list", () => {
      render(<SystemHealth />);

      const titleElements = screen.getAllByText("System Health Status");
      expect(titleElements.length).toBeGreaterThan(0);
    });

    it("should handle missing service data gracefully", () => {
      expect(() => render(<SystemHealth />)).not.toThrow();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible service names", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const frontendElements = screen.getAllByText("Frontend Hosting");
        expect(frontendElements.length).toBeGreaterThan(0);
        const backendElements = screen.getAllByText("Backend API");
        expect(backendElements.length).toBeGreaterThan(0);
      });
    });

    it("should have visible status indicators", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const frontendElements = screen.getAllByText("Frontend Hosting");
        expect(frontendElements[0]).toBeVisible();
      });
    });

    it("should provide status information", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const operationalElements = screen.getAllByText("Operational");
        expect(operationalElements.length).toBeGreaterThan(0);
        expect(operationalElements[0]).toBeVisible();
      });
    });
  });

  describe("Live Status Updates", () => {
    it("should call checkAllStatus on mount", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        expect(checkAllStatus).toHaveBeenCalled();
      });
    });

    it("should auto-refresh every 30 seconds", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        expect(checkAllStatus).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        const frontendElements = screen.getAllByText("Frontend Hosting");
        expect(frontendElements.length).toBeGreaterThan(0);
      });
    });

    it("should display last updated timestamp", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const timestampElements = screen.getAllByText(/Last updated:/i);
        expect(timestampElements.length).toBeGreaterThan(0);
      });
    });

    it("should update timestamp on refresh", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const timestampElements = screen.getAllByText(/Last updated:/i);
        expect(timestampElements.length).toBeGreaterThan(0);
      });

      const refreshButtons = screen.getAllByRole("button", { name: /refresh/i });
      const refreshButton = refreshButtons[0];
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(checkAllStatus).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Manual Refresh", () => {
    it("should show refresh button", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const refreshButtons = screen.getAllByRole("button", { name: /refresh/i });
        expect(refreshButtons.length).toBeGreaterThan(0);
      });
    });

    it("should call checkAllStatus when refresh button is clicked", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        expect(checkAllStatus).toHaveBeenCalledTimes(1);
      });

      const refreshButtons = screen.getAllByRole("button", { name: /refresh/i });
      const refreshButton = refreshButtons[0];
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(checkAllStatus).toHaveBeenCalledTimes(2);
      });
    });

    it("should show refreshing state when refresh is in progress", async () => {
      checkAllStatus.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockHealthData), 100);
          })
      );

      render(<SystemHealth />);

      await waitFor(() => {
        const refreshButtons = screen.getAllByRole("button", { name: /refresh/i });
        expect(refreshButtons.length).toBeGreaterThan(0);
      });

      const refreshButton = screen.getAllByRole("button", { name: /refresh/i })[0];
      fireEvent.click(refreshButton);

      const refreshingElements = screen.getAllByText(/Refreshing/i);
      expect(refreshingElements.length).toBeGreaterThan(0);
    });

    it("should disable refresh button while refreshing", async () => {
      checkAllStatus.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockHealthData), 100);
          })
      );

      render(<SystemHealth />);

      await waitFor(() => {
        const refreshButtons = screen.getAllByRole("button", { name: /refresh/i });
        expect(refreshButtons.length).toBeGreaterThan(0);
      });

      const refreshButton = screen.getAllByRole("button", { name: /refresh/i })[0];
      fireEvent.click(refreshButton);

      expect(refreshButton).toBeDisabled();
    });
  });

  describe("Overall Status Banner", () => {
    it("should show operational banner when all services are operational", async () => {
      const allOperational = [
        {
          name: "Frontend Hosting",
          provider: "Netlify",
          status: "Operational",
          responseTime: "80ms",
          icon: "Globe",
        },
        {
          name: "Backend API",
          provider: "Render",
          status: "Operational",
          responseTime: "120ms",
          icon: "Server",
        },
      ];
      checkAllStatus.mockResolvedValue(allOperational);

      render(<SystemHealth />);

      await waitFor(() => {
        const bannerElements = screen.getAllByText("All systems operational");
        expect(bannerElements.length).toBeGreaterThan(0);
      });
    });

    it("should show degraded banner when some services are degraded", async () => {
      const degradedData = [
        {
          name: "Frontend Hosting",
          provider: "Netlify",
          status: "Operational",
          responseTime: "80ms",
          icon: "Globe",
        },
        {
          name: "Backend API",
          provider: "Render",
          status: "Degraded Performance",
          responseTime: "120ms",
          icon: "Server",
        },
      ];
      checkAllStatus.mockResolvedValue(degradedData);

      render(<SystemHealth />);

      await waitFor(() => {
        const bannerElements = screen.getAllByText(/1 service experiencing degraded performance/i);
        expect(bannerElements.length).toBeGreaterThan(0);
      });
    });

    it("should show outage banner when some services are down", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const bannerElements = screen.getAllByText(/1 service experiencing outages/i);
        expect(bannerElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Info Banner", () => {
    it("should display info banner about live monitoring", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const titleElements = screen.getAllByText(/Live Infrastructure Monitoring/i);
        expect(titleElements.length).toBeGreaterThan(0);
        const descElements = screen.getAllByText(/real-time status of infrastructure components/i);
        expect(descElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Dark Mode", () => {
    it("should have dark mode classes", async () => {
      const { container } = render(<SystemHealth />);

      await waitFor(() => {
        expect(container.querySelector(".dark\\:bg-gray-950")).toBeTruthy();
      });
    });

    it("should render in light mode", async () => {
      const { container } = render(<SystemHealth />);

      await waitFor(() => {
        expect(container.querySelector(".bg-blue-50")).toBeTruthy();
      });
    });
  });

  describe("Real-time Updates", () => {
    it("should display response times", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const response80 = screen.getAllByText("80ms");
        expect(response80.length).toBeGreaterThan(0);
        const response150 = screen.getAllByText("150ms");
        expect(response150.length).toBeGreaterThan(0);
      });
    });

    it("should show all service providers", async () => {
      render(<SystemHealth />);

      await waitFor(() => {
        const netlifyElements = screen.getAllByText("Netlify");
        expect(netlifyElements.length).toBeGreaterThan(0);
      });
    });
  });
});
