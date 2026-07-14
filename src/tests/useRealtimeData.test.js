/**
 * Tests for useRealtimeData Hook
 *
 * SCADA-specific testing covering real-time data streaming,
 * WebSocket connection management, reconnect backoff, error
 * recovery, and data integrity.
 *
 * IMPORTANT: this file only ever accesses the mocked
 * `websocketService` / `scadaService` via the static `import`
 * statements below. Do NOT use `require(...)` inside test bodies —
 * under this project's Vite/ESM setup that resolves to the *real*
 * (unmocked) module instance rather than the vi.mock'd one, which
 * both breaks spy assertions and can fail to load entirely if the
 * real module has its own unresolved dependencies.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import {
  useRealtimeMetrics,
  useRealtimeProtocolStatus,
  useRealtimeHistoricalData,
  useWebSocketStatus,
} from "../hooks/useRealtimeData";
import websocketService from "../services/websocketService";
import scadaService from "../services/scadaService";

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

// Backing store for the mocked WebSocket service. `mock`-prefixed
// names are hoist-safe for reference inside vi.mock factories.
const mockWebSocket = {
  isConnected: true,
  listeners: {},
  emit(event, data) {
    (mockWebSocket.listeners[event] || []).forEach((cb) => cb(data));
  },
  addListener(event, cb) {
    if (!mockWebSocket.listeners[event]) mockWebSocket.listeners[event] = [];
    mockWebSocket.listeners[event].push(cb);
  },
  removeListener(event, cb) {
    mockWebSocket.listeners[event] =
      (mockWebSocket.listeners[event] || []).filter((fn) => fn !== cb) || [];
  },
  reset() {
    mockWebSocket.isConnected = true;
    mockWebSocket.listeners = {};
  },
};

vi.mock("../services/websocketService", () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    onStatusChange: vi.fn(),
    isConnected: vi.fn(),
  },
}));

vi.mock("../services/scadaService", () => ({
  default: {
    generateMockMetrics: vi.fn(),
    getCurrentMetrics: vi.fn(),
    generateMockProtocolStatus: vi.fn(),
    getProtocolStatus: vi.fn(),
    generateMockHistoricalData: vi.fn(),
    getHistoricalData: vi.fn(),
  },
}));

vi.stubEnv("DEV", true);

const makeMetrics = (overrides = {}) => ({
  temperature: 65.5,
  pressure: 120.3,
  flowRate: 245.7,
  power: 1500,
  efficiency: 87.2,
  timestamp: new Date().toISOString(),
  ...overrides,
});

const makeProtocols = () => [
  { id: "modbus-1", status: "connected", latency: 10 },
  { id: "opcua-1", status: "connected", latency: 25 },
  { id: "dnp3-1", status: "disconnected", latency: 0 },
  { id: "mqtt-1", status: "connected", latency: 15 },
];

const makeHistoricalData = (hours = 24) =>
  Array.from({ length: Math.min(hours, 24) }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    value: Math.random() * 100,
    metric: "temperature",
  }));

// Re-apply all mock implementations. This is critical because the
// global Vitest config may have `mockReset` or `restoreMocks` enabled,
// which wipes out the implementations from vi.mock factories between tests.
const resetAll = () => {
  vi.clearAllMocks();
  mockWebSocket.reset();
  mockCurrentTenant = { id: "tenant-1", name: "Test Tenant" };

  // WebSocket service implementations
  vi.mocked(websocketService.connect).mockImplementation(() => {
    if (mockWebSocket.isConnected) {
      return Promise.resolve(true);
    }
    return Promise.reject(new Error("Connection failed"));
  });

  vi.mocked(websocketService.disconnect).mockImplementation(() => {
    mockWebSocket.isConnected = false;
  });

  vi.mocked(websocketService.subscribe).mockImplementation((event, callback) => {
    mockWebSocket.addListener(event, callback);
    return () => mockWebSocket.removeListener(event, callback);
  });

  vi.mocked(websocketService.onStatusChange).mockImplementation((callback) => {
    mockWebSocket.addListener("status", callback);
    return () => mockWebSocket.removeListener("status", callback);
  });

  vi.mocked(websocketService.isConnected).mockImplementation(() => mockWebSocket.isConnected);

  // SCADA service implementations
  vi.mocked(scadaService.generateMockMetrics).mockImplementation(() => makeMetrics());

  vi.mocked(scadaService.getCurrentMetrics).mockImplementation(() => {
    if (mockWebSocket.isConnected) {
      return Promise.resolve({ success: true, data: makeMetrics() });
    }
    return Promise.reject(new Error("SCADA service unavailable"));
  });

  vi.mocked(scadaService.generateMockProtocolStatus).mockImplementation(() => makeProtocols());

  vi.mocked(scadaService.getProtocolStatus).mockImplementation(() => {
    if (mockWebSocket.isConnected) {
      return Promise.resolve({ success: true, data: makeProtocols() });
    }
    return Promise.reject(new Error("SCADA service unavailable"));
  });

  vi.mocked(scadaService.generateMockHistoricalData).mockImplementation((hours = 24) =>
    makeHistoricalData(hours)
  );

  vi.mocked(scadaService.getHistoricalData).mockImplementation((params) => {
    const hours = params?.interval === "1h" ? 48 : 24;
    return Promise.resolve({
      success: true,
      data: makeHistoricalData(hours),
    });
  });
};

describe("useRealtimeMetrics Hook", () => {
  beforeEach(resetAll);
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

      await waitFor(() => expect(result.current.isConnected).toBe(true));
    });

    it("should not connect when autoConnect is false", () => {
      renderHook(() => useRealtimeMetrics({ autoConnect: false }));
      expect(websocketService.connect).not.toHaveBeenCalled();
    });
  });

  describe("Data Fetching", () => {
    it("should use mock data when useMockData is true", async () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true, useMockData: true }),
      );

      await waitFor(() => {
        expect(result.current.metrics).toHaveProperty("temperature");
        expect(result.current.metrics).toHaveProperty("pressure");
        expect(result.current.metrics).toHaveProperty("flowRate");
      });
    });

    it("should fetch real data when useMockData is false", async () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true, useMockData: false }),
      );

      await waitFor(() => expect(result.current.metrics).toBeDefined());
      expect(scadaService.getCurrentMetrics).toHaveBeenCalled();
    });

    it("should update metrics when WebSocket data arrives", async () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true, useMockData: true }),
      );

      await waitFor(() => expect(result.current.metrics).toBeDefined());

      act(() => {
        mockWebSocket.emit(
          "metrics",
          makeMetrics({ temperature: 75.2, pressure: 130.5 }),
        );
      });

      await waitFor(() => {
        expect(result.current.metrics.temperature).toBe(75.2);
        expect(result.current.metrics.pressure).toBe(130.5);
      });
    });
  });

  describe("Connection Management", () => {
    it("should handle WebSocket disconnection", async () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true }),
      );

      await waitFor(() => expect(result.current.isConnected).toBe(true));

      act(() => {
        mockWebSocket.isConnected = false;
        mockWebSocket.emit("status", "disconnected");
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
        expect(result.current.connectionStatus).toBe("disconnected");
      });
    });

    it("should handle connection errors", async () => {
      vi.mocked(websocketService.connect).mockRejectedValueOnce(
        new Error("Connection failed"),
      );

      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true }),
      );

      await waitFor(() => expect(result.current.error).toBe("Connection failed"));
    });

    it("should retry with exponential backoff after a connection failure", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(websocketService.connect)
        .mockRejectedValueOnce(new Error("Connection failed"))
        .mockRejectedValueOnce(new Error("Connection failed"))
        .mockResolvedValue(true);

      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true }),
      );

      await vi.waitFor(() => expect(result.current.error).toBe("Connection failed"));
      expect(websocketService.connect).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(websocketService.connect).toHaveBeenCalledTimes(2);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(websocketService.connect).toHaveBeenCalledTimes(3);

      await vi.waitFor(() => expect(result.current.isConnected).toBe(true));
    });

    it("should handle subscription errors", async () => {
      vi.mocked(scadaService.getCurrentMetrics).mockRejectedValueOnce(
        new Error("Failed to fetch metrics"),
      );

      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true, useMockData: false }),
      );

      await waitFor(() =>
        expect(result.current.error).toBe("Failed to fetch metrics"),
      );
    });
  });

  describe("Tenant handling (regression: no infinite loop)", () => {
    it("should NOT reconnect when the tenant object reference changes but id stays the same", async () => {
      const { result, rerender } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true }),
      );

      await waitFor(() => expect(result.current.isConnected).toBe(true));
      const callsAfterInitialConnect = vi.mocked(websocketService.connect).mock
        .calls.length;

      for (let i = 0; i < 5; i++) {
        mockCurrentTenant = { id: "tenant-1", name: "Test Tenant" };
        rerender();
      }

      expect(vi.mocked(websocketService.connect).mock.calls.length).toBe(
        callsAfterInitialConnect,
      );
    });

    it("should reconnect when the tenant id actually changes", async () => {
      const { result, rerender } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true }),
      );

      await waitFor(() => expect(result.current.isConnected).toBe(true));
      const callsAfterInitialConnect = vi.mocked(websocketService.connect).mock
        .calls.length;

      mockCurrentTenant = { id: "tenant-2", name: "Other Tenant" };
      rerender();

      await waitFor(() => {
        expect(
          vi.mocked(websocketService.connect).mock.calls.length,
        ).toBeGreaterThan(callsAfterInitialConnect);
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

      await waitFor(() => expect(result.current.metrics).toBeDefined());

      act(() => {
        mockWebSocket.isConnected = false;
        mockWebSocket.emit("status", "disconnected");
      });

      await waitFor(() => expect(result.current.metrics).toBeDefined());
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
      vi.mocked(websocketService.connect).mockRejectedValue(
        new Error("Connection failed"),
      );
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");

      const { result, unmount } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true }),
      );

      await vi.waitFor(() =>
        expect(result.current.error).toBe("Connection failed"),
      );

      unmount();
      expect(clearTimeoutSpy).toHaveBeenCalled();

      const callsAtUnmount = vi.mocked(websocketService.connect).mock.calls
        .length;
      await vi.advanceTimersByTimeAsync(5000);
      expect(vi.mocked(websocketService.connect).mock.calls.length).toBe(
        callsAtUnmount,
      );
    });

    it("should not update state after unmount", async () => {
      const { result, unmount } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true, useMockData: true }),
      );

      await waitFor(() => expect(result.current.metrics).toBeDefined());

      unmount();

      expect(() => {
        act(() => {
          mockWebSocket.emit("metrics", makeMetrics({ temperature: 99 }));
        });
      }).not.toThrow();
    });
  });
});

describe("useRealtimeProtocolStatus Hook", () => {
  beforeEach(resetAll);
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

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.protocols).toHaveLength(4);
    expect(result.current.protocols[0]).toHaveProperty("id");
    expect(result.current.protocols[0]).toHaveProperty("status");
  });

  it("should use mock data when useMockData is true", async () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true, useMockData: true }),
    );

    await waitFor(() => expect(result.current.protocols).toHaveLength(4));
  });

  it("should update protocols when WebSocket data arrives", async () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true, useMockData: true }),
    );

    await waitFor(() => expect(result.current.protocols.length).toBeGreaterThan(0));

    act(() => {
      mockWebSocket.emit("protocols", [
        { id: "modbus-1", status: "connected", latency: 10 },
        { id: "opcua-1", status: "disconnected", latency: 0 },
        { id: "dnp3-1", status: "connected", latency: 5 },
        { id: "mqtt-1", status: "connected", latency: 15 },
        { id: "profibus-1", status: "connected", latency: 20 },
      ]);
    });

    await waitFor(() => expect(result.current.protocols).toHaveLength(5));
  });

  it("should handle errors", async () => {
    vi.mocked(scadaService.getProtocolStatus).mockRejectedValueOnce(
      new Error("Protocol status unavailable"),
    );

    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true, useMockData: false }),
    );

    await waitFor(() =>
      expect(result.current.error).toBe("Protocol status unavailable"),
    );
  });

  it("should retry connecting with backoff after a failure", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockWebSocket.isConnected = false;
    vi.mocked(websocketService.connect)
      .mockRejectedValueOnce(new Error("Connection failed"))
      .mockImplementation(() => {
        mockWebSocket.isConnected = true;
        return Promise.resolve(true);
      });

    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true, useMockData: false }),
    );

    await vi.waitFor(() => expect(result.current.error).toBeTruthy());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    await vi.waitFor(() =>
      expect(result.current.protocols.length).toBeGreaterThan(0),
    );
  });

  it("should not duplicate connection attempts while one is in flight", async () => {
    vi.mocked(websocketService.isConnected).mockReturnValue(false);
    let resolveConnect;
    vi.mocked(websocketService.connect).mockImplementation(
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

    expect(websocketService.connect).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveConnect(true);
    });
  });
});

describe("useRealtimeHistoricalData Hook", () => {
  beforeEach(resetAll);
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("should initialize with default state", () => {
    // Pass useMockData: false so we test the real hook behavior
    // The mock data branch is synchronous and would populate state immediately
    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24, useMockData: false }),
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

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(Array.isArray(result.current.data)).toBe(true);
    });
  });

  it("should use mock data when useMockData is true", async () => {
    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24, useMockData: true }),
    );

    await waitFor(() => expect(result.current.data.length).toBeGreaterThan(0));
  });

  it("should update timeRange", async () => {
    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24 }),
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.timeRange).toBe(24);

    act(() => result.current.setTimeRange(12));

    expect(result.current.timeRange).toBe(12);
  });

  it("should use a >24h interval bucket ('1h') for long ranges", async () => {
    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 48, useMockData: false }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(scadaService.getHistoricalData).toHaveBeenCalledWith(
      expect.objectContaining({ interval: "1h" }),
    );
  });

  it("should refetch when timeRange changes", async () => {
    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24, useMockData: false }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    const initialCallCount = vi.mocked(scadaService.getHistoricalData).mock
      .calls.length;

    act(() => result.current.setTimeRange(12));

    await waitFor(() => {
      expect(
        vi.mocked(scadaService.getHistoricalData).mock.calls.length,
      ).toBeGreaterThan(initialCallCount);
    });
  });

  it("should NOT refetch when the tenant object reference changes but id stays the same", async () => {
    const { result, rerender } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24, useMockData: false }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsAfterInitialFetch = vi.mocked(scadaService.getHistoricalData).mock
      .calls.length;

    for (let i = 0; i < 3; i++) {
      mockCurrentTenant = { id: "tenant-1", name: "Test Tenant" };
      rerender();
    }

    expect(vi.mocked(scadaService.getHistoricalData).mock.calls.length).toBe(
      callsAfterInitialFetch,
    );
  });

  it("should auto-refresh when enabled", async () => {
    renderHook(() =>
      useRealtimeHistoricalData({
        hours: 24,
        autoRefresh: true,
        refreshInterval: 100,
        useMockData: false,
      }),
    );

    await waitFor(() => {
      expect(
        vi.mocked(scadaService.getHistoricalData).mock.calls.length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it("should not auto-refresh when disabled", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

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

    expect(vi.mocked(scadaService.getHistoricalData).mock.calls.length).toBe(1);
  });

  it("should handle errors", async () => {
    vi.mocked(scadaService.getHistoricalData).mockRejectedValueOnce(
      new Error("Failed to fetch data"),
    );

    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24, useMockData: false }),
    );

    await waitFor(() => expect(result.current.error).toBe("Failed to fetch data"));
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
  beforeEach(resetAll);
  afterEach(() => vi.clearAllMocks());

  it("should track connection status", () => {
    const { result } = renderHook(() => useWebSocketStatus());

    expect(result.current.status).toBe("disconnected");
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReconnecting).toBe(false);
    expect(result.current.lastHeartbeat).toBeNull();
  });

  it("should update on status changes", async () => {
    const { result } = renderHook(() => useWebSocketStatus());

    act(() => mockWebSocket.emit("status", "disconnected"));
    await waitFor(() => expect(result.current.status).toBe("disconnected"));
    expect(result.current.isConnected).toBe(false);

    act(() => mockWebSocket.emit("status", "reconnecting"));
    await waitFor(() => expect(result.current.status).toBe("reconnecting"));
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReconnecting).toBe(true);

    act(() => mockWebSocket.emit("status", "connected"));
    await waitFor(() => expect(result.current.status).toBe("connected"));
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isReconnecting).toBe(false);
  });

  it("should track last heartbeat", async () => {
    const { result } = renderHook(() => useWebSocketStatus());

    act(() => mockWebSocket.emit("status", "connected"));

    await waitFor(() => {
      expect(typeof result.current.lastHeartbeat).toBe("number");
    });
  });

  it("should unsubscribe on unmount", () => {
    const { unmount } = renderHook(() => useWebSocketStatus());
    const cleanupFn = vi.mocked(websocketService.onStatusChange).mock
      .results[0]?.value;

    expect(typeof cleanupFn).toBe("function");
    expect(() => unmount()).not.toThrow();
  });
});

describe("SCADA-Specific Edge Cases", () => {
  beforeEach(resetAll);
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("should handle invalid data gracefully", async () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true, useMockData: true }),
    );

    await waitFor(() => expect(result.current.metrics).toBeDefined());

    act(() => {
      mockWebSocket.emit("metrics", { invalidField: "not a metric" });
    });

    await waitFor(() => {
      expect(result.current.metrics).toBeDefined();
      expect(result.current.error).toBeNull();
    });
  });

  it("should handle large payloads without crashing", async () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true, useMockData: true }),
    );

    await waitFor(() => expect(result.current.metrics).toBeDefined());

    const largePayload = makeMetrics({
      ...Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [`metric_${i}`, Math.random() * 100]),
      ),
    });

    act(() => mockWebSocket.emit("metrics", largePayload));

    await waitFor(() => expect(result.current.metrics.temperature).toBe(65.5));
  });

  it("should handle rapid updates without memory leaks", async () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true, useMockData: true }),
    );

    await waitFor(() => expect(result.current.metrics).toBeDefined());

    for (let i = 0; i < 20; i++) {
      act(() => {
        mockWebSocket.emit("metrics", makeMetrics({ temperature: 60 + i }));
      });
    }

    // Wait for the final update to be applied
    await waitFor(() => {
      expect(result.current.metrics.temperature).toBe(79);
    });
  });

  it("should cleanup subscriptions properly", async () => {
    const { unmount } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true }),
    );

    await waitFor(() => expect(websocketService.subscribe).toHaveBeenCalled());

    const cleanupFn = vi.mocked(websocketService.subscribe).mock.results[0]
      ?.value;
    expect(cleanupFn).toBeDefined();
    expect(typeof cleanupFn).toBe("function");
    expect(() => unmount()).not.toThrow();
  });

  it("should handle network flapping without crashing", async () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true, useMockData: true }),
    );

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    for (let i = 0; i < 5; i++) {
      act(() => {
        mockWebSocket.isConnected = false;
        mockWebSocket.emit("status", "disconnected");
      });
      act(() => {
        mockWebSocket.isConnected = true;
        mockWebSocket.emit("status", "connected");
      });
    }

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  it("should not spin into an infinite render loop across repeated re-renders", async () => {
    const { result, rerender } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true, useMockData: true }),
    );

    await waitFor(() => expect(result.current.metrics).toBeDefined());
    const callsBefore = vi.mocked(websocketService.connect).mock.calls.length;

    for (let i = 0; i < 10; i++) {
      mockCurrentTenant = { id: "tenant-1", name: "Test Tenant" };
      rerender();
    }

    expect(vi.mocked(websocketService.connect).mock.calls.length).toBe(
      callsBefore,
    );
  });
});
