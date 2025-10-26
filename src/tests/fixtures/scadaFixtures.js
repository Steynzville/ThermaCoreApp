/**
 * SCADA Test Data Generators and Fixtures
 *
 * Provides realistic test data for SCADA components including:
 * - Real-time metrics
 * - Alarm data
 * - Historical trends
 * - System health data
 * - Performance metrics
 */

/**
 * Generate realistic SCADA metrics
 */
export function generateSCADAMetrics(overrides = {}) {
  const baseMetrics = {
    timestamp: new Date().toISOString(),
    temperature: 45 + Math.random() * 30,
    pressure: 100 + Math.random() * 50,
    flowRate: 200 + Math.random() * 100,
    level: 50 + Math.random() * 40,
    power: 1000 + Math.random() * 500,
    efficiency: 75 + Math.random() * 20,
    rpm: 1500 + Math.random() * 500,
    voltage: 220 + Math.random() * 20,
    current: 10 + Math.random() * 5,
  };

  return { ...baseMetrics, ...overrides };
}

/**
 * Generate time-series data for trend charts
 */
export function generateTimeSeriesData(points = 100, options = {}) {
  const {
    startTime = Date.now() - points * 1000,
    interval = 1000,
    baseValue = 50,
    variation = 10,
    trend = "stable", // 'stable', 'increasing', 'decreasing', 'random'
  } = options;

  const data = [];
  let currentValue = baseValue;

  for (let i = 0; i < points; i++) {
    const timestamp = new Date(startTime + i * interval);

    // Apply trend
    if (trend === "increasing") {
      currentValue += (Math.random() * variation) / 10;
    } else if (trend === "decreasing") {
      currentValue -= (Math.random() * variation) / 10;
    } else if (trend === "random") {
      currentValue += (Math.random() - 0.5) * variation;
    } else {
      // Stable with small fluctuations
      currentValue += (Math.random() - 0.5) * (variation / 5);
    }

    // Keep within reasonable bounds
    currentValue = Math.max(0, Math.min(100, currentValue));

    data.push({
      timestamp: timestamp.toISOString(),
      time: timestamp.getTime(),
      value: Number.parseFloat(currentValue.toFixed(2)),
    });
  }

  return data;
}

/**
 * Generate multi-source time-series data
 */
export function generateMultiSourceData(
  sources = 3,
  points = 100,
  options = {},
) {
  const result = {};

  for (let i = 0; i < sources; i++) {
    const sourceId = `source-${i + 1}`;
    result[sourceId] = generateTimeSeriesData(points, {
      ...options,
      baseValue: (options.baseValue || 50) + i * 10,
    });
  }

  return result;
}

/**
 * Generate alarm data with various priorities and states
 */
export function generateAlarmData(count = 10, options = {}) {
  const { minPriority = 1, maxPriority = 5, acknowledgedRatio = 0.3 } = options;

  const alarmTypes = [
    "Temperature High",
    "Pressure Low",
    "Flow Rate Abnormal",
    "Level Critical",
    "Equipment Fault",
    "Communication Error",
    "Power Failure",
    "Safety Interlock",
  ];

  const alarms = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const priority =
      Math.floor(Math.random() * (maxPriority - minPriority + 1)) + minPriority;
    const isAcknowledged = Math.random() < acknowledgedRatio;
    const ageMs = Math.random() * 3600000; // Up to 1 hour old

    alarms.push({
      id: `alarm-${i + 1}`,
      type: alarmTypes[Math.floor(Math.random() * alarmTypes.length)],
      priority,
      severity: priority <= 2 ? "critical" : priority <= 3 ? "warning" : "info",
      message: `Alarm ${i + 1}: ${alarmTypes[Math.floor(Math.random() * alarmTypes.length)]}`,
      timestamp: new Date(now - ageMs).toISOString(),
      acknowledged: isAcknowledged,
      acknowledgedBy: isAcknowledged
        ? `user-${Math.floor(Math.random() * 5) + 1}`
        : null,
      acknowledgedAt: isAcknowledged
        ? new Date(now - ageMs / 2).toISOString()
        : null,
      source: `device-${Math.floor(Math.random() * 10) + 1}`,
      value: Math.random() * 100,
      threshold: Math.random() * 100,
      active: Math.random() > 0.2, // 80% active
    });
  }

  return alarms.sort((a, b) => b.priority - a.priority);
}

