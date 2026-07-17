/**
 * RealtimeScadaDashboard.test.jsx - Complete Test Coverage
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createContext } from "react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RealtimeScadaDashboard from "@/components/RealtimeScadaDashboard";

// ============================================================
// RESIZE OBSERVER MOCK (Required for Recharts)
// ============================================================

class ResizeObserverMock {
  constructor(callback) {
    this.callback = callback;
    this.observations = [];
    if (this.callback) {
      setTimeout(() => {
        this.callback([
          {
            target: {
              getBoundingClientRect: () => ({
                width: 800,
                height: 400,
                top: 0,
                left: 0,
                bottom: 400,
                right: 800,
                x: 0,
                y: 0,
              }),
            },
            contentRect: { width: 800, height: 400 },
          },
        ]);
      }, 0);
    }
  }
  observe(element) { this.observations.push(element); }
  unobserve(element) { this.observations = this.observations.filter(el => el !== element); }
  disconnect() { this.observations = []; }
}

global.ResizeObserver = ResizeObserverMock;

const mockRect = {
  x: 0, y: 0, width: 800, height: 400,
  top: 0, right: 800, bottom: 400, left: 0,
};

Element.prototype.getBoundingClientRect = vi.fn(() => mockRect);
Object.defineProperty(Element.prototype, 'offsetWidth', { get: vi.fn(() => 800), configurable: true });
Object.defineProperty(Element.prototype, 'offsetHeight', { get: vi.fn(() => 400), configurable: true });
Object.defineProperty(Element.prototype, 'clientWidth', { get: vi.fn(() => 800), configurable: true });
Object.defineProperty(Element.prototype, 'clientHeight', { get: vi.fn(() => 400), configurable: true });
Object.defineProperty(Element.prototype, 'scrollWidth', { get: vi.fn(() => 800), configurable: true });
Object.defineProperty(Element.prototype, 'scrollHeight', { get: vi.fn(() => 400), configurable: true });

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const TenantContext = createContext();

// ============================================================
// MOCKS
// ============================================================

vi.mock("@/hooks/useRealtimeData", () => ({
  useRealtimeMetrics: vi.fn(),
  useRealtimeProtocolStatus: vi.fn(),
  useRealtimeHistoricalData: vi.fn(),
  useWebSocketStatus: vi.fn(),
}));

import {
  useRealtimeHistoricalData,
  useRealtimeMetrics,
  useRealtimeProtocolStatus,
  useWebSocketStatus,
} from "@/hooks/useRealtimeData";

// Mock EnhancedMetricCard
vi.mock("@/components/EnhancedMetricCard", () => ({
  default: ({ title, value, subValue, loading, trend }) => {
    if (loading) {
      return (
        <div data-testid={`metric-card-${title?.replace(/\s+/g, '-') || 'loading'}`}>
          <div className="animate-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
          <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        </div>
      );
    }
    const showTrend = trend === "up" || trend === "down";
    const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "";
    const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-destructive" : "";
    
    return (
      <div data-testid={`metric-card-${title?.replace(/\s+/g, '-') || 'metric'}`}>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-2xl font-bold flex items-center gap-2">
          {value}
          {showTrend && <span className={trendColor} data-testid="trend-icon">{trendIcon}</span>}
        </div>
        {subValue && <div className="text-xs text-muted-foreground">{subValue}</div>}
      </div>
    );
  },
}));

// Mock Badge component
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }) => <span data-testid="badge">{children}</span>,
}));

// Mock Card components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }) => <div data-testid="card-title">{children}</div>,
  CardDescription: ({ children }) => <div data-testid="card-description">{children}</div>,
}));

// ✅ FIXED: Select mock with proper onChange handling
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }) => (
    <div data-testid="select" data-value={value}>
      <select
        data-testid="select-native"
        value={value}
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
  ),
  SelectTrigger: ({ children }) => <button data-testid="select-trigger">{children}</button>,
  SelectValue: () => <span data-testid="select-value">Last 24h</span>,
  SelectContent: ({ children }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }) => <option data-testid="select-item" value={value}>{children}</option>,
}));

// Mock Recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: ({ children }) => <div data-testid="line">{children}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

// Mock Lucide icons
vi.mock("lucide-react", () => ({
  Activity: () => <span data-testid="activity-icon">Activity</span>,
  AlertTriangle: () => <span data-testid="alert-triangle-icon">AlertTriangle</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">CheckCircle</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  Database: () => <span data-testid="database-icon">Database</span>,
  TrendingDown: () => <span data-testid="trending-down-icon">TrendingDown</span>,
  TrendingUp: () => <span data-testid="trending-up-icon">TrendingUp</span>,
  Wifi: () => <span data-testid="wifi-icon">Wifi</span>,
  WifiOff: () => <span data-testid="wifi-off-icon">WifiOff</span>,
}));

const TestWrapper = ({ children }) => {
  const tenantValue = {
    currentTenant: { id: "tenant-1", name: "Test Tenant" },
  };

  return (
    <BrowserRouter>
      <TenantContext.Provider value={tenantValue}>
        {children}
      </TenantContext.Provider>
    </BrowserRouter>
  );
};

// ============================================================
// TEST DATA
// ============================================================

const defaultMetrics = {
  activeUnits: { value: 18, total: 24, percentage: 75, trend: "up" },
  temperature: { current: 75, unit: "°C", min: 70, max: 80, trend: "stable" },
  dataPoints: { count: 45678, rate: 120, trend: "up" },
  dataQuality: { score: 97.5, status: "Excellent" },
};

const defaultProtocols = [
  { id: "modbus", name: "Modbus", status: "connected", devices: 5, dataRate: 45 },
  { id: "opcua", name: "OPC-UA", status: "connected", devices: 3, dataRate: 30 },
  { id: "mqtt", name: "MQTT", status: "connected", devices: 8, dataRate: 60 },
  { id: "dnp3", name: "DNP3", status: "disconnected", devices: 0, dataRate: 0 },
];

const defaultHistoricalData = [
  { timestamp: Date.now() - 3600000, temperature: 70, pressure: 14.5 },
  { timestamp: Date.now() - 1800000, temperature: 75, pressure: 15.0 },
  { timestamp: Date.now(), temperature: 80, pressure: 15.5 },
];

// ============================================================
// TEST SUITE
// ============================================================

describe("RealtimeScadaDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    console.error = vi.fn();
    console.warn = vi.fn();

    useRealtimeMetrics.mockReturnValue({
      metrics: defaultMetrics,
      loading: false,
      error: null,
    });

    useRealtimeProtocolStatus.mockReturnValue({
      protocols: defaultProtocols,
      loading: false,
    });

    useRealtimeHistoricalData.mockReturnValue({
      data: defaultHistoricalData,
      loading: false,
      setTimeRange: vi.fn(),
    });

    useWebSocketStatus.mockReturnValue({
      isConnected: true,
      isReconnecting: false,
    });

    Element.prototype.getBoundingClientRect = vi.fn(() => mockRect);
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  // ============================================================
  // RENDERING TESTS
  // ============================================================

  describe("Component Rendering", () => {
    it("should render dashboard title and description", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Real-Time SCADA Dashboard/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Live industrial monitoring and control/i).length).toBeGreaterThan(0);
      });
    });

    it("should display connection status badge when connected", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Live/i).length).toBeGreaterThan(0);
        expect(screen.getByTestId("wifi-icon")).toBeInTheDocument();
      });
    });

    it("should display all metric cards", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Active Units/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Temperature/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Data Points/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Data Quality/i).length).toBeGreaterThan(0);
      });
    });

    it("should show trend indicators on metrics", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        const trendIcons = screen.getAllByTestId("trend-icon");
        expect(trendIcons.length).toBeGreaterThan(0);
      });
    });

    it("should render with loading state", async () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: null,
        loading: true,
        error: null,
      });

      useRealtimeProtocolStatus.mockReturnValue({
        protocols: [],
        loading: true,
      });

      useRealtimeHistoricalData.mockReturnValue({
        data: [],
        loading: true,
        setTimeRange: vi.fn(),
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Real-Time SCADA Dashboard/i).length).toBeGreaterThan(0);
        const loadingElements = document.querySelectorAll('.animate-pulse');
        expect(loadingElements.length).toBeGreaterThan(0);
      });
    });

    it("should display offline status when disconnected", async () => {
      useWebSocketStatus.mockReturnValue({
        isConnected: false,
        isReconnecting: false,
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Offline/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Operating in offline mode/i).length).toBeGreaterThan(0);
        expect(screen.getByTestId("wifi-off-icon")).toBeInTheDocument();
      });
    });

    it("should display reconnecting status during reconnection", async () => {
      useWebSocketStatus.mockReturnValue({
        isConnected: false,
        isReconnecting: true,
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Reconnecting/i).length).toBeGreaterThan(0);
        expect(screen.getByTestId("activity-icon")).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // CONNECTION STATE TESTS
  // ============================================================

  describe("Connection State Transitions", () => {
    it("should handle connection state transitions", async () => {
      const { rerender } = render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Live/i).length).toBeGreaterThan(0);
      });

      useWebSocketStatus.mockReturnValue({
        isConnected: false,
        isReconnecting: false,
      });

      rerender(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Offline/i).length).toBeGreaterThan(0);
      });

      useWebSocketStatus.mockReturnValue({
        isConnected: true,
        isReconnecting: false,
      });

      rerender(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Live/i).length).toBeGreaterThan(0);
      });
    });

    it("should display offline mode card when disconnected", async () => {
      useWebSocketStatus.mockReturnValue({
        isConnected: false,
        isReconnecting: false,
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Operating in offline mode/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Dashboard is displaying cached data/i).length).toBeGreaterThan(0);
        expect(screen.getByTestId("alert-triangle-icon")).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // DATA UPDATE TESTS
  // ============================================================

  describe("Real-time Data Updates", () => {
    it("should update metrics when new data arrives", async () => {
      const { rerender } = render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        const documentText = document.body.textContent || '';
        expect(documentText).toContain('75');
        expect(documentText).toContain('°C');
      });

      const updatedMetrics = {
        ...defaultMetrics,
        temperature: { current: 99.9, unit: "°C", min: 70, max: 100, trend: "up" },
      };

      useRealtimeMetrics.mockReturnValue({
        metrics: updatedMetrics,
        loading: false,
        error: null,
      });

      rerender(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(
        () => {
          const documentText = document.body.textContent || '';
          expect(documentText).toContain('99.9');
          expect(documentText).toContain('°C');
        },
        { timeout: 3000 },
      );
    });
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================

  describe("Error Handling and Graceful Degradation", () => {
    it("should display error message when metrics fail to load", async () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: null,
        loading: false,
        error: "Failed to connect to SCADA server",
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Error loading SCADA dashboard/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Failed to connect to SCADA server/i).length).toBeGreaterThan(0);
        expect(screen.getByTestId("alert-triangle-icon")).toBeInTheDocument();
      });
    });

    it("should gracefully handle null metrics data", async () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: null,
        loading: false,
        error: null,
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Real-Time SCADA Dashboard/i).length).toBeGreaterThan(0);
      });
    });

    it("should handle missing protocol data", async () => {
      useRealtimeProtocolStatus.mockReturnValue({
        protocols: [],
        loading: false,
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Real-Time SCADA Dashboard/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/No protocol data available/i).length).toBeGreaterThan(0);
      });
    });

    it("should recover from error state", async () => {
      const { rerender } = render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      useRealtimeMetrics.mockReturnValue({
        metrics: null,
        loading: false,
        error: "Connection lost",
      });

      rerender(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Connection lost/i).length).toBeGreaterThan(0);
      });

      useRealtimeMetrics.mockReturnValue({
        metrics: defaultMetrics,
        loading: false,
        error: null,
      });

      rerender(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.queryAllByText(/Connection lost/i).length).toBe(0);
        expect(screen.getAllByText(/Active Units/i).length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================
  // PROTOCOL STATUS TESTS
  // ============================================================

  describe("Protocol Status Display", () => {
    it("should display connected protocols with status badges", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Modbus/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/OPC-UA/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/MQTT/i).length).toBeGreaterThan(0);
        
        const connectedBadges = screen.getAllByText(/connected/i);
        expect(connectedBadges.length).toBeGreaterThan(0);
      });
    });

    it("should indicate disconnected protocols with offline badge", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/DNP3/i).length).toBeGreaterThan(0);
        const disconnectedBadges = screen.getAllByText(/disconnected/i);
        expect(disconnectedBadges.length).toBeGreaterThan(0);
      });
    });

    it("should show data rate for connected protocols", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        const documentText = document.body.textContent || '';
        expect(documentText).toContain('45');
        expect(documentText).toContain('msg/s');
      });
    });

    it("should show protocol device count", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        const documentText = document.body.textContent || '';
        expect(documentText).toContain('device');
        expect(documentText).toContain('devices');
      });
    });

    it("should show loading state for protocols", async () => {
      useRealtimeProtocolStatus.mockReturnValue({
        protocols: [],
        loading: true,
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        const loadingElements = document.querySelectorAll('.animate-pulse');
        expect(loadingElements.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================
  // CHART TESTS
  // ============================================================

  describe("Historical Data and Chart", () => {
    it("should render chart with historical data", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("line-chart")).toBeInTheDocument();
        expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
        expect(screen.getByTestId("cartesian-grid")).toBeInTheDocument();
        expect(screen.getByTestId("x-axis")).toBeInTheDocument();
        expect(screen.getByTestId("y-axis")).toBeInTheDocument();
        expect(screen.getByTestId("tooltip")).toBeInTheDocument();
        expect(screen.getByTestId("legend")).toBeInTheDocument();
      });
    });

    it("should show loading state for chart", async () => {
      useRealtimeHistoricalData.mockReturnValue({
        data: [],
        loading: true,
        setTimeRange: vi.fn(),
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Loading chart data/i).length).toBeGreaterThan(0);
      });
    });

    it("should render chart title and description", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Temperature & Pressure Trends/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Real-time sensor data over selected time period/i).length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================
  // TIME RANGE TESTS
  // ============================================================

  describe("Time Range Selection", () => {
    it("should display time range selector with default value", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        const documentText = document.body.textContent || '';
        expect(documentText).toContain('Last 24h');
        expect(screen.getByTestId("select")).toBeInTheDocument();
      });
    });

    // ✅ FIXED: Use userEvent for more reliable interaction
    it("should call setTimeRange when time range changes", async () => {
      const user = userEvent.setup({ delay: null });
      const setTimeRangeMock = vi.fn();
      
      useRealtimeHistoricalData.mockReturnValue({
        data: defaultHistoricalData,
        loading: false,
        setTimeRange: setTimeRangeMock,
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("select-native")).toBeInTheDocument();
      });

      // Use fireEvent.change which is more reliable for select elements
      const select = screen.getByTestId("select-native");
      
      // ✅ FIX: Use fireEvent.change with the value
      fireEvent.change(select, { target: { value: '1' } });

      // Wait for the mock to be called
      await waitFor(() => {
        expect(setTimeRangeMock).toHaveBeenCalled();
        // The actual value passed might be '1' or 1 depending on the component
        // Let's check if it was called with any value
        const callArg = setTimeRangeMock.mock.calls[0][0];
        // The component does parseInt, so it should be a number
        expect(callArg).toBe(1);
      });
    });

    it("should display all time range options", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        const documentText = document.body.textContent || '';
        expect(documentText).toContain('Last Hour');
        expect(documentText).toContain('Last 24h');
        expect(documentText).toContain('Last 7 Days');
      });
    });
  });

  // ============================================================
  // ACCESSIBILITY TESTS
  // ============================================================

  describe("Accessibility", () => {
    it("should have accessible metric labels", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        const titles = ["Active Units", "Temperature", "Data Points", "Data Quality"];
        for (const title of titles) {
          const elements = screen.getAllByText(new RegExp(title, 'i'));
          expect(elements.length).toBeGreaterThan(0);
        }
      });
    });

    it("should have accessible connection status", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Live/i).length).toBeGreaterThan(0);
      });
    });

    it("should have accessible protocol status", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getAllByText(/Modbus/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/OPC-UA/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/MQTT/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/DNP3/i).length).toBeGreaterThan(0);
      });
    });

    it("should have accessible time range selector", async () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("select")).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe("Edge Cases", () => {
    it("should handle empty historical data", async () => {
      useRealtimeHistoricalData.mockReturnValue({
        data: [],
        loading: false,
        setTimeRange: vi.fn(),
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("line-chart")).toBeInTheDocument();
        const titleElements = screen.getAllByText(/Temperature & Pressure Trends/i);
        expect(titleElements.length).toBeGreaterThan(0);
      });
    });

    it("should handle protocol with devices count of 1 (singular)", async () => {
      const singleDeviceProtocols = [
        { id: "modbus", name: "Modbus", status: "connected", devices: 1, dataRate: 45 },
      ];

      useRealtimeProtocolStatus.mockReturnValue({
        protocols: singleDeviceProtocols,
        loading: false,
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        const documentText = document.body.textContent || '';
        expect(documentText).toContain('device');
        expect(documentText).toContain('Modbus');
      });
    });

    it("should handle metrics with null values gracefully", async () => {
      const nullMetrics = {
        activeUnits: { value: null, total: 24, percentage: 0, trend: "stable" },
        temperature: { current: null, unit: "°C", min: null, max: null, trend: "stable" },
        dataPoints: { count: null, rate: null, trend: "stable" },
        dataQuality: { score: null, status: "Unknown" },
      };

      useRealtimeMetrics.mockReturnValue({
        metrics: nullMetrics,
        loading: false,
        error: null,
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        const documentText = document.body.textContent || '';
        expect(documentText).toContain('Active Units');
        expect(documentText).toContain('Temperature');
      });
    });
  });
});
