/**
 * Protocol Data Factories
 *
 * Standardized mock data generation for DNP3, MQTT, Modbus, and OPC UA protocols.
 * Provides consistent test data patterns across all protocol dashboards.
 */

/**
 * Generate DNP3 protocol data
 */
export const createDNP3Data = (overrides = {}) => {
  const defaults = {
    outstation: {
      id: `dnp3-${Date.now()}`,
      name: "RTU-001",
      host: "192.168.1.200",
      port: 20000,
      masterAddress: 1,
      outstationAddress: 10,
      status: "connected",
      lastSeen: new Date().toISOString(),
      linkStatus: "UP",
      ...overrides.outstation,
    },
    binaryInputs: Array.from({ length: 10 }, (_, i) => ({
      index: i,
      value: Math.random() > 0.5,
      quality: "ONLINE",
      timestamp: new Date().toISOString(),
      description: `Binary Input ${i}`,
      ...overrides.binaryInputs?.[i],
    })),
    analogInputs: Array.from({ length: 10 }, (_, i) => ({
      index: i,
      value: Math.random() * 100,
      quality: "ONLINE",
      timestamp: new Date().toISOString(),
      description: `Analog Input ${i}`,
      unit: "units",
      ...overrides.analogInputs?.[i],
    })),
    binaryOutputs: Array.from({ length: 5 }, (_, i) => ({
      index: i,
      value: Math.random() > 0.5,
      quality: "ONLINE",
      timestamp: new Date().toISOString(),
      description: `Binary Output ${i}`,
      ...overrides.binaryOutputs?.[i],
    })),
    analogOutputs: Array.from({ length: 5 }, (_, i) => ({
      index: i,
      value: Math.random() * 100,
      quality: "ONLINE",
      timestamp: new Date().toISOString(),
      description: `Analog Output ${i}`,
      unit: "units",
      ...overrides.analogOutputs?.[i],
    })),
    events: Array.from({ length: 5 }, (_, i) => ({
      id: `event-${i}`,
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      type: ["integrity_poll", "unsolicited", "class_poll"][i % 3],
      message: `DNP3 event ${i}`,
      severity: ["info", "warning", "error"][i % 3],
      ...overrides.events?.[i],
    })),
  };

  return defaults;
};

/**
 * Generate MQTT protocol data
 */
export const createMQTTData = (overrides = {}) => {
  const defaults = {
    broker: {
      id: `mqtt-${Date.now()}`,
      name: "MQTT Broker",
      host: "mqtt.thermacore.local",
      port: 1883,
      protocol: "mqtt",
      status: "connected",
      clientId: `client-${Date.now()}`,
      lastSeen: new Date().toISOString(),
      ...overrides.broker,
    },
    subscriptions: Array.from({ length: 5 }, (_, i) => ({
      id: `sub-${i}`,
      topic: `thermacore/${["sensors", "controls", "alerts", "status", "data"][i % 5]}/+`,
      qos: [0, 1, 2][i % 3],
      messagesReceived: Math.floor(Math.random() * 1000),
      lastMessage: new Date(Date.now() - i * 1000).toISOString(),
      ...overrides.subscriptions?.[i],
    })),
    messages: Array.from({ length: 10 }, (_, i) => ({
      id: `msg-${i}`,
      topic: `thermacore/sensors/${i}`,
      payload: JSON.stringify({
        temperature: 20 + Math.random() * 10,
        humidity: 40 + Math.random() * 20,
        timestamp: new Date().toISOString(),
      }),
      qos: [0, 1, 2][i % 3],
      retained: i % 3 === 0,
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      ...overrides.messages?.[i],
    })),
    statistics: {
      messagesPublished: Math.floor(Math.random() * 10000),
      messagesReceived: Math.floor(Math.random() * 10000),
      bytesPublished: Math.floor(Math.random() * 1000000),
      bytesReceived: Math.floor(Math.random() * 1000000),
      connectionUptime: Math.floor(Math.random() * 86400),
      ...overrides.statistics,
    },
  };

  return defaults;
};

/**
 * Generate Modbus protocol data
 */
export const createModbusData = (overrides = {}) => {
  const defaults = {
    device: {
      id: `modbus-${Date.now()}`,
      name: "PLC-001",
      host: "192.168.1.100",
      port: 502,
      unitId: 1,
      status: "connected",
      lastSeen: new Date().toISOString(),
      protocol: "TCP",
      ...overrides.device,
    },
    holdingRegisters: Array.from({ length: 10 }, (_, i) => ({
      address: i,
      value: Math.floor(Math.random() * 65536),
      description: `Holding Register ${i}`,
      dataType: "uint16",
      unit: "units",
      ...overrides.holdingRegisters?.[i],
    })),
    inputRegisters: Array.from({ length: 10 }, (_, i) => ({
      address: i,
      value: Math.floor(Math.random() * 65536),
      description: `Input Register ${i}`,
      dataType: "uint16",
      unit: "units",
      ...overrides.inputRegisters?.[i],
    })),
    coils: Array.from({ length: 10 }, (_, i) => ({
      address: i,
      value: Math.random() > 0.5,
      description: `Coil ${i}`,
      ...overrides.coils?.[i],
    })),
    discreteInputs: Array.from({ length: 10 }, (_, i) => ({
      address: i,
      value: Math.random() > 0.5,
      description: `Discrete Input ${i}`,
      ...overrides.discreteInputs?.[i],
    })),
    transactions: {
      total: Math.floor(Math.random() * 10000),
      successful: Math.floor(Math.random() * 9500),
      failed: Math.floor(Math.random() * 500),
      errorRate: Math.random() * 0.05,
      lastTransaction: new Date().toISOString(),
      ...overrides.transactions,
    },
  };

  return defaults;
};

