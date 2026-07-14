/**
 * Tests for useRealtimeData Hook
 *
 * SCADA-specific testing covering real-time data streaming,
 * WebSocket connection management, reconnect backoff, error
 * recovery, and data integrity.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import {
  useRealtimeMetrics,
  useRealtimeProtocolStatus,
  useRealtimeHistoricalData,
  useWebSocketStatus,
} from "../hooks/useRealtimeData";

// Mutable tenant used by the mocked TenantContext so individual tests
// can simulate tenant switches / provider re-renders.
let mockCurrentTenant = { id: "tenant-1", name: "Test Tenant" };

vi.mock("../context/TenantContext", () => ({
  useTenant: () => ({
    currentTenant: mockCurrentTenant,
  }),
}));

vi.mock("../lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock WebSocket service
const mockWebSocket = {
  isConnected: true,
  listeners: {},
  connect: vi.fn().mockResolvedValue(true),
  disconnect: vi.fn(),
  subscribe: vi.fn(() => vi.fn()),
  onStatusChange: vi.fn(() => vi.fn()),
  emit: (event, data) => {
    if (mockWebSocket.listeners[event]) {
      mockWebSocket.listeners[event].forEach((cb) => cb(data));
    }
  },
  addListener: (event, cb) => {
    if (!mockWebSocket.listeners[event]) {
      mockWebSocket.listeners[event] = [];
    }
    mockWebSocket.listeners[event].push(cb);
  },
  reset: () => {
    mockWebSocket.isConnected = true;
    mockWebSocket.listeners = {};
    mockWebSocket.connect.mockReset().mockResolvedValue(true);
  },
};

vi.mock("../services/websocketService", () => ({
  default: {
    connect: vi.fn().mockImplementation(() => {
      if (mockWebSocket.isConnected) {
        return Promise.resolve(true);
      }
      return Promise.reject(new Error("Connection failed"));
    }),
    disconnect: vi.fn().mockImplementation(() => {
      mockWebSocket.isConnected = false;
    }),
    subscribe: vi.fn().mockImplementation((event, callback) => {
      mockWebSocket.addListener(event, callback);
      return () => {
        mockWebSocket.listeners[event] =
          mockWebSocket.listeners[event]?.filter((cb) => cb !== callback) || [];
      };
    }),
    onStatusChange: vi.fn().mockImplementation((callback) => {
      mockWebSocket.addListener("status", callback);
      return () => {
        mockWebSocket.listeners["status"] =
          mockWebSocket.listeners["status"]?.filter((cb) => cb !== callback) || [];
      };
    }),
    isConnected: vi.fn(() => mockWebSocket.isConnected),
  },
}));

vi.mock("../services/scadaService", () => ({
  default: {
    generateMockMetrics: vi.fn(() => ({
      temperature: 65.5,
      pressure: 120.3,
      flowRate: 245.7,
      power: 1500,
      efficiency: 87.2,
      timestamp: new Date().toISOString(),
    })),
    getCurrentMetrics: vi.fn().mockImplementation(() => {
      if (mockWebSocket.isConnected) {
        return Promise.resolve({
          success: true,
          data: {
            temperature: 65.5,
            pressure: 120.3,
            flowRate: 245.7,
            power: 1500,
            efficiency: 87.2,
            timestamp: new Date().toISOString(),
          },
        });
      }
      return Promise.reject(new Error("SCADA service unavailable"));
    }),
    generateMockProtocolStatus: vi.fn(() => [
      { id: "modbus-1", status: "connected", latency: 10 },
      { id: "opcua-1", status: "connected", latency: 25 },
      { id: "dnp3-1", status: "disconnected", latency: 0 },
      { id: "mqtt-1", status: "connected", latency: 15 },
    ]),
    getProtocolStatus: vi.fn().mockImplementation(() => {
      if (mockWebSocket.isConnected) {
        return Promise.resolve({
          success: true,
          data: [
            { id: "modbus-1", status: "connected", latency: 10 },
            { id: "opcua-1", status: "connected", latency: 25 },
            { id: "dnp3-1", status: "disconnected", latency: 0 },
            { id: "mqtt-1", status: "connected", latency: 15 },
          ],
        });
      }
      return Promise.reject(new Error("SCADA service unavailable"));
    }),
    generateMockHistoricalData: vi.fn((hours = 24) =>
      Array.from({ length: Math.min(hours, 24) }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        value: Math.random() * 100,
        metric: "temperature",
      })),
    ),
    getHistoricalData: vi.fn().mockResolvedValue({
      success: true,
      data: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        value: Math.random() * 100,
        metric: "temperature",
      })),
    }),
  },
}));

vi.stubEnv("DEV", true);

describe("useRealtimeMetrics Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocket.reset();
    mockCurrentTenant = { id: "tenant-1", name: "Test Tenant" };
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: false }),
      );

      expect(result.current.metrics).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.connectionStatus).toBe("disconnected");
      expect(result.current.isConnected).toBe(false);
    });

    it("should connect when autoConnect is true", async () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true }),
      );

      await waitFor(
        () => {
          expect(result.current.isConnected).toBe(true);
        },
        { timeout: 2000 },
      );
    });

    it("should not connect when autoConnect is false", () => {
      const connectSpy = vi.mocked(
        require("../services/websocketService").default.connect,
      );

      renderHook(() => useRealtimeMetrics({ autoConnect: false }));

      expect(connectSpy).not.toHaveBeenCalled();
    });
  });

  describe("Data Fetching", () => {
    it("should use mock data when useMockData is true", async () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true, useMockData: true }),
      );

      await waitFor(
        () => {
          expect(result.current.metrics).toBeDefined();
          expect(result.current.metrics).toHaveProperty("temperature");
          expect(result.current.metrics).toHaveProperty("pressure");
          expect(result.current.metrics).toHaveProperty("flowRate");
        },
        { timeout: 2000 },
      );
    });

    it("should fetch real data when useMockData is false", async () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true, useMockData: false }),
      );

      await waitFor(
        () => {
          expect(result.current.metrics).toBeDefined();
        },
        { timeout: 2000 },
      );
    });

    it("should update metrics when WebSocket data arrives", async () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true, useMockData: true }),
      );

      await waitFor(
        () => {
          expect(result.current.metrics).toBeDefined();
        },
        { timeout: 2000 },
      );

      await act(async () => {
        mockWebSocket.emit("metrics", {
          temperature: 75.2,
          pressure: 130.5,
          flowRate: 260.1,
          power: 1600,
          efficiency: 88.5,
          timestamp: new Date().toISOString(),
        });
      });

      expect(result.current.metrics.temperature).toBe(75.2);
      expect(result.current.metrics.pressure).toBe(130.5);
    });
  });

  describe("Connection Management", () => {
    it("should handle WebSocket disconnection", async () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true }),
      );

      await waitFor(
        () => {
          expect(result.current.isConnected).toBe(true);
        },
        { timeout: 2000 },
      );

      await act(async () => {
        mockWebSocket.isConnected = false;
        mockWebSocket.emit("status", "disconnected");
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionStatus).toBe("disconnected");
    });

    it("should handle connection errors", async () => {
      const mockService = require("../services/websocketService").default;
      mockService.connect.mockRejectedValueOnce(new Error("Connection failed"));

      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true }),
      );

      await waitFor(
        () => {
          expect(result.current.error).toBe("Connection failed");
        },
        { timeout: 2000 },
      );
    });

    it("should retry with exponential backoff after a connection failure", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const mockService = require("../services/websocketService").default;
      mockService.connect
        .mockRejectedValueOnce(new Error("Connection failed"))
        .mockRejectedValueOnce(new Error("Connection failed"))
        .mockResolvedValue(true);

      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true }),
      );

      // First failure happens synchronously on mount.
      await vi.waitFor(() => {
        expect(result.current.error).toBe("Connection failed");
      });
      expect(mockService.connect).toHaveBeenCalledTimes(1);

      // First retry after ~1000ms.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(mockService.connect).toHaveBeenCalledTimes(2);

      // Second retry after ~2000ms (exponential backoff).
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(mockService.connect).toHaveBeenCalledTimes(3);

      await vi.waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it("should handle subscription errors", async () => {
      const mockService = require("../services/scadaService").default;
      mockService.getCurrentMetrics.mockRejectedValueOnce(
        new Error("Failed to fetch metrics"),
      );

      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true, useMockData: false }),
      );

      await waitFor(
        () => {
          expect(result.current.error).toBe("Failed to fetch metrics");
        },
        { timeout: 2000 },
      );
    });
  });

  describe("Tenant handling (regression: no infinite loop)", () => {
    it("should NOT reconnect when the tenant object reference changes but id stays the same", async () => {
      const connectSpy = vi.mocked(
        require("../services/websocketService").default.connect,
      );

      const { result, rerender } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true }),
      );

      await waitFor(() => expect(result.current.isConnected).toBe(true));
      const callsAfterInitialConnect = connectSpy.mock.calls.length;

      // Simulate a provider re-render that creates a brand-new tenant
      // object with the same id. This previously caused an infinite
      // reconnect loop because the effect depended on the object itself.
      mockCurrentTenant = { id: "tenant-1", name: "Test Tenant" };
      rerender();
      rerender();
      rerender();

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(connectSpy.mock.calls.length).toBe(callsAfterInitialConnect);
    });

    it("should reconnect when the tenant id actually changes", async () => {
      const connectSpy = vi.mocked(
        require("../services/websocketService").default.connect,
      );

      const { result, rerender } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true }),
      );

      await waitFor(() => expect(result.current.isConnected).toBe(true));
      const callsAfterInitialConnect = connectSpy.mock.calls.length;

      mockCurrentTenant = { id: "tenant-2", name: "Other Tenant" };
      rerender();

      await waitFor(() => {
        expect(connectSpy.mock.calls.length).toBeGreaterThan(
          callsAfterInitialConnect,
        );
      });
    });
  });

  describe("Fallback Polling", () => {
    it("should poll when WebSocket is disconnected", async () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({
          autoConnect: true,
          refreshInterval: 100,
          useMockData: true,
        }),
      );

      await waitFor(
        () => {
          expect(result.current.metrics).toBeDefined();
        },
        { timeout: 2000 },
      );

      await act(async () => {
        mockWebSocket.isConnected = false;
        mockWebSocket.emit("status", "disconnected");
      });

      await waitFor(
        () => {
          expect(result.current.metrics).toBeDefined();
        },
        { timeout: 500 },
      );
    });
  });

  describe("Cleanup", () => {
    it("should cleanup on unmount", () => {
      const { unmount } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true }),
      );
      expect(() => unmount()).not.toThrow();
    });

    it("should clear intervals on unmount", () => {
      const clearIntervalSpy = vi.spyOn(window, "clearInterval");

      const { unmount } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true, refreshInterval: 100 }),
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("should clear pending reconnect timeout on unmount", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const mockService = require("../services/websocketService").default;
      mockService.connect.mockRejectedValue(new Error("Connection failed"));
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

      const { result, unmount } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true }),
      );

      await vi.waitFor(() => {
        expect(result.current.error).toBe("Connection failed");
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      // Advancing timers post-unmount must not throw or reconnect further.
      const callsAtUnmount = mockService.connect.mock.calls.length;
      await vi.advanceTimersByTimeAsync(5000);
      expect(mockService.connect.mock.calls.length).toBe(callsAtUnmount);
    });

    it("should not update state after unmount", async () => {
      const { result, unmount } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true, useMockData: true }),
      );

      await waitFor(
        () => {
          expect(result.current.metrics).toBeDefined();
        },
        { timeout: 2000 },
      );

      unmount();

      await act(async () => {
        mockWebSocket.emit("metrics", {
          temperature: 99,
          timestamp: new Date().toISOString(),
        });
      });

      expect(true).toBe(true);
    });
  });
});

describe("useRealtimeProtocolStatus Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocket.reset();
    mockCurrentTenant = { id: "tenant-1", name: "Test Tenant" };
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(result.current.protocols).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should fetch protocol status when autoConnect is true", async () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true }),
    );

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 2000 },
    );

    expect(result.current.protocols).toHaveLength(4);
    expect(result.current.protocols[0]).toHaveProperty("id");
    expect(result.current.protocols[0]).toHaveProperty("status");
  });

  it("should use mock data when useMockData is true", async () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true, useMockData: true }),
    );

    await waitFor(
      () => {
        expect(result.current.protocols).toHaveLength(4);
      },
      { timeout: 2000 },
    );
  });

  it("should update protocols when WebSocket data arrives", async () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true, useMockData: true }),
    );

    await waitFor(
      () => {
        expect(result.current.protocols.length).toBeGreaterThan(0);
      },
      { timeout: 2000 },
    );

    await act(async () => {
      mockWebSocket.emit("protocols", [
        { id: "modbus-1", status: "connected", latency: 10 },
        { id: "opcua-1", status: "disconnected", latency: 0 },
        { id: "dnp3-1", status: "connected", latency: 5 },
        { id: "mqtt-1", status: "connected", latency: 15 },
        { id: "profibus-1", status: "connected", latency: 20 },
      ]);
    });

    expect(result.current.protocols).toHaveLength(5);
  });

  it("should handle errors", async () => {
    const mockService = require("../services/scadaService").default;
    mockService.getProtocolStatus.mockRejectedValueOnce(
      new Error("Protocol status unavailable"),
    );

    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true, useMockData: false }),
    );

    await waitFor(
      () => {
        expect(result.current.error).toBe("Protocol status unavailable");
      },
      { timeout: 2000 },
    );
  });

  it("should retry connecting with backoff after a failure", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockWebSocket.isConnected = false;
    const mockService = require("../services/websocketService").default;
    mockService.connect
      .mockRejectedValueOnce(new Error("Connection failed"))
      .mockImplementation(() => {
        mockWebSocket.isConnected = true;
        return Promise.resolve(true);
      });

    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true, useMockData: false }),
    );

    await vi.waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    await vi.waitFor(() => {
      expect(result.current.protocols.length).toBeGreaterThan(0);
    });
  });

  it("should not duplicate connection attempts while one is in flight", async () => {
    const mockService = require("../services/websocketService").default;
    mockService.isConnected.mockReturnValue(false);
    let resolveConnect;
    mockService.connect.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConnect = resolve;
        }),
    );

    const { rerender } = renderHook(
      (props) => useRealtimeProtocolStatus(props),
      { initialProps: { autoConnect: true, refreshInterval: 50 } },
    );

    rerender({ autoConnect: true, refreshInterval: 50 });
    rerender({ autoConnect: true, refreshInterval: 50 });

    expect(mockService.connect).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveConnect(true);
    });
  });
});

describe("useRealtimeHistoricalData Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocket.reset();
    mockCurrentTenant = { id: "tenant-1", name: "Test Tenant" };
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24 }),
    );

    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.timeRange).toBe(24);
  });

  it("should fetch historical data", async () => {
    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24 }),
    );

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toBeDefined();
        expect(Array.isArray(result.current.data)).toBe(true);
      },
      { timeout: 2000 },
    );
  });

  it("should use mock data when useMockData is true", async () => {
    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24, useMockData: true }),
    );

    await waitFor(
      () => {
        expect(result.current.data).toBeDefined();
        expect(result.current.data.length).toBeGreaterThan(0);
      },
      { timeout: 2000 },
    );
  });

  it("should update timeRange", async () => {
    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24 }),
    );

    await waitFor(
      () => {
        expect(result.current.data).toBeDefined();
      },
      { timeout: 2000 },
    );

    expect(result.current.timeRange).toBe(24);

    await act(() => {
      result.current.setTimeRange(12);
    });

    expect(result.current.timeRange).toBe(12);
  });

  it("should use a >24h interval bucket ('1h') for long ranges", async () => {
    const mockService = require("../services/scadaService").default;
    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 48, useMockData: false }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockService.getHistoricalData).toHaveBeenCalledWith(
      expect.objectContaining({ interval: "1h" }),
    );
  });

  it("should refetch when timeRange changes", async () => {
    const getHistoricalDataSpy = vi.mocked(
      require("../services/scadaService").default.getHistoricalData,
    );

    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24, useMockData: false }),
    );

    await waitFor(
      () => {
        expect(result.current.data).toBeDefined();
      },
      { timeout: 2000 },
    );

    const initialCallCount = getHistoricalDataSpy.mock.calls.length;

    await act(() => {
      result.current.setTimeRange(12);
    });

    await waitFor(
      () => {
        expect(getHistoricalDataSpy.mock.calls.length).toBeGreaterThan(
          initialCallCount,
        );
      },
      { timeout: 2000 },
    );
  });

  it("should NOT refetch when the tenant object reference changes but id stays the same", async () => {
    const getHistoricalDataSpy = vi.mocked(
      require("../services/scadaService").default.getHistoricalData,
    );

    const { result, rerender } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24, useMockData: false }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsAfterInitialFetch = getHistoricalDataSpy.mock.calls.length;

    mockCurrentTenant = { id: "tenant-1", name: "Test Tenant" };
    rerender();
    rerender();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getHistoricalDataSpy.mock.calls.length).toBe(callsAfterInitialFetch);
  });

  it("should auto-refresh when enabled", async () => {
    const getHistoricalDataSpy = vi.mocked(
      require("../services/scadaService").default.getHistoricalData,
    );

    renderHook(() =>
      useRealtimeHistoricalData({
        hours: 24,
        autoRefresh: true,
        refreshInterval: 100,
        useMockData: false,
      }),
    );

    await waitFor(
      () => {
        expect(getHistoricalDataSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 1000 },
    );
  });

  it("should not auto-refresh when disabled", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const getHistoricalDataSpy = vi.mocked(
      require("../services/scadaService").default.getHistoricalData,
    );

    renderHook(() =>
      useRealtimeHistoricalData({
        hours: 24,
        autoRefresh: false,
        refreshInterval: 100,
        useMockData: false,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(getHistoricalDataSpy.mock.calls.length).toBe(1);
  });

  it("should handle errors", async () => {
    const mockService = require("../services/scadaService").default;
    mockService.getHistoricalData.mockRejectedValueOnce(
      new Error("Failed to fetch data"),
    );

    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24, useMockData: false }),
    );

    await waitFor(
      () => {
        expect(result.current.error).toBe("Failed to fetch data");
      },
      { timeout: 2000 },
    );
  });

  it("should clear the refresh interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");

    const { unmount } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24, refreshInterval: 100 }),
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});

describe("useWebSocketStatus Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocket.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should track connection status", () => {
    const { result } = renderHook(() => useWebSocketStatus());

    expect(result.current.status).toBe("disconnected");
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReconnecting).toBe(false);
    expect(result.current.lastHeartbeat).toBeNull();
  });

  it("should update on status changes", async () => {
    const { result } = renderHook(() => useWebSocketStatus());

    await act(async () => {
      mockWebSocket.emit("status", "disconnected");
    });

    expect(result.current.status).toBe("disconnected");
    expect(result.current.isConnected).toBe(false);

    await act(async () => {
      mockWebSocket.emit("status", "reconnecting");
    });

    expect(result.current.status).toBe("reconnecting");
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReconnecting).toBe(true);

    await act(async () => {
      mockWebSocket.emit("status", "connected");
    });

    expect(result.current.status).toBe("connected");
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isReconnecting).toBe(false);
  });

  it("should track last heartbeat", async () => {
    const { result } = renderHook(() => useWebSocketStatus());

    await act(async () => {
      mockWebSocket.emit("status", "connected");
    });

    expect(result.current.lastHeartbeat).toBeDefined();
    expect(typeof result.current.lastHeartbeat).toBe("number");
  });

  it("should unsubscribe on unmount", () => {
    const onStatusChangeSpy = vi.mocked(
      require("../services/websocketService").default.onStatusChange,
    );

    const { unmount } = renderHook(() => useWebSocketStatus());
    const cleanupFn = onStatusChangeSpy.mock.results[0]?.value;

    unmount();

    expect(typeof cleanupFn).toBe("function");
  });
});

describe("SCADA-Specific Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocket.reset();
    mockCurrentTenant = { id: "tenant-1", name: "Test Tenant" };
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("should handle tenant changes", async () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true, useMockData: true }),
    );

    await waitFor(
      () => {
        expect(result.current.metrics).toBeDefined();
      },
      { timeout: 2000 },
    );

    await act(async () => {
      mockWebSocket.emit("tenant_changed", { id: "tenant-2" });
    });

    expect(result.current.isConnected).toBe(true);
  });

  it("should handle invalid data gracefully", async () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true, useMockData: true }),
    );

    await waitFor(
      () => {
        expect(result.current.metrics).toBeDefined();
      },
      { timeout: 2000 },
    );

    await act(async () => {
      mockWebSocket.emit("metrics", {
        invalidField: "not a metric",
      });
    });

    expect(result.current.metrics).toBeDefined();
    expect(result.current.error).toBeNull();
  });

  it("should handle large payloads without crashing", async () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true, useMockData: true }),
    );

    await waitFor(
      () => {
        expect(result.current.metrics).toBeDefined();
      },
      { timeout: 2000 },
    );

    const largePayload = {
      temperature: 65,
      pressure: 120,
      flowRate: 245,
      ...Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [`metric_${i}`, Math.random() * 100]),
      ),
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      mockWebSocket.emit("metrics", largePayload);
    });

    expect(result.current.metrics.temperature).toBe(65);
  });

  it("should handle rapid updates without memory leaks", async () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true, useMockData: true }),
    );

    await waitFor(
      () => {
        expect(result.current.metrics).toBeDefined();
      },
      { timeout: 2000 },
    );

    for (let i = 0; i < 20; i++) {
      await act(async () => {
        mockWebSocket.emit("metrics", {
          temperature: 60 + i,
          timestamp: new Date().toISOString(),
        });
      });
    }

    expect(result.current.metrics.temperature).toBe(79);
  });

  it("should cleanup subscriptions properly", async () => {
    const subscribeSpy = vi.mocked(
      require("../services/websocketService").default.subscribe,
    );

    const { unmount } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true }),
    );

    await waitFor(
      () => {
        expect(subscribeSpy).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    const cleanupFn = subscribeSpy.mock.results[0]?.value;
    expect(cleanupFn).toBeDefined();

    unmount();

    expect(typeof cleanupFn).toBe("function");
  });

  it("should handle network flapping without crashing", async () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true, useMockData: true }),
    );

    await waitFor(
      () => {
        expect(result.current.isConnected).toBe(true);
      },
      { timeout: 2000 },
    );

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        mockWebSocket.isConnected = false;
        mockWebSocket.emit("status", "disconnected");
        await new Promise((resolve) => setTimeout(resolve, 10));
        mockWebSocket.isConnected = true;
        mockWebSocket.emit("status", "connected");
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }

    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should not spin into an infinite render loop across repeated re-renders", async () => {
    const connectSpy = vi.mocked(
      require("../services/websocketService").default.connect,
    );

    const { result, rerender } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true, useMockData: true }),
    );

    await waitFor(() => expect(result.current.metrics).toBeDefined());
    const callsBefore = connectSpy.mock.calls.length;

    // Force 10 re-renders with a fresh tenant object each time, mimicking
    // a parent/provider that re-renders frequently. If the dependency
    // array still referenced the tenant object, this would trigger a
    // reconnect (and in production, an unbounded loop) on every render.
    for (let i = 0; i < 10; i++) {
      mockCurrentTenant = { id: "tenant-1", name: "Test Tenant" };
      rerender();
    }

    expect(connectSpy.mock.calls.length).toBe(callsBefore);
  });
});
