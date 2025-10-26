/**
 * WebSocket Service for Real-Time SCADA Data Streaming
 *
 * Provides tenant-aware real-time data subscription and management
 * with automatic reconnection and offline resilience.
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.listeners = new Map();
    this.connectionStatus = "disconnected";
    this.statusListeners = new Set();
    this.dataCache = new Map();
    this.tenantId = null;
    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
    this.lastHeartbeat = null;
    this.shouldReconnect = true; // Explicit flag for reconnection control
  }

  /**
   * Connect to WebSocket server with tenant context
   * @param {string} tenantId - Current tenant ID for scoped data
   * @returns {Promise} - Resolves when connected
   */
  connect(tenantId = null) {
    return new Promise((resolve, reject) => {
      try {
        // Close existing connection if any
        if (this.ws) {
          this.disconnect();
        }

        this.tenantId = tenantId;
        this.shouldReconnect = true; // Enable reconnection on connect
        const baseUrl =
          import.meta.env.VITE_WS_URL ||
          (
            import.meta.env.VITE_API_BASE_URL ||
            "https://thermacoreapp.onrender.com"
          ).replace("http", "ws");

        const wsUrl = tenantId
          ? `${baseUrl}/ws/real-time?tenant_id=${tenantId}`
          : `${baseUrl}/ws/real-time`;

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

          // Attempt reconnection only if shouldReconnect flag is true
          if (
            this.shouldReconnect &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.scheduleReconnect();
          }
        };

        // Connection timeout
        setTimeout(() => {
          if (this.connectionStatus !== "connected") {
            reject(new Error("WebSocket connection timeout"));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Schedule automatic reconnection with exponential backoff
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
    this.connectionStatus = "reconnecting";
    this.notifyStatusChange("reconnecting");

    this.reconnectTimeout = setTimeout(() => {
      this.connect(this.tenantId).catch((_error) => {});
    }, delay);
  }

  /**
   * Start heartbeat to detect connection issues
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: "ping" }));
          this.lastHeartbeat = Date.now();
        } catch (_error) {}
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop heartbeat interval
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();
    this.shouldReconnect = false; // Disable automatic reconnection

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionStatus = "disconnected";
    this.notifyStatusChange("disconnected");
  }

  /**
   * Subscribe to specific data stream
   * @param {string} stream - Stream identifier (e.g., 'metrics', 'temperature', 'protocols')
   * @param {Function} callback - Callback function to receive data
   * @returns {Function} - Unsubscribe function
   */
  subscribe(stream, callback) {
    if (!this.listeners.has(stream)) {
      this.listeners.set(stream, new Set());
    }

    this.listeners.get(stream).add(callback);

    // Send subscription message to server
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "subscribe",
          stream: stream,
          tenant_id: this.tenantId,
        }),
      );
    }

    // Return unsubscribe function
    return () => this.unsubscribe(stream, callback);
  }

  /**
   * Unsubscribe from data stream
   * @param {string} stream - Stream identifier
   * @param {Function} callback - Callback to remove
   */
  unsubscribe(stream, callback) {
    if (this.listeners.has(stream)) {
      this.listeners.get(stream).delete(callback);

      // If no more listeners for this stream, unsubscribe from server
      if (this.listeners.get(stream).size === 0) {
        this.listeners.delete(stream);

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: "unsubscribe",
              stream: stream,
            }),
          );
        }
      }
    }
  }

  /**
   * Handle incoming WebSocket messages
   * @param {Object} data - Parsed message data
   */
  handleMessage(data) {
    // Handle pong response
    if (data.type === "pong") {
      this.lastHeartbeat = Date.now();
      return;
    }

    // Cache the data for offline resilience
    if (data.stream && data.data) {
      this.dataCache.set(data.stream, {
        data: data.data,
        timestamp: Date.now(),
      });
    }

    // Notify all listeners for this stream
    if (data.stream && this.listeners.has(data.stream)) {
      const callbacks = this.listeners.get(data.stream);
      callbacks.forEach((callback) => {
        try {
          callback(data.data);
        } catch (_error) {}
      });
    }
  }

  /**
   * Get cached data for a stream (offline support)
   * @param {string} stream - Stream identifier
   * @returns {Object|null} - Cached data or null
   */
  getCachedData(stream) {
    const cached = this.dataCache.get(stream);
    if (cached) {
      return {
        ...cached.data,
        _cached: true,
        _cachedAt: cached.timestamp,
      };
    }
    return null;
  }

  /**
   * Subscribe to connection status changes
   * @param {Function} callback - Callback to receive status updates
   * @returns {Function} - Unsubscribe function
   */
  onStatusChange(callback) {
    this.statusListeners.add(callback);

    // Immediately notify of current status
    callback(this.connectionStatus);

    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Notify all status listeners of connection status change
   * @param {string} status - New connection status
   */
  notifyStatusChange(status) {
    this.statusListeners.forEach((callback) => {
      try {
        callback(status);
      } catch (_error) {}
    });
  }

  /**
   * Get current connection status
   * @returns {string} - Connection status
   */
  getStatus() {
    return this.connectionStatus;
  }

  /**
   * Check if WebSocket is connected
   * @returns {boolean} - True if connected
   */
  isConnected() {
    return (
      this.connectionStatus === "connected" &&
      this.ws &&
      this.ws.readyState === WebSocket.OPEN
    );
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
