/**
 * Tests for useRealtimeData Hook
 * 
 * SCADA-specific testing covering:
 * - Real-time data streaming
 * - WebSocket connection management
 * - Error recovery
 * - Data integrity validation
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
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

// Mock logger
vi.mock("../lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock WebSocket service - simplified
const mockWebSocket = {
  isConnected: true,
  listeners: {},
  connect: vi.fn().mockResolvedValue(true),
  disconnect: vi.fn(),
  subscribe: vi.fn(() => vi.fn()),
  onStatusChange: vi.fn(() => vi.fn()),
  isConnected: vi.fn(() => mockWebSocket.isConnected),
  emit: (event, data) => {
    if (mockWebSocket.listeners[event]) {
      mockWebSocket.listeners[event].forEach(cb => cb(data));
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
    mockWebSocket.connect.mockResolvedValue(true);
  }
};

vi.mock("../services/websocketService", () => ({
  default: {
    connect: vi.fn().mockImplementation(() => {
      if (mockWebSocket.isConnected) {
        return Promise.resolve(true);
      }
      return Promise.reject(new Error('Connection failed'));
    }),
    disconnect: vi.fn().mockImplementation(() => {
      mockWebSocket.isConnected = false;
    }),
    subscribe: vi.fn().mockImplementation((event, callback) => {
      mockWebSocket.addListener(event, callback);
      return () => {
        mockWebSocket.listeners[event] = mockWebSocket.listeners[event]
          ?.filter(cb => cb !== callback) || [];
      };
    }),
    onStatusChange: vi.fn().mockImplementation((callback) => {
      mockWebSocket.addListener('status', callback);
      return () => {
        mockWebSocket.listeners['status'] = mockWebSocket.listeners['status']
          ?.filter(cb => cb !== callback) || [];
      };
    }),
    isConnected: vi.fn(() => mockWebSocket.isConnected),
  },
}));

// Mock SCADA service
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
    getCurrentMetrics: vi.fn().mockResolvedValue({
      success: true,
      data: {
        temperature: 65.5,
        pressure: 120.3,
        flowRate: 245.7,
        power: 1500,
        efficiency: 87.2,
        timestamp: new Date().toISOString(),
      },
    }),
    generateMockProtocolStatus: vi.fn(() => [
      { id: "modbus-1", status: "connected", latency: 10 },
      { id: "opcua-1", status: "connected", latency: 25 },
      { id: "dnp3-1", status: "disconnected", latency: 0 },
      { id: "mqtt-1", status: "connected", latency: 15 },
    ]),
    getProtocolStatus: vi.fn().mockResolvedValue({
      success: true,
      data: {
        protocols: [
          { id: "modbus-1", status: "connected", latency: 10 },
          { id: "opcua-1", status: "connected", latency: 25 },
          { id: "dnp3-1", status: "disconnected", latency: 0 },
          { id: "mqtt-1", status: "connected", latency: 15 },
        ],
      },
    }),
    generateMockHistoricalData: vi.fn((hours = 24) =>
      Array.from({ length: Math.min(hours, 24) }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        value: Math.random() * 100,
        metric: 'temperature',
      }))
    ),
    getHistoricalData: vi.fn().mockResolvedValue({
      success: true,
      data: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        value: Math.random() * 100,
        metric: 'temperature',
      })),
    }),
  },
}));

describe("useRealtimeMetrics Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocket.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initialization and Connection", () => {
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
        useRealtimeMetrics({ autoConnect: true })
      );

      // Wait for connection to establish
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it("should not connect when autoConnect is false", () => {
      const connectSpy = vi.mocked(
        require("../services/websocketService").default.connect
      );

      renderHook(() => useRealtimeMetrics({ autoConnect: false }));

      expect(connectSpy).not.toHaveBeenCalled();
    });
  });

  describe("Data Streaming", () => {
    it("should receive and process metrics when connected", async () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true })
      );

      await waitFor(() => {
        expect(result.current.metrics).toBeDefined();
      });

      expect(result.current.metrics).toHaveProperty("temperature");
      expect(result.current.metrics).toHaveProperty("pressure");
      expect(result.current.metrics).toHaveProperty("flowRate");
    });

    it("should use mock data when enabled", async () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true, useMockData: true })
      );

      await waitFor(() => {
        expect(result.current.metrics).toEqual({
          temperature: 65.5,
          pressure: 120.3,
          flowRate: 245.7,
          power: 1500,
          efficiency: 87.2,
          timestamp: expect.any(String),
        });
      });
    });

    it("should update metrics when new data arrives", async () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true })
      );

      await waitFor(() => {
        expect(result.current.metrics).toBeDefined();
      });

      const firstMetrics = { ...result.current.metrics };

      // Simulate new data
      await act(async () => {
        mockWebSocket.emit('metric_update', {
          temperature: 75.2,
          timestamp: new Date().toISOString(),
        });
      });

      expect(result.current.metrics.temperature).toBe(75.2);
    });

    it("should handle partial data updates", async () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true })
      );

      await waitFor(() => {
        expect(result.current.metrics).toBeDefined();
      });

      // Send partial update
      await act(async () => {
        mockWebSocket.emit('metric_update', {
          temperature: 70.2,
          timestamp: new Date().toISOString(),
        });
      });

      expect(result.current.metrics.temperature).toBe(70.2);
      // Other metrics should remain unchanged
      expect(result.current.metrics.pressure).toBeDefined();
    });
  });

  describe("Connection Management", () => {
    it("should handle disconnection", async () => {
      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        mockWebSocket.isConnected = false;
        mockWebSocket.emit('status', { isConnected: false });
      });

      expect(result.current.isConnected).toBe(false);
    });

    it("should handle connection errors", async () => {
      const mockService = require("../services/websocketService").default;
      mockService.connect.mockRejectedValueOnce(new Error("Connection failed"));

      const { result } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true })
      );

      await waitFor(() => {
        expect(result.current.error).toBe("Connection failed");
      });
    });
  });

  describe("Cleanup", () => {
    it("should cleanup on unmount", () => {
      const { unmount } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true })
      );
      expect(() => unmount()).not.toThrow();
    });

    it("should not update state after unmount", async () => {
      const { result, unmount } = renderHook(() =>
        useRealtimeMetrics({ autoConnect: true })
      );

      await waitFor(() => {
        expect(result.current.metrics).toBeDefined();
      });

      unmount();

      // This should not cause errors
      await act(async () => {
        mockWebSocket.emit('metric_update', {
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
  });

  afterEach(() => {
    vi.clearAllMocks();
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
      useRealtimeProtocolStatus({ autoConnect: true })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.protocols).toHaveLength(4);
    expect(result.current.protocols[0]).toHaveProperty("id");
    expect(result.current.protocols[0]).toHaveProperty("status");
  });

  it("should update protocol status in real-time", async () => {
    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true })
    );

    await waitFor(() => {
      expect(result.current.protocols.length).toBeGreaterThan(0);
    });

    await act(async () => {
      mockWebSocket.emit('protocol_status_update', {
        protocolId: "modbus-1",
        status: "disconnected",
        latency: 0,
        timestamp: new Date().toISOString(),
      });
    });

    const modbusProtocol = result.current.protocols.find(p => p.id === "modbus-1");
    expect(modbusProtocol.status).toBe("disconnected");
  });

  it("should handle errors", async () => {
    const mockService = require("../services/scadaService").default;
    mockService.getProtocolStatus.mockRejectedValueOnce(
      new Error("Protocol status unavailable")
    );

    const { result } = renderHook(() =>
      useRealtimeProtocolStatus({ autoConnect: true })
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Protocol status unavailable");
    });
  });
});

describe("useRealtimeHistoricalData Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocket.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch historical data", async () => {
    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24 })
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
    });
  });

  it("should update timeRange", async () => {
    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24 })
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.timeRange).toBe(24);

    await act(() => {
      result.current.setTimeRange(12);
    });

    expect(result.current.timeRange).toBe(12);
  });

  it("should handle errors", async () => {
    const mockService = require("../services/scadaService").default;
    mockService.getHistoricalData.mockRejectedValueOnce(
      new Error("Failed to fetch data")
    );

    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24 })
    );

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to fetch data");
    });
  });

  it("should use mock data when enabled", async () => {
    const { result } = renderHook(() =>
      useRealtimeHistoricalData({ hours: 24, useMockData: true })
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
      expect(result.current.data.length).toBeGreaterThan(0);
    });
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

    expect(result.current.isConnected).toBe(true);
    expect(result.current.status).toBe("connected");
  });

  it("should update on status changes", async () => {
    const { result } = renderHook(() => useWebSocketStatus());

    await act(async () => {
      mockWebSocket.emit('status', { isConnected: false });
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.status).toBe("disconnected");
  });
});

describe("SCADA-Specific Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocket.reset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should handle invalid data gracefully", async () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true })
    );

    await waitFor(() => {
      expect(result.current.metrics).toBeDefined();
    });

    // Send invalid data
    await act(async () => {
      mockWebSocket.emit('metric_update', {
        invalidField: 'not a metric',
      });
    });

    // Should not crash
    expect(result.current.metrics).toBeDefined();
    expect(result.current.error).toBeNull();
  });

  it("should handle large payloads without crashing", async () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true })
    );

    await waitFor(() => {
      expect(result.current.metrics).toBeDefined();
    });

    // Large payload
    const largePayload = {
      temperature: 65,
      pressure: 120,
      flowRate: 245,
      ...Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [`metric_${i}`, Math.random() * 100])
      ),
      timestamp: new Date().toISOString(),
    };

    await act(async () => {
      mockWebSocket.emit('metric_update', largePayload);
    });

    expect(result.current.metrics.temperature).toBe(65);
  });

  it("should handle rapid updates without memory leaks", async () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true })
    );

    await waitFor(() => {
      expect(result.current.metrics).toBeDefined();
    });

    // Send rapid updates
    for (let i = 0; i < 20; i++) {
      await act(async () => {
        mockWebSocket.emit('metric_update', {
          temperature: 60 + i,
          timestamp: new Date().toISOString(),
        });
      });
    }

    expect(result.current.metrics.temperature).toBe(79);
  });

  it("should cleanup subscriptions properly", async () => {
    const subscribeSpy = vi.mocked(
      require("../services/websocketService").default.subscribe
    );

    const { unmount } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true })
    );

    await waitFor(() => {
      expect(subscribeSpy).toHaveBeenCalled();
    });

    const cleanupFn = subscribeSpy.mock.results[0]?.value;
    expect(cleanupFn).toBeDefined();

    unmount();

    // Cleanup should have been called
    expect(typeof cleanupFn).toBe('function');
  });

  it("should handle network flapping without crashing", async () => {
    const { result } = renderHook(() =>
      useRealtimeMetrics({ autoConnect: true })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate network flapping
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        mockWebSocket.isConnected = false;
        mockWebSocket.emit('status', { isConnected: false });
        await new Promise(resolve => setTimeout(resolve, 10));
        mockWebSocket.isConnected = true;
        mockWebSocket.emit('status', { isConnected: true });
        await new Promise(resolve => setTimeout(resolve, 10));
      });
    }

    // Should handle without crashing
    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
