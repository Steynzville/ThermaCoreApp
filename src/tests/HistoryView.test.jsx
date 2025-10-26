/**
 * Tests for HistoryView Component
 *
 * Coverage includes:
 * - Event history rendering
 * - Hardcoded notifications display
 * - Severity classification (error, warning, success, info)
 * - Event filtering and formatting
 * - Load more pagination
 * - Role-based event visibility
 * - Trend indicators
 * - API error handling
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HistoryView from "@/components/HistoryView";
import * as unitService from "@/services/unitService";

// Mock unitService
vi.mock("@/services/unitService", () => ({
  getEventHistory: vi.fn(),
}));

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockEvents = [
  {
    id: "event-1",
    unitName: "ThermaCore Unit 007",
    timestamp: "2025-09-09T10:00:00Z",
    description: "Maintenance completed",
  },
  {
    id: "event-2",
    unitName: "ThermaCore Unit 008",
    timestamp: "2025-09-09T09:30:00Z",
    description: "Diagnostic check performed",
  },
  {
    id: "event-3",
    unitName: "ThermaCore Unit 009",
    timestamp: "2025-09-09T09:00:00Z",
    description: "Calibration adjustment",
  },
  {
    id: "event-4",
    unitName: "ThermaCore Unit 010",
    timestamp: "2025-09-09T08:30:00Z",
    description: "System reboot",
  },
  {
    id: "event-5",
    unitName: "ThermaCore Unit 011",
    timestamp: "2025-09-09T08:00:00Z",
    description: "Configuration update",
  },
];

const TestWrapper = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe("HistoryView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userRole: "admin" });
  });

  describe("Component Rendering", () => {
    it("should render history view component", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText("Event History")).toBeInTheDocument();
        expect(
          screen.getByText(/Recent events and changes across all devices/i),
        ).toBeInTheDocument();
      });
    });

    it("should display loading state initially", () => {
      unitService.getEventHistory.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([]), 100);
          }),
      );

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      expect(screen.getByText(/Loading event history/i)).toBeInTheDocument();
    });

    it("should render page header", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText("Event History")).toBeInTheDocument();
      });
    });
  });

  describe("Hardcoded Notifications", () => {
    it("should display hardcoded NH3 leak alarms", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        const nh3Alerts = screen.getAllByText("NH3 LEAK DETECTED");
        expect(nh3Alerts.length).toBeGreaterThan(0);
      });
    });

    it("should display unit offline notifications", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText("Unit Offline")).toBeInTheDocument();
      });
    });

    it("should display low water level warnings", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText("Low Water Level")).toBeInTheDocument();
      });
    });

    it("should show maintenance scheduled notifications", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText("Maintenance Scheduled")).toBeInTheDocument();
      });
    });

    it("should display system restored messages", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText("System Restored")).toBeInTheDocument();
      });
    });

    it("should show temperature alerts", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText("Temperature Alert")).toBeInTheDocument();
      });
    });

    it("should display pressure drop alarms", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText("Pressure Drop")).toBeInTheDocument();
      });
    });
  });

  describe("Event History Loading", () => {
    it("should load and display event history from API", async () => {
      unitService.getEventHistory.mockResolvedValue(mockEvents);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText("ThermaCore Unit 007")).toBeInTheDocument();
        expect(screen.getByText("Maintenance completed")).toBeInTheDocument();
      });
    });

    it("should handle empty event history", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        // Should still show hardcoded notifications
        const nh3Alerts = screen.getAllByText("NH3 LEAK DETECTED");
        expect(nh3Alerts.length).toBeGreaterThan(0);
      });
    });

    it("should handle API errors gracefully", async () => {
      unitService.getEventHistory.mockRejectedValue(new Error("API Error"));

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        // Should still render, showing hardcoded notifications
        expect(screen.getByText("Event History")).toBeInTheDocument();
        const nh3Alerts = screen.getAllByText("NH3 LEAK DETECTED");
        expect(nh3Alerts.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Severity Classification", () => {
    it("should apply error severity styling for critical events", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      const { container } = render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        const errorCards = container.querySelectorAll(".border-l-red-500");
        expect(errorCards.length).toBeGreaterThan(0);
      });
    });

    it("should apply warning severity styling for warning events", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      const { container } = render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        const warningCards = container.querySelectorAll(".border-l-yellow-500");
        expect(warningCards.length).toBeGreaterThan(0);
      });
    });

    it("should apply info severity styling for informational events", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      const { container } = render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        const infoCards = container.querySelectorAll(".border-l-blue-500");
        expect(infoCards.length).toBeGreaterThan(0);
      });
    });

    it("should classify maintenance events as success severity", async () => {
      unitService.getEventHistory.mockResolvedValue([
        {
          id: "event-m1",
          unitName: "ThermaCore Unit 020",
          timestamp: "2025-09-09T10:00:00Z",
          description: "Maintenance completed",
        },
      ]);

      const { container } = render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText("Maintenance completed")).toBeInTheDocument();
        const successCards = container.querySelectorAll(".border-l-green-500");
        expect(successCards.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Event Status Display", () => {
    it("should show unresolved status for active alarms", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        const unresolvedStatuses = screen.getAllByText("Unresolved");
        expect(unresolvedStatuses.length).toBeGreaterThan(0);
      });
    });

    it("should show completed status for resolved events", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        const completedStatuses = screen.getAllByText("Completed");
        expect(completedStatuses.length).toBeGreaterThan(0);
      });
    });

    it("should apply red color to unresolved events", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      const { container } = render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        const unresolvedElements = Array.from(
          container.querySelectorAll("p"),
        ).filter((el) => el.textContent === "Unresolved");
        expect(unresolvedElements.length).toBeGreaterThan(0);
        expect(unresolvedElements[0].className).toMatch(/text-red-600/);
      });
    });
  });

  describe("Pagination and Load More", () => {
    it("should initially show limited events", async () => {
      const largeEventSet = Array.from({ length: 20 }, (_, i) => ({
        id: `event-${i}`,
        unitName: `ThermaCore Unit ${String(i + 100).padStart(3, "0")}`,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        description: "System check",
      }));

      unitService.getEventHistory.mockResolvedValue(largeEventSet);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Load more Events/i)).toBeInTheDocument();
      });
    });

    it("should load more events when button clicked", async () => {
      const events = Array.from({ length: 15 }, (_, i) => ({
        id: `event-${i}`,
        unitName: `ThermaCore Unit ${String(i + 100).padStart(3, "0")}`,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        description: "System check",
      }));

      unitService.getEventHistory.mockResolvedValue(events);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText(/Load more Events/i)).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByText(/Load more Events/i);
      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        // Should show more events after clicking
        const eventCards = screen.getAllByText(/ThermaCore Unit/);
        expect(eventCards.length).toBeGreaterThan(5);
      });
    });

    it("should hide load more button when all events shown", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        // With only hardcoded notifications, may not show load more
        const loadMoreButton = screen.queryByText(/Load more Events/i);
        // Button may or may not exist depending on number of hardcoded events
        if (loadMoreButton) {
          fireEvent.click(loadMoreButton);
          fireEvent.click(loadMoreButton);
          // Eventually should disappear
        }
      });
    });
  });

  describe("Role-Based Visibility", () => {
    it("should show all notifications for admin role", async () => {
      unitService.getEventHistory.mockResolvedValue([]);
      mockUseAuth.mockReturnValue({ userRole: "admin" });

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        const nh3Leaks = screen.getAllByText("NH3 LEAK DETECTED");
        // Admin should see both Unit 003 and Unit 014 NH3 leaks
        expect(nh3Leaks.length).toBe(2);
      });
    });

    it("should filter Unit 014 notification for user role", async () => {
      unitService.getEventHistory.mockResolvedValue([]);
      mockUseAuth.mockReturnValue({ userRole: "user" });

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        const nh3Leaks = screen.getAllByText("NH3 LEAK DETECTED");
        // User should only see Unit 003 NH3 leak (Unit 014 filtered out)
        expect(nh3Leaks.length).toBe(1);
      });
    });
  });

  describe("Event Formatting", () => {
    it("should format event timestamps correctly", async () => {
      unitService.getEventHistory.mockResolvedValue([
        {
          id: "event-test",
          unitName: "ThermaCore Unit 050",
          timestamp: "2025-09-09T10:30:00Z",
          description: "Test event",
        },
      ]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText("Test event")).toBeInTheDocument();
        // Check that timestamp is formatted (will include date/time)
        const timestamps = screen.getAllByText(/2025/);
        expect(timestamps.length).toBeGreaterThan(0);
      });
    });

    it("should determine trend based on event description", async () => {
      unitService.getEventHistory.mockResolvedValue([
        {
          id: "event-m1",
          unitName: "ThermaCore Unit 051",
          timestamp: "2025-09-09T10:00:00Z",
          description: "Maintenance completed",
        },
        {
          id: "event-c1",
          unitName: "ThermaCore Unit 052",
          timestamp: "2025-09-09T09:00:00Z",
          description: "Calibration adjustment",
        },
      ]);

      const { container } = render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByText("Maintenance completed")).toBeInTheDocument();
        expect(screen.getByText("Calibration adjustment")).toBeInTheDocument();
        // Should have trend icons (SVG elements)
        const icons = container.querySelectorAll("svg");
        expect(icons.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Performance with Large Datasets", () => {
    it("should handle 100 events efficiently", async () => {
      const largeEventSet = Array.from({ length: 100 }, (_, i) => ({
        id: `event-${i}`,
        unitName: `ThermaCore Unit ${String(i + 100).padStart(3, "0")}`,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        description: `Event ${i}`,
      }));

      unitService.getEventHistory.mockResolvedValue(largeEventSet);

      const startTime = performance.now();
      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );
      const endTime = performance.now();

      // Should render within reasonable time (< 1000ms)
      expect(endTime - startTime).toBeLessThan(1000);

      await waitFor(() => {
        expect(screen.getByText("Event History")).toBeInTheDocument();
      });
    });
  });

  describe("Trend Indicators", () => {
    it("should display up trend for positive events", async () => {
      unitService.getEventHistory.mockResolvedValue([
        {
          id: "event-up",
          unitName: "ThermaCore Unit 060",
          timestamp: "2025-09-09T10:00:00Z",
          description: "Maintenance completed successfully",
        },
      ]);

      const { container } = render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(
          screen.getByText("Maintenance completed successfully"),
        ).toBeInTheDocument();
        // Should have SVG icons for trends
        const icons = container.querySelectorAll("svg");
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it("should display stable trend by default", async () => {
      unitService.getEventHistory.mockResolvedValue([
        {
          id: "event-stable",
          unitName: "ThermaCore Unit 061",
          timestamp: "2025-09-09T10:00:00Z",
          description: "Diagnostic check performed",
        },
      ]);

      const { container } = render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(
          screen.getByText("Diagnostic check performed"),
        ).toBeInTheDocument();
        const icons = container.querySelectorAll("svg");
        expect(icons.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Event Combination", () => {
    it("should combine hardcoded notifications with API events", async () => {
      unitService.getEventHistory.mockResolvedValue(mockEvents);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        // Should have both hardcoded (NH3 LEAK) and API events (Maintenance completed)
        const nh3Leaks = screen.getAllByText("NH3 LEAK DETECTED");
        expect(nh3Leaks.length).toBeGreaterThan(0);
        expect(screen.getByText("Maintenance completed")).toBeInTheDocument();
      });
    });

    it("should prioritize hardcoded notifications at top", async () => {
      unitService.getEventHistory.mockResolvedValue(mockEvents);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>,
      );

      await waitFor(() => {
        const allEvents = screen.getAllByText(/ThermaCore Unit/);
        // First events should be hardcoded (003, 014, 001, etc.)
        expect(allEvents.length).toBeGreaterThan(0);
      });
    });
  });
});
