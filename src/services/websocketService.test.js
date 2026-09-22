import { it, vi, expect, beforeEach } from "vitest";
import { WebSocketService } from "./websocketService";
import { io } from "socket.io-client";
vi.mock("../config/runtime", () => ({
  API_BASE_URL: "https://api.example.test",
  isDemoMode: false,
}));
vi.mock("../utils/authToken", () => ({ getAuthToken: () => "private-jwt" }));
vi.mock("socket.io-client", () => ({ io: vi.fn() }));
let socket, handlers;
beforeEach(() => {
  handlers = {};
  socket = {
    connected: false,
    on: vi.fn((e, cb) => {
      (handlers[e] ||= []).push(cb);
    }),
    once: vi.fn((e, cb) => {
      (handlers[e] ||= []).push(cb);
    }),
    off: vi.fn(),
    onAny: vi.fn(),
    connect: vi.fn(() => {
      socket.connected = true;
      handlers.connect.forEach((cb) => cb());
    }),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
    emit: vi.fn(),
    io: { on: vi.fn() },
  };
  io.mockReturnValue(socket);
});
it("uses Socket.IO authentication payload, correct path and tenant selection", async () => {
  const service = new WebSocketService();
  await service.connect(7);
  expect(io).toHaveBeenCalledWith(
    "https://api.example.test",
    expect.objectContaining({ path: "/socket.io", autoConnect: false }),
  );
  const callback = vi.fn();
  io.mock.calls.at(-1)[1].auth(callback);
  expect(callback).toHaveBeenCalledWith({ token: "private-jwt", tenant_id: 7 });
  expect(service.isConnected()).toBe(true);
  service.disconnect();
  expect(socket.disconnect).toHaveBeenCalled();
});
it("delivers events to subscribers and unsubscribes cleanly", async () => {
  const service = new WebSocketService();
  const cb = vi.fn();
  const off = service.subscribe("sensor_data", cb);
  await service.connect();
  const deliver = socket.onAny.mock.calls[0][0];
  deliver("sensor_data", { unit_id: "A" });
  expect(cb).toHaveBeenCalledWith({ unit_id: "A" });
  off();
  deliver("sensor_data", {});
  expect(cb).toHaveBeenCalledTimes(1);
});
