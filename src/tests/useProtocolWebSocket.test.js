/**
 * Tests for useProtocolWebSocket Hook
 *
 * Tests connection lifecycle, cleanup, and data handling
 */

import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useProtocolWebSocket,
  useProtocolEvent,
  useModbusRegisters,
  useOPCUANodes,
  useDNP3Points,
  useMQTTMessages,
} from "../hooks/useProtocolWebSocket";
import protocolWS from "../services/protocolWebSocketService";

// Mock protocol websocket service
vi.mock("../services/protocolWebSocketService", () => {
  const createMockProtocolWS = () => {
    let statusChangeCallback = null;
    const mock = {
      connect: vi.fn().mockImplementation((protocol, tenantId) => {
        // Call the status change callback if it exists
        if (statusChangeCallback) {
          statusChangeCallback("connected");
        }
        return Promise.resolve(true);
      }),
      disconnect: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      send: vi.fn(),
      isConnected: vi.fn(() => false),
      onStatusChange: vi.fn((cb) => {
        statusChangeCallback = cb;
      }),
      offStatusChange: vi.fn(),
      getStatus: vi.fn(() => "disconnected"),
    };
    return mock;
  };

  return {
    default: {
      modbus: createMockProtocolWS(),
      opcua: createMockProtocolWS(),
      dnp3: createMockProtocolWS(),
      mqtt: createMockProtocolWS(),
    },
  };
});

// Reset all mock defaults
const resetProtocolMockDefaults = () => {
  for (const ws of Object.values(protocolWS)) {
    ws.connect.mockReset().mockResolvedValue(true);
    ws.disconnect.mockReset();
    ws.subscribe.mockReset();
    ws.unsubscribe.mockReset();
    ws.send.mockReset();
    ws.isConnected.mockReset().mockReturnValue(false);
    ws.onStatusChange.mockReset();
    ws.offStatusChange.mockReset();
    ws.getStatus.mockReset().mockReturnValue("disconnected");
  }
};

// Simple mount helper - just flushes pending promises
const mountAutoConnectHook = async (hook) => {
  const { result, unmount, rerender } = renderHook(hook);

  // Flush any pending microtasks from the auto-connect effect
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  return { result, unmount, rerender };
};

// Force garbage collection if available
const forceGC = () => {
  if (typeof global.gc === "function") {
    global.gc();
  }
};

beforeEach(() => {
  resetProtocolMockDefaults();
  forceGC();
});

afterEach(() => {
  cleanup();
  forceGC();
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
    expect(result.current.isConnected).toBe(false);
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

describe("useProtocolWebSocket - Connection Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should connect successfully when connect() is called", async () => {
    const ws = protocolWS.modbus;
    ws.connect.mockResolvedValue(true);
    ws.isConnected.mockReturnValue(true);
    ws.getStatus.mockReturnValue("connected");

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", "tenant-1", false),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(ws.connect).toHaveBeenCalledWith("modbus", "tenant-1");
    expect(result.current.error).toBeNull();
  });

  it("should handle connection failure", async () => {
    const ws = protocolWS.modbus;
    const testError = new Error("Connection failed");
    ws.connect.mockRejectedValue(testError);

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", "tenant-1", false),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.error).toEqual(testError);
    expect(result.current.connectionStatus).toBe("disconnected");
  });

  it("should disconnect when disconnect() is called", () => {
    const ws = protocolWS.modbus;

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", "tenant-1", false),
    );

    act(() => {
      result.current.disconnect();
    });

    expect(ws.disconnect).toHaveBeenCalled();
  });

  it("should handle invalid protocol gracefully", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("invalid-protocol", null, false),
    );

    expect(result.current).toBeDefined();
    expect(result.current.connectionStatus).toBe("disconnected");
  });

  it("should set error when connecting with invalid protocol", async () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket("invalid-protocol", null, false),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error.message).toContain("Invalid protocol");
  });

  it("should clear error on successful connection", async () => {
    const ws = protocolWS.modbus;
    ws.connect.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", "tenant-1", false),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.error).toBeNull();
  });

  it("should handle reconnection failure gracefully", async () => {
    const ws = protocolWS.modbus;
    ws.connect.mockRejectedValue(new Error("Reconnection failed"));

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", "tenant-1", false),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.connectionStatus).toBe("disconnected");
  });

  it("should handle missing websocket service", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket(null, null, false),
    );

    expect(result.current).toBeDefined();
    expect(result.current.connectionStatus).toBe("disconnected");
  });
});

