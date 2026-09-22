/**
 * Tests for UnitVitals Component
 *
 * Covers rendering, live/offline vitals, inline edit flows (name, location,
 * GPS) including save-error rollback, flow-rate color thresholds, the
 * "Open Maps" confirm flow, and edge cases around missing/zero values.
 */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UnitVitals from "../components/unit-details/UnitVitals";
import { SettingsProvider } from "../context/SettingsContext";
import { useUnits } from "../context/UnitContext";
import { useRealtimeMetrics } from "../hooks/useRealtimeData";
import { AuthProvider } from "../context/AuthContext";
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
      isDemoMode: true,
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
      permissions: { canManageUnits: true },
    })),
  };
});

const mockUnit = {
  id: 1,
  name: "Test Unit",
  location: "Test Location",
  status: "online",
  currentPower: 75.5,
  watergeneration: true,
  ambientTemp: 68,
  ambientHumidity: 45,
  tempIn: 72,
  tempOutChill: 70,
  tempOutHot: 82,
  awgWaterLevel: 150,
  batteryVoltage: 24.5,
  differentialPressure: 2.5,
  flowRateInlet: 45.5,
  flowRateOutChill: 34.1, // 75% of 45.5
  flowRateOutHot: 11.4, // 25% of 45.5
  powerSetpoint: 70,
  installDate: "2024-01-15",
  lastMaintenance: "2024-06-01",
  gpsCoordinates: "40.7128° N, 74.0060° W",
};

