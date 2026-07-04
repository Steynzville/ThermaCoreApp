import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAuthToken,
  getAuthTokenWithSource,
  hasAuthToken,
} from "./authToken";

// Create a more robust localStorage mock that properly persists data
const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => {
      // Return null for undefined keys to match browser behavior
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
    // Add length and key for completeness
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
};

// Setup localStorage and sessionStorage mocks with proper persistence
const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

// Define the mocks on window
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

describe("authToken utility", () => {
  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    
    // Ensure the mocks are clean
    expect(localStorage.getItem("thermacore_token")).toBeNull();
    expect(sessionStorage.getItem("thermacore_token")).toBeNull();
  });

  describe("getAuthToken", () => {
    it("should return null when no token is stored", () => {
      const token = getAuthToken();
      expect(token).toBeNull();
    });

    it("should return token from localStorage thermacore_token", () => {
      const testToken = "test-token-from-local-storage";
      localStorage.setItem("thermacore_token", testToken);
      
      // Verify it was set correctly
      expect(localStorage.getItem("thermacore_token")).toBe(testToken);

      const token = getAuthToken();
      expect(token).toBe(testToken);
    });

    it("should return token from sessionStorage thermacore_token when not in localStorage", () => {
      const testToken = "test-token-from-session-storage";
      sessionStorage.setItem("thermacore_token", testToken);
      
      // Verify it was set correctly
      expect(sessionStorage.getItem("thermacore_token")).toBe(testToken);
      expect(localStorage.getItem("thermacore_token")).toBeNull();

      const token = getAuthToken();
      expect(token).toBe(testToken);
    });

    it("should return token from localStorage authToken as fallback", () => {
      const testToken = "test-token-from-auth-token";
      localStorage.setItem("authToken", testToken);
      
      // Verify it was set correctly
      expect(localStorage.getItem("authToken")).toBe(testToken);
      expect(localStorage.getItem("thermacore_token")).toBeNull();
      expect(sessionStorage.getItem("thermacore_token")).toBeNull();

      const token = getAuthToken();
      expect(token).toBe(testToken);
    });

    it("should prefer localStorage thermacore_token over sessionStorage", () => {
      const localToken = "local-storage-token";
      const sessionToken = "session-storage-token";

      localStorage.setItem("thermacore_token", localToken);
      sessionStorage.setItem("thermacore_token", sessionToken);
      
      // Verify both were set
      expect(localStorage.getItem("thermacore_token")).toBe(localToken);
      expect(sessionStorage.getItem("thermacore_token")).toBe(sessionToken);

      const token = getAuthToken();
      expect(token).toBe(localToken);
    });

    it("should prefer thermacore_token over authToken in localStorage", () => {
      const thermacoreToken = "thermacore-token";
      const authToken = "auth-token";

      localStorage.setItem("thermacore_token", thermacoreToken);
      localStorage.setItem("authToken", authToken);
      
      // Verify both were set
      expect(localStorage.getItem("thermacore_token")).toBe(thermacoreToken);
      expect(localStorage.getItem("authToken")).toBe(authToken);

      const token = getAuthToken();
      expect(token).toBe(thermacoreToken);
    });

    it("should follow correct precedence: localStorage thermacore_token > sessionStorage thermacore_token > localStorage authToken", () => {
      // Test all three present
      localStorage.setItem("thermacore_token", "local-thermacore");
      sessionStorage.setItem("thermacore_token", "session-thermacore");
      localStorage.setItem("authToken", "local-auth");

      expect(getAuthToken()).toBe("local-thermacore");

      // Remove localStorage thermacore_token
      localStorage.removeItem("thermacore_token");
      expect(getAuthToken()).toBe("session-thermacore");

      // Remove sessionStorage thermacore_token
      sessionStorage.removeItem("thermacore_token");
      expect(getAuthToken()).toBe("local-auth");

      // Remove localStorage authToken
      localStorage.removeItem("authToken");
      expect(getAuthToken()).toBeNull();
    });
  });

  describe("hasAuthToken", () => {
    it("should return false when no token is stored", () => {
      expect(hasAuthToken()).toBe(false);
    });

    it("should return true when token exists in localStorage", () => {
      localStorage.setItem("thermacore_token", "test-token");
      expect(hasAuthToken()).toBe(true);
    });

    it("should return true when token exists in sessionStorage", () => {
      sessionStorage.setItem("thermacore_token", "test-token");
      expect(hasAuthToken()).toBe(true);
    });

    it("should return true when authToken exists in localStorage", () => {
      localStorage.setItem("authToken", "test-token");
      expect(hasAuthToken()).toBe(true);
    });

    it("should return false for empty string token", () => {
      localStorage.setItem("thermacore_token", "");
      expect(hasAuthToken()).toBe(false);
    });

    it("should return false for whitespace-only token", () => {
      localStorage.setItem("thermacore_token", "   ");
      expect(hasAuthToken()).toBe(false);
    });
  });

  describe("integration scenarios", () => {
    it("should support 'Keep me signed in' flow (localStorage)", () => {
      // Simulate user logging in with "Keep me signed in" checked
      const token = "keep-me-signed-in-token";
      localStorage.setItem("thermacore_token", token);

      expect(getAuthToken()).toBe(token);
      expect(hasAuthToken()).toBe(true);
      expect(localStorage.getItem("thermacore_token")).toBe(token);
    });

    it("should support session-only flow (sessionStorage)", () => {
      // Simulate user logging in without "Keep me signed in"
      const token = "session-only-token";
      sessionStorage.setItem("thermacore_token", token);

      expect(getAuthToken()).toBe(token);
      expect(hasAuthToken()).toBe(true);
      expect(sessionStorage.getItem("thermacore_token")).toBe(token);
    });

    it("should handle token migration from authToken to thermacore_token", () => {
      // Simulate old token in authToken
      localStorage.setItem("authToken", "old-token");

      // Should still work (fallback to authToken)
      expect(getAuthToken()).toBe("old-token");

      // Add new token in thermacore_token
      localStorage.setItem("thermacore_token", "new-token");

      // Should prefer new token
      expect(getAuthToken()).toBe("new-token");
      
      // Old token should still exist but not be used
      expect(localStorage.getItem("authToken")).toBe("old-token");
      expect(localStorage.getItem("thermacore_token")).toBe("new-token");
    });
  });

  describe("getAuthTokenWithSource", () => {
    it("should return token and source from localStorage thermacore_token", () => {
      localStorage.setItem("thermacore_token", "test-token");

      const result = getAuthTokenWithSource();
      expect(result.token).toBe("test-token");
      expect(result.source).toBe("localStorage:thermacore_token");
    });

    it("should return token and source from sessionStorage thermacore_token", () => {
      sessionStorage.setItem("thermacore_token", "session-token");

      const result = getAuthTokenWithSource();
      expect(result.token).toBe("session-token");
      expect(result.source).toBe("sessionStorage:thermacore_token");
    });

    it("should return token and source from localStorage authToken", () => {
      localStorage.setItem("authToken", "auth-token");

      const result = getAuthTokenWithSource();
      expect(result.token).toBe("auth-token");
      expect(result.source).toBe("localStorage:authToken");
    });

    it("should return null token and 'none' source when no token exists", () => {
      const result = getAuthTokenWithSource();
      expect(result.token).toBeNull();
      expect(result.source).toBe("none");
    });

    it("should prioritize localStorage thermacore_token over others", () => {
      localStorage.setItem("thermacore_token", "local-thermacore");
      sessionStorage.setItem("thermacore_token", "session-thermacore");
      localStorage.setItem("authToken", "local-auth");

      const result = getAuthTokenWithSource();
      expect(result.token).toBe("local-thermacore");
      expect(result.source).toBe("localStorage:thermacore_token");
    });

    it("should handle mixed storage states correctly", () => {
      // Only sessionStorage has token
      sessionStorage.setItem("thermacore_token", "session-only");
      let result = getAuthTokenWithSource();
      expect(result.token).toBe("session-only");
      expect(result.source).toBe("sessionStorage:thermacore_token");

      // Clear session, only localStorage authToken
      sessionStorage.clear();
      localStorage.setItem("authToken", "auth-fallback");
      result = getAuthTokenWithSource();
      expect(result.token).toBe("auth-fallback");
      expect(result.source).toBe("localStorage:authToken");

      // Clear all
      localStorage.clear();
      result = getAuthTokenWithSource();
      expect(result.token).toBeNull();
      expect(result.source).toBe("none");
    });
  });
});