/**
 * Generate alert data for enterprise alerts
 */
export function generateAlertData(count = 10, options = {}) {
  const { categories = ["system", "security", "maintenance", "performance"] } =
    options;

  const alerts = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const ageMs = Math.random() * 86400000; // Up to 24 hours old

    alerts.push({
      id: `alert-${i + 1}`,
      category,
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} Alert ${i + 1}`,
      message: `This is a ${category} alert message with details about the event.`,
      severity: ["low", "medium", "high"][Math.floor(Math.random() * 3)],
      timestamp: new Date(now - ageMs).toISOString(),
      read: Math.random() > 0.5,
      dismissed: Math.random() > 0.7,
      source: `system-${Math.floor(Math.random() * 5) + 1}`,
      metadata: {
        component: `Component-${Math.floor(Math.random() * 10) + 1}`,
        errorCode: `E${Math.floor(Math.random() * 9000) + 1000}`,
      },
    });
  }

  return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Generate system health data
 */
export function generateSystemHealthData(components = 5) {
  const healthStates = ["healthy", "warning", "critical", "offline"];
  const healthData = [];

  for (let i = 0; i < components; i++) {
    const state = healthStates[Math.floor(Math.random() * healthStates.length)];

    healthData.push({
      id: `component-${i + 1}`,
      name: `Component ${i + 1}`,
      status: state,
      uptime: Math.floor(Math.random() * 86400), // seconds
      lastCheck: new Date(Date.now() - Math.random() * 60000).toISOString(),
      metrics: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        temperature: 40 + Math.random() * 40,
      },
      errors: state === "critical" ? Math.floor(Math.random() * 10) + 1 : 0,
      warnings: state === "warning" ? Math.floor(Math.random() * 5) + 1 : 0,
    });
  }

  return healthData;
}

/**
 * Generate unit performance data
 */
export function generateUnitPerformanceData(units = 3) {
  const performanceData = [];

  for (let i = 0; i < units; i++) {
    const efficiency = 70 + Math.random() * 25;
    const isOptimal = efficiency > 85;

    performanceData.push({
      id: `unit-${i + 1}`,
      name: `Unit ${i + 1}`,
      efficiency: Number.parseFloat(efficiency.toFixed(2)),
      output: Number.parseFloat((1000 + Math.random() * 500).toFixed(2)),
      input: Number.parseFloat((1200 + Math.random() * 600).toFixed(2)),
      operatingHours: Math.floor(Math.random() * 10000),
      status: isOptimal ? "optimal" : efficiency > 75 ? "normal" : "degraded",
      alerts: isOptimal ? 0 : Math.floor(Math.random() * 3),
      lastMaintenance: new Date(
        Date.now() - Math.random() * 2592000000,
      ).toISOString(),
      nextMaintenance: new Date(
        Date.now() + Math.random() * 2592000000,
      ).toISOString(),
      metrics: {
        temperature: 45 + Math.random() * 30,
        pressure: 100 + Math.random() * 50,
        vibration: Math.random() * 5,
        fuelConsumption: 50 + Math.random() * 30,
      },
    });
  }

  return performanceData;
}

/**
 * Generate protocol connection data
 */
export function generateProtocolConnectionData(protocol = "modbus") {
  const baseData = {
    id: `${protocol}-${Date.now()}`,
    protocol: protocol.toUpperCase(),
    status: ["connected", "disconnected", "error"][
      Math.floor(Math.random() * 3)
    ],
    timestamp: new Date().toISOString(),
    lastSeen: new Date(Date.now() - Math.random() * 60000).toISOString(),
  };

  if (protocol === "modbus") {
    return {
      ...baseData,
      host: `192.168.1.${Math.floor(Math.random() * 255)}`,
      port: 502,
      unitId: Math.floor(Math.random() * 10) + 1,
      registerCount: Math.floor(Math.random() * 100),
      coilCount: Math.floor(Math.random() * 50),
    };
  } else if (protocol === "opcua") {
    return {
      ...baseData,
      endpointUrl: `opc.tcp://localhost:${4840 + Math.floor(Math.random() * 10)}`,
      securityMode: ["None", "Sign", "SignAndEncrypt"][
        Math.floor(Math.random() * 3)
      ],
      nodeCount: Math.floor(Math.random() * 200),
      subscriptionCount: Math.floor(Math.random() * 10),
    };
  } else if (protocol === "dnp3") {
    return {
      ...baseData,
      host: `192.168.1.${Math.floor(Math.random() * 255)}`,
      port: 20000,
      masterAddress: 1,
      outstationAddress: 10,
      binaryPoints: Math.floor(Math.random() * 50),
      analogPoints: Math.floor(Math.random() * 50),
    };
  }

  return baseData;
}

