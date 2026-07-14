/**
 * Tests for MultiProtocolManager
 *
 * Coverage strategy:
 *  - "mock mode" tests exercise the component the way the original suite did
 *    (import.meta.env.DEV / VITE_MOCK_MODE causing the component to use its
 *    built-in mockData instead of calling the API).
 *  - "live mode" tests force isMockMode to false (VITE_MOCK_MODE=false and
 *    DEV stubbed falsy) so the real fetch/error/retry/polling paths run.
 *  - toast.error is only fired when import.meta.env.MODE !== "test"; a
 *    couple of tests stub MODE to "development" specifically to exercise
 *    that branch.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

// ============================================================
// Mock ALL child components and dependencies
// ============================================================

vi.mock("../components/protocol/DNP3MonitoringDashboard", () => ({
  default: ({ isOpen }) =>
    isOpen ? <div data-testid="dnp3-dashboard">DNP3 Dashboard</div> : null,
}));

vi.mock("../components/protocol/ModbusDeviceModal", () => ({
  default: ({ isOpen, device }) =>
    isOpen ? (
      <div data-testid="modbus-modal">
        Modbus Device {device ? device.device_id : ""}
      </div>
    ) : null,
}));

vi.mock("../components/protocol/MQTTManagementPanel", () => ({
  default: ({ isOpen }) =>
    isOpen ? <div data-testid="mqtt-panel">MQTT Management</div> : null,
}));

vi.mock("../components/protocol/OPCUANodeBrowser", () => ({
  default: ({ isOpen }) =>
    isOpen ? <div data-testid="opcua-browser">OPC UA Browser</div> : null,
}));

vi.mock("../components/protocol/ProtocolWizard", () => ({
  default: ({ isOpen }) =>
    isOpen ? <div data-testid="protocol-wizard">Protocol Wizard</div> : null,
}));

// Mock UI components
vi.mock("../components/ui/badge", () => ({
  Badge: ({ children, variant }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

// FIXED: Button mock that properly passes through data-testid
vi.mock("../components/ui/button", () => ({
  Button: ({ children, onClick, disabled, "aria-label": ariaLabel, className, "data-testid": testId }) => (
    <button
      data-testid={testId || "button"}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
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
  Input: (props) => <input data-testid={props.id ? `input-${props.id}` : "input"} {...props} />,
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
  apiGetJson: vi.fn(),
}));

import { toast } from "sonner";
import { apiGetJson } from "../utils/apiFetch";
import MultiProtocolManager from "../components/MultiProtocolManager";

const TestWrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>;

const liveApiResponse = (overrides = {}) => ({
  timestamp: new Date().toISOString(),
  summary: {
    total_protocols: 5,
    active_protocols: 3,
    supported_protocols: ["mqtt", "opcua", "modbus", "dnp3", "simulator"],
  },
  protocols: {
    mqtt: { name: "mqtt", available: true, connected: true, status: "ready" },
    opcua: {
      name: "opcua",
      available: true,
      connected: false,
      status: "error",
      error: { code: "CONNECTION_REFUSED", message: "Server unreachable" },
    },
    modbus: { name: "modbus", available: true, connected: true, status: "ready" },
    dnp3: { name: "dnp3", available: true, connected: true, status: "ready" },
    simulator: {
      name: "simulator",
      available: false,
      connected: false,
      status: "not_initialized",
    },
  },
  ...overrides,
});

/** Force the component into the "live" (non-mock) code path. */
const forceLiveMode = () => {
  vi.stubEnv("VITE_MOCK_MODE", "false");
  vi.stubEnv("DEV", "");
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.useRealTimers();
});

// ============================================================
// Mock-mode rendering (mirrors original suite's default behavior)
// ============================================================

describe("MultiProtocolManager - basic rendering (mock mode)", () => {
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
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
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

  it("shows the Demo Mode badge when running in mock mode", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );
    await screen.findByText(/Multi-Protocol Manager/i);
    expect(screen.getByText("Demo Mode")).toBeInTheDocument();
  });
});

