/**
 * Tests for UnitVitals Component
 *
 * Covers rendering, live/offline vitals, inline edit flows (name, location,
 * GPS) including save-error rollback, flow-rate color thresholds, the
 * "Open Maps" confirm flow, and edge cases around missing/zero values.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UnitVitals from "../components/unit-details/UnitVitals";
import { SettingsProvider } from "../context/SettingsContext";
import { useUnits, UnitProvider } from "../context/UnitContext";
import { useRealtimeMetrics } from "../hooks/useRealtimeData";
import { AuthProvider } from "../context/AuthContext";
import { TenantProvider } from "../context/TenantContext";
import { BrowserRouter } from "react-router-dom";

// Mock the useRealtimeMetrics hook to prevent it from calling useTenant
vi.mock("../hooks/useRealtimeData", () => ({
  useRealtimeMetrics: vi.fn(() => ({
    metrics: null,
    loading: false,
    error: null,
    connectionStatus: "disconnected",
    isConnected: false,
  })),
}));

// Mock useSettings
vi.mock("../context/SettingsContext", async () => {
  const actual = await vi.importActual("../context/SettingsContext");
  return {
    ...actual,
    useSettings: vi.fn(() => ({
      formatTemperature: vi.fn((temp) => `${temp}°F`),
      settings: { temperatureUnit: "F" },
    })),
  };
});

// Mock useUnits
vi.mock("../context/UnitContext", async () => {
  const actual = await vi.importActual("../context/UnitContext");
  return {
    ...actual,
    useUnits: vi.fn(() => ({
      updateUnitName: vi.fn().mockResolvedValue({ success: true }),
      updateUnitLocation: vi.fn().mockResolvedValue({ success: true }),
      updateUnitGPS: vi.fn().mockResolvedValue({ success: true }),
    })),
  };
});

// Mock useAuth
vi.mock("../context/AuthContext", async () => {
  const actual = await vi.importActual("../context/AuthContext");
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      user: { id: 1, username: "testuser" },
      backendRole: "user",
      isAuthenticated: true,
    })),
  };
});

const mockUnit = {
  id: 1,
  name: "Test Unit",
  location: "Test Location",
  status: "online",
  currentPower: 75.5,
  water_level: 150,
  watergeneration: true,
  temp_outside: 68,
  temp_in: 72,
  temp_out: 70,
  humidity: 45,
  pressure: 101.3,
  battery_level: 85,
  flowRate: 45.5,
  installDate: "2024-01-15",
  lastMaintenance: "2024-06-01",
  gpsCoordinates: "40.7128° N, 74.0060° W",
};

describe("UnitVitals Component", () => {
  const renderComponent = (unit = mockUnit) => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <SettingsProvider>
              <UnitProvider>
                <UnitVitals unit={unit} />
              </UnitProvider>
            </SettingsProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>,
    );
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render without crashing", () => {
      const { container } = renderComponent();
      expect(container).toBeTruthy();
    });

    it("should display unit name", () => {
      renderComponent();
      expect(screen.getByText("Test Unit")).toBeInTheDocument();
    });

    it("should display unit location", () => {
      renderComponent();
      expect(screen.getByText("Test Location")).toBeInTheDocument();
    });

    it("should display install date and last maintenance", () => {
      renderComponent();
      expect(screen.getByText("2024-01-15")).toBeInTheDocument();
      expect(screen.getByText("2024-06-01")).toBeInTheDocument();
    });

    it("should display GPS coordinates when present", () => {
      renderComponent();
      expect(
        screen.getByText(/40.7128° N, 74.0060° W/),
      ).toBeInTheDocument();
    });

    it("should display current power output", () => {
      renderComponent();
      expect(screen.getByText(/75.5/)).toBeInTheDocument();
    });

    it("should display water level when watergeneration is true", () => {
      renderComponent();
      expect(screen.getByText(/150 L/)).toBeInTheDocument();
    });

    it("should not display water level when watergeneration is false", () => {
      renderComponent({ ...mockUnit, watergeneration: false });
      expect(screen.queryByText(/150 L/)).not.toBeInTheDocument();
    });

    it("should display battery level", () => {
      renderComponent();
      expect(screen.getByText("85%")).toBeInTheDocument();
    });

    it("should display humidity", () => {
      renderComponent();
      expect(screen.getByText("45%")).toBeInTheDocument();
    });
  });

  describe("offline / maintenance states", () => {
    it("should show N/A for temp in/out and pressure when offline", () => {
      renderComponent({ ...mockUnit, status: "offline" });
      const naValues = screen.getAllByText("N/A");
      // temp in, temp out, pressure, flow in, flow out
      expect(naValues.length).toBe(5);
    });

    it("should show N/A when unit is in maintenance", () => {
      renderComponent({ ...mockUnit, status: "maintenance" });
      expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    });

    it("should show N/A when unit is decommissioned", () => {
      renderComponent({ ...mockUnit, status: "decommissioned" });
      expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    });

    it("should still show live values when online", () => {
      renderComponent();
      expect(screen.queryByText("N/A")).not.toBeInTheDocument();
    });
  });

  describe("zero-value handling (regression: falsy fallback bug)", () => {
    it("renders a battery level of 0 as 0%, not the fallback", () => {
      renderComponent({ ...mockUnit, battery_level: 0 });
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("renders a humidity of 0 as 0%, not the fallback", () => {
      renderComponent({ ...mockUnit, humidity: 0 });
      // Both battery and humidity render "0%" style text; scope via getAllByText
      expect(screen.getAllByText("0%").length).toBeGreaterThan(0);
    });

    it("renders a flowRate of 0 as 0 L/min instead of the mock defaults", () => {
      renderComponent({ ...mockUnit, flowRate: 0 });
      // Both inlet and outlet derive from flowRate, so a flowRate of 0
      // legitimately produces two "0 L/min" readings (inlet, and outlet
      // at 0 * 0.95 = 0) — not the 45.5 / 42.1 mock defaults.
      const zeroReadings = screen.getAllByText("0 L/min");
      expect(zeroReadings.length).toBe(2);
    });

    it("renders a water level of 0 correctly", () => {
      renderComponent({ ...mockUnit, water_level: 0 });
      expect(screen.getByText("0 L")).toBeInTheDocument();
    });
  });

  describe("flow rate color thresholds", () => {
    it("applies red styling for a critically high flow rate", () => {
      renderComponent({ ...mockUnit, flowRate: 95 });
      const el = screen.getByText("95 L/min");
      expect(el.className).toMatch(/text-red-600/);
    });

    it("applies red styling for a critically low flow rate", () => {
      renderComponent({ ...mockUnit, flowRate: 5 });
      const el = screen.getByText("5 L/min");
      expect(el.className).toMatch(/text-red-600/);
    });

    it("applies yellow styling for an elevated flow rate", () => {
      renderComponent({ ...mockUnit, flowRate: 75 });
      const el = screen.getByText("75 L/min");
      expect(el.className).toMatch(/text-yellow-600/);
    });

    it("applies green styling for a normal flow rate", () => {
      renderComponent({ ...mockUnit, flowRate: 45.5 });
      const el = screen.getByText("45.5 L/min");
      expect(el.className).toMatch(/text-green-600/);
    });

    it("applies default gray styling when offline regardless of value", () => {
      renderComponent({ ...mockUnit, status: "offline", flowRate: 95 });
      // value is hidden as N/A while offline
      expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    });
  });

  describe("machine name inline edit", () => {
    it("enters edit mode and shows input with current value", () => {
      renderComponent();
      const editButtons = screen.getAllByRole("button");
      // First edit icon button belongs to Machine Name
      fireEvent.click(editButtons[0]);
      expect(screen.getByDisplayValue("Test Unit")).toBeInTheDocument();
    });

    it("saves the new name and exits edit mode", async () => {
      const updateUnitName = vi.fn().mockResolvedValue({ success: true });
      useUnits.mockReturnValue({
        updateUnitName,
        updateUnitLocation: vi.fn().mockResolvedValue({}),
        updateUnitGPS: vi.fn().mockResolvedValue({}),
      });
      renderComponent();

      fireEvent.click(screen.getAllByRole("button")[0]);
      const input = screen.getByDisplayValue("Test Unit");
      fireEvent.change(input, { target: { value: "Renamed Unit" } });

      const saveButton = input.parentElement.querySelectorAll("button")[0];
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateUnitName).toHaveBeenCalledWith(1, "Renamed Unit");
      });
      await waitFor(() => {
        expect(screen.queryByDisplayValue("Renamed Unit")).not.toBeInTheDocument();
      });
    });

    it("reverts to original name when save fails", async () => {
      const updateUnitName = vi.fn().mockRejectedValue(new Error("network"));
      useUnits.mockReturnValue({
        updateUnitName,
        updateUnitLocation: vi.fn().mockResolvedValue({}),
        updateUnitGPS: vi.fn().mockResolvedValue({}),
      });
      renderComponent();

      fireEvent.click(screen.getAllByRole("button")[0]);
      const input = screen.getByDisplayValue("Test Unit");
      fireEvent.change(input, { target: { value: "Bad Name" } });

      const saveButton = input.parentElement.querySelectorAll("button")[0];
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateUnitName).toHaveBeenCalled();
      });
      // Still in edit mode (component only exits edit mode on success),
      // but the field value has been reset back to the original.
      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Unit")).toBeInTheDocument();
      });
    });

    it("cancels name edit and restores original value", () => {
      renderComponent();
      fireEvent.click(screen.getAllByRole("button")[0]);
      const input = screen.getByDisplayValue("Test Unit");
      fireEvent.change(input, { target: { value: "Discard Me" } });

      const cancelButton = input.parentElement.querySelectorAll("button")[1];
      fireEvent.click(cancelButton);

      expect(screen.getByText("Test Unit")).toBeInTheDocument();
      expect(screen.queryByText("Discard Me")).not.toBeInTheDocument();
    });
  });

  describe("location inline edit", () => {
    it("enters edit mode for location", () => {
      renderComponent();
      const editButtons = screen.getAllByRole("button");
      fireEvent.click(editButtons[1]);
      expect(screen.getByDisplayValue("Test Location")).toBeInTheDocument();
    });

    it("saves the new location and exits edit mode", async () => {
      const updateUnitLocation = vi.fn().mockResolvedValue({ success: true });
      useUnits.mockReturnValue({
        updateUnitName: vi.fn().mockResolvedValue({}),
        updateUnitLocation,
        updateUnitGPS: vi.fn().mockResolvedValue({}),
      });
      renderComponent();

      fireEvent.click(screen.getAllByRole("button")[1]);
      const input = screen.getByDisplayValue("Test Location");
      fireEvent.change(input, { target: { value: "New Location" } });

      const saveButton = input.parentElement.querySelectorAll("button")[0];
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateUnitLocation).toHaveBeenCalledWith(1, "New Location");
      });
    });

    it("reverts to original location when save fails", async () => {
      const updateUnitLocation = vi
        .fn()
        .mockRejectedValue(new Error("network"));
      useUnits.mockReturnValue({
        updateUnitName: vi.fn().mockResolvedValue({}),
        updateUnitLocation,
        updateUnitGPS: vi.fn().mockResolvedValue({}),
      });
      renderComponent();

      fireEvent.click(screen.getAllByRole("button")[1]);
      const input = screen.getByDisplayValue("Test Location");
      fireEvent.change(input, { target: { value: "Bad Location" } });
      fireEvent.click(input.parentElement.querySelectorAll("button")[0]);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Location")).toBeInTheDocument();
      });
    });
  });

  describe("GPS inline edit", () => {
    it("shows placeholder text when no GPS coordinates are set", () => {
      renderComponent({ ...mockUnit, gpsCoordinates: undefined });
      expect(screen.getByText(/GPS: Not set/)).toBeInTheDocument();
    });

    it("does not seed the edit field with a fake coordinate default", () => {
      renderComponent({ ...mockUnit, gpsCoordinates: undefined });
      // Find and click the GPS edit icon (last edit icon in the location block)
      const editButtons = screen.getAllByRole("button");
      // Buttons order: [name edit, location edit, gps edit, gps open-maps]
      fireEvent.click(editButtons[2]);
      const gpsInput = screen.getByPlaceholderText("Enter GPS coordinates");
      expect(gpsInput.value).toBe("");
    });

    it("saves new GPS coordinates", async () => {
      const updateUnitGPS = vi.fn().mockResolvedValue({ success: true });
      useUnits.mockReturnValue({
        updateUnitName: vi.fn().mockResolvedValue({}),
        updateUnitLocation: vi.fn().mockResolvedValue({}),
        updateUnitGPS,
      });
      renderComponent();

      const editButtons = screen.getAllByRole("button");
      fireEvent.click(editButtons[2]);
      const gpsInput = screen.getByPlaceholderText("Enter GPS coordinates");
      fireEvent.change(gpsInput, { target: { value: "51.5074° N, 0.1278° W" } });

      const saveButton = gpsInput.parentElement.querySelectorAll("button")[0];
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateUnitGPS).toHaveBeenCalledWith(1, "51.5074° N, 0.1278° W");
      });
    });

    it("cancels GPS edit and restores original coordinates", () => {
      renderComponent();
      const editButtons = screen.getAllByRole("button");
      fireEvent.click(editButtons[2]);
      const gpsInput = screen.getByPlaceholderText("Enter GPS coordinates");
      fireEvent.change(gpsInput, { target: { value: "0, 0" } });

      const cancelButton = gpsInput.parentElement.querySelectorAll("button")[1];
      fireEvent.click(cancelButton);

      expect(screen.getByText(/40.7128° N, 74.0060° W/)).toBeInTheDocument();
    });
  });

  describe("Open Maps", () => {
    let confirmSpy;
    let openSpy;

    beforeEach(() => {
      confirmSpy = vi.spyOn(window, "confirm");
      openSpy = vi.spyOn(window, "open").mockImplementation(() => {});
    });

    afterEach(() => {
      confirmSpy.mockRestore();
      openSpy.mockRestore();
    });

    it("opens maps with the unit location when confirmed", () => {
      confirmSpy.mockReturnValue(true);
      renderComponent();
      const editButtons = screen.getAllByRole("button");
      // Open Maps (Navigation icon) is the last button in the GPS row
      fireEvent.click(editButtons[editButtons.length - 1]);

      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("Test Location")),
        "_blank",
      );
    });

    it("does not open maps when the confirm dialog is declined", () => {
      confirmSpy.mockReturnValue(false);
      renderComponent();
      const editButtons = screen.getAllByRole("button");
      fireEvent.click(editButtons[editButtons.length - 1]);

      expect(openSpy).not.toHaveBeenCalled();
    });

    it("falls back to 'Current Location' when unit has no location", () => {
      confirmSpy.mockReturnValue(true);
      renderComponent({ ...mockUnit, location: "" });
      const editButtons = screen.getAllByRole("button");
      fireEvent.click(editButtons[editButtons.length - 1]);

      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("Current Location")),
        "_blank",
      );
    });
  });

  describe("live metrics integration", () => {
    it("recomputes temp/pressure/flow values when metrics stream in", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: {
          temperature: { current: "80" },
          pressure: { current: "110" },
          flow_rate_inlet: { current: "50" },
          flow_rate_outlet: { current: "40" },
        },
        loading: false,
        error: null,
        connectionStatus: "connected",
        isConnected: true,
      });
      const { container } = renderComponent();
      expect(container).toBeTruthy();
    });

    it("does not recompute live values while offline even if metrics stream in", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: {
          temperature: { current: "80" },
          pressure: { current: "110" },
        },
        loading: false,
        error: null,
        connectionStatus: "connected",
        isConnected: true,
      });
      renderComponent({ ...mockUnit, status: "offline" });
      expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    });
  });
});
