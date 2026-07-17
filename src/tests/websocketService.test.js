/**
 * websocketService.test.js - Complete Test Coverage for WebSocket Service
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import websocketService from "../services/websocketService";

// ============================================================
// MOCK WEBSOCKET - With configurable behavior
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
    this._closed = false;
    this._errorTriggered = false;
    this._shouldError = false;
    this._shouldCloseImmediately = false;
    this._shouldCloseAfterOpen = false;
    this._closeDelay = 50;
    this._shouldNeverOpen = false;
    this._shouldTimeout = false;
    this._openTimer = null;
    this._closeTimer = null;
    this._errorTimer = null;

    // Schedule the initial behavior
    this._openTimer = setTimeout(() => {
      if (this._shouldError) {
        this._triggerError();
      } else if (this._shouldCloseImmediately) {
        this._triggerClose();
      } else if (this._shouldNeverOpen) {
        // Don't open, don't error - just close after a short delay
        this._closeTimer = setTimeout(() => {
          this._triggerClose();
        }, 5);
      } else if (this._shouldTimeout) {
        // Do nothing - simulate timeout
      } else if (this._shouldOpen && !this._closed) {
        this.readyState = MockWebSocket.OPEN;
        if (this.onopen) this.onopen();
        if (this.listeners.open) this.listeners.open();

        if (this._shouldCloseAfterOpen) {
          this._closeTimer = setTimeout(() => {
            this._triggerClose();
          }, this._closeDelay);
        }
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
    if (this._closed) return;
    this._closed = true;
    this.readyState = MockWebSocket.CLOSED;
    
    // Clear any pending timers
    if (this._openTimer) {
      clearTimeout(this._openTimer);
      this._openTimer = null;
    }
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }
    if (this._errorTimer) {
      clearTimeout(this._errorTimer);
      this._errorTimer = null;
    }
    
    const onclose = this.onclose;
    this.onclose = null;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    if (onclose) onclose();
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

  _receiveMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  _triggerError() {
    if (this._errorTriggered) return;
    this._errorTriggered = true;
    this.readyState = MockWebSocket.CLOSED;
    if (this.onerror) {
      this.onerror(new Error("WebSocket error"));
    }
  }

  _triggerClose() {
    this.close();
  }

  static createFailing() {
    return class FailingMockWebSocket extends MockWebSocket {
      constructor(url) {
        super(url);
        this._shouldOpen = false;
        this._shouldError = true;
        this._openDelay = 5;
      }
    };
  }

  static createTimeout() {
    return class TimeoutMockWebSocket extends MockWebSocket {
      constructor(url) {
        super(url);
        this._shouldOpen = false;
        this._shouldError = false;
        this._shouldTimeout = true;
        this._openDelay = 10000; // Long enough to not fire during tests
      }
    };
  }

  static createFlaky() {
    return class FlakyMockWebSocket extends MockWebSocket {
      constructor(url) {
        super(url);
        this._shouldOpen = true;
        this._shouldCloseAfterOpen = true;
        this._closeDelay = 50;
      }
    };
  }

  static createNeverOpening() {
    return class NeverOpeningMockWebSocket extends MockWebSocket {
      constructor(url) {
        super(url);
        this._shouldOpen = false;
        this._shouldNeverOpen = true;
        this._shouldError = false;
        this._openDelay = 5;
      }
    };
  }

  static createSlowConnecting() {
    return class SlowConnectingMockWebSocket extends MockWebSocket {
      constructor(url) {
        super(url);
        this._shouldOpen = true;
        this._openDelay = 5000;
      }
    };
  }

  static createErrorAfterOpen() {
    return class ErrorAfterOpenMockWebSocket extends MockWebSocket {
      constructor(url) {
        super(url);
        this._shouldOpen = true;
        this._openDelay = 10;
        this._errorTimer = setTimeout(() => {
          this._triggerError();
        }, 20);
      }
    };
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
    
    // Reset the service state
    websocketService.disconnect();
    vi.clearAllMocks();
    vi.useRealTimers();
    
    // Reset all internal state
    websocketService.listeners = new Map();
    websocketService.dataCache = new Map();
    websocketService.reconnectAttempts = 0;
    websocketService.reconnectDelay = 1000;
    websocketService._pendingConnect = null;
    websocketService._pendingConnectId = 0;
    websocketService._connectTimeout = null;
    websocketService._pendingReject = null;
    websocketService._isDisconnecting = false;
    websocketService._currentRejectConnect = null;
    websocketService.shouldReconnect = true;
    websocketService.connectionStatus = "disconnected";
    websocketService.ws = null;
    websocketService.tenantId = null;
    websocketService.reconnectTimeout = null;
    websocketService.heartbeatInterval = null;
    websocketService.lastHeartbeat = null;
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
      global.WebSocket = MockWebSocket.createTimeout();

      await expect(websocketService.connect()).rejects.toThrow(
        "WebSocket connection timeout"
      );
    }, 15000);

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

      await new Promise(resolve => setTimeout(resolve, 20));

      await websocketService.connect("new-tenant");

      expect(firstWs.readyState).toBe(MockWebSocket.CLOSED);
      expect(websocketService.tenantId).toBe("new-tenant");
    });

    it("should reject connect promise on error", async () => {
      global.WebSocket = MockWebSocket.createFailing();

      await expect(websocketService.connect()).rejects.toThrow("WebSocket error");
    });

    it("should handle multiple connect calls without hanging", async () => {
      const connectPromises = [
        websocketService.connect(),
        websocketService.connect(),
        websocketService.connect(),
      ];

      const results = await Promise.all(connectPromises);
      expect(results).toHaveLength(3);
      expect(websocketService.isConnected()).toBe(true);
    });

    it("should allow new connect after reconnect cycle", async () => {
      await websocketService.connect();
      const ws = websocketService.ws;
      ws._triggerClose();

      await new Promise(resolve => setTimeout(resolve, 1200));

      expect(websocketService.isConnected()).toBe(true);

      websocketService.disconnect();
      await websocketService.connect("new-tenant");

      expect(websocketService.tenantId).toBe("new-tenant");
      expect(websocketService.isConnected()).toBe(true);
    }, 3000);
  });

  // ============================================================
  // RECONNECTION TESTS
  // ============================================================

  describe("Reconnection Logic", () => {
    it("should resubscribe streams after reconnection", async () => {
      await websocketService.connect();

      const callback = vi.fn();
      websocketService.subscribe("test-stream", callback);

      const ws = websocketService.ws;
      ws._triggerClose();

      await new Promise(resolve => setTimeout(resolve, 1200));

      const lastSent = websocketService.ws?._lastSent;
      expect(lastSent).toBeTruthy();
      expect(lastSent).toContain("subscribe");
      expect(lastSent).toContain("test-stream");
    }, 3000);

    it("should attempt reconnection on disconnect", async () => {
      await websocketService.connect();
      const ws = websocketService.ws;
      ws._triggerClose();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(websocketService.getStatus()).toBe("reconnecting");
      expect(websocketService.reconnectAttempts).toBe(1);
    });

    it("should cap reconnection attempts at maxReconnectAttempts", async () => {
      const originalMax = websocketService.maxReconnectAttempts;
      websocketService.maxReconnectAttempts = 3;
      websocketService.reconnectDelay = 100;

      global.WebSocket = MockWebSocket.createNeverOpening();

      await websocketService.connect().catch(() => {});

      await new Promise(resolve => setTimeout(resolve, 1500));

      expect(websocketService.reconnectAttempts).toBe(3);
      expect(websocketService.getStatus()).toBe("disconnected");

      websocketService.maxReconnectAttempts = originalMax;
      websocketService.reconnectDelay = 1000;
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

    it("should cancel scheduled reconnect on manual connect", async () => {
      await websocketService.connect();
      const ws = websocketService.ws;
      ws._triggerClose();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(websocketService.getStatus()).toBe("reconnecting");
      expect(websocketService.reconnectTimeout).not.toBeNull();

      const newWs = websocketService.connect("new-tenant");

      expect(websocketService.reconnectTimeout).toBeNull();
      await newWs;
      expect(websocketService.isConnected()).toBe(true);
      expect(websocketService.tenantId).toBe("new-tenant");
    }, 3000);
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
      const sendSpy = vi.spyOn(ws, "send");

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
      const sendSpy = vi.spyOn(ws, "send");

      const callback = vi.fn();
      const unsubscribe = websocketService.subscribe("metrics", callback);

      sendSpy.mockClear();

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

    it("should cache falsy values (0, false, empty string)", async () => {
      await websocketService.connect();

      const testValues = [0, false, ""];

      for (const value of testValues) {
        const stream = `test-stream-${String(value)}`;
        websocketService.handleMessage({
          stream: stream,
          data: value,
        });

        const cached = websocketService.getCachedData(stream);
        expect(cached).toBeTruthy();
        expect(cached.value).toBe(value);
        expect(cached._cached).toBe(true);
      }
    });

    it("should not cache null values", async () => {
      await websocketService.connect();

      websocketService.handleMessage({
        stream: "test-stream-null",
        data: null,
      });

      const cached = websocketService.getCachedData("test-stream-null");
      expect(cached).toBeNull();
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
  // HEARTBEAT TESTS
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
      global.WebSocket = MockWebSocket.createFailing();

      await expect(websocketService.connect()).rejects.toThrow("WebSocket error");
    });

    it("should handle subscribe before connect", async () => {
      const callback = vi.fn();

      websocketService.subscribe("test-stream", callback);
      expect(callback).not.toHaveBeenCalled();

      await websocketService.connect();

      websocketService.handleMessage({
        stream: "test-stream",
        data: { value: 123 },
      });

      expect(callback).toHaveBeenCalledWith({ value: 123 });
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

    // ============================================================
    // ORPHANED PROMISE FIX TESTS - Fixed
    // ============================================================

    it("should reject pending connect promise when disconnect is called", async () => {
      // Use a slow-connecting WebSocket
      global.WebSocket = MockWebSocket.createSlowConnecting();

      // Start connection but don't await it
      const connectPromise = websocketService.connect("test-tenant");

      // Wait for the connection attempt to start
      await new Promise(resolve => setTimeout(resolve, 50));

      // Disconnect while connect is still pending
      websocketService.disconnect();

      // The promise should reject with the disconnect error
      await expect(connectPromise).rejects.toThrow(
        "WebSocket disconnected by client"
      );

      // Connection status should be disconnected
      expect(websocketService.getStatus()).toBe("disconnected");
      expect(websocketService.isConnected()).toBe(false);

      // Clean up
      global.WebSocket = MockWebSocket;
      websocketService.disconnect();
    }, 10000);

    it("should handle race between disconnect and connection timeout", async () => {
      // Use timeout mock that never settles on its own
      global.WebSocket = MockWebSocket.createTimeout();

      const connectPromise = websocketService.connect("test-tenant");

      // Wait a bit, then disconnect
      await new Promise(resolve => setTimeout(resolve, 50));
      websocketService.disconnect();

      // Should reject with disconnect error, not timeout
      await expect(connectPromise).rejects.toThrow(
        "WebSocket disconnected by client"
      );

      global.WebSocket = MockWebSocket;
      websocketService.disconnect();
    }, 10000);

    it("should handle multiple disconnect calls gracefully", async () => {
      await websocketService.connect();

      websocketService.disconnect();
      websocketService.disconnect();
      websocketService.disconnect();

      expect(websocketService.getStatus()).toBe("disconnected");
      expect(websocketService.isConnected()).toBe(false);
    });

    it("should allow new connect after disconnect rejects pending connect", async () => {
      global.WebSocket = MockWebSocket.createFailing();

      // First connect will fail
      await expect(websocketService.connect()).rejects.toThrow("WebSocket error");

      // Should be able to connect again after cleanup
      global.WebSocket = MockWebSocket;
      await websocketService.connect("new-tenant");

      expect(websocketService.isConnected()).toBe(true);
      expect(websocketService.tenantId).toBe("new-tenant");

      websocketService.disconnect();
    }, 10000);

    it("should prevent onopen from resolving during disconnect", async () => {
      // Create a slow-connecting WebSocket that will eventually open
      global.WebSocket = MockWebSocket.createSlowConnecting();

      const connectPromise = websocketService.connect("test-tenant");

      // Wait a moment for the connection attempt to start
      await new Promise(resolve => setTimeout(resolve, 50));

      // Call disconnect while connection is pending
      websocketService.disconnect();

      // The promise should reject, not resolve when the socket eventually opens
      await expect(connectPromise).rejects.toThrow(
        "WebSocket disconnected by client"
      );

      expect(websocketService.getStatus()).toBe("disconnected");
      expect(websocketService.isConnected()).toBe(false);

      global.WebSocket = MockWebSocket;
      websocketService.disconnect();
    }, 10000);

    it("should clean up _pendingReject after disconnect", async () => {
      global.WebSocket = MockWebSocket.createSlowConnecting();

      const connectPromise = websocketService.connect("test-tenant");

      await new Promise(resolve => setTimeout(resolve, 50));

      // Store reference to _pendingReject
      expect(websocketService._pendingReject).not.toBeNull();

      websocketService.disconnect();

      await expect(connectPromise).rejects.toThrow(
        "WebSocket disconnected by client"
      );

      // Both should be cleared
      expect(websocketService._pendingReject).toBeNull();
      expect(websocketService._pendingConnect).toBeNull();
      expect(websocketService._currentRejectConnect).toBeNull();

      global.WebSocket = MockWebSocket;
      websocketService.disconnect();
    }, 10000);

    it("should handle disconnect when no connection is pending", () => {
      // Should not throw
      expect(() => {
        websocketService.disconnect();
      }).not.toThrow();

      expect(websocketService.getStatus()).toBe("disconnected");
      expect(websocketService._pendingReject).toBeNull();
      expect(websocketService._pendingConnect).toBeNull();
    });

    it("should handle disconnect after connection is established", async () => {
      await websocketService.connect();

      // The promise is already resolved, so disconnect should work normally
      websocketService.disconnect();

      expect(websocketService.getStatus()).toBe("disconnected");
      expect(websocketService.isConnected()).toBe(false);
      expect(websocketService._pendingReject).toBeNull();
      expect(websocketService._pendingConnect).toBeNull();
    });

    it("should use rejectConnect wrapper for consistent state", async () => {
      global.WebSocket = MockWebSocket.createSlowConnecting();

      const connectPromise = websocketService.connect("test-tenant");

      await new Promise(resolve => setTimeout(resolve, 50));

      // Store reference to _currentRejectConnect
      expect(websocketService._currentRejectConnect).not.toBeNull();

      websocketService.disconnect();

      await expect(connectPromise).rejects.toThrow(
        "WebSocket disconnected by client"
      );

      // Both should be cleared
      expect(websocketService._currentRejectConnect).toBeNull();
      expect(websocketService._pendingReject).toBeNull();

      global.WebSocket = MockWebSocket;
      websocketService.disconnect();
    }, 10000);
  });
});
