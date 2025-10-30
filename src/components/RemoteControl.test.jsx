import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RemoteControl from "./RemoteControl";

// Mock the dependencies
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../context/SettingsContext", () => ({
  useSettings: vi.fn(() => ({
    settings: {
      soundEnabled: false,
      volume: 0.5,
    },
  })),
}));

vi.mock("../utils/audioPlayer", () => ({
  default: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    useLocation: vi.fn(() => ({
      state: null,
    })),
  };
});

import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

describe("RemoteControl Component", () => {
  const mockUnit = {
    id: "unit-123",
    name: "Test Unit",
    location: "Test Location",
    status: "online",
    watergeneration: true,
    waterProductionOn: false,
    autoSwitchEnabled: false,
    water_level: 85,
  };

  const renderComponent = (unit = mockUnit, backendRole = "admin") => {
    useAuth.mockReturnValue({
      backendRole,
      user: { username: "testuser" },
    });

    useLocation.mockReturnValue({
      state: { unit },
    });

    return render(
      <BrowserRouter>
        <RemoteControl unit={unit} />
      </BrowserRouter>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render remote control page for valid unit", () => {
      renderComponent();

      expect(
        screen.getByText("Remote Control - Test Unit"),
      ).toBeInTheDocument();
      expect(screen.getByText(/Unit ID: unit-123/)).toBeInTheDocument();
      expect(screen.getByText("Machine Control")).toBeInTheDocument();
      expect(screen.getByText("Water Production Control")).toBeInTheDocument();
    });

    it("should show 'Unit Not Found' when no unit is provided", () => {
      useAuth.mockReturnValue({
        backendRole: "admin",
      });

      useLocation.mockReturnValue({
        state: null,
      });

      render(
        <BrowserRouter>
          <RemoteControl unit={null} />
        </BrowserRouter>,
      );

      expect(screen.getByText("Unit Not Found")).toBeInTheDocument();
    });

    it("should display connection status as Connected", () => {
      renderComponent();

      const connectedElements = screen.getAllByText("Connected");
      expect(connectedElements.length).toBeGreaterThan(0);
    });

    it("should display unit status badge", () => {
      renderComponent();

      expect(screen.getByText("ONLINE")).toBeInTheDocument();
    });
  });

  describe("Permission Checks - Admin Role", () => {
    it("should allow admin to toggle machine power", async () => {
      renderComponent(mockUnit, "admin");

      const switches = screen.getAllByRole("switch");
      const machinePowerSwitch = switches[0];

      expect(machinePowerSwitch).not.toBeDisabled();
    });

    it("should allow admin to toggle water production", async () => {
      renderComponent(mockUnit, "admin");

      const switches = screen.getAllByRole("switch");
      const waterProductionSwitch = switches[1];

      expect(waterProductionSwitch).not.toBeDisabled();
    });

    it("should allow admin to toggle auto switch", async () => {
      renderComponent(mockUnit, "admin");

      const switches = screen.getAllByRole("switch");
      const autoSwitchControl = switches[2];

      expect(autoSwitchControl).not.toBeDisabled();
    });
  });

  describe("Permission Checks - Operator Role", () => {
    it("should allow operator to toggle machine power", async () => {
      renderComponent(mockUnit, "operator");

      const switches = screen.getAllByRole("switch");
      const machinePowerSwitch = switches[0];

      expect(machinePowerSwitch).not.toBeDisabled();
    });

    it("should allow operator to toggle water production", async () => {
      renderComponent(mockUnit, "operator");

      const switches = screen.getAllByRole("switch");
      const waterProductionSwitch = switches[1];

      expect(waterProductionSwitch).not.toBeDisabled();
    });

    it("should allow operator to toggle auto switch", async () => {
      renderComponent(mockUnit, "operator");

      const switches = screen.getAllByRole("switch");
      const autoSwitchControl = switches[2];

      expect(autoSwitchControl).not.toBeDisabled();
    });
  });

  describe("Permission Checks - Viewer Role (Security Test)", () => {
    it("should NOT allow viewer to toggle machine power", async () => {
      renderComponent(mockUnit, "viewer");

      const switches = screen.getAllByRole("switch");
      const machinePowerSwitch = switches[0];

      expect(machinePowerSwitch).toBeDisabled();
    });

    it("should NOT allow viewer to toggle water production", async () => {
      renderComponent(mockUnit, "viewer");

      const switches = screen.getAllByRole("switch");
      const waterProductionSwitch = switches[1];

      expect(waterProductionSwitch).toBeDisabled();
    });

    it("should NOT allow viewer to toggle auto switch", async () => {
      renderComponent(mockUnit, "viewer");

      const switches = screen.getAllByRole("switch");
      const autoSwitchControl = switches[2];

      expect(autoSwitchControl).toBeDisabled();
    });

    it("should disable all control switches for viewer role", async () => {
      renderComponent(mockUnit, "viewer");

      const switches = screen.getAllByRole("switch");

      // All control switches should be disabled for viewer
      expect(switches[0]).toBeDisabled(); // Machine power
      expect(switches[1]).toBeDisabled(); // Water production
      expect(switches[2]).toBeDisabled(); // Auto switch
    });
  });

  describe("Machine Power Control", () => {
    it("should show confirmation dialog when admin clicks machine power switch", async () => {
      const user = userEvent.setup();
      renderComponent(mockUnit, "admin");

      const switches = screen.getAllByRole("switch");
      const machinePowerSwitch = switches[0];

      await user.click(machinePowerSwitch);

      await waitFor(() => {
        expect(
          screen.getByText("Are you absolutely sure?"),
        ).toBeInTheDocument();
      });
    });

    it("should not show confirmation dialog for viewer when clicking disabled switch", async () => {
      const user = userEvent.setup();
      renderComponent(mockUnit, "viewer");

      const switches = screen.getAllByRole("switch");
      const machinePowerSwitch = switches[0];

      // Try to click the disabled switch
      await user.click(machinePowerSwitch);

      // Dialog should not appear
      expect(
        screen.queryByText("Are you absolutely sure?"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Water Production Control", () => {
    it("should show confirmation dialog when operator clicks water production switch", async () => {
      const user = userEvent.setup();
      renderComponent(mockUnit, "operator");

      const switches = screen.getAllByRole("switch");
      const waterProductionSwitch = switches[1];

      await user.click(waterProductionSwitch);

      await waitFor(() => {
        expect(
          screen.getByText("Are you absolutely sure?"),
        ).toBeInTheDocument();
      });
    });

    it("should not allow viewer to interact with water production switch", async () => {
      renderComponent(mockUnit, "viewer");

      const switches = screen.getAllByRole("switch");
      const waterProductionSwitch = switches[1];

      expect(waterProductionSwitch).toBeDisabled();
    });
  });

  describe("Auto Switch Control", () => {
    it("should show confirmation dialog when admin clicks auto switch", async () => {
      const user = userEvent.setup();
      renderComponent(mockUnit, "admin");

      const switches = screen.getAllByRole("switch");
      const autoSwitchControl = switches[2];

      await user.click(autoSwitchControl);

      await waitFor(() => {
        expect(
          screen.getByText("Are you absolutely sure?"),
        ).toBeInTheDocument();
      });
    });

    it("should not allow viewer to interact with auto switch", async () => {
      renderComponent(mockUnit, "viewer");

      const switches = screen.getAllByRole("switch");
      const autoSwitchControl = switches[2];

      expect(autoSwitchControl).toBeDisabled();
    });
  });

  describe("Video Feed Controls", () => {
    it("should render camera selection dropdown", () => {
      renderComponent();

      const cameraSelect = screen.getByTestId("select-camera");
      expect(cameraSelect).toBeInTheDocument();
    });

    it("should render video feed toggle button", () => {
      renderComponent();

      const videoToggle = screen.getByTestId("button-video-feed-toggle");
      expect(videoToggle).toBeInTheDocument();
      expect(videoToggle).toHaveTextContent("Start Feed");
    });

    it("should allow viewer to view video feed (read-only access)", () => {
      renderComponent(mockUnit, "viewer");

      const videoToggle = screen.getByTestId("button-video-feed-toggle");
      expect(videoToggle).toBeInTheDocument();
      expect(videoToggle).not.toBeDisabled();
    });
  });

  describe("Units Without Water Generation", () => {
    it("should not show water production controls for units without water generation", () => {
      const unitWithoutWater = {
        ...mockUnit,
        watergeneration: false,
      };

      renderComponent(unitWithoutWater, "admin");

      expect(
        screen.queryByText("Water Production Control"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Automatic Control Settings"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Status Display", () => {
    it("should display current water level", () => {
      renderComponent();

      const waterLevelElements = screen.getAllByText(/85/);
      expect(waterLevelElements.length).toBeGreaterThan(0);
    });

    it("should show machine status as Running when on", () => {
      const runningUnit = {
        ...mockUnit,
        status: "online",
      };

      renderComponent(runningUnit, "admin");

      expect(screen.getByText(/Status: Running/)).toBeInTheDocument();
    });

    it("should show machine status as Stopped when off", () => {
      const stoppedUnit = {
        ...mockUnit,
        status: "offline",
      };

      renderComponent(stoppedUnit, "admin");

      expect(screen.getByText(/Status: Stopped/)).toBeInTheDocument();
    });
  });

  describe("Integration - Permission System", () => {
    it("should correctly identify admin has control permission", () => {
      renderComponent(mockUnit, "admin");

      const switches = screen.getAllByRole("switch");

      // Count enabled switches (admin should have all enabled)
      const enabledSwitches = switches.filter((sw) => !sw.disabled);
      expect(enabledSwitches.length).toBeGreaterThan(0);
    });

    it("should correctly identify operator has control permission", () => {
      renderComponent(mockUnit, "operator");

      const switches = screen.getAllByRole("switch");

      // Count enabled switches (operator should have all enabled)
      const enabledSwitches = switches.filter((sw) => !sw.disabled);
      expect(enabledSwitches.length).toBeGreaterThan(0);
    });

    it("should correctly identify viewer lacks control permission", () => {
      renderComponent(mockUnit, "viewer");

      const switches = screen.getAllByRole("switch");

      // All control switches should be disabled for viewer (first 3 switches)
      expect(switches[0]).toBeDisabled(); // Machine power
      expect(switches[1]).toBeDisabled(); // Water production
      expect(switches[2]).toBeDisabled(); // Auto switch
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined backendRole gracefully", () => {
      useAuth.mockReturnValue({
        backendRole: undefined,
      });

      useLocation.mockReturnValue({
        state: { unit: mockUnit },
      });

      render(
        <BrowserRouter>
          <RemoteControl unit={mockUnit} />
        </BrowserRouter>,
      );

      // Should render but with disabled controls
      expect(
        screen.getByText("Remote Control - Test Unit"),
      ).toBeInTheDocument();
    });

    it("should handle null backendRole gracefully", () => {
      useAuth.mockReturnValue({
        backendRole: null,
      });

      useLocation.mockReturnValue({
        state: { unit: mockUnit },
      });

      render(
        <BrowserRouter>
          <RemoteControl unit={mockUnit} />
        </BrowserRouter>,
      );

      // Should render but with disabled controls
      expect(
        screen.getByText("Remote Control - Test Unit"),
      ).toBeInTheDocument();
    });
  });
});
