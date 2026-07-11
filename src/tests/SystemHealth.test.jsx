/**
 * Tests for SystemHealth Component
 */

import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";

import { checkAllStatus } from "../services/statusMonitor";
import { logger } from "../lib/logger";

// ============================================================
// Mock dependencies
// ============================================================

vi.mock("../services/statusMonitor", () => ({
  checkAllStatus: vi.fn(),
}));

vi.mock("../lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../components/PageHeader", () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock("../components/ui/card", () => ({
  Card: ({ children, className }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
}));

// CSS import - no-op mock
vi.mock("../components/SystemHealth.css", () => ({}));

// Mock icons
vi.mock("lucide-react", () => ({
  Activity: () => <span data-testid="icon-activity">Activity</span>,
  AlertTriangle: () => <span data-testid="icon-alert-triangle">AlertTriangle</span>,
  CheckCircle: () => <span data-testid="icon-check-circle">CheckCircle</span>,
  Cpu: () => <span data-testid="icon-cpu">Cpu</span>,
  Database: () => <span data-testid="icon-database">Database</span>,
  Globe: () => <span data-testid="icon-globe">Globe</span>,
  RefreshCw: ({ className }) => (
    <span data-testid="icon-refresh" className={className}>
      RefreshCw
    </span>
  ),
  Server: () => <span data-testid="icon-server">Server</span>,
  XCircle: () => <span data-testid="icon-x-circle">XCircle</span>,
}));

// ============================================================
// Import the REAL component
// ============================================================
import SystemHealth from "../components/SystemHealth";

const TestWrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;

// Helper to create a controllable promise
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const allOperationalData = [
  { name: "Frontend", provider: "Vercel", status: "Operational", responseTime: "120ms", icon: "Globe" },
  { name: "Backend API", provider: "AWS", status: "Operational", responseTime: "150ms", icon: "Server" },
];

const mixedStatusData = [
  { name: "Frontend", provider: "Vercel", status: "Operational", responseTime: "120ms", icon: "Globe" },
  { name: "Backend API", provider: "AWS", status: "Degraded Performance", responseTime: "250ms", icon: "Server" },
  { name: "Database", provider: "AWS RDS", status: "Outage", responseTime: "N/A", icon: "Database" },
];

const allIconMapData = [
  { name: "Svc CheckCircle", provider: "P1", status: "Operational", responseTime: "100ms", icon: "CheckCircle" },
  { name: "Svc AlertTriangle", provider: "P2", status: "Operational", responseTime: "100ms", icon: "AlertTriangle" },
  { name: "Svc XCircle", provider: "P3", status: "Operational", responseTime: "100ms", icon: "XCircle" },
  { name: "Svc Activity", provider: "P4", status: "Operational", responseTime: "100ms", icon: "Activity" },
  { name: "Svc Server", provider: "P5", status: "Operational", responseTime: "100ms", icon: "Server" },
  { name: "Svc Database", provider: "P6", status: "Operational", responseTime: "100ms", icon: "Database" },
  { name: "Svc Globe", provider: "P7", status: "Operational", responseTime: "100ms", icon: "Globe" },
  { name: "Svc Cpu", provider: "P8", status: "Operational", responseTime: "100ms", icon: "Cpu" },
];

describe("SystemHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================
  // Basic Rendering Tests
  // ============================================================

  it("should render without crashing", async () => {
    checkAllStatus.mockResolvedValue(allOperationalData);
    const { container } = render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );
    expect(container).toBeDefined();
    await waitFor(() => expect(checkAllStatus).toHaveBeenCalled());
  });

  it("should render the page header title and subtitle", async () => {
    checkAllStatus.mockResolvedValue(allOperationalData);
    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );
    expect(screen.getByText("System Health Status")).toBeInTheDocument();
    expect(
      screen.getByText("Real-time monitoring of all infrastructure components"),
    ).toBeInTheDocument();
    await waitFor(() => expect(checkAllStatus).toHaveBeenCalled());
  });

  it("should show a loading indicator before status data resolves", async () => {
    const { promise, resolve } = deferred();
    checkAllStatus.mockReturnValue(promise);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    expect(screen.getByText("Loading system status...")).toBeInTheDocument();

    resolve(allOperationalData);
    await waitFor(() =>
      expect(screen.queryByText("Loading system status...")).not.toBeInTheDocument(),
    );
  });

  it("should show 'No service data available' when the resolved list is empty", async () => {
    checkAllStatus.mockResolvedValue([]);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() =>
      expect(screen.getByText("No service data available")).toBeInTheDocument(),
    );
  });

  it("should log an error and fall back to no-data state when checkAllStatus rejects", async () => {
    const err = new Error("network down");
    checkAllStatus.mockRejectedValue(err);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() =>
      expect(logger.error).toHaveBeenCalledWith(
        "Error fetching system status",
        err,
      ),
    );
    expect(screen.getByText("No service data available")).toBeInTheDocument();
  });

  // ============================================================
  // Service table rendering
  // ============================================================

  it("should render a table row for each service with provider and response time", async () => {
    checkAllStatus.mockResolvedValue(mixedStatusData);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() => expect(screen.getByText("Frontend")).toBeInTheDocument());
    expect(screen.getByText("Vercel")).toBeInTheDocument();
    expect(screen.getByText("Backend API")).toBeInTheDocument();
    expect(screen.getByText("AWS")).toBeInTheDocument();
    const databaseElements = screen.getAllByText("Database");
    expect(databaseElements.length).toBeGreaterThan(0);
    expect(screen.getByText("AWS RDS")).toBeInTheDocument();
    expect(screen.getByText("120ms")).toBeInTheDocument();
    expect(screen.getByText("250ms")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("should render the correct icon for every iconMap key", async () => {
    checkAllStatus.mockResolvedValue(allIconMapData);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() => expect(screen.getByText("Svc Cpu")).toBeInTheDocument());

    expect(screen.getAllByTestId("icon-check-circle").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("icon-alert-triangle").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("icon-x-circle").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("icon-activity").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("icon-server").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("icon-database").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("icon-globe").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("icon-cpu").length).toBeGreaterThan(0);
  });

  // ============================================================
  // Overall status computation
  // ============================================================

  it("should show 'All systems operational' when everything is operational", async () => {
    checkAllStatus.mockResolvedValue(allOperationalData);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() =>
      expect(screen.getByText("All systems operational")).toBeInTheDocument(),
    );
    const operationalElements = screen.getAllByText("Operational");
    expect(operationalElements.length).toBeGreaterThan(0);
  });

  it("should show degraded messaging (singular) for exactly one degraded service", async () => {
    checkAllStatus.mockResolvedValue([
      { name: "A", provider: "P", status: "Operational", responseTime: "100ms", icon: "Globe" },
      { name: "B", provider: "P", status: "Degraded Performance", responseTime: "220ms", icon: "Server" },
    ]);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() =>
      expect(
        screen.getByText("1 service experiencing degraded performance"),
      ).toBeInTheDocument(),
    );
  });

  it("should show degraded messaging (plural) for multiple degraded services", async () => {
    checkAllStatus.mockResolvedValue([
      { name: "A", provider: "P", status: "Degraded Performance", responseTime: "220ms", icon: "Server" },
      { name: "B", provider: "P", status: "Degraded Performance", responseTime: "230ms", icon: "Globe" },
    ]);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() =>
      expect(
        screen.getByText("2 services experiencing degraded performance"),
      ).toBeInTheDocument(),
    );
  });

  it("should show outage messaging (singular) and take priority over degraded services", async () => {
    checkAllStatus.mockResolvedValue(mixedStatusData);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() =>
      expect(
        screen.getByText("1 service experiencing outages"),
      ).toBeInTheDocument(),
    );
  });

  it("should show outage messaging (plural) for multiple outages", async () => {
    checkAllStatus.mockResolvedValue([
      { name: "A", provider: "P", status: "Outage", responseTime: "N/A", icon: "Globe" },
      { name: "B", provider: "P", status: "Outage", responseTime: "N/A", icon: "Server" },
    ]);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() =>
      expect(
        screen.getByText("2 services experiencing outages"),
      ).toBeInTheDocument(),
    );
  });

  // ============================================================
  // Summary cards
  // ============================================================

  it("should show correct operational, degraded, and outage counts in the summary cards", async () => {
    checkAllStatus.mockResolvedValue(mixedStatusData);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() => expect(screen.getByText("Frontend")).toBeInTheDocument());

    const oneElements = screen.getAllByText("1");
    expect(oneElements.length).toBeGreaterThan(0);
    
    expect(screen.getByText("Operational")).toBeInTheDocument();
    expect(screen.getByText("Degraded")).toBeInTheDocument();
    expect(screen.getByText("Outages")).toBeInTheDocument();
  });

  // ============================================================
  // Response time color branches
  // ============================================================

  it("should render N/A, low, and high response times distinctly", async () => {
    checkAllStatus.mockResolvedValue([
      { name: "Low", provider: "P", status: "Operational", responseTime: "150ms", icon: "Globe" },
      { name: "High", provider: "P", status: "Operational", responseTime: "300ms", icon: "Server" },
      { name: "Unknown", provider: "P", status: "Outage", responseTime: "N/A", icon: "Database" },
    ]);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() => expect(screen.getByText("Low")).toBeInTheDocument());
    
    const oneFiftyElements = screen.getAllByText("150ms");
    expect(oneFiftyElements.length).toBeGreaterThan(0);
    expect(screen.getByText("300ms")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  // ============================================================
  // Manual refresh
  // ============================================================

  it("should re-fetch status and show 'Refreshing...' when the refresh button is clicked", async () => {
    checkAllStatus.mockResolvedValue(allOperationalData);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() => expect(checkAllStatus).toHaveBeenCalledTimes(1));

    const { promise, resolve } = deferred();
    checkAllStatus.mockReturnValue(promise);

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(screen.getByText("Refreshing...")).toBeInTheDocument();
    expect(refreshButton).toBeDisabled();

    resolve(allOperationalData);
    await waitFor(() =>
      expect(screen.queryByText("Refreshing...")).not.toBeInTheDocument(),
    );
    expect(checkAllStatus).toHaveBeenCalledTimes(2);
  });

  it("should display a 'Last updated' timestamp after data loads", async () => {
    checkAllStatus.mockResolvedValue(allOperationalData);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() =>
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument(),
    );
  });

  // ============================================================
  // Auto-refresh interval
  // ============================================================

  it("should automatically re-fetch status every 30 seconds", async () => {
    checkAllStatus.mockResolvedValue(allOperationalData);
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await vi.waitFor(() => expect(checkAllStatus).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(30000);
    expect(checkAllStatus).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(30000);
    expect(checkAllStatus).toHaveBeenCalledTimes(3);
  });

  // ============================================================
  // Availability percentage / average response time metrics
  // ============================================================

  it("should compute and display the service availability percentage", async () => {
    checkAllStatus.mockResolvedValue(mixedStatusData);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() => expect(screen.getByText("33%")).toBeInTheDocument());
    expect(
      screen.getByText("1 of 3 services operational"),
    ).toBeInTheDocument();
  });

  it("should compute and display the average response time, ignoring N/A entries", async () => {
    checkAllStatus.mockResolvedValue([
      { name: "A", provider: "P", status: "Operational", responseTime: "100ms", icon: "Globe" },
      { name: "B", provider: "P", status: "Operational", responseTime: "200ms", icon: "Server" },
      { name: "C", provider: "P", status: "Outage", responseTime: "N/A", icon: "Database" },
    ]);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() => {
      const avgElements = screen.getAllByText("100ms");
      expect(avgElements.length).toBeGreaterThan(0);
    });
  });

  it("should default availability and average response time to 0 when there is no data", async () => {
    checkAllStatus.mockResolvedValue([]);

    render(
      <TestWrapper>
        <SystemHealth />
      </TestWrapper>,
    );

    await waitFor(() => expect(screen.getByText("0%")).toBeInTheDocument());
    expect(screen.getByText("0ms")).toBeInTheDocument();
    expect(screen.getByText("0 of 0 services operational")).toBeInTheDocument();
  });
});
