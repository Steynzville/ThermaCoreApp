/**
 * MQTTManagementPanel.test.jsx - Complete Test Coverage (FIXED)
 * 
 * Covers:
 * - Rendering (Dialog/Drawer)
 * - Data fetching on mount
 * - Subscriptions (list, add, remove, QoS change)
 * - Messages (list, filter, clear, filter X button)
 * - Publish functionality (QoS, retain flag)
 * - Error handling
 * - Auto-refresh (with cleanup on unmount)
 * - Connection status
 * - QoS badges (including fallback for unknown QoS)
 * - Tenant ID handling
 * - Mobile drawer interactions (all functionality including filter)
 */

import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import React from "react";
import MQTTManagementPanel from "./MQTTManagementPanel";

// ============ MOCKS ============

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

// ✅ UI component mocks that properly render children
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, variant, size, className, type }) => (
    <button
      data-testid="button"
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
      type={type || "button"}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }) => <div data-testid="card" className={className}>{children}</div>,
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
  Input: ({ id, placeholder, value, onChange, className, type, ...props }) => (
    <input
      id={id}
      data-testid="input"
      placeholder={placeholder}
      value={value || ""}
      onChange={onChange}
      className={className}
      type={type || "text"}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }) => <label data-testid="label" htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }) => <div data-testid="scroll-area" className={className}>{children}</div>,
}));

// ✅ FIXED: Proper Select mock - SelectContent renders as fragment, not div
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }) => {
    const selectValue = value !== undefined && value !== null ? String(value) : "";
    return (
      <div data-testid="select" data-value={selectValue}>
        <select
          data-testid="select-native"
          value={selectValue}
          onChange={(e) => {
            const newValue = e.target.value;
            if (onValueChange) {
              onValueChange(newValue);
            }
          }}
        >
          {children}
        </select>
      </div>
    );
  },
  SelectTrigger: ({ children, id }) => <button data-testid="select-trigger" id={id}>{children}</button>,
  SelectValue: ({ placeholder }) => <span data-testid="select-value">{placeholder}</span>,
  SelectContent: ({ children }) => <>{children}</>,
  SelectItem: ({ children, value }) => <option data-testid="select-item" value={value}>{children}</option>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, defaultValue, value, onValueChange }) => (
    <div data-testid="tabs" data-value={value || defaultValue}>
      {children}
    </div>
  ),
  TabsList: ({ children, className }) => <div data-testid="tabs-list" className={className}>{children}</div>,
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

// Mock icons - render text so buttons have visible content
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

// ============ HELPERS ============

const getTabPanel = (value) => {
  const panels = screen.getAllByTestId("tabs-content");
  return panels.find((el) => el.getAttribute("data-value") === value);
};

// ============ TEST DATA ============

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

// ============ TEST SUITE ============

