import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  SelectTrigger: ({ children, id }) => <div data-testid="select-trigger" id={id}>{children}</div>,
  SelectValue: () => <span data-testid="select-value">Select value</span>,
  SelectContent: ({ children }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }) => <option data-testid="select-item" value={value}>{children}</option>,
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

// Helper: since the Tabs mock renders ALL TabsContent panels simultaneously
// (it ignores the active tab value), text like a topic name can legitimately
// appear in multiple panels at once (Subscriptions, Messages, Topic Hierarchy).
// This scopes queries to a specific panel by its data-value.
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
    useMediaQuery.mockReturnValue(true); // Desktop mode by default
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/status")) return Promise.resolve(mockStatus);
      if (url.includes("/subscriptions")) return Promise.resolve(mockSubscriptions);
      if (url.includes("/messages")) return Promise.resolve(mockMessages);
      return Promise.resolve({});
    });
    apiPostJson.mockResolvedValue({ success: true });
  });

  it("should render desktop dialog when isOpen is true", async () => {
    useMediaQuery.mockReturnValue(true);
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText("MQTT Management")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });
  });

  it("should render mobile drawer when isOpen is true and on mobile", async () => {
    useMediaQuery.mockReturnValue(false);
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    expect(screen.getByTestId("drawer")).toBeInTheDocument();
    expect(screen.getByText("MQTT Management")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });
  });

  it("should not render when isOpen is false", () => {
    render(<MQTTManagementPanel isOpen={false} onClose={mockOnClose} tenantId={mockTenantId} />);

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
  });

  it("should fetch data on mount when open", async () => {
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    await waitFor(() => {
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
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    await waitFor(() => {
      const subscriptionsPanel = getTabPanel("subscriptions");
      expect(within(subscriptionsPanel).getByText("sensors/temp")).toBeInTheDocument();
      expect(within(subscriptionsPanel).getByText("sensors/humidity")).toBeInTheDocument();
    });
  });

  it("should display messages", async () => {
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    await waitFor(() => {
      expect(screen.getByText('{"value": 25.5}')).toBeInTheDocument();
      expect(screen.getByText('{"value": 60}')).toBeInTheDocument();
    });
  });

  it("should handle subscribe to new topic", async () => {
    const user = userEvent.setup();
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    const topicInputs = screen.getAllByTestId("input");
    const topicInput = topicInputs[0];
    await user.type(topicInput, "sensors/pressure");

    const buttons = screen.getAllByTestId("button");
    const subscribeButton = buttons.find(btn => btn.textContent.includes("Subscribe"));
    await user.click(subscribeButton);

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/mqtt/subscribe?tenant_id=${mockTenantId}`,
        { topic: "sensors/pressure", qos: 0 }
      );
      expect(toast.success).toHaveBeenCalledWith("Subscribed to sensors/pressure");
    });
  });

  it("should handle unsubscribe from topic", async () => {
    const user = userEvent.setup();
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    await waitFor(() => {
      const subscriptionsPanel = getTabPanel("subscriptions");
      expect(within(subscriptionsPanel).getByText("sensors/temp")).toBeInTheDocument();
    });

    const trashButtons = screen.getAllByTestId("button").filter(btn => 
      btn.querySelector('[data-testid="trash-icon"]')
    );
    await user.click(trashButtons[0]);

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/mqtt/unsubscribe?tenant_id=${mockTenantId}`,
        { topic: "sensors/temp" }
      );
      expect(toast.success).toHaveBeenCalledWith("Unsubscribed from sensors/temp");
    });
  });

  it("should handle publish message", async () => {
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    // Click on Publish tab
    const tabs = screen.getAllByTestId("tabs-trigger");
    const publishTab = tabs.find(tab => tab.textContent.includes("Publish"));
    fireEvent.click(publishTab);

    // Find topic input and enter topic
    const inputs = screen.getAllByTestId("input");
    const topicInput = inputs.find(input => input.id === "pub-topic");
    fireEvent.change(topicInput, { target: { value: "sensors/test" } });

    // Find textarea and enter payload using fireEvent to avoid curly brace escaping
    const textareas = screen.getAllByTestId("textarea");
    const payloadTextarea = textareas.find(textarea => textarea.id === "pub-payload");
    fireEvent.change(payloadTextarea, { target: { value: '{"test": "value"}' } });

    // Find and click Publish button
    const buttons = screen.getAllByTestId("button");
    const publishButton = buttons.find(btn => btn.textContent.includes("Publish Message"));
    fireEvent.click(publishButton);

    await waitFor(() => {
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

  it("should filter messages by topic", async () => {
    const user = userEvent.setup();
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    await waitFor(() => {
      expect(screen.getByText('{"value": 25.5}')).toBeInTheDocument();
    });

    const filterInput = screen.getByPlaceholderText("Filter by topic...");
    await user.type(filterInput, "sensors/temp");

    expect(screen.getByText('{"value": 25.5}')).toBeInTheDocument();
  });

  it("should clear messages", async () => {
    const user = userEvent.setup();
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    await waitFor(() => {
      expect(screen.getByText('{"value": 25.5}')).toBeInTheDocument();
    });

    const buttons = screen.getAllByTestId("button");
    const clearButton = buttons.find(btn => btn.textContent.includes("Clear"));
    await user.click(clearButton);

    expect(toast.info).toHaveBeenCalledWith("Message history cleared");
  });

  it("should handle API errors gracefully", async () => {
    apiPostJson.mockRejectedValueOnce(new Error("Network error"));
    const user = userEvent.setup();

    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    const topicInputs = screen.getAllByTestId("input");
    const topicInput = topicInputs[0];
    await user.type(topicInput, "sensors/test");

    const buttons = screen.getAllByTestId("button");
    const subscribeButton = buttons.find(btn => btn.textContent.includes("Subscribe"));
    await user.click(subscribeButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to subscribe to topic");
    });
  });

  it("should show error when subscribing with empty topic", async () => {
    const user = userEvent.setup();
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    const buttons = screen.getAllByTestId("button");
    const subscribeButton = buttons.find(btn => btn.textContent.includes("Subscribe"));
    await user.click(subscribeButton);

    expect(toast.error).toHaveBeenCalledWith("Topic is required");
  });

  it("should show error when publishing with empty topic or payload", async () => {
    const user = userEvent.setup();
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    const tabs = screen.getAllByTestId("tabs-trigger");
    const publishTab = tabs.find(tab => tab.textContent.includes("Publish"));
    await user.click(publishTab);

    const buttons = screen.getAllByTestId("button");
    const publishButton = buttons.find(btn => btn.textContent.includes("Publish Message"));
    await user.click(publishButton);

    expect(toast.error).toHaveBeenCalledWith("Topic and payload are required");
  });

  it("should display connection status badge", async () => {
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    await waitFor(() => {
      expect(screen.getByText("Connected")).toBeInTheDocument();
      const badges = screen.getAllByTestId("badge");
      expect(badges[0]).toHaveAttribute("data-variant", "default");
    });
  });

  it("should auto-refresh data every 3 seconds", async () => {
    vi.useFakeTimers();
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    // Initial calls: 3 (status, subscriptions, messages)
    await vi.waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledTimes(3);
    });

    // After 3 seconds: auto-refresh calls status + messages (not subscriptions)
    await vi.advanceTimersByTimeAsync(3000);

    // Total calls: 3 initial + 2 refresh = 5
    await vi.waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledTimes(5);
    });

    vi.useRealTimers();
  });

  it("should display QoS badges correctly", async () => {
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    await waitFor(() => {
      const badges = screen.getAllByTestId("badge");
      const qosBadges = badges.filter(b => b.textContent.includes("QoS"));
      expect(qosBadges.length).toBeGreaterThan(0);
    });
  });

  it("should close dialog when onClose is called", () => {
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });

  it("should handle tenantId without query param", async () => {
    render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={null} />);

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith("/api/v1/protocols/mqtt/status");
    });
  });
});
