/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deviceStatusService } from '../services/deviceStatusService';

// Mock the units data
vi.mock('../data/mockUnits', () => ({
  units: [
    {
      id: 'TC001',
      name: 'ThermaCore Unit 001',
      status: 'online',
      hasAlert: false,
      hasAlarm: false,
      healthStatus: 'Optimal',
      battery_level: 85.5,
      water_level: 364.0,
      serialNumber: 'TC001-2024-001',
      location: 'Site Alpha',
    },
    {
      id: 'TC002',
      name: 'ThermaCore Unit 002',
      status: 'offline',
      hasAlert: true,
      hasAlarm: false,
      healthStatus: 'Warning',
      battery_level: 22.4,
      water_level: 129.4,
      serialNumber: 'TC002-2024-002',
      location: 'Site Beta',
    },
    {
      id: 'TC003',
      name: 'ThermaCore Unit 003',
      status: 'maintenance',
      hasAlert: false,
      hasAlarm: true,
      healthStatus: 'Critical',
      battery_level: 38.5,
      water_level: 265.2,
      serialNumber: 'TC003-2024-003',
      location: 'Site Gamma',
    }
  ]
}));

describe('DeviceStatusService', () => {
  beforeEach(() => {
    // Reset the service state before each test
    deviceStatusService.devices.clear();
    deviceStatusService.statusHistory = [];
    deviceStatusService.listeners.clear();
    deviceStatusService.isInitialized = false;
    deviceStatusService.initialize();
  });

  describe('Initialization', () => {
    it('should initialize with mock device data', () => {
      const devices = deviceStatusService.getAllDeviceStatuses();
      expect(devices).toHaveLength(3);
      expect(devices[0].id).toBe('TC001');
      expect(devices[1].id).toBe('TC002');
      expect(devices[2].id).toBe('TC003');
    });

    it('should set initial device statuses correctly', () => {
      const device1 = deviceStatusService.getDeviceStatus('TC001');
      const device2 = deviceStatusService.getDeviceStatus('TC002');
      const device3 = deviceStatusService.getDeviceStatus('TC003');

      expect(device1.status).toBe('online');
      expect(device1.isOnline).toBe(true);
      expect(device1.hasAlert).toBe(false);
      expect(device1.hasAlarm).toBe(false);

      expect(device2.status).toBe('offline');
      expect(device2.isOnline).toBe(false);
      expect(device2.hasAlert).toBe(true);

      expect(device3.status).toBe('maintenance');
      expect(device3.isOnline).toBe(true); // maintenance is considered online
      expect(device3.hasAlarm).toBe(true);
    });
  });

  describe('Status Updates', () => {
    it('should update device status and detect changes', () => {
      const statusChange = deviceStatusService.updateDeviceStatus('TC001', {
        status: 'offline'
      });

      expect(statusChange).toBeTruthy();
      expect(statusChange.changes).toHaveLength(2); // status change + connectivity change
      expect(statusChange.changes[0].type).toBe('connectivity');
      expect(statusChange.changes[1].type).toBe('status');
    });

    it('should detect new alerts', () => {
      const statusChange = deviceStatusService.updateDeviceStatus('TC001', {
        hasAlert: true
      });

      expect(statusChange).toBeTruthy();
      expect(statusChange.changes).toHaveLength(1);
      expect(statusChange.changes[0].type).toBe('alert');
      expect(statusChange.changes[0].severity).toBe('warning');
    });

    it('should detect new alarms', () => {
      const statusChange = deviceStatusService.updateDeviceStatus('TC001', {
        hasAlarm: true
      });

      expect(statusChange).toBeTruthy();
      expect(statusChange.changes).toHaveLength(1);
      expect(statusChange.changes[0].type).toBe('alarm');
      expect(statusChange.changes[0].severity).toBe('critical');
    });

    it('should detect health status changes', () => {
      const statusChange = deviceStatusService.updateDeviceStatus('TC001', {
        healthStatus: 'Critical'
      });

      expect(statusChange).toBeTruthy();
      expect(statusChange.changes).toHaveLength(1);
      expect(statusChange.changes[0].type).toBe('health');
      expect(statusChange.changes[0].severity).toBe('critical');
    });

    it('should not detect changes when status is the same', () => {
      const statusChange = deviceStatusService.updateDeviceStatus('TC001', {
        status: 'online' // Same as current status
      });

      expect(statusChange).toBeNull();
    });
  });

  describe('Status Change Listeners', () => {
    it('should add and remove listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = deviceStatusService.addStatusChangeListener(listener1);
      const unsubscribe2 = deviceStatusService.addStatusChangeListener(listener2);

      expect(deviceStatusService.listeners.size).toBe(2);

      unsubscribe1();
      expect(deviceStatusService.listeners.size).toBe(1);

      deviceStatusService.removeStatusChangeListener(listener2);
      expect(deviceStatusService.listeners.size).toBe(0);
    });

    it('should notify listeners of status changes', () => {
      const listener = vi.fn();
      deviceStatusService.addStatusChangeListener(listener);

      deviceStatusService.updateDeviceStatus('TC001', { status: 'offline' });

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'TC001',
          changes: expect.any(Array)
        })
      );
    });
  });

  describe('Severity Assessment', () => {
    it('should correctly assess status severity', () => {
      expect(deviceStatusService.getStatusSeverity('offline')).toBe('critical');
      expect(deviceStatusService.getStatusSeverity('error')).toBe('critical');
      expect(deviceStatusService.getStatusSeverity('maintenance')).toBe('warning');
      expect(deviceStatusService.getStatusSeverity('online')).toBe('success');
      expect(deviceStatusService.getStatusSeverity('unknown')).toBe('info');
    });

    it('should correctly assess health severity', () => {
      expect(deviceStatusService.getHealthSeverity('Critical')).toBe('critical');
      expect(deviceStatusService.getHealthSeverity('Warning')).toBe('warning');
      expect(deviceStatusService.getHealthSeverity('Optimal')).toBe('success');
      expect(deviceStatusService.getHealthSeverity('Unknown')).toBe('info');
    });
  });

  describe('Notifications Generation', () => {
    it('should generate device status notifications for admin role', () => {
      // Create some status changes first
      deviceStatusService.updateDeviceStatus('TC001', { status: 'offline' });
      deviceStatusService.updateDeviceStatus('TC002', { hasAlarm: true });

      const notifications = deviceStatusService.generateDeviceStatusNotifications('admin');
      
      expect(notifications.length).toBeGreaterThanOrEqual(1);
      
      // Find notifications for specific devices
      const tc001Notifications = notifications.filter(n => n.alertData.deviceId === 'TC001');
      const tc002Notifications = notifications.filter(n => n.alertData.deviceId === 'TC002');
      
      expect(tc001Notifications.length).toBeGreaterThan(0);
      expect(tc002Notifications.length).toBeGreaterThan(0);
    });

    it('should filter notifications for regular user role', () => {
      // Create status changes for units beyond regular user access (TC007+)
      deviceStatusService.updateDeviceStatus('TC001', { status: 'offline' });
      
      // Mock a device beyond regular user access
      deviceStatusService.devices.set('TC007', {
        id: 'TC007',
        name: 'ThermaCore Unit 007',
        status: 'online',
        hasAlert: false,
        hasAlarm: false,
        healthStatus: 'Optimal',
        lastSeen: new Date(),
        lastStatusChange: new Date(),
        isOnline: true,
      });
      
      deviceStatusService.updateDeviceStatus('TC007', { status: 'offline' });

      const adminNotifications = deviceStatusService.generateDeviceStatusNotifications('admin');
      const userNotifications = deviceStatusService.generateDeviceStatusNotifications('user');

      expect(adminNotifications.length).toBeGreaterThan(userNotifications.length);
      
      // Check that user notifications don't include TC007
      const userDeviceIds = userNotifications.map(n => n.alertData.deviceId);
      expect(userDeviceIds).not.toContain('TC007');
    });
  });

  describe('Status History', () => {
    it('should maintain status change history', () => {
      deviceStatusService.updateDeviceStatus('TC001', { status: 'offline' });
      
      // Add a small delay and then update TC002 to ensure we have separate changes
      const updateTC002 = () => {
        // Only add new alerts that weren't already present
        const tc002 = deviceStatusService.getDeviceStatus('TC002');
        if (!tc002.hasAlarm) {
          deviceStatusService.updateDeviceStatus('TC002', { hasAlarm: true });
        }
      };
      
      setTimeout(updateTC002, 1);
      updateTC002(); // Call immediately as well

      const history = deviceStatusService.getStatusHistory();
      expect(history.length).toBeGreaterThanOrEqual(1);
      
      // Check that at least one change was recorded
      expect(history[0]).toHaveProperty('deviceId');
      expect(history[0]).toHaveProperty('changes');
    });

    it('should limit status history size', () => {
      const originalMaxSize = deviceStatusService.config.maxHistorySize;
      deviceStatusService.config.maxHistorySize = 3;

      // Generate more changes than max size
      for (let i = 0; i < 5; i++) {
        deviceStatusService.updateDeviceStatus('TC001', { 
          status: i % 2 === 0 ? 'online' : 'offline' 
        });
      }

      const history = deviceStatusService.getStatusHistory();
      expect(history.length).toBeLessThanOrEqual(3);

      // Restore original config
      deviceStatusService.config.maxHistorySize = originalMaxSize;
    });
  });

  describe('Device Online Detection', () => {
    it('should correctly identify online devices', () => {
      expect(deviceStatusService.isDeviceOnline('online')).toBe(true);
      expect(deviceStatusService.isDeviceOnline('maintenance')).toBe(true);
      expect(deviceStatusService.isDeviceOnline('offline')).toBe(false);
      expect(deviceStatusService.isDeviceOnline('error')).toBe(false);
    });
  });
});