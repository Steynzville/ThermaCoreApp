/**
 * Analytics Service
 *
 * Provides API integration for analytics, reporting, and data export
 * with tenant-aware filtering and customizable time ranges.
 */

import { apiGetJson } from "../utils/apiFetch";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com";

/**
 * Get performance metrics
 * @param {Object} params - Query parameters
 * @param {string} params.tenantId - Tenant ID
 * @param {string} params.startTime - Start time ISO string
 * @param {string} params.endTime - End time ISO string
 * @param {string} params.metric - Metric type
 * @returns {Promise<Object>} - Performance metrics
 */
export const getPerformanceMetrics = async ({
  tenantId = null,
  startTime,
  endTime,
  metric = "all",
} = {}) => {
  try {
    const params = new URLSearchParams();
    if (tenantId) params.append("tenant_id", tenantId);
    if (startTime) params.append("start_time", startTime);
    if (endTime) params.append("end_time", endTime);
    if (metric) params.append("metric", metric);

    const url = `${API_BASE_URL}/api/v1/analytics/performance?${params.toString()}`;
    const response = await apiGetJson(url);

    return {
      success: true,
      data: response.data || response,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to fetch performance metrics",
      data: null,
    };
  }
};

/**
 * Generate and download report
 * @param {Object} params - Report parameters
 * @param {string} params.tenantId - Tenant ID
 * @param {string} params.reportType - Report type (performance, alerts, energy)
 * @param {string} params.format - Export format (csv, pdf, excel)
 * @param {string} params.startTime - Start time ISO string
 * @param {string} params.endTime - End time ISO string
 * @returns {Promise<Object>} - Report generation result
 */
