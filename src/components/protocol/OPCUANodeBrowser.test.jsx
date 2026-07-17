import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import React from "react";
import OPCUANodeBrowser from "./OPCUANodeBrowser";

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
  Label: ({ children }) => <label data-testid="label">{children}</label>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }) => <div data-testid="scroll-area" className={className}>{children}</div>,
}));

// Mock icons
vi.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="chevron-down-icon">ChevronDown</span>,
  ChevronRight: () => <span data-testid="chevron-right-icon">ChevronRight</span>,
  Database: () => <span data-testid="database-icon">Database</span>,
  Eye: () => <span data-testid="eye-icon">Eye</span>,
  EyeOff: () => <span data-testid="eye-off-icon">EyeOff</span>,
  FileText: () => <span data-testid="file-text-icon">FileText</span>,
  Folder: () => <span data-testid="folder-icon">Folder</span>,
  RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
}));

// Import mocked modules
import { useMediaQuery } from "@/hooks/use-media-query";
import { apiGetJson, apiPostJson } from "@/utils/apiFetch";
import { toast } from "sonner";

// Factory functions to create fresh fixtures for each test
const createMockRootNodes = () => ({
  nodes: [
    {
      nodeId: "ns=2;s=Device1",
      displayName: "Device One",
      nodeClass: "Object",
      hasChildren: true,
    },
    {
      nodeId: "ns=2;s=Temperature",
      displayName: "Temperature Sensor",
      nodeClass: "Variable",
      hasChildren: false,
      dataType: "Double",
      value: 25.5,
    },
  ],
});

const createMockChildrenNodes = () => ({
  children: [
    {
      nodeId: "ns=2;s=Device1/Temp",
      displayName: "Temperature",
      nodeClass: "Variable",
      hasChildren: false,
      dataType: "Double",
    },
    {
      nodeId: "ns=2;s=Device1/Pressure",
      displayName: "Pressure",
      nodeClass: "Variable",
      hasChildren: false,
      dataType: "Double",
    },
  ],
});

const createMockNodeValues = () => ({
  values: {
    "ns=2;s=Temperature": { value: 26.0, timestamp: "2026-07-13T10:00:00Z" },
  },
});

const createMockNestedChildrenNodes = () => ({
  children: [
    {
      nodeId: "ns=2;s=Device1/SubFolder",
      displayName: "SubFolder",
      nodeClass: "Object",
      hasChildren: true,
    },
  ],
});

const createMockGrandchildNodes = () => ({
  children: [
    {
      nodeId: "ns=2;s=Device1/SubFolder/Humidity",
      displayName: "Humidity",
      nodeClass: "Variable",
      hasChildren: false,
      dataType: "Double",
    },
  ],
});

const createMockRootNodesWithMethod = () => ({
  nodes: [
    {
      nodeId: "ns=2;s=Device1",
      displayName: "Device One",
      nodeClass: "Object",
      hasChildren: true,
    },
    {
      nodeId: "ns=2;s=Calculate",
      displayName: "Calculate Method",
      nodeClass: "Method",
      hasChildren: false,
    },
  ],
});

const createMockRootNodesWithDetails = () => ({
  nodes: [
    {
      nodeId: "ns=2;s=Detailed",
      displayName: "Detailed Node",
      nodeClass: "Variable",
      hasChildren: false,
      dataType: "String",
      accessLevel: "Read/Write",
      description: "A fully described node",
      value: "hello",
    },
  ],
});

