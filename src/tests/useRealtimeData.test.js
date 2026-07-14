/**
 * Tests for useRealtimeData Hook - Minimal Stable Version
 */

import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useRealtimeMetrics,
  useRealtimeProtocolStatus,
  useRealtimeHistoricalData,
  useWebSocketStatus,
} from "../hooks/useRealtimeData";

vi.mock("../context/TenantContext", () => ({
  useTenant: () => ({ currentTenant: { id: "tenant-1" } }),
}));

vi.mock("../services/websocketService", () => ({
  default: {
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    onStatusChange: vi.fn(),
    isConnected: vi.fn(() => true),
  },
}));

vi.mock("../services/scadaService", () => ({
  default: {
    generateMockMetrics: vi.fn(() => ({ temperature: 65, pressure: 120, flowRate: 245 })),
    getCurrentMetrics: vi.fn().mockResolvedValue({ success: true, data: {} }),
    generateMockProtocolStatus: vi.fn(() => []),
    getProtocolStatus: vi.fn().mockResolvedValue({ success: true, data: {} }),
    generateMockHistoricalData: vi.fn(() => []),
    getHistoricalData: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

describe("useRealtimeMetrics Hook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useRealtimeMetrics({ autoConnect: false }));
    expect(result.current.metrics).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it("should connect when autoConnect=true", async () => {
    const { result } = renderHook(() => useRealtimeMetrics({ autoConnect: true }));
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    expect(result.current.loading).toBe(false);
  });

  it("should use mock data", async () => {
    const { result } = renderHook(() => useRealtimeMetrics({ useMockData: true }));
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });
    expect(result.current.metrics).toBeDefined();
  });
});

describe("useRealtimeProtocolStatus Hook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should initialize", () => {
    const { result } = renderHook(() => useRealtimeProtocolStatus({ autoConnect: false }));
    expect(result.current.protocols).toEqual([]);
  });
});

describe("useRealtimeHistoricalData Hook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should initialize", () => {
    const { result } = renderHook(() => useRealtimeHistoricalData());
    expect(result.current.data).toEqual([]);
  });

  it("should allow timeRange change", () => {
    const { result } = renderHook(() => useRealtimeHistoricalData());
    act(() => result.current.setTimeRange(12));
    expect(result.current.timeRange).toBe(12);
  });
});

describe("useWebSocketStatus Hook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should initialize", () => {
    const { result } = renderHook(() => useWebSocketStatus());
    expect(result.current.status).toBe("disconnected");
  });
});

describe("Edge Cases", () => {
  it("should not crash on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeMetrics({ autoConnect: false }));
    unmount();
  });
});