export const generateReport = async ({
  tenantId = null,
  reportType = "performance",
  format = "csv",
  startTime,
  endTime,
} = {}) => {
  try {
    const params = new URLSearchParams();
    if (tenantId) params.append("tenant_id", tenantId);
    params.append("report_type", reportType);
    params.append("format", format);
    if (startTime) params.append("start_time", startTime);
    if (endTime) params.append("end_time", endTime);

    const url = `${API_BASE_URL}/api/v1/reports/generate?${params.toString()}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // For CSV/Excel, return blob
    if (format === "csv" || format === "excel") {
      const blob = await response.blob();
      return {
        success: true,
        data: blob,
        type: "blob",
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
      type: "json",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to generate report",
      data: null,
    };
  }
};

/**
 * Get equipment health scores
 * @param {Object} params - Query parameters
 * @param {string} params.tenantId - Tenant ID
 * @param {string} params.deviceId - Optional specific device ID
 * @returns {Promise<Object>} - Equipment health data
 */
export const getEquipmentHealth = async ({
  tenantId = null,
  deviceId = null,
} = {}) => {
  try {
    const params = new URLSearchParams();
    if (tenantId) params.append("tenant_id", tenantId);
    if (deviceId) params.append("device_id", deviceId);

    const url = `${API_BASE_URL}/api/v1/analytics/equipment-health?${params.toString()}`;
    const response = await apiGetJson(url);

    return {
      success: true,
      data: response.data || response,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to fetch equipment health",
      data: null,
    };
  }
};

/**
 * Get energy consumption analytics
 * @param {Object} params - Query parameters
 * @param {string} params.tenantId - Tenant ID
 * @param {string} params.timeframe - Timeframe (24h, 7d, 30d)
 * @returns {Promise<Object>} - Energy consumption data
 */
export const getEnergyConsumption = async ({
  tenantId = null,
  timeframe = "7d",
} = {}) => {
  try {
    const params = new URLSearchParams();
    if (tenantId) params.append("tenant_id", tenantId);
    params.append("timeframe", timeframe);

    const url = `${API_BASE_URL}/api/v1/analytics/energy-consumption?${params.toString()}`;
    const response = await apiGetJson(url);

    return {
      success: true,
      data: response.data || response,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to fetch energy consumption",
      data: null,
    };
  }
};

/**
 * Generate mock performance metrics
 */
export const generateMockPerformanceMetrics = () => {
  return {
    overall: {
      efficiency: (Math.random() * 20 + 75).toFixed(1),
      uptime: (Math.random() * 5 + 95).toFixed(1),
      availability: (Math.random() * 5 + 94).toFixed(1),
      quality: (Math.random() * 10 + 88).toFixed(1),
    },
    byDevice: [
      {
        id: "TC001",
        name: "ThermaCore Unit 001",
        efficiency: (Math.random() * 20 + 75).toFixed(1),
        uptime: (Math.random() * 5 + 95).toFixed(1),
        status: "running",
      },
      {
        id: "TC002",
        name: "ThermaCore Unit 002",
        efficiency: (Math.random() * 20 + 75).toFixed(1),
        uptime: (Math.random() * 5 + 95).toFixed(1),
        status: "running",
      },
      {
        id: "TC003",
        name: "ThermaCore Unit 003",
        efficiency: (Math.random() * 20 + 75).toFixed(1),
        uptime: (Math.random() * 5 + 95).toFixed(1),
        status: "warning",
      },
    ],
    trends: {
      efficiency: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        value: Math.random() * 20 + 75,
      })),
      uptime: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        value: Math.random() * 5 + 95,
      })),
    },
  };
};

/**
 * Generate mock equipment health data
 */
export const generateMockEquipmentHealth = () => {
  return {
    overall: {
      score: Math.floor(Math.random() * 20 + 75),
      status: "healthy",
      lastMaintenance: new Date(
        Date.now() - Math.random() * 30 * 86400000,
      ).toISOString(),
      nextMaintenance: new Date(
        Date.now() + Math.random() * 30 * 86400000,
      ).toISOString(),
    },
    devices: [
      {
        id: "TC001",
        name: "ThermaCore Unit 001",
        healthScore: Math.floor(Math.random() * 20 + 75),
        status: "healthy",
        sensors: {
          temperature: "good",
          pressure: "good",
          flow: "warning",
        },
        predictions: {
          maintenanceDue: 15, // days
          remainingLifetime: 85, // percentage
        },
      },
      {
        id: "TC002",
        name: "ThermaCore Unit 002",
        healthScore: Math.floor(Math.random() * 20 + 75),
        status: "healthy",
        sensors: {
          temperature: "good",
          pressure: "good",
          flow: "good",
        },
        predictions: {
          maintenanceDue: 22,
          remainingLifetime: 92,
        },
      },
    ],
  };
};

/**
 * Generate mock energy consumption data
 */
export const generateMockEnergyConsumption = (days = 7) => {
  return {
    total: Math.floor(Math.random() * 1000 + 5000),
    average: Math.floor(Math.random() * 150 + 700),
    peak: Math.floor(Math.random() * 200 + 1200),
    savings: Math.floor(Math.random() * 20 + 10),
    timeline: Array.from({ length: days }, (_, i) => ({
      date: new Date(
        Date.now() - (days - 1 - i) * 86400000,
      ).toLocaleDateString(),
      consumption: Math.random() * 300 + 600,
      cost: Math.random() * 30 + 60,
    })),
    byDevice: [
      {
        id: "TC001",
        name: "ThermaCore Unit 001",
        consumption: Math.floor(Math.random() * 300 + 1500),
        percentage: 30,
      },
      {
        id: "TC002",
        name: "ThermaCore Unit 002",
        consumption: Math.floor(Math.random() * 300 + 1500),
        percentage: 28,
      },
      {
        id: "TC003",
        name: "ThermaCore Unit 003",
        consumption: Math.floor(Math.random() * 300 + 1500),
        percentage: 25,
      },
    ],
  };
};

export default {
  getPerformanceMetrics,
  generateReport,
  getEquipmentHealth,
  getEnergyConsumption,
  generateMockPerformanceMetrics,
  generateMockEquipmentHealth,
  generateMockEnergyConsumption,
};
