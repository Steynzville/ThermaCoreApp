/**
 * Modbus Device Configuration Modal
 *
 * Provides detailed device configuration, register management,
 * real-time value display, and connection health indicators.
 */

import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Settings,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/use-media-query";
import { apiGetJson, apiPostJson } from "@/utils/apiFetch";

const ModbusDeviceModal = ({ device, isOpen, onClose, tenantId }) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [deviceData, setDeviceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registers, setRegisters] = useState([]);
  const [_editMode, _setEditMode] = useState(false);
  const [registerToRead, setRegisterToRead] = useState({
    address: 0,
    count: 1,
  });
  const [registerToWrite, setRegisterToWrite] = useState({
    address: 0,
    value: 0,
  });

  // Fetch device details
  const fetchDeviceData = useCallback(async () => {
    if (!device?.device_id) return;

    setLoading(true);
    try {
      const url = `/api/v1/protocols/modbus/devices/${device.device_id}/data${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      const data = await apiGetJson(url);
      setDeviceData(data);

      // Extract registers from data
      if (data.readings) {
        setRegisters(
          Object.values(data.readings).map((reading) => ({
            address: reading.address,
            value: reading.processed_value !== undefined ? reading.processed_value : (Array.isArray(reading.raw_value) ? reading.raw_value[0] : reading.raw_value),
            name: reading.name,
            type: reading.type,
            timestamp: reading.timestamp || data.timestamp || new Date().toISOString(),
          }))
        );
      } else if (data.registers) {
        if (Array.isArray(data.registers)) {
          setRegisters(
            data.registers.map((reg) => ({
              address: reg.address,
              value: typeof reg.value === "boolean" ? (reg.value ? 1 : 0) : reg.value,
              name: reg.name,
              type: reg.type,
              timestamp: data.timestamp || new Date().toISOString(),
            }))
          );
        } else {
          setRegisters(
            Object.entries(data.registers).map(([address, value]) => ({
              address: parseInt(address, 10),
              value,
              timestamp: data.timestamp || new Date().toISOString(),
            })),
          );
        }
      }
    } catch (_error) {
      toast.error("Failed to load device details");
    } finally {
      setLoading(false);
    }
  }, [device?.device_id, tenantId]);

  // Read register values
  const handleReadRegister = async () => {
    try {
      const url = `/api/v1/protocols/modbus/devices/${device.device_id}/read${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      const _data = await apiPostJson(url, {
        address: registerToRead.address,
        count: registerToRead.count,
        register_type: "holding_register",
      });

      toast.success("Registers read successfully");
      fetchDeviceData();
    } catch (_error) {
      toast.error("Failed to read registers");
    }
  };

  // Write register value
  const handleWriteRegister = async () => {
    try {
      const url = `/api/v1/protocols/modbus/devices/${device.device_id}/write${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      await apiPostJson(url, {
        address: registerToWrite.address,
        value: registerToWrite.value,
        register_type: "holding_register",
      });

      toast.success("Register written successfully");
      fetchDeviceData();
    } catch (_error) {
      toast.error("Failed to write register");
    }
  };

  // Auto-refresh when modal opens
  useEffect(() => {
    if (isOpen && device) {
      fetchDeviceData();

      // Set up auto-refresh every 10 minutes
      const interval = setInterval(fetchDeviceData, 600000);
      return () => clearInterval(interval);
    }
  }, [isOpen, device, fetchDeviceData]);

  const getConnectionStatus = () => {
    if (!deviceData)
      return { color: "gray", text: "Unknown", icon: AlertCircle };

    if (deviceData.connected) {
      return { color: "green", text: "Connected", icon: CheckCircle };
    }
    return { color: "red", text: "Disconnected", icon: AlertCircle };
  };

  const status = getConnectionStatus();

  if (!isDesktop) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader className="text-left">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="text-xl">
                  Modbus Device: {device?.device_id || "Unknown"}
                </DrawerTitle>
                <DrawerDescription>
                  {device?.host}:{device?.port || 502} (Unit ID:{" "}
                  {device?.unit_id || 1})
                </DrawerDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={status.color === "green" ? "default" : "destructive"}
                >
                  <status.icon className="h-3 w-3 mr-1" />
                  {status.text}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchDeviceData}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>
          </DrawerHeader>

          <div className="p-4 h-full overflow-y-auto">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <TabsTrigger value="overview" className="text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">Overview</TabsTrigger>
                <TabsTrigger value="registers" className="text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">Registers</TabsTrigger>
                <TabsTrigger value="read" className="text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">Read</TabsTrigger>
                <TabsTrigger value="write" className="text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">Write</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
                        Connection
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{status.text}</p>
                    {deviceData?.last_poll && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Last poll:{" "}
                        {new Date(deviceData.last_poll).toLocaleTimeString()}
                      </p>
                    )}
                  </div>

                  <div className="p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
                        Registers
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{registers.length}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Total configured
                    </p>
                  </div>

                  <div className="p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
                        Protocol
                      </span>
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">Modbus TCP</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Unit ID: {device?.unit_id || 1}
                    </p>
                  </div>

                  <div className="p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
                        Response Time
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {deviceData?.response_time
                        ? `${deviceData.response_time}ms`
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {deviceData?.error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm font-medium text-destructive">
                      Error: {deviceData.error}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="registers" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Register Values</h3>
                  <Button
                    size="sm"
                    onClick={fetchDeviceData}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>

                <div className="max-h-96 overflow-y-auto pr-1">
                  {registers.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No register data available
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {registers.map((register) => (
                        <div
                          key={register.address}
                          className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                {register.name || `Address ${register.address}`}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Address {register.address} {register.type ? `(${register.type})` : ""}
                              </span>
                            </div>
                            <span className="text-lg font-bold text-slate-950 dark:text-slate-50 ml-2">
                              {register.value}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {register.timestamp && !isNaN(new Date(register.timestamp).getTime())
                              ? new Date(register.timestamp).toLocaleTimeString()
                              : "N/A"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="read" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Read Registers</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="read-address">Start Address</Label>
                      <Input
                        id="read-address"
                        type="number"
                        value={registerToRead.address}
                        onChange={(e) =>
                          setRegisterToRead({
                            ...registerToRead,
                            address: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="read-count">Count</Label>
                      <Input
                        id="read-count"
                        type="number"
                        value={registerToRead.count}
                        onChange={(e) =>
                          setRegisterToRead({
                            ...registerToRead,
                            count: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        placeholder="1"
                      />
                    </div>
                  </div>
                  <Button onClick={handleReadRegister} disabled={loading}>
                    Read Registers
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="write" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Write Register</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="write-address">Address</Label>
                      <Input
                        id="write-address"
                        type="number"
                        value={registerToWrite.address}
                        onChange={(e) =>
                          setRegisterToWrite({
                            ...registerToWrite,
                            address: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="write-value">Value</Label>
                      <Input
                        id="write-value"
                        type="number"
                        value={registerToWrite.value}
                        onChange={(e) =>
                          setRegisterToWrite({
                            ...registerToWrite,
                            value: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <Button onClick={handleWriteRegister} disabled={loading}>
                    Write Register
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-full">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Modbus Device: {device?.device_id || "Unknown"}
              </DialogTitle>
              <DialogDescription>
                {device?.host}:{device?.port || 502} (Unit ID:{" "}
                {device?.unit_id || 1})
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={status.color === "green" ? "default" : "destructive"}
              >
                <status.icon className="h-3 w-3 mr-1" />
                {status.text}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchDeviceData}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <TabsTrigger value="overview" className="text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">Overview</TabsTrigger>
            <TabsTrigger value="registers" className="text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">Registers</TabsTrigger>
            <TabsTrigger value="read" className="text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">Read</TabsTrigger>
            <TabsTrigger value="write" className="text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">Write</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
                    Connection
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{status.text}</p>
                {deviceData?.last_poll && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Last poll:{" "}
                    {new Date(deviceData.last_poll).toLocaleTimeString()}
                  </p>
                )}
              </div>

              <div className="p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
                    Registers
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{registers.length}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Total configured
                </p>
              </div>

              <div className="p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
                    Protocol
                  </span>
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">Modbus TCP</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Unit ID: {device?.unit_id || 1}
                </p>
              </div>

              <div className="p-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
                    Response Time
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {deviceData?.response_time
                    ? `${deviceData.response_time}ms`
                    : "N/A"}
                </p>
              </div>
            </div>

            {deviceData?.error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm font-medium text-destructive">
                  Error: {deviceData.error}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="registers" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Register Values</h3>
              <Button size="sm" onClick={fetchDeviceData} disabled={loading}>
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto pr-1">
              {registers.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No register data available
                </div>
              ) : (
                <div className="space-y-2">
                  {registers.map((register) => (
                    <div
                      key={register.address}
                      className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {register.name || `Address ${register.address}`}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Address {register.address} {register.type ? `(${register.type})` : ""}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-slate-950 dark:text-slate-50 ml-2">
                          {register.value}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {register.timestamp && !isNaN(new Date(register.timestamp).getTime())
                          ? new Date(register.timestamp).toLocaleTimeString()
                          : "N/A"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="read" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Read Registers</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="read-address">Start Address</Label>
                  <Input
                    id="read-address"
                    type="number"
                    value={registerToRead.address}
                    onChange={(e) =>
                      setRegisterToRead({
                        ...registerToRead,
                        address: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="read-count">Count</Label>
                  <Input
                    id="read-count"
                    type="number"
                    value={registerToRead.count}
                    onChange={(e) =>
                      setRegisterToRead({
                        ...registerToRead,
                        count: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    placeholder="1"
                  />
                </div>
              </div>

              <Button onClick={handleReadRegister} className="w-full">
                Read Registers
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="write" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Write Register</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="write-address">Address</Label>
                  <Input
                    id="write-address"
                    type="number"
                    value={registerToWrite.address}
                    onChange={(e) =>
                      setRegisterToWrite({
                        ...registerToWrite,
                        address: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="write-value">Value</Label>
                  <Input
                    id="write-value"
                    type="number"
                    value={registerToWrite.value}
                    onChange={(e) =>
                      setRegisterToWrite({
                        ...registerToWrite,
                        value: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  <strong>Warning:</strong> Writing to registers can affect
                  device operation. Ensure you know the correct address and
                  value.
                </p>
              </div>

              <Button
                onClick={handleWriteRegister}
                variant="destructive"
                className="w-full"
              >
                Write Register
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ModbusDeviceModal;
