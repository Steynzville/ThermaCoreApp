// Constants for mock data generation
export const ALERT_SEVERITIES = ["Critical", "Warning", "Info"];

export const UNIT_STATUS_TYPES = ["Operational", "Warning", "Offline", "Critical"];

export const MOCK_UNIT_COUNT = 12;

export const MAINTENANCE_DESCRIPTIONS = [
  "Routine maintenance completed successfully for Unit 001",
  "System diagnostic check performed",
  "Temperature calibration adjusted",
  "Routine check performed. System nominal.",
];

export const CONTROL_ACTION_DESCRIPTIONS = [
  "Machine Power toggled ON by Admin",
  "Automatic Control set to OFF",
  "Water Production started by User",
  "System maintenance mode activated",
  "Temperature threshold adjusted by Admin",
];

// Time constants in milliseconds
export const TIME_CONSTANTS = {
  HOUR: 3600000,
  DAY: 86400000,
  FIFTEEN_MINUTES: 900000,
};