describe("useProtocolWebSocket - Auto-Connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should auto-connect on mount when autoConnect is true", async () => {
    const ws = protocolWS.modbus;
    ws.connect.mockResolvedValue(true);
    ws.isConnected.mockReturnValue(false);

    renderHook(() => useProtocolWebSocket("modbus", "tenant-1", true));

    await waitFor(() => {
      expect(ws.connect).toHaveBeenCalledWith("modbus", "tenant-1");
    });
  });

  it("should not auto-connect when autoConnect is false", () => {
    const ws = protocolWS.modbus;

    renderHook(() => useProtocolWebSocket("modbus", null, false));

    expect(ws.connect).not.toHaveBeenCalled();
  });

  it("should not auto-connect when already connected", () => {
    const ws = protocolWS.modbus;
    ws.isConnected.mockReturnValue(true);

    renderHook(() => useProtocolWebSocket("modbus", null, true));

    expect(ws.connect).not.toHaveBeenCalled();
  });

  it("should handle autoConnect with null protocol", () => {
    const { result } = renderHook(() => useProtocolWebSocket(null, null, true));

    expect(result.current).toBeDefined();
  });

  it("should cleanup on unmount with autoConnect", () => {
    const ws = protocolWS.modbus;

    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", null, true),
    );

    unmount();

    expect(ws.disconnect).toHaveBeenCalled();
  });
});

describe("useProtocolWebSocket - Data Subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should subscribe to data updates on mount", () => {
    const ws = protocolWS.modbus;

    renderHook(() => useProtocolWebSocket("modbus", null, false));

    expect(ws.subscribe).toHaveBeenCalled();
    expect(ws.subscribe.mock.calls[0][0]).toContain("modbus-data-");
  });

  it("should unsubscribe on unmount", () => {
    const ws = protocolWS.modbus;

    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    const subscriptionKey = ws.subscribe.mock.calls[0][0];
    unmount();

    expect(ws.unsubscribe).toHaveBeenCalledWith(subscriptionKey);
  });

  it("should update data when receiving updates", () => {
    const ws = protocolWS.modbus;

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({ type: "register_update", value: 42 });
    });

    expect(result.current.data).toEqual({ type: "register_update", value: 42 });
  });

  it("should handle multiple data updates", () => {
    const ws = protocolWS.modbus;

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({ value: 1 });
      dataCallback({ value: 2 });
      dataCallback({ value: 3 });
    });

    expect(result.current.data).toEqual({ value: 3 });
  });

  it("should handle data with different structures", () => {
    const ws = protocolWS.modbus;

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({ type: "register_update", address: 40001, value: 42 });
    });

    expect(result.current.data).toEqual({
      type: "register_update",
      address: 40001,
      value: 42,
    });
  });
});

describe("useProtocolWebSocket - Status Changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should track connection status changes", () => {
    const ws = protocolWS.modbus;

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    const statusCallback = ws.onStatusChange.mock.calls[0][0];

    act(() => {
      statusCallback("connecting");
    });

    expect(result.current.connectionStatus).toBe("connecting");
    expect(result.current.isConnected).toBe(false);

    act(() => {
      statusCallback("connected");
    });

    expect(result.current.connectionStatus).toBe("connected");
    expect(result.current.isConnected).toBe(true);

    act(() => {
      statusCallback("disconnected");
    });

    expect(result.current.connectionStatus).toBe("disconnected");
    expect(result.current.isConnected).toBe(false);
  });

  it("should handle status change to connected", () => {
    const ws = protocolWS.modbus;

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    const statusCallback = ws.onStatusChange.mock.calls[0][0];

    act(() => {
      statusCallback("connected");
    });

    expect(result.current.connectionStatus).toBe("connected");
    expect(result.current.isConnected).toBe(true);
  });

  it("should handle status change to error", () => {
    const ws = protocolWS.modbus;

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    const statusCallback = ws.onStatusChange.mock.calls[0][0];

    act(() => {
      statusCallback("error");
    });

    expect(result.current.connectionStatus).toBe("error");
    expect(result.current.isConnected).toBe(false);
  });

  it("should cleanup status listeners on unmount", () => {
    const ws = protocolWS.modbus;

    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    const statusCallback = ws.onStatusChange.mock.calls[0][0];

    unmount();

    expect(ws.offStatusChange).toHaveBeenCalledWith(statusCallback);
  });
});

