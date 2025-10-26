/**
 * Protocol WebSocket Service
 *
 * Integrates with PR #9 WebSocket infrastructure to provide
 * real-time protocol data updates
 */

// Constants
const CONNECTION_TIMEOUT = 10000; // 10 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

class ProtocolWebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.listeners = new Map();
    this.connectionStatus = "disconnected";
    this.statusListeners = new Set();
    this.tenantId = null;
    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
    this.shouldReconnect = true;
    this.protocol = null; // modbus, opcua, dnp3, mqtt
  }

  /**
   * Connect to protocol-specific WebSocket
   * @param {string} protocol - Protocol type (modbus, opcua, dnp3, mqtt)
   * @param {string} tenantId - Tenant ID for scoped data
   * @returns {Promise}
   */
  connect(protocol, tenantId = null) {
    return new Promise((resolve, reject) => {
      try {
        if (this.ws) {
          this.disconnect();
        }

        this.protocol = protocol;
        this.tenantId = tenantId;
        this.shouldReconnect = true;

        const baseUrl =
          import.meta.env.VITE_WS_URL ||
          (
            import.meta.env.VITE_API_BASE_URL ||
            "https://thermacoreapp.onrender.com"
          ).replace("http", "ws");

        const wsUrl = tenantId
          ? `${baseUrl}/ws/protocols/${protocol}?tenant_id=${tenantId}`
          : `${baseUrl}/ws/protocols/${protocol}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.connectionStatus = "connected";
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.notifyStatusChange("connected");
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (_error) {}
        };

        this.ws.onerror = (_error) => {
          this.connectionStatus = "error";
          this.notifyStatusChange("error");
        };

        this.ws.onclose = () => {
          this.connectionStatus = "disconnected";
          this.stopHeartbeat();
          this.notifyStatusChange("disconnected");

          if (
            this.shouldReconnect &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.scheduleReconnect();
          }
        };

        setTimeout(() => {
          if (this.connectionStatus !== "connected") {
            reject(new Error("WebSocket connection timeout"));
          }
        }, CONNECTION_TIMEOUT);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    this.shouldReconnect = false;
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionStatus = "disconnected";
    this.notifyStatusChange("disconnected");
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * 2 ** (this.reconnectAttempts - 1),
      this.maxReconnectDelay,
    );

    this.reconnectTimeout = setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect(this.protocol, this.tenantId);
      }
    }, delay);
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    if (data.type === "heartbeat") {
      // Heartbeat response - no action needed
      return;
    }

    // Notify all listeners
    this.listeners.forEach((callback, _key) => {
      try {
        callback(data);
      } catch (_error) {}
    });
  }

  /**
   * Subscribe to protocol data updates
   * @param {string} key - Unique subscription key
   * @param {Function} callback - Callback function to receive data
   */
  subscribe(key, callback) {
    this.listeners.set(key, callback);
  }

  /**
   * Unsubscribe from protocol data updates
   * @param {string} key - Subscription key to remove
   */
  unsubscribe(key) {
    this.listeners.delete(key);
  }

  /**
   * Subscribe to connection status changes
   * @param {Function} callback - Callback function
   */
  onStatusChange(callback) {
    this.statusListeners.add(callback);
  }

  /**
   * Unsubscribe from connection status changes
   * @param {Function} callback - Callback function to remove
   */
  offStatusChange(callback) {
    this.statusListeners.delete(callback);
  }

  /**
   * Notify all status listeners of connection status change
   */
  notifyStatusChange(status) {
    this.statusListeners.forEach((callback) => {
      try {
        callback(status);
      } catch (_error) {}
    });
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: "heartbeat" }));
        } catch (_error) {}
      }
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * Stop heartbeat mechanism
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send data to server
   * @param {Object} data - Data to send
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (_error) {}
    } else {
    }
  }

  /**
   * Get current connection status
   * @returns {string} Connection status
   */
  getStatus() {
    return this.connectionStatus;
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.connectionStatus === "connected";
  }
}

// Create singleton instances for each protocol
const modbusWS = new ProtocolWebSocketService();
const opcuaWS = new ProtocolWebSocketService();
const dnp3WS = new ProtocolWebSocketService();
const mqttWS = new ProtocolWebSocketService();

export { modbusWS, opcuaWS, dnp3WS, mqttWS, ProtocolWebSocketService };

export default {
  modbus: modbusWS,
  opcua: opcuaWS,
  dnp3: dnp3WS,
  mqtt: mqttWS,
};
