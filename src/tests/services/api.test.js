import { beforeEach, describe, expect, it, vi } from "vitest";

// Set up mocks for localStorage, sessionStorage, and window.location before importing any modules
const store = {};
const mockLocalStorage = {
  getItem: vi.fn((key) => store[key] || null),
  setItem: vi.fn((key, value) => {
    store[key] = String(value);
  }),
  removeItem: vi.fn((key) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    Object.keys(store).forEach((k) => {
      delete store[k];
    });
  }),
};

const sessionStore = {};
const mockSessionStorage = {
  getItem: vi.fn((key) => sessionStore[key] || null),
  setItem: vi.fn((key, value) => {
    sessionStore[key] = String(value);
  }),
  removeItem: vi.fn((key) => {
    delete sessionStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(sessionStore).forEach((k) => {
      delete sessionStore[k];
    });
  }),
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

let apiModule;

describe("API Service - /src/services/api.js (stability fixes)", () => {
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
    apiModule = await import("../../services/api");

    expect(axios.default.create).toHaveBeenCalledWith({
      baseURL: expect.stringMatching(/\/api\/v1$/),
      timeout: 15000,
    });
  });

  it("should initialize token from localStorage on load if found", async () => {
    mockLocalStorage.setItem("authToken", "test-token-123");

    apiModule = await import("../../services/api");

    expect(mockAxiosInstance.defaults.headers.common["Authorization"]).toBe(
      "Bearer test-token-123",
    );
  });

  it("should initialize token from alternative key on load if found", async () => {
    mockLocalStorage.setItem("thermacore_token", "alt-token-xyz");

    apiModule = await import("../../services/api");

    expect(mockAxiosInstance.defaults.headers.common["Authorization"]).toBe(
      "Bearer alt-token-xyz",
    );
  });

  it("should setAuthToken with token and keepMeSignedIn=true", async () => {
    const { setAuthToken } = await import("../../services/api");

    setAuthToken("new-session-token", true);

    expect(mockAxiosInstance.defaults.headers.common["Authorization"]).toBe(
      "Bearer new-session-token",
    );
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "authToken",
      "new-session-token",
    );
  });
});
