import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import ModbusDeviceModal from "./ModbusDeviceModal";

// Mock hooks and utilities
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn(),
}));

vi.mock("@/utils/apiFetch", () => ({
  apiGetJson: vi.fn(),
  apiPostJson: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock UI components
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }) => <span data-testid="badge" data-variant={variant}>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, variant, size, className }) => (
    <button
      data-testid="button"
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }) => <div data-testid="dialog-content" className={className}>{children}</div>,
  DialogHeader: ({ children }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }) => <div data-testid="dialog-description">{children}</div>,
}));

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children, open }) => open ? <div data-testid="drawer">{children}</div> : null,
  DrawerContent: ({ children, className }) => <div data-testid="drawer-content" className={className}>{children}</div>,
  DrawerHeader: ({ children }) => <div data-testid="drawer-header">{children}</div>,
  DrawerTitle: ({ children }) => <div data-testid="drawer-title">{children}</div>,
  DrawerDescription: ({ children }) => <div data-testid="drawer-description">{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ id, type, value, onChange, placeholder, className }) => (
    <input
      id={id}
      type={type}
      data-testid="input"
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }) => <label data-testid="label" htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, defaultValue, value, onValueChange }) => (
    <div data-testid="tabs" data-value={value || defaultValue}>
      {children}
    </div>
  ),
  TabsList: ({ children, className }) => <div data-testid="tabs-list" className={className}>{children}</div>,
  TabsTrigger: ({ children, value, className, onClick }) => (
    <button 
      data-testid="tabs-trigger" 
      data-value={value} 
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  ),
  TabsContent: ({ children, value, className }) => (
    <div data-testid="tabs-content" data-value={value} className={className}>
      {children}
    </div>
  ),
}));

// Mock icons
vi.mock("lucide-react", () => ({
  Activity: () => <span data-testid="activity-icon">Activity</span>,
  AlertCircle: () => <span data-testid="alert-icon">AlertCircle</span>,
  CheckCircle: () => <span data-testid="check-icon">CheckCircle</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
  Settings: () => <span data-testid="settings-icon">Settings</span>,
  Zap: () => <span data-testid="zap-icon">Zap</span>,
}));

// Import mocked modules
import { useMediaQuery } from "@/hooks/use-media-query";
import { apiGetJson, apiPostJson } from "@/utils/apiFetch";
import { toast } from "sonner";

// Helper to get tab panel
const getTabPanel = (value) => {
  const panels = screen.getAllByTestId("tabs-content");
  return panels.find((el) => el.getAttribute("data-value") === value);
};

// Helper to wait for device data to finish loading.
// NOTE: the mocked Tabs component renders every TabsContent panel at once
// (it doesn't hide inactive tabs), so both the header Badge and the
// Overview tab's connection-status text can contain "Connected"
// simultaneously. Scoping to the unique header Badge avoids ambiguous
// multi-match errors from screen.getByText("Connected").
const waitForDeviceLoaded = async () => {
  await waitFor(() => {
    expect(screen.getByTestId("badge")).toHaveTextContent("Connected");
  });
};

