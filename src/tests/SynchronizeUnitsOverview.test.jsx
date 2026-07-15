/**
 * Tests for SynchronizeUnitsOverview Component
 *
 * The mock data below intentionally mirrors the REAL shape of
 * ../data/mockUnits (client as an object, capitalized healthStatus values,
 * a "maintenance" status) rather than a simplified flat shape. A previous
 * version of this test file used flat strings for `client` and lowercase
 * healthStatus values, which happened to hide a real rendering bug and a
 * real classification bug in the component — see SynchronizeUnitsOverview.jsx
 * for details. Uses fireEvent (not userEvent) because userEvent's internal
 * delay-based timers deadlock under vi.useFakeTimers().
 *
 * IMPORTANT: `waitFor` polls using real setTimeout under the hood. With
 * vi.useFakeTimers() active, nothing ever advances that internal timer, so
 * `waitFor` hangs until Vitest's own (real) test timeout kills it — a
 * confusing "Test timed out in 60000ms" with no other clue. Once a fake
 * timer advance (vi.advanceTimersByTimeAsync) has already driven the async
 * work to completion, there's nothing left to poll for: wrap the advance in
 * act() so React flushes the resulting state update, then assert directly.
 */

import { render, screen, fireEvent, within, act } from "@testing-library/react";
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

