/**
 * Mock WebSocket for Testing Real-time SCADA Components
 *
 * Provides utilities to simulate:
 * - 60fps streaming updates
 * - Connection lifecycle (connect, disconnect, reconnect)
 * - Buffer overflow scenarios
 * - Multi-source data aggregation
 * - Network errors and latency
 */

/**
 * Enhanced MockWebSocket class with advanced simulation capabilities
 */
export class MockWebSocket {
  constructor(url, protocols) {
    this.url = url;
    this.protocols = protocols;
    this.readyState = MockWebSocket.CONNECTING;
    this.listeners = {};
    this.bufferedAmount = 0;
    this.extensions = "";
    this.protocol = "";
    this.binaryType = "blob";

    // Simulation controls
    this._messageQueue = [];
    this._streamingInterval = null;
    this._autoConnect = true;
    this._connectionDelay = 10;

    // Simulate connection after delay
    if (this._autoConnect) {
      setTimeout(() => this._simulateConnection(), this._connectionDelay);
    }
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  _simulateConnection() {
    this.readyState = MockWebSocket.OPEN;
    this._triggerEvent("open", {});
  }

  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error("WebSocket is not open");
    }
    this.bufferedAmount += data.length || 0;
    // Simulate send completion
    setTimeout(() => {
      this.bufferedAmount = Math.max(
        0,
        this.bufferedAmount - (data.length || 0),
      );
    }, 1);
  }

  close(code = 1000, reason = "") {
    if (
      this.readyState === MockWebSocket.CLOSING ||
      this.readyState === MockWebSocket.CLOSED
    ) {
      return;
    }
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      this._triggerEvent("close", { code, reason, wasClean: true });
    }, 10);
  }

  addEventListener(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        (h) => h !== handler,
      );
    }
  }

  _triggerEvent(event, data) {
    // Call onX handlers
    const onHandler = this[`on${event}`];
    if (typeof onHandler === "function") {
      onHandler(data);
    }

    // Call addEventListener handlers
    if (this.listeners[event]) {
      for (const handler of this.listeners[event]) {
        handler(data);
      }
    }
  }

  // Simulation helpers
  simulateMessage(data) {
    if (this.readyState === MockWebSocket.OPEN) {
      this._triggerEvent("message", { data: JSON.stringify(data) });
    }
  }

  simulateError(error = "Connection error") {
    this._triggerEvent("error", { message: error });
  }

  simulateDisconnect() {
    this.close(1006, "Connection lost");
  }

  simulateReconnect() {
    this.readyState = MockWebSocket.CONNECTING;
    setTimeout(() => this._simulateConnection(), this._connectionDelay);
  }
}

/**
 * Create a 60fps streaming simulator
 * Simulates real-time data updates at 60 frames per second
 */
export function create60fpsStreamSimulator(ws, dataGenerator, options = {}) {
  const {
    fps = 60,
    duration = 1000, // ms
    autoStart = true,
  } = options;

  const interval = 1000 / fps;
  let frameCount = 0;
  let intervalId = null;

  const start = () => {
    if (intervalId) return;

    intervalId = setInterval(() => {
      if (ws.readyState === MockWebSocket.OPEN) {
        const data = dataGenerator(frameCount);
        ws.simulateMessage(data);
        frameCount++;

        if (duration && frameCount * interval >= duration) {
          stop();
        }
      }
    }, interval);
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const reset = () => {
    stop();
    frameCount = 0;
  };

  if (autoStart) {
    start();
  }

  return { start, stop, reset, getFrameCount: () => frameCount };
}

/**
 * Create a multi-source data aggregator simulator
 * Simulates multiple data streams being aggregated
 */
export function createMultiSourceSimulator(ws, sources = []) {
  const activeStreams = [];

  const addSource = (sourceId, dataGenerator, intervalMs = 100) => {
    const intervalId = setInterval(() => {
      if (ws.readyState === MockWebSocket.OPEN) {
        const data = dataGenerator();
        ws.simulateMessage({
          source: sourceId,
          timestamp: Date.now(),
          ...data,
        });
      }
    }, intervalMs);

    activeStreams.push({ sourceId, intervalId });
  };

  const removeSource = (sourceId) => {
    const index = activeStreams.findIndex((s) => s.sourceId === sourceId);
    if (index >= 0) {
      clearInterval(activeStreams[index].intervalId);
      activeStreams.splice(index, 1);
    }
  };

  const stopAll = () => {
    for (const { intervalId } of activeStreams) {
      clearInterval(intervalId);
    }
    activeStreams.length = 0;
  };

  // Add initial sources
  for (const { id, generator, interval } of sources) {
    addSource(id, generator, interval);
  }

  return { addSource, removeSource, stopAll };
}

/**
 * Simulate buffer overflow scenario
 */
export function simulateBufferOverflow(
  ws,
  messageSize = 1000,
  messageCount = 100,
) {
  const messages = [];
  for (let i = 0; i < messageCount; i++) {
    messages.push({
      id: i,
      data: "x".repeat(messageSize),
      timestamp: Date.now() + i,
    });
  }

  // Send all messages rapidly
  messages.forEach((msg) => {
    setTimeout(() => ws.simulateMessage(msg), Math.random() * 10);
  });

  return messages;
}

/**
 * Simulate network latency
 */
export function simulateNetworkLatency(ws, latencyMs = 100) {
  const originalSimulateMessage = ws.simulateMessage.bind(ws);

  ws.simulateMessage = (data) => {
    setTimeout(() => originalSimulateMessage(data), latencyMs);
  };
}

/**
 * Create a mock WebSocket factory for testing
 */
export function createMockWebSocketFactory() {
  const instances = [];

  const MockWSFactory = (url, protocols) => {
    const instance = new MockWebSocket(url, protocols);
    instances.push(instance);
    return instance;
  };

  MockWSFactory.CONNECTING = MockWebSocket.CONNECTING;
  MockWSFactory.OPEN = MockWebSocket.OPEN;
  MockWSFactory.CLOSING = MockWebSocket.CLOSING;
  MockWSFactory.CLOSED = MockWebSocket.CLOSED;

  MockWSFactory.getInstances = () => instances;
  MockWSFactory.getLatestInstance = () => instances[instances.length - 1];
  MockWSFactory.clearInstances = () => {
    instances.length = 0;
  };

  return MockWSFactory;
}

/**
 * Helper to wait for WebSocket state
 */
export function waitForWebSocketState(ws, targetState, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      if (ws.readyState === targetState) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for WebSocket state ${targetState}`));
      } else {
        setTimeout(check, 10);
      }
    };

    check();
  });
}

export default MockWebSocket;
