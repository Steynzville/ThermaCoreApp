import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

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

const originalLocation = window.location;
const originalLocalStorage = window.localStorage;
const originalSessionStorage = window.sessionStorage;
const originalGlobalLocalStorage = global.localStorage;
const originalGlobalSessionStorage = global.sessionStorage;
const installStorageMocks = () => {
  Object.defineProperty(window, "localStorage", {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, "sessionStorage", {
    value: mockSessionStorage,
    writable: true,
    configurable: true,
  });
  global.localStorage = mockLocalStorage;
  global.sessionStorage = mockSessionStorage;
};

beforeAll(() => {
  installStorageMocks();
  Object.defineProperty(window, "location", {
    value: { href: "" },
    writable: true,
    configurable: true,
  });
});

afterAll(() => {
  Object.defineProperty(window, "localStorage", {
    value: originalLocalStorage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, "sessionStorage", {
    value: originalSessionStorage,
    writable: true,
    configurable: true,
  });
  global.localStorage = originalGlobalLocalStorage;
  global.sessionStorage = originalGlobalSessionStorage;
  Object.defineProperty(window, "location", {
    value: originalLocation,
    writable: true,
    configurable: true,
  });
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

describe("API Service - /src/services/api.js (stability fixes)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    installStorageMocks();
    mockLocalStorage.clear();
    mockSessionStorage.clear();
    mockAxiosInstance.defaults.headers.common = {};
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
      configurable: true,
    });
  });

  it("should initialize with default configs", async () => {
    const axios = await import("axios");
    await import("../../services/api?default-config");

    expect(axios.default.create).toHaveBeenCalledWith({
      baseURL: expect.stringMatching(/\/api\/v1$/),
      timeout: 15000,
    });
  });

  it("should initialize token from localStorage on load if found", async () => {
    mockLocalStorage.setItem("authToken", "test-token-123");

    await import("../../services/api?auth-token");

    expect(mockAxiosInstance.defaults.headers.common["Authorization"]).toBe(
      "Bearer test-token-123",
    );
  });

  it("should initialize token from alternative key on load if found", async () => {
    mockLocalStorage.setItem("thermacore_token", "alt-token-xyz");

    await import("../../services/api?alt-token");

    expect(mockAxiosInstance.defaults.headers.common["Authorization"]).toBe(
      "Bearer alt-token-xyz",
    );
  });

  it("should setAuthToken with token and keepMeSignedIn=true", async () => {
    const { setAuthToken } = await import("../../services/api?set-auth-token");

    setAuthToken("new-session-token", true);

    expect(mockAxiosInstance.defaults.headers.common["Authorization"]).toBe(
      "Bearer new-session-token",
    );
    expect(window.localStorage.getItem("authToken")).toBe("new-session-token");
  });
});
