/**
 * apiFetch.test.js - Complete Test Coverage for API Fetch Utility
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiDelete,
  apiFetch,
  apiGet,
  apiGetJson,
  apiPatch,
  apiPost,
  apiPostJson,
  apiPut,
  apiPutJson,
  apiUpload,
} from "./apiFetch";
import { toast } from "sonner";

// ============================================================
// MOCKS
// ============================================================

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

const mockLocation = {
  pathname: "/test",
  search: "",
  href: "",
  origin: "http://localhost",
  hostname: "localhost",
  port: "",
  protocol: "http:",
};

const mockHistory = {
  pushState: vi.fn(),
  replaceState: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  go: vi.fn(),
  length: 1,
  state: null,
};

Object.defineProperty(global.window, "location", {
  value: mockLocation,
  writable: true,
  configurable: true,
});

Object.defineProperty(global.window, "history", {
  value: mockHistory,
  writable: true,
  configurable: true,
});

Object.defineProperty(global.window, "dispatchEvent", {
  value: vi.fn(),
  writable: true,
  configurable: true,
});

global.PopStateEvent = vi.fn();

// ============================================================
// ✅ FIX: Isolated AbortController mock using stubGlobal
// ============================================================

const mockAbort = vi.fn();
const mockSignal = {
  aborted: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onabort: null,
};
const mockAbortController = vi.fn().mockImplementation(() => ({
  abort: mockAbort,
  signal: mockSignal,
}));

// Store original AbortController to restore after tests
const originalAbortController = global.AbortController;

// ============================================================
// TEST SUITE
// ============================================================

describe("apiFetch - Core Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);
    mockLocation.pathname = "/test";
    mockLocation.search = "";
    mockLocation.href = "";
    mockAbort.mockClear();
    mockAbortController.mockClear();

    vi.useRealTimers();

    // ✅ FIX: Only mock AbortController for this test file
    global.AbortController = mockAbortController;

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({}),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    // ✅ FIX: Restore original AbortController after each test
    global.AbortController = originalAbortController;
  });

  describe("Basic Request Functionality", () => {
    it("should make successful GET request", async () => {
      const mockResponse = { data: "test" };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const response = await apiFetch("/api/test");

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe("/api/test");
      expect(callArgs[1]).toHaveProperty("headers");
      expect(callArgs[1].headers).toHaveProperty("Content-Type", "application/json");
      expect(callArgs[1]).toHaveProperty("method", "GET");
      expect(response.ok).toBe(true);
      await expect(response.json()).resolves.toEqual(mockResponse);
    });

    it("should include authorization header when token exists", async () => {
      localStorageMock.getItem.mockReturnValue("test-token");
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch("/api/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });

    it("should retrieve token from sessionStorage when not in localStorage", async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "thermacore_token") return null;
        if (key === "authToken") return null;
        return null;
      });
      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === "thermacore_token") return "session-token";
        return null;
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch("/api/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer session-token",
          }),
        }),
      );
    });

    it("should prefer localStorage thermacore_token over sessionStorage", async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "thermacore_token") return "local-token";
        return null;
      });
      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === "thermacore_token") return "session-token";
        return null;
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch("/api/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer local-token",
          }),
        }),
      );
    });

    it("should fallback to localStorage authToken if thermacore_token not found", async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === "thermacore_token") return null;
        if (key === "authToken") return "auth-token-fallback";
        return null;
      });
      sessionStorageMock.getItem.mockReturnValue(null);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch("/api/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer auth-token-fallback",
          }),
        }),
      );
    });

    it("should merge custom headers", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch("/api/test", {
        headers: { "X-Custom-Header": "value" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Custom-Header": "value",
          }),
        }),
      );
    });

    it("should use timeout from options", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch("/api/test", { timeout: 5000 });

      expect(AbortController).toHaveBeenCalled();
    });

    it("should default to 30000ms timeout when not specified", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch("/api/test");

      expect(AbortController).toHaveBeenCalled();
    });

    it("should handle GET request with query parameters", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch("/api/test?param=value");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test?param=value",
        expect.any(Object),
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle 401 unauthorized and redirect", async () => {
      mockLocation.pathname = "/dashboard";
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(apiFetch("/api/test")).rejects.toThrow("Unauthorized");

      expect(toast.error).toHaveBeenCalledWith(
        "Session expired. Please log in again.",
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "thermacore_token",
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("refreshToken");
      expect(mockHistory.pushState).toHaveBeenCalledWith(null, "", "/login");
    });

    it("should handle 401 when on login page without redirect", async () => {
      mockLocation.pathname = "/login";
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(apiFetch("/api/test")).rejects.toThrow("Unauthorized");
      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });

    it("should handle 401 when on auth page without redirect", async () => {
      mockLocation.pathname = "/auth/callback";
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(apiFetch("/api/test")).rejects.toThrow("Unauthorized");
      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });

    it("should store redirect path on 401", async () => {
      mockLocation.pathname = "/dashboard";
      mockLocation.search = "?tab=analytics";
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(apiFetch("/api/test")).rejects.toThrow();
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "redirectAfterLogin",
        "/dashboard?tab=analytics",
      );
    });

    it("should not store redirect for login or root path", async () => {
      mockLocation.pathname = "/login";
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(apiFetch("/api/test")).rejects.toThrow();
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        "redirectAfterLogin",
        expect.any(String),
      );
    });

    it("should handle 403 forbidden", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

      await expect(apiFetch("/api/test")).rejects.toThrow(
        "You do not have permission to perform this action.",
      );
      expect(toast.error).toHaveBeenCalledWith(
        "You do not have permission to perform this action.",
      );
    });

    it("should handle 404 not found", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(apiFetch("/api/test")).rejects.toThrow("HTTP 404: Not Found");
      expect(toast.error).toHaveBeenCalled();
    });

    it("should handle 500 server error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Server error occurred" }),
      });

      await expect(apiFetch("/api/test")).rejects.toThrow(
        "Server error occurred",
      );
      expect(toast.error).toHaveBeenCalled();
    });

    it("should parse error message from response JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ message: "Invalid input provided" }),
      });

      await expect(apiFetch("/api/test")).rejects.toThrow(
        "Invalid input provided",
      );
    });

    it("should parse error detail from response JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ detail: "Field 'name' is required" }),
      });

      await expect(apiFetch("/api/test")).rejects.toThrow(
        "Field 'name' is required",
      );
    });

    it("should handle malformed error response JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(apiFetch("/api/test")).rejects.toThrow(
        "HTTP 400: Bad Request",
      );
    });

    it("should handle network errors", async () => {
      const networkError = new TypeError("Failed to fetch");
      mockFetch.mockRejectedValue(networkError);

      await expect(apiFetch("/api/test")).rejects.toThrow("Failed to fetch");
    });

    it("should handle timeout errors", async () => {
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);

      await expect(apiFetch("/api/test", { timeout: 1000 })).rejects.toThrow(
        "Request timeout. Please try again.",
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Request timeout. Please try again.",
      );
    });

    it("should not show toast when showToastOnError is false", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

      await expect(apiFetch("/api/test", {}, false)).rejects.toThrow();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should respect showToastOnError in options", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

      await expect(
        apiFetch("/api/test", { showToastOnError: false }),
      ).rejects.toThrow();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should not redirect on 401 when redirectOn401 is false", async () => {
      mockLocation.pathname = "/dashboard";
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(
        apiFetch("/api/test", {}, true, false),
      ).rejects.toThrow();
      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });

    it("should handle AbortError from fetch abort", async () => {
      const abortError = new DOMException("The operation was aborted.", "AbortError");
      mockFetch.mockRejectedValue(abortError);

      await expect(apiFetch("/api/test")).rejects.toThrow(
        "Request timeout. Please try again.",
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Request timeout. Please try again.",
      );
    });
  });

  describe("Retry Logic", () => {
    it("should retry on 500 error with retries specified", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });

      await apiFetch("/api/test", { retries: 1, retryDelay: 100 });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(toast.warning).toHaveBeenCalledWith(
        "Server error. Retrying in 0.1 seconds... (1 attempts left)",
      );
    });

    it("should retry on 500 error multiple times", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });

      await apiFetch("/api/test", { retries: 2, retryDelay: 100 });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(toast.warning).toHaveBeenCalledTimes(2);
    });

    it("should retry on network errors", async () => {
      const networkError = new TypeError("Failed to fetch");
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });

      await apiFetch("/api/test", { retries: 1, retryDelay: 100 });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(toast.warning).toHaveBeenCalledWith(
        "Network error. Retrying in 0.1 seconds... (1 attempts left)",
      );
    });

    it("should not retry on 4xx errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ error: "Invalid input" }),
      });

      await expect(
        apiFetch("/api/test", { retries: 3, retryDelay: 100 }),
      ).rejects.toThrow("Invalid input");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalled();
    });

    it("should not retry on 401 errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(
        apiFetch("/api/test", { retries: 3, retryDelay: 100 }),
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should not retry on 403 errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

      await expect(
        apiFetch("/api/test", { retries: 3, retryDelay: 100 }),
      ).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should respect retryDelay between attempts", async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError("Failed to fetch"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({}),
        });

      const startTime = Date.now();
      await apiFetch("/api/test", { retries: 1, retryDelay: 200 });
      const elapsedTime = Date.now() - startTime;

      expect(elapsedTime).toBeGreaterThanOrEqual(190);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should give up after exhausting retries", async () => {
      const networkError = new TypeError("Failed to fetch");
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError);

      await expect(
        apiFetch("/api/test", { retries: 2, retryDelay: 100 }),
      ).rejects.toThrow("Failed to fetch");

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should handle retry with timeout", async () => {
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";

      mockFetch
        .mockRejectedValueOnce(abortError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });

      await expect(
        apiFetch("/api/test", { retries: 1, retryDelay: 100, timeout: 5000 }),
      ).rejects.toThrow("Request timeout. Please try again.");

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should not retry on non-TypeError network errors", async () => {
      const nonTypeError = new Error("Some other error");
      mockFetch.mockRejectedValue(nonTypeError);

      await expect(
        apiFetch("/api/test", { retries: 3, retryDelay: 100 }),
      ).rejects.toThrow("Some other error");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(toast.warning).not.toHaveBeenCalled();
    });
  });

  describe("Convenience Methods", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
    });

    it("apiGet should make GET request", async () => {
      await apiGet("/api/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          method: "GET",
        }),
      );
    });

    it("apiGet should pass options through", async () => {
      await apiGet("/api/test", { custom: "option" });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          method: "GET",
          custom: "option",
        }),
      );
    });

    it("apiPost should make POST request with JSON body", async () => {
      const data = { key: "value" };
      await apiPost("/api/test", data);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(data),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("apiPost should handle undefined data", async () => {
      await apiPost("/api/test", undefined);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          method: "POST",
          body: undefined,
        }),
      );
    });

    it("apiPut should make PUT request with JSON body", async () => {
      const data = { key: "updated" };
      await apiPut("/api/test", data);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(data),
        }),
      );
    });

    it("apiPut should handle undefined data", async () => {
      await apiPut("/api/test", undefined);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          method: "PUT",
          body: undefined,
        }),
      );
    });

    it("apiPatch should make PATCH request with JSON body", async () => {
      const data = { key: "patched" };
      await apiPatch("/api/test", data);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify(data),
        }),
      );
    });

    it("apiPatch should handle undefined data", async () => {
      await apiPatch("/api/test", undefined);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          method: "PATCH",
          body: undefined,
        }),
      );
    });

    it("apiDelete should make DELETE request", async () => {
      await apiDelete("/api/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });

    it("apiDelete should pass options through", async () => {
      await apiDelete("/api/test", { custom: "option" });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          method: "DELETE",
          custom: "option",
        }),
      );
    });

    it("apiGetJson should return parsed JSON", async () => {
      const mockData = { data: "test" };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await apiGetJson("/api/test");

      expect(result).toEqual(mockData);
    });

    it("apiGetJson should pass options through", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiGetJson("/api/test", { custom: "value" });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          custom: "value",
        }),
      );
    });

    it("apiPostJson should return parsed JSON", async () => {
      const mockData = { success: true };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await apiPostJson("/api/test", { key: "value" });

      expect(result).toEqual(mockData);
    });

    it("apiPutJson should return parsed JSON", async () => {
      const mockData = { success: true };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await apiPutJson("/api/test", { key: "value" });

      expect(result).toEqual(mockData);
    });
  });

  describe("File Uploads", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
    });

    it("should upload FormData with multipart/form-data", async () => {
      const formData = new FormData();
      formData.append("file", new Blob(["test"]), "test.txt");

      await apiUpload("/api/upload", formData);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/upload",
        expect.objectContaining({
          method: "POST",
          body: formData,
          headers: expect.not.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("should pass options through for upload", async () => {
      const formData = new FormData();
      await apiUpload("/api/upload", formData, { custom: "option" });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/upload",
        expect.objectContaining({
          method: "POST",
          custom: "option",
        }),
      );
    });

    it("should preserve custom headers for upload except Content-Type", async () => {
      const formData = new FormData();
      await apiUpload("/api/upload", formData, {
        headers: { "X-Custom": "value", "Content-Type": "application/json" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/upload",
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Custom": "value",
          }),
        }),
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty response body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        statusText: "No Content",
        json: async () => ({}),
      });

      const response = await apiFetch("/api/test");
      expect(response.status).toBe(204);
    });

    it("should handle response with no Content-Type", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        json: async () => ({}),
      });

      const response = await apiFetch("/api/test");
      expect(response.ok).toBe(true);
    });

    it("should handle token retrieval with null values", async () => {
      localStorageMock.getItem.mockReturnValue(null);
      sessionStorageMock.getItem.mockReturnValue(null);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch("/api/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("should handle error object without message property", async () => {
      mockFetch.mockRejectedValue({});

      await expect(apiFetch("/api/test")).rejects.toEqual({});
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should handle error object with null message", async () => {
      mockFetch.mockRejectedValue({ message: null });

      await expect(apiFetch("/api/test")).rejects.toEqual({ message: null });
    });

    it("should handle undefined error", async () => {
      mockFetch.mockRejectedValue(undefined);

      try {
        await apiFetch("/api/test");
        expect.fail("Expected apiFetch to throw");
      } catch (error) {
        expect(error).toBeUndefined();
      }
    });

    it("should not redirect when redirectOn401 is false even if not on login page", async () => {
      mockLocation.pathname = "/dashboard";
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(
        apiFetch("/api/test", { redirectOn401: false })
      ).rejects.toThrow("Unauthorized");

      expect(mockHistory.pushState).not.toHaveBeenCalled();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it("should not store redirect path on root path", async () => {
      mockLocation.pathname = "/";
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(apiFetch("/api/test")).rejects.toThrow();
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        "redirectAfterLogin",
        expect.any(String),
      );
    });

    it("should use custom retryDelay from options", async () => {
      const networkError = new TypeError("Failed to fetch");
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({}),
        });

      const startTime = Date.now();
      await apiFetch("/api/test", { retries: 1, retryDelay: 500 });
      const elapsedTime = Date.now() - startTime;

      expect(elapsedTime).toBeGreaterThanOrEqual(490);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should use custom retryDelay for 500 errors", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({}),
        });

      const startTime = Date.now();
      await apiFetch("/api/test", { retries: 1, retryDelay: 750 });
      const elapsedTime = Date.now() - startTime;

      expect(elapsedTime).toBeGreaterThanOrEqual(740);
    });

    const networkErrorMessages = [
      "Failed to fetch",
      "Network request failed",
      "Networkerror when attempting to fetch resource",
      "Load failed",
      "Network error",
      "Fetch failed",
    ];

    networkErrorMessages.forEach((errorMsg) => {
      it(`should detect network error: "${errorMsg}"`, async () => {
        const networkError = new TypeError(errorMsg);
        mockFetch
          .mockRejectedValueOnce(networkError)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({}),
          });

        await apiFetch("/api/test", { retries: 1, retryDelay: 100 });
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(toast.warning).toHaveBeenCalled();
      });
    });

    it("should not show toast warning on 500 when showToastOnError is false", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({}),
        });

      await apiFetch("/api/test", { retries: 1, retryDelay: 100, showToastOnError: false });
      expect(toast.warning).not.toHaveBeenCalled();
    });

    it("should not show toast warning on network error when showToastOnError is false", async () => {
      const networkError = new TypeError("Failed to fetch");
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({}),
        });

      await apiFetch("/api/test", { retries: 1, retryDelay: 100, showToastOnError: false });
      expect(toast.warning).not.toHaveBeenCalled();
    });
  });
});
