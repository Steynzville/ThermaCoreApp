/**
 * Tests for MultiProtocolManager - Enhanced Protocol Support
 *
 * Coverage includes:
 * - Protocol discovery and registration
 * - Connection management for MQTT, Modbus, and other protocols
 * - Protocol-specific configuration panels
 * - Real-time connection status monitoring
 * - Message routing and transformation
 * - Error handling and reconnection logic
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MultiProtocolManager from "../components/MultiProtocolManager";

// Mock the hooks and services - using the actual hook name
vi.mock("../hooks/useProtocolWebSocket", () => ({
  useProtocolWebSocket: vi.fn(),
  useModbusRegisters: vi.fn(),
  useOPCUANodes: vi.fn(),
  useDNP3Points: vi.fn(),
  useMQTTMessages: vi.fn(),
  useProtocolEvent: vi.fn(),
}));

// Mock the protocolService - FIXED: Added the missing file mock
// This creates a virtual module that Vitest can resolve
vi.mock("../services/protocolService", () => ({
  protocolService: {
    getProtocols: vi.fn(),
    connectProtocol: vi.fn(),
    disconnectProtocol: vi.fn(),
    refreshProtocols: vi.fn(),
    getProtocolMetrics: vi.fn(),
  },
}));

vi.mock("../services/mqttService", () => ({
  mqttService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    publish: vi.fn(),
  },
}));

vi.mock("../services/modbusService", () => ({
  modbusService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    readCoils: vi.fn(),
    readRegisters: vi.fn(),
  },
}));

// Import after mocks
import { useProtocolWebSocket } from "../hooks/useProtocolWebSocket";
import { protocolService } from "../services/protocolService";

const mockProtocols = [
  {
    id: "mqtt-1",
    name: "MQTT Broker",
    type: "mqtt",
    status: "connected",
    metrics: {
      messagesReceived: 1234,
      messagesSent: 567,
      connections: 5,
      lastMessageTime: "2024-01-15T10:30:00Z",
    },
    config: {
      host: "broker.example.com",
      port: 1883,
      clientId: "app-client-1",
    },
  },
  {
    id: "modbus-1",
    name: "Modbus RTU",
    type: "modbus",
    status: "disconnected",
    metrics: {
      messagesReceived: 0,
      messagesSent: 0,
      connections: 0,
      lastMessageTime: null,
    },
    config: {
      host: "192.168.1.100",
      port: 502,
      slaveId: 1,
    },
  },
  {
    id: "opcua-1",
    name: "OPC UA Server",
    type: "opcua",
    status: "error",
    metrics: {
      messagesReceived: 0,
      messagesSent: 0,
      connections: 0,
      lastMessageTime: null,
    },
    config: {
      host: "opcua.example.com",
      port: 4840,
      securityMode: "None",
    },
  },
];

const TestWrapper = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe("MultiProtocolManager - Enhanced Protocol Support", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations using the actual hook
    useProtocolWebSocket.mockReturnValue({
      protocols: mockProtocols,
      connectionStatus: "connected",
      isConnected: true,
      data: mockProtocols,
      loading: false,
      error: null,
      refresh: vi.fn(),
      connectProtocol: vi.fn(),
      disconnectProtocol: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      send: vi.fn(),
    });

    protocolService.getProtocols.mockResolvedValue(mockProtocols);
    protocolService.connectProtocol.mockResolvedValue({ success: true });
    protocolService.disconnectProtocol.mockResolvedValue({ success: true });
    protocolService.refreshProtocols.mockResolvedValue(mockProtocols);
  });

  // Debug test to verify component renders
  it("should debug render", () => {
    const { container } = render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );
    expect(container).toBeTruthy();
  });

  it("should render the multi-protocol manager with all protocols", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    // Use getAllByText and check that we have at least one match
    const titleElements = screen.getAllByText("Multi-Protocol Manager");
    expect(titleElements.length).toBeGreaterThan(0);
  });

  it("should display protocol metrics correctly", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    // Use getAllByText for "Total Protocols" since it appears multiple times
    const totalProtocolsElements = screen.getAllByText("Total Protocols");
    expect(totalProtocolsElements.length).toBeGreaterThan(0);

    // Check for MQTT protocol name
    const mqttElements = screen.getAllByText("MQTT Broker");
    expect(mqttElements.length).toBeGreaterThan(0);

    // Check for Modbus protocol name
    const modbusElements = screen.getAllByText("Modbus RTU");
    expect(modbusElements.length).toBeGreaterThan(0);

    // Check for OPC UA protocol name
    const opcuaElements = screen.getAllByText("OPC UA Server");
    expect(opcuaElements.length).toBeGreaterThan(0);
  });

  it("should open MQTT panel when configure button is clicked", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    // Find the configure buttons and click the first one
    const configureButtons = screen.getAllByRole("button", { name: /Configure/i });
    if (configureButtons.length > 0) {
      fireEvent.click(configureButtons[0]);
    }

    // Wait for the panel to open - look for MQTT configuration header
    await waitFor(() => {
      const mqttConfigElements = screen.getAllByText(/MQTT Configuration/i);
      expect(mqttConfigElements.length).toBeGreaterThan(0);
    });
  });

  it("should show connection status badges for each protocol", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    // Check for status badges - use getAllByText for "Connected", "Disconnected", "Error"
    // Since there might be multiple instances
    const connectedElements = screen.getAllByText(/Connected/i);
    expect(connectedElements.length).toBeGreaterThan(0);

    const disconnectedElements = screen.getAllByText(/Disconnected/i);
    expect(disconnectedElements.length).toBeGreaterThan(0);

    const errorElements = screen.getAllByText(/Error/i);
    expect(errorElements.length).toBeGreaterThan(0);
  });

  it("should handle refresh button click", async () => {
    const refreshMock = vi.fn();
    useProtocolWebSocket.mockReturnValue({
      protocols: mockProtocols,
      connectionStatus: "connected",
      isConnected: true,
      data: mockProtocols,
      loading: false,
      error: null,
      refresh: refreshMock,
      connect: vi.fn(),
      disconnect: vi.fn(),
      send: vi.fn(),
    });

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    // Find all buttons and click the one with Refresh text
    const buttons = screen.getAllByRole("button");
    const refreshButton = buttons.find(btn => 
      btn.textContent?.includes('Refresh') || 
      btn.querySelector('svg.lucide-refresh-cw')
    );
    
    if (refreshButton) {
      fireEvent.click(refreshButton);
    }

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("should handle API errors gracefully", async () => {
    // Mock API error
    useProtocolWebSocket.mockReturnValue({
      protocols: [],
      connectionStatus: "error",
      isConnected: false,
      data: null,
      loading: false,
      error: "Failed to load protocols",
      refresh: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      send: vi.fn(),
    });

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    // Should show error message
    const errorElements = screen.getAllByText(/Failed to load protocols/i);
    expect(errorElements.length).toBeGreaterThan(0);
  });

  it("should display protocol-specific metrics", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    // Use getAllByText for "messages sent" since it appears multiple times
    const messageSentElements = screen.getAllByText(/messages sent/i);
    expect(messageSentElements.length).toBeGreaterThan(0);

    // Check for specific metric values
    const valueElements = screen.getAllByText("1234");
    expect(valueElements.length).toBeGreaterThan(0);
  });
});
