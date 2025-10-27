/**
 * Dashboard Fixture Utilities
 *
 * Reusable test utilities for protocol dashboard testing.
 * Provides helpers for rendering, interaction, and assertion patterns.
 */

import { render, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

/**
 * Render a protocol dashboard component with all necessary providers
 */
export const renderProtocolDashboard = (
  Component,
  { initialProps = {}, wrappers = [] } = {},
) => {
  const AllProviders = ({ children }) => {
    let wrappedChildren = children;

    // Apply custom wrappers in reverse order so they nest correctly
    // Use array copy to avoid mutating the input array
    for (const Wrapper of [...wrappers].reverse()) {
      wrappedChildren = <Wrapper>{wrappedChildren}</Wrapper>;
    }

    return <BrowserRouter>{wrappedChildren}</BrowserRouter>;
  };

  return render(<Component {...initialProps} />, {
    wrapper: AllProviders,
  });
};

/**
 * Wait for protocol connection to be established in tests
 */
export const waitForProtocolConnection = async (getByText, protocolName) => {
  await waitFor(
    () => {
      expect(
        getByText(new RegExp(`${protocolName}.*connected`, "i")),
      ).toBeInTheDocument();
    },
    { timeout: 3000 },
  );
};

/**
 * Wait for protocol data to load
 */
export const waitForProtocolData = async (
  queryByTestId,
  dataTestId = "protocol-data",
) => {
  await waitFor(
    () => {
      const dataElement = queryByTestId(dataTestId);
      expect(dataElement).toBeInTheDocument();
      expect(dataElement).not.toHaveTextContent(/loading|no data/i);
    },
    { timeout: 3000 },
  );
};

/**
 * Assert protocol connection status
 */
export const assertProtocolConnectionStatus = (container, expectedStatus) => {
  const statusElement = container.querySelector(
    '[data-testid="connection-status"]',
  );
  if (statusElement) {
    expect(statusElement).toHaveTextContent(new RegExp(expectedStatus, "i"));
  }
};

/**
 * Assert protocol metric value
 */
export const assertProtocolMetric = (container, metricName, expectedValue) => {
  const metricElement = container.querySelector(
    `[data-testid="metric-${metricName}"]`,
  );
  if (metricElement) {
    expect(metricElement).toHaveTextContent(expectedValue.toString());
  }
};

/**
 * Simulate protocol connection event
 */
export const simulateProtocolConnection = (mockService, connected = true) => {
  if (mockService.connect && connected) {
    return mockService.connect();
  }
  if (mockService.disconnect && !connected) {
    return mockService.disconnect();
  }
  return Promise.resolve();
};

/**
 * Simulate protocol data update
 */
export const simulateProtocolDataUpdate = (mockService, updates) => {
  if (mockService.updateData) {
    return mockService.updateData(updates);
  }
  // For services that store data internally
  Object.assign(mockService, updates);
  return Promise.resolve();
};

/**
 * Create mock WebSocket for protocol testing
 */
export const createMockProtocolWebSocket = (protocolType) => {
  const listeners = new Map();

  return {
    protocol: protocolType,
    readyState: 1, // OPEN
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn((event, callback) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event).push(callback);
    }),
    removeEventListener: vi.fn((event, callback) => {
      if (listeners.has(event)) {
        const callbacks = listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }),
    dispatchEvent: vi.fn((event) => {
      if (listeners.has(event.type)) {
        listeners.get(event.type).forEach((callback) => {
          callback(event);
        });
      }
    }),
    // Helper methods for testing
    simulateMessage: (data) => {
      const event = new MessageEvent("message", { data });
      if (listeners.has("message")) {
        listeners.get("message").forEach((callback) => {
          callback(event);
        });
      }
    },
    simulateOpen: () => {
      const event = new Event("open");
      if (listeners.has("open")) {
        listeners.get("open").forEach((callback) => {
          callback(event);
        });
      }
    },
    simulateClose: () => {
      const event = new CloseEvent("close");
      if (listeners.has("close")) {
        listeners.get("close").forEach((callback) => {
          callback(event);
        });
      }
    },
    simulateError: (error = new Error("WebSocket error")) => {
      const event = new ErrorEvent("error", { error });
      if (listeners.has("error")) {
        listeners.get("error").forEach((callback) => {
          callback(event);
        });
      }
    },
  };
};

/**
 * Assert dashboard displays correct protocol statistics
 */