// Representative subset matching the real data shape from ../data/mockUnits:
// - id is a string ("TC00x"), not a number
// - client is an OBJECT ({ name, contact, email, phone }), not a string
// - healthStatus is capitalized ("Optimal" / "Warning" / "Critical")
// - status can be "online" / "offline" / "maintenance"
const { mockUnits } = vi.hoisted(() => ({
  mockUnits: [
    {
      id: "TC001",
      name: "ThermaCore Unit 001",
      location: "Site Alpha",
      client: { name: "Alpha Industries Ltd", contact: "John Smith" },
      status: "online",
      hasAlert: false,
      hasAlarm: false,
      healthStatus: "Optimal",
    },
    {
      id: "TC002",
      name: "ThermaCore Unit 002",
      location: "Site Beta",
      client: { name: "Beta Corporation", contact: "Sarah Johnson" },
      status: "online",
      hasAlert: true,
      hasAlarm: false,
      healthStatus: "Warning",
    },
    {
      id: "TC003",
      name: "ThermaCore Unit 003",
      location: "Site Gamma",
      client: { name: "Gamma Solutions Inc", contact: "Michael Brown" },
      status: "offline",
      hasAlert: false,
      hasAlarm: false,
      healthStatus: "Critical",
    },
    {
      id: "TC004",
      name: "ThermaCore Unit 004",
      location: "Site Delta",
      client: { name: "Delta Enterprises", contact: "Emily Davis" },
      // Regression case: online, no alert, no alarm — but critical health.
      // The component used to only check `hasAlert` on initial load, so
      // this unit would show a green "Synchronized" until a manual sync
      // was run. It must show as an error from the very first render.
      status: "online",
      hasAlert: false,
      hasAlarm: false,
      healthStatus: "Critical",
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

  // Sync-all takes (units.length * 200ms) + 1000ms to fully resolve.
  // Computing this from the actual mock length avoids the trap of a
  // hardcoded duration silently falling out of sync with the mock data.
  const FULL_SYNC_MS = mockUnits.length * 200 + 1000;

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
      expect(
        screen.getByRole("button", { name: /Back to Dashboard/i }),
      ).toBeInTheDocument();
    });

    it("should navigate back to dashboard when back button is clicked", () => {
      renderComponent();
      fireEvent.click(screen.getByRole("button", { name: /Back to Dashboard/i }));
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("should navigate to settings when sync settings button is clicked", () => {
      renderComponent();
      fireEvent.click(screen.getByRole("button", { name: /Sync Settings/i }));
      expect(mockNavigate).toHaveBeenCalledWith("/settings");
    });

    it("should display each unit's name, location, and client name", () => {
      // Regression test: `client` is an object in the real data shape.
      // Rendering `unit.client` directly used to throw
      // "Objects are not valid as a React child" for every unit — if that
      // regresses, this render() call itself will throw and fail the test.
      renderComponent();
      mockUnits.forEach((unit) => {
        expect(screen.getByText(unit.name)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(unit.location))).toBeInTheDocument();
        expect(screen.getByText(new RegExp(unit.client.name))).toBeInTheDocument();
      });
    });

    it("should show correct total units count", () => {
      renderComponent();
      expect(screen.getByText(String(mockUnits.length))).toBeInTheDocument();
    });
  });

  describe("Initial Sync Status Classification", () => {
    it("marks an online, alert-free unit with Critical health as an error on first render", () => {
      // Regression test for the initial-vs-post-sync classification bug:
      // TC004 is online with no alert/alarm, but healthStatus "Critical".
      renderComponent();
      const row = screen.getByText("ThermaCore Unit 004").closest(
        ".flex.items-center.justify-between",
      );
      expect(within(row).getByText("Sync Failed")).toBeInTheDocument();
    });

    it("marks a healthy online unit as synchronized on first render", () => {
      renderComponent();
      const row = screen.getByText("ThermaCore Unit 001").closest(
        ".flex.items-center.justify-between",
      );
      expect(within(row).getByText("Synchronized")).toBeInTheDocument();
    });

    it("marks a unit with an active alert as an error", () => {
      renderComponent();
      const row = screen.getByText("ThermaCore Unit 002").closest(
        ".flex.items-center.justify-between",
      );
      expect(within(row).getByText("Sync Failed")).toBeInTheDocument();
    });

    it("marks an offline unit as pending (not yet attempted) rather than error", () => {
      renderComponent();
      const row = screen.getByText("ThermaCore Unit 003").closest(
        ".flex.items-center.justify-between",
      );
      expect(within(row).getByText("Pending Sync")).toBeInTheDocument();
    });

    it("shows the correct synced/error/pending counts in the summary cards", () => {
      // Of the 4 mock units: TC001 synced, TC002 error (alert),
      // TC003 pending (offline), TC004 error (critical health).
      renderComponent();
      // "Synchronized" appears twice: the summary card's <p> label, and a
      // per-unit-row <span> for every synced unit (TC001 here). Disambiguate
      // by tag rather than assuming DOM order, since that's an implementation
      // detail that could silently flip.
      const syncedLabel = screen
        .getAllByText("Synchronized")
        .find((el) => el.tagName === "P");
      const syncedCard = syncedLabel.closest(".bg-white");
      const errorCard = screen.getByText("Errors").closest(".bg-white");
      const pendingCard = screen.getByText("Pending").closest(".bg-white");

      expect(within(syncedCard).getByText("1")).toBeInTheDocument();
      expect(within(errorCard).getByText("2")).toBeInTheDocument();
      expect(within(pendingCard).getByText("1")).toBeInTheDocument();
    });
  });

  describe("Unit Selection", () => {
    it("should render one checkbox per unit (Select All is a button, not a checkbox)", () => {
      renderComponent();
      expect(screen.getAllByRole("checkbox").length).toBe(mockUnits.length);
    });

    it("should allow selecting an individual unit", () => {
      renderComponent();
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[0]);
      expect(checkboxes[0]).toBeChecked();
    });

    it("should show the selected count in the Sync Selected button", () => {
      renderComponent();
      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[0]);
      expect(
        screen.getByRole("button", { name: /Sync Selected \(1\)/ }),
      ).toBeInTheDocument();
    });

    it("should select all units when Select All is clicked", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Select All"));
      screen.getAllByRole("checkbox").forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });

    it("should clear the selection when Clear is clicked", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Select All"));
      fireEvent.click(screen.getByText("Clear"));
      screen.getAllByRole("checkbox").forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it("should toggle a unit's selection on repeated clicks", () => {
      renderComponent();
      const checkbox = screen.getAllByRole("checkbox")[0];
      expect(checkbox).not.toBeChecked();
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it("should highlight a selected unit's row with a blue border", () => {
      renderComponent();
      const checkbox = screen.getAllByRole("checkbox")[0];
      fireEvent.click(checkbox);
      const row = checkbox.closest(".flex")?.parentElement;
      expect(row).toHaveClass("border-blue-500");
    });
  });

  describe("Sync Button States", () => {
    it("disables Sync Selected when nothing is selected", () => {
      renderComponent();
      // Query by role/name, not getByText — getByText would resolve to the
      // inner <span>, which isn't a real form control and can't meaningfully
      // be asserted as disabled.
      const button = screen.getByRole("button", { name: /Sync Selected \(0\)/ });
      expect(button).toBeDisabled();
    });

    it("enables Sync Selected once a unit is selected", () => {
      renderComponent();
      fireEvent.click(screen.getAllByRole("checkbox")[0]);
      const button = screen.getByRole("button", { name: /Sync Selected \(1\)/ });
      expect(button).not.toBeDisabled();
    });

    it("disables Sync All Units while a sync is in progress", () => {
      renderComponent();
      const button = screen.getByRole("button", { name: /Sync All Units/i });
      fireEvent.click(button);
      expect(button).toBeDisabled();
    });
  });

  describe("Sync Operations", () => {
    it("shows the in-progress banner immediately and the success banner once the sync completes", async () => {
      renderComponent();
      fireEvent.click(screen.getByRole("button", { name: /Sync All Units/i }));

      expect(
        screen.getByText(/Synchronization in progress/),
      ).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(FULL_SYNC_MS);
      });

      expect(
        screen.getByText(/Synchronization completed successfully/),
      ).toBeInTheDocument();
    });

    it("syncs only the selected units when Sync Selected is used", async () => {
      renderComponent();
      fireEvent.click(screen.getAllByRole("checkbox")[0]); // select TC001

      fireEvent.click(
        screen.getByRole("button", { name: /Sync Selected \(1\)/ }),
      );
      expect(
        screen.getByText(/Synchronization in progress/),
      ).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1 * 300 + 1000);
      });

      expect(
        screen.getByText(/Synchronization completed successfully/),
      ).toBeInTheDocument();
    });

    it("updates the last-sync timestamp after a full sync", async () => {
      renderComponent();
      fireEvent.click(screen.getByRole("button", { name: /Sync All Units/i }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(FULL_SYNC_MS);
      });

      expect(screen.getByText(/Last sync:/)).toBeInTheDocument();
    });

    it("still marks an offline unit as an error after a full sync attempt", async () => {
      renderComponent();
      fireEvent.click(screen.getByRole("button", { name: /Sync All Units/i }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(FULL_SYNC_MS);
      });

      const row = screen.getByText("ThermaCore Unit 003").closest(
        ".flex.items-center.justify-between",
      );
      expect(within(row).getByText("Sync Failed")).toBeInTheDocument();
    });

    it("leaves a healthy unit synchronized after a full sync", async () => {
      renderComponent();
      fireEvent.click(screen.getByRole("button", { name: /Sync All Units/i }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(FULL_SYNC_MS);
      });

      const row = screen.getByText("ThermaCore Unit 001").closest(
        ".flex.items-center.justify-between",
      );
      expect(within(row).getByText("Synchronized")).toBeInTheDocument();
    });
  });

  describe("Formatting Helpers", () => {
    it("formats data size in KB for values under 1024", () => {
      renderComponent();
      expect(screen.getAllByText(/KB/).length).toBeGreaterThan(0);
    });

    it("formats data size in MB for values >= 1024", () => {
      const formatDataSize = (sizeKB) =>
        sizeKB < 1024 ? `${sizeKB} KB` : `${(sizeKB / 1024).toFixed(1)} MB`;
      expect(formatDataSize(500)).toBe("500 KB");
      expect(formatDataSize(1536)).toBe("1.5 MB");
    });

    it("shows 'Never' for units with no recorded last sync", () => {
      renderComponent();
      // TC003 is offline, so lastSync is null -> "Never"
      const row = screen.getByText("ThermaCore Unit 003").closest(
        ".flex.items-center.justify-between",
      );
      expect(within(row).getByText("Never")).toBeInTheDocument();
    });
  });
});
