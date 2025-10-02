/**
 * Device Status Monitoring Service
 * Monitors device connectivity and status changes, generates notifications
 */

import { units } from '../data/mockUnits';

class DeviceStatusService {
  constructor() {
    this.devices = new Map();
    this.listeners = new Set();
    this.statusHistory = [];
    this.isInitialized = false;
    
    // Device status monitoring configuration
    this.config = {
      pollInterval: 30000, // 30 seconds
      statusTimeout: 60000, // 1 minute offline threshold
      maxHistorySize: 1000,
    };
    
    // Initialize with current device states
    this.initialize();
  }

  /**
   * Initialize the service with current device data
   */
  initialize() {
    if (this.isInitialized) return;
    
    // Load initial device states from mock data
    units.forEach(unit => {
      this.devices.set(unit.id, {
        id: unit.id,
        name: unit.name,
        status: unit.status,
        hasAlert: unit.hasAlert,
        hasAlarm: unit.hasAlarm,
        healthStatus: unit.healthStatus,
        lastSeen: new Date(),
        lastStatusChange: new Date(),
        isOnline: this.isDeviceOnline(unit.status),
        batteryLevel: unit.battery_level,
        waterLevel: unit.water_level,
        serialNumber: unit.serialNumber,
        location: unit.location,
      });
    });
    
    this.isInitialized = true;
  }

  /**
   * Determine if device is considered online based on status
   */
  isDeviceOnline(status) {
    return status === 'online' || status === 'maintenance';
  }

  /**
   * Get current status of a specific device
   */
  getDeviceStatus(deviceId) {
    return this.devices.get(deviceId);
  }

  /**
   * Get status of all devices
   */
  getAllDeviceStatuses() {
    return Array.from(this.devices.values());
  }

  /**
   * Update device status and check for changes
   */
  updateDeviceStatus(deviceId, newStatus) {
    const currentDevice = this.devices.get(deviceId);
    if (!currentDevice) return null;

    const oldStatus = {
      status: currentDevice.status,
      hasAlert: currentDevice.hasAlert,
      hasAlarm: currentDevice.hasAlarm,
      healthStatus: currentDevice.healthStatus,
      isOnline: currentDevice.isOnline,
    };

    // Update device status
    const updatedDevice = {
      ...currentDevice,
      ...newStatus,
      lastSeen: new Date(),
      lastStatusChange: currentDevice.status !== newStatus.status ? new Date() : currentDevice.lastStatusChange,
      isOnline: this.isDeviceOnline(newStatus.status || currentDevice.status),
    };

    this.devices.set(deviceId, updatedDevice);

    // Check for significant changes
    const statusChange = this.detectStatusChanges(deviceId, oldStatus, updatedDevice);
    
    if (statusChange) {
      this.handleStatusChange(statusChange);
    }

    return statusChange;
  }

  /**
   * Detect significant status changes that should trigger notifications
   */
  detectStatusChanges(deviceId, oldStatus, newStatus) {
    const changes = [];

    // Check for connectivity changes
    if (oldStatus.isOnline !== newStatus.isOnline) {
      changes.push({
        type: 'connectivity',
        severity: newStatus.isOnline ? 'info' : 'critical',
        event: newStatus.isOnline ? 'Device Online' : 'Device Offline',
        message: `${newStatus.name || deviceId} ${newStatus.isOnline ? 'came online' : 'went offline'}`,
      });
    }

    // Check for status changes
    if (oldStatus.status !== newStatus.status) {
      changes.push({
        type: 'status',
        severity: this.getStatusSeverity(newStatus.status),
        event: 'Status Change',
        message: `${newStatus.name || deviceId} status changed from ${oldStatus.status} to ${newStatus.status}`,
      });
    }

    // Check for new alerts
    if (!oldStatus.hasAlert && newStatus.hasAlert) {
      changes.push({
        type: 'alert',
        severity: 'warning',
        event: 'New Alert',
        message: `${newStatus.name || deviceId} has a new alert`,
      });
    }

    // Check for new alarms
    if (!oldStatus.hasAlarm && newStatus.hasAlarm) {
      changes.push({
        type: 'alarm',
        severity: 'critical',
        event: 'New Alarm',
        message: `${newStatus.name || deviceId} has a critical alarm`,
      });
    }

    // Check for health status changes
    if (oldStatus.healthStatus !== newStatus.healthStatus) {
      changes.push({
        type: 'health',
        severity: this.getHealthSeverity(newStatus.healthStatus),
        event: 'Health Status Change',
        message: `${newStatus.name || deviceId} health status changed to ${newStatus.healthStatus}`,
      });
    }

    if (changes.length > 0) {
      return {
        deviceId,
        deviceName: newStatus.name || deviceId,
        timestamp: new Date(),
        changes,
        oldStatus,
        newStatus,
      };
    }

    return null;
  }