describe("ModbusDeviceModal", () => {
  const mockOnClose = vi.fn();
  const mockTenantId = "tenant-123";
  const mockDevice = {
    device_id: "modbus-1",
    host: "192.168.1.100",
    port: 502,
    unit_id: 1,
  };

  const mockDeviceData = {
    connected: true,
    last_poll: "2026-07-13T10:00:00Z",
    response_time: 25,
    readings: {
      temp: {
        address: 40001,
        name: "Temperature",
        processed_value: 45.2,
        type: "float",
        timestamp: "2026-07-13T10:00:00Z",
      },
      pressure: {
        address: 40002,
        name: "Pressure",
        processed_value: 101.3,
        type: "float",
        timestamp: "2026-07-13T10:00:00Z",
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useMediaQuery.mockReturnValue(true);
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/data")) {
        return Promise.resolve(mockDeviceData);
      }
      return Promise.resolve({});
    });
    apiPostJson.mockResolvedValue({ success: true });
  });

  it("should render desktop dialog when isOpen is true", () => {
    useMediaQuery.mockReturnValue(true);
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText(`Modbus Device: ${mockDevice.device_id}`)).toBeInTheDocument();
    expect(screen.getByText(`${mockDevice.host}:${mockDevice.port} (Unit ID: ${mockDevice.unit_id})`)).toBeInTheDocument();
  });

  it("should render mobile drawer when isOpen is true and on mobile", () => {
    useMediaQuery.mockReturnValue(false);
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    expect(screen.getByTestId("drawer")).toBeInTheDocument();
    expect(screen.getByText(`Modbus Device: ${mockDevice.device_id}`)).toBeInTheDocument();
  });

  it("should not render when isOpen is false", () => {
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={false}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
  });

  it("should fetch device data on mount when open", async () => {
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/modbus/devices/${mockDevice.device_id}/data?tenant_id=${mockTenantId}`
      );
    });
  });

  it("should display device overview with connection status", async () => {
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      const overviewPanel = getTabPanel("overview");
      expect(within(overviewPanel).getByText("Connected")).toBeInTheDocument();
      expect(within(overviewPanel).getByText("Registers")).toBeInTheDocument();
      expect(within(overviewPanel).getByText("2")).toBeInTheDocument();
      expect(within(overviewPanel).getByText("Modbus TCP")).toBeInTheDocument();
      expect(within(overviewPanel).getByText("25ms")).toBeInTheDocument();
    });
  });

  it("should display disconnected status when device is not connected", async () => {
    apiGetJson.mockResolvedValueOnce({
      connected: false,
      last_poll: "2026-07-13T10:00:00Z",
    });

    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      const overviewPanel = getTabPanel("overview");
      expect(within(overviewPanel).getByText("Disconnected")).toBeInTheDocument();
    });
  });

  it("should display registers in the registers tab", async () => {
    const user = userEvent.setup();
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const registersTab = tabs.find(tab => tab.textContent.includes("Registers"));
    await user.click(registersTab);

    await waitFor(() => {
      const registersPanel = getTabPanel("registers");
      expect(within(registersPanel).getByText("Temperature")).toBeInTheDocument();
      expect(within(registersPanel).getByText("Pressure")).toBeInTheDocument();
      expect(within(registersPanel).getByText("45.2")).toBeInTheDocument();
      expect(within(registersPanel).getByText("101.3")).toBeInTheDocument();
    });
  });

  it("should handle read registers", async () => {
    const user = userEvent.setup();
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const readTab = tabs.find(tab => tab.textContent.includes("Read"));
    await user.click(readTab);

    const addressInput = screen.getByLabelText("Start Address");
    const countInput = screen.getByLabelText("Count");

    fireEvent.change(addressInput, { target: { value: "40001" } });
    fireEvent.change(countInput, { target: { value: "5" } });

    const buttons = screen.getAllByTestId("button");
    const readButton = buttons.find(btn => btn.textContent.includes("Read Registers"));
    await user.click(readButton);

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/modbus/devices/${mockDevice.device_id}/read?tenant_id=${mockTenantId}`,
        {
          address: 40001,
          count: 5,
          register_type: "holding_register",
        }
      );
      expect(toast.success).toHaveBeenCalledWith("Registers read successfully");
    });
  });

  it("should handle write register", async () => {
    const user = userEvent.setup();
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const writeTab = tabs.find(tab => tab.textContent.includes("Write"));
    await user.click(writeTab);

    const addressInput = screen.getByLabelText("Address");
    const valueInput = screen.getByLabelText("Value");

    fireEvent.change(addressInput, { target: { value: "40001" } });
    fireEvent.change(valueInput, { target: { value: "100" } });

    const buttons = screen.getAllByTestId("button");
    const writeButton = buttons.find(btn => btn.textContent.includes("Write Register"));
    await user.click(writeButton);

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/modbus/devices/${mockDevice.device_id}/write?tenant_id=${mockTenantId}`,
        {
          address: 40001,
          value: 100,
          register_type: "holding_register",
        }
      );
      expect(toast.success).toHaveBeenCalledWith("Register written successfully");
    });
  });

  it("should handle read registers error", async () => {
    apiPostJson.mockRejectedValueOnce(new Error("Network error"));
    const user = userEvent.setup();
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const readTab = tabs.find(tab => tab.textContent.includes("Read"));
    await user.click(readTab);

    const buttons = screen.getAllByTestId("button");
    const readButton = buttons.find(btn => btn.textContent.includes("Read Registers"));
    await user.click(readButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to read registers");
    });
  });

  it("should handle write register error", async () => {
    apiPostJson.mockRejectedValueOnce(new Error("Network error"));
    const user = userEvent.setup();
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const writeTab = tabs.find(tab => tab.textContent.includes("Write"));
    await user.click(writeTab);

    const addressInput = screen.getByLabelText("Address");
    fireEvent.change(addressInput, { target: { value: "40001" } });

    const buttons = screen.getAllByTestId("button");
    const writeButton = buttons.find(btn => btn.textContent.includes("Write Register"));
    await user.click(writeButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to write register");
    });
  });

  it("should handle API error when fetching device data", async () => {
    apiGetJson.mockRejectedValueOnce(new Error("Network error"));
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load device details");
    });
  });

  it("should display error message when device has error", async () => {
    apiGetJson.mockResolvedValueOnce({
      connected: false,
      error: "Connection timeout",
    });

    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      const overviewPanel = getTabPanel("overview");
      expect(within(overviewPanel).getByText("Error: Connection timeout")).toBeInTheDocument();
    });
  });

  it("should handle refresh button click", async () => {
    const user = userEvent.setup();
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();

    const buttons = screen.getAllByTestId("button");
    const refreshButton = buttons.find(btn => 
      btn.querySelector('[data-testid="refresh-icon"]')
    );
    await user.click(refreshButton);

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/modbus/devices/${mockDevice.device_id}/data?tenant_id=${mockTenantId}`
      );
    });
  });

  it("should handle tenantId without query param", async () => {
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={null}
      />
    );

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/modbus/devices/${mockDevice.device_id}/data`
      );
    });
  });

  it("should display warning in write tab", async () => {
    const user = userEvent.setup();
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const writeTab = tabs.find(tab => tab.textContent.includes("Write"));
    await user.click(writeTab);

    expect(
      screen.getByText((_, element) => {
        if (!element || element.tagName.toLowerCase() !== "p") return false;
        return /Warning: Writing to registers can affect device operation/.test(
          element.textContent
        );
      })
    ).toBeInTheDocument();
  });

  it("should display empty state when no registers", async () => {
    apiGetJson.mockResolvedValueOnce({
      connected: true,
      readings: {},
    });

    const user = userEvent.setup();
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const registersTab = tabs.find(tab => tab.textContent.includes("Registers"));
    await user.click(registersTab);

    await waitFor(() => {
      const registersPanel = getTabPanel("registers");
      expect(within(registersPanel).getByText("No register data available")).toBeInTheDocument();
    });
  });

  // ============================================================
  // ADDITIONAL BRANCH COVERAGE TESTS
  // ============================================================

  it("should not fetch device data when device_id is missing", () => {
    render(
      <ModbusDeviceModal
        device={{ host: "10.0.0.5" }}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );
    expect(apiGetJson).not.toHaveBeenCalled();
  });

  it("should display Unknown status before device data resolves", async () => {
    let resolvePromise;
    apiGetJson.mockImplementation(
      () => new Promise((resolve) => { resolvePromise = resolve; })
    );

    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    const overviewPanel = getTabPanel("overview");
    expect(within(overviewPanel).getByText("Unknown")).toBeInTheDocument();

    resolvePromise(mockDeviceData);
    await waitForDeviceLoaded();
  });

  it("should default port to 502 and unit_id to 1 when not provided", async () => {
    render(
      <ModbusDeviceModal
        device={{ device_id: "modbus-2", host: "10.0.0.5" }}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );
    expect(screen.getByText("10.0.0.5:502 (Unit ID: 1)")).toBeInTheDocument();
    await waitForDeviceLoaded();
  });

  // ✅ NEW: Test for host fallback branch
  it("should default host to Unknown when not provided", async () => {
    render(
      <ModbusDeviceModal
        device={{ device_id: "modbus-3", port: 1502, unit_id: 2 }}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );
    expect(screen.getByText("Unknown:1502 (Unit ID: 2)")).toBeInTheDocument();
    await waitForDeviceLoaded();
  });

  it("should handle registers array with boolean values and missing name/type", async () => {
    apiGetJson.mockResolvedValueOnce({
      connected: true,
      registers: [
        { address: 40010, value: true },
        { address: 40011, value: false, name: "Pump", type: "coil" },
      ],
    });

    const user = userEvent.setup();
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();
    const tabs = screen.getAllByTestId("tabs-trigger");
    await user.click(tabs.find((t) => t.textContent.includes("Registers")));

    const registersPanel = getTabPanel("registers");
    expect(within(registersPanel).getAllByText("Address 40010")).toHaveLength(2);
    expect(within(registersPanel).getByText("1")).toBeInTheDocument();
    expect(within(registersPanel).getByText("Pump")).toBeInTheDocument();
    expect(within(registersPanel).getByText(/Address 40011 \(coil\)/)).toBeInTheDocument();
    expect(within(registersPanel).getByText("0")).toBeInTheDocument();
  });

  it("should handle registers provided as an address-value object map", async () => {
    apiGetJson.mockResolvedValueOnce({
      connected: true,
      registers: { "40020": 123, "40021": 456 },
      timestamp: "2026-07-13T10:00:00Z",
    });

    const user = userEvent.setup();
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();
    const tabs = screen.getAllByTestId("tabs-trigger");
    await user.click(tabs.find((t) => t.textContent.includes("Registers")));

    const registersPanel = getTabPanel("registers");
    expect(within(registersPanel).getAllByText("Address 40020")).toHaveLength(2);
    expect(within(registersPanel).getByText("123")).toBeInTheDocument();
    expect(within(registersPanel).getAllByText("Address 40021")).toHaveLength(2);
    expect(within(registersPanel).getByText("456")).toBeInTheDocument();
  });

  it("should handle readings with raw_value as an array and as a scalar", async () => {
    apiGetJson.mockResolvedValueOnce({
      connected: true,
      readings: {
        flow: { address: 40030, name: "Flow", raw_value: [77, 88], type: "int" },
        status: { address: 40031, name: "Status", raw_value: 5, type: "int" },
      },
    });

    const user = userEvent.setup();
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();
    const tabs = screen.getAllByTestId("tabs-trigger");
    await user.click(tabs.find((t) => t.textContent.includes("Registers")));

    const registersPanel = getTabPanel("registers");
    expect(within(registersPanel).getByText("77")).toBeInTheDocument();
    expect(within(registersPanel).getByText("5")).toBeInTheDocument();
  });

  it("should display N/A when response_time is missing", async () => {
    apiGetJson.mockResolvedValueOnce({ connected: true });

    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();
    const overviewPanel = getTabPanel("overview");
    expect(within(overviewPanel).getByText("N/A")).toBeInTheDocument();
  });

  it("should not display last poll time when last_poll is missing", async () => {
    apiGetJson.mockResolvedValueOnce({ connected: true, response_time: 10 });

    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();
    const overviewPanel = getTabPanel("overview");
    expect(within(overviewPanel).queryByText(/Last poll:/)).not.toBeInTheDocument();
  });

  it("should display N/A for an invalid register timestamp", async () => {
    apiGetJson.mockResolvedValueOnce({
      connected: true,
      registers: [{ address: 40040, value: 1, name: "Bad Timestamp" }],
      timestamp: "not-a-valid-date",
    });

    const user = userEvent.setup();
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();
    const tabs = screen.getAllByTestId("tabs-trigger");
    await user.click(tabs.find((t) => t.textContent.includes("Registers")));

    const registersPanel = getTabPanel("registers");
    expect(within(registersPanel).getByText("N/A")).toBeInTheDocument();
  });

  it("should call read/write endpoints without tenant_id when tenantId is not provided", async () => {
    const user = userEvent.setup();
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={null}
      />
    );

    await waitForDeviceLoaded();

    const tabs = screen.getAllByTestId("tabs-trigger");
    await user.click(tabs.find((t) => t.textContent.includes("Read")));
    const readButtons = screen.getAllByTestId("button");
    await user.click(readButtons.find((b) => b.textContent.includes("Read Registers")));

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/modbus/devices/${mockDevice.device_id}/read`,
        expect.any(Object)
      );
    });

    await user.click(tabs.find((t) => t.textContent.includes("Write")));
    const writeButtons = screen.getAllByTestId("button");
    await user.click(writeButtons.find((b) => b.textContent.includes("Write Register")));

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/modbus/devices/${mockDevice.device_id}/write`,
        expect.any(Object)
      );
    });
  });

  it("should show loading state on refresh button during fetch", async () => {
    const user = userEvent.setup();
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();

    let resolveFetch;
    apiGetJson.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFetch = resolve; })
    );

    const buttons = screen.getAllByTestId("button");
    const refreshButton = buttons.find((btn) =>
      btn.querySelector('[data-testid="refresh-icon"]')
    );

    expect(refreshButton).not.toBeDisabled();
    await user.click(refreshButton);
    expect(refreshButton).toBeDisabled();

    resolveFetch(mockDeviceData);

    await waitFor(() => {
      expect(refreshButton).not.toBeDisabled();
    });
  });

  it("should show no register data when neither readings nor registers are present", async () => {
    apiGetJson.mockResolvedValueOnce({
      connected: true,
    });

    const user = userEvent.setup();
    render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const registersTab = tabs.find(tab => tab.textContent.includes("Registers"));
    await user.click(registersTab);

    await waitFor(() => {
      const registersPanel = getTabPanel("registers");
      expect(within(registersPanel).getByText("No register data available")).toBeInTheDocument();
    });
  });

  it("should clear interval on unmount", async () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    
    const { unmount } = render(
      <ModbusDeviceModal
        device={mockDevice}
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitForDeviceLoaded();

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
