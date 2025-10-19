// Centralized notifications utility for consistent role-based filtering

import { deviceStatusService } from '../services/deviceStatusService';

// Complete alerts data - all units
const alerts = [
  {
    id: 1,
    type: "alert",
    message: "ThermaCore Unit 001 - Unit Offline",
    timestamp: "2025-09-09 14:45",
    alertData: {
      id: 1,
      type: "critical",
      title: "Unit Offline",
      message: "ThermaCore Unit 001 has gone offline and requires immediate attention",
      timestamp: "2025-09-09 14:45"
    }
  },
  {
    id: 2,
    type: "alert",
    message: "ThermaCore Unit 002 - Low Water Level",
    timestamp: "2025-09-09 14:15",
    alertData: {
      id: 2,
      type: "warning",
      title: "Low Water Level",
      message: "Water level has dropped below safe operating threshold",
      timestamp: "2025-09-09 14:15"
    }
  },
  {
    id: 3,
    type: "alert",
    message: "ThermaCore Unit 003 - Maintenance Scheduled",
    timestamp: "2025-09-09 13:30",
    alertData: {
      id: 3,
      type: "info",
      title: "Maintenance Scheduled",
      message: "Routine maintenance has been scheduled for this unit",
      timestamp: "2025-09-09 13:30"
    }
  },
  {
    id: 4,
    type: "alert",
    message: "ThermaCore Unit 004 - System Restored",
    timestamp: "2025-09-09 12:00",
    status: "completed",
    alertData: {
      id: 4,
      type: "success",
      title: "System Restored",
      message: "Unit has been successfully restored to normal operation",
      timestamp: "2025-09-09 12:00"
    }
  },
  {
    id: 5,
    type: "alert",
    message: "ThermaCore Unit 005 - Temperature Alert",
    timestamp: "2025-09-09 11:30",
    status: "completed",
    alertData: {
      id: 5,
      type: "warning",
      title: "Temperature Alert",
      message: "Operating temperature has exceeded normal range",
      timestamp: "2025-09-09 11:30"
    }
  },
  {
    id: 6,
    type: "alert",
    message: "ThermaCore Unit 006 - Pressure Drop",
    timestamp: "2025-09-09 10:15",
    alertData: {
      id: 6,
      type: "warning",
      title: "Pressure Drop",
      message: "System pressure has dropped below optimal levels",
      timestamp: "2025-09-09 10:15"
    }
  }
];

// Complete alarms data - all units  
const alarms = [
  {
    id: 7,
    type: "alarm",
    message: "ThermaCore Unit 003 - NH3 LEAK DETECTED",
    timestamp: "2025-09-09 15:30",
    alertData: {
      id: 7,
      type: "critical",
      title: "NH3 LEAK DETECTED",
      message: "Critical ammonia leak detected - immediate attention required",
      timestamp: "2025-09-09 15:30"
    }
  },
  {
    id: 8,
    type: "alarm",
    message: "ThermaCore Unit 014 - NH3 LEAK DETECTED",
    timestamp: "2025-09-09 15:15",
    alertData: {
      id: 8,
      type: "critical",
      title: "NH3 LEAK DETECTED",
      message: "Critical ammonia leak detected - immediate attention required",
      timestamp: "2025-09-09 15:15"
    }
  }
];

/**
 * Get all current notifications for a specific unit with role-based filtering
 * @param {string|number} unitId - Unit ID (e.g., "TC003", "3", 3)
 * @param {string} userRole - User role ("admin" or "user")
 * @returns {Array} Array of alert data objects for the unit
 */
export const getAllCurrentNotificationsForUnit = (unitId, userRole) => {
  // Extract unit number from unitId (e.g., "3" from "TC003" or from "3")
  let unitNumber;
  if (typeof unitId === 'string') {
    const extracted = unitId.replace(/[^0-9]/g, '');
    unitNumber = extracted.padStart(3, '0');
  } else {
    unitNumber = unitId.toString().padStart(3, '0');
  }
  
  // Apply role-based filtering first before finding unit-specific notifications
  let userAlarms = getRoleFilteredAlarms(userRole);
  let userAlerts = getRoleFilteredAlerts(userRole);
  
  // Get device status notifications
  const deviceStatusNotifications = getDeviceStatusNotifications(userRole);
  
  // Find all notifications for this specific unit from the filtered data
  // Use regex to match the unit number more reliably
  const unitPattern = new RegExp(`ThermaCore Unit 0*${parseInt(unitNumber, 10)}\\b`);
  const unitIdPattern = new RegExp(`TC0*${parseInt(unitNumber, 10)}\\b`);
  
  const unitAlerts = userAlerts.filter(alert => 
    unitPattern.test(alert.message) // Show all alerts, regardless of status
  );
  
  const unitAlarms = userAlarms.filter(alarm => 
    unitPattern.test(alarm.message) // Show all alarms, regardless of status
  );

  // Filter device status notifications for this unit
  const unitDeviceNotifications = deviceStatusNotifications.filter(notification => 
    unitIdPattern.test(notification.alertData?.deviceId || '') ||
    unitPattern.test(notification.message)
  );
  
  // Combine and return all current notifications for this unit
  const allNotifications = [...unitAlarms, ...unitAlerts, ...unitDeviceNotifications];
  return allNotifications.map(notification => notification.alertData);
};

/**
 * Get role-filtered alarms for notification system
 * @param {string} userRole - User role ("admin" or "user")
 * @returns {Array} Array of alarm objects filtered by role
 */
export const getRoleFilteredAlarms = (userRole) => {
  if (userRole === "admin") {
    return alarms;
  }
  
  // Regular users can see alarms for units 1-6
  return alarms.filter(alarm => {
    const unitMatch = alarm.message.match(/ThermaCore Unit (\d+)/);
    if (unitMatch) {
      const unitNum = parseInt(unitMatch[1], 10);
      return unitNum >= 1 && unitNum <= 6;
    }
    return false;
  });
};

/**
 * Get role-filtered alerts for notification system
 * @param {string} userRole - User role ("admin" or "user")
 * @returns {Array} Array of alert objects filtered by role
 */
export const getRoleFilteredAlerts = (userRole) => {
  if (userRole === "admin") {
    return alerts;
  }
  
  // Regular users can see alerts for units 1-6
  return alerts.filter(alert => {
    const unitMatch = alert.message.match(/ThermaCore Unit (\d+)/);
    if (unitMatch) {
      const unitNum = parseInt(unitMatch[1], 10);
      return unitNum >= 1 && unitNum <= 6;
    }
    return false;
  });
};

/**
 * Get device status notifications with role-based filtering
 * @param {string} userRole - User role ("admin" or "user")
 * @returns {Array} Array of device status notification objects filtered by role
 */
export const getDeviceStatusNotifications = (userRole = 'user') => {
  try {
    return deviceStatusService.generateDeviceStatusNotifications(userRole);
  } catch (error) {
    console.error('Error getting device status notifications:', error);
    return [];
  }
};

/**
 * Get all notifications (alerts, alarms, and device status) with role-based filtering
 * @param {string} userRole - User role ("admin" or "user")
 * @returns {Array} Array of all notification objects filtered by role
 */
export const getAllNotifications = (userRole = 'user') => {
  const userAlarms = getRoleFilteredAlarms(userRole);
  const userAlerts = getRoleFilteredAlerts(userRole);
  const deviceStatusNotifications = getDeviceStatusNotifications(userRole);
  
  // Combine all notifications, with alarms first, then device status, then alerts
  return [...userAlarms, ...deviceStatusNotifications, ...userAlerts];
};

