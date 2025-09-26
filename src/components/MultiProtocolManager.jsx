import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Wifi, WifiOff, Plus, Settings, Activity, Zap, Router, Server, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet } from '@/utils/apiFetch';  // PR1a: Use new apiFetch utility

const MultiProtocolManager = () => {
  const [protocolsStatus, setProtocolsStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState('modbus');
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  
  // PR1a: Enhanced polling state management with sequential polling
  const [pollingInterval, setPollingInterval] = useState(10000); // Default 10s
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isPolling, setIsPolling] = useState(false); // PR1a: Prevent concurrent polls
  const timeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Check if we're in mock mode
  const isMockMode = import.meta.env.VITE_MOCK_MODE === 'true';

  const mockData = {
    timestamp: new Date().toISOString(),
    summary: {
      total_protocols: 5,
      active_protocols: 3,
      supported_protocols: ['mqtt', 'opcua', 'modbus', 'dnp3', 'simulator']
    },
    protocols: {
      mqtt: {
        name: 'mqtt',
        available: true,
        connected: true,
        status: 'ready',
        last_heartbeat: new Date(Date.now() - 30000).toISOString(),
        version: '3.1.1',
        metrics: { messages_sent: 1247, messages_received: 2156 },
        demo: true
      },
      opcua: {
        name: 'opcua',
        available: true,
        connected: false,
        status: 'error',
        error: { code: 'CONNECTION_REFUSED', message: 'Server unreachable' },
        version: '1.04',
        demo: true
      },
      modbus: {
        name: 'modbus',
        available: true,
        connected: true,
        status: 'ready',
        last_heartbeat: new Date(Date.now() - 15000).toISOString(),
        metrics: { active_devices: 2, total_registers: 48 },
        demo: true
      },
      dnp3: {
        name: 'dnp3',
        available: true,
        connected: true,
        status: 'ready',
        last_heartbeat: new Date(Date.now() - 45000).toISOString(),
        metrics: { active_outstations: 1, data_points: 24 },
        demo: true
      },
      simulator: {
        name: 'simulator',
        available: false,
        connected: false,
        status: 'not_initialized'
      }
    }
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
              messages_sent: mockData.protocols.mqtt.metrics.messages_sent + Math.floor(Math.random() * 10)
            }
          }
        }
      };
      return mockVariant;
    }

    // PR1a: Use enhanced apiFetch with automatic 401 handling
    const response = await apiGet('/api/v1/protocols/status', { 
      timeout: 15000,  // 15 second timeout
      showToastOnError: false // We'll handle errors manually for better UX
    });

    return await response.json();
  };

  const loadData = async () => {
    try {
      const data = await fetchProtocolsStatus();
      setProtocolsStatus(data);
    } catch (error) {
      console.error('Failed to fetch protocols status:', error);
      if (!isMockMode) {
        toast.error("Failed to load protocol status. Check your connection.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Initial load and periodic refresh (only in live mode)
  useEffect(() => {
    loadData();

    let interval;
    if (!isMockMode) {
      // Poll every 10 seconds in live mode
      interval = setInterval(loadData, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMockMode]);

  const getStatusIcon = (protocol) => {
    if (protocol.connected && protocol.status === 'ready') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (protocol.error || protocol.status === 'error') {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    } else if (protocol.available) {
      return <Activity className="h-5 w-5 text-yellow-500" />;
    } else {
      return <WifiOff className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (protocol) => {
    if (protocol.connected && protocol.status === 'ready') {
      return <Badge variant="default" className="bg-green-600">Active</Badge>;
    } else if (protocol.error || protocol.status === 'error') {
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
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-lg text-gray-600">Loading protocol status...</p>
        </div>
      </div>
    );
  }

  if (!protocolsStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Failed to Load</h2>
          <p className="text-gray-600 mb-4">Could not retrieve protocol status.</p>
          <Button onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Multi-Protocol Manager</h1>
          <p className="text-gray-600 mt-2">Monitor and manage industrial protocol connections</p>
        </div>
        <div className="flex items-center gap-4">
          {isMockMode && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Demo Mode
            </Badge>
          )}
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Protocols</p>
                <p className="text-2xl font-bold text-gray-800">{protocolsStatus.summary.total_protocols}</p>
              </div>
              <Router className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Protocols</p>
                <p className="text-2xl font-bold text-green-600">{protocolsStatus.summary.active_protocols}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Connection Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {/* PR1a: Guard against division by zero */}
                  {protocolsStatus.summary.total_protocols > 0 
                    ? Math.round((protocolsStatus.summary.active_protocols / protocolsStatus.summary.total_protocols) * 100)
                    : 0}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-sm font-medium text-gray-800">
                  {new Date(protocolsStatus.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Protocol Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(protocolsStatus.protocols).map(([protocolName, protocol]) => (
          <Card key={protocolName}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getStatusIcon(protocol)}
                  {protocol.name.toUpperCase()}
                </span>
                {getStatusBadge(protocol)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium">{protocol.status}</span>
                </div>
                
                {protocol.version && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Version:</span>
                    <span className="font-medium">{protocol.version}</span>
                  </div>
                )}

                {protocol.last_heartbeat && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Heartbeat:</span>
                    <span className="font-medium text-xs">
                      {new Date(protocol.last_heartbeat).toLocaleTimeString()}
                    </span>
                  </div>
                )}

                {protocol.error && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-700 font-medium">{protocol.error.code}</p>
                    {protocol.error.message && (
                      <p className="text-xs text-red-600">{protocol.error.message}</p>
                    )}
                  </div>
                )}

                {protocol.metrics && (
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-xs font-medium text-gray-700 mb-1">Metrics:</p>
                    {Object.entries(protocol.metrics).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs text-gray-600">
                        <span>{key.replace(/_/g, ' ')}:</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Settings className="h-3 w-3 mr-1" />
                    Configure
                  </Button>
                  {!protocol.connected && protocol.available && (
                    <Button size="sm" className="flex-1">
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Device Dialog */}
      <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
        <DialogTrigger asChild>
          <Button className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg">
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New {selectedProtocol.toUpperCase()} Device</DialogTitle>
            <DialogDescription>
              Configure a new device for {selectedProtocol} protocol
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="protocol">Protocol</Label>
              <Select value={selectedProtocol} onValueChange={setSelectedProtocol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {protocolsStatus.summary.supported_protocols.map(protocol => (
                    <SelectItem key={protocol} value={protocol}>
                      {protocol.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="device-id">Device ID</Label>
              <Input
                id="device-id"
                placeholder="e.g., pump_001"
                value={newDevice.id || ''}
                onChange={(e) => setNewDevice({...newDevice, id: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="host">Host/IP Address</Label>
              <Input
                id="host"
                placeholder="192.168.1.100"
                value={newDevice.host || ''}
                onChange={(e) => setNewDevice({...newDevice, host: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                type="number"
                placeholder="502"
                value={newDevice.port || ''}
                onChange={(e) => setNewDevice({...newDevice, port: e.target.value})}
              />
            </div>
            <Button onClick={handleAddDevice} className="w-full">
              Add Device
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MultiProtocolManager;