import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Set up mocks for localStorage, sessionStorage, and window.location before importing any modules
const store = {};
const mockLocalStorage = {
  getItem: vi.fn((key) => store[key] || null),
  setItem: vi.fn((key, value) => { store[key] = String(value); }),
  removeItem: vi.fn((key) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
};

const sessionStore = {};
const mockSessionStorage = {
  getItem: vi.fn((key) => sessionStore[key] || null),
  setItem: vi.fn((key, value) => { sessionStore[key] = String(value); }),
  removeItem: vi.fn((key) => { delete sessionStore[key]; }),
  clear: vi.fn(() => { Object.keys(sessionStore).forEach((k) => delete sessionStore[k]); }),
};

Object.defineProperty(window, "localStorage", { value: mockLocalStorage });
Object.defineProperty(window, "sessionStorage", { value: mockSessionStorage });

// Mock window.location
const originalLocation = window.location;
beforeAll(() => {
  delete window.location;
  window.location = { href: "" };
});

afterAll(() => {
  window.location = originalLocation;
});

// Setup mock Axios instance
const mockAxiosInstance = {
  defaults: {
    headers: {
      common: {},
    },
  },
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  },
};

vi.mock("axios", () => {
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

describe("API Service - /src/services/api.js", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockSessionStorage.clear();
    mockAxiosInstance.defaults.headers.common = {};
    window.location.href = "";
  });

  it("should initialize with default configs", async () => {
    const axios = await import("axios");
    await import("../../services/api");

    expect(axios.default.create).toHaveBeenCalledWith({
      baseURL: "https://thermacoreapp.onrender.com/api/v1",
      timeout: 15000,
    });
  });

  it("should initialize token from localStorage on load if found", async () => {
    mockLocalStorage.setItem("authToken", "test-token-123");

    await import("../../services/api");

    expect(mockAxiosInstance.defaults.headers.common["Authorization"]).toBe(
      "Bearer test-token-123"
    );
  });

  it("should initialize token from alternative key on load if found", async () => {
    mockLocalStorage.setItem("thermacore_token", "alt-token-xyz");

    await import("../../services/api");

    expect(mockAxiosInstance.defaults.headers.common["Authorization"]).toBe(
      "Bearer alt-token-xyz"
    );
  });

  it("should setAuthToken with token and keepMeSignedIn=true", async () => {
    const { setAuthToken } = await import("../../services/api");

    setAuthToken("new-session-token", true);

    expect(mockAxiosInstance.defaults.headers.common["Authorization"]).toBe(
      "Bearer new-session-token"
    );
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("authToken", "new-session-token");
    expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
  });

  it("should setAuthToken with token and keepMeSignedIn=false", async () => {
    const { setAuthToken } = await import("../../services/api");

    setAuthToken("temp-token", false);

    expect(mockAxiosInstance.defaults.headers.common["Authorization"]).toBe(
      "Bearer temp-token"
    );
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith("authToken", "temp-token");
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it("should clear auth token when token is null", async () => {
    const { setAuthToken } = await import("../../services/api");
    mockAxiosInstance.defaults.headers.common["Authorization"] = "Bearer old-token";

    setAuthToken(null);

    expect(mockAxiosInstance.defaults.headers.common["Authorization"]).toBeUndefined();
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("authToken");
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("authToken");
  });

  it("should handle 401 error response by clearing tokens and redirecting to login", async () => {
    await import("../../services/api");

    // Retrieve response interceptor handler
    const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];

    const mockError = {
      response: {
        status: 401,
      },
    };

    await expect(responseInterceptor(mockError)).rejects.toEqual(mockError);

    // Verify side effects
    expect(mockAxiosInstance.defaults.headers.common["Authorization"]).toBeUndefined();
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("authToken");
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("user");
    expect(window.location.href).toBe("/login");
  });

  it("should pass through non-401 errors unchanged", async () => {
    await import("../../services/api");

    const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];

    const mockError = {
      response: {
        status: 500,
        data: { message: "Internal Server Error" },
      },
    };

    await expect(responseInterceptor(mockError)).rejects.toEqual(mockError);

    // Side effects should NOT run
    expect(window.location.href).not.toBe("/login");
  });

  it("should return response directly on success", async () => {
    await import("../../services/api");

    const successInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
    const mockResponse = { data: { success: true } };

    const result = successInterceptor(mockResponse);
    expect(result).toBe(mockResponse);
  });
});
