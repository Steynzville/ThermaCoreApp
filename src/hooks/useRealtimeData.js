/**
 * Custom React Hook for Real-Time SCADA Data
 *
 * Provides easy integration of WebSocket-based real-time data
 * with automatic reconnection (exponential backoff) and
 * tenant-aware filtering.
 */

import { useEffect, useRef, useState } from "react";
import { useTenant } from "../context/TenantContext";
import scadaService from "../services/scadaService";
import websocketService from "../services/websocketService";

const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

/**
 * Hook for real-time SCADA metrics
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoConnect - Auto-connect on mount (default: true)
 * @param {number} options.refreshInterval - Fallback polling interval in ms (default: 600000)
 * @param {boolean} options.useMockData - Use mock data in development (default: true in dev)
 * @returns {Object} - Real-time metrics data and utilities
 */
export const useRealtimeMetrics = ({
  autoConnect = true,
  refreshInterval = 600000,
  useMockData = import.meta.env.DEV,
} = {}) => {
  const { currentTenant } = useTenant();
  // IMPORTANT: only depend on the primitive tenant id, never the tenant
  // object itself. `currentTenant` is a new object reference on every
  // provider render even when the id hasn't changed, which previously
  // caused the connection effect to tear down/reconnect on every render
  // (an effective infinite loop under React 18 strict/dev re-renders).
  const tenantId = currentTenant?.id || null;

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  const fallbackIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);
  const isConnectingRef = useRef(false); // Prevent race conditions
  const tenantIdRef = useRef(tenantId);

  useEffect(() => {
    tenantIdRef.current = tenantId;
  }, [tenantId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Connect to WebSocket and subscribe to metrics
  useEffect(() => {
    if (!autoConnect) return;

    let unsubscribe;
    let statusUnsubscribe;
    let cancelled = false;

    const fetchMetricsOnce = async () => {
      try {
        if (useMockData) {
          if (isMountedRef.current) {
            setMetrics(scadaService.generateMockMetrics());
            setLoading(false);
          }
          return;
        }
        const result = await scadaService.getCurrentMetrics(tenantIdRef.current);
        if (result.success && isMountedRef.current) {
          setMetrics(result.data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    const scheduleReconnect = () => {
      if (!isMountedRef.current || cancelled) return;
      const attempt = reconnectAttemptsRef.current;
      const delay = Math.min(
        BASE_RECONNECT_DELAY_MS * 2 ** attempt,
        MAX_RECONNECT_DELAY_MS,
      );
      reconnectAttemptsRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!cancelled) setupConnection();
      }, delay);
    };

    const setupConnection = async () => {
      // Prevent duplicate connection attempts
      if (isConnectingRef.current || cancelled) {
        return;
      }

      isConnectingRef.current = true;

      try {
        if (isMountedRef.current) setLoading(true);

        // Subscribe to connection status (once)
        if (!statusUnsubscribe) {
          statusUnsubscribe = websocketService.onStatusChange((status) => {
            if (isMountedRef.current) {
              setConnectionStatus(status);
              if (status === "connected") {
                reconnectAttemptsRef.current = 0;
              }
            }
          });
        }

        // Connect to WebSocket with tenant context
        await websocketService.connect(tenantIdRef.current);

        // A successful connect() is itself authoritative: don't wait on a
        // separate status-stream event to mark us connected, since a
        // service implementation may not emit one synchronously (or at
        // all) alongside connect() resolving.
        if (isMountedRef.current) {
          setConnectionStatus("connected");
        }

        // Subscribe to metrics stream (once)
        if (!unsubscribe) {
          unsubscribe = websocketService.subscribe("metrics", (data) => {
            if (isMountedRef.current) {
              setMetrics(data);
              setError(null);
              setLoading(false);
            }
          });
        }

        // Initial data fetch
        await fetchMetricsOnce();
        reconnectAttemptsRef.current = 0;
      } catch (err) {
        if (isMountedRef.current) {
          setError(err.message);
          setLoading(false);
          setConnectionStatus("disconnected");
        }
        scheduleReconnect();
      } finally {
        isConnectingRef.current = false;
      }
    };

    setupConnection();

    // Setup fallback polling when WebSocket is disconnected
    const setupFallbackPolling = () => {
      fallbackIntervalRef.current = setInterval(async () => {
        if (!websocketService.isConnected() && isMountedRef.current) {
          await fetchMetricsOnce();
        }
      }, refreshInterval);
    };

    setupFallbackPolling();

    // Cleanup
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
      if (statusUnsubscribe) statusUnsubscribe();
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
    // NOTE: depend on the primitive `tenantId`, not `currentTenant`.
  }, [autoConnect, tenantId, refreshInterval, useMockData]);

  return {
    metrics,
    loading,
    error,
    connectionStatus,
    isConnected: connectionStatus === "connected",
  };
};

/**
 * Hook for real-time protocol status
 */
export const useRealtimeProtocolStatus = ({
  autoConnect = true,
  refreshInterval = 10000,
  useMockData = import.meta.env.DEV,
} = {}) => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id || null;

  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fallbackIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);
  const isConnectingRef = useRef(false); // Prevent race conditions
  const tenantIdRef = useRef(tenantId);

  useEffect(() => {
    tenantIdRef.current = tenantId;
  }, [tenantId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!autoConnect) return;

    let unsubscribe;
    let cancelled = false;

    const fetchProtocolsOnce = async () => {
      try {
        if (useMockData) {
          if (isMountedRef.current) {
            setProtocols(scadaService.generateMockProtocolStatus());
            setLoading(false);
          }
          return;
        }
        const result = await scadaService.getProtocolStatus(tenantIdRef.current);
        if (result.success && isMountedRef.current) {
          setProtocols(result.data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    const scheduleReconnect = () => {
      if (!isMountedRef.current || cancelled) return;
      const attempt = reconnectAttemptsRef.current;
      const delay = Math.min(
        BASE_RECONNECT_DELAY_MS * 2 ** attempt,
        MAX_RECONNECT_DELAY_MS,
      );
      reconnectAttemptsRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!cancelled) setupConnection();
      }, delay);
    };

    const setupConnection = async () => {
      if (isConnectingRef.current || cancelled) {
        return;
      }

      isConnectingRef.current = true;

      try {
        if (isMountedRef.current) setLoading(true);

        // Ensure WebSocket is connected
        if (!websocketService.isConnected()) {
          await websocketService.connect(tenantIdRef.current);
        }

        // Subscribe to protocol status stream (once)
        if (!unsubscribe) {
          unsubscribe = websocketService.subscribe("protocols", (data) => {
            if (isMountedRef.current) {
              setProtocols(data);
              setError(null);
              setLoading(false);
            }
          });
        }

        await fetchProtocolsOnce();
        reconnectAttemptsRef.current = 0;
      } catch (err) {
        if (isMountedRef.current) {
          setError(err.message);
          setLoading(false);
        }
        scheduleReconnect();
      } finally {
        isConnectingRef.current = false;
      }
    };

    setupConnection();

    // Setup fallback polling
    fallbackIntervalRef.current = setInterval(async () => {
      if (!websocketService.isConnected() && isMountedRef.current) {
        await fetchProtocolsOnce();
      }
    }, refreshInterval);

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [autoConnect, tenantId, refreshInterval, useMockData]);

  return {
    protocols,
    loading,
    error,
  };
};

/**
 * Hook for real-time historical data with time range selection
 */
export const useRealtimeHistoricalData = ({
  hours = 24,
  autoRefresh = true,
  refreshInterval = 60000, // 1 minute
  useMockData = import.meta.env.DEV,
} = {}) => {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id || null;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(hours);

  const refreshIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const tenantIdRef = useRef(tenantId);

  useEffect(() => {
    tenantIdRef.current = tenantId;
  }, [tenantId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isMountedRef.current) setLoading(true);

        const endTime = new Date().toISOString();
        const startTime = new Date(
          Date.now() - timeRange * 60 * 60 * 1000,
        ).toISOString();

        if (useMockData) {
          const mockData = scadaService.generateMockHistoricalData(timeRange);
          if (isMountedRef.current) {
            setData(mockData);
            setLoading(false);
          }
        } else {
          const result = await scadaService.getHistoricalData({
            tenantId: tenantIdRef.current,
            startTime,
            endTime,
            interval: timeRange > 24 ? "1h" : "5m",
          });

          if (result.success && isMountedRef.current) {
            setData(result.data);
            setError(null);
            setLoading(false);
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchData();

    // Setup auto-refresh
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
    // NOTE: depend on the primitive `tenantId`, not `currentTenant`.
  }, [timeRange, tenantId, autoRefresh, refreshInterval, useMockData]);

  return {
    data,
    loading,
    error,
    timeRange,
    setTimeRange,
  };
};

/**
 * Hook for WebSocket connection status monitoring
 */
export const useWebSocketStatus = () => {
  const [status, setStatus] = useState("disconnected");
  const [lastHeartbeat, setLastHeartbeat] = useState(null);

  useEffect(() => {
    const unsubscribe = websocketService.onStatusChange((newStatus) => {
      setStatus(newStatus);
      if (newStatus === "connected") {
        setLastHeartbeat(Date.now());
      }
    });

    return unsubscribe;
  }, []);

  return {
    status,
    isConnected: status === "connected",
    isReconnecting: status === "reconnecting",
    lastHeartbeat,
  };
};

export default {
  useRealtimeMetrics,
  useRealtimeProtocolStatus,
  useRealtimeHistoricalData,
  useWebSocketStatus,
};
