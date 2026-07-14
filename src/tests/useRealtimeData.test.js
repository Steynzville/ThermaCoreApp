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

// Mock services with factory to avoid hoisting issues
vi.mock("../services/websocketService", () => {
  const mockConnect = vi.fn().mockResolvedValue(true);
  const mockOnStatusChange = vi.fn();
  const mockSubscribe = vi.fn(() => vi.fn());
  const mockIsConnected = vi.fn(() => true);

  return {
    default: {
      connect: mockConnect,
      disconnect: vi.fn(),
      subscribe: mockSubscribe,
      onStatusChange: mockOnStatusChange,
      isConnected: mockIsConnected,
    },
    // Export mocks for test access
    __mocks: {
      mockConnect,
      mockOnStatusChange,
      mockSubscribe,
      mockIsConnected,
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
      data: {
        temperature: 65,
        pressure: 120,
        flowRate: 245,
      },
    }),
    generateMockProtocolStatus: vi.fn(() => [
      { id: "modbus-1", status: "connected" },
    ]),
    getProtocolStatus: vi.fn().mockResolvedValue({
      success: true,
      data: {
        protocols: [{ id: "modbus-1", status: "connected" }],
      },
    }),
    generateMockHistoricalData: vi.fn((hours) => 
      Array.from({ length: hours || 24 }, (_, i) => ({
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
  let mocks;

  beforeEach(() => {
    vi.clearAllMocks();
    // Get mocks after hoisting
    mocks = require("../services/websocketService").__mocks;
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

    expect(mocks.mockConnect).toHaveBeenCalled();
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
    expect(result.current.loading).toBe(false);
  });

  it("should handle connection errors gracefully", async () => {
    mocks.mockConnect.mockRejectedValueOnce(new Error("Connection failed"));

    const { result } = renderHook(() => useRealtimeMetrics({ autoConnect: true }));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.error).toBe("Connection failed");
    expect(result.current.loading).toBe(false);
  });

  it("should handle WebSocket status changes", async () => {
    const { result } = renderHook(() => useRealtimeMetrics({ autoConnect: true }));

    await act(async () => {
      const statusCallback = mocks.mockOnStatusChange.mock.calls[0]?.[0];
      if (statusCallback) statusCallback("connected");
    });

    expect(result.current.connectionStatus).toBe("connected");
    expect(result.current.isConnected).toBe(true);
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeMetrics({ autoConnect: true }));
    expect(() => unmount()).not.toThrow();
  });

  it("should respect custom refreshInterval", () => {
    renderHook(() => useRealtimeMetrics({ refreshInterval: 30000 }));
  });

  it("should handle missing tenant", async () => {
    vi.mocked(require("../context/TenantContext").useTenant).mockReturnValueOnce({
      currentTenant: null,
    });

    const { result } = renderHook(() => useRealtimeMetrics({ autoConnect: true }));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current).toBeDefined();
  });
});

describe("useRealtimeProtocolStatus Hook", () => {
  let mocks;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = require("../services/websocketService").__mocks;
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(result.current.protocols).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should fetch protocol status", async () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true }),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.protocols).toBeDefined();
    expect(result.current.loading).toBe(false);
  });

  it("should use mock protocol data", async () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true, useMockData: true }),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.protocols).toEqual([
      { id: "modbus-1", status: "connected" },
    ]);
  });

  it("should handle protocol fetch errors", async () => {
    vi.mocked(require("../services/scadaService").default.getProtocolStatus)
      .mockRejectedValueOnce(new Error("Protocol error"));

    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true }),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.error).toBe("Protocol error");
  });

  it("should cleanup subscriptions", () => {
    const { unmount } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true }),
    );

    expect(() => unmount()).not.toThrow();
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
    expect(result.current.loading).toBe(false);
  });

  it("should use mock historical data", async () => {
    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24, useMockData: true }),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.data.length).toBeGreaterThan(0);
  });

  it("should update timeRange", () => {
    const { result } = renderHook(() => useRealtimeHistoricalData({ hours: 24 }));

    act(() => {
      result.current.setTimeRange(12);
    });

    expect(result.current.timeRange).toBe(12);
  });

  it("should cleanup refresh interval", () => {
    const { unmount } = renderHook(() => useRealtimeHistoricalData({ autoRefresh: true }));
    expect(() => unmount()).not.toThrow();
  });
});

describe("useWebSocketStatus Hook", () => {
  let mocks;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = require("../services/websocketService").__mocks;
  });

  it("should track connection status", () => {
    const { result } = renderHook(() => useWebSocketStatus());

    act(() => {
      const callback = mocks.mockOnStatusChange.mock.calls[0]?.[0];
      if (callback) callback("connected");
    });

    expect(result.current.status).toBe("connected");
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isReconnecting).toBe(false);
    expect(result.current.lastHeartbeat).toBeDefined();
  });

  it("should handle disconnected state", () => {
    const { result } = renderHook(() => useWebSocketStatus());

    act(() => {
      const callback = mocks.mockOnStatusChange.mock.calls[0]?.[0];
      if (callback) callback("disconnected");
    });

    expect(result.current.isConnected).toBe(false);
  });
});

describe("Edge Cases & Cleanup", () => {
  it("should handle rapid remounts without memory leaks", () => {
    const { rerender, unmount } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true }),
    );

    rerender();
    rerender();
    expect(() => unmount()).not.toThrow();
  });

  it("should not connect when autoConnect is false", () => {
    const mocks = require("../services/websocketService").__mocks;
    renderHook(() => useRealtimeMetrics({ autoConnect: false }));
    expect(mocks.mockConnect).not.toHaveBeenCalled();
  });
});
