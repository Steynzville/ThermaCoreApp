import { io } from "socket.io-client";
import { API_BASE_URL, isDemoMode } from "../config/runtime";
import { getAuthToken } from "../utils/authToken";

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.statusListeners = new Set();
    this.status = "disconnected";
    this.pending = null;
    this.tenantId = null;
  }
  setStatus(status) {
    this.status = status;
    for (const listener of this.statusListeners) listener(status);
  }
  connect(tenantId = null) {
    if (isDemoMode) {
      this.setStatus("demo");
      return Promise.resolve();
    }
    if (this.socket && this.tenantId === tenantId) {
      if (this.socket.connected) return Promise.resolve();
      if (this.pending) return this.pending;
    }
    this.disconnect();
    this.tenantId = tenantId;
    this.setStatus("connecting");
    this.socket = io(API_BASE_URL, {
      autoConnect: false,
      path: "/socket.io",
      auth: (callback) =>
        callback({ token: getAuthToken(), tenant_id: tenantId }),
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
    });
    const socket = this.socket;
    socket.onAny((event, data) => {
      for (const cb of this.listeners.get(event) || []) cb(data);
    });
    socket.on("connect", () => this.setStatus("connected"));
    socket.on("disconnect", () => this.setStatus("disconnected"));
    socket.on("connect_error", () => this.setStatus("disconnected"));
    socket.io.on("reconnect_attempt", () => this.setStatus("reconnecting"));
    this.pending = new Promise((resolve, reject) => {
      const done = () => {
        socket.off("connect_error", failed);
        this.pending = null;
        resolve();
      };
      const failed = (err) => {
        socket.off("connect", done);
        this.pending = null;
        reject(err);
      };
      socket.once("connect", done);
      socket.once("connect_error", failed);
    });
    socket.connect();
    return this.pending;
  }
  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
    this.socket = null;
    this.pending = null;
    this.setStatus("disconnected");
  }
  subscribe(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return () => this.unsubscribe(event, callback);
  }
  unsubscribe(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }
  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.offStatusChange(callback);
  }
  offStatusChange(callback) {
    this.statusListeners.delete(callback);
  }
  isConnected() {
    return this.socket?.connected === true;
  }
  send(event, data) {
    this.socket?.emit(event, data);
  }
  getStatus() {
    return this.status;
  }
}
const websocketService = new WebSocketService();
export { WebSocketService };
export default websocketService;
