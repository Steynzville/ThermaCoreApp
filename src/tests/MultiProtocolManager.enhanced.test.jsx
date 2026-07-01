// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MultiProtocolManager from "../components/MultiProtocolManager";
import { apiGetJson } from "@/utils/apiFetch";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { SettingsProvider } from "../context/SettingsContext";

// Mock dependencies
vi.mock("../styles/theme.css", () => ({}));
vi.mock("../../styles/theme.css", () => ({}));
vi.mock("@/styles/theme.css", () => ({}));
vi.mock("/src/styles/theme.css", () => ({}));
vi.mock("src/styles/theme.css", () => ({}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock apiFetch with a more flexible mock
vi.mock("@/utils/apiFetch", () => ({
  apiGetJson: vi.fn(),
}));

// Mock required contexts with actual providers that render children
vi.mock("../context/AuthContext", () => {
  const React = require("react");
  return {
    AuthProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    useAuth: () => ({
      user: { id: "1", username: "admin", role: "admin" },
      userRole: "admin",
      permissions: { canManageUsers: true, canViewProtocols: true, canManageProtocols: true },
    }),
  };
});

vi.mock("../context/ThemeContext", () => {
  const React = require("react");
  return {
    ThemeProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    useTheme: () => ({
      theme: "light",
      toggleTheme: vi.fn(),
      setTheme: vi.fn(),
    }),
  };
});

vi.mock("../context/SettingsContext", () => {
  const React = require("react");
  return {
    SettingsProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    useSettings: () => ({
      settings: {
        refreshInterval: 10000,
      },
      updateSettings: vi.fn(),
    }),
  };
});

// Mock child components
vi.mock("@/components/protocol/DNP3MonitoringDashboard", () => ({
  __esModule: true,
  default: ({ isOpen, onClose }) => isOpen ? <div data-testid="dnp3-dashboard">DNP3 Dashboard <button type="button" onClick={onClose}>Close DNP3</button></div> : null
}));

vi.mock("@/components/protocol/ModbusDeviceModal", () => ({
  __esModule: true,
  default: ({ isOpen, onClose }) => isOpen ? <div data-testid="modbus-modal">Modbus Modal <button type="button" onClick={onClose}>Close Modbus</button></div> : null
}));

vi.mock("@/components/protocol/MQTTManagementPanel", () => ({
  __esModule: true,
  default: ({ isOpen, onClose }) => isOpen ? <div data-testid="mqtt-panel">MQTT Panel <button type="button" onClick={onClose}>Close MQTT</button></div> : null
}));

vi.mock("@/components/protocol/OPCUANodeBrowser", () => ({
  __esModule: true,
  default: ({ isOpen, onClose }) => isOpen ? <div data-testid="opcua-browser">OPC-UA Browser <button type="button" onClick={onClose}>Close OPC-UA</button></div> : null
}));

vi.mock("@/components/protocol/ProtocolWizard", () => ({
  __esModule: true,
  default: ({ isOpen, onClose }) => isOpen ? <div data-testid="protocol-wizard">Protocol Wizard <button type="button" onClick={onClose}>Close Wizard</button></div> : null
}));

vi.mock("@/components/protocol/ProtocolStatusDashboard", () => ({
  __esModule: true,
  default: () => <div data-testid="protocol-status-dashboard">Protocol Status Dashboard</div>
}));

const mockProtocolsData = {
  timestamp: "2026-06-30T21:10:00.000Z",
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
      last_heartbeat: "2026-06-30T21:09:30.000Z",
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
      last_heartbeat: "2026-06-30T21:09:45.000Z",
      metrics: { active_devices: 2, total_registers: 48 },
    },
    dnp3: {
      name: "dnp3",
      available: true,
      connected: true,
      status: "ready",
      last_heartbeat: "2026-06-30T21:09:15.000Z",
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

describe("MultiProtocolManager - Enhanced Protocol Support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    import.meta.env.VITE_MOCK_MODE = "false";
    import.meta.env.DEV = false;
    apiGetJson.mockResolvedValue(mockProtocolsData);
  });

  // Debug test - removed console.log
  it("should debug render", async () => {
    const { container } = render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MultiProtocolManager />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );
    
    // Wait for any async loading
    await waitFor(() => {
      expect(container).toBeTruthy();
    }, { timeout: 5000 });
    
    expect(container).toBeTruthy();
  });

  it("should render the multi-protocol manager with all protocols", async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MultiProtocolManager />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );

    // Wait for the component to finish loading
    await waitFor(() => {
      expect(screen.queryByText(/Loading protocol status.../i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText("Multi-Protocol Manager")).toBeInTheDocument();
    expect(screen.getByText("Monitor and manage industrial protocol connections")).toBeInTheDocument();
    
    expect(screen.getByText("MQTT")).toBeInTheDocument();
    expect(screen.getByText("OPCUA")).toBeInTheDocument();
    expect(screen.getByText("MODBUS")).toBeInTheDocument();
    expect(screen.getByText("DNP3")).toBeInTheDocument();
    expect(screen.getByText("SIMULATOR")).toBeInTheDocument();
  });

  it("should display protocol metrics correctly", async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MultiProtocolManager />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading protocol status.../i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText("Total Protocols")).toBeInTheDocument();
    expect(screen.getByText("Active Protocols")).toBeInTheDocument();
    expect(screen.getByText("Connection Rate")).toBeInTheDocument();
    expect(screen.getByText("Last Updated")).toBeInTheDocument();
  });

  it("should open Modbus modal when configure button is clicked", async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MultiProtocolManager />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading protocol status.../i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const configureButtons = screen.getAllByText("Configure");
    fireEvent.click(configureButtons[2]);

    expect(screen.getByTestId("modbus-modal")).toBeInTheDocument();
    
    fireEvent.click(screen.getByText("Close Modbus"));
    expect(screen.queryByTestId("modbus-modal")).not.toBeInTheDocument();
  });

  it("should open OPC-UA browser when configure button is clicked", async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MultiProtocolManager />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading protocol status.../i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const configureButtons = screen.getAllByText("Configure");
    fireEvent.click(configureButtons[1]);

    expect(screen.getByTestId("opcua-browser")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Close OPC-UA"));
    expect(screen.queryByTestId("opcua-browser")).not.toBeInTheDocument();
  });

  it("should open DNP3 dashboard when configure button is clicked", async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MultiProtocolManager />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading protocol status.../i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const configureButtons = screen.getAllByText("Configure");
    fireEvent.click(configureButtons[3]);

    expect(screen.getByTestId("dnp3-dashboard")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Close DNP3"));
    expect(screen.queryByTestId("dnp3-dashboard")).not.toBeInTheDocument();
  });

  it("should open MQTT panel when configure button is clicked", async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MultiProtocolManager />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading protocol status.../i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const configureButtons = screen.getAllByText("Configure");
    fireEvent.click(configureButtons[0]);

    expect(screen.getByTestId("mqtt-panel")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Close MQTT"));
    expect(screen.queryByTestId("mqtt-panel")).not.toBeInTheDocument();
  });

  it("should show connection status badges for each protocol", async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MultiProtocolManager />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading protocol status.../i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const activeBadges = screen.getAllByText("Active");
    expect(activeBadges.length).toBeGreaterThanOrEqual(2);

    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("should handle refresh button click", async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MultiProtocolManager />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading protocol status.../i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    expect(apiGetJson).toHaveBeenCalledTimes(1);

    const refreshButton = screen.getByRole("button", { name: /Refresh/i });
    
    await act(async () => {
      fireEvent.click(refreshButton);
    });

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledTimes(2);
    });
  });

  it("should handle API errors gracefully", async () => {
    apiGetJson.mockRejectedValue(new Error("Request timed out. The server may be busy."));

    render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MultiProtocolManager />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to Load")).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText(/Failed to retrieve protocol status/i)).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("should display protocol-specific metrics", async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MultiProtocolManager />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading protocol status.../i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText("messages sent:")).toBeInTheDocument();
    expect(screen.getByText("1247")).toBeInTheDocument();
    expect(screen.getByText("messages received:")).toBeInTheDocument();
    expect(screen.getByText("2156")).toBeInTheDocument();

    expect(screen.getByText("active devices:")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("total registers:")).toBeInTheDocument();
    expect(screen.getByText("48")).toBeInTheDocument();
  });

  it("should show error state when protocol has errors", async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MultiProtocolManager />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading protocol status.../i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText("CONNECTION_REFUSED")).toBeInTheDocument();
    expect(screen.getByText("Server unreachable")).toBeInTheDocument();
  });

  it("should calculate connection rate correctly", async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MultiProtocolManager />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading protocol status.../i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("should display last updated timestamp", async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <MultiProtocolManager />
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading protocol status.../i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const expectedTime = new Date(mockProtocolsData.timestamp).toLocaleTimeString();
    expect(screen.getByText(expectedTime)).toBeInTheDocument();
  });
});
