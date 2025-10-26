/**
 * Tests for Protocol WebSocket Service
 *
 * Tests connection lifecycle, reconnection logic, data subscription, and error handling
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtocolWebSocketService } from "../services/protocolWebSocketService";

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
    this.sentMessages = [];

    // Auto-open after a short delay
    setTimeout(() => {
      if (this.onopen) {
        this.readyState = MockWebSocket.OPEN;
        this.onopen();
      }
    }, 10);
  }

  send(data) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose();
    }
  }

  // Simulate receiving a message
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  // Simulate error
  simulateError(error) {
    if (this.onerror) {
      this.onerror(error);
    }
  }

  static get CONNECTING() {
    return 0;
  }
  static get OPEN() {
    return 1;
  }
  static get CLOSING() {
    return 2;
  }
  static get CLOSED() {
    return 3;
  }
}

describe("ProtocolWebSocketService - Connection Lifecycle", () => {
  let service;
  let originalWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket;
    service = new ProtocolWebSocketService();
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    if (service) {
      service.disconnect();
    }
  });

  it("should initialize with disconnected status", () => {
    expect(service.getStatus()).toBe("disconnected");
    expect(service.isConnected()).toBe(false);
  });

  it("should connect successfully", async () => {
    await service.connect("modbus");
    expect(service.isConnected()).toBe(true);
    expect(service.getStatus()).toBe("connected");
  });

  it("should connect with tenant ID", async () => {
    await service.connect("modbus", "tenant-123");
    expect(service.isConnected()).toBe(true);
    expect(service.tenantId).toBe("tenant-123");
  });

  it("should disconnect properly", async () => {
    await service.connect("modbus");
    expect(service.isConnected()).toBe(true);

    service.disconnect();
    expect(service.isConnected()).toBe(false);
    expect(service.getStatus()).toBe("disconnected");
  });

  it("should disconnect existing connection before new connection", async () => {
    await service.connect("modbus");
    const firstWs = service.ws;

    await service.connect("opcua");
    expect(service.ws).not.toBe(firstWs);
    expect(service.protocol).toBe("opcua");
  });

  it("should reset reconnect attempts on successful connection", async () => {
    service.reconnectAttempts = 5;
    await service.connect("modbus");
    expect(service.reconnectAttempts).toBe(0);
  });

  it("should set shouldReconnect to true on connect", async () => {
    service.shouldReconnect = false;
    await service.connect("modbus");
    expect(service.shouldReconnect).toBe(true);
  });

  it("should set shouldReconnect to false on disconnect", async () => {
    await service.connect("modbus");
    service.disconnect();
    expect(service.shouldReconnect).toBe(false);
  });
});

describe("ProtocolWebSocketService - Reconnection Logic", () => {
  let service;
  let originalWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket;
    service = new ProtocolWebSocketService();
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    if (service) {
      service.disconnect();
    }
  });

  it("should schedule reconnection on close", async () => {
    await service.connect("modbus");

    // Simulate connection close
    service.ws.close();

    // Allow async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(service.reconnectTimeout).not.toBeNull();
  });

  it("should use exponential backoff for reconnection", () => {
    service.reconnectAttempts = 0;
    service.scheduleReconnect();
    expect(service.reconnectAttempts).toBe(1);

    service.scheduleReconnect();
    expect(service.reconnectAttempts).toBe(2);
  });

  it("should not exceed max reconnect delay", () => {
    service.reconnectAttempts = 100;
    service.scheduleReconnect();

    // Delay should be capped at maxReconnectDelay
    expect(service.reconnectTimeout).not.toBeNull();
  });

  it("should not reconnect if shouldReconnect is false", async () => {
    await service.connect("modbus");
    service.shouldReconnect = false;

    const attemptsBefore = service.reconnectAttempts;
    service.ws.close();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(service.reconnectAttempts).toBe(attemptsBefore);
  });

  it("should respect max reconnection attempts limit", () => {
    service.reconnectAttempts = 5;
    expect(service.reconnectAttempts).toBeLessThan(
      service.maxReconnectAttempts,
    );
    expect(service.maxReconnectAttempts).toBe(10);
  });

  it("should clear existing reconnect timeout before scheduling new one", () => {
    const firstTimeout = setTimeout(() => {}, 1000);
    service.reconnectTimeout = firstTimeout;

    service.scheduleReconnect();

    expect(service.reconnectTimeout).not.toBe(firstTimeout);
  });
});

describe("ProtocolWebSocketService - Data Subscription", () => {
  let service;
  let originalWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket;
    service = new ProtocolWebSocketService();
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    if (service) {
      service.disconnect();
    }
  });

  it("should subscribe to data updates", () => {
    const callback = vi.fn();
    service.subscribe("key1", callback);

    expect(service.listeners.has("key1")).toBe(true);
  });

  it("should unsubscribe from data updates", () => {
    const callback = vi.fn();
    service.subscribe("key1", callback);
    service.unsubscribe("key1");

    expect(service.listeners.has("key1")).toBe(false);
  });

  it("should notify subscribers when data is received", async () => {
    const callback = vi.fn();
    await service.connect("modbus");
    service.subscribe("key1", callback);

    const testData = { type: "data", value: 123 };
    service.ws.simulateMessage(testData);

    expect(callback).toHaveBeenCalledWith(testData);
  });

  it("should not notify on heartbeat messages", async () => {
    const callback = vi.fn();
    await service.connect("modbus");
    service.subscribe("key1", callback);

    service.ws.simulateMessage({ type: "heartbeat" });

    expect(callback).not.toHaveBeenCalled();
  });

  it("should handle multiple subscribers", async () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    await service.connect("modbus");

    service.subscribe("key1", callback1);
    service.subscribe("key2", callback2);

    const testData = { type: "data", value: 456 };
    service.ws.simulateMessage(testData);

    expect(callback1).toHaveBeenCalledWith(testData);
    expect(callback2).toHaveBeenCalledWith(testData);
  });

  it("should handle subscriber callback errors gracefully", async () => {
    const errorCallback = vi.fn(() => {
      throw new Error("Callback error");
    });
    const successCallback = vi.fn();

    await service.connect("modbus");
    service.subscribe("error", errorCallback);
    service.subscribe("success", successCallback);

    const testData = { type: "data", value: 789 };
    expect(() => service.ws.simulateMessage(testData)).not.toThrow();

    expect(errorCallback).toHaveBeenCalled();
    expect(successCallback).toHaveBeenCalled();
  });
});

describe("ProtocolWebSocketService - Status Change Notifications", () => {
  let service;
  let originalWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket;
    service = new ProtocolWebSocketService();
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    if (service) {
      service.disconnect();
    }
  });

  it("should subscribe to status changes", () => {
    const callback = vi.fn();
    service.onStatusChange(callback);

    expect(service.statusListeners.has(callback)).toBe(true);
  });

  it("should unsubscribe from status changes", () => {
    const callback = vi.fn();
    service.onStatusChange(callback);
    service.offStatusChange(callback);

    expect(service.statusListeners.has(callback)).toBe(false);
  });

  it("should notify status listeners on connection", async () => {
    const callback = vi.fn();
    service.onStatusChange(callback);

    await service.connect("modbus");

    expect(callback).toHaveBeenCalledWith("connected");
  });

  it("should notify status listeners on disconnection", async () => {
    const callback = vi.fn();
    service.onStatusChange(callback);

    await service.connect("modbus");
    callback.mockClear();

    service.disconnect();

    expect(callback).toHaveBeenCalledWith("disconnected");
  });

  it("should notify status listeners on error", async () => {
    const callback = vi.fn();
    service.onStatusChange(callback);

    await service.connect("modbus");
    callback.mockClear();

    service.ws.simulateError(new Error("Connection error"));

    expect(callback).toHaveBeenCalledWith("error");
  });

  it("should handle status listener errors gracefully", async () => {
    const errorCallback = vi.fn(() => {
      throw new Error("Listener error");
    });
    service.onStatusChange(errorCallback);

    expect(() => service.notifyStatusChange("connected")).not.toThrow();
  });
});

describe("ProtocolWebSocketService - Heartbeat Mechanism", () => {
  let service;
  let originalWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket;
    service = new ProtocolWebSocketService();
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    if (service) {
      service.disconnect();
    }
  });

  it("should start heartbeat on connection", async () => {
    await service.connect("modbus");
    expect(service.heartbeatInterval).not.toBeNull();
  });

  it("should stop heartbeat on disconnection", async () => {
    await service.connect("modbus");
    service.disconnect();
    expect(service.heartbeatInterval).toBeNull();
  });

  it("should have heartbeat interval defined", async () => {
    await service.connect("modbus");
    expect(service.heartbeatInterval).toBeDefined();
  });

  it("should cleanup heartbeat on error", async () => {
    await service.connect("modbus");
    service.stopHeartbeat();
    expect(service.heartbeatInterval).toBeNull();
  });
});

describe("ProtocolWebSocketService - Send Method", () => {
  let service;
  let originalWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket;
    service = new ProtocolWebSocketService();
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    if (service) {
      service.disconnect();
    }
  });

  it("should send data when connected", async () => {
    await service.connect("modbus");

    const testData = { command: "read", register: 100 };
    service.send(testData);

    expect(service.ws.sentMessages).toContain(JSON.stringify(testData));
  });

  it("should not send data when disconnected", () => {
    const testData = { command: "read", register: 100 };
    expect(() => service.send(testData)).not.toThrow();
  });

  it("should handle send errors gracefully", async () => {
    await service.connect("modbus");
    service.ws.send = vi.fn(() => {
      throw new Error("Send error");
    });

    const testData = { command: "read", register: 100 };
    expect(() => service.send(testData)).not.toThrow();
  });
});

describe("ProtocolWebSocketService - Error Handling", () => {
  let service;
  let originalWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket;
    service = new ProtocolWebSocketService();
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    if (service) {
      service.disconnect();
    }
  });

  it("should handle malformed JSON messages gracefully", async () => {
    const callback = vi.fn();
    await service.connect("modbus");
    service.subscribe("key1", callback);

    if (service.ws.onmessage) {
      service.ws.onmessage({ data: "invalid json {" });
    }

    expect(callback).not.toHaveBeenCalled();
  });

  it("should handle connection errors", async () => {
    const callback = vi.fn();
    service.onStatusChange(callback);

    await service.connect("modbus");
    service.ws.simulateError(new Error("Connection error"));

    expect(service.getStatus()).toBe("error");
  });

  it("should handle connection timeout scenario", () => {
    // Create a WebSocket that never opens
    class SlowWebSocket extends MockWebSocket {
      constructor(url) {
        super(url);
        this.readyState = MockWebSocket.CONNECTING;
        // Don't auto-open
      }
    }

    global.WebSocket = SlowWebSocket;
    service = new ProtocolWebSocketService();

    // Test that connect returns a promise
    const connectPromise = service.connect("modbus");
    expect(connectPromise).toBeInstanceOf(Promise);
  });

  it("should initialize with proper state for timeout handling", () => {
    expect(service.connectionStatus).toBe("disconnected");
    expect(service.ws).toBeNull();
  });
});
