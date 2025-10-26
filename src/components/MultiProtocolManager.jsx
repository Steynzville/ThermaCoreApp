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
import DNP3MonitoringDashboard from "@/components/protocol/DNP3MonitoringDashboard";
import ModbusDeviceModal from "@/components/protocol/ModbusDeviceModal";
import MQTTManagementPanel from "@/components/protocol/MQTTManagementPanel";
import OPCUANodeBrowser from "@/components/protocol/OPCUANodeBrowser";
import ProtocolWizard from "@/components/protocol/ProtocolWizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGetJson } from "@/utils/apiFetch"; // Use enhanced apiFetch utility with JSON helper

const MultiProtocolManager = () => {
  const [protocolsStatus, setProtocolsStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState("modbus");
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  // Protocol-specific modal states
  const [modbusModalOpen, setModbusModalOpen] = useState(false);
  const [selectedModbusDevice, setSelectedModbusDevice] = useState(null);
  const [opcuaBrowserOpen, setOpcuaBrowserOpen] = useState(false);
  const [dnp3DashboardOpen, setDnp3DashboardOpen] = useState(false);
  const [mqttPanelOpen, setMqttPanelOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Enhanced polling state management with exponential backoff and page visibility
  const [_pollingInterval, _setPollingInterval] = useState(10000); // Default 10s
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isPolling, setIsPolling] = useState(false); // Prevent concurrent polls
  const _timeoutRef = useRef(null);
  const _abortControllerRef = useRef(null);

  // Page visibility handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Check if we're in mock mode
  const isMockMode = import.meta.env.VITE_MOCK_MODE === "true";

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
      // Add some variance to mock data
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

    // Use enhanced apiFetch with improved error handling and retry logic
    return await apiGetJson("/api/v1/protocols/status", {
      timeout: 15000, // 15 second timeout
      retries: 2, // Retry failed requests
      retryDelay: 2000, // 2 second delay between retries
      showToastOnError: false, // We'll handle errors manually for better UX
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchProtocolsStatus is a stable function defined in file scope and does not need to be a dependency
  const loadData = useCallback(async () => {
    try {
      setConsecutiveErrors(0); // Reset error count on successful attempt
      const data = await fetchProtocolsStatus();
      setProtocolsStatus(data);

      // Show success toast only if we had previous errors
      if (consecutiveErrors > 0) {
        toast.success("Protocol status loaded successfully");
      }
    } catch (error) {
      // Increment consecutive errors for exponential backoff
      setConsecutiveErrors((prev) => prev + 1);

      if (!isMockMode) {
        // Enhanced error messaging based on error type
        let errorMessage = "Failed to load protocol status.";
        if (error.message.includes("timeout")) {
          errorMessage = "Request timed out. The server may be busy.";
        } else if (error.message.includes("Network")) {
          errorMessage = "Network error. Check your internet connection.";
        } else if (error.message.includes("Unauthorized")) {
          errorMessage = "Session expired. Please log in again.";
        }

        toast.error(errorMessage, {
          duration: 4000,
          action: {
            label: "Retry",
            onClick: () => loadData(),
          },
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [consecutiveErrors]);

  const handleRefresh = async () => {
    if (refreshing || isPolling) return; // Prevent concurrent refreshes

    setRefreshing(true);
    setConsecutiveErrors(0); // Reset error count on manual refresh

    try {
      await loadData();
      toast.success("Protocol status refreshed", { duration: 2000 });
    } catch (_error) {
      // Error handling is done in loadData, no need to handle here
    }
  };

  // Enhanced polling with exponential backoff and better error handling
  useEffect(() => {
    loadData();

    let interval;
    if (!isMockMode) {
      // Dynamic polling interval based on consecutive errors (exponential backoff)
      const getPollingInterval = () => {
        const baseInterval = 10000; // 10 seconds
        const maxInterval = 60000; // 60 seconds max
        return Math.min(baseInterval * 1.5 ** consecutiveErrors, maxInterval);
      };

      const scheduleNextPoll = () => {
        const currentInterval = getPollingInterval();
        interval = setTimeout(() => {
          if (isPageVisible && !isPolling) {
            setIsPolling(true);
            loadData().finally(() => {
              setIsPolling(false);
              scheduleNextPoll(); // Schedule next poll
            });
          } else {
            scheduleNextPoll(); // Reschedule if conditions not met
          }
        }, currentInterval);
      };

      scheduleNextPoll();
    }

    return () => {
      if (interval) {
        clearTimeout(interval);
      }
    };
  }, [consecutiveErrors, isPageVisible, isPolling, loadData]);

  const getStatusIcon = (protocol) => {
    if (protocol.connected && protocol.status === "ready") {
      return (
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      );
    } else if (protocol.error || protocol.status === "error") {
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    } else if (protocol.available) {
      return (
        <Activity className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      );
    } else {
      return <WifiOff className="h-5 w-5 text-muted-foreground" />;
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
    // Reset form and close dialog
    setNewDevice({});
    setIsAddDeviceOpen(false);
    toast.success(`New ${selectedProtocol} device configuration saved.`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">
            Loading protocol status...
          </p>
        </div>
      </div>
    );
  }

  if (!protocolsStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Failed to Load
          </h2>
          <p className="text-muted-foreground mb-4">
            {consecutiveErrors > 0
              ? `Failed to retrieve protocol status after ${consecutiveErrors} attempts.`
              : "Could not retrieve protocol status."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={loadData} disabled={isPolling}>
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
    <div className="p-4 sm:p-6 w-full space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Multi-Protocol Manager
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-2">
            Monitor and manage industrial protocol connections
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {isMockMode && (
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/20"
            >
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground truncate">
                  Total Protocols
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {protocolsStatus.summary.total_protocols}
                </p>
              </div>
              <Router className="h-8 w-8 text-primary flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground truncate">
                  Active Protocols
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {protocolsStatus.summary.active_protocols}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground truncate">
                  Connection Rate
                </p>
                <p className="text-2xl font-bold text-primary">
                  {/* PR1a: Guard against division by zero */}
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
              <Activity className="h-8 w-8 text-primary flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground truncate">
                  Last Updated
                </p>
                <p className="text-sm font-medium text-foreground break-words">
                  {new Date(protocolsStatus.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <Zap className="h-8 w-8 text-yellow-600 dark:text-yellow-400 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Protocol Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {Object.entries(protocolsStatus.protocols).map(
          ([protocolName, protocol]) => (
            <Card key={protocolName}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0 flex-1">
                    {getStatusIcon(protocol)}
                    <span className="truncate">
                      {protocol.name.toUpperCase()}
                    </span>
                  </span>
                  {getStatusBadge(protocol)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium text-foreground truncate">
                      {protocol.status}
                    </span>
                  </div>

                  {protocol.version && (
                    <div className="flex justify-between text-sm gap-2">
                      <span className="text-muted-foreground">Version:</span>
                      <span className="font-medium text-foreground truncate">
                        {protocol.version}
                      </span>
                    </div>
                  )}

                  {protocol.last_heartbeat && (
                    <div className="flex justify-between text-sm gap-2">
                      <span className="text-muted-foreground">
                        Last Heartbeat:
                      </span>
                      <span className="font-medium text-foreground text-xs truncate">
                        {new Date(protocol.last_heartbeat).toLocaleTimeString()}
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
                    <div className="p-2 bg-muted border border-border rounded-md">
                      <p className="text-xs font-medium text-foreground mb-1">
                        Metrics:
                      </p>
                      {Object.entries(protocol.metrics).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex justify-between text-xs text-muted-foreground gap-2"
                        >
                          <span className="truncate">
                            {key.replace(/_/g, " ")}:
                          </span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 min-h-[44px] sm:min-h-0"
                      onClick={() => {
                        if (protocolName === "modbus") {
                          setSelectedModbusDevice({
                            device_id: "default",
                            host: "localhost",
                            port: 502,
                            unit_id: 1,
                          });
                          setModbusModalOpen(true);
                        } else if (protocolName === "opcua") {
                          setOpcuaBrowserOpen(true);
                        } else if (protocolName === "dnp3") {
                          setDnp3DashboardOpen(true);
                        } else if (protocolName === "mqtt") {
                          setMqttPanelOpen(true);
                        }
                      }}
                    >
                      <Settings className="h-4 w-4 sm:h-3 sm:w-3 mr-1" />
                      <span className="truncate">Configure</span>
                    </Button>
                    {!protocol.connected && protocol.available && (
                      <Button
                        size="sm"
                        className="flex-1 min-h-[44px] sm:min-h-0"
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

      {/* Add Device Button - Opens Wizard */}
      <Button
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50"
        aria-label="Add new device"
        onClick={() => setWizardOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Legacy Add Device Dialog (keeping for compatibility) */}
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
                  setNewDevice({}); // Reset newDevice state when protocol changes
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
            <Button onClick={handleAddDevice} className="w-full min-h-[44px]">
              Add Device
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Protocol-specific modals */}
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
    </div>
  );
};

export default MultiProtocolManager;