/**
 * Generate 60fps streaming data generator
 */
export function create60fpsDataGenerator(options = {}) {
  const {
    baseValue = 50,
    amplitude = 10,
    frequency = 0.1,
    noise = 2,
  } = options;

  let frame = 0;

  return (frameNumber = null) => {
    const currentFrame = frameNumber !== null ? frameNumber : frame++;
    const time = currentFrame / 60; // Convert frame to seconds

    // Generate sine wave with noise
    const sineValue =
      baseValue + Math.sin(time * frequency * 2 * Math.PI) * amplitude;
    const noiseValue = (Math.random() - 0.5) * noise;
    const value = sineValue + noiseValue;

    return {
      frame: currentFrame,
      timestamp: Date.now(),
      value: Number.parseFloat(value.toFixed(2)),
      metrics: generateSCADAMetrics(),
    };
  };
}

/**
 * Fixture: Default SCADA dashboard data
 */
export const scadaDashboardFixture = {
  metrics: [
    {
      id: "temp",
      label: "Temperature",
      value: 65.5,
      unit: "°C",
      status: "normal",
    },
    {
      id: "press",
      label: "Pressure",
      value: 125.3,
      unit: "PSI",
      status: "normal",
    },
    {
      id: "flow",
      label: "Flow Rate",
      value: 245.8,
      unit: "GPM",
      status: "warning",
    },
    { id: "level", label: "Level", value: 78.2, unit: "%", status: "normal" },
  ],
  protocols: [
    { id: "modbus-1", protocol: "Modbus", status: "connected", devices: 5 },
    { id: "opcua-1", protocol: "OPC-UA", status: "connected", devices: 3 },
    { id: "dnp3-1", protocol: "DNP3", status: "disconnected", devices: 2 },
  ],
  alarms: generateAlarmData(5, { maxPriority: 3 }),
};

/**
 * Fixture: Protocol wizard configuration
 */
export const protocolWizardFixture = {
  modbus: {
    device_id: "PLC-001",
    host: "192.168.1.100",
    port: 502,
    unit_id: 1,
    timeout: 5,
  },
  opcua: {
    device_id: "OPC-Server-001",
    endpoint_url: "opc.tcp://localhost:4840",
    security_mode: "None",
    security_policy: "None",
    username: "",
    password: "",
  },
  dnp3: {
    device_id: "RTU-001",
    host: "192.168.1.200",
    port: 20000,
    master_address: 1,
    outstation_address: 10,
    link_timeout: 5,
    app_timeout: 5,
  },
};

export default {
  generateSCADAMetrics,
  generateTimeSeriesData,
  generateMultiSourceData,
  generateAlarmData,
  generateAlertData,
  generateSystemHealthData,
  generateUnitPerformanceData,
  generateProtocolConnectionData,
  create60fpsDataGenerator,
  scadaDashboardFixture,
  protocolWizardFixture,
};
