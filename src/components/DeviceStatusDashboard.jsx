import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { RefreshCw, Filter, Search } from 'lucide-react';
import { Input } from './ui/input';
import DeviceStatusIndicator from './DeviceStatusIndicator';
import { deviceStatusService } from '../services/deviceStatusService';
import { useAuth } from '../context/AuthContext';

/**
 * Device Status Dashboard Component
 * Provides comprehensive device status monitoring and management
 */
const DeviceStatusDashboard = ({ className = '' }) => {
  const { userRole } = useAuth();
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Update devices when component mounts
  useEffect(() => {
    const updateDevices = () => {
      const allDevices = deviceStatusService.getAllDeviceStatuses();
      
      // Apply role-based filtering
      const filteredByRole = allDevices.filter(device => {
        if (userRole === 'admin') return true;
        const unitMatch = device.id.match(/TC(\d+)/);
        return unitMatch && parseInt(unitMatch[1]) <= 6;
      });
      
      setDevices(filteredByRole);
      setLastUpdated(new Date());
    };

    // Initial load
    updateDevices();

    // Listen for device status changes
    const unsubscribe = deviceStatusService.addStatusChangeListener(() => {
      updateDevices();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userRole]);

  // Apply filters
  useEffect(() => {
    let filtered = devices;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(device =>
        device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(device => {
        switch (statusFilter) {
          case 'online': return device.isOnline;
          case 'offline': return !device.isOnline;
          case 'alerts': return device.hasAlert;
          case 'alarms': return device.hasAlarm;
          case 'maintenance': return device.status === 'maintenance';
          default: return true;
        }
      });
    }

    setFilteredDevices(filtered);
  }, [devices, searchTerm, statusFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
      setLastUpdated(new Date());
    }, 1000);
  };

  const getStatusCounts = () => {
    return {
      total: devices.length,
      online: devices.filter(d => d.isOnline).length,
      offline: devices.filter(d => !d.isOnline).length,
      alerts: devices.filter(d => d.hasAlert).length,
      alarms: devices.filter(d => d.hasAlarm).length,
      maintenance: devices.filter(d => d.status === 'maintenance').length,
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Device Status Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold">{statusCounts.total}</p>
              </div>
              <Badge variant="outline">All</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Online</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.online}</p>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                Online
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Offline</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.offline}</p>
              </div>
              <Badge variant="destructive">Offline</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Alerts</p>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.alerts}</p>
              </div>
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                Alert
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Alarms</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.alarms}</p>
              </div>
              <Badge variant="destructive">Alarm</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Maintenance</p>
                <p className="text-2xl font-bold text-blue-600">{statusCounts.maintenance}</p>
              </div>
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                Maint.
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="all">All Devices</option>
            <option value="online">Online Only</option>
            <option value="offline">Offline Only</option>
            <option value="alerts">With Alerts</option>
            <option value="alarms">With Alarms</option>
            <option value="maintenance">In Maintenance</option>
          </select>
        </div>
      </div>

      {/* Device List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.map((device) => (
          <Card key={device.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{device.name}</CardTitle>
                <DeviceStatusIndicator
                  status={device.status}
                  hasAlert={device.hasAlert}
                  hasAlarm={device.hasAlarm}
                  isOnline={device.isOnline}
                  healthStatus={device.healthStatus}
                  size="md"
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {device.id} • {device.location}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                  <DeviceStatusIndicator
                    status={device.status}
                    hasAlert={device.hasAlert}
                    hasAlarm={device.hasAlarm}
                    isOnline={device.isOnline}
                    healthStatus={device.healthStatus}
                    showText={true}
                    size="sm"
                  />
                </div>
                
                {device.batteryLevel !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Battery:</span>
                    <span className={`text-sm font-medium ${
                      device.batteryLevel < 25 ? 'text-red-600' :
                      device.batteryLevel < 50 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {device.batteryLevel.toFixed(1)}%
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Last Seen:</span>
                  <span className="text-sm">
                    {device.lastSeen.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDevices.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' 
                ? 'No devices match the current filters.' 
                : 'No devices found.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeviceStatusDashboard;