/**
 * Tests for useRealtimeData Hook
 *
 * Tests state transitions, cleanup, and external dependencies
 */

import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useRealtimeMetrics,
  useRealtimeProtocolStatus,
  useRealtimeHistoricalData,
  useWebSocketStatus,
} from "../hooks/useRealtimeData";

// Mock tenant context
vi.mock("../context/TenantContext", () => ({
  useTenant: () => ({
    currentTenant: { id: "tenant-1", name: "Test Tenant" },
  }),
}));

// Simple mocks
vi.mock("../services/websocketService", () => {
  let statusCallback = null;
  return {
    default: {
      connect: vi.fn().mockResolvedValue(true),
      disconnect: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
      onStatusChange: vi.fn((cb) => {
        statusCallback = cb;
        return () => {};
      }),
      isConnected: vi.fn(() => true),
      // Expose for tests
      getStatusCallback: () => statusCallback,
    },
  };
});

vi.mock("../services/scadaService", () => ({
  default: {
    generateMockMetrics: vi.fn(() => ({
      temperature: 65,
      pressure: 120,
      flowRate: 245,
    })),
    getCurrentMetrics: vi.fn().mockResolvedValue({
      success: true,
      data: { temperature: 65, pressure: 120, flowRate: 245 },
    }),
    generateMockProtocolStatus: vi.fn(() => [
      { id: "modbus-1", status: "connected" },
    ]),
    getProtocolStatus: vi.fn().mockResolvedValue({
      success: true,
      data: { protocols: [{ id: "modbus-1", status: "connected" }] },
    }),
    generateMockHistoricalData: vi.fn((hours = 24) =>
      Array.from({ length: hours }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        value: Math.random() * 100,
      }))
    ),
    getHistoricalData: vi.fn().mockResolvedValue({
      success: true,
      data: [{ timestamp: "2024-01-01", value: 50 }],
    }),
  },
}));

describe("useRealtimeMetrics Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("should connect and update metrics on mount", async () => {
    const { result } = renderHook(() => useRealtimeMetrics({ autoConnect: true }));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.loading).toBe(false);
  });

  it("should use mock data when enabled", async () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true, useMockData: true }),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.metrics).toEqual({
      temperature: 65,
      pressure: 120,
      flowRate: 245,
    });
  });

  it("should handle connection errors", async () => {
    vi.mocked(require("../services/websocketService").default.connect)
      .mockRejectedValueOnce(new Error("Connection failed"));

    const { result } = renderHook(() => useRealtimeMetrics({ autoConnect: true }));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.error).toBe("Connection failed");
  });

  it("should handle WebSocket status changes", async () => {
    const { result } = renderHook(() => useRealtimeMetrics({ autoConnect: true }));

    await act(async () => {
      const wsService = require("../services/websocketService").default;
      const cb = wsService.getStatusCallback();
      if (cb) cb("connected");
    });

    expect(result.current.connectionStatus).toBe("connected");
    expect(result.current.isConnected).toBe(true);
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeMetrics({ autoConnect: true }));
    expect(() => unmount()).not.toThrow();
  });
});

describe("useRealtimeProtocolStatus Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(result.current.protocols).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it("should fetch protocol status", async () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true }),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.loading).toBe(false);
  });
});

describe("useRealtimeHistoricalData Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch historical data", async () => {
    const { result } = renderHook(() => useRealtimeHistoricalData({ hours: 24 }));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.data).toBeDefined();
  });

  it("should update timeRange", () => {
    const { result } = renderHook(() => useRealtimeHistoricalData());

    act(() => result.current.setTimeRange(12));
    expect(result.current.timeRange).toBe(12);
  });
});

describe("useWebSocketStatus Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should track connection status", () => {
    const { result } = renderHook(() => useWebSocketStatus());

    act(() => {
      const wsService = require("../services/websocketService").default;
      const cb = wsService.getStatusCallback();
      if (cb) cb("connected");
    });

    expect(result.current.isConnected).toBe(true);
  });
});

describe("Edge Cases", () => {
  it("should not connect when autoConnect=false", () => {
    renderHook(() => useRealtimeMetrics({ autoConnect: false }));
  });

  it("should cleanup properly on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeMetrics({ autoConnect: true }));
    unmount();
  });
});