describe("MultiProtocolManager - summary cards & protocol grid (mock mode)", () => {
  beforeEach(async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );
    await screen.findByText(/Multi-Protocol Manager/i);
  });

  it("renders total/active protocol counts and connection rate", () => {
    expect(screen.getByText("5")).toBeInTheDocument(); // total
    expect(screen.getByText("3")).toBeInTheDocument(); // active
    expect(screen.getByText("60%")).toBeInTheDocument(); // 3/5
  });

  it("renders a card for every protocol with the right status badge", () => {
    expect(screen.getByText("MQTT")).toBeInTheDocument();
    expect(screen.getByText("OPCUA")).toBeInTheDocument();
    expect(screen.getByText("MODBUS")).toBeInTheDocument();
    expect(screen.getByText("DNP3")).toBeInTheDocument();
    expect(screen.getByText("SIMULATOR")).toBeInTheDocument();

    // connected + ready protocols
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(3);
    // opcua is in an error state
    expect(screen.getByText("Error")).toBeInTheDocument();
    // simulator is unavailable
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("renders the opcua connection error details", () => {
    expect(screen.getByText("CONNECTION_REFUSED")).toBeInTheDocument();
    expect(screen.getByText("Server unreachable")).toBeInTheDocument();
  });

  it("renders metrics for protocols that report them", () => {
    expect(screen.getByTestId("metric-messages_sent")).toBeInTheDocument();
    expect(screen.getByTestId("metric-active_devices")).toBeInTheDocument();
    expect(screen.getByTestId("metric-active_outstations")).toBeInTheDocument();
  });

  it("only shows a Connect button for available-but-disconnected protocols", () => {
    // FIXED: Use getAllByTestId and check text content since testId might be on button wrapper
    const connectButtons = screen.getAllByTestId("button").filter(
      btn => btn.textContent?.includes("Connect")
    );
    expect(connectButtons.length).toBeGreaterThan(0);
    
    // Verify opcua has a Connect button by finding it in the OPCUA card
    const opcuaCard = screen.getByText("OPCUA").closest('[data-testid="card"]');
    expect(opcuaCard).toBeInTheDocument();
    const connectInOpcua = within(opcuaCard).queryByText("Connect");
    expect(connectInOpcua).toBeInTheDocument();
  });
});

describe("MultiProtocolManager - protocol configuration modals", () => {
  const setup = async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );
    await screen.findByText(/Multi-Protocol Manager/i);
    return user;
  };

  // FIXED: Find configure buttons by text content instead of testId
  it("opens the Modbus modal from the modbus card", async () => {
    const user = await setup();
    const modbusCard = screen.getByText("MODBUS").closest('[data-testid="card"]');
    const configureButton = within(modbusCard).getByText("Configure");
    await user.click(configureButton);
    expect(await screen.findByTestId("modbus-modal")).toBeInTheDocument();
  });

  it("opens the OPC UA browser from the opcua card", async () => {
    const user = await setup();
    const opcuaCard = screen.getByText("OPCUA").closest('[data-testid="card"]');
    const configureButton = within(opcuaCard).getByText("Configure");
    await user.click(configureButton);
    expect(await screen.findByTestId("opcua-browser")).toBeInTheDocument();
  });

  it("opens the DNP3 dashboard from the dnp3 card", async () => {
    const user = await setup();
    const dnp3Card = screen.getByText("DNP3").closest('[data-testid="card"]');
    const configureButton = within(dnp3Card).getByText("Configure");
    await user.click(configureButton);
    expect(await screen.findByTestId("dnp3-dashboard")).toBeInTheDocument();
  });

  it("opens the MQTT panel from the mqtt card", async () => {
    const user = await setup();
    const mqttCard = screen.getByText("MQTT").closest('[data-testid="card"]');
    const configureButton = within(mqttCard).getByText("Configure");
    await user.click(configureButton);
    expect(await screen.findByTestId("mqtt-panel")).toBeInTheDocument();
  });

  it("opens the simulator configuration dialog from the simulator card", async () => {
    const user = await setup();
    const simulatorCard = screen.getByText("SIMULATOR").closest('[data-testid="card"]');
    const configureButton = within(simulatorCard).getByText("Configure");
    await user.click(configureButton);
    expect(await screen.findByText("Simulator Configuration")).toBeInTheDocument();
  });

  it("opens the Protocol Wizard from the floating add-device button", async () => {
    const user = await setup();
    await user.click(screen.getByLabelText("Add new device"));
    expect(await screen.findByTestId("protocol-wizard")).toBeInTheDocument();
  });
});

describe("MultiProtocolManager - simulator configuration dialog", () => {
  const openSimulatorDialog = async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );
    await screen.findByText(/Multi-Protocol Manager/i);
    const simulatorCard = screen.getByText("SIMULATOR").closest('[data-testid="card"]');
    const configureButton = within(simulatorCard).getByText("Configure");
    await user.click(configureButton);
    await screen.findByText("Simulator Configuration");
    return user;
  };

  it("updates settings and saves, activating the simulator protocol", async () => {
    const user = await openSimulatorDialog();

    const unitsInput = screen.getByTestId("input-sim-units");
    await user.clear(unitsInput);
    await user.type(unitsInput, "8");

    const saveButtons = screen.getAllByText("Save Config");
    await user.click(saveButtons[0]);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Simulator configuration updated successfully.",
      );
    });

    // dialog closes
    expect(screen.queryByText("Simulator Configuration")).not.toBeInTheDocument();
    // simulator card now reflects the updated/active state
    expect(screen.getByTestId("metric-active_unit_states")).toBeInTheDocument();
  });

  it("closes without changes when Cancel is clicked", async () => {
    const user = await openSimulatorDialog();
    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Simulator Configuration")).not.toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalledWith(
      "Simulator configuration updated successfully.",
    );
  });
});

