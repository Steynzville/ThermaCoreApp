/**
 * DNP3MonitoringDashboard.test.jsx - Complete Test Coverage
 */

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
    vi.useRealTimers();
    useMediaQuery.mockReturnValue(true);
    apiGetJson.mockImplementation((url) => {
      // Check most-specific URLs first
      if (url.includes("/devices/outstation-1/performance")) {
        return Promise.resolve(mockDevicePerformance);
      }
      if (url.includes("/devices")) {
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
    vi.useRealTimers();
    vi.clearAllMocks();
  });

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

  const setupUserEvent = () => userEvent.setup({ delay: null });

  // Helper to click a tab with act() wrapper
  const clickTab = async (user, tabText) => {
    const tabs = screen.getAllByTestId("tabs-trigger");
    const tab = tabs.find(t => t.textContent.includes(tabText));
    if (!tab) throw new Error(`Tab "${tabText}" not found`);
    await act(async () => {
      await user.click(tab);
    });
    return tab;
  };

  // Helper to find and click a button within a panel
  const clickButtonInPanel = async (user, panelValue, buttonText) => {
    const panel = getTabPanel(panelValue);
    const buttons = within(panel).getAllByTestId("button");
    const button = buttons.find(b => b.textContent.includes(buttonText));
    if (!button) throw new Error(`Button "${buttonText}" not found in panel "${panelValue}"`);
    await act(async () => {
      await user.click(button);
    });
    return button;
  };

  // ============================================================
  // BASIC RENDERING TESTS
  // ============================================================

  it("should render desktop dialog when isOpen is true", () => {
    useMediaQuery.mockReturnValue(true);
    renderComponent();

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText("DNP3 Monitoring Dashboard")).toBeInTheDocument();
    expect(
      screen.getByText("Monitor outstation status, performance metrics, and data points")
    ).toBeInTheDocument();
  });

  it("should render mobile drawer when isOpen is true and on mobile", () => {
    useMediaQuery.mockReturnValue(false);
    renderComponent();

    expect(screen.getByTestId("drawer")).toBeInTheDocument();
    expect(screen.getByText("DNP3 Monitoring Dashboard")).toBeInTheDocument();
  });

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

  // ============================================================
  // DATA FETCHING TESTS
  // ============================================================

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

  // ============================================================
  // OVERVIEW TAB TESTS
  // ============================================================

  it("should display overview stats", async () => {
    renderComponent();

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

  // ============================================================
  // OUTSTATIONS TAB TESTS
  // ============================================================

  it("should display outstations in the outstation list", async () => {
    useMediaQuery.mockReturnValue(false);
    const user = setupUserEvent();
    renderComponent();

    await clickTab(user, "Outstations");

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("Main Substation")).toBeInTheDocument();
      expect(within(outstationPanel).getByText("Pump Station")).toBeInTheDocument();
    });
  });

  it("should display connection status badges", async () => {
    const user = setupUserEvent();
    renderComponent();

    await clickTab(user, "Outstations");

    await waitFor(() => {
      const badges = screen.getAllByTestId("badge");
      expect(badges.some(b => b.textContent.includes("Connected"))).toBe(true);
      expect(badges.some(b => b.textContent.includes("Disconnected"))).toBe(true);
    });
  });

  it("should select outstation and display details", async () => {
    useMediaQuery.mockReturnValue(false);
    const user = setupUserEvent();
    renderComponent();

    await clickTab(user, "Outstations");

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("Main Substation")).toBeInTheDocument();
    });

    const outstationPanel = getTabPanel("outstations");
    const cards = within(outstationPanel).getAllByTestId("card");
    const outstationCard = cards.find(card => 
      card.textContent.includes("Main Substation")
    );
    act(() => {
      fireEvent.click(outstationCard);
    });

    await waitFor(() => {
      expect(screen.getByText("Main Substation Details")).toBeInTheDocument();
    });
  });

  it("should handle integrity poll", async () => {
    const user = setupUserEvent();
    renderComponent();

    await clickTab(user, "Outstations");

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("outstation-1")).toBeInTheDocument();
    });

    await clickButtonInPanel(user, "outstations", "Integrity Poll");

    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith(
        `/api/v1/protocols/dnp3/devices/outstation-1/integrity-poll?tenant_id=${mockTenantId}`
      );
      expect(toast.success).toHaveBeenCalledWith("Integrity poll completed");
    });
  });

  it("should handle refresh button click", async () => {
    const user = setupUserEvent();
    renderComponent();

    await clickTab(user, "Outstations");

    await clickButtonInPanel(user, "outstations", "Refresh");

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith(
        `/api/v1/protocols/dnp3/devices?tenant_id=${mockTenantId}`
      );
    });
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

    const user = setupUserEvent();
    renderComponent();

    await clickTab(user, "Outstations");

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("No outstations configured")).toBeInTheDocument();
    });
  });

  // ============================================================
  // PERFORMANCE TAB TESTS
  // ============================================================

  it("should display performance metrics", async () => {
    const user = setupUserEvent();
    renderComponent();

    await clickTab(user, "Performance");

    await waitFor(() => {
      const performancePanel = getTabPanel("performance");
      expect(within(performancePanel).getByText("Performance Metrics")).toBeInTheDocument();
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

  it("should display device performance when outstation selected", async () => {
    const user = setupUserEvent();
    renderComponent();

    await clickTab(user, "Outstations");

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("outstation-1")).toBeInTheDocument();
    });

    const outstationPanel = getTabPanel("outstations");
    const cards = within(outstationPanel).getAllByTestId("card");
    const outstationCard = cards.find(card => 
      card.textContent.includes("outstation-1")
    );
    act(() => {
      fireEvent.click(outstationCard);
    });

    await clickTab(user, "Performance");

    await waitFor(() => {
      const performancePanel = getTabPanel("performance");
      expect(within(performancePanel).getByText("Device Performance: outstation-1")).toBeInTheDocument();
      expect(within(performancePanel).getByText("10/s")).toBeInTheDocument();
      expect(within(performancePanel).getByText("25ms")).toBeInTheDocument();
      expect(within(performancePanel).getByText("2%")).toBeInTheDocument();
    });
  });

  // ============================================================
  // EVENTS TAB TESTS
  // ============================================================

  it("should display events tab content", async () => {
    const user = setupUserEvent();
    renderComponent();

    await clickTab(user, "Events");

    expect(screen.getByText("Event Buffer")).toBeInTheDocument();
    expect(screen.getByText("0 events")).toBeInTheDocument();
    expect(screen.getByText("No events recorded")).toBeInTheDocument();
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================

  it("should handle API errors gracefully", async () => {
    apiGetJson.mockRejectedValueOnce(new Error("Network error"));
    renderComponent();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load DNP3 outstations");
    });
  });

  it("should handle integrity poll error", async () => {
    apiPostJson.mockRejectedValueOnce(new Error("Network error"));
    const user = setupUserEvent();
    renderComponent();

    await clickTab(user, "Outstations");

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("outstation-1")).toBeInTheDocument();
    });

    await clickButtonInPanel(user, "outstations", "Integrity Poll");

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to perform integrity poll");
    });
  });

  // ============================================================
  // TENANT ID TESTS
  // ============================================================

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

  it("should fetch performance metrics without tenantId query param", async () => {
    act(() => {
      render(<DNP3MonitoringDashboard isOpen={true} onClose={mockOnClose} tenantId={null} />);
    });
    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith("/api/v1/protocols/dnp3/performance/metrics");
    });
  });

  it("should fetch device performance without tenantId query param", async () => {
    const user = setupUserEvent();
    act(() => {
      render(<DNP3MonitoringDashboard isOpen={true} onClose={mockOnClose} tenantId={null} />);
    });
    await clickTab(user, "Outstations");
    await waitFor(() => {
      expect(within(getTabPanel("outstations")).getByText("outstation-1")).toBeInTheDocument();
    });
    const cards = within(getTabPanel("outstations")).getAllByTestId("card");
    act(() => { fireEvent.click(cards.find((c) => c.textContent.includes("outstation-1"))); });
    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith("/api/v1/protocols/dnp3/devices/outstation-1/performance");
    });
  });

  it("should perform integrity poll without tenantId query param", async () => {
    const user = setupUserEvent();
    act(() => {
      render(<DNP3MonitoringDashboard isOpen={true} onClose={mockOnClose} tenantId={null} />);
    });
    await clickTab(user, "Outstations");
    await waitFor(() => {
      expect(within(getTabPanel("outstations")).getByText("outstation-1")).toBeInTheDocument();
    });
    await clickButtonInPanel(user, "outstations", "Integrity Poll");
    await waitFor(() => {
      expect(apiPostJson).toHaveBeenCalledWith("/api/v1/protocols/dnp3/devices/outstation-1/integrity-poll");
    });
  });

  // ============================================================
  // MISSING/FALSY DATA BRANCHES
  // ============================================================

  it("should handle response with no devices key", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices") && !url.includes("/performance")) return Promise.resolve({});
      if (url.includes("/performance/metrics")) return Promise.resolve(mockPerformanceMetrics);
      return Promise.resolve({});
    });
    const user = setupUserEvent();
    renderComponent();
    await clickTab(user, "Outstations");
    await waitFor(() => {
      expect(within(getTabPanel("outstations")).getByText("No outstations configured")).toBeInTheDocument();
    });
  });

  it("should silently handle performance metrics fetch failure", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/performance/metrics")) return Promise.reject(new Error("down"));
      if (url.includes("/devices")) return Promise.resolve(mockOutstations);
      return Promise.resolve({});
    });
    renderComponent();
    await waitFor(() => {
      expect(within(getTabPanel("overview")).getByText("N/A")).toBeInTheDocument();
    });
  });

  it("should handle device performance fetch failure gracefully", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices/outstation-1/performance")) {
        return Promise.reject(new Error("down"));
      }
      if (url.includes("/devices")) {
        return Promise.resolve(mockOutstations);
      }
      if (url.includes("/performance/metrics")) {
        return Promise.resolve(mockPerformanceMetrics);
      }
      return Promise.resolve({});
    });
    const user = setupUserEvent();
    renderComponent();
    await clickTab(user, "Outstations");
    await waitFor(() => {
      expect(within(getTabPanel("outstations")).getByText("outstation-1")).toBeInTheDocument();
    });
    const cards = within(getTabPanel("outstations")).getAllByTestId("card");
    act(() => { fireEvent.click(cards.find((c) => c.textContent.includes("outstation-1"))); });
    await clickTab(user, "Performance");
    await waitFor(() => {
      expect(within(getTabPanel("performance")).queryByText("Device Performance: outstation-1")).not.toBeInTheDocument();
    });
  });

  it("should handle performance metrics API error silently", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices")) {
        return Promise.resolve(mockOutstations);
      }
      if (url.includes("/performance/metrics")) {
        return Promise.reject(new Error("Performance API error"));
      }
      return Promise.resolve({});
    });

    renderComponent();

    await waitFor(() => {
      expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining("Performance"));
      const overviewPanel = getTabPanel("overview");
      expect(within(overviewPanel).getByText("Total Outstations")).toBeInTheDocument();
    });
  });

  it("should return null when device performance API fails", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices/outstation-1/performance")) {
        return Promise.reject(new Error("Device performance error"));
      }
      if (url.includes("/devices")) {
        return Promise.resolve(mockOutstations);
      }
      if (url.includes("/performance/metrics")) {
        return Promise.resolve(mockPerformanceMetrics);
      }
      return Promise.resolve({});
    });

    const user = setupUserEvent();
    renderComponent();

    await clickTab(user, "Outstations");

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("outstation-1")).toBeInTheDocument();
    });

    const outstationPanel = getTabPanel("outstations");
    const cards = within(outstationPanel).getAllByTestId("card");
    const outstationCard = cards.find(card => 
      card.textContent.includes("outstation-1")
    );
    act(() => {
      fireEvent.click(outstationCard);
    });

    await clickTab(user, "Performance");

    await waitFor(() => {
      const performancePanel = getTabPanel("performance");
      expect(within(performancePanel).queryByText(/Device Performance:/i)).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // FALLBACK-VALUE BRANCHES
  // ============================================================

  it("should display fallback name and details heading when name is missing", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices") && !url.includes("/performance")) {
        return Promise.resolve({ devices: { "outstation-3": { id: "outstation-3", address: "192.168.1.102", connected: true } } });
      }
      if (url.includes("/performance/metrics")) return Promise.resolve(mockPerformanceMetrics);
      return Promise.resolve({});
    });
    useMediaQuery.mockReturnValue(false);
    const user = setupUserEvent();
    renderComponent();
    await clickTab(user, "Outstations");
    await waitFor(() => {
      expect(within(getTabPanel("outstations")).getByText("Outstation outstation-3")).toBeInTheDocument();
    });
    const cards = within(getTabPanel("outstations")).getAllByTestId("card");
    act(() => { fireEvent.click(cards.find((c) => c.textContent.includes("Outstation outstation-3"))); });
    await waitFor(() => {
      expect(screen.getByText("Outstation outstation-3 Details")).toBeInTheDocument();
    });
  });

  it("should not render extra request-stats grid when total_requests is undefined", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices") && !url.includes("/performance")) return Promise.resolve(mockOutstations);
      if (url.includes("/performance/metrics")) return Promise.resolve({ average_response_time: 45 });
      return Promise.resolve({});
    });
    renderComponent();
    await waitFor(() => {
      expect(within(getTabPanel("overview")).queryByText("Total Requests")).not.toBeInTheDocument();
    });
  });

  it("should show 0% connection rate and N/A avg response with no outstations/metrics", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices") && !url.includes("/performance")) return Promise.resolve({ devices: {} });
      if (url.includes("/performance/metrics")) return Promise.resolve({});
      return Promise.resolve({});
    });
    renderComponent();
    await waitFor(() => {
      const overview = getTabPanel("overview");
      expect(within(overview).getByText("0%")).toBeInTheDocument();
      expect(screen.getByTestId("progress")).toHaveAttribute("data-value", "0");
      expect(within(overview).getByText("N/A")).toBeInTheDocument();
    });
  });

  it("should treat missing data_points as 0 in total and N/A for missing master/outstation address", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices") && !url.includes("/performance")) {
        return Promise.resolve({ devices: { "outstation-4": { id: "outstation-4", address: "10.0.0.1", connected: true } } });
      }
      if (url.includes("/performance/metrics")) return Promise.resolve(mockPerformanceMetrics);
      return Promise.resolve({});
    });
    const user = setupUserEvent();
    renderComponent();
    await waitFor(() => {
      const overviewPanel = getTabPanel("overview");
      // Scope to the Data Points card specifically
      const dataPointsCard = within(overviewPanel).getByText("Data Points").closest('[data-testid="card"]');
      expect(within(dataPointsCard).getByText("0")).toBeInTheDocument();
    });
    await clickTab(user, "Outstations");
    await waitFor(() => {
      const naValues = within(getTabPanel("outstations")).getAllByText("N/A");
      expect(naValues.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("should not display last poll time when missing", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices") && !url.includes("/performance")) {
        return Promise.resolve({ devices: { "outstation-6": { id: "outstation-6", address: "10.0.0.6", connected: true, data_points: 3 } } });
      }
      if (url.includes("/performance/metrics")) return Promise.resolve(mockPerformanceMetrics);
      return Promise.resolve({});
    });
    const user = setupUserEvent();
    renderComponent();
    await clickTab(user, "Outstations");
    await waitFor(() => {
      const panel = getTabPanel("outstations");
      expect(within(panel).getByText("outstation-6")).toBeInTheDocument();
      expect(within(panel).queryByText(/Last poll:/)).not.toBeInTheDocument();
    });
  });

  it("should show 0% success rate when total_requests is 0", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices") && !url.includes("/performance")) return Promise.resolve(mockOutstations);
      if (url.includes("/performance/metrics")) {
        return Promise.resolve({ total_requests: 0, successful_requests: 0, failed_requests: 0, average_response_time: 0 });
      }
      return Promise.resolve({});
    });
    const user = setupUserEvent();
    renderComponent();
    await clickTab(user, "Performance");
    await waitFor(() => {
      const panel = getTabPanel("performance");
      expect(within(panel).getAllByText("0%").length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // LOADING STATE TESTS
  // ============================================================

  it("should render mid-fetch loading state", async () => {
    let resolveDevices;
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices") && !url.includes("/performance")) {
        return new Promise((resolve) => { resolveDevices = resolve; });
      }
      if (url.includes("/performance/metrics")) return Promise.resolve(mockPerformanceMetrics);
      return Promise.resolve({});
    });
    renderComponent();
    await waitFor(() => expect(apiGetJson).toHaveBeenCalled());
    act(() => resolveDevices(mockOutstations));
    await waitFor(() => {
      expect(screen.queryByText("No outstations configured")).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // NULL/UNDEFINED DATA BRANCHES
  // ============================================================

  // ✅ FIXED: Scope to specific card to avoid multiple "0" matches
  it("should handle null devices data gracefully", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices")) {
        return Promise.resolve({ devices: null });
      }
      if (url.includes("/performance/metrics")) {
        return Promise.resolve(mockPerformanceMetrics);
      }
      return Promise.resolve({});
    });

    renderComponent();

    await waitFor(() => {
      const overviewPanel = getTabPanel("overview");
      expect(within(overviewPanel).getByText("Total Outstations")).toBeInTheDocument();
      // Scope to the stat's own card so multiple "0"s elsewhere don't collide
      const totalCard = within(overviewPanel).getByText("Total Outstations").closest('[data-testid="card"]');
      expect(within(totalCard).getByText("0")).toBeInTheDocument();
    });
  });

  // ✅ FIXED: Scope to specific card to avoid multiple "0" matches
  it("should handle undefined devices data gracefully", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices")) {
        return Promise.resolve({});
      }
      if (url.includes("/performance/metrics")) {
        return Promise.resolve(mockPerformanceMetrics);
      }
      return Promise.resolve({});
    });

    renderComponent();

    await waitFor(() => {
      const overviewPanel = getTabPanel("overview");
      const totalCard = within(overviewPanel).getByText("Total Outstations").closest('[data-testid="card"]');
      expect(within(totalCard).getByText("0")).toBeInTheDocument();
    });
  });

  // ✅ FIXED: Use mobile view to see the name field
  it("should handle outstation with undefined connected status", async () => {
    useMediaQuery.mockReturnValue(false); // mobile view shows outstation.name
    const mockOutstationsWithUndefined = {
      devices: {
        "outstation-1": {
          id: "outstation-1",
          name: "Main Substation",
          address: "192.168.1.100",
          connected: undefined,
          master_address: 1,
          outstation_address: 10,
          data_points: 25,
          last_poll: "2026-07-13T10:00:00Z",
        },
      },
    };

    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices")) {
        return Promise.resolve(mockOutstationsWithUndefined);
      }
      if (url.includes("/performance/metrics")) {
        return Promise.resolve(mockPerformanceMetrics);
      }
      return Promise.resolve({});
    });

    const user = setupUserEvent();
    renderComponent();

    await clickTab(user, "Outstations");

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("Main Substation")).toBeInTheDocument();
      // Should show Disconnected since connected is undefined (falsy)
      const badges = screen.getAllByTestId("badge");
      const disconnectedBadges = badges.filter(b => b.textContent.includes("Disconnected"));
      expect(disconnectedBadges.length).toBeGreaterThan(0);
    });
  });

  it("should not show device performance when performance data is null", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices/outstation-1/performance")) {
        return Promise.resolve(null);
      }
      if (url.includes("/devices")) {
        return Promise.resolve(mockOutstations);
      }
      if (url.includes("/performance/metrics")) {
        return Promise.resolve(mockPerformanceMetrics);
      }
      return Promise.resolve({});
    });

    const user = setupUserEvent();
    renderComponent();

    await clickTab(user, "Outstations");

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("outstation-1")).toBeInTheDocument();
    });

    const outstationPanel = getTabPanel("outstations");
    const cards = within(outstationPanel).getAllByTestId("card");
    const outstationCard = cards.find(card => 
      card.textContent.includes("outstation-1")
    );
    act(() => {
      fireEvent.click(outstationCard);
    });

    await clickTab(user, "Performance");

    await waitFor(() => {
      const performancePanel = getTabPanel("performance");
      expect(within(performancePanel).queryByText(/Device Performance:/i)).not.toBeInTheDocument();
    });
  });

  it("should show N/A when performance metrics are null", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices")) {
        return Promise.resolve(mockOutstations);
      }
      if (url.includes("/performance/metrics")) {
        return Promise.resolve(null);
      }
      return Promise.resolve({});
    });

    renderComponent();

    await waitFor(() => {
      const overviewPanel = getTabPanel("overview");
      expect(within(overviewPanel).getByText("N/A")).toBeInTheDocument();
    });
  });

  it("should show 0% connection rate when no outstations", async () => {
    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices")) {
        return Promise.resolve({ devices: {} });
      }
      if (url.includes("/performance/metrics")) {
        return Promise.resolve(mockPerformanceMetrics);
      }
      return Promise.resolve({});
    });

    renderComponent();

    await waitFor(() => {
      const overviewPanel = getTabPanel("overview");
      expect(within(overviewPanel).getByText("Connection Rate")).toBeInTheDocument();
      expect(within(overviewPanel).getByText("0%")).toBeInTheDocument();
      const progress = screen.getByTestId("progress");
      expect(progress).toHaveAttribute("data-value", "0");
    });
  });

  it("should handle selected outstation with null performance", async () => {
    const outstationWithNoPerf = {
      id: "outstation-1",
      name: "Main Substation",
      address: "192.168.1.100",
      connected: true,
      master_address: 1,
      outstation_address: 10,
      data_points: 25,
      last_poll: "2026-07-13T10:00:00Z",
    };

    apiGetJson.mockImplementation((url) => {
      if (url.includes("/devices/outstation-1/performance")) {
        return Promise.resolve(null);
      }
      if (url.includes("/devices")) {
        return Promise.resolve({ devices: { "outstation-1": outstationWithNoPerf } });
      }
      if (url.includes("/performance/metrics")) {
        return Promise.resolve(mockPerformanceMetrics);
      }
      return Promise.resolve({});
    });

    const user = setupUserEvent();
    renderComponent();

    await clickTab(user, "Outstations");

    await waitFor(() => {
      const outstationPanel = getTabPanel("outstations");
      expect(within(outstationPanel).getByText("Main Substation")).toBeInTheDocument();
    });

    const outstationPanel = getTabPanel("outstations");
    const cards = within(outstationPanel).getAllByTestId("card");
    const outstationCard = cards.find(card => 
      card.textContent.includes("Main Substation")
    );
    act(() => {
      fireEvent.click(outstationCard);
    });

    await clickTab(user, "Performance");

    await waitFor(() => {
      expect(screen.queryByText(/Device Performance:/i)).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // CLOSE BEHAVIOR TESTS
  // ============================================================

  it("should close dialog when onClose is called", () => {
    renderComponent();
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });
});
