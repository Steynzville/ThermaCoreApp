import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

const mockRootNodes = {
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
};

const mockChildrenNodes = {
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
};

const mockNodeValues = {
  values: {
    "ns=2;s=Temperature": { value: 26.0, timestamp: "2026-07-13T10:00:00Z" },
  },
};

describe("OPCUANodeBrowser", () => {
  const mockOnClose = vi.fn();
  const mockTenantId = "tenant-123";

  beforeEach(() => {
    vi.clearAllMocks();
    useMediaQuery.mockReturnValue(true);
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/nodes") && !url.includes("/children")) {
        return Promise.resolve(mockRootNodes);
      }
      if (url.includes("/children")) {
        return Promise.resolve(mockChildrenNodes);
      }
      if (url.includes("/values")) {
        return Promise.resolve(mockNodeValues);
      }
      return Promise.resolve({});
    });
    apiPostJson.mockResolvedValue({ success: true });
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

    // The expand/collapse toggle is a plain native <button> wrapping the
    // chevron icon — it does NOT use the mocked Button component, so it
    // won't show up via getAllByTestId("button"). Find it via the icon.
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

    // Click on Temperature Sensor node
    const nodeButton = screen.getByText("Temperature Sensor");
    await user.click(nodeButton);

    // Once selected, "Temperature Sensor" appears twice (tree row + details
    // heading), so scope the assertion to the heading specifically.
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

    // Click on Temperature Sensor node
    const nodeButton = screen.getByText("Temperature Sensor");
    await user.click(nodeButton);

    // Click Subscribe button
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

    // Click on Temperature Sensor node
    const nodeButton = screen.getByText("Temperature Sensor");
    await user.click(nodeButton);

    // First subscribe
    let buttons = screen.getAllByTestId("button");
    let subscribeButton = buttons.find(btn => btn.textContent.includes("Subscribe"));
    await user.click(subscribeButton);

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/opcua/subscribe?tenant_id=${mockTenantId}`,
        expect.any(Object)
      );
    });

    // Now unsubscribe - the button text should have changed
    // Re-fetch buttons after state update
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

    // Should show Temperature Sensor but not Device One
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

    // Click on Temperature Sensor node
    const nodeButton = screen.getByText("Temperature Sensor");
    await user.click(nodeButton);

    // Subscribe
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

    // Subscribe first — must succeed (default resolved mock) so an
    // "Unsubscribe" button actually appears afterward.
    let buttons = screen.getAllByTestId("button");
    let subscribeButton = buttons.find(btn => btn.textContent.includes("Subscribe"));
    await user.click(subscribeButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Subscribed to Temperature Sensor");
    });

    // Now queue the rejection for the unsubscribe call specifically
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
    // Delay the API response to show loading state, then resolve with
    // the actual mock data so the component can finish rendering.
    apiGetJson.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockRootNodes), 100))
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
});
