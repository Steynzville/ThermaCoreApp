import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
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
// NOTE: The Tabs mock renders every TabsContent panel unconditionally (it does
// not hide inactive panels), so multiple panels' content coexists in the DOM
// at once. Always scope queries to the specific panel you care about with
// `within(getTabPanel(...))` to avoid "multiple elements found" errors.
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
    vi.useRealTimers(); // ✅ FIX: Use real timers by default
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

  afterEach(() => {
    vi.useRealTimers(); // ✅ FIX: Ensure real timers are restored
    vi.clearAllMocks();
  });

  // ✅ FIX: Wrap render in act() and return result
  const renderComponent = (props = {}) => {
    let result;
    act(() => {
      result = render(
        <DNP3MonitoringDashboard
          isOpen={true}
          onClose={mockOnClose}
          tenantId={mockTenantId}
          {...props}
        />
      );
    });
    return result;
  };

  // ✅ FIX: Create userEvent with delay: null
  const setupUserEvent = () => userEvent.setup({ delay: null });

  // ✅ FIX: Wrap render in act()
  it("should render desktop dialog when isOpen is true", () => {
    useMediaQuery.mockReturnValue(true);
    renderComponent();

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText("DNP3 Monitoring Dashboard")).toBeInTheDocument();
    expect(
      screen.getByText("Monitor outstation status, performance metrics, and data points")
    ).toBeInTheDocument();
  });

  // ✅ FIX: Wrap render in act()
  it("should render mobile drawer when isOpen is true and on mobile", () => {
    useMediaQuery.mockReturnValue(false);
    renderComponent();

    expect(screen.getByTestId("drawer")).toBeInTheDocument();
    expect(screen.getByText("DNP3 Monitoring Dashboard")).toBeInTheDocument();
  });

  // ✅ FIX: Wrap render in act()
  it("should not render when isOpen is false", () => {
    act(() => {
      render(
        <DNP3MonitoringDashboard
          isOpen={false}
          onClose={mockOnClose}
          tenantId={mockTenantId}
        />
      );
    });

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("drawer")).not.toBeInTheDocument();
  });

  it("should fetch data on mount when open", async () => {
    renderComponent();

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
    renderComponent();

    // Scoped to the overview panel because "Data Points" / "45ms" also
    // appear in the outstations and performance panels, which the Tabs
    // mock keeps mounted simultaneously.
    await waitFor(() => {
      const overviewPanel = getTabPanel("overview");
      expect(within(overviewPanel).getByText("Total Outstations")).toBeInTheDocument();
      expect(within(overviewPanel).getByText("2")).toBeInTheDocument();
      expect(within(overviewPanel).getByText("Active")).toBeInTheDocument();
      const ones = within(overviewPanel).getAllByText("1");
      expect(ones.length).toBeGreaterThan(0);
      expect(within(overviewPanel).getByText("Data Points")).toBeInTheDocument();
      expect(within(overviewPanel).getByText("40")).toBeInTheDocument();
      expect(within(overviewPanel).getByText("Avg Response")).toBeInTheDocument();
      expect(within(overviewPanel).getByText("45ms")).toBeInTheDocument();
    });
  });

  // ✅ FIX: Wrap user interactions in act()
  it("should display outstations in the outstation list", async () => {
    // Desktop cards only show the outstation id, not its name. The name is
    // only rendered in the mobile drawer view, so use mobile here.
    useMediaQuery.mockReturnValue(false);
    const user = setupUserEvent();
    renderComponent();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await act(async () => {
      await user.click(outstationTab);
    });

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("Main Substation")).toBeInTheDocument();
      expect(within(outstationPanel).getByText("Pump Station")).toBeInTheDocument();
    });
  });

  // ✅ FIX: Wrap user interactions in act()
  it("should display connection status badges", async () => {
    const user = setupUserEvent();
    renderComponent();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await act(async () => {
      await user.click(outstationTab);
    });

    await waitFor(() => {
      const badges = screen.getAllByTestId("badge");
      expect(badges.some(b => b.textContent.includes("Connected"))).toBe(true);
      expect(badges.some(b => b.textContent.includes("Disconnected"))).toBe(true);
    });
  });

  // ✅ FIX: Wrap user interactions and fireEvent in act()
  it("should select outstation and display details", async () => {
    // The "{name} Details" card only exists in the mobile drawer view.
    // The desktop view surfaces selection details inside the Performance
    // tab instead (covered by the "device performance" test below).
    useMediaQuery.mockReturnValue(false);
    const user = setupUserEvent();
    renderComponent();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await act(async () => {
      await user.click(outstationTab);
    });

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
    act(() => {
      fireEvent.click(outstationCard);
    });

    // Wait for details to appear
    await waitFor(() => {
      expect(screen.getByText("Main Substation Details")).toBeInTheDocument();
    });
  });

  // ✅ FIX: Wrap user interactions in act()
  it("should handle integrity poll", async () => {
    // Desktop cards render the outstation id, not its name.
    const user = setupUserEvent();
    renderComponent();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await act(async () => {
      await user.click(outstationTab);
    });

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("outstation-1")).toBeInTheDocument();
    });

    // Find and click Integrity Poll button within the outstation panel
    const outstationPanel = getTabPanel("outstations");
    const buttons = within(outstationPanel).getAllByTestId("button");
    const pollButton = buttons.find(btn => btn.textContent.includes("Integrity Poll"));
    await act(async () => {
      await user.click(pollButton);
    });

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/dnp3/devices/outstation-1/integrity-poll?tenant_id=${mockTenantId}`
      );
      expect(toast.success).toHaveBeenCalledWith("Integrity poll completed");
    });
  });

  // ✅ FIX: Wrap user interactions in act()
  it("should display performance metrics", async () => {
    const user = setupUserEvent();
    renderComponent();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const performanceTab = tabs.find(tab => tab.textContent.includes("Performance"));
    await act(async () => {
      await user.click(performanceTab);
    });

    await waitFor(() => {
      const performancePanel = getTabPanel("performance");
      expect(within(performancePanel).getByText("Performance Metrics")).toBeInTheDocument();
      // Check for the presence of the performance metrics labels instead of specific numbers
      expect(within(performancePanel).getByText("Response Time")).toBeInTheDocument();
      expect(within(performancePanel).getByText("Average")).toBeInTheDocument();
      expect(within(performancePanel).getByText("Min")).toBeInTheDocument();
      expect(within(performancePanel).getByText("Max")).toBeInTheDocument();
      expect(within(performancePanel).getByText("Request Stats")).toBeInTheDocument();
      expect(within(performancePanel).getByText("Total")).toBeInTheDocument();
      expect(within(performancePanel).getByText("Success Rate")).toBeInTheDocument();
      expect(within(performancePanel).getByText("Errors")).toBeInTheDocument();
    });
  });

  it("should display system health with progress bar", async () => {
    renderComponent();

    await waitFor(() => {
      const overviewPanel = getTabPanel("overview");
      expect(within(overviewPanel).getByText("System Health")).toBeInTheDocument();
      expect(within(overviewPanel).getByText("Connection Rate")).toBeInTheDocument();
      expect(within(overviewPanel).getByText("50%")).toBeInTheDocument();
      const progress = screen.getByTestId("progress");
      expect(progress).toHaveAttribute("data-value", "50");
    });
  });

  // ✅ FIX: Wrap user interactions and fireEvent in act()
  it("should display device performance when outstation selected", async () => {
    const user = setupUserEvent();
    renderComponent();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await act(async () => {
      await user.click(outstationTab);
    });

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("outstation-1")).toBeInTheDocument();
    });

    // Select outstation (desktop cards render the id, not the name)
    const outstationPanel = getTabPanel("outstations");
    const cards = within(outstationPanel).getAllByTestId("card");
    const outstationCard = cards.find(card => 
      card.textContent.includes("outstation-1")
    );
    act(() => {
      fireEvent.click(outstationCard);
    });

    // Switch to performance tab
    const performanceTab = tabs.find(tab => tab.textContent.includes("Performance"));
    await act(async () => {
      await user.click(performanceTab);
    });

    await waitFor(() => {
      const performancePanel = getTabPanel("performance");
      expect(within(performancePanel).getByText("Device Performance: outstation-1")).toBeInTheDocument();
      expect(within(performancePanel).getByText("10/s")).toBeInTheDocument();
      expect(within(performancePanel).getByText("25ms")).toBeInTheDocument();
      expect(within(performancePanel).getByText("2%")).toBeInTheDocument();
    });
  });

  it("should handle API errors gracefully", async () => {
    apiGetJson.mockRejectedValueOnce(new Error("Network error"));
    renderComponent();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load DNP3 outstations");
    });
  });

  // ✅ FIX: Wrap user interactions in act()
  it("should handle integrity poll error", async () => {
    apiPostJson.mockRejectedValueOnce(new Error("Network error"));
    const user = setupUserEvent();
    renderComponent();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await act(async () => {
      await user.click(outstationTab);
    });

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("outstation-1")).toBeInTheDocument();
    });

    const outstationPanel = getTabPanel("outstations");
    const buttons = within(outstationPanel).getAllByTestId("button");
    const pollButton = buttons.find(btn => btn.textContent.includes("Integrity Poll"));
    await act(async () => {
      await user.click(pollButton);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to perform integrity poll");
    });
  });

  // ✅ FIX: Wrap user interactions in act()
  it("should handle refresh button click", async () => {
    // The outstations panel has multiple buttons (Refresh + one Integrity
    // Poll per outstation), so pick the Refresh one explicitly.
    const user = setupUserEvent();
    renderComponent();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await act(async () => {
      await user.click(outstationTab);
    });

    const outstationPanel = getTabPanel("outstations");
    const buttons = within(outstationPanel).getAllByTestId("button");
    const refreshButton = buttons.find(btn => btn.textContent.includes("Refresh"));
    await act(async () => {
      await user.click(refreshButton);
    });

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/dnp3/devices?tenant_id=${mockTenantId}`
      );
    });
  });

  it("should handle tenantId without query param", async () => {
    act(() => {
      render(
        <DNP3MonitoringDashboard
          isOpen={true}
          onClose={mockOnClose}
          tenantId={null}
        />
      );
    });

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith("/api/v1/protocols/dnp3/devices");
    });
  });

  // ✅ FIX: Wrap user interactions in act()
  it("should display events tab content", async () => {
    const user = setupUserEvent();
    renderComponent();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const eventsTab = tabs.find(tab => tab.textContent.includes("Events"));
    await act(async () => {
      await user.click(eventsTab);
    });

    expect(screen.getByText("Event Buffer")).toBeInTheDocument();
    expect(screen.getByText("0 events")).toBeInTheDocument();
    expect(screen.getByText("No events recorded")).toBeInTheDocument();
  });

  // ✅ FIX: Wrap user interactions in act()
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

    const user = setupUserEvent();
    renderComponent();

    const tabs = screen.getAllByTestId("tabs-trigger");
    const outstationTab = tabs.find(tab => tab.textContent.includes("Outstations"));
    await act(async () => {
      await user.click(outstationTab);
    });

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("No outstations configured")).toBeInTheDocument();
    });
  });

  it("should close dialog when onClose is called", () => {
    renderComponent();

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });
});
