/**
 * Tests for RemoteControl Component
 *
 * Coverage includes:
 * - Component rendering for valid/invalid units
 * - Connection status display
 * - Permission checks for different roles (Admin, Operator, Viewer)
 * - Control toggles (Machine Power, Water Production, Auto Switch)
 * - Video feed controls
 * - Unit status badges
 */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RemoteControl from "@/components/RemoteControl";

// Mock the hooks and services
vi.mock("@/hooks/useUnitStatus", () => ({
  useUnitStatus: vi.fn(),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: vi.fn(),
}));

vi.mock("@/hooks/useWebSocket", () => ({
  useWebSocket: vi.fn(),
}));

vi.mock("@/services/unitService", () => ({
  unitService: {
    getUnitStatus: vi.fn(),
    toggleMachinePower: vi.fn(),
    toggleWaterProduction: vi.fn(),
    toggleAutoSwitch: vi.fn(),
    getVideoFeed: vi.fn(),
  },
}));

import { useUnitStatus } from "@/hooks/useUnitStatus";
import { usePermissions } from "@/hooks/usePermissions";
import { useWebSocket } from "@/hooks/useWebSocket";

const mockUnit = {
  id: "unit-1",
  name: "ThermaCore Unit 001",
  status: "online",
  machinePower: true,
  waterProduction: false,
  autoSwitch: false,
  temperature: 25.5,
  pressure: 100.2,
  videoFeedUrl: "http://example.com/video/unit-1",
};

const mockUnitStatus = {
  isConnected: true,
  status: "online",
  lastUpdated: new Date().toISOString(),
};

