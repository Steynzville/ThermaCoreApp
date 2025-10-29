/**
 * Status Monitoring Service
 * Performs live health checks for infrastructure components
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com";

/**
 * Check if a URL is accessible and measure response time
 * @param {string} url - URL to check
 * @param {string} method - HTTP method to use (default: GET)
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<{status: string, responseTime: number, error?: string}>}
 */
async function checkEndpoint(url, method = "GET", timeout = 5000) {
  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeoutId);
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    if (response.ok) {
      return {
        status: "operational",
        responseTime,
      };
    }
    return {
      status: "degraded",
      responseTime,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    if (error.name === "AbortError") {
      return {
        status: "outage",
        responseTime: timeout,
        error: "Timeout",
      };
    }

    return {
      status: "outage",
      responseTime,
      error: error.message || "Connection failed",
    };
  }
}

/**
 * Check frontend hosting status
 * @returns {Promise<{name: string, provider: string, status: string, responseTime: number, icon: string}>}
 */
export async function checkFrontendStatus() {
  // For frontend, we check if we can access the current host
  const frontendUrl = window.location.origin;
  const result = await checkEndpoint(`${frontendUrl}/index.html`, "HEAD");

  return {
    name: "Frontend Hosting",
    provider: "Netlify",
    status: result.status === "operational" ? "Operational" : "Outage",
    responseTime: `${result.responseTime}ms`,
    icon: "Globe",
    error: result.error,
  };
}

/**
 * Check backend API status
 * @returns {Promise<{name: string, provider: string, status: string, responseTime: number, icon: string}>}
 */
export async function checkBackendStatus() {
  const result = await checkEndpoint(`${API_BASE_URL}/api/v1/health`);

  let status = "Operational";
  if (result.status === "degraded") {
    status = "Degraded Performance";
  } else if (result.status === "outage") {
    status = "Outage";
  }

  return {
    name: "Backend API",
    provider: "Render",
    status,
    responseTime: `${result.responseTime}ms`,
    icon: "Server",
    error: result.error,
  };
}

/**
 * Check database status via backend health endpoint
 * @returns {Promise<{name: string, provider: string, status: string, responseTime: number, icon: string}>}
 */
export async function checkDatabaseStatus() {
  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE_URL}/api/v1/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    if (response.ok) {
      const data = await response.json();
      const dbConnected = data.database?.connected ?? false;

      return {
        name: "Database",
        provider: "TimescaleDB",
        status: dbConnected ? "Operational" : "Degraded Performance",
        responseTime: `${responseTime}ms`,
        icon: "Database",
      };
    }

    const endTime2 = performance.now();
    return {
      name: "Database",
      provider: "TimescaleDB",
      status: "Degraded Performance",
      responseTime: `${Math.round(endTime2 - startTime)}ms`,
      icon: "Database",
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    return {
      name: "Database",
      provider: "TimescaleDB",
      status: "Outage",
      responseTime: `${responseTime}ms`,
      icon: "Database",
      error: error.name === "AbortError" ? "Timeout" : error.message,
    };
  }
}

/**
 * Check WebSocket/MQTT status
 * Note: This is a simplified check - actual WebSocket connection would require more setup
 * @returns {Promise<{name: string, provider: string, status: string, responseTime: number, icon: string}>}
 */
export async function checkWebSocketStatus() {
  // For now, we check if the backend is accessible as a proxy for WebSocket availability
  const result = await checkEndpoint(`${API_BASE_URL}/health`, "GET");

  let status = "Operational";
  if (result.status === "degraded") {
    status = "Degraded Performance";
  } else if (result.status === "outage") {
    status = "Outage";
  }

  return {
    name: "Real-time Messaging",
    provider: "Mosquitto MQTT Broker",
    status,
    responseTime: `${result.responseTime}ms`,
    icon: "Activity",
    error: result.error,
  };
}

/**
 * Check all infrastructure components
 * @returns {Promise<Array>} Array of status objects for all components
 */
export async function checkAllStatus() {
  const [frontend, backend, database, websocket] = await Promise.all([
    checkFrontendStatus(),
    checkBackendStatus(),
    checkDatabaseStatus(),
    checkWebSocketStatus(),
  ]);

  return [frontend, backend, database, websocket];
}
