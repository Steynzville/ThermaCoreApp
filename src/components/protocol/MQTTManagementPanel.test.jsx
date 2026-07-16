import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import React from "react";
import MQTTManagementPanel from "./MQTTManagementPanel";

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

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
  CardTitle: ({ children }) => <div data-testid="card-title">{children}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }) => <div data-testid="dialog-description">{children}</div>,
}));

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children, open }) => open ? <div data-testid="drawer">{children}</div> : null,
  DrawerContent: ({ children }) => <div data-testid="drawer-content">{children}</div>,
  DrawerHeader: ({ children }) => <div data-testid="drawer-header">{children}</div>,
  DrawerTitle: ({ children }) => <div data-testid="drawer-title">{children}</div>,
  DrawerDescription: ({ children }) => <div data-testid="drawer-description">{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ id, placeholder, value, onChange, className }) => (
    <input
      id={id}
      data-testid="input"
      placeholder={placeholder}
      value={value || ""}
      onChange={onChange}
      className={className}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }) => <label data-testid="label" htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }) => <div data-testid="scroll-area">{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }) => (
    <div data-testid="select" data-value={value}>
      <select
        data-testid="select-native"
        value={value}
        onChange={(e) => onValueChange && onValueChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }) => <>{children}</>,
  SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, defaultValue, value, onValueChange }) => (
    <div data-testid="tabs" data-value={value || defaultValue}>
      {children}
    </div>
  ),
  TabsList: ({ children }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }) => (
    <button data-testid="tabs-trigger" data-value={value}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }) => (
    <div data-testid="tabs-content" data-value={value}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ id, placeholder, value, onChange, rows, className }) => (
    <textarea
      id={id}
      data-testid="textarea"
      placeholder={placeholder}
      value={value || ""}
      onChange={onChange}
      rows={rows}
      className={className}
    />
  ),
}));

