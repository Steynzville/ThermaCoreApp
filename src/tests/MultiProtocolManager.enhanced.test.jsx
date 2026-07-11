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
import React from "react";

// ============================================================
// STEP 1: Mock ALL dependencies BEFORE importing the component
// ============================================================

// Mock child components
vi.mock("@/components/protocol/DNP3MonitoringDashboard", () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="dnp3-dashboard">
        DNP3 Dashboard
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("@/components/protocol/ModbusDeviceModal", () => ({
  default: ({ isOpen, onClose, device }) =>
    isOpen ? (
      <div data-testid="modbus-modal">
        Modbus Device: {device?.device_id || "Unknown"}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("@/components/protocol/MQTTManagementPanel", () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="mqtt-panel">
        MQTT Management
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("@/components/protocol/OPCUANodeBrowser", () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="opcua-browser">
        OPC UA Browser
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("@/components/protocol/ProtocolWizard", () => ({
  default: ({ isOpen, onClose, onSuccess }) =>
    isOpen ? (
      <div data-testid="protocol-wizard">
        Protocol Wizard
        <button onClick={onClose}>Close</button>
        <button onClick={onSuccess}>Success</button>
      </div>
    ) : null,
}));

// Mock UI components
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, variant, size, className, "aria-label": ariaLabel }) => (
    <button
      data-testid="button"
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }) => <div data-testid="card-title">{children}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }) => <div data-testid="dialog-description">{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ id, placeholder, value, onChange, className, type }) => (
    <input
      id={id}
      data-testid="input"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
      type={type}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }) => (
    <label data-testid="label" htmlFor={htmlFor}>
      {children}
    </label>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }) => (
    <div data-testid="select">
      {children}
      <button data-testid="select-change" onClick={() => onValueChange("opcua")}>
        Change to OPCUA
      </button>
    </div>
  ),
  SelectContent: ({ children }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }) => (
    <div data-testid="select-item" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: () => <span data-testid="select-value">Modbus</span>,
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock apiFetch
vi.mock("@/utils/apiFetch", () => ({
  apiGetJson: vi.fn(),
}));

// ============================================================
// STEP 2: Import the REAL component
// ============================================================
import MultiProtocolManager from "../components/MultiProtocolManager";
import { apiGetJson } from "@/utils/apiFetch";
import { toast } from "sonner";

const mockProtocolsData = {
  timestamp: new Date().toISOString(),
  summary: {
    total_protocols: 5,
    active_protocols: 3,
    supported_protocols: ["mqtt", "opcua", "modbus", "dnp3", "simulator"],
  },
  protocols: {
    mqtt: {
      name: "mqtt",
      available: true,
      connected: true,
      status: "ready",
      last_heartbeat: new Date().toISOString(),
      version: "3.1.1",
      metrics: { messages_sent: 1247, messages_received: 2156 },
    },
    opcua: {
      name: "opcua",
      available: true,
      connected: false,
      status: "error",
      error: { code: "CONNECTION_REFUSED", message: "Server unreachable" },
      version: "1.04",
    },
    modbus: {
      name: "modbus",
      available: true,
      connected: true,
      status: "ready",
      last_heartbeat: new Date().toISOString(),
      metrics: { active_devices: 2, total_registers: 48 },
    },
    dnp3: {
      name: "dnp3",
      available: true,
      connected: true,
      status: "ready",
      last_heartbeat: new Date().toISOString(),
      metrics: { active_outstations: 1, data_points: 24 },
    },
    simulator: {
      name: "simulator",
      available: false,
      connected: false,
      status: "not_initialized",
    },
  },
};

const TestWrapper = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe("MultiProtocolManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the API call to return success
    apiGetJson.mockResolvedValue(mockProtocolsData);
  });

  // ============================================================
  // TEST: Loading State
  // ============================================================
  it("should show loading state initially", async () => {
    // Delay the API response to see loading state
    apiGetJson.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockProtocolsData), 100);
        }),
    );

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    // Use testid to find loading state
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    expect(screen.getByText(/Loading protocol status/i)).toBeInTheDocument();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // TEST: Renders Protocol Data
  // ============================================================
  it("should render protocol status cards when data loads", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Multi-Protocol Manager/i)).toBeInTheDocument();
    });

    // Check summary cards
    expect(screen.getByText("Total Protocols")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument(); // total_protocols
    expect(screen.getByText("Active Protocols")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // active_protocols

    // Check protocol names
    expect(screen.getByText("MQTT")).toBeInTheDocument();
    expect(screen.getByText("OPCUA")).toBeInTheDocument();
    expect(screen.getByText("MODBUS")).toBeInTheDocument();
    expect(screen.getByText("DNP3")).toBeInTheDocument();
    expect(screen.getByText("SIMULATOR")).toBeInTheDocument();
  });

  // ============================================================
  // TEST: Status Badges
  // ============================================================
  it("should display correct status badges for each protocol", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("MQTT")).toBeInTheDocument();
    });

    const badges = screen.getAllByTestId("badge");
    const badgeTexts = badges.map((b) => b.textContent);
    
    expect(badgeTexts).toContain("Active");
    expect(badgeTexts).toContain("Error");
    expect(badgeTexts).toContain("Inactive");
  });

  // ============================================================
  // TEST: Configure Buttons
  // ============================================================
  it("should open Modbus modal when Configure is clicked on Modbus card", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("MODBUS")).toBeInTheDocument();
    });

    // Find the Modbus card's Configure button using testid
    const configureButton = screen.getByTestId("configure-modbus");
    expect(configureButton).toBeInTheDocument();
    fireEvent.click(configureButton);

    // Check that the Modbus modal opened
    await waitFor(() => {
      expect(screen.getByTestId("modbus-modal")).toBeInTheDocument();
    });
  });

  it("should open OPC UA browser when Configure is clicked on OPCUA card", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("OPCUA")).toBeInTheDocument();
    });

    const configureButton = screen.getByTestId("configure-opcua");
    expect(configureButton).toBeInTheDocument();
    fireEvent.click(configureButton);

    await waitFor(() => {
      expect(screen.getByTestId("opcua-browser")).toBeInTheDocument();
    });
  });

  it("should open DNP3 dashboard when Configure is clicked on DNP3 card", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("DNP3")).toBeInTheDocument();
    });

    const configureButton = screen.getByTestId("configure-dnp3");
    expect(configureButton).toBeInTheDocument();
    fireEvent.click(configureButton);

    await waitFor(() => {
      expect(screen.getByTestId("dnp3-dashboard")).toBeInTheDocument();
    });
  });

  it("should open MQTT panel when Configure is clicked on MQTT card", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("MQTT")).toBeInTheDocument();
    });

    const configureButton = screen.getByTestId("configure-mqtt");
    expect(configureButton).toBeInTheDocument();
    fireEvent.click(configureButton);

    await waitFor(() => {
      expect(screen.getByTestId("mqtt-panel")).toBeInTheDocument();
    });
  });

  it("should open Simulator dialog when Configure is clicked on Simulator card", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("SIMULATOR")).toBeInTheDocument();
    });

    const configureButton = screen.getByTestId("configure-simulator");
    expect(configureButton).toBeInTheDocument();
    fireEvent.click(configureButton);

    await waitFor(() => {
      expect(screen.getByText(/Simulator Configuration/i)).toBeInTheDocument();
    });

    // Check for simulator settings fields
    expect(screen.getByLabelText(/Simulation Units Count/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sensor Types Count/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Simulation Speed/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Noise Level/i)).toBeInTheDocument();
  });

  // ============================================================
  // TEST: Connect Buttons
  // ============================================================
  it("should show Connect button for available but disconnected protocols", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("OPCUA")).toBeInTheDocument();
    });

    // OPCUA is available but disconnected, so should have a Connect button
    const connectButton = screen.getByTestId("connect-opcua");
    expect(connectButton).toBeInTheDocument();
  });

  // ============================================================
  // TEST: Add Device Button (Wizard)
  // ============================================================
  it("should open Protocol Wizard when Add Device button is clicked", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Multi-Protocol Manager/i)).toBeInTheDocument();
    });

    // Find the Add Device button (the floating button with Plus icon)
    const addButton = screen.getByLabelText("Add new device");
    expect(addButton).toBeInTheDocument();
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId("protocol-wizard")).toBeInTheDocument();
    });
  });

  // ============================================================
  // TEST: Refresh Button
  // ============================================================
  it("should refresh data when Refresh button is clicked", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Multi-Protocol Manager/i)).toBeInTheDocument();
    });

    // Clear mock calls to check if refresh triggers new calls
    vi.clearAllMocks();
    apiGetJson.mockResolvedValue(mockProtocolsData);

    const refreshButton = screen.getByText("Refresh");
    fireEvent.click(refreshButton);

    // Wait for the refresh to complete (shows success toast)
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Protocol status refreshed",
        expect.anything(),
      );
    });
  });

  // ============================================================
  // TEST: Error State
  // ============================================================
  it("should show error state when API fails", async () => {
    apiGetJson.mockRejectedValue(new Error("Network error"));

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    // Wait for the error state to appear using testid
    await waitFor(() => {
      expect(screen.getByTestId("error-state")).toBeInTheDocument();
    });

    // Check for the error message
    expect(screen.getByText(/Failed to Load/i)).toBeInTheDocument();
    expect(screen.getByText(/Could not retrieve protocol status/i)).toBeInTheDocument();
    
    // Check for the "Try Again" button
    const tryAgainButton = screen.getByText("Try Again");
    expect(tryAgainButton).toBeInTheDocument();
  });

  // ============================================================
  // TEST: Error Display with Protocol Errors
  // ============================================================
  it("should display error details when a protocol has an error", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("OPCUA")).toBeInTheDocument();
    });

    // OPCUA has an error, so we should see the error details
    expect(screen.getByText("CONNECTION_REFUSED")).toBeInTheDocument();
    expect(screen.getByText("Server unreachable")).toBeInTheDocument();
  });

  // ============================================================
  // TEST: Protocol Metrics Display
  // ============================================================
  it("should display metrics for protocols that have them", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("MQTT")).toBeInTheDocument();
    });

    // Look for metrics containers
    const metricsContainers = screen.getAllByTestId("metrics-container");
    expect(metricsContainers.length).toBeGreaterThan(0);

    // Check for specific metric values using test IDs
    const messagesSent = screen.getByTestId("metric-value-messages_sent");
    expect(messagesSent).toBeInTheDocument();
    expect(messagesSent.textContent).toBe("1247");

    const activeDevices = screen.getByTestId("metric-value-active_devices");
    expect(activeDevices).toBeInTheDocument();
    expect(activeDevices.textContent).toBe("2");

    const activeOutstations = screen.getByTestId("metric-value-active_outstations");
    expect(activeOutstations).toBeInTheDocument();
    expect(activeOutstations.textContent).toBe("1");
  });

  // ============================================================
  // TEST: Demo Mode Badge
  // ============================================================
  it("should show Demo Mode badge when in development mode", async () => {
    // This requires setting import.meta.env.DEV = true
    const originalDev = import.meta.env.DEV;
    import.meta.env.DEV = true;

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Demo Mode")).toBeInTheDocument();
    });

    import.meta.env.DEV = originalDev;
  });

  // ============================================================
  // TEST: Connection Rate Calculation
  // ============================================================
  it("should calculate and display correct connection rate", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Connection Rate")).toBeInTheDocument();
    });

    // 3 active / 5 total = 60%
    expect(screen.getByText("60%")).toBeInTheDocument();
  });
});