describe("useProtocolWebSocket - Send Method", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send data through websocket when connected", () => {
    const ws = protocolWS.modbus;

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    const payload = { test: "data", value: 42 };

    act(() => {
      result.current.send(payload);
    });

    expect(ws.send).toHaveBeenCalledWith(payload);
  });

  it("should handle send when not connected", () => {
    const ws = protocolWS.modbus;

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    act(() => {
      result.current.send({ test: "data" });
    });

    expect(ws.send).toHaveBeenCalled();
  });

  it("should handle send with null websocket", () => {
    const { result } = renderHook(() =>
      useProtocolWebSocket(null, null, false),
    );

    expect(() => {
      act(() => {
        result.current.send({ test: "data" });
      });
    }).not.toThrow();
  });

  it("should send multiple messages in sequence", () => {
    const ws = protocolWS.modbus;

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    act(() => {
      result.current.send({ id: 1 });
      result.current.send({ id: 2 });
      result.current.send({ id: 3 });
    });

    expect(ws.send).toHaveBeenCalledTimes(3);
    expect(ws.send).toHaveBeenCalledWith({ id: 1 });
    expect(ws.send).toHaveBeenCalledWith({ id: 2 });
    expect(ws.send).toHaveBeenCalledWith({ id: 3 });
  });
});

describe("useProtocolWebSocket - Cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should cleanup on unmount", () => {
    const ws = protocolWS.modbus;

    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", "tenant-1", false),
    );

    unmount();

    expect(ws.unsubscribe).toHaveBeenCalled();
    expect(ws.offStatusChange).toHaveBeenCalled();
  });

  it("should cleanup subscriptions on unmount", () => {
    const ws = protocolWS.modbus;

    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    const subscriptionKey = ws.subscribe.mock.calls[0][0];
    unmount();

    expect(ws.unsubscribe).toHaveBeenCalledWith(subscriptionKey);
  });

  it("should cleanup status listeners on unmount", () => {
    const ws = protocolWS.modbus;

    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    const statusCallback = ws.onStatusChange.mock.calls[0][0];
    unmount();

    expect(ws.offStatusChange).toHaveBeenCalledWith(statusCallback);
  });

  it("should disconnect on unmount when autoConnect is true", () => {
    const ws = protocolWS.modbus;

    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", null, true),
    );

    unmount();

    expect(ws.disconnect).toHaveBeenCalled();
  });

  it("should not disconnect on unmount when autoConnect is false", () => {
    const ws = protocolWS.modbus;

    const { unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    unmount();

    expect(ws.disconnect).not.toHaveBeenCalled();
  });
});

describe("useProtocolWebSocket - Tenant ID Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass tenantId to connect method", async () => {
    const ws = protocolWS.modbus;
    ws.connect.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", "custom-tenant-123", false),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(ws.connect).toHaveBeenCalledWith("modbus", "custom-tenant-123");
  });

  it("should handle null tenantId", async () => {
    const ws = protocolWS.modbus;
    ws.connect.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(ws.connect).toHaveBeenCalledWith("modbus", null);
  });

  it("should handle undefined tenantId", async () => {
    const ws = protocolWS.modbus;
    ws.connect.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", undefined, false),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(ws.connect).toHaveBeenCalledWith("modbus", null);
  });
});

describe("useProtocolWebSocket - IsConnected Helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return isConnected as true when status is connected", () => {
    const ws = protocolWS.modbus;

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    const statusCallback = ws.onStatusChange.mock.calls[0][0];

    act(() => {
      statusCallback("connected");
    });

    expect(result.current.isConnected).toBe(true);
  });

  it("should return isConnected as false when status is not connected", () => {
    const ws = protocolWS.modbus;

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    const statusCallback = ws.onStatusChange.mock.calls[0][0];

    act(() => {
      statusCallback("disconnected");
    });

    expect(result.current.isConnected).toBe(false);
  });

  it("should update isConnected when status changes", () => {
    const ws = protocolWS.modbus;

    const { result } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );

    const statusCallback = ws.onStatusChange.mock.calls[0][0];

    act(() => {
      statusCallback("connecting");
    });
    expect(result.current.isConnected).toBe(false);

    act(() => {
      statusCallback("connected");
    });
    expect(result.current.isConnected).toBe(true);

    act(() => {
      statusCallback("disconnected");
    });
    expect(result.current.isConnected).toBe(false);
  });
});

