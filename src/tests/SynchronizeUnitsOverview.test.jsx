/**
 * Tests for SynchronizeUnitsOverview Component
 *
 * Simplified to avoid hanging - uses fireEvent instead of userEvent
 */

import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import SynchronizeUnitsOverview from "../components/SynchronizeUnitsOverview";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock data
const { mockUnits } = vi.hoisted(() => ({
  mockUnits: [
    {
      id: 1,
      name: "ThermaCore Unit 001",
      location: "Plant A",
      client: "Client Alpha",
      status: "online",
      hasAlert: false,
      healthStatus: "good",
      currentPower: 75.5,
      water_level: 150,
    },
    {
      id: 2,
      name: "ThermaCore Unit 002",
      location: "Plant B",
      client: "Client Beta",
      status: "online",
      hasAlert: true,
      healthStatus: "warning",
      currentPower: 60.2,
      water_level: 120,
    },
    {
      id: 3,
      name: "ThermaCore Unit 003",
      location: "Plant C",
      client: "Client Gamma",
      status: "offline",
      hasAlert: false,
      healthStatus: "critical",
      currentPower: 0,
      water_level: 80,
    },
    {
      id: 4,
      name: "ThermaCore Unit 004",
      location: "Plant D",
      client: "Client Delta",
      status: "online",
      hasAlert: false,
      healthStatus: "good",
      currentPower: 90.1,
      water_level: 200,
    },
  ],
}));

vi.mock("../data/mockUnits", () => ({
  units: mockUnits,
}));