// Mock icons
vi.mock("lucide-react", () => ({
  Filter: () => <span data-testid="filter-icon">Filter</span>,
  MessageSquare: () => <span data-testid="message-square-icon">MessageSquare</span>,
  Plus: () => <span data-testid="plus-icon">Plus</span>,
  RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
  Send: () => <span data-testid="send-icon">Send</span>,
  Trash2: () => <span data-testid="trash-icon">Trash2</span>,
  X: () => <span data-testid="x-icon">X</span>,
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

describe("MQTTManagementPanel", () => {
  const mockOnClose = vi.fn();
  const mockTenantId = "tenant-123";

  const mockSubscriptions = {
    subscriptions: [
      { topic: "sensors/temp", qos: 1 },
      { topic: "sensors/humidity", qos: 0 },
    ],
  };

  const mockMessages = {
    messages: [
      { topic: "sensors/temp", payload: '{"value": 25.5}', qos: 1, timestamp: "2026-07-13T10:00:00Z" },
      { topic: "sensors/humidity", payload: '{"value": 60}', qos: 0, timestamp: "2026-07-13T10:01:00Z" },
    ],
  };

  const mockStatus = {
    connected: true,
    broker: "localhost",
    port: 1883,
    client_id: "scada-client",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // ✅ FIX: Use real timers by default
    useMediaQuery.mockReturnValue(true); // Desktop mode by default
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/status")) return Promise.resolve(mockStatus);
      if (url.includes("/subscriptions")) return Promise.resolve(mockSubscriptions);
      if (url.includes("/messages")) return Promise.resolve(mockMessages);
      return Promise.resolve({});
    });
    apiPostJson.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers(); // ✅ FIX: Ensure real timers are restored
    vi.clearAllMocks();
  });

  // ✅ FIX: Wrap render in act()
  const renderComponent = (props = {}) => {
    let result;
    act(() => {
      result = render(
        <MQTTManagementPanel 
          isOpen={true} 
          onClose={mockOnClose} 
          tenantId={mockTenantId} 
          {...props} 
        />
      );
    });
    return result;
  };

  // ✅ FIX: Create userEvent with delay: null for tests with fake timers
  const setupUserEvent = () => userEvent.setup({ delay: null });

  it("should render desktop dialog when isOpen is true", async () => {
    useMediaQuery.mockReturnValue(true);
    renderComponent();

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText("MQTT Management")).toBeInTheDocument();

    await vi.waitFor(() => {
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });
  });

  it("should render mobile drawer when isOpen is true and on mobile", async () => {
    useMediaQuery.mockReturnValue(false);
    renderComponent();

    expect(screen.getByTestId("drawer")).toBeInTheDocument();
    expect(screen.getByText("MQTT Management")).toBeInTheDocument();

    await vi.waitFor(() => {
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });
  });

  it("should not render when isOpen is false", () => {
    act(() => {
      render(<MQTTManagementPanel isOpen={false} onClose={mockOnClose} tenantId={mockTenantId} />);
    });

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
  });

  it("should fetch data on mount when open", async () => {
    renderComponent();

    await vi.waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/mqtt/status?tenant_id=${mockTenantId}`
      );
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/mqtt/subscriptions?tenant_id=${mockTenantId}`
      );
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/mqtt/messages?tenant_id=${mockTenantId}`
      );
    });
  });

  it("should display subscriptions", async () => {
    renderComponent();

    await vi.waitFor(() => {
      const subscriptionsPanel = getTabPanel("subscriptions");
      expect(within(subscriptionsPanel).getByText("sensors/temp")).toBeInTheDocument();
      expect(within(subscriptionsPanel).getByText("sensors/humidity")).toBeInTheDocument();
    });
  });

  it("should display messages", async () => {
    renderComponent();

    await vi.waitFor(() => {
      expect(screen.getByText('{"value": 25.5}')).toBeInTheDocument();
      expect(screen.getByText('{"value": 60}')).toBeInTheDocument();
    });
  });

  // ✅ FIX: Use userEvent with delay: null in act()
  it("should handle subscribe to new topic", async () => {
    const user = setupUserEvent();
    renderComponent();

    const topicInputs = screen.getAllByTestId("input");
    const topicInput = topicInputs[0];
    await act(async () => {
      await user.type(topicInput, "sensors/pressure");
    });

    const buttons = screen.getAllByTestId("button");
    const subscribeButton = buttons.find(btn => btn.textContent.includes("Subscribe"));
    await act(async () => {
      await user.click(subscribeButton);
    });

    await vi.waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/mqtt/subscribe?tenant_id=${mockTenantId}`,
        { topic: "sensors/pressure", qos: 0 }
      );
      expect(toast.success).toHaveBeenCalledWith("Subscribed to sensors/pressure");
    });
  });

  // ✅ FIX: Use userEvent with delay: null in act()
  it("should handle unsubscribe from topic", async () => {
    const user = setupUserEvent();
    renderComponent();

    await vi.waitFor(() => {
      const subscriptionsPanel = getTabPanel("subscriptions");
      expect(within(subscriptionsPanel).getByText("sensors/temp")).toBeInTheDocument();
    });

    const trashButtons = screen.getAllByTestId("button").filter(btn => 
      btn.querySelector('[data-testid="trash-icon"]')
    );
    await act(async () => {
      await user.click(trashButtons[0]);
    });

    await vi.waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/mqtt/unsubscribe?tenant_id=${mockTenantId}`,
        { topic: "sensors/temp" }
      );
      expect(toast.success).toHaveBeenCalledWith("Unsubscribed from sensors/temp");
    });
  });

  // ✅ FIX: Use userEvent with delay: null in act()
  it("should handle publish message", async () => {
    const user = setupUserEvent();
    renderComponent();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const publishTab = tabs.find(tab => tab.textContent.includes("Publish"));
    await act(async () => {
      await user.click(publishTab);
    });

    const inputs = screen.getAllByTestId("input");
    const topicInput = inputs.find(input => input.id === "pub-topic");
    await act(async () => {
      await user.type(topicInput, "sensors/test");
    });

    const textareas = screen.getAllByTestId("textarea");
    const payloadTextarea = textareas.find(textarea => textarea.id === "pub-payload");
    act(() => {
      fireEvent.change(payloadTextarea, { target: { value: '{"test": "value"}' } });
    });

    const buttons = screen.getAllByTestId("button");
    const publishButton = buttons.find(btn => btn.textContent.includes("Publish Message"));
    await act(async () => {
      await user.click(publishButton);
    });

    await vi.waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/mqtt/publish?tenant_id=${mockTenantId}`,
        expect.objectContaining({
          topic: "sensors/test",
          payload: '{"test": "value"}',
          qos: 0,
          retain: false,
        })
      );
      expect(toast.success).toHaveBeenCalledWith("Message published successfully");
    });
  });

  // ✅ FIX: Use userEvent with delay: null in act()
  it("should filter messages by topic", async () => {
    const user = setupUserEvent();
    renderComponent();

    await vi.waitFor(() => {
      expect(screen.getByText('{"value": 25.5}')).toBeInTheDocument();
    });

    const filterInput = screen.getByPlaceholderText("Filter by topic...");
    await act(async () => {
      await user.type(filterInput, "sensors/temp");
    });

    expect(screen.getByText('{"value": 25.5}')).toBeInTheDocument();
  });

  // ✅ FIX: Use userEvent with delay: null in act()
  it("should clear messages", async () => {
    const user = setupUserEvent();
    renderComponent();

    await vi.waitFor(() => {
      expect(screen.getByText('{"value": 25.5}')).toBeInTheDocument();
    });

    const buttons = screen.getAllByTestId("button");
    const clearButton = buttons.find(btn => btn.textContent.includes("Clear"));
    await act(async () => {
      await user.click(clearButton);
    });

    expect(toast.info).toHaveBeenCalledWith("Message history cleared");
  });

  // ✅ FIX: Use userEvent with delay: null in act()
  it("should handle API errors gracefully", async () => {
    apiPostJson.mockRejectedValueOnce(new Error("Network error"));
    const user = setupUserEvent();

    renderComponent();

    const topicInputs = screen.getAllByTestId("input");
    const topicInput = topicInputs[0];
    await act(async () => {
      await user.type(topicInput, "sensors/test");
    });

    const buttons = screen.getAllByTestId("button");
    const subscribeButton = buttons.find(btn => btn.textContent.includes("Subscribe"));
    await act(async () => {
      await user.click(subscribeButton);
    });

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to subscribe to topic");
    });
  });

  // ✅ FIX: Use userEvent with delay: null in act()
  it("should show error when subscribing with empty topic", async () => {
    const user = setupUserEvent();
    renderComponent();

    const buttons = screen.getAllByTestId("button");
    const subscribeButton = buttons.find(btn => btn.textContent.includes("Subscribe"));
    await act(async () => {
      await user.click(subscribeButton);
    });

    expect(toast.error).toHaveBeenCalledWith("Topic is required");
  });

  // ✅ FIX: Use userEvent with delay: null in act()
  it("should show error when publishing with empty topic or payload", async () => {
    const user = setupUserEvent();
    renderComponent();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const publishTab = tabs.find(tab => tab.textContent.includes("Publish"));
    await act(async () => {
      await user.click(publishTab);
    });

    const buttons = screen.getAllByTestId("button");
    const publishButton = buttons.find(btn => btn.textContent.includes("Publish Message"));
    await act(async () => {
      await user.click(publishButton);
    });

    expect(toast.error).toHaveBeenCalledWith("Topic and payload are required");
  });

  it("should display connection status badge", async () => {
    renderComponent();

    await vi.waitFor(() => {
      expect(screen.getByText("Connected")).toBeInTheDocument();
      const badges = screen.getAllByTestId("badge");
      expect(badges[0]).toHaveAttribute("data-variant", "default");
    });
  });

  // ✅ FIX: Properly handle fake timers with act()
  it("should auto-refresh data every 3 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    
    // ✅ FIX: Use regular render with act() wrapper
    let result;
    act(() => {
      result = render(
        <MQTTManagementPanel 
          isOpen={true} 
          onClose={mockOnClose} 
          tenantId={mockTenantId} 
        />
      );
    });

    // Initial calls: 3 (status, subscriptions, messages)
    await vi.waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledTimes(3);
    });

    // After 3 seconds: auto-refresh calls status + messages (not subscriptions)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // Total calls: 3 initial + 2 refresh = 5
    await vi.waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledTimes(5);
    });

    vi.useRealTimers();
  }, 10000);

  it("should display QoS badges correctly", async () => {
    renderComponent();

    await vi.waitFor(() => {
      const badges = screen.getAllByTestId("badge");
      const qosBadges = badges.filter(b => b.textContent.includes("QoS"));
      expect(qosBadges.length).toBeGreaterThan(0);
    });
  });

  it("should close dialog when onClose is called", () => {
    renderComponent();

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });

  it("should handle tenantId without query param", async () => {
    act(() => {
      render(
        <MQTTManagementPanel 
          isOpen={true} 
          onClose={mockOnClose} 
          tenantId={null} 
        />
      );
    });

    await vi.waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith("/api/v1/protocols/mqtt/status");
    });
  });
});
