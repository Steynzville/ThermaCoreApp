/**
 * API Response Test Fixtures
 *
 * Provides mock API responses for testing:
 * - Success and error responses
 * - Pagination data
 * - CRUD operation responses
 * - Network error scenarios
 */

/**
 * Generate mock API success response
 */
export function createMockApiResponse(data, overrides = {}) {
  return {
    success: true,
    data,
    message: "Request successful",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate mock API error response
 */
export function createMockApiError(
  message = "An error occurred",
  overrides = {},
) {
  return {
    success: false,
    error: message,
    message,
    code: "API_ERROR",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate mock paginated response
 */
export function createMockPaginatedResponse(items, options = {}) {
  const { page = 1, perPage = 10, total = items.length } = options;

  const totalPages = Math.ceil(total / perPage);
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  return createMockApiResponse({
    items: paginatedItems,
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}

/**
 * Generate mock CRUD operation responses
 */
export function createMockCrudResponses(resourceName = "item") {
  return {
    create: (data) =>
      createMockApiResponse(
        { id: `${resourceName}-${Date.now()}`, ...data },
        { message: `${resourceName} created successfully` },
      ),

    read: (id, data) =>
      createMockApiResponse(
        { id, ...data },
        { message: `${resourceName} retrieved successfully` },
      ),

    update: (id, data) =>
      createMockApiResponse(
        { id, ...data },
        { message: `${resourceName} updated successfully` },
      ),

    delete: (id) =>
      createMockApiResponse(
        { id, deleted: true },
        { message: `${resourceName} deleted successfully` },
      ),

    list: (items) => createMockPaginatedResponse(items),
  };
}

/**
 * Generate mock unit API responses
 */
export function createMockUnitResponse(overrides = {}) {
  const unit = {
    id: `unit-${Date.now()}`,
    name: "Test Unit",
    status: "online",
    location: "Test Location",
    type: "Industrial Cooler",
    capacity: 1000,
    efficiency: 85.5,
    temperature: 65.2,
    pressure: 120.5,
    alerts: 0,
    lastMaintenance: new Date(Date.now() - 86400000).toISOString(),
    nextMaintenance: new Date(Date.now() + 2592000000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };

  return createMockApiResponse(unit);
}

/**
 * Generate mock alarm/alert API responses
 */
export function createMockAlarmResponse(overrides = {}) {
  const alarm = {
    id: `alarm-${Date.now()}`,
    type: "Temperature High",
    severity: "warning",
    priority: 2,
    message: "Temperature exceeded threshold",
    source: "device-1",
    timestamp: new Date().toISOString(),
    acknowledged: false,
    active: true,
    value: 75.5,
    threshold: 70.0,
    ...overrides,
  };

  return createMockApiResponse(alarm);
}

/**
 * Generate mock protocol connection response
 */
export function createMockProtocolResponse(
  protocol = "modbus",
  overrides = {},
) {
  const connection = {
    id: `${protocol}-${Date.now()}`,
    protocol: protocol.toUpperCase(),
    status: "connected",
    host: "192.168.1.100",
    port: 502,
    connected_at: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    ...overrides,
  };

  return createMockApiResponse(connection);
}

/**
 * Generate mock analytics/metrics response
 */
export function createMockAnalyticsResponse(overrides = {}) {
  const analytics = {
    period: "24h",
    metrics: {
      avgEfficiency: 85.5,
      avgTemperature: 65.2,
      avgPressure: 120.5,
      totalOutput: 24500,
      totalInput: 28800,
      uptime: 95.5,
    },
    trend: "stable",
    timestamp: new Date().toISOString(),
    ...overrides,
  };

  return createMockApiResponse(analytics);
}

/**
 * Generate mock network error
 */
export function createMockNetworkError(message = "Network error") {
  const error = new Error(message);
  error.name = "NetworkError";
  error.code = "ERR_NETWORK";
  return error;
}

/**
 * Generate mock fetch response
 */
export function createMockFetchResponse(data, options = {}) {
  const {
    status = 200,
    statusText = "OK",
    headers = { "Content-Type": "application/json" },
  } = options;

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers(headers),
    json: async () => data,
    text: async () => JSON.stringify(data),
    clone: function () {
      return this;
    },
  };
}

/**
 * Fixture: Common API error scenarios
 */
export const apiErrorFixtures = {
  unauthorized: createMockApiError("Unauthorized", {
    code: "UNAUTHORIZED",
    status: 401,
  }),
  forbidden: createMockApiError("Forbidden", {
    code: "FORBIDDEN",
    status: 403,
  }),
  notFound: createMockApiError("Not found", { code: "NOT_FOUND", status: 404 }),
  serverError: createMockApiError("Internal server error", {
    code: "SERVER_ERROR",
    status: 500,
  }),
  networkError: createMockNetworkError(),
  timeout: createMockApiError("Request timeout", {
    code: "TIMEOUT",
    status: 408,
  }),
};

export default {
  createMockApiResponse,
  createMockApiError,
  createMockPaginatedResponse,
  createMockCrudResponses,
  createMockUnitResponse,
  createMockAlarmResponse,
  createMockProtocolResponse,
  createMockAnalyticsResponse,
  createMockNetworkError,
  createMockFetchResponse,
  apiErrorFixtures,
};
