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
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.listeners = new Map();
    this.connectionStatus = "disconnected";
    this.statusListeners = new Set();
    this.dataCache = new Map();
    this.tenantId = null;
    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
    this.lastHeartbeat = null;
    this.shouldReconnect = true;
    this._pendingConnect = null;
    this._pendingConnectId = 0;
    this._connectTimeout = null;
    this._pendingReject = null;
    this._isDisconnecting = false;
    this._currentRejectConnect = null;
    this._connectionEpoch = 0;
    this._pendingConnectTenantId = null;
  }

  /**
   * Connect to WebSocket server with tenant context
   * @param {string} tenantId - Current tenant ID for scoped data
   * @returns {Promise} - Resolves when connected
   */
  connect(tenantId = null) {
    // If there's a pending connect with the SAME tenant, return that promise
    if (this._pendingConnect && this._pendingConnectTenantId === tenantId) {
      return this._pendingConnect;
    }

    // If there's a pending connect with a DIFFERENT tenant, reject the stale one
    if (this._pendingConnect) {
      if (this._currentRejectConnect) {
        this._currentRejectConnect(new Error("WebSocket connect superseded by new tenant"));
      } else if (this._pendingReject) {
        this._pendingReject(new Error("WebSocket connect superseded by new tenant"));
      }
      // Clear the pending connect state
      this._pendingConnect = null;
      this._pendingReject = null;
      this._currentRejectConnect = null;
      this._pendingConnectTenantId = null;
    }

    // Clear any pending reconnect timeout when manually connecting
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Reset disconnecting flag on new connect attempt
    this._isDisconnecting = false;

    // Bump epoch for this connection attempt
    const epochAtConnect = ++this._connectionEpoch;
    const connectId = ++this._pendingConnectId;
    this._pendingConnectTenantId = tenantId;

    this._pendingConnect = new Promise((resolve, reject) => {
      let isResolved = false;
      let isRejected = false;

      // Helper to reject this specific connect attempt
      const rejectConnect = (error) => {
        // Only reject if this is still the current connection attempt
        if (!isResolved && !isRejected && epochAtConnect === this._connectionEpoch) {
          isRejected = true;
          this._currentRejectConnect = null;
          if (this._connectTimeout) {
            clearTimeout(this._connectTimeout);
            this._connectTimeout = null;
          }
          if (this._pendingConnectId === connectId) {
            this._pendingConnect = null;
            this._pendingReject = null;
            this._pendingConnectTenantId = null;
          }
          reject(error);
        }
      };

      // Store reject function for cleanup/disconnect handling
      this._pendingReject = reject;
      this._currentRejectConnect = rejectConnect;

      const cleanup = () => {
        if (this._connectTimeout) {
          clearTimeout(this._connectTimeout);
          this._connectTimeout = null;
        }
        if (this._pendingConnectId === connectId) {
          this._pendingConnect = null;
          this._pendingReject = null;
          this._currentRejectConnect = null;
          this._pendingConnectTenantId = null;
        }
      };

      // Helper to resolve this specific connect attempt
      const resolveConnect = (value) => {
        // Only resolve if this is still the current connection attempt
        if (!isResolved && !isRejected && epochAtConnect === this._connectionEpoch) {
          isResolved = true;
          cleanup();
          resolve(value);
        }
      };

      try {
        // Close existing connection if any
        if (this.ws) {
          const oldWs = this.ws;
          oldWs.onopen = null;
          oldWs.onclose = null;
          oldWs.onmessage = null;
          oldWs.onerror = null;
          try {
            oldWs.close();
          } catch (_e) {
            // Ignore close errors
          }
          this.ws = null;
        }

        this.tenantId = tenantId;
        this.shouldReconnect = true;
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

        // Store timeout on instance so it can be cleaned up externally
        this._connectTimeout = setTimeout(() => {
          if (!isResolved && !isRejected && epochAtConnect === this._connectionEpoch) {
            rejectConnect(new Error("WebSocket connection timeout"));
          }
        }, 10000);

        this.ws.onopen = () => {
          // Check if disconnect was called during connection attempt
          if (this._isDisconnecting) {
            // If disconnect was called, don't resolve - we'll reject via disconnect
            return;
          }
          // Only resolve if this is still the current connection attempt
          if (!isResolved && !isRejected && epochAtConnect === this._connectionEpoch) {
            this.connectionStatus = "connected";
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;
            this.notifyStatusChange("connected");
            this.startHeartbeat();
            this.subscribeAllStreams();
            resolveConnect();
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (_error) {
            // Ignore malformed messages
          }
        };

        this.ws.onerror = (error) => {
          if (!isResolved && !isRejected && epochAtConnect === this._connectionEpoch) {
            this.connectionStatus = "error";
            this.notifyStatusChange("error");
            rejectConnect(error);
          }
        };

        this.ws.onclose = () => {
          this.connectionStatus = "disconnected";
          this.stopHeartbeat();
          this.notifyStatusChange("disconnected");

          // If disconnect was called, reject with client disconnect error
          if (this._isDisconnecting) {
            if (!isResolved && !isRejected && epochAtConnect === this._connectionEpoch) {
              rejectConnect(new Error("WebSocket disconnected by client"));
            }
            return;
          }

          // If we're still trying to connect and this was a manual disconnect
          if (!isResolved && !isRejected && epochAtConnect === this._connectionEpoch) {
            if (!this.shouldReconnect) {
              rejectConnect(new Error("WebSocket connection closed manually"));
              return;
            }
            // For auto-reconnect, reject the original promise
            // and let the reconnect attempt create a new one
            rejectConnect(new Error("WebSocket connection closed before opening"));
          }

          // Attempt reconnection only if shouldReconnect flag is true
          if (
            this.shouldReconnect &&
            this.reconnectAttempts < this.maxReconnectAttempts &&
            epochAtConnect === this._connectionEpoch
          ) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        cleanup();
        if (epochAtConnect === this._connectionEpoch) {
          rejectConnect(error);
        }
      }
    });

    return this._pendingConnect;
  }

  /**
   * Resubscribe all streams after reconnection
   */
  subscribeAllStreams() {
    for (const [stream, callbacks] of this.listeners) {
      if (callbacks.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: "subscribe",
            stream: stream,
            tenant_id: this.tenantId,
          })
        );
      }
    }
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

    // Capture the current epoch when this reconnect is scheduled
    const epochAtSchedule = this._connectionEpoch;

    this.reconnectTimeout = setTimeout(() => {
      // Bail out if disconnect() or a new connect() happened since this was scheduled
      if (epochAtSchedule !== this._connectionEpoch) {
        return;
      }

      // Clear the pending connect before retrying
      this._pendingConnect = null;
      this._pendingReject = null;
      this._currentRejectConnect = null;
      this._pendingConnectTenantId = null;
      this.connect(this.tenantId).catch((_error) => {
        // Connection error will be handled by onerror/onclose
      });
    }, delay);
  }

  /**
   * Start heartbeat to detect connection issues
   */
  startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: "ping" }));
          this.lastHeartbeat = Date.now();
        } catch (_error) {
          // Ignore send errors
        }
      }
    }, 30000);
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
   * Properly rejects any in-flight connect() promise
   */
  disconnect() {
    // Bump epoch FIRST so any in-flight timer/callback becomes a no-op
    this._connectionEpoch++;
    this._isDisconnecting = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this._connectTimeout) {
      clearTimeout(this._connectTimeout);
      this._connectTimeout = null;
    }

    // CRITICAL FIX: Reject any pending connect promise using the wrapper
    if (this._currentRejectConnect) {
      this._currentRejectConnect(new Error("WebSocket disconnected by client"));
      this._currentRejectConnect = null;
    }

    // Also handle raw reject as fallback
    if (this._pendingReject) {
      this._pendingReject(new Error("WebSocket disconnected by client"));
      this._pendingReject = null;
    }

    // Clear pending connect
    this._pendingConnect = null;
    this._pendingConnectId++;
    this._pendingConnectTenantId = null;

    this.stopHeartbeat();
    this.shouldReconnect = false;

    if (this.ws) {
      // Store reference before nulling
      const wsToClose = this.ws;
      
      // Null handlers AFTER storing reference
      wsToClose.onopen = null;
      wsToClose.onclose = null;
      wsToClose.onmessage = null;
      wsToClose.onerror = null;

      try {
        wsToClose.close();
      } catch (_error) {
        // Ignore close errors
      }
      this.ws = null;
    }

    this.connectionStatus = "disconnected";
    this.notifyStatusChange("disconnected");
  }

  /**
   * Subscribe to specific data stream
   */
  subscribe(stream, callback) {
    if (!this.listeners.has(stream)) {
      this.listeners.set(stream, new Set());
    }

    this.listeners.get(stream).add(callback);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "subscribe",
          stream: stream,
          tenant_id: this.tenantId,
        })
      );
    }

    return () => this.unsubscribe(stream, callback);
  }

  /**
   * Unsubscribe from data stream
   */
  unsubscribe(stream, callback) {
    if (this.listeners.has(stream)) {
      this.listeners.get(stream).delete(callback);

      if (this.listeners.get(stream).size === 0) {
        this.listeners.delete(stream);

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: "unsubscribe",
              stream: stream,
            })
          );
        }
      }
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    if (data.type === "pong") {
      this.lastHeartbeat = Date.now();
      return;
    }

    if (data.stream && data.data !== undefined && data.data !== null) {
      this.dataCache.set(data.stream, {
        data: data.data,
        timestamp: Date.now(),
      });
    }

    if (data.stream && this.listeners.has(data.stream)) {
      const callbacks = this.listeners.get(data.stream);
      callbacks.forEach((callback) => {
        try {
          callback(data.data);
        } catch (_error) {
          // Ignore callback errors
        }
      });
    }
  }

  /**
   * Get cached data for a stream (offline support)
   */
  getCachedData(stream) {
    const cached = this.dataCache.get(stream);
    if (cached) {
      if (typeof cached.data !== "object" || cached.data === null) {
        return {
          value: cached.data,
          _cached: true,
          _cachedAt: cached.timestamp,
        };
      }
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
   */
  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.connectionStatus);

    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Notify all status listeners of connection status change
   */
  notifyStatusChange(status) {
    this.statusListeners.forEach((callback) => {
      try {
        callback(status);
      } catch (_error) {
        // Ignore callback errors
      }
    });
  }

  /**
   * Get current connection status
   */
  getStatus() {
    return this.connectionStatus;
  }

  /**
   * Check if WebSocket is connected
   * ✅ FIXED: Always returns a boolean, not null/undefined
   */
  isConnected() {
    return !!(
      this.connectionStatus === "connected" &&
      this.ws &&
      this.ws.readyState === WebSocket.OPEN
    );
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
