/**
 * Tests for MultiProtocolManager - Simplified
 */

import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import React from "react";

// ============================================================
// Mock ALL child components and dependencies
// ============================================================

vi.mock("../components/protocol/DNP3MonitoringDashboard", () => ({
  default: () => <div data-testid="dnp3-dashboard">DNP3 Dashboard</div>,
}));

vi.mock("../components/protocol/ModbusDeviceModal", () => ({
  default: () => <div data-testid="modbus-modal">Modbus Device</div>,
}));

vi.mock("../components/protocol/MQTTManagementPanel", () => ({
  default: () => <div data-testid="mqtt-panel">MQTT Management</div>,
}));

vi.mock("../components/protocol/OPCUANodeBrowser", () => ({
  default: () => <div data-testid="opcua-browser">OPC UA Browser</div>,
}));

vi.mock("../components/protocol/ProtocolWizard", () => ({
  default: () => <div data-testid="protocol-wizard">Protocol Wizard</div>,
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
  Label: ({ children }) => <label data-testid="label">{children}</label>,
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
  apiGetJson: vi.fn().mockResolvedValue({
    timestamp: new Date().toISOString(),
    summary: {
      total_protocols: 5,
      active_protocols: 3,
      supported_protocols: ["mqtt", "opcua", "modbus", "dnp3", "simulator"],
    },
    protocols: {
      mqtt: { name: "mqtt", available: true, connected: true, status: "ready" },
      opcua: { name: "opcua", available: true, connected: false, status: "error" },
      modbus: { name: "modbus", available: true, connected: true, status: "ready" },
      dnp3: { name: "dnp3", available: true, connected: true, status: "ready" },
      simulator: { name: "simulator", available: false, connected: false, status: "not_initialized" },
    },
  }),
}));

// ============================================================
// Import the REAL component
// ============================================================
import MultiProtocolManager from "../components/MultiProtocolManager";

const TestWrapper = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe("MultiProtocolManager", () => {
  // ============================================================
  // Basic Rendering Tests
  // ============================================================

  it("should render without crashing", () => {
    const { container } = render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );
    expect(container).toBeDefined();
  });

  it("should show loading state initially", () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );
    expect(screen.getByText(/Loading protocol status/i)).toBeInTheDocument();
  });

  it("should render the header with title", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );
    const title = await screen.findByText(/Multi-Protocol Manager/i);
    expect(title).toBeInTheDocument();
  });
});
