/**
 * Tests for MultiProtocolManager
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

// ============================================================
// Mock dependencies
// ============================================================

// Mock child components
vi.mock("../components/protocol/DNP3MonitoringDashboard", () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="dnp3-dashboard">
        DNP3 Dashboard
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("../components/protocol/ModbusDeviceModal", () => ({
  default: ({ isOpen, onClose, device }) =>
    isOpen ? (
      <div data-testid="modbus-modal">
        Modbus Device: {device?.device_id || "Unknown"}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("../components/protocol/MQTTManagementPanel", () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="mqtt-panel">
        MQTT Management
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("../components/protocol/OPCUANodeBrowser", () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="opcua-browser">
        OPC UA Browser
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("../components/protocol/ProtocolWizard", () => ({
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
vi.mock("../components/ui/badge", () => ({
  Badge: ({ children }) => <span data-testid="badge">{children}</span>,
}));

vi.mock("../components/ui/button", () => ({
  Button: ({ children, onClick, disabled, "aria-label": ariaLabel }) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
}));

vi.mock("../components/ui/card", () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }) => <div data-testid="card-title">{children}</div>,
}));

vi.mock("../components/ui/dialog", () => ({
  Dialog: ({ children, open }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }) => <div data-testid="dialog-description">{children}</div>,
}));

vi.mock("../components/ui/input", () => ({
  Input: (props) => <input data-testid="input" {...props} />,
}));

vi.mock("../components/ui/label", () => ({
  Label: ({ children, htmlFor }) => (
    <label data-testid="label" htmlFor={htmlFor}>
      {children}
    </label>
  ),
}));

vi.mock("../components/ui/select", () => ({
  Select: ({ children }) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children }) => <div data-testid="select-item">{children}</div>,
  SelectTrigger: ({ children }) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: () => <span data-testid="select-value">Modbus</span>,
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock apiFetch
vi.mock("../utils/apiFetch", () => ({
  apiGetJson: vi.fn(),
}));

// ============================================================
// Import the REAL component and mocks
// ============================================================
import MultiProtocolManager from "../components/MultiProtocolManager";
import { apiGetJson } from "../utils/apiFetch";
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
    apiGetJson.mockResolvedValue(mockProtocolsData);
  });

  const waitForComponentToLoad = async () => {
    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("Multi-Protocol Manager")).toBeInTheDocument();
    });
  };

  // ============================================================
  // Tests
  // ============================================================

  it("should show loading state initially", async () => {
    apiGetJson.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockProtocolsData), 100))
    );

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    expect(screen.getByText(/Loading protocol status/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });
  });

  it("should render protocol status cards when data loads", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitForComponentToLoad();

    expect(screen.getByText("Total Protocols")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Active Protocols")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    expect(screen.getByText("MQTT")).toBeInTheDocument();
    expect(screen.getByText("OPCUA")).toBeInTheDocument();
    expect(screen.getByText("MODBUS")).toBeInTheDocument();
    expect(screen.getByText("DNP3")).toBeInTheDocument();
    expect(screen.getByText("SIMULATOR")).toBeInTheDocument();
  });

  it("should display correct status badges for each protocol", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitForComponentToLoad();

    const badges = screen.getAllByTestId("badge");
    const badgeTexts = badges.map((b) => b.textContent);

    expect(badgeTexts).toContain("Active");
    expect(badgeTexts).toContain("Error");
    expect(badgeTexts).toContain("Inactive");
  });

  it("should open Modbus modal when Configure is clicked on Modbus card", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitForComponentToLoad();

    const configureButtons = screen.getAllByText("Configure");
    fireEvent.click(configureButtons[2]); // Modbus is the third protocol

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

    await waitForComponentToLoad();

    const configureButtons = screen.getAllByText("Configure");
    fireEvent.click(configureButtons[1]); // OPCUA is the second protocol

    await waitFor(() => {
      expect(screen.getByTestId("opcua-browser")).toBeInTheDocument();
    });
  });

  it("should open Protocol Wizard when Add Device button is clicked", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitForComponentToLoad();

    const addButton = screen.getByLabelText("Add new device");
    expect(addButton).toBeInTheDocument();
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId("protocol-wizard")).toBeInTheDocument();
    });
  });

  it("should refresh data when Refresh button is clicked", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitForComponentToLoad();

    vi.clearAllMocks();
    apiGetJson.mockResolvedValue(mockProtocolsData);

    const refreshButton = screen.getByText("Refresh");
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Protocol status refreshed",
        expect.anything(),
      );
    });
  });

  it("should show error state when API fails", async () => {
    apiGetJson.mockRejectedValue(new Error("Network error"));

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      const errorHeading = screen.queryByText("Failed to Load");
      const tryAgainButton = screen.queryByText("Try Again");
      expect(errorHeading || tryAgainButton).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("should display error details when a protocol has an error", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitForComponentToLoad();

    expect(screen.getByText("CONNECTION_REFUSED")).toBeInTheDocument();
    expect(screen.getByText("Server unreachable")).toBeInTheDocument();
  });

  it("should display metrics for protocols that have them", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitForComponentToLoad();

    const metricsContainers = screen.getAllByTestId("metrics-container");
    expect(metricsContainers.length).toBeGreaterThan(0);

    expect(screen.getByText(/messages sent:/i)).toBeInTheDocument();
    expect(screen.getByText(/active devices:/i)).toBeInTheDocument();
    expect(screen.getByText(/active outstations:/i)).toBeInTheDocument();
  });

  it("should calculate and display correct connection rate", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitForComponentToLoad();

    expect(screen.getByText("Connection Rate")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });
});
