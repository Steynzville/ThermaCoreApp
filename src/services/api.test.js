import { afterEach, beforeEach, describe, expect, it } from "vitest";
import api, { setAuthToken } from "./api";

describe("api service", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear any existing authorization headers
    delete api.defaults.headers.common["Authorization"];
  });

  afterEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  describe("setAuthToken", () => {
    it("should set authorization header and store token when token is provided", () => {
      const testToken = "test-token-123";

      setAuthToken(testToken);

      expect(api.defaults.headers.common["Authorization"]).toBe(
        `Bearer ${testToken}`,
      );
      expect(localStorage.getItem("authToken")).toBe(testToken);
    });

    it("should remove authorization header and clear token when null is provided", () => {
      // First set a token
      const testToken = "test-token-123";
      setAuthToken(testToken);

      // Then remove it
      setAuthToken(null);

      expect(api.defaults.headers.common["Authorization"]).toBeUndefined();
      expect(localStorage.getItem("authToken")).toBeNull();
    });

    it("should update token when a different token is provided", () => {
      const firstToken = "first-token";
      const secondToken = "second-token";

      setAuthToken(firstToken);
      expect(api.defaults.headers.common["Authorization"]).toBe(
        `Bearer ${firstToken}`,
      );

      setAuthToken(secondToken);
      expect(api.defaults.headers.common["Authorization"]).toBe(
        `Bearer ${secondToken}`,
      );
      expect(localStorage.getItem("authToken")).toBe(secondToken);
    });
  });

  describe("axios instance configuration", () => {
    it("should have correct base URL", () => {
      const expectedBaseUrl = `${
        import.meta.env.VITE_API_BASE_URL ||
        "https://thermacoreapp.onrender.com"
      }/api/v1`;

      expect(api.defaults.baseURL).toBe(expectedBaseUrl);
    });

    it("should have correct timeout", () => {
      expect(api.defaults.timeout).toBe(15000);
    });
  });

  describe("401 interceptor", () => {
    it("should clear token and redirect on 401 error", async () => {
      const originalLocationHref = window.location.href;

      // Set up initial token
      setAuthToken("test-token");

      // Mock a 401 response
      const mockError = {
        response: {
          status: 401,
        },
      };

      // Get the response error interceptor
      const errorInterceptor = api.interceptors.response.handlers[0].rejected;

      // Mock window.location.href
      delete window.location;
      window.location = { href: originalLocationHref };

      try {
        await errorInterceptor(mockError);
      } catch {
        // Expected to throw
      }

      expect(localStorage.getItem("authToken")).toBeNull();
      expect(api.defaults.headers.common["Authorization"]).toBeUndefined();
      expect(window.location.href).toBe("/login");
    });

    it("should not interfere with other errors", async () => {
      const mockError = {
        response: {
          status: 500,
        },
        message: "Server Error",
      };

      const errorInterceptor = api.interceptors.response.handlers[0].rejected;

      await expect(errorInterceptor(mockError)).rejects.toEqual(mockError);
    });
  });
});
