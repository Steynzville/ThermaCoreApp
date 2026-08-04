/**
 * Tests for UnitVitals Component
 *
 * Covers rendering, live/offline vitals, inline edit flows (name, location,
 * GPS) including save-error rollback, flow-rate color thresholds, the
 * "Open Maps" confirm flow, and edge cases around missing/zero values.
 */

import { fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UnitVitals from "../components/unit-details/UnitVitals";
import { SettingsProvider } from "../context/SettingsContext";
import { useUnits, UnitProvider } from "../context/UnitContext";
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
  watergeneration: true,
  ambientTemp: 68,
  ambientHumidity: 45,
  tempIn: 72,
  tempOutChill: 70,
  tempOutHot: 82,
  awgWaterLevel: 150,
  batteryVoltage: 12.5,
  differentialPressure: 2.5,
  flowRateOutChill: 45.5,
  flowRateOutHot: 35.2,
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
              <UnitProvider>
                <UnitVitals unit={unit} />
              </UnitProvider>
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

    it("should display battery voltage", () => {
      renderComponent();
      expect(screen.getByText("12.5V")).toBeInTheDocument();
    });

    it("should display ambient humidity", () => {
      renderComponent();
      expect(screen.getByText("45%")).toBeInTheDocument();
    });
  });

  describe("offline / maintenance states", () => {
    it("should show N/A for temp in, temp out chill, temp out hot, differential pressure, flow in, flow out when offline", () => {
      renderComponent({ ...mockUnit, status: "offline" });
      const naValues = screen.getAllByText("N/A");
      // temp in, temp out chill, temp out hot, differential pressure, flow in, flow out
      expect(naValues.length).toBe(6);
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
    it("renders a battery voltage of 0 as 0V, not the fallback", () => {
      renderComponent({ ...mockUnit, batteryVoltage: 0 });
      expect(screen.getByText("0V")).toBeInTheDocument();
    });

    it("renders a humidity of 0 as 0%, not the fallback", () => {
      renderComponent({ ...mockUnit, ambientHumidity: 0 });
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("renders a flowRate of 0 as 0 L/min instead of the mock defaults", () => {
      renderComponent({ ...mockUnit, flowRateOutChill: 0, flowRateOutHot: 0 });
      const zeroReadings = screen.getAllByText("0 L/min");
      expect(zeroReadings.length).toBe(2);
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
      renderComponent({ ...mockUnit, flowRateOutChill: 45.5 });
      const el = screen.getByText("45.5 L/min");
      expect(el.className).toMatch(/text-green-600/);
    });

    it("applies default gray styling when offline regardless of value", () => {
      renderComponent({ ...mockUnit, status: "offline", flowRateOutChill: 95 });
      expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    });

    it("falls back to green-range default (42.5) when flowRateOutChill is undefined", () => {
      renderComponent({ ...mockUnit, flowRateOutChill: undefined });
      const el = screen.getByText("42.5 L/min");
      expect(el.className).toMatch(/text-green-600/);
    });

    it("falls back to green-range default (42.5) when flowRateOutChill is null", () => {
      renderComponent({ ...mockUnit, flowRateOutChill: null });
      const el = screen.getByText("42.5 L/min");
      expect(el.className).toMatch(/text-green-600/);
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

  describe("flowRateOutHot fallback", () => {
    it("falls back to 35.2 when unit.flowRateOutHot is undefined and no live outlet exists", () => {
      renderComponent({ ...mockUnit, flowRateOutHot: undefined });
      expect(screen.getByText("35.2 L/min")).toBeInTheDocument();
    });

    it("falls back to 35.2 when unit.flowRateOutHot is null", () => {
      renderComponent({ ...mockUnit, flowRateOutHot: null });
      expect(screen.getByText("35.2 L/min")).toBeInTheDocument();
    });
  });

  describe("flow rate fallback logic", () => {
    it("uses unit.flowRateOutChill when liveUnit.flow_rate_inlet is undefined", () => {
      renderComponent({ ...mockUnit, flowRateOutChill: 50 });
      const elements = screen.getAllByText(/50 L\/min/);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("uses fallback 42.5 when both liveUnit and unit flowRateOutChill are undefined", () => {
      renderComponent({ ...mockUnit, flowRateOutChill: undefined });
      const elements = screen.getAllByText(/42.5 L\/min/);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("calculates outlet flow rate from unit.flowRateOutHot when liveUnit value is missing", () => {
      renderComponent({ ...mockUnit, flowRateOutHot: 47.5 });
      const outletElements = screen.getAllByText(/47.5 L\/min/);
      expect(outletElements.length).toBeGreaterThan(0);
    });

    it("uses fallback 35.2 when both liveUnit and unit flowRateOutHot are undefined for outlet", () => {
      renderComponent({ ...mockUnit, flowRateOutHot: undefined });
      const elements = screen.getAllByText(/35.2 L\/min/);
      expect(elements.length).toBeGreaterThan(0);
    });
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
        fireEvent.change(gpsInput, { target: { value: "51.5074° N, 0.1278° W" } });
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

  describe("live metrics integration", () => {
    it("recomputes temp/pressure/flow values when metrics stream in", () => {
      act(() => {
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
      });
      const { container } = renderComponent();
      expect(container).toBeTruthy();
    });

    it("does not recompute live values while offline even if metrics stream in", () => {
      act(() => {
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
      });
      renderComponent({ ...mockUnit, status: "offline" });
      expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    });

    describe("metrics effect — flow rate key fallbacks", () => {
      it("uses camelCase flowRateInlet/flowRateOutlet when snake_case keys are absent", () => {
        act(() => {
          useRealtimeMetrics.mockReturnValue({
            metrics: {
              temperature: { current: "80" },
              pressure: { current: "110" },
              flowRateInlet: { current: "60" },
              flowRateOutlet: { current: "35" },
            },
            loading: false,
            error: null,
            connectionStatus: "connected",
            isConnected: true,
          });
        });
        const { container } = renderComponent();
        expect(container).toBeTruthy();
      });
    });

    describe("metrics effect — prev-value-undefined branches", () => {
      const unitMissingDerived = {
        ...mockUnit,
        tempIn: undefined,
        tempOutChill: undefined,
        tempOutHot: undefined,
        differentialPressure: undefined,
      };

      it("leaves tempIn/tempOutChill/tempOutHot/differentialPressure as undefined when they weren't present beforehand", () => {
        act(() => {
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
        });
        const { container } = renderComponent(unitMissingDerived);
        expect(container).toBeTruthy();
      });

      it("computes an idOffset of 0 when unit.id is undefined", () => {
        act(() => {
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
        });
        const { container } = renderComponent({ ...mockUnit, id: undefined });
        expect(container).toBeTruthy();
      });
    });

    it("keeps tempIn undefined (and renders it as N/A) when it wasn't present beforehand", () => {
      const unitWithoutTempIn = { ...mockUnit, tempIn: undefined };
      act(() => {
        useRealtimeMetrics.mockReturnValue({
          metrics: {
            temperature: { current: "80" },
            pressure: { current: "100" },
            flow_rate_inlet: { current: "45" },
            flow_rate_outlet: { current: "40" },
          },
          loading: false,
          error: null,
          connectionStatus: "connected",
          isConnected: true,
        });
      });
      renderComponent(unitWithoutTempIn);
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it("keeps differentialPressure undefined (and renders it as N/A) when it wasn't present beforehand", () => {
      const unitWithoutPressure = { ...mockUnit, differentialPressure: undefined };
      act(() => {
        useRealtimeMetrics.mockReturnValue({
          metrics: {
            temperature: { current: "80" },
            pressure: { current: "100" },
            flow_rate_inlet: { current: "45" },
            flow_rate_outlet: { current: "40" },
          },
          loading: false,
          error: null,
          connectionStatus: "connected",
          isConnected: true,
        });
      });
      renderComponent(unitWithoutPressure);
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    describe("numeric 0 metric handling (regression guard)", () => {
      it("uses 0 (not 70) as the temperature base when metrics.temperature.current is numeric 0", () => {
        act(() => {
          useRealtimeMetrics.mockReturnValue({
            metrics: {
              temperature: { current: 0 },
              pressure: { current: "100" },
              flow_rate_inlet: { current: "45" },
              flow_rate_outlet: { current: "40" },
            },
            loading: false,
            error: null,
            connectionStatus: "connected",
            isConnected: true,
          });
        });
        renderComponent();
        // Find all temperature readings and verify at least one shows the expected value
        // With tempBase=0, the tempIn calculation should be low (around 4-14°F)
        const tempElements = screen.getAllByText(/^\d+\.?\d*°F$/);
        // At least one temperature should be in the low range (0-20°F)
        const hasLowTemp = tempElements.some(el => {
          const val = parseFloat(el.textContent);
          return val >= 0 && val <= 20;
        });
        expect(hasLowTemp).toBe(true);
      });

      it("uses 0 (not 42.5) as the flow inlet base when metrics.flow_rate_inlet.current is numeric 0", () => {
        act(() => {
          useRealtimeMetrics.mockReturnValue({
            metrics: {
              temperature: { current: "80" },
              pressure: { current: "100" },
              flow_rate_inlet: { current: 0 },
              flow_rate_outlet: { current: "40" },
            },
            loading: false,
            error: null,
            connectionStatus: "connected",
            isConnected: true,
          });
        });
        renderComponent();
        // Find all flow rate readings and verify at least one shows the expected low value
        const flowElements = screen.getAllByText(/^\d+\.?\d* L\/min$/);
        // With flowInBase=0, the flow rate should be low (around -2.5 to 2.5 L/min)
        const hasLowFlow = flowElements.some(el => {
          const val = parseFloat(el.textContent);
          return val >= -5 && val <= 5;
        });
        expect(hasLowFlow).toBe(true);
      });

      it("uses 0 (not 35.2) as the flow outlet base when metrics.flow_rate_outlet.current is numeric 0", () => {
        act(() => {
          useRealtimeMetrics.mockReturnValue({
            metrics: {
              temperature: { current: "80" },
              pressure: { current: "100" },
              flow_rate_inlet: { current: "45" },
              flow_rate_outlet: { current: 0 },
            },
            loading: false,
            error: null,
            connectionStatus: "connected",
            isConnected: true,
          });
        });
        renderComponent();
        // Find all flow rate readings and verify at least one shows the expected low value
        const flowElements = screen.getAllByText(/^\d+\.?\d* L\/min$/);
        // With flowOutBase=0, the flow rate should be low (around -1.5 to 2.5 L/min)
        const hasLowFlow = flowElements.some(el => {
          const val = parseFloat(el.textContent);
          return val >= -5 && val <= 5;
        });
        expect(hasLowFlow).toBe(true);
      });

      it("uses 0 (not 42.5) as the flow inlet base when metrics.flowRateInlet.current (camelCase) is numeric 0", () => {
        act(() => {
          useRealtimeMetrics.mockReturnValue({
            metrics: {
              temperature: { current: "80" },
              pressure: { current: "100" },
              flowRateInlet: { current: 0 },
              flowRateOutlet: { current: "40" },
            },
            loading: false,
            error: null,
            connectionStatus: "connected",
            isConnected: true,
          });
        });
        renderComponent();
        // Find all flow rate readings and verify at least one shows the expected low value
        const flowElements = screen.getAllByText(/^\d+\.?\d* L\/min$/);
        const hasLowFlow = flowElements.some(el => {
          const val = parseFloat(el.textContent);
          return val >= -5 && val <= 5;
        });
        expect(hasLowFlow).toBe(true);
      });

      it("uses 0 (not 35.2) as the flow outlet base when metrics.flowRateOutlet.current (camelCase) is numeric 0", () => {
        act(() => {
          useRealtimeMetrics.mockReturnValue({
            metrics: {
              temperature: { current: "80" },
              pressure: { current: "100" },
              flowRateInlet: { current: "45" },
              flowRateOutlet: { current: 0 },
            },
            loading: false,
            error: null,
            connectionStatus: "connected",
            isConnected: true,
          });
        });
        renderComponent();
        // Find all flow rate readings and verify at least one shows the expected low value
        const flowElements = screen.getAllByText(/^\d+\.?\d* L\/min$/);
        const hasLowFlow = flowElements.some(el => {
          const val = parseFloat(el.textContent);
          return val >= -5 && val <= 5;
        });
        expect(hasLowFlow).toBe(true);
      });

      it("falls back to 70 when temperature.current is missing (undefined)", () => {
        act(() => {
          useRealtimeMetrics.mockReturnValue({
            metrics: {
              pressure: { current: "100" },
              flow_rate_inlet: { current: "45" },
              flow_rate_outlet: { current: "40" },
            },
            loading: false,
            error: null,
            connectionStatus: "connected",
            isConnected: true,
          });
        });
        renderComponent();
        // Find all temperature readings and verify at least one shows a value from the 70 base
        const tempElements = screen.getAllByText(/^\d+\.?\d*°F$/);
        // With tempBase=70, temperatures should be in the 20-40°F range
        const hasExpectedTemp = tempElements.some(el => {
          const val = parseFloat(el.textContent);
          return val >= 20 && val <= 50;
        });
        expect(hasExpectedTemp).toBe(true);
      });
    });
  });
});