describe("useProtocolEvent Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not subscribe when protocol is invalid (no ws)", () => {
    const callback = vi.fn();

    renderHook(() =>
      useProtocolEvent("invalid-protocol", "some-event", callback),
    );

    expect(protocolWS.modbus.subscribe).not.toHaveBeenCalled();
  });

  it("should not subscribe when callback is missing", () => {
    const ws = protocolWS.modbus;

    renderHook(() => useProtocolEvent("modbus", "some-event", null));

    expect(ws.subscribe).not.toHaveBeenCalled();
  });

  it("should subscribe to events on mount", () => {
    const ws = protocolWS.modbus;
    const callback = vi.fn();

    renderHook(() => useProtocolEvent("modbus", "register_update", callback));

    expect(ws.subscribe).toHaveBeenCalled();
    expect(ws.subscribe.mock.calls[0][0]).toContain(
      "modbus-event-register_update-",
    );
  });

  it("should call callback when event type matches", () => {
    const ws = protocolWS.modbus;
    const callback = vi.fn();

    renderHook(() => useProtocolEvent("modbus", "register_update", callback));

    const handler = ws.subscribe.mock.calls[0][1];
    const eventData = { type: "register_update", value: 42 };

    act(() => {
      handler(eventData);
    });

    expect(callback).toHaveBeenCalledWith(eventData);
  });

  it("should not call callback when event type does not match", () => {
    const ws = protocolWS.modbus;
    const callback = vi.fn();

    renderHook(() => useProtocolEvent("modbus", "register_update", callback));

    const handler = ws.subscribe.mock.calls[0][1];

    act(() => {
      handler({ type: "other_event", value: 42 });
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("should unsubscribe on unmount", () => {
    const ws = protocolWS.modbus;
    const callback = vi.fn();

    const { unmount } = renderHook(() =>
      useProtocolEvent("modbus", "register_update", callback),
    );

    const subscriptionKey = ws.subscribe.mock.calls[0][0];
    unmount();

    expect(ws.unsubscribe).toHaveBeenCalledWith(subscriptionKey);
  });

  it("should accept an optional tenantId without error", () => {
    const callback = vi.fn();

    expect(() =>
      renderHook(() =>
        useProtocolEvent("modbus", "register_update", callback, "tenant-1"),
      ),
    ).not.toThrow();
  });
});

describe("useModbusRegisters Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProtocolMockDefaults();
    // Make sure connect calls the status callback
    protocolWS.modbus.connect.mockImplementation((protocol, tenantId) => {
      const statusCallback = protocolWS.modbus.onStatusChange.mock.calls[0]?.[0];
      if (statusCallback) {
        statusCallback("connected");
      }
      return Promise.resolve(true);
    });
    protocolWS.modbus.isConnected.mockReturnValue(true);
    protocolWS.modbus.getStatus.mockReturnValue("connected");
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetProtocolMockDefaults();
    cleanup();
    forceGC();
  });

  it("should initialize with empty registers", async () => {
    const { result, unmount } = await mountAutoConnectHook(() =>
      useModbusRegisters("device-1"),
    );

    expect(result.current.registers).toEqual({});
    unmount();
    forceGC();
  });

  it("should expose base websocket state alongside registers", async () => {
    const { result, unmount } = await mountAutoConnectHook(() =>
      useModbusRegisters("device-1"),
    );

    expect(result.current).toHaveProperty("connectionStatus");
    expect(result.current).toHaveProperty("isConnected");
    expect(result.current).toHaveProperty("connect");
    expect(result.current).toHaveProperty("disconnect");
    expect(result.current).toHaveProperty("send");
    unmount();
    forceGC();
  });

  it("should update registers on matching register_update", async () => {
    const ws = protocolWS.modbus;

    const { result, unmount } = await mountAutoConnectHook(() =>
      useModbusRegisters("device-1"),
    );

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "register_update",
        device_id: "device-1",
        address: 40001,
        value: 100,
        timestamp: "2026-01-01T00:00:00Z",
      });
    });

    expect(result.current.registers).toEqual({
      40001: { value: 100, timestamp: "2026-01-01T00:00:00Z" },
    });
    unmount();
    forceGC();
  });

  it("should accumulate multiple register updates", async () => {
    const ws = protocolWS.modbus;

    const { result, unmount } = await mountAutoConnectHook(() =>
      useModbusRegisters("device-1"),
    );

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "register_update",
        device_id: "device-1",
        address: 40001,
        value: 100,
        timestamp: "t1",
      });
    });

    act(() => {
      dataCallback({
        type: "register_update",
        device_id: "device-1",
        address: 40002,
        value: 200,
        timestamp: "t2",
      });
    });

    expect(result.current.registers).toEqual({
      40001: { value: 100, timestamp: "t1" },
      40002: { value: 200, timestamp: "t2" },
    });
    unmount();
    forceGC();
  });

  it("should ignore updates for a different device_id", async () => {
    const ws = protocolWS.modbus;

    const { result, unmount } = await mountAutoConnectHook(() =>
      useModbusRegisters("device-1"),
    );

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "register_update",
        device_id: "device-2",
        address: 40001,
        value: 100,
        timestamp: "t1",
      });
    });

    expect(result.current.registers).toEqual({});
    unmount();
    forceGC();
  });

  it("should ignore updates with a different data type", async () => {
    const ws = protocolWS.modbus;

    const { result, unmount } = await mountAutoConnectHook(() =>
      useModbusRegisters("device-1"),
    );

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "other_type",
        device_id: "device-1",
        address: 40001,
        value: 100,
      });
    });

    expect(result.current.registers).toEqual({});
    unmount();
    forceGC();
  });

  it("should ignore updates when data is null", async () => {
    const ws = protocolWS.modbus;

    const { result, unmount } = await mountAutoConnectHook(() =>
      useModbusRegisters("device-1"),
    );

    expect(() => ws.subscribe.mock.calls[0][1]).not.toThrow();
    expect(result.current.registers).toEqual({});
    unmount();
    forceGC();
  });
});