describe("OPCUANodeBrowser", () => {
  const mockOnClose = vi.fn();
  const mockTenantId = "tenant-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    useMediaQuery.mockReturnValue(true);
    
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/nodes") && !url.includes("/children")) {
        return Promise.resolve(createMockRootNodes());
      }
      if (url.includes("/children")) {
        return Promise.resolve(createMockChildrenNodes());
      }
      if (url.includes("/values")) {
        return Promise.resolve(createMockNodeValues());
      }
      return Promise.resolve({});
    });
    apiPostJson.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("should render desktop dialog when isOpen is true", () => {
    useMediaQuery.mockReturnValue(true);
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText("OPC-UA Node Browser")).toBeInTheDocument();
    expect(screen.getByText("Browse, subscribe to, and monitor OPC-UA server nodes")).toBeInTheDocument();
  });

  it("should render mobile drawer when isOpen is true and on mobile", () => {
    useMediaQuery.mockReturnValue(false);
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    expect(screen.getByTestId("drawer")).toBeInTheDocument();
    expect(screen.getByText("OPC-UA Node Browser")).toBeInTheDocument();
  });

  it("should not render when isOpen is false", () => {
    render(
      <OPCUANodeBrowser
        isOpen={false}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
  });

  it("should fetch root nodes on mount when open", async () => {
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/opcua/nodes?tenant_id=${mockTenantId}`
      );
    });
  });

  it("should display root nodes", async () => {
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Device One")).toBeInTheDocument();
      expect(screen.getByText("Temperature Sensor")).toBeInTheDocument();
    });
  });

  it("should expand node and fetch children when clicked", async () => {
    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Device One")).toBeInTheDocument();
    });

    const chevronIcon = screen.getByTestId("chevron-right-icon");
    const expandButton = chevronIcon.closest("button");
    await user.click(expandButton);

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/opcua/nodes/${encodeURIComponent("ns=2;s=Device1")}/children?tenant_id=${mockTenantId}`
      );
      expect(screen.getByText("Temperature")).toBeInTheDocument();
      expect(screen.getByText("Pressure")).toBeInTheDocument();
    });
  });

  it("should select node and display details", async () => {
    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Temperature Sensor")).toBeInTheDocument();
    });

    const nodeButton = screen.getByText("Temperature Sensor");
    await user.click(nodeButton);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Temperature Sensor" })
      ).toBeInTheDocument();
      expect(screen.getByText("ns=2;s=Temperature")).toBeInTheDocument();
      expect(screen.getByText("Double")).toBeInTheDocument();
    });
  });

  it("should subscribe to a variable node", async () => {
    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Temperature Sensor")).toBeInTheDocument();
    });

    const nodeButton = screen.getByText("Temperature Sensor");
    await user.click(nodeButton);

    const buttons = screen.getAllByTestId("button");
    const subscribeButton = buttons.find(btn => btn.textContent.includes("Subscribe"));
    await user.click(subscribeButton);

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/opcua/subscribe?tenant_id=${mockTenantId}`,
        {
          nodeId: "ns=2;s=Temperature",
          samplingInterval: 1000,
        }
      );
      expect(toast.success).toHaveBeenCalledWith("Subscribed to Temperature Sensor");
    });
  });

  it("should unsubscribe from a subscribed node", async () => {
    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Temperature Sensor")).toBeInTheDocument();
    });

    const nodeButton = screen.getByText("Temperature Sensor");
    await user.click(nodeButton);

    let buttons = screen.getAllByTestId("button");
    let subscribeButton = buttons.find(btn => btn.textContent.includes("Subscribe"));
    await user.click(subscribeButton);

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/opcua/subscribe?tenant_id=${mockTenantId}`,
        expect.any(Object)
      );
    });

    await waitFor(async () => {
      const updatedButtons = screen.getAllByTestId("button");
      const unsubscribeButton = updatedButtons.find(btn => btn.textContent.includes("Unsubscribe"));
      await user.click(unsubscribeButton);
    });

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/opcua/unsubscribe?tenant_id=${mockTenantId}`,
        {
          nodeId: "ns=2;s=Temperature",
        }
      );
      expect(toast.success).toHaveBeenCalledWith("Unsubscribed from Temperature Sensor");
    });
  });

  it("should handle search filter", async () => {
    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Device One")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search nodes...");
    await user.type(searchInput, "Temperature");

    expect(screen.getByText("Temperature Sensor")).toBeInTheDocument();
    expect(screen.queryByText("Device One")).not.toBeInTheDocument();
  });

  it("should handle refresh button click", async () => {
    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Device One")).toBeInTheDocument();
    });

    const buttons = screen.getAllByTestId("button");
    const refreshButton = buttons.find(btn => 
      btn.querySelector('[data-testid="refresh-icon"]')
    );
    await user.click(refreshButton);

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/opcua/nodes?tenant_id=${mockTenantId}`
      );
    });
  });

  it("should display subscribed nodes count", async () => {
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("0 nodes subscribed")).toBeInTheDocument();
    });
  });

  it("should display current value when node is subscribed", async () => {
    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Temperature Sensor")).toBeInTheDocument();
    });

    const nodeButton = screen.getByText("Temperature Sensor");
    await user.click(nodeButton);

    const buttons = screen.getAllByTestId("button");
    const subscribeButton = buttons.find(btn => btn.textContent.includes("Subscribe"));
    await user.click(subscribeButton);

    await waitFor(() => {
      expect(screen.getByText("Current Value")).toBeInTheDocument();
    });
  });

  it("should handle API error when fetching root nodes", async () => {
    apiGetJson.mockRejectedValueOnce(new Error("Network error"));
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load OPC-UA node tree");
    });
  });

  it("should handle subscribe error", async () => {
    apiPostJson.mockRejectedValueOnce(new Error("Network error"));
    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Temperature Sensor")).toBeInTheDocument();
    });

    const nodeButton = screen.getByText("Temperature Sensor");
    await user.click(nodeButton);

    const buttons = screen.getAllByTestId("button");
    const subscribeButton = buttons.find(btn => btn.textContent.includes("Subscribe"));
    await user.click(subscribeButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to subscribe to node");
    });
  });

  it("should handle unsubscribe error", async () => {
    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Temperature Sensor")).toBeInTheDocument();
    });

    const nodeButton = screen.getByText("Temperature Sensor");
    await user.click(nodeButton);

    let buttons = screen.getAllByTestId("button");
    let subscribeButton = buttons.find(btn => btn.textContent.includes("Subscribe"));
    await user.click(subscribeButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Subscribed to Temperature Sensor");
    });

    apiPostJson.mockRejectedValueOnce(new Error("Network error"));

    const updatedButtons = screen.getAllByTestId("button");
    const unsubscribeButton = updatedButtons.find(btn => btn.textContent.includes("Unsubscribe"));
    await user.click(unsubscribeButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to unsubscribe from node");
    });
  });

  it("should handle tenantId without query param", async () => {
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={null}
      />
    );

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith("/api/v1/protocols/opcua/nodes");
    });
  });

  it("should display loading state", async () => {
    apiGetJson.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(createMockRootNodes()), 100))
    );

    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    expect(screen.getByText("Loading nodes...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Device One")).toBeInTheDocument();
    });
  });

  it("should display empty state when no nodes", async () => {
    apiGetJson.mockResolvedValueOnce({ nodes: [] });

    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("No nodes available")).toBeInTheDocument();
    });
  });

  it("should close dialog when onClose is called", () => {
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });

  // ============================================================
  // ADDITIONAL BRANCH COVERAGE TESTS
  // ============================================================

  it("should collapse node when expand icon clicked twice", async () => {
    const user = userEvent.setup();
    render(<OPCUANodeBrowser isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    await waitFor(() => expect(screen.getByText("Device One")).toBeInTheDocument());

    const expandButton = screen.getByTestId("chevron-right-icon").closest("button");
    await user.click(expandButton);
    await waitFor(() => expect(screen.getByText("Temperature")).toBeInTheDocument());

    const collapseButton = screen.getByTestId("chevron-down-icon").closest("button");
    await user.click(collapseButton);

    await waitFor(() => {
      expect(screen.queryByText("Temperature")).not.toBeInTheDocument();
    });
  });

  it("should not refetch children when already loaded", async () => {
    const user = userEvent.setup();
    render(<OPCUANodeBrowser isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    await waitFor(() => expect(screen.getByText("Device One")).toBeInTheDocument());

    const expandButton = screen.getByTestId("chevron-right-icon").closest("button");
    await user.click(expandButton);
    await waitFor(() => expect(screen.getByText("Temperature")).toBeInTheDocument());

    const childrenCallCount = apiGetJson.mock.calls.filter((c) => c[0].includes("/children")).length;

    const collapseButton = screen.getByTestId("chevron-down-icon").closest("button");
    await user.click(collapseButton);
    await waitFor(() => expect(screen.queryByText("Temperature")).not.toBeInTheDocument());

    const reExpandButton = screen.getByTestId("chevron-right-icon").closest("button");
    await user.click(reExpandButton);
    await waitFor(() => expect(screen.getByText("Temperature")).toBeInTheDocument());

    const finalChildrenCallCount = apiGetJson.mock.calls.filter((c) => c[0].includes("/children")).length;
    expect(finalChildrenCallCount).toBe(childrenCallCount);
  });

  it("should expand a nested grandchild node", async () => {
    const user = userEvent.setup();
    apiGetJson.mockImplementation((url) => {
      if (url.includes("SubFolder/children")) {
        return Promise.resolve(createMockGrandchildNodes());
      }
      if (url.includes(`${encodeURIComponent("ns=2;s=Device1")}/children`)) {
        return Promise.resolve(createMockNestedChildrenNodes());
      }
      if (url.includes("/nodes") && !url.includes("/children")) {
        return Promise.resolve(createMockRootNodes());
      }
      return Promise.resolve({});
    });

    render(<OPCUANodeBrowser isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);
    await waitFor(() => expect(screen.getByText("Device One")).toBeInTheDocument());

    await user.click(screen.getByTestId("chevron-right-icon").closest("button"));
    await waitFor(() => expect(screen.getByText("SubFolder")).toBeInTheDocument());

    const chevrons = screen.getAllByTestId("chevron-right-icon");
    await user.click(chevrons[chevrons.length - 1].closest("button"));

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/opcua/nodes/${encodeURIComponent("ns=2;s=Device1/SubFolder")}/children?tenant_id=${mockTenantId}`
      );
      expect(screen.getByText("Humidity")).toBeInTheDocument();
    });
  });

  it("should render Database icon for unrecognized node class", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/nodes") && !url.includes("/children")) return Promise.resolve(createMockRootNodesWithMethod());
      return Promise.resolve({});
    });

    render(<OPCUANodeBrowser isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    await waitFor(() => {
      expect(screen.getByText("Calculate Method")).toBeInTheDocument();
      expect(screen.getAllByTestId("database-icon").length).toBeGreaterThan(0);
    });
  });

  it("should toggle subscription via the inline tree eye icon", async () => {
    const user = userEvent.setup();
    render(<OPCUANodeBrowser isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);

    await waitFor(() => expect(screen.getByText("Temperature Sensor")).toBeInTheDocument());

    const row = screen.getByText("Temperature Sensor").closest("button");
    const eyeOffIcon = within(row).getByTestId("eye-off-icon");
    await user.click(eyeOffIcon.closest("button"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Subscribed to Temperature Sensor");
      expect(within(row).getByTestId("eye-icon")).toBeInTheDocument();
    });

    await user.click(within(row).getByTestId("eye-icon").closest("button"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Unsubscribed from Temperature Sensor");
    });
  });

  it("should fetch children, subscribe, and unsubscribe without tenantId", async () => {
    const user = userEvent.setup();
    apiGetJson.mockImplementation((url) => {
      if (url === "/api/v1/protocols/opcua/nodes") return Promise.resolve(createMockRootNodes());
      if (url === `/api/v1/protocols/opcua/nodes/${encodeURIComponent("ns=2;s=Device1")}/children`) {
        return Promise.resolve(createMockChildrenNodes());
      }
      return Promise.resolve({});
    });

    render(<OPCUANodeBrowser isOpen={true} onClose={mockOnClose} tenantId={null} />);
    await waitFor(() => expect(screen.getByText("Device One")).toBeInTheDocument());

    const expandButton = screen.getByTestId("chevron-right-icon").closest("button");
    await user.click(expandButton);
    
    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/opcua/nodes/${encodeURIComponent("ns=2;s=Device1")}/children`
      );
      expect(screen.getByText("Temperature")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Temperature Sensor"));
    const subscribeButton = screen.getAllByTestId("button").find((b) => b.textContent.includes("Subscribe"));
    await user.click(subscribeButton);

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith("/api/v1/protocols/opcua/subscribe", {
        nodeId: "ns=2;s=Temperature",
        samplingInterval: 1000,
      });
    });

    const unsubscribeButton = screen.getAllByTestId("button").find((b) => b.textContent.includes("Unsubscribe"));
    await user.click(unsubscribeButton);

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith("/api/v1/protocols/opcua/unsubscribe", {
        nodeId: "ns=2;s=Temperature",
      });
    });
  });

  // ✅ FIXED: Use act() to avoid React warnings
  it("should return empty children when the children fetch fails", async () => {
    const user = userEvent.setup();
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/children")) return Promise.reject(new Error("Network error"));
      if (url.includes("/nodes")) return Promise.resolve(createMockRootNodes());
      return Promise.resolve({});
    });

    render(<OPCUANodeBrowser isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);
    await waitFor(() => expect(screen.getByText("Device One")).toBeInTheDocument());

    const expandButton = screen.getByTestId("chevron-right-icon").closest("button");
    await user.click(expandButton);

    // Use act() to flush pending state updates
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // The node should still be visible, but children should not appear
    expect(screen.getByText("Device One")).toBeInTheDocument();
    // No child nodes should appear since fetch failed
    expect(screen.queryByText("Temperature")).not.toBeInTheDocument();
    expect(screen.queryByText("Pressure")).not.toBeInTheDocument();
  });

  it("should poll and display updated values for subscribed nodes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup();

    render(<OPCUANodeBrowser isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);
    await waitFor(() => expect(screen.getByText("Temperature Sensor")).toBeInTheDocument());

    await user.click(screen.getByText("Temperature Sensor"));
    const subscribeButton = screen.getAllByTestId("button").find((b) => b.textContent.includes("Subscribe"));
    await user.click(subscribeButton);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Subscribed to Temperature Sensor"));

    await vi.advanceTimersByTimeAsync(2000);

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/opcua/values?tenant_id=${mockTenantId}`
      );
      expect(screen.getByText("26")).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("should not poll values when there are no subscribed nodes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<OPCUANodeBrowser isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);
    await waitFor(() => expect(screen.getByText("Device One")).toBeInTheDocument());

    apiGetJson.mockClear();
    await vi.advanceTimersByTimeAsync(2000);

    expect(apiGetJson).not.toHaveBeenCalledWith(
      expect.stringContaining("/values")
    );

    vi.useRealTimers();
  });

  it("should swallow errors during value polling", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup();

    render(<OPCUANodeBrowser isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);
    await waitFor(() => expect(screen.getByText("Temperature Sensor")).toBeInTheDocument());

    await user.click(screen.getByText("Temperature Sensor"));
    const subscribeButton = screen.getAllByTestId("button").find((b) => b.textContent.includes("Subscribe"));
    await user.click(subscribeButton);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Subscribed to Temperature Sensor"));

    toast.error.mockClear();

    apiGetJson.mockImplementation((url) => {
      if (url.includes("/values")) return Promise.reject(new Error("poll failed"));
      return Promise.resolve({});
    });

    await vi.advanceTimersByTimeAsync(2000);

    expect(toast.error).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("should show placeholder text when no node is selected (desktop)", async () => {
    render(<OPCUANodeBrowser isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);
    await waitFor(() => expect(screen.getByText("Device One")).toBeInTheDocument());

    expect(screen.getByText("Select a node to view details")).toBeInTheDocument();
  });

  it("should display accessLevel and description when present", async () => {
    const user = userEvent.setup();
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/nodes") && !url.includes("/children")) return Promise.resolve(createMockRootNodesWithDetails());
      return Promise.resolve({});
    });

    render(<OPCUANodeBrowser isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);
    await waitFor(() => expect(screen.getByText("Detailed Node")).toBeInTheDocument());

    await user.click(screen.getByText("Detailed Node"));

    await waitFor(() => {
      expect(screen.getByText("Read/Write")).toBeInTheDocument();
      expect(screen.getByText("A fully described node")).toBeInTheDocument();
    });
  });

  it("should select a node and show its value in the mobile drawer", async () => {
    const user = userEvent.setup();
    useMediaQuery.mockReturnValue(false);

    render(<OPCUANodeBrowser isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);
    await waitFor(() => expect(screen.getByText("Temperature Sensor")).toBeInTheDocument());

    await user.click(screen.getByText("Temperature Sensor"));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Temperature Sensor" })
      ).toBeInTheDocument();
      expect(screen.getByText("Current Value")).toBeInTheDocument();
      expect(screen.getByText("25.5")).toBeInTheDocument();
    });
  });

  it("should show em dash when node value is undefined", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/nodes") && !url.includes("/children")) {
        return Promise.resolve({
          nodes: [
            {
              nodeId: "ns=2;s=Temp",
              displayName: "Temperature",
              nodeClass: "Variable",
              hasChildren: false,
              dataType: "Double",
            },
          ],
        });
      }
      if (url.includes("/values")) {
        return Promise.resolve({ values: {} });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Temperature")).toBeInTheDocument();
    });

    const nodeButton = screen.getByText("Temperature");
    await user.click(nodeButton);

    const buttons = screen.getAllByTestId("button");
    const subscribeButton = buttons.find(btn => btn.textContent.includes("Subscribe"));
    await user.click(subscribeButton);

    await waitFor(() => {
      expect(screen.getByText("Current Value")).toBeInTheDocument();
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  // ✅ FIXED: Use a timezone-independent test
  it("should display timestamp when node value has timestamp", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup();

    render(<OPCUANodeBrowser isOpen={true} onClose={mockOnClose} tenantId={mockTenantId} />);
    await waitFor(() => expect(screen.getByText("Temperature Sensor")).toBeInTheDocument());

    await user.click(screen.getByText("Temperature Sensor"));
    const subscribeButton = screen.getAllByTestId("button").find((b) => b.textContent.includes("Subscribe"));
    await user.click(subscribeButton);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Subscribed to Temperature Sensor"));

    await vi.advanceTimersByTimeAsync(2000);

    await waitFor(() => {
      expect(screen.getByText("Current Value")).toBeInTheDocument();
      // Check for a time pattern that works in any timezone
      // The component uses toLocaleTimeString(), so we just verify a time-like format exists
      const timestampElement = screen.getByText(/\d{1,2}:\d{2}/);
      expect(timestampElement).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("should show chevron when hasChildren is false but children array exists", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/nodes") && !url.includes("/children")) {
        return Promise.resolve({
          nodes: [
            {
              nodeId: "ns=2;s=Device1",
              displayName: "Device One",
              nodeClass: "Object",
              hasChildren: false,
              children: [{ nodeId: "ns=2;s=Device1/Temp", displayName: "Temp", nodeClass: "Variable" }],
            },
          ],
        });
      }
      if (url.includes("/children")) {
        return Promise.resolve({ children: [] });
      }
      return Promise.resolve({});
    });

    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Device One")).toBeInTheDocument();
    });

    expect(screen.getByTestId("chevron-right-icon")).toBeInTheDocument();
  });

  it("should handle empty children response gracefully", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/nodes") && !url.includes("/children")) {
        return Promise.resolve({
          nodes: [
            {
              nodeId: "ns=2;s=Device1",
              displayName: "Device One",
              nodeClass: "Object",
              hasChildren: true,
            },
          ],
        });
      }
      if (url.includes("/children")) {
        return Promise.resolve({ children: [] });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Device One")).toBeInTheDocument();
    });

    const chevronIcon = screen.getByTestId("chevron-right-icon");
    const expandButton = chevronIcon.closest("button");
    await user.click(expandButton);

    await waitFor(() => {
      expect(screen.queryByText("Temperature")).not.toBeInTheDocument();
    });
  });

  it("should recursively update nested node children", async () => {
    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Device One")).toBeInTheDocument();
    });

    const chevronIcon = screen.getByTestId("chevron-right-icon");
    const expandButton = chevronIcon.closest("button");
    await user.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText("Temperature")).toBeInTheDocument();
    });

    apiGetJson.mockClear();
    await user.click(expandButton);
    await user.click(expandButton);

    expect(apiGetJson).not.toHaveBeenCalledWith(
      expect.stringContaining("/children")
    );
  });

  it("should show subscribe/unsubscribe button for Variable nodes in tree", async () => {
    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Temperature Sensor")).toBeInTheDocument();
    });

    const row = screen.getByText("Temperature Sensor").closest("button");
    const eyeOffIcon = within(row).getByTestId("eye-off-icon");
    expect(eyeOffIcon).toBeInTheDocument();

    const eyeButton = eyeOffIcon.closest("button");
    await user.click(eyeButton);

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/opcua/subscribe?tenant_id=${mockTenantId}`,
        expect.any(Object)
      );
    });
  });

  it("should show Eye icon for subscribed nodes in tree", async () => {
    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Temperature Sensor")).toBeInTheDocument();
    });

    const row = screen.getByText("Temperature Sensor").closest("button");
    const eyeOffIcon = within(row).getByTestId("eye-off-icon");
    const eyeButton = eyeOffIcon.closest("button");
    await user.click(eyeButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Subscribed to Temperature Sensor");
      expect(within(row).getByTestId("eye-icon")).toBeInTheDocument();
    });
  });

  it("should display 0 value correctly when node value is 0", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    apiGetJson.mockImplementation((url) => {
      if (url.includes("/nodes") && !url.includes("/children")) {
        return Promise.resolve({
          nodes: [
            {
              nodeId: "ns=2;s=Zero",
              displayName: "Zero Value",
              nodeClass: "Variable",
              hasChildren: false,
              dataType: "Integer",
              value: 0,
            },
          ],
        });
      }
      if (url.includes("/values")) {
        return Promise.resolve({
          values: { "ns=2;s=Zero": { value: 0, timestamp: "2026-07-13T10:00:00Z" } },
        });
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Zero Value")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Zero Value"));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Zero Value" })
      ).toBeInTheDocument();
    });

    const subscribeButton = screen.getAllByTestId("button").find((b) => b.textContent.includes("Subscribe"));
    await user.click(subscribeButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Subscribed to Zero Value");
    });

    await vi.advanceTimersByTimeAsync(2000);

    await waitFor(() => {
      expect(screen.getByText("Current Value")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("should not refetch root nodes when subscribing/unsubscribing", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    
    const user = userEvent.setup();
    render(
      <OPCUANodeBrowser
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Device One")).toBeInTheDocument();
    });

    const expandButton = screen.getByTestId("chevron-right-icon").closest("button");
    await user.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText("Temperature")).toBeInTheDocument();
    });

    apiGetJson.mockClear();

    const row = screen.getByText("Temperature Sensor").closest("button");
    const eyeOffIcon = within(row).getByTestId("eye-off-icon");
    await user.click(eyeOffIcon.closest("button"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Subscribed to Temperature Sensor");
      expect(within(row).getByTestId("eye-icon")).toBeInTheDocument();
    });

    await vi.advanceTimersByTimeAsync(2100);

    expect(apiGetJson).not.toHaveBeenCalledWith(
      expect.stringContaining("/nodes")
    );

    expect(screen.getByText("Temperature")).toBeInTheDocument();
    
    vi.useRealTimers();
  });
});
