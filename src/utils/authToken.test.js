import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAuthToken, hasAuthToken } from "./authToken";

describe("authToken utility", () => {
  // Store original values to restore after tests
  let originalLocalStorage;
  let originalSessionStorage;

  beforeEach(() => {
    // Save original storage
    originalLocalStorage = { ...localStorage };
    originalSessionStorage = { ...sessionStorage };

    // Clear all storage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    // Restore original storage after each test
    Object.keys(originalLocalStorage).forEach((key) => {
      localStorage.setItem(key, originalLocalStorage[key]);
    });
    Object.keys(originalSessionStorage).forEach((key) => {
      sessionStorage.setItem(key, originalSessionStorage[key]);
    });
  });

  describe("getAuthToken", () => {
    it("should return null when no token is stored", () => {
      const token = getAuthToken();
      expect(token).toBeNull();
    });

    it("should return token from localStorage thermacore_token", () => {
      const testToken = "test-token-from-local-storage";
      localStorage.setItem("thermacore_token", testToken);

      const token = getAuthToken();
      expect(token).toBe(testToken);
    });

    it("should return token from sessionStorage thermacore_token when not in localStorage", () => {
      const testToken = "test-token-from-session-storage";
      sessionStorage.setItem("thermacore_token", testToken);

      const token = getAuthToken();
      expect(token).toBe(testToken);
    });

    it("should return token from localStorage authToken as fallback", () => {
      const testToken = "test-token-from-auth-token";
      localStorage.setItem("authToken", testToken);

      const token = getAuthToken();
      expect(token).toBe(testToken);
    });

    it("should prefer localStorage thermacore_token over sessionStorage", () => {
      const localToken = "local-storage-token";
      const sessionToken = "session-storage-token";

      localStorage.setItem("thermacore_token", localToken);
      sessionStorage.setItem("thermacore_token", sessionToken);

      const token = getAuthToken();
      expect(token).toBe(localToken);
    });

    it("should prefer thermacore_token over authToken in localStorage", () => {
      const thermacoreToken = "thermacore-token";
      const authToken = "auth-token";

      localStorage.setItem("thermacore_token", thermacoreToken);
      localStorage.setItem("authToken", authToken);

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
  });

  describe("integration scenarios", () => {
    it("should support 'Keep me signed in' flow (localStorage)", () => {
      // Simulate user logging in with "Keep me signed in" checked
      const token = "keep-me-signed-in-token";
      localStorage.setItem("thermacore_token", token);

      expect(getAuthToken()).toBe(token);
      expect(hasAuthToken()).toBe(true);
    });

    it("should support session-only flow (sessionStorage)", () => {
      // Simulate user logging in without "Keep me signed in"
      const token = "session-only-token";
      sessionStorage.setItem("thermacore_token", token);

      expect(getAuthToken()).toBe(token);
      expect(hasAuthToken()).toBe(true);
    });

    it("should handle token migration from authToken to thermacore_token", () => {
      // Simulate old token in authToken
      localStorage.setItem("authToken", "old-token");

      // Should still work
      expect(getAuthToken()).toBe("old-token");

      // Add new token in thermacore_token
      localStorage.setItem("thermacore_token", "new-token");

      // Should prefer new token
      expect(getAuthToken()).toBe("new-token");
    });
  });
});