/**
 * Generate OPC UA protocol data
 */
export const createOPCUAData = (overrides = {}) => {
  // Common OPC UA node names
  const OPCUA_NODE_NAMES = [
    "Temperature",
    "Pressure",
    "FlowRate",
    "Level",
    "Status",
    "Voltage",
    "Current",
    "Power",
    "Energy",
    "Frequency",
  ];

  const defaults = {
    server: {
      id: `opcua-${Date.now()}`,
      name: "OPC UA Server",
      endpointUrl: "opc.tcp://localhost:4840",
      status: "connected",
      securityMode: "None",
      securityPolicy: "None",
      sessionId: `session-${Date.now()}`,
      lastSeen: new Date().toISOString(),
      ...overrides.server,
    },
    nodes: Array.from({ length: 10 }, (_, i) => ({
      nodeId: `ns=2;i=${1000 + i}`,
      browseName: OPCUA_NODE_NAMES[i % 10],
      displayName: OPCUA_NODE_NAMES[i % 10],
      value: Math.random() * 100,
      dataType: "Double",
      nodeClass: "Variable",
      timestamp: new Date().toISOString(),
      statusCode: "Good",
      ...overrides.nodes?.[i],
    })),
    subscriptions: Array.from({ length: 3 }, (_, i) => ({
      id: `sub-${i}`,
      publishingInterval: [100, 500, 1000][i],
      nodeIds: Array.from(
        { length: 3 },
        (_, j) => `ns=2;i=${1000 + i * 3 + j}`,
      ),
      monitoredItemCount: 3,
      notificationCount: Math.floor(Math.random() * 1000),
      status: "active",
      ...overrides.subscriptions?.[i],
    })),
    browseTree: {
      rootNode: {
        nodeId: "ns=0;i=84",
        browseName: "Objects",
        children: Array.from({ length: 5 }, (_, i) => ({
          nodeId: `ns=2;i=${100 + i}`,
          browseName: `Object${i}`,
          nodeClass: "Object",
        })),
      },
      ...overrides.browseTree,
    },
    diagnostics: {
      sessionCount: Math.floor(Math.random() * 10),
      subscriptionCount: 3,
      monitoredItemCount: 9,
      publishRequestCount: Math.floor(Math.random() * 10000),
      serverState: "Running",
      currentTime: new Date().toISOString(),
      ...overrides.diagnostics,
    },
  };

  return defaults;
};

/**
 * Generate protocol connection event data
 */
export const createProtocolEvent = (
  protocolType,
  eventType,
  overrides = {},
) => {
  const defaults = {
    id: `event-${Date.now()}`,
    protocol: protocolType,
    eventType,
    timestamp: new Date().toISOString(),
    message: `${protocolType} ${eventType} event`,
    severity: "info",
    data: {},
    ...overrides,
  };

  return defaults;
};

/**
 * Generate protocol error data
 */
export const createProtocolError = (
  protocolType,
  errorCode,
  overrides = {},
) => {
  const errorMessages = {
    connection_timeout: "Connection timeout",
    connection_refused: "Connection refused",
    authentication_failed: "Authentication failed",
    protocol_error: "Protocol error",
    read_error: "Read operation failed",
    write_error: "Write operation failed",
  };

  const defaults = {
    id: `error-${Date.now()}`,
    protocol: protocolType,
    errorCode,
    message: errorMessages[errorCode] || "Unknown error",
    timestamp: new Date().toISOString(),
    severity: "error",
    recoverable: true,
    ...overrides,
  };

  return defaults;
};

/**
 * Generate a collection of mixed protocol data for multi-protocol scenarios
 */
export const createMixedProtocolData = (overrides = {}) => {
  return {
    dnp3: createDNP3Data(overrides.dnp3),
    mqtt: createMQTTData(overrides.mqtt),
    modbus: createModbusData(overrides.modbus),
    opcua: createOPCUAData(overrides.opcua),
  };
};

/**
 * Create realistic time-series data for protocol metrics
 */
export const createProtocolTimeSeriesData = (
  _protocolType,
  dataPoints = 20,
  overrides = {},
) => {
  const now = Date.now();
  const interval = 1000; // 1 second between points

  return Array.from({ length: dataPoints }, (_, i) => ({
    timestamp: new Date(now - (dataPoints - i) * interval).toISOString(),
    value: 50 + Math.sin(i / 5) * 20 + Math.random() * 10,
    quality: i % 10 === 0 ? "UNCERTAIN" : "GOOD",
    ...overrides,
  }));
};

export default {
  createDNP3Data,
  createMQTTData,
  createModbusData,
  createOPCUAData,
  createProtocolEvent,
  createProtocolError,
  createMixedProtocolData,
  createProtocolTimeSeriesData,
};
