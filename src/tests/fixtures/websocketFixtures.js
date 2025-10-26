/**
 * WebSocket Test Fixtures
 *
 * Provides mock WebSocket utilities for testing:
 * - WebSocket connection mocks
 * - Real-time data streaming
 * - Connection lifecycle events
 * - Error scenarios
 */

/**
 * Create mock WebSocket instance
 */
export function createMockWebSocket(url, protocols) {
  const listeners = {
    open: [],
    close: [],
    error: [],
    message: [],
  };

  const ws = {
    url,
    protocols,
    readyState: 0, // CONNECTING
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,

    // Event handlers
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,

    // Add event listener
    addEventListener(type, callback) {
      if (listeners[type]) {
        listeners[type].push(callback);
      }
    },

    // Remove event listener
    removeEventListener(type, callback) {
      if (listeners[type]) {
        const index = listeners[type].indexOf(callback);
        if (index > -1) {
          listeners[type].splice(index, 1);
        }
      }
    },

    // Send message
    send(data) {
      if (ws.readyState !== ws.OPEN) {
        throw new Error("WebSocket is not open");
      }
      // Mock send - do nothing or store for verification
      ws.sentMessages = ws.sentMessages || [];
      ws.sentMessages.push(data);
    },

    // Close connection
    close(code = 1000, reason = "") {
      ws.readyState = ws.CLOSING;
      setTimeout(() => {
        ws.readyState = ws.CLOSED;
        const closeEvent = new CloseEvent("close", { code, reason });
        ws._trigger("close", closeEvent);
      }, 0);
    },

    // Helper to trigger events
    _trigger(type, event) {
      // Call handler if set
      const handler = ws[`on${type}`];
      if (handler) {
        handler(event);
      }

      // Call all listeners
      if (listeners[type]) {
        for (const callback of listeners[type]) {
          callback(event);
        }
      }
    },

    // Helper to simulate connection
    _connect() {
      ws.readyState = ws.OPEN;
      const openEvent = new Event("open");
      ws._trigger("open", openEvent);
    },

    // Helper to simulate message
    _receiveMessage(data) {
      const messageEvent = new MessageEvent("message", {
        data: typeof data === "string" ? data : JSON.stringify(data),
      });
      ws._trigger("message", messageEvent);
    },

    // Helper to simulate error
    _triggerError(error) {
      const errorEvent = new Event("error");
      errorEvent.error = error;
      ws._trigger("error", errorEvent);
    },
  };

  // Auto-connect after a short delay
  setTimeout(() => ws._connect(), 10);

  return ws;
}

/**
 * Create mock WebSocket server for testing
 */
export function createMockWebSocketServer(options = {}) {
  const { autoConnect = true, messageDelay = 10 } = options;

  let _currentSocket = null;
  const server = {
    clients: new Set(),

    // Simulate client connection
    connect(socket) {
      _currentSocket = socket;
      this.clients.add(socket);

      if (autoConnect) {
        socket._connect();
      }
    },

    // Broadcast message to all clients
    broadcast(data) {
      for (const socket of this.clients) {
        if (socket.readyState === socket.OPEN) {
          setTimeout(() => {
            socket._receiveMessage(data);
          }, messageDelay);
        }
      }
    },

    // Send message to specific client
    send(socket, data) {
      if (socket.readyState === socket.OPEN) {
        setTimeout(() => {
          socket._receiveMessage(data);
        }, messageDelay);
      }
    },

    // Disconnect a client
    disconnect(socket, code, reason) {
      socket.close(code, reason);
      this.clients.delete(socket);
    },

    // Close server and disconnect all clients
    close() {
      for (const socket of this.clients) {
        socket.close();
      }
      this.clients.clear();
    },
  };

  return server;
}

/**
 * Create streaming data simulator for WebSocket
 */
export function createStreamingDataSimulator(options = {}) {
  const {
    interval = 16, // ~60fps
    generator = () => ({ value: Math.random() * 100 }),
  } = options;

  let intervalId = null;
  const callbacks = [];

  return {
    start() {
      if (intervalId) return;

      intervalId = setInterval(() => {
        const data = generator();
        for (const cb of callbacks) {
          cb(data);
        }
      }, interval);
    },

    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },

    subscribe(callback) {
      callbacks.push(callback);
      return () => {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      };
    },
  };
}

/**
 * Generate mock real-time SCADA data
 */
export function generateRealtimeScadaData() {
  return {
    timestamp: Date.now(),
    deviceId: `device-${Math.floor(Math.random() * 10) + 1}`,
    metrics: {
      temperature: 45 + Math.random() * 30,
      pressure: 100 + Math.random() * 50,
      flowRate: 200 + Math.random() * 100,
      level: 50 + Math.random() * 40,
      status: Math.random() > 0.9 ? "warning" : "normal",
    },
  };
}

/**
 * Generate mock protocol data message
 */
export function generateProtocolDataMessage(protocol = "modbus") {
  const baseMessage = {
    type: "data",
    protocol: protocol.toUpperCase(),
    timestamp: Date.now(),
  };

  if (protocol === "modbus") {
    return {
      ...baseMessage,
      registers: Array.from({ length: 10 }, () =>
        Math.floor(Math.random() * 65535),
      ),
      coils: Array.from({ length: 8 }, () => Math.random() > 0.5),
    };
  } else if (protocol === "opcua") {
    return {
      ...baseMessage,
      nodes: Array.from({ length: 5 }, (_, i) => ({
        nodeId: `ns=2;i=${i}`,
        value: Math.random() * 100,
        quality: "Good",
        timestamp: Date.now(),
      })),
    };
  } else if (protocol === "dnp3") {
    return {
      ...baseMessage,
      binaryPoints: Array.from({ length: 8 }, () => Math.random() > 0.5),
      analogPoints: Array.from({ length: 8 }, () => Math.random() * 100),
    };
  }

  return baseMessage;
}

/**
 * Fixture: WebSocket connection states
 */
export const websocketStateFixtures = {
  connecting: { readyState: 0, status: "connecting" },
  open: { readyState: 1, status: "open" },
  closing: { readyState: 2, status: "closing" },
  closed: { readyState: 3, status: "closed" },
};

/**
 * Fixture: WebSocket error scenarios
 */
export const websocketErrorFixtures = {
  connectionRefused: new Error("Connection refused"),
  timeout: new Error("Connection timeout"),
  authFailed: new Error("Authentication failed"),
  networkError: new Error("Network error"),
  protocolError: new Error("Protocol error"),
};

export default {
  createMockWebSocket,
  createMockWebSocketServer,
  createStreamingDataSimulator,
  generateRealtimeScadaData,
  generateProtocolDataMessage,
  websocketStateFixtures,
  websocketErrorFixtures,
};
