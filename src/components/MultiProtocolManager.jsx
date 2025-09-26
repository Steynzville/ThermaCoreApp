import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Wifi, WifiOff, Plus, Settings, Activity, Zap, Router, Server } from 'lucide-react';

const MultiProtocolManager = () => {
  const [protocolsStatus, setProtocolsStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState('modbus');
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({});

  // Mock data for demonstration
  useEffect(() => {
    const fetchProtocolsStatus = async () => {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData = {
        timestamp: '2024-01-15T14:30:00Z',
        summary: {
          total_protocols: 4,
          active_protocols: 3,
          supported_protocols: ['mqtt', 'opcua', 'modbus', 'dnp3']
        },
        protocols: {
          mqtt: {
            available: true,
            connected: true,
            broker_host: 'mqtt.thermacore.local',
            subscribed_topics: ['therma/+/temperature', 'therma/+/pressure'],
            status: 'active'
          },
          opcua: {
            available: true,
            connected: false,
            server_url: 'opc.tcp://plc.thermacore.local:4840',
            subscribed_nodes: 0,
            status: 'disconnected'
          },
          modbus: {
            service: 'modbus',
            total_devices: 3,
            connected_devices: 2,
            devices: {
              'boiler_001': {
                unit_id: 1,
                host: '192.168.1.100',
                port: 502,
                device_type: 'tcp',
                connected: true,
                register_count: 12,
                last_reading: '2024-01-15T14:28:00Z'
              },
              'chiller_002': {
                unit_id: 2,
                host: '192.168.1.101',
                port: 502,
                device_type: 'tcp',
                connected: true,
                register_count: 8,
                last_reading: '2024-01-15T14:29:00Z'
              },
              'pump_003': {
                unit_id: 3,
                host: '192.168.1.102',
                port: 502,
                device_type: 'tcp',
                connected: false,
                register_count: 6,
                last_reading: null
              }
            }
          },
          dnp3: {
            service: 'dnp3',
            master_initialized: true,
            total_devices: 2,
            connected_devices: 1,
            devices: {
              'substation_001': {
                master_address: 1,
                outstation_address: 10,
                host: '192.168.1.200',
                port: 20000,
                connected: true,
                data_point_count: 24,
                last_reading_count: 24
              },
              'rtu_002': {
                master_address: 1,
                outstation_address: 20,
                host: '192.168.1.201',
                port: 20000,
                connected: false,
                data_point_count: 16,
                last_reading_count: 0
              }
            }
          }
        }
      };
      
      setProtocolsStatus(mockData);
      setLoading(false);
    };

    fetchProtocolsStatus();
  }, []);

  const getStatusIcon = (connected, available = true) => {
    if (!available) return <AlertCircle className="h-4 w-4 text-gray-400" />;
    return connected ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getProtocolIcon = (protocol) => {
    const icons = {
      mqtt: <Wifi className="h-5 w-5" />,
      opcua: <Server className="h-5 w-5" />,
      modbus: <Router className="h-5 w-5" />,
      dnp3: <Zap className="h-5 w-5" />
    };
    return icons[protocol] || <Activity className="h-5 w-5" />;
  };

  const handleAddDevice = async () => {
    // Simulate adding device
    console.log('Adding device:', selectedProtocol, newDevice);
    setIsAddDeviceOpen(false);
    setNewDevice({});
  };

  const handleConnectDevice = async (protocol, deviceId) => {
    console.log('Connecting to device:', protocol, deviceId);
    // Simulate connection
  };

  const handleDisconnectDevice = async (protocol, deviceId) => {
    console.log('Disconnecting from device:', protocol, deviceId);
    // Simulate disconnection
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading protocol manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Multi-Protocol Manager</h1>
            <p className="text-gray-600 mt-1">Manage and monitor industrial protocol connections</p>
          </div>
          <div className="flex gap-4">
            <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Device
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Device</DialogTitle>
                  <DialogDescription>
                    Configure a new protocol device connection
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
                        <SelectItem value="modbus">Modbus TCP</SelectItem>
                        <SelectItem value="dnp3">DNP3</SelectItem>
                        <SelectItem value="opcua">OPC UA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="deviceId">Device ID</Label>
                    <Input
                      id="deviceId"
                      value={newDevice.deviceId || ''}
                      onChange={(e) => setNewDevice(prev => ({...prev, deviceId: e.target.value}))}
                      placeholder="device_001"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="host">Host/IP Address</Label>
                    <Input
                      id="host"
                      value={newDevice.host || ''}
                      onChange={(e) => setNewDevice(prev => ({...prev, host: e.target.value}))}
                      placeholder="192.168.1.100"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="port">Port</Label>
                      <Input
                        id="port"
                        type="number"
                        value={newDevice.port || ''}
                        onChange={(e) => setNewDevice(prev => ({...prev, port: e.target.value}))}
                        placeholder={selectedProtocol === 'modbus' ? '502' : '20000'}
                      />
                    </div>
                    <div>
                      <Label htmlFor="unitId">
                        {selectedProtocol === 'modbus' ? 'Unit ID' : 'Address'}
                      </Label>
                      <Input
                        id="unitId"
                        type="number"
                        value={newDevice.unitId || ''}
                        onChange={(e) => setNewDevice(prev => ({...prev, unitId: e.target.value}))}
                        placeholder="1"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddDeviceOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddDevice}>
                      Add Device
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Protocol Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(protocolsStatus.protocols).map(([protocol, status]) => (
            <Card key={protocol}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
                  {getProtocolIcon(protocol)}
                  {protocol.toUpperCase()}
                </CardTitle>
                {getStatusIcon(
                  status.connected || (status.connected_devices > 0), 
                  status.available !== false
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {status.connected_devices || (status.connected ? 1 : 0)}/
                  {status.total_devices || 1}
                </div>
                <p className="text-xs text-muted-foreground">
                  {status.connected_devices || status.connected ? 'Connected' : 'Disconnected'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="modbus" className="space-y-6">
          <TabsList>
            <TabsTrigger value="modbus">Modbus TCP</TabsTrigger>
            <TabsTrigger value="dnp3">DNP3</TabsTrigger>
            <TabsTrigger value="opcua">OPC UA</TabsTrigger>
            <TabsTrigger value="mqtt">MQTT</TabsTrigger>
          </TabsList>

          <TabsContent value="modbus">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Router className="h-5 w-5" />
                  Modbus TCP Devices
                </CardTitle>
                <CardDescription>
                  {protocolsStatus.protocols.modbus.total_devices} devices configured, {protocolsStatus.protocols.modbus.connected_devices} connected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(protocolsStatus.protocols.modbus.devices).map(([deviceId, device]) => (
                    <div key={deviceId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          {device.connected ? 
                            <Wifi className="h-5 w-5 text-blue-600" /> : 
                            <WifiOff className="h-5 w-5 text-gray-400" />
                          }
                        </div>
                        <div>
                          <div className="font-semibold">{deviceId}</div>
                          <div className="text-sm text-gray-600">{device.host}:{device.port}</div>
                          <div className="text-xs text-gray-500">Unit ID: {device.unit_id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{device.register_count} registers</div>
                          <div className="text-xs text-gray-500">
                            {device.last_reading ? 
                              `Last: ${new Date(device.last_reading).toLocaleTimeString()}` : 
                              'No readings'
                            }
                          </div>
                        </div>
                        <Badge variant={device.connected ? "default" : "secondary"}>
                          {device.connected ? 'Connected' : 'Disconnected'}
                        </Badge>
                        <div className="flex gap-2">
                          {!device.connected ? (
                            <Button size="sm" onClick={() => handleConnectDevice('modbus', deviceId)}>
                              Connect
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleDisconnectDevice('modbus', deviceId)}>
                              Disconnect
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dnp3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  DNP3 Outstations
                </CardTitle>
                <CardDescription>
                  {protocolsStatus.protocols.dnp3.total_devices} outstations configured, {protocolsStatus.protocols.dnp3.connected_devices} connected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(protocolsStatus.protocols.dnp3.devices).map(([deviceId, device]) => (
                    <div key={deviceId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                          {device.connected ? 
                            <Zap className="h-5 w-5 text-yellow-600" /> : 
                            <WifiOff className="h-5 w-5 text-gray-400" />
                          }
                        </div>
                        <div>
                          <div className="font-semibold">{deviceId}</div>
                          <div className="text-sm text-gray-600">{device.host}:{device.port}</div>
                          <div className="text-xs text-gray-500">
                            Master: {device.master_address}, Outstation: {device.outstation_address}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{device.data_point_count} data points</div>
                          <div className="text-xs text-gray-500">
                            {device.last_reading_count} readings
                          </div>
                        </div>
                        <Badge variant={device.connected ? "default" : "secondary"}>
                          {device.connected ? 'Connected' : 'Disconnected'}
                        </Badge>
                        <div className="flex gap-2">
                          {!device.connected ? (
                            <Button size="sm" onClick={() => handleConnectDevice('dnp3', deviceId)}>
                              Connect
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleDisconnectDevice('dnp3', deviceId)}>
                              Disconnect
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opcua">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  OPC UA Servers
                </CardTitle>
                <CardDescription>
                  OPC UA client connection status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      {protocolsStatus.protocols.opcua.connected ? 
                        <Server className="h-5 w-5 text-purple-600" /> : 
                        <WifiOff className="h-5 w-5 text-gray-400" />
                      }
                    </div>
                    <div>
                      <div className="font-semibold">OPC UA Server</div>
                      <div className="text-sm text-gray-600">{protocolsStatus.protocols.opcua.server_url}</div>
                      <div className="text-xs text-gray-500">
                        {protocolsStatus.protocols.opcua.subscribed_nodes} subscribed nodes
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={protocolsStatus.protocols.opcua.connected ? "default" : "secondary"}>
                      {protocolsStatus.protocols.opcua.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                    <div className="flex gap-2">
                      {!protocolsStatus.protocols.opcua.connected ? (
                        <Button size="sm">Connect</Button>
                      ) : (
                        <Button size="sm" variant="outline">Disconnect</Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mqtt">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  MQTT Broker
                </CardTitle>
                <CardDescription>
                  MQTT client connection and topic subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      {protocolsStatus.protocols.mqtt.connected ? 
                        <Wifi className="h-5 w-5 text-green-600" /> : 
                        <WifiOff className="h-5 w-5 text-gray-400" />
                      }
                    </div>
                    <div>
                      <div className="font-semibold">MQTT Broker</div>
                      <div className="text-sm text-gray-600">{protocolsStatus.protocols.mqtt.broker_host}</div>
                      <div className="text-xs text-gray-500">
                        {protocolsStatus.protocols.mqtt.subscribed_topics?.length || 0} active topics
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">Topics:</div>
                      <div className="text-xs text-gray-500 space-y-1">
                        {protocolsStatus.protocols.mqtt.subscribed_topics?.map((topic, index) => (
                          <div key={index}>{topic}</div>
                        ))}
                      </div>
                    </div>
                    <Badge variant={protocolsStatus.protocols.mqtt.connected ? "default" : "secondary"}>
                      {protocolsStatus.protocols.mqtt.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                    <div className="flex gap-2">
                      {!protocolsStatus.protocols.mqtt.connected ? (
                        <Button size="sm">Connect</Button>
                      ) : (
                        <Button size="sm" variant="outline">Disconnect</Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MultiProtocolManager;