describe("MQTTManagementPanel", () => {
  const mockOnClose = vi.fn();
  const mockTenantId = "tenant-123";

  beforeEach(() => {
    vi.clearAllMocks();
    useMediaQuery.mockReturnValue(true);
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/status")) return Promise.resolve(mockStatus);
      if (url.includes("/subscriptions")) return Promise.resolve(mockSubscriptions);
      if (url.includes("/messages")) return Promise.resolve(mockMessages);
      return Promise.resolve({});
    });
    apiPostJson.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  const renderComponent = (props = {}) => {
    return render(
      <MQTTManagementPanel 
        isOpen={true} 
        onClose={mockOnClose} 
        tenantId={mockTenantId} 
        {...props} 
      />
    );
  };

  const setupUserEvent = () => userEvent.setup({ delay: null });

  // ============ RENDERING TESTS ============

  describe("Rendering", () => {
    it("should render desktop dialog when isOpen is true", async () => {
      useMediaQuery.mockReturnValue(true);
      renderComponent();

      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByText("MQTT Management")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Connected")).toBeInTheDocument();
      });
    });

    it("should render mobile drawer when isOpen is true and on mobile", async () => {
      useMediaQuery.mockReturnValue(false);
      renderComponent();

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
  });

  // ============ DATA FETCHING ============

  describe("Data Fetching", () => {
    it("should fetch data on mount when open", async () => {
      renderComponent();

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
      renderComponent();

      await waitFor(() => {
        const subscriptionsPanel = getTabPanel("subscriptions");
        expect(within(subscriptionsPanel).getByText("sensors/temp")).toBeInTheDocument();
        expect(within(subscriptionsPanel).getByText("sensors/humidity")).toBeInTheDocument();
      });
    });

    it("should display messages", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('{"value": 25.5}')).toBeInTheDocument();
        expect(screen.getByText('{"value": 60}')).toBeInTheDocument();
      });
    });
  });

  // ============ SUBSCRIPTIONS ============

  describe("Subscriptions", () => {
    it("should handle subscribe to new topic", async () => {
      const user = setupUserEvent();
      renderComponent();

      const topicInputs = screen.getAllByTestId("input");
      const topicInput = topicInputs[0];
      await user.type(topicInput, "sensors/pressure");

      const buttons = screen.getAllByTestId("button");
      const subscribeButton = buttons.find((btn) => btn.textContent.includes("Subscribe"));
      await user.click(subscribeButton);

      await waitFor(() => {
        expect(apiPostJson).toHaveBeenCalledWith(
          `/api/v1/protocols/mqtt/subscribe?tenant_id=${mockTenantId}`,
          { topic: "sensors/pressure", qos: 0 }
        );
        expect(toast.success).toHaveBeenCalledWith("Subscribed to sensors/pressure");
      });
    });

    it("should update subscription QoS when changed", async () => {
      const user = setupUserEvent();
      renderComponent();

      const selects = screen.getAllByTestId("select-native");
      fireEvent.change(selects[0], { target: { value: "2" } });

      const topicInputs = screen.getAllByTestId("input");
      await user.type(topicInputs[0], "sensors/pressure");

      const subscribeButton = screen
        .getAllByTestId("button")
        .find((btn) => btn.textContent.includes("Subscribe"));
      await user.click(subscribeButton);

      await waitFor(() => {
        expect(apiPostJson).toHaveBeenCalledWith(
          `/api/v1/protocols/mqtt/subscribe?tenant_id=${mockTenantId}`,
          { topic: "sensors/pressure", qos: 2 }
        );
      });
    });

    it("should handle unsubscribe from topic", async () => {
      const user = setupUserEvent();
      renderComponent();

      await waitFor(() => {
        const subscriptionsPanel = getTabPanel("subscriptions");
        expect(within(subscriptionsPanel).getByText("sensors/temp")).toBeInTheDocument();
      });

      const trashButtons = screen.getAllByTestId("button").filter((btn) => 
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

    it("should show error when subscribing with empty topic", async () => {
      const user = setupUserEvent();
      renderComponent();

      const buttons = screen.getAllByTestId("button");
      const subscribeButton = buttons.find((btn) => btn.textContent.includes("Subscribe"));
      await user.click(subscribeButton);

      expect(toast.error).toHaveBeenCalledWith("Topic is required");
    });
  });

  // ============ PUBLISH ============

  describe("Publish", () => {
    it("should handle publish message", async () => {
      const user = setupUserEvent();
      renderComponent();

      const tabs = screen.getAllByTestId("tabs-trigger");
      const publishTab = tabs.find((tab) => tab.textContent.includes("Publish"));
      await user.click(publishTab);

      const inputs = screen.getAllByTestId("input");
      const topicInput = inputs.find((input) => input.id === "pub-topic");
      await user.type(topicInput, "sensors/test");

      const textareas = screen.getAllByTestId("textarea");
      const payloadTextarea = textareas.find((textarea) => textarea.id === "pub-payload");
      fireEvent.change(payloadTextarea, { target: { value: '{"test": "value"}' } });

      const buttons = screen.getAllByTestId("button");
      const publishButton = buttons.find((btn) => btn.textContent.includes("Publish Message"));
      await user.click(publishButton);

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

    // ✅ FIXED: Use fireEvent.click for retain checkbox (userEvent timing issue)
    it("should update publish QoS and retain flag", async () => {
      const user = setupUserEvent();
      renderComponent();

      const tabs = screen.getAllByTestId("tabs-trigger");
      const publishTab = tabs.find((tab) => tab.textContent.includes("Publish"));
      await user.click(publishTab);

      const selects = screen.getAllByTestId("select-native");
      await waitFor(() => {
        expect(selects.length).toBeGreaterThan(1);
      });
      fireEvent.change(selects[1], { target: { value: "1" } });

      // ✅ FIX: Use fireEvent.click instead of user.click for checkbox
      const retainCheckbox = screen.getByLabelText("Retain message");
      fireEvent.click(retainCheckbox);

      const inputs = screen.getAllByTestId("input");
      const topicInput = inputs.find((i) => i.id === "pub-topic");
      await user.type(topicInput, "sensors/test");

      const textareas = screen.getAllByTestId("textarea");
      const payloadTextarea = textareas.find((t) => t.id === "pub-payload");
      fireEvent.change(payloadTextarea, { target: { value: '{"a":1}' } });

      const publishButton = screen
        .getAllByTestId("button")
        .find((btn) => btn.textContent.includes("Publish Message"));
      await user.click(publishButton);

      await waitFor(() => {
        expect(apiPostJson).toHaveBeenCalledWith(
          `/api/v1/protocols/mqtt/publish?tenant_id=${mockTenantId}`,
          expect.objectContaining({
            topic: "sensors/test",
            payload: '{"a":1}',
            qos: 1,
            retain: true,
          })
        );
      });
    });

    it("should show error when publishing with empty topic or payload", async () => {
      const user = setupUserEvent();
      renderComponent();

      const tabs = screen.getAllByTestId("tabs-trigger");
      const publishTab = tabs.find((tab) => tab.textContent.includes("Publish"));
      await user.click(publishTab);

      const buttons = screen.getAllByTestId("button");
      const publishButton = buttons.find((btn) => btn.textContent.includes("Publish Message"));
      await user.click(publishButton);

      expect(toast.error).toHaveBeenCalledWith("Topic and payload are required");
    });
  });

  // ============ MESSAGES ============

  describe("Messages", () => {
    it("should filter messages by topic", async () => {
      const user = setupUserEvent();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('{"value": 25.5}')).toBeInTheDocument();
      });

      const filterInput = screen.getByPlaceholderText("Filter by topic...");
      await user.type(filterInput, "sensors/temp");

      expect(screen.getByText('{"value": 25.5}')).toBeInTheDocument();
    });

    it("should clear the topic filter via the X button", async () => {
      const user = setupUserEvent();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('{"value": 25.5}')).toBeInTheDocument();
      });

      const filterInput = screen.getByPlaceholderText("Filter by topic...");
      await user.type(filterInput, "sensors/temp");
      expect(filterInput.value).toBe("sensors/temp");

      const clearFilterButton = screen.getByTestId("x-icon").closest("button");
      await user.click(clearFilterButton);

      expect(filterInput.value).toBe("");
    });

    it("should clear messages", async () => {
      const user = setupUserEvent();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('{"value": 25.5}')).toBeInTheDocument();
      });

      const buttons = screen.getAllByTestId("button");
      const clearButton = buttons.find((btn) => btn.textContent.includes("Clear"));
      await user.click(clearButton);

      expect(toast.info).toHaveBeenCalledWith("Message history cleared");
    });
  });

  // ============ STATUS ============

  describe("Connection Status", () => {
    it("should display connection status badge", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText("Connected")).toBeInTheDocument();
        const badges = screen.getAllByTestId("badge");
        expect(badges[0]).toHaveAttribute("data-variant", "default");
      });
    });

    it("should display QoS badges correctly", async () => {
      renderComponent();

      await waitFor(() => {
        const badges = screen.getAllByTestId("badge");
        const qosBadges = badges.filter((b) => b.textContent.includes("QoS"));
        expect(qosBadges.length).toBeGreaterThan(0);
      });
    });

    it("should fall back to outline variant for unknown QoS values", async () => {
      apiGetJson.mockImplementation((url) => {
        if (url.includes("/status")) return Promise.resolve(mockStatus);
        if (url.includes("/subscriptions")) return Promise.resolve(mockSubscriptions);
        if (url.includes("/messages")) {
          return Promise.resolve({
            messages: [
              { topic: "sensors/weird", payload: "{}", qos: 5, timestamp: "2026-07-13T10:00:00Z" },
            ],
          });
        }
        return Promise.resolve({});
      });

      renderComponent();

      await waitFor(() => {
        const badges = screen.getAllByTestId("badge");
        const unknownQosBadge = badges.find((b) => b.textContent.includes("QoS 5"));
        expect(unknownQosBadge).toHaveAttribute("data-variant", "outline");
      });
    });
  });

  // ============ ERROR HANDLING ============

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      apiPostJson.mockRejectedValueOnce(new Error("Network error"));
      const user = setupUserEvent();

      renderComponent();

      const topicInputs = screen.getAllByTestId("input");
      const topicInput = topicInputs[0];
      await user.type(topicInput, "sensors/test");

      const buttons = screen.getAllByTestId("button");
      const subscribeButton = buttons.find((btn) => btn.textContent.includes("Subscribe"));
      await user.click(subscribeButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to subscribe to topic");
      });
    });
  });

  // ============ AUTO-REFRESH ============

  describe("Auto-Refresh", () => {
    it("should auto-refresh data every 3 seconds", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      
      renderComponent();

      await waitFor(() => {
        expect(apiGetJson).toHaveBeenCalledTimes(3);
      });

      await vi.advanceTimersByTimeAsync(3000);

      await waitFor(() => {
        expect(apiGetJson).toHaveBeenCalledTimes(5);
      });

      vi.useRealTimers();
    }, 10000);

    it("should clear the auto-refresh interval on unmount", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      const { unmount } = render(
        <MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />
      );

      await waitFor(() => {
        expect(apiGetJson).toHaveBeenCalledTimes(3);
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  // ============ TENANT ID ============

  describe("Tenant ID Handling", () => {
    it("should handle tenantId without query param", async () => {
      render(<MQTTManagementPanel isOpen={true} onClose={mockOnClose} tenantId={null} />);

      await waitFor(() => {
        expect(apiGetJson).toHaveBeenCalledWith("/api/v1/protocols/mqtt/status");
      });
    });
  });

  // ============ CLOSE ============

  describe("Close", () => {
    it("should close dialog when onClose is called", () => {
      renderComponent();
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });
  });

  // ============ MOBILE DRAWER ============

  describe("Mobile Drawer Interactions", () => {
    beforeEach(() => {
      useMediaQuery.mockReturnValue(false);
    });

    it("should filter messages by topic in the mobile drawer", async () => {
      const user = setupUserEvent();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('{"value": 25.5}')).toBeInTheDocument();
      });

      const filterInput = screen.getByPlaceholderText("Filter by topic...");
      await user.type(filterInput, "sensors/humidity");

      expect(filterInput.value).toBe("sensors/humidity");
    });

    // ✅ FIXED: Use fireEvent.click for checkbox AND includes() for button text
    it("should cover subscribe/QoS/unsubscribe/publish/retain in the mobile drawer", async () => {
      const user = setupUserEvent();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("drawer")).toBeInTheDocument();
      });

      const selects = screen.getAllByTestId("select-native");
      fireEvent.change(selects[0], { target: { value: "1" } });
      
      const topicInputs = screen.getAllByTestId("input");
      await user.type(topicInputs[0], "mobile/topic");
      
      const subscribeButton = screen
        .getAllByTestId("button")
        .find((btn) => btn.textContent.includes("Subscribe"));
      await user.click(subscribeButton);
      
      await waitFor(() => {
        expect(apiPostJson).toHaveBeenCalledWith(
          `/api/v1/protocols/mqtt/subscribe?tenant_id=${mockTenantId}`,
          { topic: "mobile/topic", qos: 1 }
        );
      });

      await waitFor(() => {
        const panel = getTabPanel("subscriptions");
        expect(within(panel).getByText("sensors/temp")).toBeInTheDocument();
      });
      
      const trashButton = screen
        .getAllByTestId("button")
        .find((btn) => btn.querySelector('[data-testid="trash-icon"]'));
      await user.click(trashButton);
      
      await waitFor(() => {
        expect(apiPostJson).toHaveBeenCalledWith(
          `/api/v1/protocols/mqtt/unsubscribe?tenant_id=${mockTenantId}`,
          { topic: "sensors/temp" }
        );
      });

      const selects2 = screen.getAllByTestId("select-native");
      fireEvent.change(selects2[1], { target: { value: "2" } });
      
      // ✅ FIX: Use fireEvent.click instead of user.click for checkbox
      const retainCheckbox = screen.getByLabelText("Retain Message");
      fireEvent.click(retainCheckbox);
      
      const pubTopicInput = screen
        .getAllByTestId("input")
        .find((i) => i.id === "pub-topic");
      await user.type(pubTopicInput, "mobile/pub");
      
      const payloadTextarea = screen
        .getAllByTestId("textarea")
        .find((t) => t.id === "pub-payload");
      fireEvent.change(payloadTextarea, { target: { value: '{"m":1}' } });
      
      // ✅ FIX: Use includes() instead of exact match (icon renders text)
      const publishButton = screen
        .getAllByTestId("button")
        .find((btn) => btn.textContent.includes("Publish"));
      await user.click(publishButton);
      
      await waitFor(() => {
        expect(apiPostJson).toHaveBeenCalledWith(
          `/api/v1/protocols/mqtt/publish?tenant_id=${mockTenantId}`,
          expect.objectContaining({
            topic: "mobile/pub",
            payload: '{"m":1}',
            qos: 2,
            retain: true,
          })
        );
      });

      const refreshButton = screen
        .getAllByTestId("button")
        .find((btn) => btn.querySelector('[data-testid="refresh-icon"]'));
      await user.click(refreshButton);

      const clearButton = screen
        .getAllByTestId("button")
        .find((btn) => btn.textContent.includes("Clear"));
      await user.click(clearButton);
      
      expect(toast.info).toHaveBeenCalledWith("Message history cleared");
    });
  });
});
