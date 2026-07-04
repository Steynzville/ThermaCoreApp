import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import api, { setAuthToken } from "./api";

// Create a more robust localStorage mock that properly persists data
const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => {
      return key in store ? store[key] : null;
    },
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
};

// Setup localStorage and sessionStorage mocks
const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
});

// Also set on global for Node environment
if (typeof global !== "undefined") {
  Object.defineProperty(global, "localStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(global, "sessionStorage", {
    value: sessionStorageMock,
    writable: true,
    configurable: true,
  });
}

describe("api service", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear();
    sessionStorage.clear();
    // Clear any existing authorization headers
    delete api.defaults.headers.common["Authorization"];
    vi.clearAllMocks();
    
    // Reset window.location for each test
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/" },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    delete api.defaults.headers.common["Authorization"];
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
      
      // Verify it was set
      expect(localStorage.getItem("authToken")).toBe(testToken);
      expect(api.defaults.headers.common["Authorization"]).toBe(
        `Bearer ${testToken}`,
      );

      // Then remove it
      setAuthToken(null);

      expect(api.defaults.headers.common["Authorization"]).toBeUndefined();
      expect(localStorage.getItem("authToken")).toBeNull();
      expect(sessionStorage.getItem("authToken")).toBeNull();
    });

    it("should update token when a different token is provided", () => {
      const firstToken = "first-token";
      const secondToken = "second-token";

      setAuthToken(firstToken);
      expect(api.defaults.headers.common["Authorization"]).toBe(
        `Bearer ${firstToken}`,
      );
      expect(localStorage.getItem("authToken")).toBe(firstToken);

      setAuthToken(secondToken);
      expect(api.defaults.headers.common["Authorization"]).toBe(
        `Bearer ${secondToken}`,
      );
      expect(localStorage.getItem("authToken")).toBe(secondToken);
    });

    it("should store token in localStorage when keepMeSignedIn is true", () => {
      const testToken = "keep-me-signed-in-token";
      
      setAuthToken(testToken, true);
      
      expect(localStorage.getItem("authToken")).toBe(testToken);
      expect(sessionStorage.getItem("authToken")).toBeNull();
      expect(api.defaults.headers.common["Authorization"]).toBe(
        `Bearer ${testToken}`,
      );
    });

    it("should store token in sessionStorage when keepMeSignedIn is false", () => {
      const testToken = "session-only-token";
      
      setAuthToken(testToken, false);
      
      expect(sessionStorage.getItem("authToken")).toBe(testToken);
      expect(localStorage.getItem("authToken")).toBeNull();
      expect(api.defaults.headers.common["Authorization"]).toBe(
        `Bearer ${testToken}`,
      );
    });

    it("should clear both localStorage and sessionStorage when null is provided", () => {
      // Set tokens in both storages
      localStorage.setItem("authToken", "local-token");
      sessionStorage.setItem("authToken", "session-token");
      api.defaults.headers.common["Authorization"] = "Bearer local-token";

      setAuthToken(null);

      expect(localStorage.getItem("authToken")).toBeNull();
      expect(sessionStorage.getItem("authToken")).toBeNull();
      expect(api.defaults.headers.common["Authorization"]).toBeUndefined();
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
      // Set up initial token
      setAuthToken("test-token");
      
      // Verify token was set
      expect(localStorage.getItem("authToken")).toBe("test-token");
      expect(api.defaults.headers.common["Authorization"]).toBe(
        "Bearer test-token",
      );

      // Mock a 401 response
      const mockError = {
        response: {
          status: 401,
        },
      };

      // Get the response error interceptor
      const errorInterceptor = api.interceptors.response.handlers[0].rejected;

      try {
        await errorInterceptor(mockError);
      } catch {
        // Expected to throw
      }

      // Verify token was cleared
      expect(localStorage.getItem("authToken")).toBeNull();
      expect(sessionStorage.getItem("authToken")).toBeNull();
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

    it("should handle 401 error when no token is set", async () => {
      // Ensure no token is set
      setAuthToken(null);
      
      const mockError = {
        response: {
          status: 401,
        },
      };

      const errorInterceptor = api.interceptors.response.handlers[0].rejected;

      try {
        await errorInterceptor(mockError);
      } catch {
        // Expected to throw
      }

      expect(window.location.href).toBe("/login");
    });
  });
});
