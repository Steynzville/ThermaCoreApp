/**
 * Tests for WebSocket Service
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import websocketService from "../services/websocketService";

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.listeners = {};

    // Simulate connection after a delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 10);
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  send(_data) {
    // Mock send implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }

  addEventListener(event, handler) {
    this.listeners[event] = handler;
  }

  removeEventListener(event, _handler) {
    delete this.listeners[event];
  }
}

describe("WebSocket Service", () => {
  beforeEach(() => {
    // Mock WebSocket globally
    global.WebSocket = MockWebSocket;
  });

  afterEach(() => {
    // Clean up
    websocketService.disconnect();
  });

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
  });

  it("should handle subscription", async () => {
    await websocketService.connect();

    const callback = vi.fn();
    const unsubscribe = websocketService.subscribe("test-stream", callback);

    expect(typeof unsubscribe).toBe("function");

    // Simulate message
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

    // Simulate message after unsubscribe
    websocketService.handleMessage({
      stream: "test-stream",
      data: { value: 456 },
    });

    expect(callback).not.toHaveBeenCalled();
  });

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
  });

  it("should notify status change listeners", async () => {
    const statusCallback = vi.fn();

    websocketService.onStatusChange(statusCallback);

    // Should be called immediately with current status
    expect(statusCallback).toHaveBeenCalledWith("disconnected");

    await websocketService.connect();

    // Should be called with connected status
    expect(statusCallback).toHaveBeenCalledWith("connected");
  });

  it("should disconnect properly", async () => {
    await websocketService.connect();

    expect(websocketService.isConnected()).toBe(true);

    websocketService.disconnect();

    expect(websocketService.isConnected()).toBe(false);
    expect(websocketService.getStatus()).toBe("disconnected");
  });

  it("should handle reconnection logic", async () => {
    await websocketService.connect();

    // Simulate disconnect
    if (websocketService.ws?.onclose) {
      websocketService.ws.onclose();
    }

    // After disconnect, status should be 'disconnected' or 'reconnecting'
    const status = websocketService.getStatus();
    expect(["disconnected", "reconnecting"]).toContain(status);
  });
});