describe("SynchronizeUnitsOverview Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <SynchronizeUnitsOverview />
      </MemoryRouter>,
    );
  };

  describe("Basic Rendering", () => {
    it("should render without crashing", () => {
      const { container } = renderComponent();
      expect(container).toBeTruthy();
    });

    it("should render the page title", () => {
      renderComponent();
      expect(screen.getByText("Synchronize Units Overview")).toBeInTheDocument();
    });

    it("should render the back button", () => {
      renderComponent();
      const backButton = screen.getByRole("button", { name: /Back to Dashboard/i });
      expect(backButton).toBeInTheDocument();
    });

    it("should navigate back to dashboard when back button is clicked", () => {
      renderComponent();
      const backButton = screen.getByRole("button", { name: /Back to Dashboard/i });
      fireEvent.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("should render the sync settings button", () => {
      renderComponent();
      expect(screen.getByText("Sync Settings")).toBeInTheDocument();
    });

    it("should navigate to settings when sync settings button is clicked", () => {
      renderComponent();
      const settingsButton = screen.getByText("Sync Settings");
      fireEvent.click(settingsButton);
      expect(mockNavigate).toHaveBeenCalledWith("/settings");
    });

    it("should display all units from mock data", () => {
      renderComponent();
      mockUnits.forEach((unit) => {
        expect(screen.getByText(unit.name)).toBeInTheDocument();
        expect(screen.getByText(unit.location)).toBeInTheDocument();
        expect(screen.getByText(unit.client)).toBeInTheDocument();
      });
    });

    it("should display summary cards", () => {
      renderComponent();
      expect(screen.getByText("Total Units")).toBeInTheDocument();
      expect(screen.getByText("Synchronized")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText("Errors")).toBeInTheDocument();
    });

    it("should show correct total units count", () => {
      renderComponent();
      expect(screen.getByText("4")).toBeInTheDocument();
    });
  });

  describe("Unit Selection", () => {
    it("should allow selecting individual units", () => {
      renderComponent();
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBe(mockUnits.length);
      
      fireEvent.click(checkboxes[0]);
      expect(checkboxes[0]).toBeChecked();
    });

    it("should show selected count in sync button", () => {
      renderComponent();
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[0]);
      expect(screen.getByText(/Sync Selected \(1\)/)).toBeInTheDocument();
    });

    it("should select all units when select all is clicked", () => {
      renderComponent();
      const selectAllButton = screen.getByText("Select All");
      fireEvent.click(selectAllButton);
      
      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });

    it("should clear selection when clear is clicked", () => {
      renderComponent();
      const selectAllButton = screen.getByText("Select All");
      fireEvent.click(selectAllButton);
      
      const clearButton = screen.getByText("Clear");
      fireEvent.click(clearButton);
      
      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it("should toggle unit selection when checkbox is clicked", () => {
      renderComponent();
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes[0]).not.toBeChecked();
      
      fireEvent.click(checkboxes[0]);
      expect(checkboxes[0]).toBeChecked();
      
      fireEvent.click(checkboxes[0]);
      expect(checkboxes[0]).not.toBeChecked();
    });
  });

  describe("Sync Operations", () => {
    it("should sync all units when sync all is clicked", async () => {
      renderComponent();
      const syncAllButton = screen.getByText("Sync All Units");
      fireEvent.click(syncAllButton);
      
      expect(screen.getByText(/Synchronization in progress/)).toBeInTheDocument();
      
      await vi.advanceTimersByTimeAsync(3000);
      
      await waitFor(() => {
        expect(screen.getByText(/Synchronization completed successfully/)).toBeInTheDocument();
      });
    });

    it("should sync selected units when sync selected is clicked", async () => {
      renderComponent();
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[0]);
      
      const syncSelectedButton = screen.getByText(/Sync Selected/);
      fireEvent.click(syncSelectedButton);
      
      expect(screen.getByText(/Synchronization in progress/)).toBeInTheDocument();
      
      await vi.advanceTimersByTimeAsync(3000);
      
      await waitFor(() => {
        expect(screen.getByText(/Synchronization completed successfully/)).toBeInTheDocument();
      });
    });

    it("should disable sync selected when no units are selected", () => {
      renderComponent();
      const syncSelectedButton = screen.getByText(/Sync Selected \(0\)/);
      expect(syncSelectedButton).toBeDisabled();
    });

    it("should disable sync all during sync", () => {
      renderComponent();
      const syncAllButton = screen.getByText("Sync All Units");
      fireEvent.click(syncAllButton);
      expect(syncAllButton).toBeDisabled();
    });

    it("should update last sync time after successful sync", async () => {
      renderComponent();
      const syncAllButton = screen.getByText("Sync All Units");
      fireEvent.click(syncAllButton);
      
      await vi.advanceTimersByTimeAsync(3000);
      
      await waitFor(() => {
        const lastSyncText = screen.getByText(/Last sync:/);
        expect(lastSyncText).toBeInTheDocument();
      });
    });
  });

  describe("Sync Status Indicators", () => {
    it("should show synced status for online units without alerts", () => {
      renderComponent();
      expect(screen.getByText("ThermaCore Unit 001")).toBeInTheDocument();
      expect(screen.getByText("Synchronized")).toBeInTheDocument();
    });

    it("should show error status for units with alerts", () => {
      renderComponent();
      expect(screen.getByText("ThermaCore Unit 002")).toBeInTheDocument();
      expect(screen.getByText("Sync Failed")).toBeInTheDocument();
    });

    it("should show pending status for offline units", () => {
      renderComponent();
      expect(screen.getByText("ThermaCore Unit 003")).toBeInTheDocument();
      expect(screen.getByText("Pending Sync")).toBeInTheDocument();
    });
  });

  describe("Error States", () => {
    it("should show error status for units with sync errors", () => {
      renderComponent();
      expect(screen.getByText("Sync Failed")).toBeInTheDocument();
    });

    it("should show error count in summary card", () => {
      renderComponent();
      const errorCard = screen.getByText("Errors").closest(".bg-white");
      expect(within(errorCard).getByText(/\d/)).toBeInTheDocument();
    });
  });

  describe("UI Interactions", () => {
    it("should highlight selected units with blue border", () => {
      renderComponent();
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[0]);
      
      const row = checkboxes[0].closest(".flex")?.parentElement;
      expect(row).toHaveClass("border-blue-500");
    });

    it("should show selected count", () => {
      renderComponent();
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[0]);
      expect(screen.getByText(/Sync Selected \(1\)/)).toBeInTheDocument();
      
      fireEvent.click(checkboxes[1]);
      expect(screen.getByText(/Sync Selected \(2\)/)).toBeInTheDocument();
    });
  });
});
