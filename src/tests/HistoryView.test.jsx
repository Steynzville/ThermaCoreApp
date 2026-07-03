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

      const titleElements = await screen.findAllByText("Event History");
      expect(titleElements.length).toBeGreaterThan(0);
      
      const descElements = screen.getAllByText(/Recent events and changes across all devices/i);
      expect(descElements.length).toBeGreaterThan(0);
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

      const loadingElements = screen.getAllByText(/Loading event history/i);
      expect(loadingElements.length).toBeGreaterThan(0);
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
      const elements = await screen.findAllByText("NH3 LEAK DETECTED");
      expect(elements.length).toBeGreaterThan(0);
    });

    it("renders offline notification", async () => {
      setup();
      const elements = await screen.findAllByText("Unit Offline");
      expect(elements.length).toBeGreaterThan(0);
    });

    it("renders water level warning", async () => {
      setup();
      const elements = await screen.findAllByText("Low Water Level");
      expect(elements.length).toBeGreaterThan(0);
    });

    it("renders maintenance notification", async () => {
      setup();
      const elements = await screen.findAllByText("Maintenance Scheduled");
      expect(elements.length).toBeGreaterThan(0);
    });

    it("renders system restored message", async () => {
      setup();
      const elements = await screen.findAllByText("System Restored");
      expect(elements.length).toBeGreaterThan(0);
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

      const unitElements = await screen.findAllByText("ThermaCore Unit 007");
      expect(unitElements.length).toBeGreaterThan(0);

      const descElements = await screen.findAllByText("Maintenance completed");
      expect(descElements.length).toBeGreaterThan(0);
    });

    it("handles API errors gracefully", async () => {
      unitService.getEventHistory.mockRejectedValue(new Error("fail"));

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>
      );

      const titleElements = await screen.findAllByText("Event History");
      expect(titleElements.length).toBeGreaterThan(0);
      
      const nh3Elements = await screen.findAllByText("NH3 LEAK DETECTED");
      expect(nh3Elements.length).toBeGreaterThan(0);
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

      const unresolvedElements = await screen.findAllByText("Unresolved");
      expect(unresolvedElements.length).toBeGreaterThan(0);
      
      const completedElements = await screen.findAllByText("Completed");
      expect(completedElements.length).toBeGreaterThan(0);
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

      const loadMoreElements = await screen.findAllByText(/Load more Events/i);
      expect(loadMoreElements.length).toBeGreaterThan(0);
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

      const buttons = await screen.findAllByText(/Load more Events/i);
      expect(buttons.length).toBeGreaterThan(0);
      
      if (buttons.length > 0) {
        fireEvent.click(buttons[0]);
      }

      await waitFor(() => {
        const unitElements = screen.getAllByText(/ThermaCore Unit/);
        expect(unitElements.length).toBeGreaterThan(5);
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

      await screen.findAllByText("Event History");

      const loadMoreElements = screen.queryAllByText(/Load more Events/i);
      expect(loadMoreElements.length).toBe(0);
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

      const nh3Elements = await screen.findAllByText("NH3 LEAK DETECTED");
      expect(nh3Elements.length).toBeGreaterThan(0);
    });

    it("renders for user", async () => {
      mockUseAuth.mockReturnValue({ userRole: "user" });
      unitService.getEventHistory.mockResolvedValue([]);

      render(
        <TestWrapper>
          <HistoryView />
        </TestWrapper>
      );

      const nh3Elements = await screen.findAllByText("NH3 LEAK DETECTED");
      expect(nh3Elements.length).toBeGreaterThan(0);
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

      const testElements = await screen.findAllByText(/Test event/);
      expect(testElements.length).toBeGreaterThan(0);
      
      const dateElements = screen.getAllByText(/2025/);
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });
});
