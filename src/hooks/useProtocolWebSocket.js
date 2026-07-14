/**
 * Custom Hook for Protocol WebSocket Integration
 *
 * Provides easy-to-use hook for consuming real-time protocol data
 */

import { useCallback, useEffect, useRef, useState } from "react";
import protocolWS from "../services/protocolWebSocketService";

/**
 * Hook for protocol WebSocket connection and data subscription
 * @param {string} protocol - Protocol type (modbus, opcua, dnp3, mqtt)
 * @param {string} tenantId - Tenant ID for scoped data
 * @param {boolean} autoConnect - Auto-connect on mount (default: true)
 * @returns {Object} WebSocket state and methods
 */
export const useProtocolWebSocket = (
  protocol,
  tenantId = null,
  autoConnect = true,
) => {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  const ws = protocolWS[protocol];

  // Handle connection
  const connect = useCallback(async () => {
    if (!ws) {
      setError(new Error(`Invalid protocol: ${protocol}`));
      return;
    }

    try {
      await ws.connect(protocol, tenantId);
      if (isMounted.current) {
        setError(null);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err);
      }
    }
  }, [protocol, tenantId, ws]);

  // Handle disconnection
  const disconnect = useCallback(() => {
    if (ws) {
      ws.disconnect();
    }
  }, [ws]);

  // Subscribe to data updates
  useEffect(() => {
    if (!ws) return;

    const dataKey = `${protocol}-data-${Date.now()}`;

    const handleData = (newData) => {
      if (isMounted.current) {
        setData(newData);
      }
    };

    ws.subscribe(dataKey, handleData);

    return () => {
      ws.unsubscribe(dataKey);
    };
  }, [protocol, ws]);

  // Subscribe to status changes
  useEffect(() => {
    if (!ws) return;

    const handleStatusChange = (status) => {
      if (isMounted.current) {
        setConnectionStatus(status);
      }
    };

    ws.onStatusChange(handleStatusChange);

    return () => {
      ws.offStatusChange(handleStatusChange);
    };
  }, [ws]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && ws && !ws.isConnected()) {
      connect();
    }

    return () => {
      isMounted.current = false;
      if (autoConnect && ws) {
        ws.disconnect();
      }
    };
  }, [autoConnect, connect, ws]);

  // Send data to server
  const send = useCallback(
    (payload) => {
      if (ws) {
        ws.send(payload);
      }
    },
    [ws],
  );

  return {
    connectionStatus,
    isConnected: connectionStatus === "connected",
    data,
    error,
    connect,
    disconnect,
    send,
  };
};

/**
 * Hook for subscribing to specific protocol events
 * @param {string} protocol - Protocol type
 * @param {string} eventType - Event type to subscribe to
 * @param {Function} callback - Callback function
 * @param {string} tenantId - Tenant ID
 */
export const useProtocolEvent = (
  protocol,
  eventType,
  callback,
  _tenantId = null,
) => {
  const ws = protocolWS[protocol];
  const isMounted = useRef(true);

  useEffect(() => {
    if (!ws || !callback) return;

    const eventKey = `${protocol}-event-${eventType}-${Date.now()}`;

    const handleEvent = (data) => {
      if (isMounted.current && data.type === eventType) {
        callback(data);
      }
    };

    ws.subscribe(eventKey, handleEvent);

    return () => {
      isMounted.current = false;
      ws.unsubscribe(eventKey);
    };
  }, [protocol, eventType, callback, ws]);
};

/**
 * Hook for Modbus real-time register updates
 * @param {string} deviceId - Device ID
 * @param {string} tenantId - Tenant ID
 */
export const useModbusRegisters = (deviceId, tenantId = null) => {
  const { data, ...rest } = useProtocolWebSocket("modbus", tenantId);
  const [registers, setRegisters] = useState({});
  const processedKeysRef = useRef(new Set());

  useEffect(() => {
    if (
      data &&
      data.type === "register_update" &&
      data.device_id === deviceId
    ) {
      const key = `${data.address}-${data.timestamp}`;
      // Prevent processing the same data multiple times
      if (processedKeysRef.current.has(key)) return;
      processedKeysRef.current.add(key);

      setRegisters((prev) => ({
        ...prev,
        [data.address]: {
          value: data.value,
          timestamp: data.timestamp,
        },
      }));
    }
  }, [data, deviceId]);

  return {
    registers,
    ...rest,
  };
};

/**
 * Hook for OPC-UA node value updates
 * @param {Array} nodeIds - Array of node IDs to monitor
 * @param {string} tenantId - Tenant ID
 */
export const useOPCUANodes = (nodeIds = [], tenantId = null) => {
  const { data, ...rest } = useProtocolWebSocket("opcua", tenantId);
  const [nodeValues, setNodeValues] = useState(new Map());
  const processedKeysRef = useRef(new Set());

  useEffect(() => {
    if (data && data.type === "node_value_update") {
      if (nodeIds.length === 0 || nodeIds.includes(data.node_id)) {
        const key = `${data.node_id}-${data.timestamp}`;
        if (processedKeysRef.current.has(key)) return;
        processedKeysRef.current.add(key);

        setNodeValues((prev) => {
          const updated = new Map(prev);
          updated.set(data.node_id, {
            value: data.value,
            timestamp: data.timestamp,
            quality: data.quality,
          });
          return updated;
        });
      }
    }
  }, [data, nodeIds]);

  return {
    nodeValues,
    ...rest,
  };
};

/**
 * Hook for DNP3 point updates
 * @param {string} outstationId - Outstation ID
 * @param {string} tenantId - Tenant ID
 */
export const useDNP3Points = (outstationId, tenantId = null) => {
  const { data, ...rest } = useProtocolWebSocket("dnp3", tenantId);
  const [points, setPoints] = useState({});
  const processedKeysRef = useRef(new Set());

  useEffect(() => {
    if (
      data &&
      data.type === "point_update" &&
      data.outstation_id === outstationId
    ) {
      const key = `${data.index}-${data.timestamp}`;
      if (processedKeysRef.current.has(key)) return;
      processedKeysRef.current.add(key);

      setPoints((prev) => ({
        ...prev,
        [data.index]: {
          value: data.value,
          timestamp: data.timestamp,
          quality: data.quality,
        },
      }));
    }
  }, [data, outstationId]);

  return {
    points,
    ...rest,
  };
};

/**
 * Hook for MQTT message stream
 * @param {Array} topics - Topics to filter (empty for all)
 * @param {string} tenantId - Tenant ID
 */
export const useMQTTMessages = (topics = [], tenantId = null) => {
  const { data, ...rest } = useProtocolWebSocket("mqtt", tenantId);
  const [messages, setMessages] = useState([]);
  const processedKeysRef = useRef(new Set());

  useEffect(() => {
    if (data && data.type === "message") {
      if (topics.length === 0 || topics.includes(data.topic)) {
        const key = `${data.topic}-${data.timestamp}`;
        if (processedKeysRef.current.has(key)) return;
        processedKeysRef.current.add(key);

        setMessages((prev) => [
          ...prev.slice(-100), // Keep last 100 messages
          {
            topic: data.topic,
            payload: data.payload,
            timestamp: data.timestamp,
            qos: data.qos,
          },
        ]);
      }
    }
  }, [data, topics]);

  const clearMessages = () => {
    processedKeysRef.current.clear();
    setMessages([]);
  };

  return {
    messages,
    clearMessages,
    ...rest,
  };
};

export default useProtocolWebSocket;
