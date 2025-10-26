import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiDelete,
  apiFetch,
  apiGet,
  apiGetJson,
  apiPost,
  apiPut,
} from "./apiFetch";

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock window.location and history
const mockLocation = {
  pathname: "/test",
  search: "",
  href: "",
};
global.window = {
  location: mockLocation,
  history: {
    pushState: vi.fn(),
  },
  dispatchEvent: vi.fn(),
};

describe("apiFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    mockLocation.pathname = "/test";
    mockLocation.search = "";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("basic functionality", () => {
    it("should make successful GET request", async () => {
      const mockResponse = { data: "test" };
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const response = await apiFetch("/api/test");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
      expect(response.ok).toBe(true);
    });

    it("should include authorization header when token exists", async () => {
      localStorageMock.getItem.mockReturnValue("test-token");
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch("/api/test");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });

    it("should merge custom headers", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await apiFetch("/api/test", {
        headers: { "X-Custom-Header": "value" },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Custom-Header": "value",
          }),
        }),
      );
    });
  });

  describe("error handling", () => {
    it("should handle 401 unauthorized", async () => {
      const { toast } = await import("sonner");
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(apiFetch("/api/test")).rejects.toThrow("Unauthorized");
      expect(toast.error).toHaveBeenCalledWith(
        "Session expired. Please log in again.",
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "thermacore_token",
      );
    });

    it("should not redirect on 401 if on login page", async () => {
      mockLocation.pathname = "/login";
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(apiFetch("/api/test")).rejects.toThrow("Unauthorized");
      expect(window.history.pushState).not.toHaveBeenCalled();
    });

    it("should redirect on 401 when not on login page", async () => {
      mockLocation.pathname = "/dashboard";
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(apiFetch("/api/test")).rejects.toThrow("Unauthorized");
      expect(window.history.pushState).toHaveBeenCalledWith(null, "", "/login");
    });

    it("should store redirect path on 401", async () => {
      mockLocation.pathname = "/dashboard";
      mockLocation.search = "?tab=analytics";
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(apiFetch("/api/test")).rejects.toThrow();
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "redirectAfterLogin",
        "/dashboard?tab=analytics",
      );
    });

    it("should handle 403 forbidden", async () => {
      const { toast } = await import("sonner");
      global.fetch.mockResolvedValue({
        ok: false,
        status: 403,
      });

      await expect(apiFetch("/api/test")).rejects.toThrow(
        "You do not have permission to perform this action.",
      );
      expect(toast.error).toHaveBeenCalled();
    });

    it("should handle 500 server error without retry", async () => {
      const { toast } = await import("sonner");
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Server error occurred" }),
      });

      await expect(apiFetch("/api/test")).rejects.toThrow();
      expect(toast.error).toHaveBeenCalled();
    });

    it("should retry on 500 error when retries specified", async () => {
      const { toast } = await import("sonner");
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });

      await apiFetch("/api/test", { retries: 1, retryDelay: 100 });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(toast.warning).toHaveBeenCalled();
    });

    it("should handle network errors", async () => {
      const networkError = new TypeError("Failed to fetch");
      global.fetch.mockRejectedValue(networkError);

      await expect(apiFetch("/api/test")).rejects.toThrow("Failed to fetch");
      // Network errors may or may not show toast depending on retry logic
    });

    it("should handle timeout errors", async () => {
      const { toast } = await import("sonner");
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";
      global.fetch.mockRejectedValue(abortError);

      await expect(apiFetch("/api/test", { timeout: 1000 })).rejects.toThrow();
      expect(toast.error).toHaveBeenCalledWith(
        "Request timeout. Please try again.",
      );
    });
  });

  describe("toast notifications", () => {
    it("should not show toast when showToastOnError is false", async () => {
      const { toast } = await import("sonner");
      global.fetch.mockResolvedValue({
        ok: false,
        status: 403,
      });

      await expect(apiFetch("/api/test", {}, false)).rejects.toThrow();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should respect showToastOnError in options", async () => {
      const { toast } = await import("sonner");
      global.fetch.mockResolvedValue({
        ok: false,
        status: 403,
      });

      await expect(
        apiFetch("/api/test", { showToastOnError: false }),
      ).rejects.toThrow();
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe("redirect control", () => {
    it("should not redirect on 401 when redirectOn401 is false", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(apiFetch("/api/test", {}, true, false)).rejects.toThrow();
      expect(window.history.pushState).not.toHaveBeenCalled();
    });
  });
});

describe("apiGet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: "test" }),
    });
  });

  it("should make GET request", async () => {
    await apiGet("/api/test");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("should pass options through", async () => {
    await apiGet("/api/test", { custom: "option" });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "GET",
        custom: "option",
      }),
    );
  });
});

describe("apiPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
  });

  it("should make POST request with JSON body", async () => {
    const data = { key: "value" };
    await apiPost("/api/test", data);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(data),
      }),
    );
  });
});

describe("apiPut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
  });

  it("should make PUT request with JSON body", async () => {
    const data = { key: "updated" };
    await apiPut("/api/test", data);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(data),
      }),
    );
  });
});

describe("apiDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
  });

  it("should make DELETE request", async () => {
    await apiDelete("/api/test");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });
});

describe("apiGetJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return parsed JSON from successful request", async () => {
    const mockData = { data: "test" };
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    });

    const result = await apiGetJson("/api/test");

    expect(result).toEqual(mockData);
  });

  it("should pass options through", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await apiGetJson("/api/test", { custom: "value" });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        custom: "value",
      }),
    );
  });
});
