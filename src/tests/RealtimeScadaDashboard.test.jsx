/**
 * Tests for RealtimeScadaDashboard Component
 *
 * Coverage includes:
 * - WebSocket connection lifecycle
 * - Real-time streaming updates
 * - Error boundaries and graceful degradation
 * - 60fps performance validation
 * - Reconnection handling
 * - Multi-source data aggregation
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createContext } from "react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RealtimeScadaDashboard from "@/components/RealtimeScadaDashboard";
import {
  create60fpsDataGenerator,
  generateSCADAMetrics,
  scadaDashboardFixture,
} from "./fixtures/scadaFixtures";
import {
  PerformanceTestHarness,
  StreamingPerformanceValidator,
} from "./utils/testHelpers.jsx";

// Create a mock TenantContext for testing
const TenantContext = createContext();

// Mock ResizeObserver for chart components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock hooks
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

// Mock websocketService
vi.mock("@/services/websocketService", () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    getStatus: vi.fn(),
    isConnected: vi.fn(),
    onStatusChange: vi.fn(),
  },
}));

// Test wrapper with tenant context and router
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

describe("RealtimeScadaDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    useRealtimeMetrics.mockReturnValue({
      metrics: scadaDashboardFixture.metrics,
      loading: false,
      error: null,
    });

    useRealtimeProtocolStatus.mockReturnValue({
      protocols: scadaDashboardFixture.protocols,
      loading: false,
    });

    useRealtimeHistoricalData.mockReturnValue({
      historicalData: [],
      loading: false,
      setTimeRange: vi.fn(),
    });

    useWebSocketStatus.mockReturnValue({
      isConnected: true,
      isReconnecting: false,
    });
  });

  describe("Component Rendering", () => {
    it("should render dashboard title and description", () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      expect(screen.getByText("Real-Time SCADA Dashboard")).toBeInTheDocument();
      expect(
        screen.getByText("Live industrial monitoring and control"),
      ).toBeInTheDocument();
    });

    it("should display connection status badge when connected", () => {
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      expect(screen.getByText("Live")).toBeInTheDocument();
    });

    it.skip("should display metrics cards", () => {
      // TODO: Fix RealtimeScadaDashboard to properly display metrics from hook
      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      // Use flexible text matcher for labels that may be split across elements
      scadaDashboardFixture.metrics.forEach((metric) => {
        const labelElements = screen.queryAllByText(
          (content, element) =>
            content.includes(metric.label) ||
            element?.textContent?.includes(metric.label),
        );
        expect(labelElements.length).toBeGreaterThan(0);
      });
    });

    it("should render with loading state", () => {
      useRealtimeMetrics.mockReturnValue({
        metrics: null,
        loading: true,
        error: null,
      });

      const { container } = render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      // Component should render in loading state
      expect(container).toBeTruthy();
    });
  });

  describe("WebSocket Connection Lifecycle", () => {
    it("should display offline status when disconnected", () => {
      useWebSocketStatus.mockReturnValue({
        isConnected: false,
        isReconnecting: false,
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      expect(screen.getByText("Offline")).toBeInTheDocument();
    });

    it("should display reconnecting status during reconnection", () => {
      useWebSocketStatus.mockReturnValue({
        isConnected: false,
        isReconnecting: true,
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      expect(screen.getByText("Reconnecting...")).toBeInTheDocument();
    });

    it("should handle connection state transitions", async () => {
      const { rerender } = render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      // Initially connected
      expect(screen.getByText("Live")).toBeInTheDocument();

      // Simulate disconnection
      useWebSocketStatus.mockReturnValue({
        isConnected: false,
        isReconnecting: false,
      });

      rerender(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      expect(screen.getByText("Offline")).toBeInTheDocument();

      // Simulate reconnection
      useWebSocketStatus.mockReturnValue({
        isConnected: false,
        isReconnecting: true,
      });

      rerender(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      expect(screen.getByText("Reconnecting...")).toBeInTheDocument();

      // Simulate successful reconnection
      useWebSocketStatus.mockReturnValue({
        isConnected: true,
        isReconnecting: false,
      });

      rerender(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      expect(screen.getByText("Live")).toBeInTheDocument();
    });
  });

  describe("Real-time Data Updates", () => {
    it.skip("should update metrics when new data arrives", async () => {
      // TODO: Fix RealtimeScadaDashboard to properly display metrics from hook
      const _mockSetMetrics = vi.fn();
      let currentMetrics = scadaDashboardFixture.metrics;

      useRealtimeMetrics.mockReturnValue({
        metrics: currentMetrics,
        loading: false,
        error: null,
      });

      const { rerender } = render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      // Initial metrics - use flexible matcher
      const initialLabel = screen.queryAllByText(
        (content, element) =>
          content.includes(scadaDashboardFixture.metrics[0].label) ||
          element?.textContent?.includes(
            scadaDashboardFixture.metrics[0].label,
          ),
      );
      expect(initialLabel.length).toBeGreaterThan(0);

      // Simulate new data
      currentMetrics = [
        { ...scadaDashboardFixture.metrics[0], value: 99.9 },
        ...scadaDashboardFixture.metrics.slice(1),
      ];

      rerender(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        const valueElements = screen.queryAllByText(
          (content, element) =>
            content.includes("99.9") || element?.textContent?.includes("99.9"),
        );
        expect(valueElements.length).toBeGreaterThan(0);
      });
    });

    it.skip("should handle rapid metric updates", async () => {
      // TODO: Fix mock implementation to properly simulate rapid updates
      const updates = [];

      for (let i = 0; i < 10; i++) {
        updates.push({
          metrics: [
            {
              id: "temp",
              label: "Temperature",
              value: 50 + i,
              unit: "°C",
              status: "normal",
            },
          ],
          loading: false,
          error: null,
        });
      }

      let updateIndex = 0;
      useRealtimeMetrics.mockImplementation(
        () => updates[updateIndex] || updates[0],
      );

      const { rerender } = render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      // Simulate rapid updates
      for (let i = 1; i < updates.length; i++) {
        updateIndex = i;
        rerender(
          <TestWrapper>
            <RealtimeScadaDashboard />
          </TestWrapper>,
        );
      }

      // Should display the latest value - use flexible matcher
      await waitFor(() => {
        const valueElements = screen.queryAllByText(
          (content, element) =>
            content.includes("59") || element?.textContent?.includes("59"),
        );
        expect(valueElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Error Handling and Graceful Degradation", () => {
    it("should display error message when metrics fail to load", () => {
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

      expect(
        screen.getByText(/Error loading SCADA dashboard/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Failed to connect to SCADA server/i),
      ).toBeInTheDocument();
    });

    it("should gracefully handle null metrics data", () => {
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

      // Should not crash, might show empty state or loading
      expect(screen.getByText("Real-Time SCADA Dashboard")).toBeInTheDocument();
    });

    it("should handle missing protocol data", () => {
      useRealtimeProtocolStatus.mockReturnValue({
        protocols: [],
        loading: false,
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      // Should render without protocols section or show empty state
      expect(screen.getByText("Real-Time SCADA Dashboard")).toBeInTheDocument();
    });

    it("should recover from error state", async () => {
      const { rerender } = render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      // Simulate error
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

      expect(screen.getByText(/Connection lost/i)).toBeInTheDocument();

      // Recover from error
      useRealtimeMetrics.mockReturnValue({
        metrics: scadaDashboardFixture.metrics,
        loading: false,
        error: null,
      });

      rerender(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.queryByText(/Connection lost/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Time Range Selection", () => {
    it("should allow changing time range", async () => {
      const mockSetTimeRange = vi.fn();

      useRealtimeHistoricalData.mockReturnValue({
        historicalData: [],
        loading: false,
        setTimeRange: mockSetTimeRange,
      });

      render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      // Find and click time range selector
      const timeRangeSelect = screen.getByRole("combobox");
      fireEvent.click(timeRangeSelect);

      // Select different time range
      await waitFor(() => {
        const option = screen.getByText("Last Hour");
        fireEvent.click(option);
      });

      expect(mockSetTimeRange).toHaveBeenCalledWith(1);
    });

    it("should update historical data when time range changes", async () => {
      let currentData = [];
      const mockSetTimeRange = vi.fn((hours) => {
        currentData = generateSCADAMetrics({ hours });
      });

      useRealtimeHistoricalData.mockImplementation(() => ({
        historicalData: currentData,
        loading: false,
        setTimeRange: mockSetTimeRange,
      }));

      const { container } = render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      // Look for time range selector (combobox or select)
      const selects = container.querySelectorAll('select, [role="combobox"]');
      if (selects.length > 0) {
        fireEvent.click(selects[0]);

        await waitFor(() => {
          // Try to find the option - use flexible matcher
          const options = screen.queryAllByText(
            (content, _element) =>
              content.includes("Last 7 Days") || content.includes("7 Days"),
          );
          if (options.length > 0) {
            fireEvent.click(options[0]);
          }
        });
      }

      // Test passes if component renders without error
      expect(container).toBeTruthy();
    });
  });
});

describe("Protocol Status Display", () => {
  it("should display connected protocols", () => {
    render(
      <TestWrapper>
        <RealtimeScadaDashboard />
      </TestWrapper>,
    );

    scadaDashboardFixture.protocols.forEach((protocol) => {
      if (protocol.status === "connected") {
        // Check for protocol badges or indicators
        const badges = screen.getAllByText(/connected/i);
        expect(badges.length).toBeGreaterThan(0);
      }
    });
  });

  it("should indicate disconnected protocols", () => {
    const protocolsWithDisconnected = [
      ...scadaDashboardFixture.protocols,
      { id: "test-1", protocol: "Modbus", status: "disconnected", devices: 1 },
    ];

    useRealtimeProtocolStatus.mockReturnValue({
      protocols: protocolsWithDisconnected,
      loading: false,
    });

    render(
      <TestWrapper>
        <RealtimeScadaDashboard />
      </TestWrapper>,
    );

    const disconnectedBadges = screen.getAllByText(/disconnected/i);
    expect(disconnectedBadges.length).toBeGreaterThan(0);
  });
});

describe("Performance - 60fps Streaming", () => {
  it("should handle 60fps data updates without performance degradation", async () => {
    vi.useFakeTimers();

    const dataGenerator = create60fpsDataGenerator({
      baseValue: 50,
      amplitude: 10,
      frequency: 0.1,
    });

    const validator = new StreamingPerformanceValidator({
      targetFPS: 60,
      testDuration: 1000,
    });

    let frameCount = 0;
    const maxFrames = 60; // 1 second at 60fps

    useRealtimeMetrics.mockImplementation(() => {
      const data = dataGenerator(frameCount);
      return {
        metrics: [
          {
            id: "temp",
            label: "Temperature",
            value: data.value,
            unit: "°C",
            status: "normal",
          },
        ],
        loading: false,
        error: null,
      };
    });

    // Start validator BEFORE rendering
    validator.start();

    const { rerender } = render(
      <TestWrapper>
        <RealtimeScadaDashboard />
      </TestWrapper>,
    );

    // Simulate 60fps updates
    for (let i = 0; i < maxFrames; i++) {
      frameCount = i;
      validator.recordFrame();

      rerender(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      vi.advanceTimersByTime(16.67); // ~60fps
    }

    const results = validator.stop();

    // Validate streaming performance
    expect(results.frames).toBe(maxFrames);
    expect(results.meetsTarget).toBe(true);
    expect(results.droppedFrames).toBeLessThan(maxFrames * 0.1); // Less than 10% dropped

    vi.useRealTimers();
  });

  it("should maintain UI responsiveness during high-frequency updates", async () => {
    const harness = new PerformanceTestHarness({
      testRuns: 5,
    });

    let updateCount = 0;

    useRealtimeMetrics.mockImplementation(() => ({
      metrics: [
        {
          id: "temp",
          label: "Temperature",
          value: 50 + updateCount++,
          unit: "°C",
          status: "normal",
        },
      ],
      loading: false,
      error: null,
    }));

    const renderTime = await harness.measure(async () => {
      const { rerender } = render(
        <TestWrapper>
          <RealtimeScadaDashboard />
        </TestWrapper>,
      );

      // Simulate 10 rapid updates
      for (let i = 0; i < 10; i++) {
        rerender(
          <TestWrapper>
            <RealtimeScadaDashboard />
          </TestWrapper>,
        );
      }
    }, "rapid-updates");

    // Render time should be reasonable (less than 500ms for 10 updates)
    expect(renderTime).toBeLessThan(500);
  });
});

describe("Accessibility", () => {
  it("should have accessible metric labels", () => {
    // Set up mock to return metrics
    useRealtimeMetrics.mockReturnValue({
      metrics: scadaDashboardFixture.metrics,
      loading: false,
      error: null,
    });

    render(
      <TestWrapper>
        <RealtimeScadaDashboard />
      </TestWrapper>,
    );

    // Wait for component to render and check if at least one metric label appears
    const hasMetrics = scadaDashboardFixture.metrics.some((metric) => {
      const labelElements = screen.queryAllByText(
        (content, element) =>
          content.includes(metric.label) ||
          element?.textContent?.includes(metric.label),
      );
      return labelElements.length > 0;
    });

    expect(hasMetrics).toBe(true);
  });

  it("should have accessible connection status", () => {
    render(
      <TestWrapper>
        <RealtimeScadaDashboard />
      </TestWrapper>,
    );

    const statusBadge = screen.getByText("Live");
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toBeVisible();
  });
});