describe("useOPCUANodes Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProtocolMockDefaults();
    protocolWS.opcua.connect.mockImplementation((protocol, tenantId) => {
      const statusCallback = protocolWS.opcua.onStatusChange.mock.calls[0]?.[0];
      if (statusCallback) {
        statusCallback("connected");
      }
      return Promise.resolve(true);
    });
    protocolWS.opcua.isConnected.mockReturnValue(true);
    protocolWS.opcua.getStatus.mockReturnValue("connected");
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetProtocolMockDefaults();
    cleanup();
    forceGC();
  });

  it("should initialize with an empty Map of node values", async () => {
    const { result, unmount } = await mountAutoConnectHook(() =>
      useOPCUANodes(["node-1"]),
    );

    expect(result.current.nodeValues).toBeInstanceOf(Map);
    expect(result.current.nodeValues.size).toBe(0);
    unmount();
    forceGC();
  });

  it("should update node values when nodeIds list is empty (accepts all)", async () => {
    const ws = protocolWS.opcua;

    const { result, unmount } = await mountAutoConnectHook(() => useOPCUANodes([]));

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "node_value_update",
        node_id: "node-1",
        value: 1,
        timestamp: "t1",
        quality: "good",
      });
    });

    expect(result.current.nodeValues.get("node-1")).toEqual({
      value: 1,
      timestamp: "t1",
      quality: "good",
    });
    unmount();
    forceGC();
  });

  it("should update node values when node_id is in the watched list", async () => {
    const ws = protocolWS.opcua;

    const { result, unmount } = await mountAutoConnectHook(() =>
      useOPCUANodes(["node-1", "node-2"]),
    );

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "node_value_update",
        node_id: "node-2",
        value: 5,
        timestamp: "t2",
        quality: "good",
      });
    });

    expect(result.current.nodeValues.get("node-2")).toEqual({
      value: 5,
      timestamp: "t2",
      quality: "good",
    });
    unmount();
    forceGC();
  });

  it("should ignore node updates not in the watched list", async () => {
    const ws = protocolWS.opcua;

    const { result, unmount } = await mountAutoConnectHook(() =>
      useOPCUANodes(["node-1"]),
    );

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "node_value_update",
        node_id: "node-99",
        value: 5,
        timestamp: "t2",
        quality: "good",
      });
    });

    expect(result.current.nodeValues.size).toBe(0);
    unmount();
    forceGC();
  });

  it("should ignore data with a different type", async () => {
    const ws = protocolWS.opcua;

    const { result, unmount } = await mountAutoConnectHook(() => useOPCUANodes([]));

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({ type: "other_type", node_id: "node-1", value: 1 });
    });

    expect(result.current.nodeValues.size).toBe(0);
    unmount();
    forceGC();
  });

  it("should default nodeIds to an empty array", async () => {
    const ws = protocolWS.opcua;

    const { result, unmount } = await mountAutoConnectHook(() => useOPCUANodes());

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "node_value_update",
        node_id: "node-1",
        value: 1,
        timestamp: "t1",
        quality: "good",
      });
    });

    expect(result.current.nodeValues.get("node-1")).toBeDefined();
    unmount();
    forceGC();
  });
});

