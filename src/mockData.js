// Helper to generate alerts
const generateAlerts = (count, unitName, unitId) => {
  const severities = ["Critical", "Warning", "Info"];
  return Array.from({ length: count }, (_, i) => ({
    id: `${unitId}-${i + 1}`,
    timestamp: new Date(Date.now() - i * 3600000 * ((i % 5) + 1)).toISOString(),
    description: `Alert #${i + 1}: Fictional event for ${unitName}.`,
    severity: severities[i % severities.length],
  }));
};

// Generate mock units, increasing the count to 12 for testing. [25]
export const mockUnits = Array.from({ length: 12 }, (_, i) => {
  const statusTypes = ["Operational", "Warning", "Offline", "Critical"];
  const unitId = i + 1;
  const unitName = `Unit ${String.fromCharCode(65 + Math.floor(i / 4))}-${101 + (i % 4)}`;
  const status = statusTypes[i % statusTypes.length];

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
  timestamp: new Date(Date.now() - 86400000 - i * 86400000).toISOString(),
  unitName: mockUnits[i % mockUnits.length].name,
  description:
    i % 4 === 0
      ? "Routine maintenance completed successfully for Unit 001"
      : i % 4 === 1
        ? "System diagnostic check performed"
        : i % 4 === 2
          ? "Temperature calibration adjusted"
          : "Routine check performed. System nominal.",
}));

// Generate mock recent control actions. [19]
export const mockRecentActions = Array.from({ length: 50 }, (_, i) => ({
  id: `action-${i}`,
  timestamp: new Date(Date.now() - i * 60000 * 15).toISOString(),
  description:
    i % 5 === 0
      ? "Machine Power toggled ON by Admin"
      : i % 5 === 1
        ? "Automatic Control set to OFF"
        : i % 5 === 2
          ? "Water Production started by User"
          : i % 5 === 3
            ? "System maintenance mode activated"
            : "Temperature threshold adjusted by Admin",
}));


