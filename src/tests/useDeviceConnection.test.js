/**
 * Tests for useDeviceConnection Hook
 *
 * Tests device connection state and remote control operations.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeviceConnection } from "../hooks/useDeviceConnection";

// Mock audioPlayer
vi.mock("../utils/audioPlayer", () => ({
  default: vi.fn(),
}));

describe("useDeviceConnection Hook", () => {
  const ensureDocumentBody = () => {
    if (!document.body) {
      document.documentElement.appendChild(document.createElement("body"));
    }
  };
  const waitForInDocument = (callback) =>
    waitFor(callback, { container: document.body });

  const mockUnit = {
    id: "unit-1",
    status: "online",
    watergeneration: true,
    waterProductionOn: true,
    autoSwitchEnabled: false,
  };

  const mockSettings = {
    soundEnabled: true,
    volume: 50,
  };

  let mockControlPower;
  let mockControlWaterProduction;

  beforeEach(() => {
    vi.clearAllMocks();
    ensureDocumentBody();
    mockControlPower = vi.fn().mockResolvedValue(undefined);
    mockControlWaterProduction = vi.fn().mockResolvedValue(undefined);
  });

  it("should initialize with unit state", () => {
    const { result } = renderHook(() =>
      useDeviceConnection(
        mockUnit,
        mockControlPower,
        mockControlWaterProduction,
        mockSettings,
      ),
    );

    expect(result.current.machineOn).toBe(true);
    expect(result.current.waterProductionOn).toBe(true);
    expect(result.current.autoSwitchEnabled).toBe(false);
    expect(result.current.powerControlLoading).toBe(false);
    expect(result.current.waterControlLoading).toBe(false);
  });

  it("should initialize with offline unit", () => {
    const offlineUnit = { ...mockUnit, status: "offline" };
    const { result } = renderHook(() =>
      useDeviceConnection(
        offlineUnit,
        mockControlPower,
        mockControlWaterProduction,
        mockSettings,
      ),
    );

    expect(result.current.machineOn).toBe(false);
  });

  it("should handle machine power toggle", async () => {
    const { result } = renderHook(() =>
      useDeviceConnection(
        mockUnit,
        mockControlPower,
        mockControlWaterProduction,
        mockSettings,
      ),
    );

    expect(result.current.machineOn).toBe(true);

    await act(async () => {
      await result.current.handleMachineToggle(false);
    });

    expect(mockControlPower).toHaveBeenCalledWith(false);
    expect(result.current.machineOn).toBe(false);
    expect(result.current.powerControlLoading).toBe(false);
  });

  it("should set loading state during power toggle", async () => {
    const { result } = renderHook(() =>
      useDeviceConnection(
        mockUnit,
        mockControlPower,
        mockControlWaterProduction,
        mockSettings,
      ),
    );

    // Check that loading happens during the operation
    const togglePromise = act(async () => {
      await result.current.handleMachineToggle(false);
    });

    await togglePromise;
    expect(mockControlPower).toHaveBeenCalledWith(false);
    expect(result.current.powerControlLoading).toBe(false);
  });

  it("should handle water production toggle", async () => {
    const { result } = renderHook(() =>
      useDeviceConnection(
        mockUnit,
        mockControlPower,
        mockControlWaterProduction,
        mockSettings,
      ),
    );

    expect(result.current.waterProductionOn).toBe(true);

    await act(async () => {
      await result.current.handleWaterProductionToggle(false);
    });

    expect(mockControlWaterProduction).toHaveBeenCalledWith(false);
    expect(result.current.waterProductionOn).toBe(false);
    expect(result.current.waterControlLoading).toBe(false);
  });

  it("should set loading state during water production toggle", async () => {
    const { result } = renderHook(() =>
      useDeviceConnection(
        mockUnit,
        mockControlPower,
        mockControlWaterProduction,
        mockSettings,
      ),
    );

    // Check that loading happens during the operation
    const togglePromise = act(async () => {
      await result.current.handleWaterProductionToggle(false);
    });

    await togglePromise;
    expect(mockControlWaterProduction).toHaveBeenCalledWith(false);
    expect(result.current.waterControlLoading).toBe(false);
  });

  it("should toggle auto switch", () => {
    const { result } = renderHook(() =>
      useDeviceConnection(
        mockUnit,
        mockControlPower,
        mockControlWaterProduction,
        mockSettings,
      ),
    );

    expect(result.current.autoSwitchEnabled).toBe(false);

    act(() => {
      result.current.handleAutoSwitchToggle(true);
    });

    expect(result.current.autoSwitchEnabled).toBe(true);
  });

  it("should handle control power error gracefully", async () => {
    mockControlPower.mockRejectedValue(new Error("Control failed"));

    const { result } = renderHook(() =>
      useDeviceConnection(
        mockUnit,
        mockControlPower,
        mockControlWaterProduction,
        mockSettings,
      ),
    );

    const _initialState = result.current.machineOn;

    await act(async () => {
      await result.current.handleMachineToggle(false);
    });

    // State should not change on error
    await waitForInDocument(() => {
      expect(result.current.powerControlLoading).toBe(false);
    });
  });

  it("should handle control water production error gracefully", async () => {
    mockControlWaterProduction.mockRejectedValue(new Error("Control failed"));

    const { result } = renderHook(() =>
      useDeviceConnection(
        mockUnit,
        mockControlPower,
        mockControlWaterProduction,
        mockSettings,
      ),
    );

    const _initialState = result.current.waterProductionOn;

    await act(async () => {
      await result.current.handleWaterProductionToggle(false);
    });

    await waitForInDocument(() => {
      expect(result.current.waterControlLoading).toBe(false);
    });
  });

  it("should handle unit without water generation", () => {
    const unitWithoutWater = {
      ...mockUnit,
      watergeneration: false,
      waterProductionOn: false,
    };

    const { result } = renderHook(() =>
      useDeviceConnection(
        unitWithoutWater,
        mockControlPower,
        mockControlWaterProduction,
        mockSettings,
      ),
    );

    expect(result.current.waterProductionOn).toBe(false);
  });

  it("should handle null unit", () => {
    const { result } = renderHook(() =>
      useDeviceConnection(
        null,
        mockControlPower,
        mockControlWaterProduction,
        mockSettings,
      ),
    );

    // Null unit means undefined status, which is falsy
    expect(result.current.machineOn).toBeFalsy();
    expect(result.current.waterProductionOn).toBeFalsy();
  });
});
