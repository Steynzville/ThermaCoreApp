import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkAllStatus,
  checkBackendStatus,
  checkDatabaseStatus,
  checkFrontendStatus,
  checkWebSocketStatus,
} from "../../services/statusMonitor";

describe("Status Monitor Service - /src/services/statusMonitor.js", () => {
  let fetchSpy;
  let nowValue;
  const originalLocation = window.location;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch");
    nowValue = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => nowValue);

    // Mock window.location.origin
    const originalLocation = window.location;
    delete window.location;
    window.location = {
      ...originalLocation,
      origin: "http://test-frontend.com",
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  describe("checkFrontendStatus", () => {
    it("should return Operational status on HEAD request success", async () => {
      fetchSpy.mockImplementationOnce(async () => {
        nowValue = 1050; // 50ms elapsed
        return {
          ok: true,
          status: 200,
        };
      });

      const status = await checkFrontendStatus();

      // ✅ FIX: Use a more flexible matcher for signal
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://test-frontend.com/index.html",
        expect.objectContaining({
          method: "HEAD",
          headers: { "Content-Type": "application/json" },
        }),
      );
      // ✅ Check signal exists separately
      expect(fetchSpy.mock.calls[0][1]).toHaveProperty("signal");

      expect(status).toEqual({
        name: "Frontend Hosting",
        provider: "Netlify",
        status: "Operational",
        responseTime: "50ms",
        icon: "Globe",
        error: undefined,
      });
    });

    it("should return Outage status on HEAD request failure / error status", async () => {
      fetchSpy.mockImplementationOnce(async () => {
        nowValue = 1080; // 80ms elapsed
        return {
          ok: false,
          status: 500,
        };
      });

      const status = await checkFrontendStatus();

      expect(status.status).toBe("Outage");
      expect(status.responseTime).toBe("80ms");
      expect(status.error).toBe("HTTP 500");
    });

    it("should return Outage on abort/timeout error", async () => {
      fetchSpy.mockImplementationOnce(async () => {
        nowValue = 6000; // 5000ms elapsed
        const abortError = new Error("The user aborted a request.");
        abortError.name = "AbortError";
        throw abortError;
      });

      const status = await checkFrontendStatus();

      expect(status.status).toBe("Outage");
      expect(status.responseTime).toBe("5000ms");
      expect(status.error).toBe("Timeout");
    });

    it("should return Outage on general connection failed error", async () => {
      fetchSpy.mockImplementationOnce(async () => {
        nowValue = 1120; // 120ms elapsed
        throw new Error("ENOTFOUND");
      });

      const status = await checkFrontendStatus();

      expect(status.status).toBe("Outage");
      expect(status.responseTime).toBe("120ms");
      expect(status.error).toBe("ENOTFOUND");
    });
  });

  describe("checkBackendStatus", () => {
    const API_BASE_URL =
      import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com";

    it("should return Operational status on GET health success", async () => {
      fetchSpy.mockImplementationOnce(async () => {
        nowValue = 1050; // 50ms elapsed
        return {
          ok: true,
          status: 200,
        };
      });

      const status = await checkBackendStatus();

      // ✅ FIX: Use a more flexible matcher for signal
      expect(fetchSpy).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/v1/health`,
        expect.objectContaining({
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
      );
      expect(fetchSpy.mock.calls[0][1]).toHaveProperty("signal");

      expect(status.status).toBe("Operational");
      expect(status.responseTime).toBe("50ms");
    });

    it("should return Degraded Performance status when health endpoint returns error HTTP code", async () => {
      fetchSpy.mockImplementationOnce(async () => {
        nowValue = 1060; // 60ms elapsed
        return {
          ok: false,
          status: 503,
        };
      });

      const status = await checkBackendStatus();

      expect(status.status).toBe("Degraded Performance");
      expect(status.responseTime).toBe("60ms");
      expect(status.error).toBe("HTTP 503");
    });

    it("should return Outage when backend fetch fails", async () => {
      fetchSpy.mockImplementationOnce(async () => {
        nowValue = 1220; // 220ms elapsed
        throw new Error("Connection refused");
      });

      const status = await checkBackendStatus();

      expect(status.status).toBe("Outage");
      expect(status.responseTime).toBe("220ms");
      expect(status.error).toBe("Connection refused");
    });
  });

  describe("checkDatabaseStatus", () => {
    const API_BASE_URL =
      import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com";

    it("should return Operational when database.connected is true", async () => {
      fetchSpy.mockImplementationOnce(async () => {
        nowValue = 1040; // 40ms elapsed
        return {
          ok: true,
          status: 200,
          json: async () => ({ database: { connected: true } }),
        };
      });

      const status = await checkDatabaseStatus();

      // ✅ FIX: Use a more flexible matcher for signal
      expect(fetchSpy).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/v1/health`,
        expect.objectContaining({}),
      );
      expect(fetchSpy.mock.calls[0][1]).toHaveProperty("signal");

      expect(status).toEqual({
        name: "Database",
        provider: "Neon PostgreSQL",
        status: "Operational",
        responseTime: "40ms",
        icon: "Database",
      });
    });

    it("should return Degraded Performance when database.connected is false", async () => {
      fetchSpy.mockImplementationOnce(async () => {
        nowValue = 1050; // 50ms elapsed
        return {
          ok: true,
          status: 200,
          json: async () => ({ database: { connected: false } }),
        };
      });

      const status = await checkDatabaseStatus();

      expect(status.status).toBe("Degraded Performance");
      expect(status.responseTime).toBe("50ms");
    });

    it("should return Degraded Performance when database endpoint response is not ok", async () => {
      fetchSpy.mockImplementationOnce(async () => {
        nowValue = 1060; // 60ms elapsed
        return {
          ok: false,
          status: 500,
        };
      });

      const status = await checkDatabaseStatus();

      expect(status.status).toBe("Degraded Performance");
      expect(status.responseTime).toBe("60ms");
      expect(status.error).toBe("HTTP 500");
    });

    it("should return Outage when database fetch fails", async () => {
      fetchSpy.mockImplementationOnce(async () => {
        nowValue = 1020; // 20ms elapsed
        throw new Error("Timeout waiting for db");
      });

      const status = await checkDatabaseStatus();

      expect(status.status).toBe("Outage");
      expect(status.responseTime).toBe("20ms");
      expect(status.error).toBe("Timeout waiting for db");
    });

    it("should return Outage with Timeout error when database fetch aborts", async () => {
      fetchSpy.mockImplementationOnce(async () => {
        nowValue = 1090; // 90ms elapsed
        const abortError = new Error("The user aborted a request.");
        abortError.name = "AbortError";
        throw abortError;
      });

      const status = await checkDatabaseStatus();

      expect(status.status).toBe("Outage");
      expect(status.responseTime).toBe("90ms");
      expect(status.error).toBe("Timeout");
    });
  });

  describe("checkWebSocketStatus", () => {
    it("should evaluate WebSocket status using the health endpoint as a proxy", async () => {
      fetchSpy.mockImplementationOnce(async () => {
        nowValue = 1030; // 30ms elapsed
        return {
          ok: true,
          status: 200,
        };
      });

      const status = await checkWebSocketStatus();

      expect(status).toEqual({
        name: "Real-time Messaging",
        provider: "Mosquitto MQTT Broker",
        status: "Operational",
        responseTime: "30ms",
        icon: "Activity",
        error: undefined,
      });
    });
  });

  describe("checkAllStatus", () => {
    it("should compile all infrastructure statuses correctly", async () => {
      fetchSpy.mockImplementation(async () => {
        nowValue += 10;
        return {
          ok: true,
          status: 200,
          json: async () => ({ database: { connected: true } }),
        };
      });

      const allStatuses = await checkAllStatus();

      expect(allStatuses).toHaveLength(4);
      expect(allStatuses[0].name).toBe("Frontend Hosting");
      expect(allStatuses[1].name).toBe("Backend API");
      expect(allStatuses[2].name).toBe("Database");
      expect(allStatuses[3].name).toBe("Real-time Messaging");
    });
  });
});
