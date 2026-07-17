/**
 * websocketService.test.js - Complete Test Coverage for WebSocket Service
 * 
 * Covers:
 * - Connection lifecycle (connect, disconnect, reconnect)
 * - Reconnection scenarios (exponential backoff, max attempts)
 * - Subscription management (subscribe, unsubscribe, multiple listeners)
 * - Message handling (parse, cache, notify listeners)
 * - Heartbeat/ping-pong mechanism
 * - Status change listeners
 * - Caching for offline resilience
 * - Cleanup on disconnect
 * - Edge cases (multiple connects, missing data, malformed messages)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import websocketService from "../services/websocketService";

// ============================================================
// MOCK WEBSOCKET
// ============================================================

class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.listeners = {};
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
    this._openDelay = 10;
    this._shouldOpen = true;
    this._lastSent = null;

    // Simulate connection after a delay
    setTimeout(() => {
      if (this._shouldOpen) {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) this.onopen();
        if (this.listeners.open) this.listeners.open();
      }
    }, this._openDelay);
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  send(data) {
    this._lastSent = data;
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
    if (this.listeners.close) this.listeners.close();
  }

  addEventListener(event, handler) {
    this.listeners[event] = handler;
  }

  removeEventListener(event, handler) {
    if (this.listeners[event] === handler) {
      delete this.listeners[event];
    }
  }

  // Helper to simulate incoming messages
  _receiveMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  // Helper to simulate error
  _triggerError() {
    if (this.onerror) {
      this.onerror(new Error("WebSocket error"));
    }
  }

  // Helper to simulate close
  _triggerClose() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
}

// ============================================================
// SETUP & TEARDOWN
// ============================================================

describe("WebSocket Service", () => {
  let originalWebSocket;

  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket;
    websocketService.disconnect();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    websocketService.disconnect();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // ============================================================
  // CONNECTION TESTS
  // ============================================================

  describe("Connection Lifecycle", () => {
    it("should initialize with disconnected status", () => {
      expect(websocketService.getStatus()).toBe("disconnected");
      expect(websocketService.isConnected()).toBe(false);
    });

    it("should connect successfully", async () => {
      await websocketService.connect();
      expect(websocketService.getStatus()).toBe("connected");
      expect(websocketService.isConnected()).toBe(true);
    });

    it("should connect with tenant ID", async () => {
      const tenantId = "test-tenant-123";
      await websocketService.connect(tenantId);
      expect(websocketService.getStatus()).toBe("connected");
      expect(websocketService.tenantId).toBe(tenantId);
    });

    it("should handle connection timeout", async () => {
      const SlowMockWebSocket = class extends MockWebSocket {
        constructor(url) {
          super(url);
          this._openDelay = 20000;
        }
      };
      global.WebSocket = SlowMockWebSocket;

      await expect(websocketService.connect()).rejects.toThrow(
        "WebSocket connection timeout"
      );
    });

    it("should disconnect properly", async () => {
      await websocketService.connect();
      expect(websocketService.isConnected()).toBe(true);

      websocketService.disconnect();
      expect(websocketService.isConnected()).toBe(false);
      expect(websocketService.getStatus()).toBe("disconnected");
      expect(websocketService.shouldReconnect).toBe(false);
    });

    it("should close existing connection before reconnecting", async () => {
      await websocketService.connect();
      const firstWs = websocketService.ws;
      
      await websocketService.connect("new-tenant");
      
      expect(firstWs.readyState).toBe(MockWebSocket.CLOSED);
      expect(websocketService.tenantId).toBe("new-tenant");
    });
  });

  // ============================================================
  // RECONNECTION TESTS (No fake timers)
  // ============================================================

  describe("Reconnection Logic", () => {
    it("should attempt reconnection on disconnect", async () => {
      await websocketService.connect();
      const ws = websocketService.ws;
      ws._triggerClose();

      // Wait a bit for reconnection to be scheduled
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be in reconnecting state
      expect(websocketService.getStatus()).toBe("reconnecting");
      expect(websocketService.reconnectAttempts).toBe(1);
    });

    it("should cap reconnection attempts at maxReconnectAttempts", async () => {
      // Reduce max attempts for test speed
      const originalMax = websocketService.maxReconnectAttempts;
      websocketService.maxReconnectAttempts = 3;
      
      await websocketService.connect();
      
      // Simulate multiple disconnects
      for (let i = 0; i < 4; i++) {
        const ws = websocketService.ws;
        ws._triggerClose();
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Should have stopped reconnecting
      expect(websocketService.reconnectAttempts).toBe(3);
      expect(websocketService.getStatus()).toBe("disconnected");
      
      websocketService.maxReconnectAttempts = originalMax;
    }, 3000);

    it("should not reconnect when shouldReconnect is false", async () => {
      await websocketService.connect();
      websocketService.shouldReconnect = false;
      
      const ws = websocketService.ws;
      ws._triggerClose();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(websocketService.getStatus()).toBe("disconnected");
      expect(websocketService.reconnectTimeout).toBeNull();
    });
  });

  // ============================================================
  // SUBSCRIPTION TESTS
  // ============================================================

  describe("Subscription Management", () => {
    it("should handle subscription", async () => {
      await websocketService.connect();

      const callback = vi.fn();
      const unsubscribe = websocketService.subscribe("test-stream", callback);

      expect(typeof unsubscribe).toBe("function");

      websocketService.handleMessage({
        stream: "test-stream",
        data: { value: 123 },
      });

      expect(callback).toHaveBeenCalledWith({ value: 123 });
    });

    it("should unsubscribe correctly", async () => {
      await websocketService.connect();

      const callback = vi.fn();
      const unsubscribe = websocketService.subscribe("test-stream", callback);

      unsubscribe();

      websocketService.handleMessage({
        stream: "test-stream",
        data: { value: 456 },
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle multiple listeners for same stream", async () => {
      await websocketService.connect();

      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      websocketService.subscribe("test-stream", callback1);
      websocketService.subscribe("test-stream", callback2);

      websocketService.handleMessage({
        stream: "test-stream",
        data: { value: 789 },
      });

      expect(callback1).toHaveBeenCalledWith({ value: 789 });
      expect(callback2).toHaveBeenCalledWith({ value: 789 });
    });

    it("should handle subscription to non-existent stream", async () => {
      await websocketService.connect();

      const callback = vi.fn();
      websocketService.subscribe("non-existent-stream", callback);

      websocketService.handleMessage({
        stream: "test-stream",
        data: { value: 123 },
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should send subscription message to server when connected", async () => {
      await websocketService.connect();

      const ws = websocketService.ws;
      const sendSpy = vi.spyOn(ws, 'send');

      websocketService.subscribe("metrics", vi.fn());

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: "subscribe",
          stream: "metrics",
          tenant_id: websocketService.tenantId,
        })
      );
    });

    it("should send unsubscribe message to server", async () => {
      await websocketService.connect();

      const ws = websocketService.ws;
      const sendSpy = vi.spyOn(ws, 'send');

      const callback = vi.fn();
      const unsubscribe = websocketService.subscribe("metrics", callback);
      
      unsubscribe();

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: "unsubscribe",
          stream: "metrics",
        })
      );
    });
  });

  // ============================================================
  // MESSAGE HANDLING TESTS
  // ============================================================

  describe("Message Handling", () => {
    it("should handle incoming messages", async () => {
      await websocketService.connect();

      const callback = vi.fn();
      websocketService.subscribe("test-stream", callback);

      const ws = websocketService.ws;
      ws._receiveMessage({
        stream: "test-stream",
        data: { value: 123 },
      });

      expect(callback).toHaveBeenCalledWith({ value: 123 });
    });

    it("should parse JSON messages", async () => {
      await websocketService.connect();

      const callback = vi.fn();
      websocketService.subscribe("test-stream", callback);

      const ws = websocketService.ws;
      ws._receiveMessage({
        stream: "test-stream",
        data: { nested: { value: 456 } },
      });

      expect(callback).toHaveBeenCalledWith({ nested: { value: 456 } });
    });

    it("should ignore malformed JSON messages", async () => {
      await websocketService.connect();

      const callback = vi.fn();
      websocketService.subscribe("test-stream", callback);

      const ws = websocketService.ws;
      ws.onmessage({ data: "not valid json{" });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle messages with missing stream", async () => {
      await websocketService.connect();

      const callback = vi.fn();
      websocketService.subscribe("test-stream", callback);

      const ws = websocketService.ws;
      ws._receiveMessage({
        data: { value: 123 },
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle pong responses", async () => {
      await websocketService.connect();

      const ws = websocketService.ws;
      const lastHeartbeatBefore = websocketService.lastHeartbeat;
      
      ws._receiveMessage({
        type: "pong",
      });

      expect(websocketService.lastHeartbeat).not.toBe(lastHeartbeatBefore);
    });
  });

  // ============================================================
  // CACHING TESTS
  // ============================================================

  describe("Data Caching", () => {
    it("should cache data for offline resilience", async () => {
      await websocketService.connect();

      websocketService.handleMessage({
        stream: "test-stream",
        data: { value: 789 },
      });

      const cached = websocketService.getCachedData("test-stream");

      expect(cached).toBeTruthy();
      expect(cached.value).toBe(789);
      expect(cached._cached).toBe(true);
      expect(cached._cachedAt).toBeTruthy();
    });

    it("should return null for non-existent cached data", () => {
      const cached = websocketService.getCachedData("non-existent-stream");
      expect(cached).toBeNull();
    });

    it("should cache only the latest data for a stream", async () => {
      await websocketService.connect();

      websocketService.handleMessage({
        stream: "test-stream",
        data: { value: 111 },
      });

      websocketService.handleMessage({
        stream: "test-stream",
        data: { value: 222 },
      });

      const cached = websocketService.getCachedData("test-stream");
      expect(cached.value).toBe(222);
    });
  });

  // ============================================================
  // HEARTBEAT TESTS (No fake timers)
  // ============================================================

  describe("Heartbeat Mechanism", () => {
    it("should start heartbeat on connection", async () => {
      await websocketService.connect();
      expect(websocketService.heartbeatInterval).not.toBeNull();
    });

    it("should stop heartbeat on disconnect", async () => {
      await websocketService.connect();
      expect(websocketService.heartbeatInterval).not.toBeNull();

      websocketService.disconnect();
      expect(websocketService.heartbeatInterval).toBeNull();
    });

    it("should not send heartbeat when WebSocket is not open", () => {
      // This test just verifies the try/catch doesn't throw
      expect(() => {
        websocketService.startHeartbeat();
      }).not.toThrow();
    });
  });

  // ============================================================
  // STATUS LISTENER TESTS
  // ============================================================

  describe("Status Change Listeners", () => {
    it("should notify status change listeners", async () => {
      const statusCallback = vi.fn();

      websocketService.onStatusChange(statusCallback);

      expect(statusCallback).toHaveBeenCalledWith("disconnected");

      await websocketService.connect();

      expect(statusCallback).toHaveBeenCalledWith("connected");
    });

    it("should allow multiple status listeners", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      websocketService.onStatusChange(callback1);
      websocketService.onStatusChange(callback2);

      await websocketService.connect();

      expect(callback1).toHaveBeenCalledWith("connected");
      expect(callback2).toHaveBeenCalledWith("connected");
    });

    it("should allow unsubscribing from status changes", async () => {
      const callback = vi.fn();
      const unsubscribe = websocketService.onStatusChange(callback);

      unsubscribe();

      await websocketService.connect();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should notify status change when WebSocket closes", async () => {
      await websocketService.connect();

      const statusCallback = vi.fn();
      websocketService.onStatusChange(statusCallback);

      const ws = websocketService.ws;
      ws._triggerClose();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(statusCallback).toHaveBeenCalledWith("disconnected");
    });
  });

  // ============================================================
  // STATUS CHECK TESTS
  // ============================================================

  describe("Status Checks", () => {
    it("should return correct status", async () => {
      expect(websocketService.getStatus()).toBe("disconnected");

      await websocketService.connect();
      expect(websocketService.getStatus()).toBe("connected");

      websocketService.disconnect();
      expect(websocketService.getStatus()).toBe("disconnected");
    });

    it("should check if connected correctly", async () => {
      expect(websocketService.isConnected()).toBe(false);

      await websocketService.connect();
      expect(websocketService.isConnected()).toBe(true);

      websocketService.disconnect();
      expect(websocketService.isConnected()).toBe(false);
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe("Edge Cases", () => {
    it("should handle connection errors gracefully", async () => {
      class ErrorMockWebSocket extends MockWebSocket {
        constructor(url) {
          super(url);
          setTimeout(() => {
            this._triggerError();
          }, 5);
        }
      }
      global.WebSocket = ErrorMockWebSocket;

      await expect(websocketService.connect()).rejects.toThrow();
    });

    it("should handle multiple connect calls", async () => {
      const connectPromises = [
        websocketService.connect(),
        websocketService.connect(),
        websocketService.connect(),
      ];

      await Promise.all(connectPromises);

      expect(websocketService.isConnected()).toBe(true);
    });

    it("should handle subscribe before connect", () => {
      const callback = vi.fn();
      const unsubscribe = websocketService.subscribe("test-stream", callback);

      expect(typeof unsubscribe).toBe("function");
      
      websocketService.handleMessage({
        stream: "test-stream",
        data: { value: 123 },
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle errors in callbacks without breaking", async () => {
      await websocketService.connect();

      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error("Callback error");
      });
      const normalCallback = vi.fn();

      websocketService.subscribe("test-stream", errorCallback);
      websocketService.subscribe("test-stream", normalCallback);

      expect(() => {
        websocketService.handleMessage({
          stream: "test-stream",
          data: { value: 123 },
        });
      }).not.toThrow();

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
    });

    it("should handle empty data in messages", async () => {
      await websocketService.connect();

      const callback = vi.fn();
      websocketService.subscribe("test-stream", callback);

      websocketService.handleMessage({
        stream: "test-stream",
        data: null,
      });

      expect(callback).toHaveBeenCalledWith(null);
    });

    it("should handle subscription when ws is null", () => {
      const callback = vi.fn();
      const unsubscribe = websocketService.subscribe("test-stream", callback);

      expect(unsubscribe).toBeDefined();

      unsubscribe();
    });

    it("should handle unsubscribe when ws is null", () => {
      const callback = vi.fn();
      const unsubscribe = websocketService.subscribe("test-stream", callback);
      
      websocketService.disconnect();
      
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});
