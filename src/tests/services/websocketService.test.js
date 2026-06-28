/**
 * Comprehensive Branch Coverage Tests for WebSocket Service
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import websocketService from "../../services/websocketService";

// Custom Mock WebSocket to allow fine-grained behavior simulation
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.send = vi.fn();
    this.close = vi.fn(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) this.onclose();
    });

    // We do NOT auto-open in this mock, so we can manually control it
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
}

describe("WebSocket Service - Branch Coverage", () => {
  let originalWebSocket;

  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket;
    vi.useFakeTimers();
    // Reset singleton state
    websocketService.disconnect();
    websocketService.listeners.clear();
    websocketService.statusListeners.clear();
    websocketService.dataCache.clear();
    websocketService.reconnectAttempts = 0;
    websocketService.shouldReconnect = true;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    vi.useRealTimers();
  });

  describe("Connection Timeout", () => {
    it("should reject connection on timeout", async () => {
      const connectPromise = websocketService.connect();

      // Fast forward past the 10000ms timeout
      vi.advanceTimersByTime(10000);

      await expect(connectPromise).rejects.toThrow("WebSocket connection timeout");
    });
  });

  describe("Automatic Reconnection & Reconnection Delay", () => {
    it("should clear existing reconnect timeout before scheduling a new one", () => {
      websocketService.reconnectTimeout = setTimeout(() => {}, 1000);
      const spyClear = vi.spyOn(global, "clearTimeout");

      websocketService.scheduleReconnect();

      expect(spyClear).toHaveBeenCalled();
    });

    it("should stop reconnecting after reaching maxReconnectAttempts", async () => {
      const connectPromise = websocketService.connect();
      // Set reconnectAttempts to maxReconnectAttempts after connect() sets shouldReconnect to true
      websocketService.reconnectAttempts = websocketService.maxReconnectAttempts;
      
      const spySchedule = vi.spyOn(websocketService, "scheduleReconnect");

      // Trigger close directly without having triggered onopen (so reconnectAttempts is not reset to 0)
      websocketService.ws.onclose();

      expect(spySchedule).not.toHaveBeenCalled();
    });

    it("should not reconnect if shouldReconnect is false", async () => {
      const connectPromise = websocketService.connect();
      // Explicitly set shouldReconnect to false after connect() overrides it to true
      websocketService.shouldReconnect = false;
      
      const spySchedule = vi.spyOn(websocketService, "scheduleReconnect");

      websocketService.ws.onclose();

      expect(spySchedule).not.toHaveBeenCalled();
    });
  });

  describe("Heartbeat & Ping-Pong", () => {
    it("should send ping over heartbeat and update lastHeartbeat", async () => {
      const connectPromise = websocketService.connect();
      websocketService.ws.readyState = MockWebSocket.OPEN;
      websocketService.ws.onopen();
      await connectPromise;

      // Advance by 30 seconds for heartbeat
      vi.advanceTimersByTime(30000);

      expect(websocketService.ws.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "ping" })
      );
      expect(websocketService.lastHeartbeat).toBeGreaterThan(0);
    });

    it("should handle pong messages correctly", () => {
      const beforeTime = Date.now();
      websocketService.handleMessage({ type: "pong" });
      expect(websocketService.lastHeartbeat).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe("Incoming Messages & JSON Errors", () => {
    it("should catch errors when parsing invalid message JSON", async () => {
      const connectPromise = websocketService.connect();
      websocketService.ws.readyState = MockWebSocket.OPEN;
      websocketService.ws.onopen();
      await connectPromise;

      const spyHandle = vi.spyOn(websocketService, "handleMessage");
      
      // Simulate invalid JSON message
      websocketService.ws.onmessage({ data: "{invalid json" });

      expect(spyHandle).not.toHaveBeenCalled();
    });
  });

  describe("WebSocket Event Boundaries", () => {
    it("should transition status to error on ws error", async () => {
      const connectPromise = websocketService.connect();
      websocketService.ws.readyState = MockWebSocket.OPEN;
      websocketService.ws.onopen();
      await connectPromise;

      websocketService.ws.onerror(new Error("some error"));

      expect(websocketService.getStatus()).toBe("error");
    });
  });

  describe("Subscription & Unsubscription edge cases", () => {
    it("should send subscribe message to server if ws is OPEN", async () => {
      const connectPromise = websocketService.connect();
      websocketService.ws.readyState = MockWebSocket.OPEN;
      websocketService.ws.onopen();
      await connectPromise;

      const callback = vi.fn();
      websocketService.subscribe("metrics", callback);

      expect(websocketService.ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: "subscribe",
          stream: "metrics",
          tenant_id: null,
        })
      );
    });

    it("should unsubscribe from stream and send unsubscribe message to server if OPEN", async () => {
      const connectPromise = websocketService.connect();
      websocketService.ws.readyState = MockWebSocket.OPEN;
      websocketService.ws.onopen();
      await connectPromise;

      const callback = vi.fn();
      const unsub = websocketService.subscribe("metrics", callback);

      unsub();

      expect(websocketService.ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: "unsubscribe",
          stream: "metrics",
        })
      );
    });

    it("should safely unsubscribe when stream or callback is not found", () => {
      expect(() => websocketService.unsubscribe("unknown-stream", () => {})).not.toThrow();
    });

    it("should return null for getCachedData if stream not cached", () => {
      expect(websocketService.getCachedData("unknown-stream")).toBeNull();
    });
  });

  describe("Status Listeners", () => {
    it("should support unsubscribing from status updates", () => {
      const callback = vi.fn();
      const unsub = websocketService.onStatusChange(callback);

      unsub();
      websocketService.notifyStatusChange("connected");

      // Only the initial check should be called, not the update after unsub
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should swallow errors thrown by status listeners on status change notification", () => {
      websocketService.statusListeners.add(() => {
        throw new Error("crashing callback");
      });

      expect(() => websocketService.notifyStatusChange("connected")).not.toThrow();
    });
  });
});
