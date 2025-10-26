/**
 * Custom React Hook for Real-Time SCADA Data
 *
 * Provides easy integration of WebSocket-based real-time data
 * with automatic reconnection and tenant-aware filtering.
 */

import { useEffect, useRef, useState } from "react";
import { useTenant } from "../context/TenantContext";
import scadaService from "../services/scadaService";
import websocketService from "../services/websocketService";

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
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const fallbackIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const isConnectingRef = useRef(false); // Prevent race conditions

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

    const setupConnection = async () => {
      // Prevent duplicate connection attempts
      if (isConnectingRef.current) {
        return;
      }

      isConnectingRef.current = true;

      try {
        setLoading(true);

        // Subscribe to connection status
        statusUnsubscribe = websocketService.onStatusChange((status) => {
          if (isMountedRef.current) {
            setConnectionStatus(status);
          }
        });

        // Connect to WebSocket with tenant context
        const tenantId = currentTenant?.id || null;
        await websocketService.connect(tenantId);

        // Subscribe to metrics stream
        unsubscribe = websocketService.subscribe("metrics", (data) => {
          if (isMountedRef.current) {
            setMetrics(data);
            setError(null);
            setLoading(false);
          }
        });

        // Initial data fetch
        if (useMockData) {
          setMetrics(scadaService.generateMockMetrics());
          setLoading(false);
        } else {
          const result = await scadaService.getCurrentMetrics(tenantId);
          if (result.success && isMountedRef.current) {
            setMetrics(result.data);
            setLoading(false);
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err.message);
          setLoading(false);
        }
      } finally {
        isConnectingRef.current = false;
      }
    };

    setupConnection();

    // Setup fallback polling when WebSocket is disconnected
    const setupFallbackPolling = () => {
      fallbackIntervalRef.current = setInterval(async () => {
        if (!websocketService.isConnected() && isMountedRef.current) {
          try {
            const tenantId = currentTenant?.id || null;
            if (useMockData) {
              setMetrics(scadaService.generateMockMetrics());
            } else {
              const result = await scadaService.getCurrentMetrics(tenantId);
              if (result.success && isMountedRef.current) {
                setMetrics(result.data);
              }
            }
          } catch (_err) {}
        }
      }, refreshInterval);
    };

    setupFallbackPolling();

    // Cleanup
    return () => {
      if (unsubscribe) unsubscribe();
      if (statusUnsubscribe) statusUnsubscribe();
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };
  }, [autoConnect, currentTenant, refreshInterval, useMockData]);

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
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fallbackIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const isConnectingRef = useRef(false); // Prevent race conditions

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!autoConnect) return;

    let unsubscribe;

    const setupConnection = async () => {
      // Prevent duplicate connection attempts
      if (isConnectingRef.current) {
        return;
      }

      isConnectingRef.current = true;

      try {
        setLoading(true);

        const tenantId = currentTenant?.id || null;

        // Ensure WebSocket is connected
        if (!websocketService.isConnected()) {
          await websocketService.connect(tenantId);
        }

        // Subscribe to protocol status stream
        unsubscribe = websocketService.subscribe("protocols", (data) => {
          if (isMountedRef.current) {
            setProtocols(data);
            setError(null);
            setLoading(false);
          }
        });

        // Initial data fetch
        if (useMockData) {
          setProtocols(scadaService.generateMockProtocolStatus());
          setLoading(false);
        } else {
          const result = await scadaService.getProtocolStatus(tenantId);
          if (result.success && isMountedRef.current) {
            setProtocols(result.data);
            setLoading(false);
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err.message);
          setLoading(false);
        }
      } finally {
        isConnectingRef.current = false;
      }
    };

    setupConnection();

    // Setup fallback polling
    fallbackIntervalRef.current = setInterval(async () => {
      if (!websocketService.isConnected() && isMountedRef.current) {
        try {
          const tenantId = currentTenant?.id || null;
          if (useMockData) {
            setProtocols(scadaService.generateMockProtocolStatus());
          } else {
            const result = await scadaService.getProtocolStatus(tenantId);
            if (result.success && isMountedRef.current) {
              setProtocols(result.data);
            }
          }
        } catch (_err) {}
      }
    }, refreshInterval);

    return () => {
      if (unsubscribe) unsubscribe();
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };
  }, [autoConnect, currentTenant, refreshInterval, useMockData]);

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
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(hours);
  const refreshIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const tenantId = currentTenant?.id || null;
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
            tenantId,
            startTime,
            endTime,
            interval: timeRange > 24 ? "1h" : "5m",
          });

          if (result.success && isMountedRef.current) {
            setData(result.data);
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
  }, [timeRange, currentTenant, autoRefresh, refreshInterval, useMockData]);

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