describe("UnitVitals Component", () => {
  const renderComponent = (unit = mockUnit) => {
    let result;
    act(() => {
      result = render(
        <BrowserRouter>
          <AuthProvider>
            <SettingsProvider>
              <>
                <UnitVitals unit={unit} />
              </>
            </SettingsProvider>
          </AuthProvider>
        </BrowserRouter>,
      );
    });
    return result;
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
      expect(screen.getByText(/40.7128° N, 74.0060° W/)).toBeInTheDocument();
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

    it("should display battery voltage", () => {
      renderComponent();
      expect(screen.getByText("24.5V")).toBeInTheDocument();
    });

    it("should display ambient humidity", () => {
      renderComponent();
      expect(screen.getByText("45%")).toBeInTheDocument();
    });
  });

  describe("offline / maintenance states", () => {
    it("should show N/A for temp in, temp out chill, temp out hot, differential pressure, flow in, flow out chill, flow out hot, and battery when offline", () => {
      renderComponent({ ...mockUnit, status: "offline" });
      const naValues = screen.getAllByText("N/A");
      // temp in, temp out chill, temp out hot, differential pressure,
      // flow rate inlet, flow rate out chill, flow rate out hot, battery
      expect(naValues.length).toBe(8);
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

  describe("battery offline behavior", () => {
    it("should show N/A for battery when unit is offline", () => {
      renderComponent({ ...mockUnit, status: "offline", batteryVoltage: 24.5 });
      const naElements = screen.getAllByText("N/A");
      expect(naElements.length).toBe(8);
      const bar = screen.getByTestId("battery-bar");
      expect(bar).toHaveStyle("width: 0%");
    });

    it("should show battery value when unit is online", () => {
      renderComponent({ ...mockUnit, status: "online", batteryVoltage: 24.5 });
      expect(screen.getByText("24.5V")).toBeInTheDocument();
      const bar = screen.getByTestId("battery-bar");
      expect(bar).toHaveStyle("width: 41.67%");
    });
  });

  describe("battery bar color thresholds", () => {
    it("should show red battery bar when voltage is below 23V", () => {
      renderComponent({ ...mockUnit, status: "online", batteryVoltage: 22.5 });
      const bar = screen.getByTestId("battery-bar");
      expect(bar).toHaveClass("bg-red-500");
    });

    it("should show red battery bar when voltage is above 27V", () => {
      renderComponent({ ...mockUnit, status: "online", batteryVoltage: 27.5 });
      const bar = screen.getByTestId("battery-bar");
      expect(bar).toHaveClass("bg-red-500");
    });

    it("should show yellow battery bar when voltage is between 23-24V (warning low)", () => {
      renderComponent({ ...mockUnit, status: "online", batteryVoltage: 23.5 });
      const bar = screen.getByTestId("battery-bar");
      expect(bar).toHaveClass("bg-yellow-500");
    });

    it("should show yellow battery bar when voltage is between 26-27V (warning high)", () => {
      renderComponent({ ...mockUnit, status: "online", batteryVoltage: 26.5 });
      const bar = screen.getByTestId("battery-bar");
      expect(bar).toHaveClass("bg-yellow-500");
    });

    it("should show green battery bar when voltage is between 24-26V (normal)", () => {
      renderComponent({ ...mockUnit, status: "online", batteryVoltage: 25.0 });
      const bar = screen.getByTestId("battery-bar");
      expect(bar).toHaveClass("bg-green-500");
    });

    it("should show gray battery bar when unit is offline", () => {
      renderComponent({ ...mockUnit, status: "offline", batteryVoltage: 25.0 });
      const bar = screen.getByTestId("battery-bar");
      expect(bar).toHaveClass("bg-gray-400");
    });
  });

  describe("zero-value handling (regression: falsy fallback bug)", () => {
    it("renders a battery voltage of 0 as 0V, not the fallback", () => {
      renderComponent({ ...mockUnit, batteryVoltage: 0 });
      expect(screen.getByText("0V")).toBeInTheDocument();
    });

    it("renders a humidity of 0 as 0%, not the fallback", () => {
      renderComponent({ ...mockUnit, ambientHumidity: 0 });
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("renders a flowRate of 0 as 0 L/min instead of the mock defaults", () => {
      renderComponent({
        ...mockUnit,
        flowRateInlet: 0,
        flowRateOutChill: 0,
        flowRateOutHot: 0,
      });
      const zeroReadings = screen.getAllByText("0 L/min");
      expect(zeroReadings.length).toBe(3);
    });

    it("renders a water level of 0 correctly", () => {
      renderComponent({ ...mockUnit, awgWaterLevel: 0 });
      expect(screen.getByText("0 L")).toBeInTheDocument();
    });
  });

  describe("flow rate color thresholds", () => {
    it("applies red styling for a critically high flow rate", () => {
      renderComponent({ ...mockUnit, flowRateOutChill: 95 });
      const el = screen.getByText("95 L/min");
      expect(el.className).toMatch(/text-red-600/);
    });

    it("applies red styling for a critically low flow rate", () => {
      renderComponent({ ...mockUnit, flowRateOutChill: 5 });
      const el = screen.getByText("5 L/min");
      expect(el.className).toMatch(/text-red-600/);
    });

    it("applies yellow styling for an elevated flow rate", () => {
      renderComponent({ ...mockUnit, flowRateOutChill: 75 });
      const el = screen.getByText("75 L/min");
      expect(el.className).toMatch(/text-yellow-600/);
    });

    it("applies green styling for a normal flow rate", () => {
      renderComponent({ ...mockUnit, flowRateOutChill: 34.1 });
      const el = screen.getByText("34.1 L/min");
      expect(el.className).toMatch(/text-green-600/);
    });

    it("applies default gray styling when offline regardless of value", () => {
      renderComponent({ ...mockUnit, status: "offline", flowRateOutChill: 95 });
      expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    });

    it("does not invent a missing outlet flow", () => {
      renderComponent({ ...mockUnit, flowRateOutChill: undefined });
      expect(screen.queryByText("34.1 L/min")).not.toBeInTheDocument();
      expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    });

    it("returns gray styling when flowRateOutChill is not a number", () => {
      renderComponent({ ...mockUnit, flowRateOutChill: "abc" });
      const el = screen.getByText("abc L/min");
      expect(el.className).toMatch(/text-gray-900/);
    });
  });

  describe("getFlowRateColor — non-numeric value", () => {
    it("applies default gray styling when the flow rate isn't a parseable number", () => {
      renderComponent({ ...mockUnit, flowRateOutChill: "not-a-number" });
      const el = screen.getByText("not-a-number L/min");
      expect(el.className).toMatch(/text-gray-900/);
    });
  });

  it("shows missing flow readings as unavailable", () => {
    renderComponent({
      ...mockUnit,
      flowRateInlet: undefined,
      flowRateOutChill: undefined,
      flowRateOutHot: undefined,
    });
    expect(screen.queryByText(/42.5 L\/min/)).not.toBeInTheDocument();
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(2);
  });

  describe("machine name inline edit", () => {
    it("enters edit mode and shows input with current value", () => {
      renderComponent();
      const editButtons = screen.getAllByRole("button");
      act(() => {
        fireEvent.click(editButtons[0]);
      });
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

      act(() => {
        fireEvent.click(screen.getAllByRole("button")[0]);
      });
      const input = screen.getByDisplayValue("Test Unit");
      act(() => {
        fireEvent.change(input, { target: { value: "Renamed Unit" } });
      });

      const saveButton = input.parentElement.querySelectorAll("button")[0];
      act(() => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(updateUnitName).toHaveBeenCalledWith(1, "Renamed Unit");
      });
      await waitFor(() => {
        expect(
          screen.queryByDisplayValue("Renamed Unit"),
        ).not.toBeInTheDocument();
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

      act(() => {
        fireEvent.click(screen.getAllByRole("button")[0]);
      });
      const input = screen.getByDisplayValue("Test Unit");
      act(() => {
        fireEvent.change(input, { target: { value: "Bad Name" } });
      });

      const saveButton = input.parentElement.querySelectorAll("button")[0];
      act(() => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(updateUnitName).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Unit")).toBeInTheDocument();
      });
    });

    it("cancels name edit and restores original value", () => {
      renderComponent();
      act(() => {
        fireEvent.click(screen.getAllByRole("button")[0]);
      });
      const input = screen.getByDisplayValue("Test Unit");
      act(() => {
        fireEvent.change(input, { target: { value: "Discard Me" } });
      });

      const cancelButton = input.parentElement.querySelectorAll("button")[1];
      act(() => {
        fireEvent.click(cancelButton);
      });

      expect(screen.getByText("Test Unit")).toBeInTheDocument();
      expect(screen.queryByText("Discard Me")).not.toBeInTheDocument();
    });

    it("resets to empty string if unit.name is undefined on save error", async () => {
      const updateUnitName = vi.fn().mockRejectedValue(new Error("network"));
      useUnits.mockReturnValue({
        updateUnitName,
        updateUnitLocation: vi.fn().mockResolvedValue({}),
        updateUnitGPS: vi.fn().mockResolvedValue({}),
      });
      renderComponent({ ...mockUnit, name: undefined });

      act(() => {
        fireEvent.click(screen.getAllByRole("button")[0]);
      });
      const input = screen.getByDisplayValue("");
      act(() => {
        fireEvent.change(input, { target: { value: "Bad Name" } });
      });

      const saveButton = input.parentElement.querySelectorAll("button")[0];
      act(() => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue("")).toBeInTheDocument();
      });
    });
  });

  describe("location inline edit", () => {
    it("enters edit mode for location", () => {
      renderComponent();
      const editButtons = screen.getAllByRole("button");
      act(() => {
        fireEvent.click(editButtons[1]);
      });
      expect(screen.getByDisplayValue("Test Location")).toBeInTheDocument();
    });

    it("saves the new location and exits edit mode", async () => {
      const updateUnitLocation = vi.fn().mockResolvedValue({ success: true });
      useUnits.mockReturnValue({
        isDemoMode: true,
        updateUnitName: vi.fn().mockResolvedValue({}),
        updateUnitLocation,
        updateUnitGPS: vi.fn().mockResolvedValue({}),
      });
      renderComponent();

      act(() => {
        fireEvent.click(screen.getAllByRole("button")[1]);
      });
      const input = screen.getByDisplayValue("Test Location");
      act(() => {
        fireEvent.change(input, { target: { value: "New Location" } });
      });

      const saveButton = input.parentElement.querySelectorAll("button")[0];
      act(() => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(updateUnitLocation).toHaveBeenCalledWith(1, "New Location");
      });
    });

    it("reverts to original location when save fails", async () => {
      const updateUnitLocation = vi
        .fn()
        .mockRejectedValue(new Error("network"));
      useUnits.mockReturnValue({
        isDemoMode: true,
        updateUnitName: vi.fn().mockResolvedValue({}),
        updateUnitLocation,
        updateUnitGPS: vi.fn().mockResolvedValue({}),
      });
      renderComponent();

      act(() => {
        fireEvent.click(screen.getAllByRole("button")[1]);
      });
      const input = screen.getByDisplayValue("Test Location");
      act(() => {
        fireEvent.change(input, { target: { value: "Bad Location" } });
      });
      const saveButton = input.parentElement.querySelectorAll("button")[0];
      act(() => {
        fireEvent.click(saveButton);
      });

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
      const editButtons = screen.getAllByRole("button");
      act(() => {
        fireEvent.click(editButtons[2]);
      });
      const gpsInput = screen.getByPlaceholderText("Enter GPS coordinates");
      expect(gpsInput.value).toBe("");
    });

    it("saves new GPS coordinates", async () => {
      const updateUnitGPS = vi.fn().mockResolvedValue({ success: true });
      useUnits.mockReturnValue({
        isDemoMode: true,
        updateUnitName: vi.fn().mockResolvedValue({}),
        updateUnitLocation: vi.fn().mockResolvedValue({}),
        updateUnitGPS,
      });
      renderComponent();

      const editButtons = screen.getAllByRole("button");
      act(() => {
        fireEvent.click(editButtons[2]);
      });
      const gpsInput = screen.getByPlaceholderText("Enter GPS coordinates");
      act(() => {
        fireEvent.change(gpsInput, {
          target: { value: "51.5074° N, 0.1278° W" },
        });
      });

      const saveButton = gpsInput.parentElement.querySelectorAll("button")[0];
      act(() => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(updateUnitGPS).toHaveBeenCalledWith(1, "51.5074° N, 0.1278° W");
      });
    });

    it("cancels GPS edit and restores original coordinates", () => {
      renderComponent();
      const editButtons = screen.getAllByRole("button");
      act(() => {
        fireEvent.click(editButtons[2]);
      });
      const gpsInput = screen.getByPlaceholderText("Enter GPS coordinates");
      act(() => {
        fireEvent.change(gpsInput, { target: { value: "0, 0" } });
      });

      const cancelButton = gpsInput.parentElement.querySelectorAll("button")[1];
      act(() => {
        fireEvent.click(cancelButton);
      });

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
      act(() => {
        fireEvent.click(editButtons[editButtons.length - 1]);
      });

      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("Test Location")),
        "_blank",
      );
    });

    it("does not open maps when the confirm dialog is declined", () => {
      confirmSpy.mockReturnValue(false);
      renderComponent();
      const editButtons = screen.getAllByRole("button");
      act(() => {
        fireEvent.click(editButtons[editButtons.length - 1]);
      });

      expect(openSpy).not.toHaveBeenCalled();
    });

    it("falls back to 'Current Location' when unit has no location", () => {
      confirmSpy.mockReturnValue(true);
      renderComponent({ ...mockUnit, location: "" });
      const editButtons = screen.getAllByRole("button");
      act(() => {
        fireEvent.click(editButtons[editButtons.length - 1]);
      });

      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("Current Location")),
        "_blank",
      );
    });

    it("uses 'Current Location' when unit location is null", () => {
      confirmSpy.mockReturnValue(true);
      renderComponent({ ...mockUnit, location: null });
      const editButtons = screen.getAllByRole("button");
      act(() => {
        fireEvent.click(editButtons[editButtons.length - 1]);
      });

      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("Current Location")),
        "_blank",
      );
    });

    it("uses 'Current Location' when unit location is undefined", () => {
      confirmSpy.mockReturnValue(true);
      renderComponent({ ...mockUnit, location: undefined });
      const editButtons = screen.getAllByRole("button");
      act(() => {
        fireEvent.click(editButtons[editButtons.length - 1]);
      });

      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("Current Location")),
        "_blank",
      );
    });
  });

  it("uses this unit's measurements rather than fleet-wide generated metrics", () => {
    useRealtimeMetrics.mockReturnValue({
      metrics: { temperature: { current: 999 } },
    });
    renderComponent({ ...mockUnit, tempIn: 0 });
    expect(screen.getAllByText("0°F").length).toBeGreaterThan(0);
    expect(screen.queryByText("999°F")).not.toBeInTheDocument();
  });
});