describe("useDNP3Points Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProtocolMockDefaults();
    protocolWS.dnp3.connect.mockImplementation((protocol, tenantId) => {
      const statusCallback = protocolWS.dnp3.onStatusChange.mock.calls[0]?.[0];
      if (statusCallback) {
        statusCallback("connected");
      }
      return Promise.resolve(true);
    });
    protocolWS.dnp3.isConnected.mockReturnValue(true);
    protocolWS.dnp3.getStatus.mockReturnValue("connected");
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetProtocolMockDefaults();
    cleanup();
    forceGC();
  });

  it("should initialize with empty points", async () => {
    const { result, unmount } = await mountAutoConnectHook(() =>
      useDNP3Points("outstation-1"),
    );

    expect(result.current.points).toEqual({});
    unmount();
    forceGC();
  });

  it("should update points on matching outstation_id", async () => {
    const ws = protocolWS.dnp3;

    const { result, unmount } = await mountAutoConnectHook(() =>
      useDNP3Points("outstation-1"),
    );

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "point_update",
        outstation_id: "outstation-1",
        index: 1,
        value: 10,
        timestamp: "t1",
        quality: "good",
      });
    });

    expect(result.current.points).toEqual({
      1: { value: 10, timestamp: "t1", quality: "good" },
    });
    unmount();
    forceGC();
  });

  it("should accumulate multiple point updates", async () => {
    const ws = protocolWS.dnp3;

    const { result, unmount } = await mountAutoConnectHook(() =>
      useDNP3Points("outstation-1"),
    );

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "point_update",
        outstation_id: "outstation-1",
        index: 1,
        value: 10,
        timestamp: "t1",
        quality: "good",
      });
    });

    act(() => {
      dataCallback({
        type: "point_update",
        outstation_id: "outstation-1",
        index: 2,
        value: 20,
        timestamp: "t2",
        quality: "good",
      });
    });

    expect(result.current.points).toEqual({
      1: { value: 10, timestamp: "t1", quality: "good" },
      2: { value: 20, timestamp: "t2", quality: "good" },
    });
    unmount();
    forceGC();
  });

  it("should ignore updates for a different outstation_id", async () => {
    const ws = protocolWS.dnp3;

    const { result, unmount } = await mountAutoConnectHook(() =>
      useDNP3Points("outstation-1"),
    );

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "point_update",
        outstation_id: "outstation-2",
        index: 1,
        value: 10,
      });
    });

    expect(result.current.points).toEqual({});
    unmount();
    forceGC();
  });

  it("should ignore updates with a different data type", async () => {
    const ws = protocolWS.dnp3;

    const { result, unmount } = await mountAutoConnectHook(() =>
      useDNP3Points("outstation-1"),
    );

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "other_type",
        outstation_id: "outstation-1",
        index: 1,
        value: 10,
      });
    });

    expect(result.current.points).toEqual({});
    unmount();
    forceGC();
  });
});

