/**
 * Tests for statusMonitor Service
 *
 * Coverage includes:
 * - Frontend status checks
 * - Backend API status checks
 * - Database status checks via backend
 * - WebSocket/MQTT status checks
 * - Response time measurement
 * - Error handling for timeouts and failures
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkAllStatus,
  checkBackendStatus,
  checkDatabaseStatus,
  checkFrontendStatus,
  checkWebSocketStatus,
} from "./statusMonitor";

// Mock fetch globally - properly set up as a vi mock function
global.fetch = vi.fn();

// Mock performance.now
const mockPerformanceNow = vi.fn();
global.performance = {
  now: mockPerformanceNow,
};

describe("statusMonitor Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let time = 0;
    mockPerformanceNow.mockImplementation(() => {
      time += 100;
      return time;
    });
  });

  describe("checkFrontendStatus", () => {
    it("should return operational status when frontend is accessible", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await checkFrontendStatus();

      expect(result.name).toBe("Frontend Hosting");
      expect(result.provider).toBe("Netlify");
      expect(result.status).toBe("Operational");
      expect(result.icon).toBe("Globe");
      expect(result.responseTime).toMatch(/\d+ms/);
    });

    it("should return outage status when frontend is not accessible", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      const result = await checkFrontendStatus();

      expect(result.status).toBe("Outage");
      expect(result.error).toBeDefined();
    });

    it("should handle timeout errors", async () => {
      global.fetch.mockImplementation(() => {
        const error = new Error("Timeout");
        error.name = "AbortError";
        return Promise.reject(error);
      });

      const result = await checkFrontendStatus();

      expect(result.status).toBe("Outage");
      expect(result.error).toBe("Timeout");
    });
  });

  describe("checkBackendStatus", () => {
    it("should return operational status when backend is healthy", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: "operational",
          database: { connected: true },
        }),
      });

      const result = await checkBackendStatus();

      expect(result.name).toBe("Backend API");
      expect(result.provider).toBe("Render");
      expect(result.status).toBe("Operational");
      expect(result.icon).toBe("Server");
    });

    it("should return degraded status when backend returns non-OK status", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 503,
      });

      const result = await checkBackendStatus();

      expect(result.status).toBe("Degraded Performance");
      expect(result.error).toBe("HTTP 503");
    });

    it("should return outage status when backend is unreachable", async () => {
      global.fetch.mockRejectedValue(new Error("Connection failed"));

      const result = await checkBackendStatus();

      expect(result.status).toBe("Outage");
      expect(result.error).toBe("Connection failed");
    });
  });

  describe("checkDatabaseStatus", () => {
    it("should return operational when database is connected", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: "operational",
          database: {
            connected: true,
            status: "operational",
          },
        }),
      });

      const result = await checkDatabaseStatus();

      expect(result.name).toBe("Database");
      expect(result.provider).toBe("Neon PostgreSQL");
      expect(result.status).toBe("Operational");
      expect(result.icon).toBe("Database");
    });

    it("should return degraded when database is not connected", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: "degraded",
          database: {
            connected: false,
            status: "degraded",
          },
        }),
      });

      const result = await checkDatabaseStatus();

      expect(result.status).toBe("Degraded Performance");
    });

    it("should return outage when health endpoint fails", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      const result = await checkDatabaseStatus();

      expect(result.status).toBe("Outage");
      expect(result.error).toBe("Network error");
    });

    it("should handle missing database field in response", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: "operational",
        }),
      });

      const result = await checkDatabaseStatus();

      // Should default to degraded when database field is missing
      expect(result.status).toBe("Degraded Performance");
    });
  });

  describe("checkWebSocketStatus", () => {
    it("should return operational when backend is accessible", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await checkWebSocketStatus();

      expect(result.name).toBe("Real-time Messaging");
      expect(result.provider).toBe("Mosquitto MQTT Broker");
      expect(result.status).toBe("Operational");
      expect(result.icon).toBe("Activity");
    });

    it("should return degraded when backend has issues", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 503,
      });

      const result = await checkWebSocketStatus();

      expect(result.status).toBe("Degraded Performance");
    });

    it("should return outage when unreachable", async () => {
      global.fetch.mockRejectedValue(new Error("Connection failed"));

      const result = await checkWebSocketStatus();

      expect(result.status).toBe("Outage");
    });
  });

  describe("checkAllStatus", () => {
    it("should check all services and return array", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: "operational",
          database: { connected: true },
        }),
      });

      const results = await checkAllStatus();

      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(4);
      expect(results[0].name).toBe("Frontend Hosting");
      expect(results[1].name).toBe("Backend API");
      expect(results[2].name).toBe("Database");
      expect(results[3].name).toBe("Real-time Messaging");
    });

    it("should handle mixed success and failure states", async () => {
      let callCount = 0;
      global.fetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Frontend - success
          return Promise.resolve({ ok: true, status: 200 });
        }
        if (callCount === 2) {
          // Backend - failure
          return Promise.reject(new Error("Backend down"));
        }
        // Database and WebSocket
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            status: "operational",
            database: { connected: true },
          }),
        });
      });

      const results = await checkAllStatus();

      expect(results).toHaveLength(4);
      expect(results[0].status).toBe("Operational"); // Frontend
      expect(results[1].status).toBe("Outage"); // Backend
    });
  });

  describe("Response Time Measurement", () => {
    it("should measure and report response time", async () => {
      let callTime = 0;
      mockPerformanceNow.mockImplementation(() => {
        callTime += 50;
        return callTime;
      });

      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await checkFrontendStatus();

      expect(result.responseTime).toMatch(/\d+ms/);
      expect(parseInt(result.responseTime, 10)).toBeGreaterThan(0);
    });
  });

  describe("Timeout Handling", () => {
    it("should timeout after specified duration", async () => {
      global.fetch.mockImplementation(() => {
        const error = new Error("Timeout");
        error.name = "AbortError";
        return Promise.reject(error);
      });

      const result = await checkBackendStatus();

      expect(result.status).toBe("Outage");
      expect(result.error).toBe("Timeout");
    });
  });

  describe("Error Messages", () => {
    it("should include error details when check fails", async () => {
      global.fetch.mockRejectedValue(new Error("Connection refused"));

      const result = await checkBackendStatus();

      expect(result.error).toBe("Connection refused");
    });

    it("should include HTTP status code in error for non-OK responses", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await checkBackendStatus();

      expect(result.error).toBe("HTTP 404");
    });
  });
});
