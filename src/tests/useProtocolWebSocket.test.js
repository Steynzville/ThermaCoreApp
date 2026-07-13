/**
 * TEMPORARY DIAGNOSTIC FILE
 *
 * Goal: determine whether the hang happens at import/collection time
 * (before any test body runs) or inside a specific test.
 *
 * Swap this in for the real test file content, push, and check the log:
 *
 * - If this ALSO hangs with zero output for this file -> the problem is in
 *   the import graph (e.g. something in useProtocolWebSocket.js or
 *   protocolWebSocketService.js, or a shared setup file, doing real work /
 *   opening a real connection / an unresolved promise at module-eval time).
 *   That's independent of anything in my test code.
 *
 * - If this PASSES quickly -> collection is fine, the hang is inside one of
 *   the specific test bodies from the full file. Next step: reintroduce the
 *   describe blocks one at a time (or in halves) to bisect.
 */

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  useProtocolWebSocket,
  useProtocolEvent,
  useModbusRegisters,
  useOPCUANodes,
  useDNP3Points,
  useMQTTMessages,
} from "../hooks/useProtocolWebSocket";
import protocolWS from "../services/protocolWebSocketService";

vi.mock("../services/protocolWebSocketService", () => {
  const createMockProtocolWS = () => ({
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    send: vi.fn(),
    isConnected: vi.fn(() => false),
    onStatusChange: vi.fn(),
    offStatusChange: vi.fn(),
    getStatus: vi.fn(() => "disconnected"),
  });

  return {
    default: {
      modbus: createMockProtocolWS(),
      opcua: createMockProtocolWS(),
      dnp3: createMockProtocolWS(),
      mqtt: createMockProtocolWS(),
    },
  };
});

describe("DIAGNOSTIC - imports resolve and hooks are callable", () => {
  it("sanity check - true is true", () => {
    expect(true).toBe(true);
  });

  it("all five hook exports exist", () => {
    expect(typeof useProtocolWebSocket).toBe("function");
    expect(typeof useProtocolEvent).toBe("function");
    expect(typeof useModbusRegisters).toBe("function");
    expect(typeof useOPCUANodes).toBe("function");
    expect(typeof useDNP3Points).toBe("function");
    expect(typeof useMQTTMessages).toBe("function");
  });

  it("mocked service is in place", () => {
    expect(vi.isMockFunction(protocolWS.modbus.connect)).toBe(true);
  });

  it("useProtocolWebSocket mounts with autoConnect false", () => {
    const { result, unmount } = renderHook(() =>
      useProtocolWebSocket("modbus", null, false),
    );
    expect(result.current.connectionStatus).toBe("disconnected");
    unmount();
  });
});
