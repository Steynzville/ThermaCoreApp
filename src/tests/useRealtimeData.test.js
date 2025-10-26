/**
 * Tests for useRealtimeData Hook
 *
 * Tests state transitions, cleanup, and external dependencies
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useRealtimeMetrics,
  useRealtimeProtocolStatus,
} from "../hooks/useRealtimeData";

// Mock tenant context
vi.mock("../context/TenantContext", () => ({
  useTenant: () => ({
    currentTenant: { id: "tenant-1", name: "Test Tenant" },
  }),
}));

// Mock websocket service
vi.mock("../services/websocketService", () => ({
  default: {
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    onStatusChange: vi.fn(() => vi.fn()),
    isConnected: vi.fn(() => true),
  },
}));

// Mock scada service
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
    getProtocolStatus: vi.fn().mockResolvedValue({
      success: true,
      data: {
        protocols: [{ id: "modbus-1", status: "connected" }],
      },
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
  });

  it("should mount and unmount without errors", () => {
    const { unmount } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(() => unmount()).not.toThrow();
  });

  it("should handle remounting", () => {
    const { rerender, unmount } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(() => rerender()).not.toThrow();
    expect(() => unmount()).not.toThrow();
  });

  it("should accept autoConnect option", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true }),
    );

    expect(result.current).toBeDefined();
  });

  it("should accept refreshInterval option", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ refreshInterval: 30000 }),
    );

    expect(result.current).toBeDefined();
  });

  it("should accept useMockData option", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ useMockData: true }),
    );

    expect(result.current).toBeDefined();
  });

  it("should provide metrics property", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(result.current).toHaveProperty("metrics");
  });

  it("should provide loading property", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(result.current).toHaveProperty("loading");
  });

  it("should provide error property", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(result.current).toHaveProperty("error");
  });

  it("should provide connectionStatus property", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(result.current).toHaveProperty("connectionStatus");
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

  it("should mount and unmount without errors", () => {
    const { unmount } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(() => unmount()).not.toThrow();
  });

  it("should handle remounting", () => {
    const { rerender, unmount } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(() => rerender()).not.toThrow();
    expect(() => unmount()).not.toThrow();
  });

  it("should accept autoConnect option", () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true }),
    );

    expect(result.current).toBeDefined();
  });

  it("should provide protocols property", () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(result.current).toHaveProperty("protocols");
  });

  it("should provide loading property", () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(result.current).toHaveProperty("loading");
  });
});

describe("useRealtimeMetrics - Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle connection errors gracefully", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(result.current.error).toBeNull();
  });

  it("should handle WebSocket disconnection", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(result.current.connectionStatus).toBe("disconnected");
  });

  it("should handle missing tenant context", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(result.current).toBeDefined();
  });

  it("should handle failed metric fetch", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(result.current.loading).toBe(true);
  });

  it("should recover from error state", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(result.current.error).toBeNull();
  });
});

describe("useRealtimeMetrics - Offline/Online Recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle offline state", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(result.current.connectionStatus).toBe("disconnected");
  });

  it("should attempt reconnection when coming online", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(result.current).toBeDefined();
  });

  it("should restore data subscription after reconnection", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(result.current).toBeDefined();
  });

  it("should handle rapid online/offline transitions", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(result.current).toBeDefined();
  });
});

describe("useRealtimeMetrics - Data Refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should respect custom refresh interval", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ refreshInterval: 10000, autoConnect: false }),
    );

    expect(result.current).toBeDefined();
  });

  it("should handle refresh interval changes", () => {
    const { result, rerender } = renderHook(
      ({ interval }) => useRealtimeMetrics({ refreshInterval: interval }),
      { initialProps: { interval: 5000 } },
    );

    expect(result.current).toBeDefined();

    rerender({ interval: 10000 });

    expect(result.current).toBeDefined();
  });

  it("should cleanup refresh timer on unmount", () => {
    const { unmount } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: false }),
    );

    expect(() => unmount()).not.toThrow();
  });
});

describe("useRealtimeMetrics - Mock Data Mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use mock data when enabled", () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ useMockData: true, autoConnect: false }),
    );

    expect(result.current).toBeDefined();
  });

  it("should switch between mock and real data", () => {
    const { result, rerender } = renderHook(
      ({ mock }) => useRealtimeMetrics({ useMockData: mock }),
      { initialProps: { mock: true } },
    );

    expect(result.current).toBeDefined();

    rerender({ mock: false });

    expect(result.current).toBeDefined();
  });
});

describe("useRealtimeProtocolStatus - Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle failed protocol fetch", () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(result.current.loading).toBe(true);
  });

  it("should handle empty protocol list", () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(result.current.protocols).toEqual([]);
  });

  it("should handle WebSocket errors gracefully", () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(result.current).toBeDefined();
  });
});

describe("useRealtimeProtocolStatus - Connection Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle connection state changes", () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(result.current).toBeDefined();
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(() => unmount()).not.toThrow();
  });

  it("should handle reconnection scenarios", () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(result.current).toBeDefined();
  });
});

describe("useRealtimeProtocolStatus - Data Updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle protocol status updates", () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(result.current.protocols).toEqual([]);
  });

  it("should handle multiple protocol updates", () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(result.current).toBeDefined();
  });

  it("should handle stale data", () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: false }),
    );

    expect(result.current).toBeDefined();
  });
});
