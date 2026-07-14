import {
  Activity,
  AlertCircle,
  CheckCircle,
  Plus,
  RefreshCw,
  Router,
  Settings,
  WifiOff,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import DNP3MonitoringDashboard from "./protocol/DNP3MonitoringDashboard";
import ModbusDeviceModal from "./protocol/ModbusDeviceModal";
import MQTTManagementPanel from "./protocol/MQTTManagementPanel";
import OPCUANodeBrowser from "./protocol/OPCUANodeBrowser";
import ProtocolWizard from "./protocol/ProtocolWizard";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { apiGetJson } from "../utils/apiFetch";

const MultiProtocolManager = () => {
  const [protocolsStatus, setProtocolsStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modbusModalOpen, setModbusModalOpen] = useState(false);
  const [selectedModbusDevice, setSelectedModbusDevice] = useState(null);
  const [opcuaBrowserOpen, setOpcuaBrowserOpen] = useState(false);
  const [dnp3DashboardOpen, setDnp3DashboardOpen] = useState(false);
  const [mqttPanelOpen, setMqttPanelOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [simulatorDialogOpen, setSimulatorDialogOpen] = useState(false);
  const [simulatorSettings, setSimulatorSettings] = useState({
    unitsCount: 5,
    sensorsCount: 4,
    speedMs: 1000,
    noiseLevel: 5,
  });

  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  // Page visibility handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      setIsMounted(false);
    };
  }, []);

  // Check if we're in mock mode
  const isMockMode =
    import.meta.env.VITE_MOCK_MODE === "true" || import.meta.env.DEV;

  const mockData = {
    timestamp: new Date().toISOString(),
    summary: {
      total_protocols: 5,
      active_protocols: 3,
      supported_protocols: ["mqtt", "opcua", "modbus", "dnp3", "simulator"],
    },
    protocols: {
      mqtt: {
        name: "mqtt",
        available: true,
        connected: true,
        status: "ready",
        last_heartbeat: new Date(Date.now() - 30000).toISOString(),
        version: "3.1.1",
        metrics: { messages_sent: 1247, messages_received: 2156 },
        demo: true,
      },
      opcua: {
        name: "opcua",
        available: true,
        connected: false,
        status: "error",
        error: { code: "CONNECTION_REFUSED", message: "Server unreachable" },
        version: "1.04",
        demo: true,
      },
      modbus: {
        name: "modbus",
        available: true,
        connected: true,
        status: "ready",
        last_heartbeat: new Date(Date.now() - 15000).toISOString(),
        metrics: { active_devices: 2, total_registers: 48 },
        demo: true,
      },
      dnp3: {
        name: "dnp3",
        available: true,
        connected: true,
        status: "ready",
        last_heartbeat: new Date(Date.now() - 45000).toISOString(),
        metrics: { active_outstations: 1, data_points: 24 },
        demo: true,
      },
      simulator: {
        name: "simulator",
        available: false,
        connected: false,
        status: "not_initialized",
      },
    },
  };

  const fetchProtocolsStatus = async () => {
    if (isMockMode) {
      // FIXED: Removed random connection flapping - only increment message count
      return {
        ...mockData,
        timestamp: new Date().toISOString(),
        protocols: {
          ...mockData.protocols,
          mqtt: {
            ...mockData.protocols.mqtt,
            metrics: {
              ...mockData.protocols.mqtt.metrics,
              messages_sent:
                mockData.protocols.mqtt.metrics.messages_sent +
                Math.floor(Math.random() * 10),
            },
          },
        },
      };
    }

    return await apiGetJson("/api/v1/protocols/status", {
      timeout: 15000,
      retries: 2,
      retryDelay: 2000,
      showToastOnError: false,
    });
  };

  const loadData = useCallback(async () => {
    if (!isMounted) return;

    try {
      setConsecutiveErrors(0);
      const data = await fetchProtocolsStatus();

      if (isMounted) {
        setProtocolsStatus(data);
        setLoading(false);

        if (consecutiveErrors > 0) {
          toast.success("Protocol status loaded successfully");
        }
      }
    } catch (error) {
      if (!isMounted) return;

      setConsecutiveErrors((prev) => prev + 1);

      if (!isMockMode) {
        let errorMessage = "Failed to load protocol status.";
        if (error.message?.includes("timeout")) {
          errorMessage = "Request timed out. The server may be busy.";
        } else if (error.message?.includes("Network")) {
          errorMessage = "Network error. Check your internet connection.";
        } else if (error.message?.includes("Unauthorized")) {
          errorMessage = "Session expired. Please log in again.";
        }

        if (import.meta.env.MODE !== "test") {
          toast.error(errorMessage, {
            duration: 4000,
            action: {
              label: "Retry",
              onClick: () => loadData(),
            },
          });
        }
      }

      throw error;
    } finally {
      if (isMounted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [isMounted, isMockMode]);

  // ... rest of the component remains the same ...