const TestWrapper = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe("RemoteControl Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    useUnitStatus.mockReturnValue({
      unit: mockUnit,
      status: mockUnitStatus,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    usePermissions.mockReturnValue({
      role: "admin",
      canControl: true,
      canView: true,
    });

    useWebSocket.mockReturnValue({
      isConnected: true,
      sendMessage: vi.fn(),
      lastMessage: null,
    });
  });

  describe("Component Rendering", () => {
    it("should render remote control page for valid unit", () => {
      render(
        <TestWrapper>
          <RemoteControl unitId="unit-1" />
        </TestWrapper>,
      );

      expect(screen.getByText("Remote Control")).toBeInTheDocument();
      expect(screen.getByText("ThermaCore Unit 001")).toBeInTheDocument();
    });

    it("should show 'Unit Not Found' when no unit is provided", () => {
      useUnitStatus.mockReturnValue({
        unit: null,
        status: null,
        loading: false,
        error: "Unit not found",
        refresh: vi.fn(),
      });

      render(
        <TestWrapper>
          <RemoteControl unitId="invalid-unit" />
        </TestWrapper>,
      );

      expect(screen.getByText("Unit Not Found")).toBeInTheDocument();
      expect(screen.getByText(/The requested unit could not be found/i)).toBeInTheDocument();
    });

    it("should display connection status as Connected", () => {
      render(
        <TestWrapper>
          <RemoteControl unitId="unit-1" />
        </TestWrapper>,
      );

      const connectedElements = screen.getAllByText(/Connected/i);
      expect(connectedElements.length).toBeGreaterThan(0);
    });

    it("should display unit status badge", () => {
      render(
        <TestWrapper>
          <RemoteControl unitId="unit-1" />
        </TestWrapper>,
      );

      // Use getAllByText since "ONLINE" appears multiple times
      const onlineElements = screen.getAllByText("ONLINE");
      expect(onlineElements.length).toBeGreaterThan(0);
    });
  });

  describe("Permission Checks - Admin Role", () => {
    beforeEach(() => {
      usePermissions.mockReturnValue({
        role: "admin",
        canControl: true,
        canView: true,
      });
    });

    it("should allow admin to toggle machine power", async () => {
      const toggleMock = vi.fn();
      useUnitStatus.mockReturnValue({
        unit: { ...mockUnit, machinePower: true },
        status: mockUnitStatus,
        loading: false,
        error: null,
        refresh: vi.fn(),
        toggleMachinePower: toggleMock,
      });

      render(
        <TestWrapper>
          <RemoteControl unitId="unit-1" />
        </TestWrapper>,
      );

      // Find all switches and get the one for Machine Power
      const switches = screen.getAllByRole("switch");
      const machinePowerSwitch = switches.find(
        (sw) => sw.getAttribute("aria-label") === "Machine Power"
      ) || switches[0];

      if (machinePowerSwitch) {
        fireEvent.click(machinePowerSwitch);
      }

      await waitFor(() => {
        expect(toggleMock).toHaveBeenCalled();
      });
    });

    it("should allow admin to toggle water production", async () => {
      const toggleMock = vi.fn();
      useUnitStatus.mockReturnValue({
        unit: { ...mockUnit, waterProduction: false },
        status: mockUnitStatus,
        loading: false,
        error: null,
        refresh: vi.fn(),
        toggleWaterProduction: toggleMock,
      });

      render(
        <TestWrapper>
          <RemoteControl unitId="unit-1" />
        </TestWrapper>,
      );

      // Find all switches and get the one for Water Production
      const switches = screen.getAllByRole("switch");
      const waterProductionSwitch = switches.find(
        (sw) => sw.getAttribute("aria-label") === "Water Production"
      ) || switches[0];

      if (waterProductionSwitch) {
        fireEvent.click(waterProductionSwitch);
      }

      await waitFor(() => {
        expect(toggleMock).toHaveBeenCalled();
      });
    });

    it("should allow admin to toggle auto switch", async () => {
      const toggleMock = vi.fn();
      useUnitStatus.mockReturnValue({
        unit: { ...mockUnit, autoSwitch: false },
        status: mockUnitStatus,
        loading: false,
        error: null,
        refresh: vi.fn(),
        toggleAutoSwitch: toggleMock,
      });

      render(
        <TestWrapper>
          <RemoteControl unitId="unit-1" />
        </TestWrapper>,
      );

      // Find all switches and get the one for Auto Switch
      const switches = screen.getAllByRole("switch");
      const autoSwitch = switches.find(
        (sw) => sw.getAttribute("aria-label") === "Auto Switch"
      ) || switches[0];

      if (autoSwitch) {
        fireEvent.click(autoSwitch);
      }

      await waitFor(() => {
        expect(toggleMock).toHaveBeenCalled();
      });
    });
  });

  describe("Permission Checks - Operator Role", () => {
    beforeEach(() => {
      usePermissions.mockReturnValue({
        role: "operator",
        canControl: true,
        canView: true,
      });
    });

    it("should allow operator to toggle machine power", async () => {
      const toggleMock = vi.fn();
      useUnitStatus.mockReturnValue({
        unit: { ...mockUnit, machinePower: true },
        status: mockUnitStatus,
        loading: false,
        error: null,
        refresh: vi.fn(),
        toggleMachinePower: toggleMock,
      });

      render(
        <TestWrapper>
          <RemoteControl unitId="unit-1" />
        </TestWrapper>,
      );

      // Find all switches and get the one for Machine Power
      const switches = screen.getAllByRole("switch");
      const machinePowerSwitch = switches.find(
        (sw) => sw.getAttribute("aria-label") === "Machine Power"
      ) || switches[0];

      if (machinePowerSwitch) {
        fireEvent.click(machinePowerSwitch);
      }

      await waitFor(() => {
        expect(toggleMock).toHaveBeenCalled();
      });
    });

    it("should allow operator to toggle water production", async () => {
      const toggleMock = vi.fn();
      useUnitStatus.mockReturnValue({
        unit: { ...mockUnit, waterProduction: false },
        status: mockUnitStatus,
        loading: false,
        error: null,
        refresh: vi.fn(),
        toggleWaterProduction: toggleMock,
      });

      render(
        <TestWrapper>
          <RemoteControl unitId="unit-1" />
        </TestWrapper>,
      );

      // Find all switches and get the one for Water Production
      const switches = screen.getAllByRole("switch");
      const waterProductionSwitch = switches.find(
        (sw) => sw.getAttribute("aria-label") === "Water Production"
      ) || switches[0];

      if (waterProductionSwitch) {
        fireEvent.click(waterProductionSwitch);
      }

      await waitFor(() => {
        expect(toggleMock).toHaveBeenCalled();
      });
    });

    it("should allow operator to toggle auto switch", async () => {
      const toggleMock = vi.fn();
      useUnitStatus.mockReturnValue({
        unit: { ...mockUnit, autoSwitch: false },
        status: mockUnitStatus,
        loading: false,
        error: null,
        refresh: vi.fn(),
        toggleAutoSwitch: toggleMock,
      });

      render(
        <TestWrapper>
          <RemoteControl unitId="unit-1" />
        </TestWrapper>,
      );

      // Find all switches and get the one for Auto Switch
      const switches = screen.getAllByRole("switch");
      const autoSwitch = switches.find(
        (sw) => sw.getAttribute("aria-label") === "Auto Switch"
      ) || switches[0];

      if (autoSwitch) {
        fireEvent.click(autoSwitch);
      }

      await waitFor(() => {
        expect(toggleMock).toHaveBeenCalled();
      });
    });
  });

  describe("Video Feed Controls", () => {
    it("should allow viewer to view video feed (read-only access)", () => {
      usePermissions.mockReturnValue({
        role: "viewer",
        canControl: false,
        canView: true,
      });

      render(
        <TestWrapper>
          <RemoteControl unitId="unit-1" />
        </TestWrapper>,
      );

      // Find all video feed toggle buttons
      const videoButtons = screen.getAllByTestId("button-video-feed-toggle");
      expect(videoButtons.length).toBeGreaterThan(0);
    });
  });
});
