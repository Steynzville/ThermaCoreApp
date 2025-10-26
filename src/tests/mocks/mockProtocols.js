/**
 * Mock Protocol Services for Testing
 *
 * Provides mock implementations for Modbus, OPC-UA, and DNP3 protocols
 * to simulate device communication, registers/nodes/points, and error scenarios
 */

/**
 * Mock Modbus Protocol Service
 */
export class MockModbusService {
  constructor(config = {}) {
    this.config = {
      host: config.host || "localhost",
      port: config.port || 502,
      unitId: config.unitId || 1,
      timeout: config.timeout || 5000,
      ...config,
    };
    this.connected = false;
    this.registers = new Map();
    this.coils = new Map();
    this._initializeDefaults();
  }

  _initializeDefaults() {
    // Initialize some default registers
    for (let i = 0; i < 100; i++) {
      this.registers.set(i, Math.floor(Math.random() * 65536));
      this.coils.set(i, Math.random() > 0.5);
    }
  }

  async connect() {
    await this._simulateDelay(50);
    this.connected = true;
    return { success: true, message: "Connected to Modbus device" };
  }

  async disconnect() {
    await this._simulateDelay(10);
    this.connected = false;
    return { success: true };
  }

  async readHoldingRegisters(address, count) {
    if (!this.connected) {
      throw new Error("Not connected to Modbus device");
    }

    await this._simulateDelay(20);
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push(this.registers.get(address + i) || 0);
    }
    return { success: true, values };
  }

  async writeHoldingRegister(address, value) {
    if (!this.connected) {
      throw new Error("Not connected to Modbus device");
    }

    await this._simulateDelay(20);
    this.registers.set(address, value);
    return { success: true };
  }

  async readCoils(address, count) {
    if (!this.connected) {
      throw new Error("Not connected to Modbus device");
    }

    await this._simulateDelay(20);
    const values = [];
    for (let i = 0; i < count; i++) {
      values.push(this.coils.get(address + i) || false);
    }
    return { success: true, values };
  }

  async writeCoil(address, value) {
    if (!this.connected) {
      throw new Error("Not connected to Modbus device");
    }

    await this._simulateDelay(20);
    this.coils.set(address, value);
    return { success: true };
  }

  simulateError(errorType = "timeout") {
    this.nextError = errorType;
  }

  _simulateDelay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Mock OPC-UA Protocol Service
 */
export class MockOPCUAService {
  constructor(config = {}) {
    this.config = {
      endpointUrl: config.endpointUrl || "opc.tcp://localhost:4840",
      securityMode: config.securityMode || "None",
      securityPolicy: config.securityPolicy || "None",
      username: config.username || "",
      password: config.password || "",
      ...config,
    };
    this.connected = false;
    this.session = null;
    this.nodes = new Map();
    this._initializeNodes();
  }

  _initializeNodes() {
    // Initialize some default OPC-UA nodes
    const nodeTypes = [
      "Temperature",
      "Pressure",
      "FlowRate",
      "Level",
      "Status",
    ];
    nodeTypes.forEach((type, index) => {
      const nodeId = `ns=2;i=${1000 + index}`;
      this.nodes.set(nodeId, {
        nodeId,
        browseName: type,
        value: Math.random() * 100,
        dataType: "Double",
        timestamp: new Date(),
      });
    });
  }

  async connect() {
    await this._simulateDelay(100);
    this.connected = true;
    this.session = { id: `session-${Date.now()}` };
    return { success: true, sessionId: this.session.id };
  }

  async disconnect() {
    await this._simulateDelay(50);
    this.connected = false;
    this.session = null;
    return { success: true };
  }

  async browseNodes(_nodeId = "ns=0;i=84") {
    if (!this.connected) {
      throw new Error("Not connected to OPC-UA server");
    }

    await this._simulateDelay(30);
    const nodes = Array.from(this.nodes.values()).map((node) => ({
      nodeId: node.nodeId,
      browseName: node.browseName,
      displayName: node.browseName,
      nodeClass: "Variable",
    }));

    return { success: true, nodes };
  }

  async readNode(nodeId) {
    if (!this.connected) {
      throw new Error("Not connected to OPC-UA server");
    }

    await this._simulateDelay(20);
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    return {
      success: true,
      value: node.value,
      timestamp: new Date(),
      statusCode: "Good",
    };
  }

  async writeNode(nodeId, value) {
    if (!this.connected) {
      throw new Error("Not connected to OPC-UA server");
    }

    await this._simulateDelay(20);
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    node.value = value;
    node.timestamp = new Date();
    return { success: true, statusCode: "Good" };
  }

  async subscribe(nodeIds, callback, interval = 1000) {
    if (!this.connected) {
      throw new Error("Not connected to OPC-UA server");
    }

    const subscriptionId = `sub-${Date.now()}`;
    const intervalId = setInterval(() => {
      nodeIds.forEach((nodeId) => {
        const node = this.nodes.get(nodeId);
        if (node) {
          // Simulate value changes
          node.value = node.value + (Math.random() - 0.5) * 2;
          node.timestamp = new Date();
          callback({
            nodeId,
            value: node.value,
            timestamp: node.timestamp,
          });
        }
      });
    }, interval);

    return {
      subscriptionId,
      unsubscribe: () => clearInterval(intervalId),
    };
  }