  /**
   * Get severity level for device status
   */
  getStatusSeverity(status) {
    switch (status) {
      case 'offline': return 'critical';
      case 'error': return 'critical';
      case 'maintenance': return 'warning';
      case 'online': return 'success';
      default: return 'info';
    }
  }

  /**
   * Get severity level for health status
   */
  getHealthSeverity(healthStatus) {
    switch (healthStatus?.toLowerCase()) {
      case 'critical': return 'critical';
      case 'warning': return 'warning';
      case 'optimal': return 'success';
      default: return 'info';
    }
  }

  /**
   * Handle status changes and notify listeners
   */
  handleStatusChange(statusChange) {
    // Add to history
    this.statusHistory.unshift(statusChange);
    
    // Trim history if too large
    if (this.statusHistory.length > this.config.maxHistorySize) {
      this.statusHistory = this.statusHistory.slice(0, this.config.maxHistorySize);
    }

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(statusChange);
      } catch (error) {
        console.error('Error notifying status change listener:', error);
      }
    });
  }

  /**
   * Add a listener for status changes
   */
  addStatusChangeListener(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    return null;
  }

  /**
   * Remove a status change listener
   */
  removeStatusChangeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Get recent status change history
   */
  getStatusHistory(limit = 50) {
    return this.statusHistory.slice(0, limit);
  }

  /**
   * Generate device status notifications for the notification system
   */
  generateDeviceStatusNotifications(userRole = 'user') {
    const notifications = [];
    const recentChanges = this.getStatusHistory(20);
    let notificationId = 1;
    
    recentChanges.forEach((change) => {
      // Apply role-based filtering - regular users see units 1-6 only
      if (userRole !== 'admin') {
        const unitMatch = change.deviceId.match(/TC(\d+)/);
        if (unitMatch && parseInt(unitMatch[1]) > 6) {
          return; // Skip for regular users
        }
      }

      change.changes.forEach((statusChange) => {
        notifications.push({
          id: notificationId,
          type: statusChange.type === 'alarm' ? 'alarm' : 'alert',
          message: `${change.deviceName} - ${statusChange.event}`,
          timestamp: change.timestamp.toISOString().replace('T', ' ').slice(0, 19),
          alertData: {
            id: notificationId,
            type: statusChange.severity,
            title: statusChange.event,
            message: statusChange.message,
            timestamp: change.timestamp.toISOString().replace('T', ' ').slice(0, 19),
            deviceId: change.deviceId,
            deviceName: change.deviceName,
          }
        });
        notificationId++;
      });
    });

    return notifications;
  }

  /**
   * Simulate device status changes for demo purposes
   */
  simulateStatusChanges() {
    const deviceIds = Array.from(this.devices.keys());
    
    setInterval(() => {
      const randomDeviceId = deviceIds[Math.floor(Math.random() * deviceIds.length)];
      const device = this.devices.get(randomDeviceId);
      
      if (!device) return;

      // Randomly change status or add alerts
      const rand = Math.random();
      
      if (rand < 0.1) { // 10% chance of status change
        const statuses = ['online', 'offline', 'maintenance'];
        const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        if (newStatus !== device.status) {
          this.updateDeviceStatus(randomDeviceId, { status: newStatus });
        }
      } else if (rand < 0.15) { // 5% chance of new alert
        if (!device.hasAlert) {
          this.updateDeviceStatus(randomDeviceId, { hasAlert: true });
        }
      }
    }, this.config.pollInterval);
  }
}

// Export singleton instance
export const deviceStatusService = new DeviceStatusService();
export default deviceStatusService;