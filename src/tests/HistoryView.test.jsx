/**
 * Tests for HistoryView Component
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HistoryView from "@/components/HistoryView";
import * as unitService from "@/services/unitService";

// Mock service
vi.mock("@/services/unitService", () => ({
  getEventHistory: vi.fn(),
}));

// Mock auth
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
];

const TestWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe("HistoryView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ userRole: "admin" });
  });

  describe("Rendering", () => {
    it("renders history view", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>
      );

      expect(await screen.findByText("Event History")).toBeInTheDocument();
      expect(
        screen.getByText(/Recent events and changes across all devices/i)
      ).toBeInTheDocument();
    });

    it("shows loading state initially", () => {
      unitService.getEventHistory.mockImplementation(
        () => new Promise(() => {})
      );

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>
      );

      expect(
        screen.getByText(/Loading event history/i)
      ).toBeInTheDocument();
    });
  });

  describe("Hardcoded Notifications", () => {
    const setup = () => {
      unitService.getEventHistory.mockResolvedValue([]);
      return render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>
      );
    };

    it("renders NH3 leak alert", async () => {
      setup();
      expect(await screen.findByText("NH3 LEAK DETECTED")).toBeInTheDocument();
    });

    it("renders offline notification", async () => {
      setup();
      expect(await screen.findByText("Unit Offline")).toBeInTheDocument();
    });

    it("renders water level warning", async () => {
      setup();
      expect(await screen.findByText("Low Water Level")).toBeInTheDocument();
    });

    it("renders maintenance notification", async () => {
      setup();
      expect(
        await screen.findByText("Maintenance Scheduled")
      ).toBeInTheDocument();
    });

    it("renders system restored message", async () => {
      setup();
      expect(await screen.findByText("System Restored")).toBeInTheDocument();
    });
  });

  describe("API Events", () => {
    it("renders API events", async () => {
      unitService.getEventHistory.mockResolvedValue(mockEvents);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>
      );

      expect(
        await screen.findByText("ThermaCore Unit 007")
      ).toBeInTheDocument();

      expect(
        await screen.findByText("Maintenance completed")
      ).toBeInTheDocument();
    });

    it("handles API errors gracefully", async () => {
      unitService.getEventHistory.mockRejectedValue(new Error("fail"));

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>
      );

      expect(await screen.findByText("Event History")).toBeInTheDocument();
      expect(
        await screen.findByText("NH3 LEAK DETECTED")
      ).toBeInTheDocument();
    });
  });

  describe("Severity UI", () => {
    it("renders severity indicators", async () => {
      unitService.getEventHistory.mockResolvedValue(mockEvents);

      const { container } = render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>
      );

      await waitFor(() => {
        const severityBlocks = container.querySelectorAll(
          ".border-l-red-500, .border-l-yellow-500, .border-l-blue-500, .border-l-green-500"
        );

        expect(severityBlocks.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Event Status", () => {
    it("shows status labels", async () => {
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>
      );

      expect(await screen.findByText("Unresolved")).toBeInTheDocument();
      expect(await screen.findByText("Completed")).toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    it("shows load more when many events exist", async () => {
      const events = Array.from({ length: 15 }, (_, i) => ({
        id: `e-${i}`,
        unitName: `ThermaCore Unit ${i}`,
        timestamp: new Date().toISOString(),
        description: "System check",
      }));

      unitService.getEventHistory.mockResolvedValue(events);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>
      );

      expect(
        await screen.findByText(/Load more Events/i)
      ).toBeInTheDocument();
    });

    it("loads more events on click", async () => {
      const events = Array.from({ length: 15 }, (_, i) => ({
        id: `e-${i}`,
        unitName: `ThermaCore Unit ${i}`,
        timestamp: new Date().toISOString(),
        description: "System check",
      }));

      unitService.getEventHistory.mockResolvedValue(events);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>
      );

      const button = await screen.findByText(/Load more Events/i);
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getAllByText(/ThermaCore Unit/).length).toBeGreaterThan(
          5
        );
      });
    });

    it("hides load more when not needed", async () => {
      unitService.getEventHistory.mockResolvedValue([
        {
          id: "1",
          unitName: "ThermaCore Unit 001",
          timestamp: new Date().toISOString(),
          description: "Test",
        },
      ]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>
      );

      await screen.findByText("Event History");

      expect(
        screen.queryByText(/Load more Events/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("Role visibility", () => {
    it("renders for admin", async () => {
      mockUseAuth.mockReturnValue({ userRole: "admin" });
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>
      );

      expect(
        await screen.findByText("NH3 LEAK DETECTED")
      ).toBeInTheDocument();
    });

    it("renders for user", async () => {
      mockUseAuth.mockReturnValue({ userRole: "user" });
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>
      );

      expect(
        await screen.findByText("NH3 LEAK DETECTED")
      ).toBeInTheDocument();
    });
  });

  describe("Event formatting", () => {
    it("renders timestamps", async () => {
      unitService.getEventHistory.mockResolvedValue([
        {
          id: "x",
          unitName: "ThermaCore Unit 999",
          timestamp: "2025-09-09T10:00:00Z",
          description: "Test event",
        },
      ]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>
      );

      expect(await screen.findByText(/Test event/)).toBeInTheDocument();
      expect(screen.getByText(/2025/)).toBeInTheDocument();
    });
  });
});
