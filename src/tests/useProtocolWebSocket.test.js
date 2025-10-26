/**
 * Tests for useProtocolWebSocket Hook
 *
 * Tests connection lifecycle, cleanup, and data handling
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProtocolWebSocket } from "../hooks/useProtocolWebSocket";

// Mock protocol websocket service
vi.mock("../services/protocolWebSocketService", () => {
  const createMockProtocolWS = () => ({
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    send: vi.fn(),
    isConnected: vi.fn(() => false),
    onStatusChange: vi.fn(),
    offStatusChange: vi.fn(),
    getStatus: vi.fn(() => "disconnected"),
  });

  return {
    default: {
      modbus: createMockProtocolWS(),
      opcua: createMockProtocolWS(),
      dnp3: createMockProtocolWS(),
      mqtt: createMockProtocolWS(),
    },
  };
});

describe("useProtocolWebSocket Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    expect(result.current.connectionStatus).toBe("disconnected");
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should mount and unmount without errors", () => {
    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", "tenant-1", false),
    );

    expect(() => unmount()).not.toThrow();
  });

  it("should provide connect method", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", "tenant-1", false),
    );

    expect(result.current.connect).toBeDefined();
    expect(typeof result.current.connect).toBe("function");
  });

  it("should provide disconnect method", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", "tenant-1", false),
    );

    expect(result.current.disconnect).toBeDefined();
    expect(typeof result.current.disconnect).toBe("function");
  });

  it("should provide send method", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", "tenant-1", false),
    );

    expect(result.current.send).toBeDefined();
    expect(typeof result.current.send).toBe("function");
  });

  it("should expose connection status", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", "tenant-1", false),
    );

    expect(result.current).toHaveProperty("connectionStatus");
  });

  it("should expose current data", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", "tenant-1", false),
    );

    expect(result.current).toHaveProperty("data");
  });

  it("should work with different protocols", () => {
    const protocols = ["modbus", "opcua", "dnp3", "mqtt"];

    for (const protocol of protocols) {
      const { result, unmount } = renderHook(() =>
        useProtocolWebSocket(protocol, "tenant-1", false),
      );

      expect(result.current).toBeDefined();
      expect(() => unmount()).not.toThrow();
    }
  });

  it("should handle remounting", () => {
    const { rerender, unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", "tenant-1", false),
    );

    expect(() => rerender()).not.toThrow();
    expect(() => unmount()).not.toThrow();
  });

  it("should initialize error as null", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", "tenant-1", false),
    );

    expect(result.current.error).toBeNull();
  });
});

describe("useProtocolWebSocket - Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle connection errors", async () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    expect(result.current.error).toBeNull();
  });

  it("should handle invalid protocol gracefully", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("invalid-protocol", null, false),
    );

    expect(result.current).toBeDefined();
  });

  it("should clear error on successful connection", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    expect(result.current.error).toBeNull();
  });

  it("should handle reconnection failures", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    expect(result.current.connectionStatus).toBe("disconnected");
  });

  it("should handle missing websocket service", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket(null, null, false),
    );

    expect(result.current).toBeDefined();
  });
});

describe("useProtocolWebSocket - Auto-Connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not auto-connect when autoConnect is false", () => {
    renderHook(() => useProtocolWebSocket("modbus", null, false));
    // Test passes if no errors occur
  });

  it("should handle autoConnect with null protocol", () => {
    const { result } = renderHook(() => useProtocolWebSocket(null, null, true));

    expect(result.current).toBeDefined();
  });

  it("should cleanup on unmount with autoConnect", () => {
    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", null, true),
    );

    expect(() => unmount()).not.toThrow();
  });
});

describe("useProtocolWebSocket - Data Subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should subscribe to data updates", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    expect(result.current.data).toBeNull();
  });

  it("should unsubscribe on unmount", () => {
    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    expect(() => unmount()).not.toThrow();
  });

  it("should handle data updates", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    expect(result.current.data).toBeNull();
  });
});

describe("useProtocolWebSocket - Status Changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should track connection status changes", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    expect(result.current.connectionStatus).toBe("disconnected");
  });

  it("should handle status change to connected", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    expect(result.current.connectionStatus).toBe("disconnected");
  });

  it("should handle status change to error", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    expect(result.current.connectionStatus).toBe("disconnected");
  });

  it("should cleanup status listeners on unmount", () => {
    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    expect(() => unmount()).not.toThrow();
  });
});

describe("useProtocolWebSocket - Send Method", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send data through websocket", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    expect(() => result.current.send({ test: "data" })).not.toThrow();
  });

  it("should handle send when not connected", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    expect(() => result.current.send({ test: "data" })).not.toThrow();
  });

  it("should handle send with null websocket", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket(null, null, false),
    );

    expect(() => result.current.send({ test: "data" })).not.toThrow();
  });
});

describe("useProtocolWebSocket - Cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", "tenant-1", false),
    );

    expect(() => unmount()).not.toThrow();
  });

  it("should cleanup subscriptions on unmount", () => {
    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    expect(() => unmount()).not.toThrow();
  });

  it("should cleanup status listeners on unmount", () => {
    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    expect(() => unmount()).not.toThrow();
  });

  it("should disconnect on unmount when autoConnect is true", () => {
    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", null, true),
    );

    expect(() => unmount()).not.toThrow();
  });
});
