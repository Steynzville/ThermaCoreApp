import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MultiProtocolManager from "../components/MultiProtocolManager";
import * as apiFetch from "../utils/apiFetch";

// Mock the API fetch utilities
vi.mock("../utils/apiFetch", () => ({
  apiGetJson: vi.fn(),
  apiPostJson: vi.fn(),
}));

// Mock the child components
vi.mock("../components/protocol/ModbusDeviceModal", () => ({
  default: ({ isOpen, device }) => (
    <div data-testid="modbus-modal">
      {isOpen ? `Modbus Modal - ${device?.device_id || "None"}` : null}
    </div>
  ),
}));

vi.mock("../components/protocol/OPCUANodeBrowser", () => ({
  default: ({ isOpen }) => (
    <div data-testid="opcua-browser">{isOpen ? "OPC-UA Browser" : null}</div>
  ),
}));

vi.mock("../components/protocol/DNP3MonitoringDashboard", () => ({
  default: ({ isOpen }) => (
    <div data-testid="dnp3-dashboard">{isOpen ? "DNP3 Dashboard" : null}</div>
  ),
}));

vi.mock("../components/protocol/MQTTManagementPanel", () => ({
  default: ({ isOpen }) => (
    <div data-testid="mqtt-panel">{isOpen ? "MQTT Panel" : null}</div>
  ),
}));

