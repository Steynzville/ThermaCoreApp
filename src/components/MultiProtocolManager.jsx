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
  const [selectedProtocol, setSelectedProtocol] = useState("modbus");
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({});
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
      const variance = () => Math.random() > 0.8;
      const mockVariant = {
        ...mockData,
        timestamp: new Date().toISOString(),
        protocols: {
          ...mockData.protocols,
          mqtt: {
            ...mockData.protocols.mqtt,
            connected: variance() ? false : mockData.protocols.mqtt.connected,
            metrics: {
              ...mockData.protocols.mqtt.metrics,
              messages_sent:
                mockData.protocols.mqtt.metrics.messages_sent +
                Math.floor(Math.random() * 10),
            },
          },
        },
      };
      return mockVariant;
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

      // BUG FIX: re-throw so callers (e.g. handleRefresh) can detect failure
      // instead of silently reporting success.
      throw error;
    } finally {
      if (isMounted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [consecutiveErrors, isMounted, isMockMode]);

  const handleRefresh = useCallback(async () => {
    if (refreshing || isPolling) return;

    setRefreshing(true);
    setConsecutiveErrors(0);

    try {
      await loadData();
      // BUG FIX: this now only runs when loadData actually resolves.
      toast.success("Protocol status refreshed", { duration: 2000 });
    } catch (_error) {
      // Error handling / toast is done in loadData; don't report success.
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, isPolling, loadData]);

  useEffect(() => {
    loadData().catch(() => {});

    let timeoutId = null;

    const getPollingInterval = () => {
      const baseInterval = 10000;
      const maxInterval = 60000;
      return Math.min(baseInterval * 1.5 ** consecutiveErrors, maxInterval);
    };

    const scheduleNextPoll = () => {
      const currentInterval = getPollingInterval();
      timeoutId = setTimeout(() => {
        if (isPageVisible && !isPolling && isMounted) {
          setIsPolling(true);
          loadData()
            .catch(() => {})
            .finally(() => {
              setIsPolling(false);
              scheduleNextPoll();
            });
        } else if (isMounted) {
          scheduleNextPoll();
        }
      }, currentInterval);
    };

    if (!isMockMode) {
      scheduleNextPoll();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [consecutiveErrors, isPageVisible, isPolling, isMounted, isMockMode, loadData]);

  const handleProtocolConfigure = useCallback((protocolName) => {
    switch (protocolName) {
      case "modbus":
        setSelectedModbusDevice({
          device_id: "default",
          host: "localhost",
          port: 502,
          unit_id: 1,
        });
        setModbusModalOpen(true);
        break;
      case "opcua":
        setOpcuaBrowserOpen(true);
        break;
      case "dnp3":
        setDnp3DashboardOpen(true);
        break;
      case "mqtt":
        setMqttPanelOpen(true);
        break;
      case "simulator":
        setSimulatorDialogOpen(true);
        break;
      default:
        break;
    }
  }, []);

  const getStatusIcon = (protocol) => {
    if (protocol.connected && protocol.status === "ready") {
      return (
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-[#00ff00]" />
      );
    } else if (protocol.error || protocol.status === "error") {
      return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
    } else if (protocol.available) {
      return (
        <Activity className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
      );
    } else {
      return <WifiOff className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusBadge = (protocol) => {
    if (protocol.connected && protocol.status === "ready") {
      return <Badge variant="default">Active</Badge>;
    } else if (protocol.error || protocol.status === "error") {
      return <Badge variant="destructive">Error</Badge>;
    } else if (protocol.available) {
      return <Badge variant="secondary">Available</Badge>;
    } else {
      return <Badge variant="outline">Inactive</Badge>;
    }
  };

  const handleAddDevice = () => {
    setNewDevice({});
    setIsAddDeviceOpen(false);
    toast.success(`New ${selectedProtocol} device configuration saved.`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-state">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary dark:text-primary-foreground" />
          <p className="text-lg text-muted-foreground">
            Loading protocol status...
          </p>
        </div>
      </div>
    );
  }

  if (!protocolsStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4" data-testid="error-state">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground dark:text-gray-100 mb-2">
            Failed to Load
          </h2>
          <p className="text-muted-foreground mb-4">
            {consecutiveErrors > 0
              ? `Failed to retrieve protocol status after ${consecutiveErrors} attempts.`
              : "Could not retrieve protocol status."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => loadData().catch(() => {})} disabled={isPolling}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isPolling ? "animate-spin" : ""}`}
              />
              {isPolling ? "Retrying..." : "Try Again"}
            </Button>
            {!isMockMode && (
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            )}
          </div>
          {consecutiveErrors > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              Next automatic retry in{" "}
              {Math.min(10 * 1.5 ** consecutiveErrors, 60)} seconds
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full transition-all duration-300">
      <div className="bg-background border-b border-border px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-[2000px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Router className="h-6 w-6 text-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Multi-Protocol Manager
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Monitor and manage industrial protocol connections
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {isMockMode && (
                <Badge variant="warning" className="font-semibold">
                  Demo Mode
                </Badge>
              )}
              {consecutiveErrors > 0 && (
                <Badge
                  variant="outline"
                  className="bg-destructive/10 text-destructive border-destructive/20"
                >
                  Retrying... ({consecutiveErrors} errors)
                </Badge>
              )}
              {!isPageVisible && (
                <Badge
                  variant="outline"
                  className="bg-muted text-muted-foreground border-border"
                >
                  Paused (tab inactive)
                </Badge>
              )}
              <Button
                onClick={handleRefresh}
                disabled={refreshing || isPolling}
                variant="outline"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing || isPolling ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6 pb-24">
        <div className="max-w-[2000px] mx-auto space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-300 truncate">
                      Total Protocols
                    </p>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {protocolsStatus.summary.total_protocols}
                    </p>
                  </div>
                  <Router className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-300 truncate">
                      Active Protocols
                    </p>
                    <p className="text-2xl font-extrabold text-green-600 dark:text-green-400 mt-1">
                      {protocolsStatus.summary.active_protocols}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 flex-shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-300 truncate">
                      Connection Rate
                    </p>
                    <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                      {protocolsStatus.summary.total_protocols > 0
                        ? Math.round(
                            (protocolsStatus.summary.active_protocols /
                              protocolsStatus.summary.total_protocols) *
                              100,
                          )
                        : 0}
                      %
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-300 truncate">
                      Last Updated
                    </p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100 break-words mt-1">
                      {new Date(protocolsStatus.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <Zap className="h-8 w-8 text-yellow-600 dark:text-yellow-300/80 flex-shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Object.entries(protocolsStatus.protocols).map(
              ([protocolName, protocol]) => (
                <Card key={protocolName}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 min-w-0 flex-1">
                        {getStatusIcon(protocol)}
                        <span className="truncate text-slate-900 dark:text-white font-bold text-lg">
                          {protocol.name.toUpperCase()}
                        </span>
                      </span>
                      {getStatusBadge(protocol)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm gap-2">
                        <span className="text-slate-500 dark:text-slate-300">
                          Status:
                        </span>
                        <span className="font-medium text-foreground dark:text-gray-200 truncate">
                          {protocol.status}
                        </span>
                      </div>

                      {protocol.version && (
                        <div className="flex justify-between text-sm gap-2">
                          <span className="text-slate-500 dark:text-slate-300">
                            Version:
                          </span>
                          <span className="font-medium text-foreground dark:text-gray-200 truncate">
                            {protocol.version}
                          </span>
                        </div>
                      )}

                      {protocol.last_heartbeat && (
                        <div className="flex justify-between text-sm gap-2">
                          <span className="text-slate-500 dark:text-slate-300">
                            Last Heartbeat:
                          </span>
                          <span className="font-medium text-foreground dark:text-gray-100 text-xs truncate">
                            {new Date(
                              protocol.last_heartbeat,
                            ).toLocaleTimeString()}
                          </span>
                        </div>
                      )}

                      {protocol.error && (
                        <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                          <p className="text-xs text-destructive font-medium break-words">
                            {protocol.error.code}
                          </p>
                          {protocol.error.message && (
                            <p className="text-xs text-destructive/80 break-words">
                              {protocol.error.message}
                            </p>
                          )}
                        </div>
                      )}

                      {protocol.metrics && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md" data-testid="metrics-container">
                          <p className="text-xs font-semibold text-slate-800 dark:text-gray-200 mb-1">
                            Metrics:
                          </p>
                          {Object.entries(protocol.metrics).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex justify-between text-xs text-slate-600 dark:text-slate-300 gap-2"
                              data-testid={`metric-${key}`}
                            >
                              <span className="truncate">
                                {key.replace(/_/g, " ")}:
                              </span>
                              <span className="font-medium text-slate-900 dark:text-white" data-testid={`metric-value-${key}`}>{value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 min-h-[44px] sm:min-h-0"
                          data-testid={`configure-${protocolName}`}
                          onClick={() => handleProtocolConfigure(protocolName)}
                        >
                          <Settings className="h-4 w-4 sm:h-3 sm:w-3 mr-1" />
                          <span className="truncate">Configure</span>
                        </Button>
                        {!protocol.connected && protocol.available && (
                          <Button
                            size="sm"
                            className="flex-1 min-h-[44px] sm:min-h-0"
                            data-testid={`connect-${protocolName}`}
                          >
                            <span className="truncate">Connect</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ),
            )}
          </div>

          <Button
            className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50"
            aria-label="Add new device"
            onClick={() => setWizardOpen(true)}
          >
            <Plus className="h-6 w-6" />
          </Button>

          <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
            <DialogContent className="max-w-md mx-4 sm:mx-auto">
              <DialogHeader>
                <DialogTitle className="break-words">
                  Add New {selectedProtocol.toUpperCase()} Device
                </DialogTitle>
                <DialogDescription className="break-words">
                  Configure a new device for {selectedProtocol} protocol
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="protocol">Protocol</Label>
                  <Select
                    value={selectedProtocol}
                    onValueChange={(value) => {
                      setSelectedProtocol(value);
                      setNewDevice({});
                    }}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {protocolsStatus.summary.supported_protocols.map(
                        (protocol) => (
                          <SelectItem key={protocol} value={protocol}>
                            {protocol.toUpperCase()}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="device-id">Device ID</Label>
                  <Input
                    id="device-id"
                    placeholder="e.g., pump_001"
                    value={newDevice.id || ""}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, id: e.target.value })
                    }
                    className="min-h-[44px]"
                  />
                </div>
                <div>
                  <Label htmlFor="host">Host/IP Address</Label>
                  <Input
                    id="host"
                    placeholder="192.168.1.100"
                    value={newDevice.host || ""}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, host: e.target.value })
                    }
                    className="min-h-[44px]"
                  />
                </div>
                <div>
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    placeholder="502"
                    value={newDevice.port || ""}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, port: e.target.value })
                    }
                    className="min-h-[44px]"
                  />
                </div>
                <Button
                  onClick={handleAddDevice}
                  className="w-full min-h-[44px]"
                >
                  Add Device
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <ModbusDeviceModal
            device={selectedModbusDevice}
            isOpen={modbusModalOpen}
            onClose={() => {
              setModbusModalOpen(false);
              setSelectedModbusDevice(null);
            }}
            onUpdate={loadData}
            tenantId={null}
          />

          <OPCUANodeBrowser
            isOpen={opcuaBrowserOpen}
            onClose={() => setOpcuaBrowserOpen(false)}
            tenantId={null}
          />

          <DNP3MonitoringDashboard
            isOpen={dnp3DashboardOpen}
            onClose={() => setDnp3DashboardOpen(false)}
            tenantId={null}
          />

          <MQTTManagementPanel
            isOpen={mqttPanelOpen}
            onClose={() => setMqttPanelOpen(false)}
            tenantId={null}
          />

          <ProtocolWizard
            isOpen={wizardOpen}
            onClose={() => setWizardOpen(false)}
            onSuccess={loadData}
            tenantId={null}
          />

          <Dialog
            open={simulatorDialogOpen}
            onOpenChange={setSimulatorDialogOpen}
          >
            <DialogContent className="max-w-md mx-4 sm:mx-auto">
              <DialogHeader>
                <DialogTitle className="break-words">
                  Simulator Configuration
                </DialogTitle>
                <DialogDescription className="break-words">
                  Adjust active data simulator settings for local units
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="sim-units">Simulation Units Count</Label>
                  <Input
                    id="sim-units"
                    type="number"
                    min="1"
                    max="50"
                    value={simulatorSettings.unitsCount}
                    onChange={(e) =>
                      setSimulatorSettings({
                        ...simulatorSettings,
                        unitsCount: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="min-h-[44px]"
                  />
                </div>
                <div>
                  <Label htmlFor="sim-sensors">Sensor Types Count</Label>
                  <Input
                    id="sim-sensors"
                    type="number"
                    min="1"
                    max="20"
                    value={simulatorSettings.sensorsCount}
                    onChange={(e) =>
                      setSimulatorSettings({
                        ...simulatorSettings,
                        sensorsCount: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="min-h-[44px]"
                  />
                </div>
                <div>
                  <Label htmlFor="sim-interval">Simulation Speed (ms)</Label>
                  <Input
                    id="sim-interval"
                    type="number"
                    min="100"
                    step="100"
                    value={simulatorSettings.speedMs}
                    onChange={(e) =>
                      setSimulatorSettings({
                        ...simulatorSettings,
                        speedMs: parseInt(e.target.value, 10) || 100,
                      })
                    }
                    className="min-h-[44px]"
                  />
                </div>
                <div>
                  <Label htmlFor="sim-noise">Noise Level (%)</Label>
                  <Input
                    id="sim-noise"
                    type="number"
                    min="0"
                    max="100"
                    value={simulatorSettings.noiseLevel}
                    onChange={(e) =>
                      setSimulatorSettings({
                        ...simulatorSettings,
                        noiseLevel: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="min-h-[44px]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 min-h-[44px]"
                    onClick={() => setSimulatorDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 min-h-[44px]"
                    onClick={() => {
                      setProtocolsStatus((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          protocols: {
                            ...prev.protocols,
                            simulator: {
                              ...prev.protocols.simulator,
                              status: "ready",
                              connected: true,
                              version: "1.0.0-simulator",
                              metrics: {
                                active_unit_states:
                                  simulatorSettings.unitsCount,
                                sensor_types_count:
                                  simulatorSettings.sensorsCount,
                                simulation_units_count:
                                  simulatorSettings.unitsCount,
                              },
                            },
                          },
                        };
                      });
                      setSimulatorDialogOpen(false);
                      toast.success(
                        "Simulator configuration updated successfully.",
                      );
                    }}
                  >
                    Save Config
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default MultiProtocolManager;
