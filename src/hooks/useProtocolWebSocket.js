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
 * @param {Function} onData - Optional callback invoked for every raw message
 * @returns {Object} WebSocket state and methods
 */
export const useProtocolWebSocket = (
  protocol,
  tenantId = null,
  autoConnect = true,
  onData = null,
) => {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

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
        // Call the optional onData callback for every raw message
        onDataRef.current?.(newData);
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
  const [registers, setRegisters] = useState({});
  const processedKeysRef = useRef(new Set());

  const handleRaw = useCallback((raw) => {
    if (
      raw &&
      raw.type === "register_update" &&
      raw.device_id === deviceId
    ) {
      const key = `${raw.address}-${raw.timestamp}`;
      if (processedKeysRef.current.has(key)) return;
      processedKeysRef.current.add(key);

      setRegisters((prev) => ({
        ...prev,
        [raw.address]: {
          value: raw.value,
          timestamp: raw.timestamp,
        },
      }));
    }
  }, [deviceId]);

  const { data, ...rest } = useProtocolWebSocket("modbus", tenantId, true, handleRaw);

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
  const [nodeValues, setNodeValues] = useState(new Map());
  const processedKeysRef = useRef(new Set());
  const nodeIdsRef = useRef(nodeIds);
  nodeIdsRef.current = nodeIds;

  const handleRaw = useCallback((raw) => {
    if (raw && raw.type === "node_value_update") {
      const currentNodeIds = nodeIdsRef.current;
      if (currentNodeIds.length > 0 && !currentNodeIds.includes(raw.node_id)) return;

      const key = `${raw.node_id}-${raw.timestamp}`;
      if (processedKeysRef.current.has(key)) return;
      processedKeysRef.current.add(key);

      setNodeValues((prev) => {
        const updated = new Map(prev);
        updated.set(raw.node_id, {
          value: raw.value,
          timestamp: raw.timestamp,
          quality: raw.quality,
        });
        return updated;
      });
    }
  }, []);

  const { data, ...rest } = useProtocolWebSocket("opcua", tenantId, true, handleRaw);

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
  const [points, setPoints] = useState({});
  const processedKeysRef = useRef(new Set());

  const handleRaw = useCallback((raw) => {
    if (
      raw &&
      raw.type === "point_update" &&
      raw.outstation_id === outstationId
    ) {
      const key = `${raw.index}-${raw.timestamp}`;
      if (processedKeysRef.current.has(key)) return;
      processedKeysRef.current.add(key);

      setPoints((prev) => ({
        ...prev,
        [raw.index]: {
          value: raw.value,
          timestamp: raw.timestamp,
          quality: raw.quality,
        },
      }));
    }
  }, [outstationId]);

  const { data, ...rest } = useProtocolWebSocket("dnp3", tenantId, true, handleRaw);

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
  const [messages, setMessages] = useState([]);
  const processedKeysRef = useRef(new Set());
  const topicsRef = useRef(topics);
  topicsRef.current = topics;

  const handleRaw = useCallback((raw) => {
    if (!raw || raw.type !== "message") return;

    const currentTopics = topicsRef.current;
    if (currentTopics.length > 0 && !currentTopics.includes(raw.topic)) return;

    const key = `${raw.topic}-${raw.timestamp}`;
    if (processedKeysRef.current.has(key)) return;
    processedKeysRef.current.add(key);

    setMessages((prev) => {
      const newMessage = {
        topic: raw.topic,
        payload: raw.payload,
        timestamp: raw.timestamp,
        qos: raw.qos,
      };
      // Keep last 100 messages: keep 99 existing + add the new one = 100 total
      const trimmed = prev.slice(-99);
      return [...trimmed, newMessage];
    });
  }, []);

  const { data, ...rest } = useProtocolWebSocket("mqtt", tenantId, true, handleRaw);

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
