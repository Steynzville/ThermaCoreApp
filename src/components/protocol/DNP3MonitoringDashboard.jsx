/**
 * DNP3 Monitoring Dashboard Component
 *
 * Provides outstation status, metrics, point configuration,
 * performance monitoring, and event buffer management.
 */

import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/use-media-query";
import { apiGetJson, apiPostJson } from "@/utils/apiFetch";

const DNP3MonitoringDashboard = ({ isOpen, onClose, tenantId }) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [outstations, setOutstations] = useState([]);
  const [selectedOutstation, setSelectedOutstation] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [events, _setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch DNP3 devices/outstations
  const fetchOutstations = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/v1/protocols/dnp3/devices${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      const data = await apiGetJson(url);

      if (data.devices && typeof data.devices === "object") {
        setOutstations(
          Object.entries(data.devices).map(([id, info]) => ({
            id,
            ...info,
          })),
        );
      }
    } catch (_error) {
      toast.error("Failed to load DNP3 outstations");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Fetch performance metrics
  const fetchPerformanceMetrics = useCallback(async () => {
    try {
      const url = `/api/v1/protocols/dnp3/performance/metrics${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      const data = await apiGetJson(url);
      setPerformanceMetrics(data);
    } catch (_error) {}
  }, [tenantId]);

  // Fetch device-specific performance
  const fetchDevicePerformance = async (deviceId) => {
    try {
      const url = `/api/v1/protocols/dnp3/devices/${deviceId}/performance${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      const data = await apiGetJson(url);
      return data;
    } catch (_error) {
      return null;
    }
  };

  // Perform integrity poll
  const performIntegrityPoll = async (deviceId) => {
    try {
      const url = `/api/v1/protocols/dnp3/devices/${deviceId}/integrity-poll${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      await apiPostJson(url);
      toast.success("Integrity poll completed");
      fetchOutstations();
    } catch (_error) {
      toast.error("Failed to perform integrity poll");
    }
  };

  // Select outstation and load details
  const selectOutstation = async (outstation) => {
    setSelectedOutstation(outstation);
    const perf = await fetchDevicePerformance(outstation.id);
    setSelectedOutstation({ ...outstation, performance: perf });
  };

  // Load data on open
  useEffect(() => {
    if (isOpen) {
      fetchOutstations();
      fetchPerformanceMetrics();

      // Auto-refresh every 10 minutes
      const interval = setInterval(() => {
        fetchOutstations();
        fetchPerformanceMetrics();
      }, 600000);

      return () => clearInterval(interval);
    }
  }, [isOpen, fetchOutstations, fetchPerformanceMetrics]);

  const getConnectionStatusBadge = (outstation) => {
    if (outstation.connected) {
      return (
        <Badge variant="default">
          <CheckCircle className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <AlertCircle className="h-3 w-3 mr-1" />
        Disconnected
      </Badge>
    );
  };

  if (!isDesktop) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>DNP3 Monitoring Dashboard</DrawerTitle>
            <DrawerDescription>
              Monitor outstation status, performance metrics, and data points
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 h-full overflow-y-auto">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <TabsTrigger value="overview" className="min-h-[38px] text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="outstations" className="min-h-[38px] text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  Outstations
                </TabsTrigger>
                <TabsTrigger value="performance" className="min-h-[38px] text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  Performance
                </TabsTrigger>
                <TabsTrigger value="events" className="min-h-[38px] text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  Events
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Total Outstations
                          </p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {outstations.length}
                          </p>
                        </div>
                        <Database className="h-8 w-8 text-primary" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Active
                          </p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {outstations.filter((o) => o.connected).length}
                          </p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Data Points
                          </p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {outstations.reduce(
                              (sum, o) => sum + (o.data_points || 0),
                              0,
                            )}
                          </p>
                        </div>
                        <Zap className="h-8 w-8 text-yellow-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Avg Response
                          </p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {performanceMetrics?.average_response_time
                              ? `${performanceMetrics.average_response_time}ms`
                              : "N/A"}
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white font-bold">System Health</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-600 dark:text-slate-300">Connection Rate</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {outstations.length > 0
                            ? Math.round(
                                (outstations.filter((o) => o.connected).length /
                                  outstations.length) *
                                  100,
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <Progress
                        value={
                          outstations.length > 0
                            ? (outstations.filter((o) => o.connected).length /
                                outstations.length) *
                              100
                            : 0
                        }
                      />
                    </div>

                    {performanceMetrics?.total_requests !== undefined && (
                      <div className="grid grid-cols-3 gap-4 pt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Total Requests
                          </p>
                          <p className="text-lg font-semibold">
                            {performanceMetrics.total_requests}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Successful
                          </p>
                          <p className="text-lg font-semibold text-green-600">
                            {performanceMetrics.successful_requests || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Errors
                          </p>
                          <p className="text-lg font-semibold text-destructive">
                            {performanceMetrics.failed_requests || 0}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Outstations Tab */}
              <TabsContent value="outstations" className="space-y-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Outstation List</h3>
                  <Button
                    size="sm"
                    onClick={fetchOutstations}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${
                        loading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </Button>
                </div>

                <div className="space-y-3">
                  {outstations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No outstations configured
                    </div>
                  ) : (
                    outstations.map((outstation) => (
                      <Card
                        key={outstation.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => selectOutstation(outstation)}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {outstation.name || `Outstation ${outstation.id}`}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {outstation.address}
                            </span>
                          </div>
                          {getConnectionStatusBadge(outstation)}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {selectedOutstation && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {selectedOutstation.name ||
                          `Outstation ${selectedOutstation.id}`}{" "}
                        Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Address:</span>
                        <span className="font-medium">
                          {selectedOutstation.address}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-medium">
                          {selectedOutstation.connected
                            ? "Connected"
                            : "Disconnected"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Data Points:
                        </span>
                        <span className="font-medium">
                          {selectedOutstation.data_points || 0}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          performIntegrityPoll(selectedOutstation.id)
                        }
                        className="w-full"
                      >
                        Perform Integrity Poll
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      System Performance Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Requests
                        </p>
                        <p className="text-xl font-bold">
                          {performanceMetrics?.total_requests || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Successful Requests
                        </p>
                        <p className="text-xl font-bold text-green-600">
                          {performanceMetrics?.successful_requests || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Failed Requests
                        </p>
                        <p className="text-xl font-bold text-destructive">
                          {performanceMetrics?.failed_requests || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Average Response Time
                        </p>
                        <p className="text-xl font-bold">
                          {performanceMetrics?.average_response_time
                            ? `${performanceMetrics.average_response_time}ms`
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Events Tab */}
              <TabsContent value="events" className="space-y-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Event Buffer</h3>
                  <Button
                    size="sm"
                    onClick={() => toast.info("Fetching events...")}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                <ScrollArea className="h-[400px] border rounded-lg p-4">
                  {events.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No recent events
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {events.map((event) => (
                        <div
                          key={`${event.type}-${event.timestamp}-${Math.random().toString(36).substr(2, 6)}`}
                          className="p-3 border rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium text-primary">
                              {event.type}
                            </span>
                            <Badge variant="outline">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {event.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] w-full overflow-y-auto">
        <DialogHeader>
          <DialogTitle>DNP3 Monitoring Dashboard</DialogTitle>
          <DialogDescription>
            Monitor outstation status, performance metrics, and data points
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <TabsTrigger value="overview" className="min-h-[38px] text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
              Overview
            </TabsTrigger>
            <TabsTrigger value="outstations" className="min-h-[38px] text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
              Outstations
            </TabsTrigger>
            <TabsTrigger value="performance" className="min-h-[38px] text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
              Performance
            </TabsTrigger>
            <TabsTrigger value="events" className="min-h-[38px] text-slate-600 dark:text-slate-300 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
              Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Total Outstations
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{outstations.length}</p>
                    </div>
                    <Database className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {outstations.filter((o) => o.connected).length}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Data Points
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {outstations.reduce(
                          (sum, o) => sum + (o.data_points || 0),
                          0,
                        )}
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Avg Response
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {performanceMetrics?.average_response_time
                          ? `${performanceMetrics.average_response_time}ms`
                          : "N/A"}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white font-bold">System Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Connection Rate</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {outstations.length > 0
                        ? Math.round(
                            (outstations.filter((o) => o.connected).length /
                              outstations.length) *
                              100,
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      outstations.length > 0
                        ? (outstations.filter((o) => o.connected).length /
                            outstations.length) *
                          100
                        : 0
                    }
                  />
                </div>

                {performanceMetrics?.total_requests !== undefined && (
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Total Requests
                      </p>
                      <p className="text-lg font-semibold">
                        {performanceMetrics.total_requests}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Successful
                      </p>
                      <p className="text-lg font-semibold text-green-600">
                        {performanceMetrics.successful_requests || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Errors</p>
                      <p className="text-lg font-semibold text-destructive">
                        {performanceMetrics.failed_requests || 0}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outstations" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Outstation List</h3>
              <Button size="sm" onClick={fetchOutstations} disabled={loading}>
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {outstations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No outstations configured
                  </div>
                ) : (
                  outstations.map((outstation) => (
                    <Card
                      key={outstation.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => selectOutstation(outstation)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{outstation.id}</h4>
                              {getConnectionStatusBadge(outstation)}
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">
                                  Master Addr
                                </p>
                                <p className="font-medium">
                                  {outstation.master_address || "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Outstation Addr
                                </p>
                                <p className="font-medium">
                                  {outstation.outstation_address || "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Data Points
                                </p>
                                <p className="font-medium">
                                  {outstation.data_points || 0}
                                </p>
                              </div>
                            </div>

                            {outstation.last_poll && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Last poll:{" "}
                                {new Date(
                                  outstation.last_poll,
                                ).toLocaleString()}
                              </p>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              performIntegrityPoll(outstation.id);
                            }}
                          >
                            Integrity Poll
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performanceMetrics ? (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Response Time
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs">Average</span>
                            <span className="text-sm font-medium">
                              {performanceMetrics.average_response_time || 0}ms
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs">Min</span>
                            <span className="text-sm font-medium">
                              {performanceMetrics.min_response_time || 0}ms
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs">Max</span>
                            <span className="text-sm font-medium">
                              {performanceMetrics.max_response_time || 0}ms
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Request Stats
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs">Total</span>
                            <span className="text-sm font-medium">
                              {performanceMetrics.total_requests || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs">Success Rate</span>
                            <span className="text-sm font-medium text-green-600">
                              {performanceMetrics.total_requests > 0
                                ? Math.round(
                                    ((performanceMetrics.successful_requests ||
                                      0) /
                                      performanceMetrics.total_requests) *
                                      100,
                                  )
                                : 0}
                              %
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs">Errors</span>
                            <span className="text-sm font-medium text-destructive">
                              {performanceMetrics.failed_requests || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No performance data available
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedOutstation?.performance && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Device Performance: {selectedOutstation.id}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">Scan Rate</p>
                      <p className="text-xl font-bold">
                        {selectedOutstation.performance.scan_rate || 0}/s
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">Latency</p>
                      <p className="text-xl font-bold">
                        {selectedOutstation.performance.latency || 0}ms
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Error Rate
                      </p>
                      <p className="text-xl font-bold">
                        {selectedOutstation.performance.error_rate || 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Event Buffer</h3>
              <Badge variant="outline">{events.length} events</Badge>
            </div>

            <ScrollArea className="h-[500px]">
              {events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No events recorded
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div
                      key={`${event.type}-${event.timestamp}-${Math.random().toString(36).substr(2, 6)}`}
                      className="p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{event.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.description}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DNP3MonitoringDashboard;
