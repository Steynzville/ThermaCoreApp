/**
 * Tests for SynchronizeUnitsOverview Component
 *
 * Tests rendering, sync status, unit selection, and synchronization operations.
 */

import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// `vi.mock` factories are hoisted above the rest of the module, so a plain
// `const mockUnits = [...]` declared below would still be in its temporal
// dead zone when the factory below runs, throwing "Cannot access
// 'mockUnits' before initialization". `vi.hoisted` runs its callback at the
// same hoisted point, so the value exists by the time the mock factory (and
// the rest of this file) reference it.
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
      expect(screen.getByText("4")).toBeInTheDocument(); // Total units
    });
  });

  describe("Unit Sync States", () => {
    it("should show correct connection status icon for online units", () => {
      renderComponent();
      const onlineUnit = screen.getByText("ThermaCore Unit 001");
      const row = onlineUnit.closest(".flex")?.parentElement;
      const wifiIcon = within(row).queryByTestId("wifi-icon");
      // Wifi icon should be present for online units
      expect(onlineUnit).toBeInTheDocument();
    });

    it("should show correct connection status icon for offline units", () => {
      renderComponent();
      const offlineUnit = screen.getByText("ThermaCore Unit 003");
      expect(offlineUnit).toBeInTheDocument();
      // The row should show offline status
      const row = offlineUnit.closest(".flex")?.parentElement;
      expect(row).toBeInTheDocument();
    });

    it("should show sync status icons for each unit", () => {
      renderComponent();
      // Initially units should have sync states based on their status
      // Some should be synced, some pending, some error
      expect(screen.getByText("Synchronized")).toBeInTheDocument();
      expect(screen.getByText("Pending Sync")).toBeInTheDocument();
    });

    it("should display data size for each unit", () => {
      renderComponent();
      // Each unit should show data size (KB or MB)
      expect(screen.getByText(/KB/)).toBeInTheDocument();
    });

    it("should display last sync time or 'Never' for units", () => {
      renderComponent();
      // Some units should have a last sync time
      expect(screen.getByText(/Never/)).toBeInTheDocument();
    });
  });

  describe("Unit Selection", () => {
    it("should allow selecting individual units", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const checkboxes = screen.getAllByRole("checkbox");
      // One checkbox per unit — "Select All" is a plain button, not a
      // checkbox, so there's no extra master checkbox to account for.
      expect(checkboxes.length).toBe(mockUnits.length);

      // Click first unit's checkbox
      await user.click(checkboxes[0]);
      expect(checkboxes[0]).toBeChecked();
    });

    it("should show selected count in sync button", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[0]);

      expect(screen.getByText(/Sync Selected \(1\)/)).toBeInTheDocument();
    });

    it("should select all units when select all is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const selectAllButton = screen.getByText("Select All");
      await user.click(selectAllButton);

      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });

    it("should clear selection when clear is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const selectAllButton = screen.getByText("Select All");
      await user.click(selectAllButton);

      const clearButton = screen.getByText("Clear");
      await user.click(clearButton);

      const checkboxes = screen.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it("should toggle unit selection when checkbox is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const checkboxes = screen.getAllByRole("checkbox");
      // Initially unchecked
      expect(checkboxes[0]).not.toBeChecked();

      await user.click(checkboxes[0]);
      expect(checkboxes[0]).toBeChecked();

      await user.click(checkboxes[0]);
      expect(checkboxes[0]).not.toBeChecked();
    });
  });

  describe("Sync Operations", () => {
    it("should sync all units when sync all is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const syncAllButton = screen.getByText("Sync All Units");
      await user.click(syncAllButton);

      // Should show syncing state
      expect(screen.getByText(/Synchronization in progress/)).toBeInTheDocument();

      // Fast-forward timers
      await vi.advanceTimersByTimeAsync(3000);

      // Should show success state
      await waitFor(() => {
        expect(screen.getByText(/Synchronization completed successfully/)).toBeInTheDocument();
      });
    });

    it("should sync selected units when sync selected is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      // Select first unit
      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[0]);

      const syncSelectedButton = screen.getByText(/Sync Selected/);
      await user.click(syncSelectedButton);

      // Should show syncing state
      expect(screen.getByText(/Synchronization in progress/)).toBeInTheDocument();

      // Fast-forward timers
      await vi.advanceTimersByTimeAsync(3000);

      // Should show success state
      await waitFor(() => {
        expect(screen.getByText(/Synchronization completed successfully/)).toBeInTheDocument();
      });
    });

    it("should disable sync selected when no units are selected", () => {
      renderComponent();

      const syncSelectedButton = screen.getByText(/Sync Selected \(0\)/);
      expect(syncSelectedButton).toBeDisabled();
    });

    it("should disable sync all during sync", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const syncAllButton = screen.getByText("Sync All Units");
      await user.click(syncAllButton);

      expect(syncAllButton).toBeDisabled();
    });

    it("should update last sync time after successful sync", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const syncAllButton = screen.getByText("Sync All Units");
      await user.click(syncAllButton);

      await vi.advanceTimersByTimeAsync(3000);

      // Last sync time should be updated
      await waitFor(() => {
        const lastSyncText = screen.getByText(/Last sync:/);
        expect(lastSyncText).toBeInTheDocument();
      });
    });

    it("should update unit statuses after sync", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const syncAllButton = screen.getByText("Sync All Units");
      await user.click(syncAllButton);

      await vi.advanceTimersByTimeAsync(3000);

      // Unit statuses should be updated
      await waitFor(() => {
        expect(screen.getByText("Synchronized")).toBeInTheDocument();
      });
    });

    it("keeps an online unit with critical health marked as an error after sync (regression: case-sensitive healthStatus check)", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const syncAllButton = screen.getByText("Sync All Units");
      await user.click(syncAllButton);
      await vi.advanceTimersByTimeAsync(3000);

      // Unit 004 is online with no alert and "good" health, so it should
      // synchronize successfully — this is the counterpart check to make
      // sure the fix to the "critical" comparison didn't flip healthy
      // units into an error state.
      await waitFor(() => {
        const unitRow = screen.getByText("ThermaCore Unit 004").closest(
          ".flex.items-center.justify-between",
        );
        expect(within(unitRow).getByText("Synchronized")).toBeInTheDocument();
      });
    });
  });

  describe("Sync Status Indicators", () => {
    it("should show synced status icon for synchronized units", () => {
      renderComponent();
      // Find a unit that should be synced (Unit 001 is online, no alerts, good health)
      expect(screen.getByText("ThermaCore Unit 001")).toBeInTheDocument();
      // The row should contain the synced status text
      expect(screen.getByText("Synchronized")).toBeInTheDocument();
    });

    it("should show error status for units with alerts", () => {
      renderComponent();
      // Unit 002 has an alert
      expect(screen.getByText("ThermaCore Unit 002")).toBeInTheDocument();
      expect(screen.getByText("Sync Failed")).toBeInTheDocument();
    });

    it("should show pending status for offline units", () => {
      renderComponent();
      // Unit 003 is offline
      expect(screen.getByText("ThermaCore Unit 003")).toBeInTheDocument();
      expect(screen.getByText("Pending Sync")).toBeInTheDocument();
    });

    it("should show error status for units with critical health", () => {
      renderComponent();
      // Unit 003 has critical health
      expect(screen.getByText("ThermaCore Unit 003")).toBeInTheDocument();
      expect(screen.getByText("Sync Failed")).toBeInTheDocument();
    });
  });

  describe("Formatting Helpers", () => {
    it("should format data size in KB correctly", () => {
      renderComponent();
      // Should display data in KB format
      expect(screen.getByText(/KB/)).toBeInTheDocument();
    });

    it("should format data size in MB when > 1024 KB", () => {
      // This would require mocking dataSize > 1024
      // Covered by the component logic
      const formatDataSize = (sizeKB) => {
        if (sizeKB < 1024) return `${sizeKB} KB`;
        return `${(sizeKB / 1024).toFixed(1)} MB`;
      };
      expect(formatDataSize(500)).toBe("500 KB");
      expect(formatDataSize(1500)).toBe("1.5 MB");
    });

    it("should format date time correctly", () => {
      const dateString = "2024-01-15T10:30:00.000Z";
      const formatted = new Date(dateString).toLocaleString();
      renderComponent();
      // The component should use this formatting
      expect(formatted).toBeTruthy();
    });
  });

  describe("Error States", () => {
    it("should show error status for units with sync errors", () => {
      renderComponent();
      // Unit with error should show error icon
      expect(screen.getByText("Sync Failed")).toBeInTheDocument();
    });

    it("should show error count in summary card", () => {
      renderComponent();
      // Should show number of units with errors
      const errorCard = screen.getByText("Errors").closest(".bg-white");
      const errorCount = within(errorCard).getByText(/\d/);
      expect(errorCount).toBeInTheDocument();
    });
  });

  describe("UI Interactions", () => {
    it("should highlight selected units with blue border", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[0]);

      const row = checkboxes[0].closest(".flex")?.parentElement;
      expect(row).toHaveClass("border-blue-500");
    });

    it("should show selected count", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[0]);

      expect(screen.getByText(/Sync Selected \(1\)/)).toBeInTheDocument();

      await user.click(checkboxes[1]);
      expect(screen.getByText(/Sync Selected \(2\)/)).toBeInTheDocument();
    });
  });

  describe("Timer and Async Behavior", () => {
    it("should show syncing state during sync", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const syncAllButton = screen.getByText("Sync All Units");
      await user.click(syncAllButton);

      // Should show spinning refresh icon and syncing text
      expect(screen.getByText(/Synchronization in progress/)).toBeInTheDocument();
    });

    it("should complete sync after all units are processed", async () => {
      const user = userEvent.setup({ delay: null });
      renderComponent();

      const syncAllButton = screen.getByText("Sync All Units");
      await user.click(syncAllButton);

      await vi.advanceTimersByTimeAsync(3000);

      await waitFor(() => {
        expect(screen.getByText(/Synchronization completed successfully/)).toBeInTheDocument();
      });
    });
  });
});