  _simulateDelay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Mock DNP3 Protocol Service
 */
export class MockDNP3Service {
  constructor(config = {}) {
    this.config = {
      host: config.host || "localhost",
      port: config.port || 20000,
      masterAddress: config.masterAddress || 1,
      outstationAddress: config.outstationAddress || 10,
      linkTimeout: config.linkTimeout || 5,
      appTimeout: config.appTimeout || 5,
      ...config,
    };
    this.connected = false;
    this.binaryInputs = new Map();
    this.analogInputs = new Map();
    this.binaryOutputs = new Map();
    this.analogOutputs = new Map();
    this._initializePoints();
  }

  _initializePoints() {
    // Initialize DNP3 points
    for (let i = 0; i < 20; i++) {
      this.binaryInputs.set(i, {
        value: Math.random() > 0.5,
        quality: "ONLINE",
        timestamp: new Date(),
      });
    }

    for (let i = 0; i < 20; i++) {
      this.analogInputs.set(i, {
        value: Math.random() * 100,
        quality: "ONLINE",
        timestamp: new Date(),
      });
    }
  }

  async connect() {
    await this._simulateDelay(100);
    this.connected = true;
    return { success: true, message: "Connected to DNP3 outstation" };
  }

  async disconnect() {
    await this._simulateDelay(50);
    this.connected = false;
    return { success: true };
  }

  async readBinaryInputs(start, count) {
    if (!this.connected) {
      throw new Error("Not connected to DNP3 outstation");
    }

    await this._simulateDelay(30);
    const values = [];
    for (let i = 0; i < count; i++) {
      const point = this.binaryInputs.get(start + i);
      values.push(point || { value: false, quality: "OFFLINE" });
    }
    return { success: true, values };
  }

  async readAnalogInputs(start, count) {
    if (!this.connected) {
      throw new Error("Not connected to DNP3 outstation");
    }

    await this._simulateDelay(30);
    const values = [];
    for (let i = 0; i < count; i++) {
      const point = this.analogInputs.get(start + i);
      values.push(point || { value: 0, quality: "OFFLINE" });
    }
    return { success: true, values };
  }

  async writeBinaryOutput(index, value) {
    if (!this.connected) {
      throw new Error("Not connected to DNP3 outstation");
    }

    await this._simulateDelay(40);
    this.binaryOutputs.set(index, {
      value,
      quality: "ONLINE",
      timestamp: new Date(),
    });
    return { success: true };
  }

  async writeAnalogOutput(index, value) {
    if (!this.connected) {
      throw new Error("Not connected to DNP3 outstation");
    }

    await this._simulateDelay(40);
    this.analogOutputs.set(index, {
      value,
      quality: "ONLINE",
      timestamp: new Date(),
    });
    return { success: true };
  }

  async enableUnsolicited() {
    if (!this.connected) {
      throw new Error("Not connected to DNP3 outstation");
    }

    await this._simulateDelay(50);
    return { success: true, message: "Unsolicited responses enabled" };
  }

  simulateIntegrityPoll(callback) {
    if (!this.connected) {
      throw new Error("Not connected to DNP3 outstation");
    }

    const binaryData = Array.from(this.binaryInputs.values());
    const analogData = Array.from(this.analogInputs.values());

    callback({
      binaryInputs: binaryData,
      analogInputs: analogData,
      timestamp: new Date(),
    });
  }

  _simulateDelay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create mock protocol services
 */
export function createMockProtocolService(protocolType, config = {}) {
  switch (protocolType.toLowerCase()) {
    case "modbus":
      return new MockModbusService(config);
    case "opcua":
    case "opc-ua":
      return new MockOPCUAService(config);
    case "dnp3":
      return new MockDNP3Service(config);
    default:
      throw new Error(`Unknown protocol type: ${protocolType}`);
  }
}

/**
 * Mock protocol API responses
 */
export const mockProtocolResponses = {
  modbus: {
    devices: [
      {
        id: "modbus-1",
        name: "PLC-001",
        host: "192.168.1.100",
        port: 502,
        unitId: 1,
        status: "connected",
        lastSeen: new Date().toISOString(),
      },
      {
        id: "modbus-2",
        name: "PLC-002",
        host: "192.168.1.101",
        port: 502,
        unitId: 1,
        status: "disconnected",
        lastSeen: new Date(Date.now() - 300000).toISOString(),
      },
    ],
    registers: [
      { address: 0, value: 1234, description: "Temperature" },
      { address: 1, value: 5678, description: "Pressure" },
    ],
  },
  opcua: {
    servers: [
      {
        id: "opcua-1",
        name: "OPC-UA Server 1",
        endpointUrl: "opc.tcp://localhost:4840",
        status: "connected",
        securityMode: "None",
      },
    ],
    nodes: [
      {
        nodeId: "ns=2;i=1000",
        browseName: "Temperature",
        value: 25.5,
        dataType: "Double",
      },
      {
        nodeId: "ns=2;i=1001",
        browseName: "Pressure",
        value: 101.3,
        dataType: "Double",
      },
    ],
  },
  dnp3: {
    outstations: [
      {
        id: "dnp3-1",
        name: "RTU-001",
        host: "192.168.1.200",
        port: 20000,
        masterAddress: 1,
        outstationAddress: 10,
        status: "connected",
      },
    ],
    points: {
      binary: [
        { index: 0, value: true, quality: "ONLINE" },
        { index: 1, value: false, quality: "ONLINE" },
      ],
      analog: [
        { index: 0, value: 75.3, quality: "ONLINE" },
        { index: 1, value: 42.1, quality: "ONLINE" },
      ],
    },
  },
};

export default {
  MockModbusService,
  MockOPCUAService,
  MockDNP3Service,
  createMockProtocolService,
  mockProtocolResponses,
};