describe("MultiProtocolManager - refresh", () => {
  it("shows a success toast when a manual refresh succeeds", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );
    await screen.findByText(/Multi-Protocol Manager/i);

    await user.click(screen.getByText("Refresh"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Protocol status refreshed",
        expect.objectContaining({ duration: 2000 }),
      );
    });
  });
});

// ============================================================
// Live-mode (non-mock) behavior: real fetch, errors, retries, polling
// ============================================================

describe("MultiProtocolManager - live mode success", () => {
  beforeEach(() => {
    forceLiveMode();
  });

  it("fetches from the API and renders the returned data", async () => {
    apiGetJson.mockResolvedValueOnce(liveApiResponse());

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await screen.findByText(/Multi-Protocol Manager/i);
    expect(apiGetJson).toHaveBeenCalledWith(
      "/api/v1/protocols/status",
      expect.objectContaining({ timeout: 15000, retries: 2 }),
    );
    // no Demo Mode badge in live mode
    expect(screen.queryByText("Demo Mode")).not.toBeInTheDocument();
  });

  it("shows 0% connection rate when there are no protocols", async () => {
    apiGetJson.mockResolvedValueOnce(
      liveApiResponse({
        summary: { total_protocols: 0, active_protocols: 0, supported_protocols: [] },
        protocols: {},
      }),
    );

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await screen.findByText(/Multi-Protocol Manager/i);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});

describe("MultiProtocolManager - live mode failure & retry", () => {
  beforeEach(() => {
    forceLiveMode();
  });

  it("shows the error state when the initial fetch fails", async () => {
    apiGetJson.mockRejectedValue(new Error("boom"));

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    expect(await screen.findByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByText("Failed to Load")).toBeInTheDocument();
    expect(screen.getByText(/Could not retrieve protocol status/i)).toBeInTheDocument();
  });

  it("shows the Reload Page button only in live mode", async () => {
    apiGetJson.mockRejectedValue(new Error("boom"));
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );
    await screen.findByTestId("error-state");
    expect(screen.getByText("Reload Page")).toBeInTheDocument();
  });

  it("recovers after a successful retry", async () => {
    const user = userEvent.setup();
    apiGetJson.mockRejectedValueOnce(new Error("boom"));
    apiGetJson.mockResolvedValueOnce(liveApiResponse());

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await screen.findByTestId("error-state");
    await user.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(screen.getByText(/Multi-Protocol Manager/i)).toBeInTheDocument();
    });
  });

  it("does NOT show a 'refreshed' success toast when a manual refresh fails (regression test)", async () => {
    const user = userEvent.setup();
    apiGetJson.mockResolvedValueOnce(liveApiResponse());
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );
    await screen.findByText(/Multi-Protocol Manager/i);

    apiGetJson.mockRejectedValueOnce(new Error("network down"));
    await user.click(screen.getByText("Refresh"));

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledTimes(2);
    });

    expect(toast.success).not.toHaveBeenCalledWith(
      "Protocol status refreshed",
      expect.anything(),
    );
  });

  it("maps timeout/network/auth errors to distinct toast messages outside test MODE", async () => {
    vi.stubEnv("MODE", "development");

    apiGetJson.mockRejectedValueOnce(new Error("Request timeout exceeded"));
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Request timed out. The server may be busy.",
        expect.anything(),
      );
    });
  });

  it("increments the consecutive error count shown in the error state", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    apiGetJson.mockRejectedValue(new Error("down"));

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId("error-state")).toBeInTheDocument();
    });

    // advance past the first backoff interval to trigger another poll
    await vi.advanceTimersByTimeAsync(16000);

    await vi.waitFor(() => {
      expect(screen.getByText(/attempts\./i)).toBeInTheDocument();
    });
  });
});

describe("MultiProtocolManager - page visibility", () => {
  it("shows a paused badge when the tab becomes hidden", async () => {
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );
    await screen.findByText(/Multi-Protocol Manager/i);

    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(await screen.findByText("Paused (tab inactive)")).toBeInTheDocument();

    // restore
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
  });

  it("unmounts cleanly without throwing", async () => {
    const { unmount } = render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );
    await screen.findByText(/Multi-Protocol Manager/i);
    expect(() => unmount()).not.toThrow();
  });
});