describe("MultiProtocolManager - Enhanced Protocol Support", () => {
  const mockProtocolsStatus = {
    timestamp: new Date().toISOString(),
    summary: {
      total_protocols: 4,
      active_protocols: 3,
      supported_protocols: ["modbus", "opcua", "dnp3", "mqtt"],
    },
    protocols: {
      modbus: {
        name: "modbus",
        available: true,
        connected: true,
        status: "ready",
        last_heartbeat: new Date().toISOString(),
        metrics: { active_devices: 2, total_registers: 48 },
      },
      opcua: {
        name: "opcua",
        available: true,
        connected: true,
        status: "ready",
        last_heartbeat: new Date().toISOString(),
        metrics: { connected_nodes: 15 },
      },
      dnp3: {
        name: "dnp3",
        available: true,
        connected: true,
        status: "ready",
        last_heartbeat: new Date().toISOString(),
        metrics: { active_outstations: 1, data_points: 24 },
      },
      mqtt: {
        name: "mqtt",
        available: true,
        connected: true,
        status: "ready",
        last_heartbeat: new Date().toISOString(),
        version: "3.1.1",
        metrics: { messages_sent: 1247, messages_received: 2156 },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.apiGetJson.mockResolvedValue(mockProtocolsStatus);
  });

  it("should render the multi-protocol manager with all protocols", async () => {
    render(<MultiProtocolManager />);

    await waitFor(() => {
      expect(screen.getByText("Multi-Protocol Manager")).toBeInTheDocument();
    });

    expect(screen.getByText("MODBUS")).toBeInTheDocument();
    expect(screen.getByText("OPCUA")).toBeInTheDocument();
    expect(screen.getByText("DNP3")).toBeInTheDocument();
    expect(screen.getByText("MQTT")).toBeInTheDocument();
  });

  it("should display protocol metrics correctly", async () => {
    render(<MultiProtocolManager />);

    await waitFor(() => {
      expect(screen.getByText("4")).toBeInTheDocument(); // Total protocols
      expect(screen.getByText("3")).toBeInTheDocument(); // Active protocols
    });
  });

  it("should open Modbus modal when configure button is clicked", async () => {
    render(<MultiProtocolManager />);

    await waitFor(() => {
      expect(screen.getByText("MODBUS")).toBeInTheDocument();
    });

    // Find configure buttons - order is deterministic from mock (modbus, opcua, dnp3, mqtt)
    const configureButtons = screen.getAllByText("Configure");
    expect(configureButtons.length).toBeGreaterThanOrEqual(4);
    fireEvent.click(configureButtons[0]); // Modbus button

    await waitFor(() => {
      expect(screen.getByTestId("modbus-modal")).toBeInTheDocument();
    });
  });

  it("should open OPC-UA browser when configure button is clicked", async () => {
    render(<MultiProtocolManager />);

    await waitFor(() => {
      expect(screen.getByText("OPCUA")).toBeInTheDocument();
    });

    // Find configure buttons - order is deterministic from mock (modbus, opcua, dnp3, mqtt)
    const configureButtons = screen.getAllByText("Configure");
    expect(configureButtons.length).toBeGreaterThanOrEqual(4);
    fireEvent.click(configureButtons[1]); // OPC-UA button

    await waitFor(() => {
      expect(screen.getByTestId("opcua-browser")).toBeInTheDocument();
    });
  });

  it("should open DNP3 dashboard when configure button is clicked", async () => {
    render(<MultiProtocolManager />);

    await waitFor(() => {
      expect(screen.getByText("DNP3")).toBeInTheDocument();
    });

    // Find configure buttons - order is deterministic from mock (modbus, opcua, dnp3, mqtt)
    const configureButtons = screen.getAllByText("Configure");
    expect(configureButtons.length).toBeGreaterThanOrEqual(4);
    fireEvent.click(configureButtons[2]); // DNP3 button

    await waitFor(() => {
      expect(screen.getByTestId("dnp3-dashboard")).toBeInTheDocument();
    });
  });

  it("should open MQTT panel when configure button is clicked", async () => {
    render(<MultiProtocolManager />);

    await waitFor(() => {
      expect(screen.getByText("MQTT")).toBeInTheDocument();
    });

    // Find configure buttons - order is deterministic from mock (modbus, opcua, dnp3, mqtt)
    const configureButtons = screen.getAllByText("Configure");
    expect(configureButtons.length).toBeGreaterThanOrEqual(4);
    fireEvent.click(configureButtons[3]); // MQTT button

    await waitFor(() => {
      expect(screen.getByTestId("mqtt-panel")).toBeInTheDocument();
    });
  });

  it("should show connection status badges for each protocol", async () => {
    render(<MultiProtocolManager />);

    await waitFor(() => {
      const activeBadges = screen.getAllByText("Active");
      expect(activeBadges.length).toBeGreaterThan(0);
    });
  });

  it("should handle refresh button click", async () => {
    render(<MultiProtocolManager />);

    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    const callCountBefore = apiFetch.apiGetJson.mock.calls.length;

    const refreshButton = screen.getByText("Refresh");
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(apiFetch.apiGetJson.mock.calls.length).toBeGreaterThan(
        callCountBefore,
      );
    });
  });

  it("should handle API errors gracefully", async () => {
    apiFetch.apiGetJson.mockRejectedValueOnce(new Error("Network error"));

    render(<MultiProtocolManager />);

    await waitFor(() => {
      expect(screen.getByText("Failed to Load")).toBeInTheDocument();
    });
  });

  it("should display protocol-specific metrics", async () => {
    render(<MultiProtocolManager />);

    await waitFor(() => {
      // Check that protocol cards are rendered with their metrics
      expect(screen.getByText("MODBUS")).toBeInTheDocument();
    });

    // Verify at least one metrics section exists
    const metricsLabels = screen.queryAllByText("Metrics:");
    expect(metricsLabels.length).toBeGreaterThan(0);
  });

  it("should show error state when protocol has errors", async () => {
    const errorStatus = {
      ...mockProtocolsStatus,
      protocols: {
        ...mockProtocolsStatus.protocols,
        modbus: {
          ...mockProtocolsStatus.protocols.modbus,
          connected: false,
          status: "error",
          error: {
            code: "CONNECTION_FAILED",
            message: "Unable to connect",
          },
        },
      },
    };

    apiFetch.apiGetJson.mockResolvedValueOnce(errorStatus);

    render(<MultiProtocolManager />);

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(screen.getByText("CONNECTION_FAILED")).toBeInTheDocument();
    });
  });

  it("should calculate connection rate correctly", async () => {
    render(<MultiProtocolManager />);

    await waitFor(() => {
      // 3 out of 4 protocols active = 75%
      expect(screen.getByText("75%")).toBeInTheDocument();
    });
  });

  it("should display last updated timestamp", async () => {
    render(<MultiProtocolManager />);

    await waitFor(() => {
      const lastUpdatedElements = screen.getAllByText(/Last Updated/i);
      expect(lastUpdatedElements.length).toBeGreaterThan(0);
    });
  });
});