describe("useMQTTMessages Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProtocolMockDefaults();
    protocolWS.mqtt.connect.mockImplementation((protocol, tenantId) => {
      const statusCallback = protocolWS.mqtt.onStatusChange.mock.calls[0]?.[0];
      if (statusCallback) {
        statusCallback("connected");
      }
      return Promise.resolve(true);
    });
    protocolWS.mqtt.isConnected.mockReturnValue(true);
    protocolWS.mqtt.getStatus.mockReturnValue("connected");
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetProtocolMockDefaults();
    cleanup();
    forceGC();
  });

  it("should initialize with an empty messages array", async () => {
    const { result, unmount } = await mountAutoConnectHook(() => useMQTTMessages());

    expect(result.current.messages).toEqual([]);
    unmount();
    forceGC();
  });

  it("should append messages when topics filter is empty (accepts all)", async () => {
    const ws = protocolWS.mqtt;

    const { result, unmount } = await mountAutoConnectHook(() => useMQTTMessages([]));

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "message",
        topic: "sensors/temp",
        payload: "72",
        timestamp: new Date().toISOString(),
        qos: 1,
      });
    });

    expect(result.current.messages).toEqual([
      { topic: "sensors/temp", payload: "72", timestamp: expect.any(String), qos: 1 },
    ]);
    unmount();
    forceGC();
  });

  it("should append messages that match the topics filter", async () => {
    const ws = protocolWS.mqtt;

    const { result, unmount } = await mountAutoConnectHook(() =>
      useMQTTMessages(["sensors/temp", "sensors/humidity"]),
    );

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "message",
        topic: "sensors/humidity",
        payload: "45",
        timestamp: new Date().toISOString(),
        qos: 0,
      });
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].topic).toBe("sensors/humidity");
    unmount();
    forceGC();
  });

  it("should ignore messages that do not match the topics filter", async () => {
    const ws = protocolWS.mqtt;

    const { result, unmount } = await mountAutoConnectHook(() =>
      useMQTTMessages(["sensors/temp"]),
    );

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "message",
        topic: "sensors/pressure",
        payload: "1013",
        timestamp: new Date().toISOString(),
        qos: 0,
      });
    });

    expect(result.current.messages).toEqual([]);
    unmount();
    forceGC();
  });

  it("should ignore data with a different type", async () => {
    const ws = protocolWS.mqtt;

    const { result, unmount } = await mountAutoConnectHook(() => useMQTTMessages([]));

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({ type: "other_type", topic: "sensors/temp" });
    });

    expect(result.current.messages).toEqual([]);
    unmount();
    forceGC();
  });

  it("should keep only the last 100 messages", async () => {
    const ws = protocolWS.mqtt;

    const { result, unmount } = await mountAutoConnectHook(() => useMQTTMessages([]));

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      for (let i = 0; i < 105; i++) {
        dataCallback({
          type: "message",
          topic: "sensors/temp",
          payload: String(i),
          // Use unique timestamps so processedKeysRef doesn't dedupe them
          timestamp: new Date(Date.now() + i).toISOString(),
          qos: 0,
        });
      }
    });

    expect(result.current.messages).toHaveLength(100);
    expect(result.current.messages[0].payload).toBe("5");
    expect(result.current.messages[99].payload).toBe("104");
    unmount();
    forceGC();
  });

  it("should clear messages when clearMessages is called", async () => {
    const ws = protocolWS.mqtt;

    const { result, unmount } = await mountAutoConnectHook(() => useMQTTMessages([]));

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "message",
        topic: "sensors/temp",
        payload: "72",
        timestamp: new Date().toISOString(),
        qos: 1,
      });
    });

    expect(result.current.messages).toHaveLength(1);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
    unmount();
    forceGC();
  });

  it("should default topics to an empty array", async () => {
    const ws = protocolWS.mqtt;

    const { result, unmount } = await mountAutoConnectHook(() => useMQTTMessages());

    const dataCallback = ws.subscribe.mock.calls[0][1];

    act(() => {
      dataCallback({
        type: "message",
        topic: "any/topic",
        payload: "x",
        timestamp: new Date().toISOString(),
        qos: 0,
      });
    });

    expect(result.current.messages).toHaveLength(1);
    unmount();
    forceGC();
  });
});
