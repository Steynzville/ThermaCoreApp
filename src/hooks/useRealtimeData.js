import { useEffect, useMemo, useState } from "react";
import { useUnits } from "../context/UnitContext";
import { metricsForUnits } from "../utils/portfolioAnalytics";
import websocketService from "../services/websocketService";
export function useWebSocketStatus() {
  const [status, setStatus] = useState(websocketService.getStatus());
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  useEffect(
    () =>
      websocketService.onStatusChange((next) => {
        setStatus(next);
        if (next === "connected") setLastHeartbeat(Date.now());
      }),
    [],
  );
  return {
    status,
    isConnected: status === "connected",
    isReconnecting: status === "reconnecting",
    lastHeartbeat,
  };
}
export function useRealtimeMetrics() {
  const { units, loading, error, isDemoMode } = useUnits();
  const connection = useWebSocketStatus();
  const metrics = useMemo(() => metricsForUnits(units), [units]);
  return {
    metrics,
    loading,
    error,
    connectionStatus: isDemoMode ? "demo" : connection.status,
    isConnected: connection.isConnected,
  };
}