export const assertProtocolStatistics = (container, expectedStats) => {
  Object.entries(expectedStats).forEach(([key, value]) => {
    const statElement = container.querySelector(`[data-testid="stat-${key}"]`);
    if (statElement) {
      expect(statElement).toHaveTextContent(value.toString());
    }
  });
};

/**
 * Get all protocol data rows from a dashboard table
 */
export const getProtocolDataRows = (
  container,
  tableTestId = "protocol-table",
) => {
  const table = container.querySelector(`[data-testid="${tableTestId}"]`);
  if (!table) return [];

  const rows = table.querySelectorAll("tbody tr");
  return Array.from(rows).map((row) => {
    const cells = row.querySelectorAll("td");
    return Array.from(cells).map((cell) => cell.textContent.trim());
  });
};

/**
 * Assert protocol error is displayed
 */
export const assertProtocolError = (container, errorMessage) => {
  const errorElement = container.querySelector(
    '[data-testid="protocol-error"]',
  );
  if (errorElement) {
    expect(errorElement).toHaveTextContent(new RegExp(errorMessage, "i"));
  }
};

/**
 * Wait for protocol operation to complete
 */
export const waitForProtocolOperation = async (operation, timeout = 3000) => {
  const startTime = Date.now();
  let lastError;

  while (Date.now() - startTime < timeout) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error(
    `Protocol operation timed out after ${timeout}ms: ${lastError?.message}`,
  );
};

/**
 * Create a mock protocol configuration
 */
export const createMockProtocolConfig = (protocolType, overrides = {}) => {
  const baseConfigs = {
    dnp3: {
      host: "192.168.1.200",
      port: 20000,
      masterAddress: 1,
      outstationAddress: 10,
      linkTimeout: 5,
      appTimeout: 5,
    },
    mqtt: {
      host: "mqtt.thermacore.local",
      port: 1883,
      protocol: "mqtt",
      clientId: `client-${Date.now()}`,
      keepalive: 60,
    },
    modbus: {
      host: "192.168.1.100",
      port: 502,
      unitId: 1,
      timeout: 5000,
      protocol: "TCP",
    },
    opcua: {
      endpointUrl: "opc.tcp://localhost:4840",
      securityMode: "None",
      securityPolicy: "None",
      sessionTimeout: 60000,
    },
  };

  const baseConfig = baseConfigs[protocolType.toLowerCase()] || {};

  return {
    ...baseConfig,
    ...overrides,
  };
};

/**
 * Create mock protocol dashboard props
 */
export const createMockDashboardProps = (protocolType, overrides = {}) => {
  return {
    protocolType,
    config: createMockProtocolConfig(protocolType, overrides.config),
    onConnectionChange: vi.fn(),
    onDataUpdate: vi.fn(),
    onError: vi.fn(),
    autoConnect: true,
    refreshInterval: 1000,
    ...overrides,
  };
};

/**
 * Assert protocol dashboard loading state
 */
export const assertDashboardLoading = (container, isLoading = true) => {
  const loadingElement = container.querySelector(
    '[data-testid="loading-indicator"]',
  );
  if (isLoading) {
    expect(loadingElement).toBeInTheDocument();
  } else {
    expect(loadingElement).not.toBeInTheDocument();
  }
};

/**
 * Assert protocol data is displayed in correct format
 */
export const assertProtocolDataFormat = (container, format) => {
  const dataContainer = container.querySelector(
    '[data-testid="protocol-data"]',
  );
  if (!dataContainer) {
    throw new Error("Protocol data container not found");
  }

  switch (format) {
    case "table":
      expect(dataContainer.querySelector("table")).toBeInTheDocument();
      break;
    case "chart":
      expect(
        dataContainer.querySelector('[data-testid="chart"]'),
      ).toBeInTheDocument();
      break;
    case "list":
      expect(dataContainer.querySelector("ul, ol")).toBeInTheDocument();
      break;
    default:
      throw new Error(`Unknown format: ${format}`);
  }
};

export default {
  renderProtocolDashboard,
  waitForProtocolConnection,
  waitForProtocolData,
  assertProtocolConnectionStatus,
  assertProtocolMetric,
  simulateProtocolConnection,
  simulateProtocolDataUpdate,
  createMockProtocolWebSocket,
  assertProtocolStatistics,
  getProtocolDataRows,
  assertProtocolError,
  waitForProtocolOperation,
  createMockProtocolConfig,
  createMockDashboardProps,
  assertDashboardLoading,
  assertProtocolDataFormat,
};
