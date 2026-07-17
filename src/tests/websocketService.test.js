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

    // Defer scheduling to a microtask so subclass constructors (which run
    // synchronously right after super() returns, but BEFORE this microtask)
    // have already applied their overrides (e.g. _openDelay = 5000) by the
    // time we actually read this._openDelay and call setTimeout.
    queueMicrotask(() => this._scheduleOpen());
  }

  _scheduleOpen() {
    if (this._closed) return;

    this._openTimer = setTimeout(() => {
      if (this._shouldError) {
        this._triggerError();
      } else if (this._shouldCloseImmediately) {
        this._triggerClose();
      } else if (this._shouldNeverOpen) {
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
        this._openDelay = 10000;
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

  static createInstantOpen() {
    return class InstantOpenMockWebSocket extends MockWebSocket {
      constructor(url) {
        super(url);
        this._shouldOpen = true;
        this._openDelay = 0;
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

    websocketService.disconnect();
    vi.clearAllMocks();
    vi.useRealTimers();

    websocketService.listeners = new Map();
    websocketService.statusListeners = new Set();
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
    websocketService._connectionEpoch = 0;
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
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();
      expect(websocketService.getStatus()).toBe("connected");
      expect(websocketService.isConnected()).toBe(true);
    });

    it("should connect with tenant ID", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();
      expect(websocketService.isConnected()).toBe(true);

      websocketService.disconnect();
      expect(websocketService.isConnected()).toBe(false);
      expect(websocketService.getStatus()).toBe("disconnected");
      expect(websocketService.shouldReconnect).toBe(false);
    });

    it("should close existing connection before reconnecting", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      vi.useFakeTimers();

      global.WebSocket = MockWebSocket.createFlaky();

      // Start the connection — it opens, then closes ~50ms later,
      // scheduling one reconnect attempt.
      const connectPromise = websocketService.connect();

      // Advance past the initial open + close cycle
      await vi.advanceTimersByTimeAsync(100);
      await connectPromise.catch(() => {});

      // By now the flaky socket has opened and closed again, and a
      // reconnect has been scheduled (default reconnectDelay: 1000ms).
      expect(websocketService.getStatus()).toBe("reconnecting");
      expect(websocketService.reconnectTimeout).not.toBeNull();

      // Swap to a stable mock BEFORE the scheduled reconnect fires, so the
      // automatic reconnect succeeds and actually stays open. (If we left
      // the flaky mock in place, the reconnect would open-then-close again,
      // and we'd land back in "reconnecting" depending on exact timing.)
      global.WebSocket = MockWebSocket.createInstantOpen();

      // Advance past the scheduled reconnect delay.
      await vi.advanceTimersByTimeAsync(1200);

      expect(websocketService.isConnected()).toBe(true);

      // Disconnect and reconnect with new tenant
      websocketService.disconnect();
      global.WebSocket = MockWebSocket.createInstantOpen();

      const newConnectPromise = websocketService.connect("new-tenant");
      await vi.advanceTimersByTimeAsync(10);
      await newConnectPromise;

      expect(websocketService.tenantId).toBe("new-tenant");
      expect(websocketService.isConnected()).toBe(true);

      vi.useRealTimers();
    }, 10000);
  });

  // ============================================================
  // RECONNECTION TESTS
  // ============================================================

  describe("Reconnection Logic", () => {
    it("should resubscribe streams after reconnection", async () => {
      global.WebSocket = MockWebSocket.createFlaky();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();
      websocketService.shouldReconnect = false;

      const ws = websocketService.ws;
      ws._triggerClose();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(websocketService.getStatus()).toBe("disconnected");
      expect(websocketService.reconnectTimeout).toBeNull();
    });

    it("should cancel scheduled reconnect on manual connect", async () => {
      global.WebSocket = MockWebSocket.createFlaky();
      await websocketService.connect();
      const ws = websocketService.ws;
      ws._triggerClose();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(websocketService.getStatus()).toBe("reconnecting");
      expect(websocketService.reconnectTimeout).not.toBeNull();

      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      const callback = vi.fn();
      websocketService.subscribe("test-stream", callback);

      const ws = websocketService.ws;
      ws.onmessage({ data: "not valid json{" });

      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle messages with missing stream", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();
      expect(websocketService.heartbeatInterval).not.toBeNull();
    });

    it("should stop heartbeat on disconnect", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
      const statusCallback = vi.fn();

      websocketService.onStatusChange(statusCallback);

      expect(statusCallback).toHaveBeenCalledWith("disconnected");

      await websocketService.connect();

      expect(statusCallback).toHaveBeenCalledWith("connected");
    });

    it("should allow multiple status listeners", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      websocketService.onStatusChange(callback1);
      websocketService.onStatusChange(callback2);

      await websocketService.connect();

      expect(callback1).toHaveBeenCalledWith("connected");
      expect(callback2).toHaveBeenCalledWith("connected");
    });

    it("should allow unsubscribing from status changes", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      const callback = vi.fn();
      const unsubscribe = websocketService.onStatusChange(callback);

      unsubscribe();

      await websocketService.connect();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should notify status change when WebSocket closes", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
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

      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();
      expect(websocketService.getStatus()).toBe("connected");

      websocketService.disconnect();
      expect(websocketService.getStatus()).toBe("disconnected");
    });

    it("should check if connected correctly", async () => {
      expect(websocketService.isConnected()).toBe(false);

      global.WebSocket = MockWebSocket.createInstantOpen();
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

      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      websocketService.handleMessage({
        stream: "test-stream",
        data: { value: 123 },
      });

      expect(callback).toHaveBeenCalledWith({ value: 123 });
    });

    it("should handle errors in callbacks without breaking", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
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
      global.WebSocket = MockWebSocket.createInstantOpen();
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
    // ORPHANED PROMISE FIX TESTS
    // ============================================================

    it("should reject pending connect promise when disconnect is called", async () => {
      global.WebSocket = MockWebSocket.createSlowConnecting();

      const connectPromise = websocketService.connect("test-tenant");

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(websocketService._pendingReject).not.toBeNull();
      expect(websocketService._currentRejectConnect).not.toBeNull();

      websocketService.disconnect();

      await expect(connectPromise).rejects.toThrow(
        "WebSocket disconnected by client"
      );

      expect(websocketService.getStatus()).toBe("disconnected");
      expect(websocketService.isConnected()).toBe(false);
      expect(websocketService._pendingReject).toBeNull();
      expect(websocketService._currentRejectConnect).toBeNull();

      global.WebSocket = MockWebSocket;
      websocketService.disconnect();
    }, 15000);

    it("should handle race between disconnect and connection timeout", async () => {
      global.WebSocket = MockWebSocket.createTimeout();

      const connectPromise = websocketService.connect("test-tenant");

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(websocketService._pendingReject).not.toBeNull();

      websocketService.disconnect();

      await expect(connectPromise).rejects.toThrow(
        "WebSocket disconnected by client"
      );

      global.WebSocket = MockWebSocket;
      websocketService.disconnect();
    }, 15000);

    it("should handle multiple disconnect calls gracefully", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      websocketService.disconnect();
      websocketService.disconnect();
      websocketService.disconnect();

      expect(websocketService.getStatus()).toBe("disconnected");
      expect(websocketService.isConnected()).toBe(false);
    });

    it("should allow new connect after disconnect rejects pending connect", async () => {
      global.WebSocket = MockWebSocket.createFailing();

      await expect(websocketService.connect()).rejects.toThrow("WebSocket error");

      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect("new-tenant");

      expect(websocketService.isConnected()).toBe(true);
      expect(websocketService.tenantId).toBe("new-tenant");

      websocketService.disconnect();
    }, 15000);

    it("should prevent onopen from resolving during disconnect", async () => {
      global.WebSocket = MockWebSocket.createSlowConnecting();

      const connectPromise = websocketService.connect("test-tenant");

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(websocketService._pendingReject).not.toBeNull();

      websocketService.disconnect();

      await expect(connectPromise).rejects.toThrow(
        "WebSocket disconnected by client"
      );

      expect(websocketService.getStatus()).toBe("disconnected");
      expect(websocketService.isConnected()).toBe(false);

      global.WebSocket = MockWebSocket;
      websocketService.disconnect();
    }, 15000);

    it("should clean up _pendingReject after disconnect", async () => {
      global.WebSocket = MockWebSocket.createSlowConnecting();

      const connectPromise = websocketService.connect("test-tenant");

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(websocketService._pendingReject).not.toBeNull();
      expect(websocketService._currentRejectConnect).not.toBeNull();

      websocketService.disconnect();

      await expect(connectPromise).rejects.toThrow(
        "WebSocket disconnected by client"
      );

      expect(websocketService._pendingReject).toBeNull();
      expect(websocketService._pendingConnect).toBeNull();
      expect(websocketService._currentRejectConnect).toBeNull();

      global.WebSocket = MockWebSocket;
      websocketService.disconnect();
    }, 15000);

    it("should handle disconnect when no connection is pending", () => {
      expect(() => {
        websocketService.disconnect();
      }).not.toThrow();

      expect(websocketService.getStatus()).toBe("disconnected");
      expect(websocketService._pendingReject).toBeNull();
      expect(websocketService._pendingConnect).toBeNull();
    });

    it("should handle disconnect after connection is established", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      websocketService.disconnect();

      expect(websocketService.getStatus()).toBe("disconnected");
      expect(websocketService.isConnected()).toBe(false);
      expect(websocketService._pendingReject).toBeNull();
      expect(websocketService._pendingConnect).toBeNull();
    });

    it("should use rejectConnect wrapper for consistent state", async () => {
      global.WebSocket = MockWebSocket.createSlowConnecting();

      const connectPromise = websocketService.connect("test-tenant");

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(websocketService._currentRejectConnect).not.toBeNull();
      expect(websocketService._pendingReject).not.toBeNull();

      websocketService.disconnect();

      await expect(connectPromise).rejects.toThrow(
        "WebSocket disconnected by client"
      );

      expect(websocketService._currentRejectConnect).toBeNull();
      expect(websocketService._pendingReject).toBeNull();

      global.WebSocket = MockWebSocket;
      websocketService.disconnect();
    }, 15000);

    // ============================================================
    // ADDITIONAL BRANCH COVERAGE TESTS
    // ============================================================

    // 1. isConnected() - ws is null
    it("should return false when ws is null", () => {
      websocketService.ws = null;
      websocketService.connectionStatus = "connected";
      expect(websocketService.isConnected()).toBe(false);
    });

    // 2. handleMessage() - data.data is undefined
    it("should not cache data when data.data is undefined", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      websocketService.handleMessage({
        stream: "test-stream",
        data: undefined,
      });

      const cached = websocketService.getCachedData("test-stream");
      expect(cached).toBeNull();
    });

    // 3. onStatusChange() - initial callback
    it("should call status listener immediately with current status", () => {
      websocketService.connectionStatus = "connected";
      const callback = vi.fn();
      websocketService.onStatusChange(callback);
      expect(callback).toHaveBeenCalledWith("connected");
    });

    // 4. subscribeAllStreams() - ws is null
    it("should handle subscribeAllStreams when ws is null", () => {
      websocketService.ws = null;
      expect(() => {
        websocketService.subscribeAllStreams();
      }).not.toThrow();
    });

    // 5. subscribe() - ws is null
    it("should not send subscription message when ws is null", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      // Force ws to null
      websocketService.ws = null;

      const callback = vi.fn();
      expect(() => {
        websocketService.subscribe("test-stream", callback);
      }).not.toThrow();
    });

    // 6. unsubscribe() - ws is null
    it("should not send unsubscribe message when ws is null", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      const callback = vi.fn();
      const unsubscribe = websocketService.subscribe("test-stream", callback);

      // Force ws to null
      websocketService.ws = null;

      expect(() => {
        unsubscribe();
      }).not.toThrow();
    });

    // 7. disconnect() - ws.close() throws error
    it("should handle ws.close() error gracefully", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      const ws = websocketService.ws;
      // Mock close to throw
      ws.close = vi.fn(() => {
        throw new Error("Close error");
      });

      expect(() => {
        websocketService.disconnect();
      }).not.toThrow();

      expect(websocketService.isConnected()).toBe(false);
    });

    // 8. startHeartbeat() - ws.send() throws error
    it("should handle heartbeat send error gracefully", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      const ws = websocketService.ws;
      // Mock send to throw
      ws.send = vi.fn(() => {
        throw new Error("Send error");
      });

      expect(() => {
        websocketService.startHeartbeat();
      }).not.toThrow();

      expect(websocketService.heartbeatInterval).not.toBeNull();
    });

    // 9. connect() - oldWs.close() throws error
    it("should handle oldWs.close() error gracefully when reconnecting", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      const oldWs = websocketService.ws;
      // Mock close to throw
      oldWs.close = vi.fn(() => {
        throw new Error("Close error");
      });

      await expect(websocketService.connect("new-tenant")).resolves.toBeUndefined();

      expect(websocketService.tenantId).toBe("new-tenant");
      expect(websocketService.isConnected()).toBe(true);
    });

    // 10. getCachedData() - non-object cached data
    it("should return cached primitive values correctly", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      const primitiveValues = [42, "hello", true];
      
      for (const value of primitiveValues) {
        const stream = `test-stream-${String(value)}`;
        websocketService.handleMessage({
          stream: stream,
          data: value,
        });

        const cached = websocketService.getCachedData(stream);
        expect(cached).toBeTruthy();
        expect(cached.value).toBe(value);
        expect(cached._cached).toBe(true);
        expect(cached._cachedAt).toBeTruthy();
      }
    });

    // 11. getCachedData() - null cached data
    it("should return null when cached data is null", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      websocketService.handleMessage({
        stream: "test-stream",
        data: null,
      });

      const cached = websocketService.getCachedData("test-stream");
      expect(cached).toBeNull();
    });

    // 12. handleMessage() - callback throws error
    it("should handle callback errors gracefully", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      const errorCallback = vi.fn(() => {
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

    // 13. handleMessage() - null stream
    it("should ignore messages with null stream", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      const callback = vi.fn();
      websocketService.subscribe("test-stream", callback);

      websocketService.handleMessage({
        stream: null,
        data: { value: 123 },
      });

      expect(callback).not.toHaveBeenCalled();
    });

    // 14. handleMessage() - undefined stream
    it("should ignore messages with undefined stream", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      const callback = vi.fn();
      websocketService.subscribe("test-stream", callback);

      websocketService.handleMessage({
        stream: undefined,
        data: { value: 123 },
      });

      expect(callback).not.toHaveBeenCalled();
    });

    // 15. connect() - with existing ws and ws.readyState is OPEN
    it("should close existing connection when reconnecting", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      const closeSpy = vi.spyOn(websocketService.ws, "close");

      await websocketService.connect("new-tenant");

      expect(closeSpy).toHaveBeenCalled();
      expect(websocketService.tenantId).toBe("new-tenant");
    });

    // 16. subscribeAllStreams() - with no listeners
    it("should handle subscribeAllStreams with no listeners gracefully", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      websocketService.listeners.clear();

      expect(() => {
        websocketService.subscribeAllStreams();
      }).not.toThrow();
    });

    // 17. handleMessage() - with data.data being an empty string
    it("should cache empty string data values", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      websocketService.handleMessage({
        stream: "test-stream",
        data: "",
      });

      const cached = websocketService.getCachedData("test-stream");
      expect(cached).toBeTruthy();
      expect(cached.value).toBe("");
      expect(cached._cached).toBe(true);
    });

    // 18. handleMessage() - with data.data being false
    it("should cache false data values", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      websocketService.handleMessage({
        stream: "test-stream",
        data: false,
      });

      const cached = websocketService.getCachedData("test-stream");
      expect(cached).toBeTruthy();
      expect(cached.value).toBe(false);
      expect(cached._cached).toBe(true);
    });

    // 19. getCachedData() - cached data with object that has _cached property
    it("should handle cached data that already has _cached property", async () => {
      global.WebSocket = MockWebSocket.createInstantOpen();
      await websocketService.connect();

      websocketService.handleMessage({
        stream: "test-stream",
        data: { value: 123, _cached: "original" },
      });

      const cached = websocketService.getCachedData("test-stream");
      expect(cached).toBeTruthy();
      expect(cached.value).toBe(123);
      expect(cached._cached).toBe(true);
      // The original _cached property should be overwritten
      expect(cached._cached).toBe(true);
    });
  });
});
