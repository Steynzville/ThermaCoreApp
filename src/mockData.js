import {
  ALERT_SEVERITIES,
  CONTROL_ACTION_DESCRIPTIONS,
  MAINTENANCE_DESCRIPTIONS,
  MOCK_UNIT_COUNT,
  TIME_CONSTANTS,
  UNIT_STATUS_TYPES,
} from "./constants/mockDataConstants.js";
import { generateTimestamp } from "./utils/dateUtils.js";

// Helper to generate alerts
const generateAlerts = (count, unitName, unitId) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${unitId}-${i + 1}`,
    timestamp: generateTimestamp(i * TIME_CONSTANTS.HOUR * ((i % 5) + 1)),
    description: `Alert #${i + 1}: Fictional event for ${unitName}.`,
    severity: ALERT_SEVERITIES[i % ALERT_SEVERITIES.length],
  }));
};

// Generate mock units, increasing the count to 12 for testing. [25]
export const mockUnits = Array.from({ length: MOCK_UNIT_COUNT }, (_, i) => {
  const unitId = i + 1;
  const unitName = `Unit ${String.fromCharCode(65 + Math.floor(i / 4))}-${101 + (i % 4)}`;
  const status = UNIT_STATUS_TYPES[i % UNIT_STATUS_TYPES.length];

  return {
    id: unitId,
    name: unitName,
    status: status,
    location: `Site ${String.fromCharCode(65 + Math.floor(i / 4))}`,
    // Units with Critical status should be classified as alarms, not alerts
    hasAlarm: status === "Critical",
    alerts: status === "Warning" ? [`${unitName} requires attention`] : [],
    installDate: `2024-01-${String(1 + (i % 28)).padStart(2, "0")}`,
    lastMaintenance: `2024-08-${String(1 + (i % 28)).padStart(2, "0")}`,
  };
});

// Generate mock unit details
export const mockUnitDetails = mockUnits.reduce((acc, unit) => {
  const alerts = generateAlerts(16, unit.name, unit.id);
  // Ensure the current alert matches the unit\'s status. [12, 28]
  if (unit.status === "Warning" || unit.status === "Critical") {
    alerts.unshift({
      id: `${unit.id}-current`,
      timestamp: new Date().toISOString(),
      description: `Current ${unit.status} Alert: System requires immediate attention.`,
      severity: unit.status,
    });
  }
  acc[unit.id] = {
    installDate: unit.installDate,
    lastMaintenance: unit.lastMaintenance,
    gps: `${(Math.random() * 180 - 90).toFixed(6)}, ${(Math.random() * 360 - 180).toFixed(6)}`, // [11]
    alerts: alerts,
    controls: {
      machinePower: unit.status !== "Offline",
      waterProduction: unit.status === "Operational",
      automaticControl: unit.status === "Operational",
    },
  };
  return acc;
}, {});

// Generate mock event history. [9]
export const mockEventHistory = Array.from({ length: 50 }, (_, i) => ({
  id: `event-${i}`,
  timestamp: generateTimestamp(TIME_CONSTANTS.DAY + i * TIME_CONSTANTS.DAY),
  unitName: mockUnits[i % mockUnits.length].name,
  description: MAINTENANCE_DESCRIPTIONS[i % MAINTENANCE_DESCRIPTIONS.length],
}));

// Generate mock recent control actions. [19]
export const mockRecentActions = Array.from({ length: 50 }, (_, i) => ({
  id: `action-${i}`,
  timestamp: generateTimestamp(i * TIME_CONSTANTS.FIFTEEN_MINUTES),
  description: CONTROL_ACTION_DESCRIPTIONS[i % CONTROL_ACTION_DESCRIPTIONS.length],
}));


