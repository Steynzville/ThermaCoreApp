import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiDelete,
  apiFetch,
  apiGet,
  apiGetJson,
  apiPost,
  apiPut,
} from "./apiFetch";
import { toast } from "sonner";

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock window.location and history
const mockLocation = {
  pathname: "/test",
  search: "",
  href: "",
};
const mockHistory = {
  pushState: vi.fn(),
};
global.window = {
  location: mockLocation,
  history: mockHistory,
  dispatchEvent: vi.fn(),
};

describe("apiFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);
    mockLocation.pathname = "/test";
    mockLocation.search = "";
    // Reset fetch mock to default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe("basic functionality", () => {
    it("should make successful GET request", async () => {
      const mockResponse = { data: "test" };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const response = await apiFetch("/api/test");

      expect(mockFetch).toHaveBeenCalledWith(
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
  });

  describe("error handling", () => {
    it("should handle 401 unauthorized", async () => {
      mockFetch.mockResolvedValue({
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
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(apiFetch("/api/test")).rejects.toThrow("Unauthorized");
      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });

    it("should redirect on 401 when not on login page", async () => {
      mockLocation.pathname = "/dashboard";
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(apiFetch("/api/test")).rejects.toThrow("Unauthorized");
      expect(mockHistory.pushState).toHaveBeenCalledWith(null, "", "/login");
    });

    it("should store redirect path on 401", async () => {
      mockLocation.pathname = "/dashboard";
      mockLocation.search = "?tab=analytics";
      mockFetch.mockResolvedValue({
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
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
      });

      await expect(apiFetch("/api/test")).rejects.toThrow(
        "You do not have permission to perform this action.",
      );
      expect(toast.error).toHaveBeenCalled();
    });

    it("should handle 500 server error without retry", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Server error occurred" }),
      });

      await expect(apiFetch("/api/test")).rejects.toThrow();
      expect(toast.error).toHaveBeenCalled();
    });

    it("should retry on 500 error when retries specified", async () => {
      mockFetch
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

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(toast.warning).toHaveBeenCalled();
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

      await expect(apiFetch("/api/test", { timeout: 1000 })).rejects.toThrow();
      expect(toast.error).toHaveBeenCalledWith(
        "Request timeout. Please try again.",
      );
    });
  });

  describe("toast notifications", () => {
    it("should not show toast when showToastOnError is false", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
      });

      await expect(apiFetch("/api/test", {}, false)).rejects.toThrow();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("should respect showToastOnError in options", async () => {
      mockFetch.mockResolvedValue({
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
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(apiFetch("/api/test", {}, true, false)).rejects.toThrow();
      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });
  });
});

describe("apiGet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: "test" }),
    });
  });

  it("should make GET request", async () => {
    await apiGet("/api/test");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("should pass options through", async () => {
    await apiGet("/api/test", { custom: "option" });

    expect(mockFetch).toHaveBeenCalledWith(
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
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
  });

  it("should make POST request with JSON body", async () => {
    const data = { key: "value" };
    await apiPost("/api/test", data);

    expect(mockFetch).toHaveBeenCalledWith(
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
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
  });

  it("should make PUT request with JSON body", async () => {
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
});

describe("apiDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
  });

  it("should make DELETE request", async () => {
    await apiDelete("/api/test");

    expect(mockFetch).toHaveBeenCalledWith(
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
    mockFetch.mockClear();
  });

  it("should return parsed JSON from successful request", async () => {
    const mockData = { data: "test" };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData,
    });

    const result = await apiGetJson("/api/test");

    expect(result).toEqual(mockData);
  });

  it("should pass options through", async () => {
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
});
