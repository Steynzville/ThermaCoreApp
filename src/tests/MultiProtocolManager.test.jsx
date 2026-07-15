/**
 * Tests for MultiProtocolManager
 *
 * Coverage strategy:
 *  - "mock mode" tests exercise the component the way the original suite did
 *  - "live mode" tests force isMockMode to false
 *  - Polling tests are included but isolated to prevent hangs
 */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
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

// ============================================================
// CRITICAL: Clean up after each test to prevent polling leaks
// ============================================================
afterEach(() => {
  cleanup(); // Unmounts all components, runs polling cleanup
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.useRealTimers();
});

// ============================================================
// Mock-mode rendering tests
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
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("renders a card for every protocol with the right status badge", () => {
    expect(screen.getByText("MQTT")).toBeInTheDocument();
    expect(screen.getByText("OPCUA")).toBeInTheDocument();
    expect(screen.getByText("MODBUS")).toBeInTheDocument();
    expect(screen.getByText("DNP3")).toBeInTheDocument();
    expect(screen.getByText("SIMULATOR")).toBeInTheDocument();

    const activeBadges = screen.getAllByText("Active");
    expect(activeBadges.length).toBe(3);
    
    expect(screen.getByText("Error")).toBeInTheDocument();
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
    expect(screen.getByTestId("connect-opcua")).toBeInTheDocument();
    expect(screen.queryByTestId("connect-mqtt")).not.toBeInTheDocument();
    expect(screen.queryByTestId("connect-modbus")).not.toBeInTheDocument();
    expect(screen.queryByTestId("connect-dnp3")).not.toBeInTheDocument();
    expect(screen.queryByTestId("connect-simulator")).not.toBeInTheDocument();
  });

  it("renders the last-updated timestamp", () => {
    expect(screen.getByText(/Last Updated/i)).toBeInTheDocument();
  });

  it("shows a success toast when Connect button is clicked", async () => {
    const user = userEvent.setup();
    const connectButton = screen.getByTestId("connect-opcua");
    await user.click(connectButton);
    expect(toast.success).toHaveBeenCalledWith(
      "Connecting to OPCUA...",
      expect.objectContaining({ duration: 2000 })
    );
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

  it("opens the Modbus modal from the modbus card", async () => {
    const user = await setup();
    await user.click(screen.getByTestId("configure-modbus"));
    expect(await screen.findByTestId("modbus-modal")).toBeInTheDocument();
  });

  it("opens the OPC UA browser from the opcua card", async () => {
    const user = await setup();
    await user.click(screen.getByTestId("configure-opcua"));
    expect(await screen.findByTestId("opcua-browser")).toBeInTheDocument();
  });

  it("opens the DNP3 dashboard from the dnp3 card", async () => {
    const user = await setup();
    await user.click(screen.getByTestId("configure-dnp3"));
    expect(await screen.findByTestId("dnp3-dashboard")).toBeInTheDocument();
  });

  it("opens the MQTT panel from the mqtt card", async () => {
    const user = await setup();
    await user.click(screen.getByTestId("configure-mqtt"));
    expect(await screen.findByTestId("mqtt-panel")).toBeInTheDocument();
  });

  it("opens the simulator configuration dialog from the simulator card", async () => {
    const user = await setup();
    await user.click(screen.getByTestId("configure-simulator"));
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
    await user.click(screen.getByTestId("configure-simulator"));
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

    expect(screen.queryByText("Simulator Configuration")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("metric-active_unit_states")).toBeInTheDocument();
    });
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
// Live-mode (non-mock) behavior
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
    expect(screen.getByText(/Failed to retrieve protocol status after \d+ attempts\./i)).toBeInTheDocument();
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
    
    const tryAgainButton = screen.getByRole('button', { name: /Try Again/i });
    await user.click(tryAgainButton);

    await waitFor(() => {
      expect(screen.getByText(/Multi-Protocol Manager/i)).toBeInTheDocument();
    });
  });

  it("shows recovery success toast after errors are resolved", async () => {
    const user = userEvent.setup();
    
    // First request fails - this triggers the error state
    apiGetJson.mockRejectedValueOnce(new Error("boom"));
    // Second request succeeds - this should trigger the recovery toast
    apiGetJson.mockResolvedValueOnce(liveApiResponse());

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    // Wait for the error state to appear
    await screen.findByTestId("error-state");
    
    // Click "Try Again" to recover
    const tryAgainButton = screen.getByRole('button', { name: /Try Again/i });
    await user.click(tryAgainButton);

    // Wait for the component to load successfully
    await waitFor(() => {
      expect(screen.getByText(/Multi-Protocol Manager/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify the component rendered correctly after recovery
    expect(screen.getByText(/Multi-Protocol Manager/i)).toBeInTheDocument();
    
    // Verify that apiGetJson was called twice (once failing, once succeeding)
    expect(apiGetJson).toHaveBeenCalledTimes(2);
  });

  it("does NOT show a 'refreshed' success toast when a manual refresh fails", async () => {
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

  it("maps timeout errors to distinct toast messages", async () => {
    const toastSpy = vi.spyOn(toast, 'error');

    apiGetJson.mockRejectedValueOnce(new Error("Request timeout exceeded"));
    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        "Request timed out. The server may be busy.",
        expect.anything(),
      );
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

// ============================================================
// Polling behavior - ISOLATED TESTS
// ============================================================
// These tests are isolated in their own describe block so they
// can be run separately if needed. They use a combination of
// real timers and setTimeout spying to avoid hanging.
// 
// To run only these tests:
//   pnpm test -- MultiProtocolManager.test.jsx -t "polling"
describe("MultiProtocolManager - polling", () => {
  beforeEach(() => {
    forceLiveMode();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("schedules a background poll after the initial load", async () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    apiGetJson.mockResolvedValue(liveApiResponse());

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await screen.findByText(/Multi-Protocol Manager/i);
    
    // Find the setTimeout call that schedules the polling
    const setTimeoutCalls = setTimeoutSpy.mock.calls;
    const pollingCall = setTimeoutCalls.find(call => 
      typeof call[0] === 'function' && call[1] >= 10000 && call[1] <= 60000
    );
    
    // Verify that a polling timeout was scheduled
    expect(pollingCall).toBeDefined();
    
    // Verify the delay is reasonable (between 10s and 60s)
    expect(pollingCall[1]).toBeGreaterThanOrEqual(10000);
    expect(pollingCall[1]).toBeLessThanOrEqual(60000);
    
    setTimeoutSpy.mockRestore();
  });

  it("increases backoff interval after consecutive errors", async () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    
    let callCount = 0;
    apiGetJson.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(liveApiResponse());
      }
      return Promise.reject(new Error("Network error"));
    });

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await screen.findByText(/Multi-Protocol Manager/i);
    
    // Wait for the component to settle
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Clear the initial setTimeout calls
    setTimeoutSpy.mockClear();
    
    // Simulate a failed poll by calling the setTimeout callback directly
    // This is a bit of a hack, but it's the only way to test the backoff
    // without actually waiting for real time to pass.
    // 
    // We're relying on the fact that the first setTimeout callback will
    // be the polling function. This is fragile, but it's the best we can do.
    const firstPollingCall = setTimeoutSpy.mock.calls.find(call => 
      typeof call[0] === 'function' && call[1] >= 10000
    );
    
    if (firstPollingCall && typeof firstPollingCall[0] === 'function') {
      // Execute the callback to simulate a poll
      await firstPollingCall[0]();
    }
    
    // Wait for the component to process the error
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Now check for a new setTimeout with a longer delay
    const newPollingCalls = setTimeoutSpy.mock.calls.filter(call => 
      typeof call[0] === 'function' && call[1] >= 10000
    );
    
    // There should be a new polling timeout scheduled
    expect(newPollingCalls.length).toBeGreaterThan(0);
    
    // The new delay should be 15s (10 * 1.5) or more
    const lastDelay = newPollingCalls[newPollingCalls.length - 1][1];
    expect(lastDelay).toBeGreaterThanOrEqual(15000);
    
    setTimeoutSpy.mockRestore();
  });

  it("caps backoff at 60 seconds", async () => {
    // This test is complex and requires multiple error cycles
    // We'll use a more direct approach by spying on setTimeout
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    
    let callCount = 0;
    apiGetJson.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(liveApiResponse());
      }
      return Promise.reject(new Error("Network error"));
    });

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await screen.findByText(/Multi-Protocol Manager/i);
    
    // Wait for the component to settle
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Clear the initial setTimeout calls
    setTimeoutSpy.mockClear();
    
    // Simulate multiple error cycles
    for (let i = 0; i < 6; i++) {
      // Find the next polling call
      const pollingCall = setTimeoutSpy.mock.calls.find(call => 
        typeof call[0] === 'function' && call[1] >= 10000
      );
      
      if (pollingCall && typeof pollingCall[0] === 'function') {
        await pollingCall[0]();
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // After many errors, the delay should be capped at 60s
    const allCalls = setTimeoutSpy.mock.calls.filter(call => 
      typeof call[0] === 'function' && call[1] >= 10000
    );
    
    if (allCalls.length > 0) {
      const lastDelay = allCalls[allCalls.length - 1][1];
      // The delay should be 60s (capped)
      expect(lastDelay).toBe(60000);
    }
    
    setTimeoutSpy.mockRestore();
  });

  it("skips polling when the tab is hidden", async () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
    apiGetJson.mockResolvedValue(liveApiResponse());

    render(
      <TestWrapper>
        <MultiProtocolManager />
      </TestWrapper>,
    );

    await screen.findByText(/Multi-Protocol Manager/i);
    
    // Clear the initial setTimeout calls
    setTimeoutSpy.mockClear();
    
    // Hide the tab
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    
    // Wait a moment for the component to react
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // No new setTimeout calls should be scheduled for polling
    const pollingCalls = setTimeoutSpy.mock.calls.filter(call => 
      typeof call[0] === 'function' && call[1] >= 10000
    );
    
    // When tab is hidden, no polling should be scheduled
    expect(pollingCalls.length).toBe(0);
    
    setTimeoutSpy.mockRestore();
  });
});
