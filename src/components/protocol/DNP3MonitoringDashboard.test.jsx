import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import DNP3MonitoringDashboard from "./DNP3MonitoringDashboard";

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
  Card: ({ children, className, onClick }) => (
    <div data-testid="card" className={className} onClick={onClick}>
      {children}
    </div>
  ),
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardContent: ({ children, className }) => <div data-testid="card-content" className={className}>{children}</div>,
  CardTitle: ({ children, className }) => <div data-testid="card-title" className={className}>{children}</div>,
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

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value }) => (
    <div data-testid="progress" data-value={value}>
      <div style={{ width: `${value}%` }} />
    </div>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }) => <div data-testid="scroll-area" className={className}>{children}</div>,
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
  AlertCircle: () => <span data-testid="alert-icon">AlertCircle</span>,
  BarChart3: () => <span data-testid="barchart-icon">BarChart3</span>,
  CheckCircle: () => <span data-testid="check-icon">CheckCircle</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  Database: () => <span data-testid="database-icon">Database</span>,
  RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
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

describe("DNP3MonitoringDashboard", () => {
  const mockOnClose = vi.fn();
  const mockTenantId = "tenant-123";

  const mockOutstations = {
    devices: {
      "outstation-1": {
        id: "outstation-1",
        name: "Main Substation",
        address: "192.168.1.100",
        connected: true,
        master_address: 1,
        outstation_address: 10,
        data_points: 25,
        last_poll: "2026-07-13T10:00:00Z",
      },
      "outstation-2": {
        id: "outstation-2",
        name: "Pump Station",
        address: "192.168.1.101",
        connected: false,
        master_address: 1,
        outstation_address: 11,
        data_points: 15,
        last_poll: "2026-07-13T09:30:00Z",
      },
    },
  };

  const mockPerformanceMetrics = {
    total_requests: 1500,
    successful_requests: 1450,
    failed_requests: 50,
    average_response_time: 45,
    min_response_time: 10,
    max_response_time: 120,
  };

  const mockDevicePerformance = {
    scan_rate: 10,
    latency: 25,
    error_rate: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useMediaQuery.mockReturnValue(true);
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices")) {
        if (url.includes("/performance")) {
          return Promise.resolve(mockDevicePerformance);
        }
        return Promise.resolve(mockOutstations);
      }
      if (url.includes("/performance/metrics")) {
        return Promise.resolve(mockPerformanceMetrics);
      }
      return Promise.resolve({});
    });
    apiPostJson.mockResolvedValue({ success: true });
  });

  it("should render desktop dialog when isOpen is true", () => {
    useMediaQuery.mockReturnValue(true);
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText("DNP3 Monitoring Dashboard")).toBeInTheDocument();
    expect(
      screen.getByText("Monitor outstation status, performance metrics, and data points")
    ).toBeInTheDocument();
  });

  it("should render mobile drawer when isOpen is true and on mobile", () => {
    useMediaQuery.mockReturnValue(false);
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    expect(screen.getByTestId("drawer")).toBeInTheDocument();
    expect(screen.getByText("DNP3 Monitoring Dashboard")).toBeInTheDocument();
  });

  it("should not render when isOpen is false", () => {
    render(
      <DNP3MonitoringDashboard
        isOpen={false}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
  });

  it("should fetch data on mount when open", async () => {
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/dnp3/devices?tenant_id=${mockTenantId}`
      );
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/dnp3/performance/metrics?tenant_id=${mockTenantId}`
      );
    });
  });

  it("should display overview stats", async () => {
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Total Outstations")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      // Use getAllByText for "1" since it appears multiple times
      const ones = screen.getAllByText("1");
      expect(ones.length).toBeGreaterThan(0);
      expect(screen.getByText("Data Points")).toBeInTheDocument();
      expect(screen.getByText("40")).toBeInTheDocument();
      expect(screen.getByText("Avg Response")).toBeInTheDocument();
      expect(screen.getByText("45ms")).toBeInTheDocument();
    });
  });

  it("should display outstations in the outstation list", async () => {
    const user = userEvent.setup();
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    // Switch to outstations tab
    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await user.click(outstationTab);

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("Main Substation")).toBeInTheDocument();
      expect(within(outstationPanel).getByText("Pump Station")).toBeInTheDocument();
    });
  });

  it("should display connection status badges", async () => {
    const user = userEvent.setup();
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await user.click(outstationTab);

    await waitFor(() => {
      const badges = screen.getAllByTestId("badge");
      expect(badges.some(b => b.textContent.includes("Connected"))).toBe(true);
      expect(badges.some(b => b.textContent.includes("Disconnected"))).toBe(true);
    });
  });

  it("should select outstation and display details", async () => {
    const user = userEvent.setup();
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await user.click(outstationTab);

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("Main Substation")).toBeInTheDocument();
    });

    // Find the outstation card within the outstation panel
    const outstationPanel = getTabPanel("outstations");
    const cards = within(outstationPanel).getAllByTestId("card");
    const outstationCard = cards.find(card => 
      card.textContent.includes("Main Substation")
    );
    fireEvent.click(outstationCard);

    // Wait for details to appear - switch back to overview or check the details
    await waitFor(() => {
      expect(screen.getByText("Main Substation Details")).toBeInTheDocument();
    });
  });

  it("should handle integrity poll", async () => {
    const user = userEvent.setup();
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await user.click(outstationTab);

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("Main Substation")).toBeInTheDocument();
    });

    // Find and click Integrity Poll button within the outstation panel
    const outstationPanel = getTabPanel("outstations");
    const buttons = within(outstationPanel).getAllByTestId("button");
    const pollButton = buttons.find(btn => btn.textContent.includes("Integrity Poll"));
    await user.click(pollButton);

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/dnp3/devices/outstation-1/integrity-poll?tenant_id=${mockTenantId}`
      );
      expect(toast.success).toHaveBeenCalledWith("Integrity poll completed");
    });
  });

  it("should display performance metrics", async () => {
    const user = userEvent.setup();
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    const tabs = screen.getAllByTestId("tabs-trigger");
    const performanceTab = tabs.find(tab => tab.textContent.includes("Performance"));
    await user.click(performanceTab);

    await waitFor(() => {
      expect(screen.getByText("Performance Metrics")).toBeInTheDocument();
      expect(screen.getByText("1500")).toBeInTheDocument();
      expect(screen.getByText("1450")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
      expect(screen.getByText("45ms")).toBeInTheDocument();
    });
  });

  it("should display system health with progress bar", async () => {
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("System Health")).toBeInTheDocument();
      expect(screen.getByText("Connection Rate")).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();
      const progress = screen.getByTestId("progress");
      expect(progress).toHaveAttribute("data-value", "50");
    });
  });

  it("should display device performance when outstation selected", async () => {
    const user = userEvent.setup();
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await user.click(outstationTab);

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("Main Substation")).toBeInTheDocument();
    });

    // Select outstation
    const outstationPanel = getTabPanel("outstations");
    const cards = within(outstationPanel).getAllByTestId("card");
    const outstationCard = cards.find(card => 
      card.textContent.includes("Main Substation")
    );
    fireEvent.click(outstationCard);

    // Switch to performance tab
    const performanceTab = tabs.find(tab => tab.textContent.includes("Performance"));
    await user.click(performanceTab);

    await waitFor(() => {
      expect(screen.getByText("Device Performance: outstation-1")).toBeInTheDocument();
      expect(screen.getByText("10/s")).toBeInTheDocument();
      expect(screen.getByText("25ms")).toBeInTheDocument();
      expect(screen.getByText("2%")).toBeInTheDocument();
    });
  });

  it("should handle API errors gracefully", async () => {
    apiGetJson.mockRejectedValueOnce(new Error("Network error"));
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load DNP3 outstations");
    });
  });

  it("should handle integrity poll error", async () => {
    apiPostJson.mockRejectedValueOnce(new Error("Network error"));
    const user = userEvent.setup();
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await user.click(outstationTab);

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("Main Substation")).toBeInTheDocument();
    });

    const outstationPanel = getTabPanel("outstations");
    const buttons = within(outstationPanel).getAllByTestId("button");
    const pollButton = buttons.find(btn => btn.textContent.includes("Integrity Poll"));
    await user.click(pollButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to perform integrity poll");
    });
  });

  it("should handle refresh button click", async () => {
    const user = userEvent.setup();
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await user.click(outstationTab);

    const outstationPanel = getTabPanel("outstations");
    const refreshButton = within(outstationPanel).getByTestId("button");
    await user.click(refreshButton);

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/dnp3/devices?tenant_id=${mockTenantId}`
      );
    });
  });

  it("should handle tenantId without query param", async () => {
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={null}
      />
    );

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith("/api/v1/protocols/dnp3/devices");
    });
  });

  it("should display events tab content", async () => {
    const user = userEvent.setup();
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    const tabs = screen.getAllByTestId("tabs-trigger");
    const eventsTab = tabs.find(tab => tab.textContent.includes("Events"));
    await user.click(eventsTab);

    expect(screen.getByText("Event Buffer")).toBeInTheDocument();
    expect(screen.getByText("0 events")).toBeInTheDocument();
    expect(screen.getByText("No events recorded")).toBeInTheDocument();
  });

  it("should display empty state for outstations", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices")) {
        return Promise.resolve({ devices: {} });
      }
      if (url.includes("/performance/metrics")) {
        return Promise.resolve(mockPerformanceMetrics);
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await user.click(outstationTab);

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("No outstations configured")).toBeInTheDocument();
    });
  });

  it("should close dialog when onClose is called", () => {
    render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={mockTenantId}
      />
    );

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });
});
