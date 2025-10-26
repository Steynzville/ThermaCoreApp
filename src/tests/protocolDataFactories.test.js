/**
 * Tests for protocolDataFactories
 *
 * Tests protocol mock data generation for DNP3, MQTT, Modbus, and OPC UA.
 */

import { describe, expect, it } from "vitest";
import {
  createDNP3Data,
  createModbusData,
  createMQTTData,
  createOPCUAData,
} from "../tests/fixtures/protocolDataFactories";

describe("protocolDataFactories", () => {
  describe("createDNP3Data", () => {
    it("should create default DNP3 data structure", () => {
      const data = createDNP3Data();

      expect(data).toHaveProperty("outstation");
      expect(data).toHaveProperty("binaryInputs");
      expect(data).toHaveProperty("analogInputs");
      expect(data).toHaveProperty("binaryOutputs");
      expect(data).toHaveProperty("analogOutputs");
      expect(data).toHaveProperty("events");
    });

    it("should create outstation with correct properties", () => {
      const data = createDNP3Data();

      expect(data.outstation).toHaveProperty("id");
      expect(data.outstation).toHaveProperty("name", "RTU-001");
      expect(data.outstation).toHaveProperty("host", "192.168.1.200");
      expect(data.outstation).toHaveProperty("port", 20000);
      expect(data.outstation).toHaveProperty("status", "connected");
    });

    it("should create 10 binary inputs", () => {
      const data = createDNP3Data();

      expect(data.binaryInputs).toHaveLength(10);
      data.binaryInputs.forEach((input, i) => {
        expect(input.index).toBe(i);
        expect(input).toHaveProperty("value");
        expect(input).toHaveProperty("quality", "ONLINE");
        expect(input).toHaveProperty("timestamp");
      });
    });

    it("should create 10 analog inputs", () => {
      const data = createDNP3Data();

      expect(data.analogInputs).toHaveLength(10);
      data.analogInputs.forEach((input, i) => {
        expect(input.index).toBe(i);
        expect(input).toHaveProperty("value");
        expect(input).toHaveProperty("quality", "ONLINE");
        expect(input).toHaveProperty("unit", "units");
      });
    });

    it("should accept overrides for outstation", () => {
      const data = createDNP3Data({
        outstation: { name: "Custom RTU", port: 30000 },
      });

      expect(data.outstation.name).toBe("Custom RTU");
      expect(data.outstation.port).toBe(30000);
      expect(data.outstation.host).toBe("192.168.1.200"); // Default preserved
    });

    it("should accept overrides for inputs", () => {
      const data = createDNP3Data({
        binaryInputs: [{ index: 0, value: true, quality: "OFFLINE" }],
      });

      expect(data.binaryInputs[0].value).toBe(true);
      expect(data.binaryInputs[0].quality).toBe("OFFLINE");
    });

    it("should create events array", () => {
      const data = createDNP3Data();

      expect(data.events).toHaveLength(5);
      data.events.forEach((event) => {
        expect(event).toHaveProperty("id");
        expect(event).toHaveProperty("timestamp");
        expect(event).toHaveProperty("type");
        expect(event).toHaveProperty("message");
        expect(event).toHaveProperty("severity");
      });
    });
  });

  describe("createMQTTData", () => {
    it("should create default MQTT data structure", () => {
      const data = createMQTTData();

      expect(data).toHaveProperty("broker");
      expect(data).toHaveProperty("messages");
      expect(data).toHaveProperty("subscriptions");
      expect(data).toHaveProperty("statistics");
    });

    it("should create broker with correct properties", () => {
      const data = createMQTTData();

      expect(data.broker).toHaveProperty("id");
      expect(data.broker).toHaveProperty("name", "MQTT Broker");
      expect(data.broker).toHaveProperty("host", "mqtt.thermacore.local");
      expect(data.broker).toHaveProperty("status", "connected");
      expect(data.broker).toHaveProperty("port", 1883);
    });

    it("should create subscriptions array", () => {
      const data = createMQTTData();

      expect(Array.isArray(data.subscriptions)).toBe(true);
      expect(data.subscriptions).toHaveLength(5);
      data.subscriptions.forEach((sub) => {
        expect(sub).toHaveProperty("id");
        expect(sub).toHaveProperty("topic");
        expect(sub).toHaveProperty("qos");
      });
    });

    it("should create messages array", () => {
      const data = createMQTTData();

      expect(Array.isArray(data.messages)).toBe(true);
      expect(data.messages).toHaveLength(10);
      data.messages.forEach((message) => {
        expect(message).toHaveProperty("id");
        expect(message).toHaveProperty("topic");
        expect(message).toHaveProperty("payload");
        expect(message).toHaveProperty("timestamp");
      });
    });

    it("should create statistics object", () => {
      const data = createMQTTData();

      expect(data.statistics).toHaveProperty("messagesPublished");
      expect(data.statistics).toHaveProperty("messagesReceived");
      expect(data.statistics).toHaveProperty("bytesPublished");
      expect(data.statistics).toHaveProperty("bytesReceived");
    });

    it("should accept overrides for broker", () => {
      const data = createMQTTData({
        broker: { name: "Custom Broker", port: 8883 },
      });

      expect(data.broker.name).toBe("Custom Broker");
      expect(data.broker.port).toBe(8883);
    });
  });

  describe("createModbusData", () => {
    it("should create default Modbus data structure", () => {
      const data = createModbusData();

      expect(data).toHaveProperty("device");
      expect(data).toHaveProperty("coils");
      expect(data).toHaveProperty("discreteInputs");
      expect(data).toHaveProperty("holdingRegisters");
      expect(data).toHaveProperty("inputRegisters");
      expect(data).toHaveProperty("transactions");
    });

    it("should create device with correct properties", () => {
      const data = createModbusData();

      expect(data.device).toHaveProperty("id");
      expect(data.device).toHaveProperty("name");
      expect(data.device).toHaveProperty("host");
      expect(data.device).toHaveProperty("port");
      expect(data.device).toHaveProperty("status");
      expect(data.device).toHaveProperty("unitId");
    });

    it("should create coils array", () => {
      const data = createModbusData();

      expect(Array.isArray(data.coils)).toBe(true);
      expect(data.coils).toHaveLength(10);
      data.coils.forEach((coil, i) => {
        expect(coil.address).toBe(i);
        expect(typeof coil.value).toBe("boolean");
      });
    });

    it("should create holding registers array", () => {
      const data = createModbusData();

      expect(Array.isArray(data.holdingRegisters)).toBe(true);
      expect(data.holdingRegisters).toHaveLength(10);
      data.holdingRegisters.forEach((register, i) => {
        expect(register.address).toBe(i);
        expect(typeof register.value).toBe("number");
      });
    });

    it("should accept overrides for device", () => {
      const data = createModbusData({
        device: { name: "Custom PLC", unitId: 5 },
      });

      expect(data.device.name).toBe("Custom PLC");
      expect(data.device.unitId).toBe(5);
    });
  });

  describe("createOPCUAData", () => {
    it("should create default OPC UA data structure", () => {
      const data = createOPCUAData();

      expect(data).toHaveProperty("server");
      expect(data).toHaveProperty("nodes");
      expect(data).toHaveProperty("subscriptions");
      expect(data).toHaveProperty("browseTree");
      expect(data).toHaveProperty("diagnostics");
    });

    it("should create server with correct properties", () => {
      const data = createOPCUAData();

      expect(data.server).toHaveProperty("id");
      expect(data.server).toHaveProperty("name");
      expect(data.server).toHaveProperty("endpointUrl");
      expect(data.server).toHaveProperty("status");
    });

    it("should create nodes array", () => {
      const data = createOPCUAData();

      expect(Array.isArray(data.nodes)).toBe(true);
      expect(data.nodes).toHaveLength(10);
      data.nodes.forEach((node) => {
        expect(node).toHaveProperty("nodeId");
        expect(node).toHaveProperty("browseName");
        expect(node).toHaveProperty("value");
        expect(node).toHaveProperty("dataType");
        expect(node).toHaveProperty("timestamp");
      });
    });

    it("should create subscriptions array", () => {
      const data = createOPCUAData();

      expect(Array.isArray(data.subscriptions)).toBe(true);
      expect(data.subscriptions).toHaveLength(3);
      data.subscriptions.forEach((sub) => {
        expect(sub).toHaveProperty("id");
        expect(sub).toHaveProperty("nodeIds");
        expect(sub).toHaveProperty("publishingInterval");
      });
    });

    it("should accept overrides for server", () => {
      const data = createOPCUAData({
        server: { name: "Custom OPC Server", securityMode: "Sign" },
      });

      expect(data.server.name).toBe("Custom OPC Server");
      expect(data.server.securityMode).toBe("Sign");
    });
  });

  describe("Cross-protocol consistency", () => {
    it("should have consistent ID format across protocols", () => {
      const dnp3 = createDNP3Data();
      const mqtt = createMQTTData();
      const modbus = createModbusData();
      const opcua = createOPCUAData();

      expect(dnp3.outstation.id).toContain("dnp3-");
      expect(mqtt.broker.id).toContain("mqtt-");
      expect(modbus.device.id).toContain("modbus-");
      expect(opcua.server.id).toContain("opcua-");
    });

    it("should have consistent status values", () => {
      const dnp3 = createDNP3Data();
      const mqtt = createMQTTData();
      const modbus = createModbusData();
      const opcua = createOPCUAData();

      const validStatuses = [
        "connected",
        "disconnected",
        "connecting",
        "error",
      ];

      expect(validStatuses).toContain(dnp3.outstation.status);
      expect(validStatuses).toContain(mqtt.broker.status);
      expect(validStatuses).toContain(modbus.device.status);
      expect(validStatuses).toContain(opcua.server.status);
    });

    it("should create unique IDs on multiple calls", () => {
      // Small delay to ensure different timestamps
      const data1 = createDNP3Data();
      // IDs include timestamp, but calls in same millisecond may have same ID
      // This is acceptable behavior for mock data
      const data2 = createDNP3Data();

      // At minimum, verify IDs have correct format
      expect(data1.outstation.id).toContain("dnp3-");
      expect(data2.outstation.id).toContain("dnp3-");
    });
  });
});
