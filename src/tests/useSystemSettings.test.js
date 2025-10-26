/**
 * Tests for useSystemSettings Hook
 *
 * Tests system settings state management and toggle functionality.
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSystemSettings } from "../hooks/useSystemSettings";

describe("useSystemSettings Hook", () => {
  it("should initialize with default settings", () => {
    const { result } = renderHook(() => useSystemSettings());

    expect(result.current.systemSettings).toEqual({
      emailNotifications: true,
      autoBackup: true,
      maintenanceMode: false,
    });
  });

  it("should toggle emailNotifications setting", () => {
    const { result } = renderHook(() => useSystemSettings());

    act(() => {
      result.current.handleToggleSetting("emailNotifications");
    });

    expect(result.current.systemSettings.emailNotifications).toBe(false);

    act(() => {
      result.current.handleToggleSetting("emailNotifications");
    });

    expect(result.current.systemSettings.emailNotifications).toBe(true);
  });

  it("should toggle autoBackup setting", () => {
    const { result } = renderHook(() => useSystemSettings());

    act(() => {
      result.current.handleToggleSetting("autoBackup");
    });

    expect(result.current.systemSettings.autoBackup).toBe(false);
  });

  it("should toggle maintenanceMode setting", () => {
    const { result } = renderHook(() => useSystemSettings());

    act(() => {
      result.current.handleToggleSetting("maintenanceMode");
    });

    expect(result.current.systemSettings.maintenanceMode).toBe(true);

    act(() => {
      result.current.handleToggleSetting("maintenanceMode");
    });

    expect(result.current.systemSettings.maintenanceMode).toBe(false);
  });

  it("should handle multiple setting toggles independently", () => {
    const { result } = renderHook(() => useSystemSettings());

    act(() => {
      result.current.handleToggleSetting("emailNotifications");
      result.current.handleToggleSetting("maintenanceMode");
    });

    expect(result.current.systemSettings).toEqual({
      emailNotifications: false,
      autoBackup: true,
      maintenanceMode: true,
    });
  });

  it("should preserve other settings when toggling one", () => {
    const { result } = renderHook(() => useSystemSettings());

    act(() => {
      result.current.handleToggleSetting("autoBackup");
    });

    expect(result.current.systemSettings.emailNotifications).toBe(true);
    expect(result.current.systemSettings.maintenanceMode).toBe(false);
    expect(result.current.systemSettings.autoBackup).toBe(false);
  });
});
