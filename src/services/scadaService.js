/**
 * SCADA Service for Real-Time Dashboard Data Integration
 *
 * Provides API integration for current metrics, historical data,
 * and protocol status with tenant-aware filtering.
 */

import { apiGetJson } from "../utils/apiFetch";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com";

// Constants for mock data generation
const MIN_ACTIVE_UNITS = 8;
const ACTIVE_UNITS_RANGE = 3;
const TOTAL_UNITS = 12;
const MIN_DATA_POINTS = 2500;
const DATA_POINTS_RANGE = 500;
const MIN_DATA_QUALITY = 90;
const DATA_QUALITY_RANGE = 10;
const MIN_TEMPERATURE = 65;
const TEMPERATURE_RANGE = 10;
const MIN_PRESSURE = 100;
const PRESSURE_RANGE = 10;
const MIN_DATA_RATE = 40;
const DATA_RATE_RANGE = 20;
const MIN_PROTOCOL_DEVICES = 2;
const PROTOCOL_DEVICES_RANGE = 4;
const MIN_PROTOCOL_DATA_RATE = 10;
const PROTOCOL_DATA_RATE_RANGE = 30;
const HISTORICAL_DATA_POINTS = 24;
const MIN_HISTORICAL_DATA_POINTS_VALUE = 100;
const HISTORICAL_DATA_POINTS_RANGE = 50;

/**
 * Get current SCADA metrics for the dashboard
 * @param {string} tenantId - Optional tenant ID for filtering
 * @returns {Promise<Object>} - Current metrics data
 */
export const getCurrentMetrics = async (tenantId = null) => {
  try {
    const url = tenantId
      ? `${API_BASE_URL}/api/v1/scada/current-metrics?tenant_id=${tenantId}`
      : `${API_BASE_URL}/api/v1/scada/current-metrics`;

    const response = await apiGetJson(url);

    return {
      success: true,
      data: response.data || response,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to fetch current metrics",
      data: null,
    };
  }
};

/**
 * Get historical SCADA data
 * @param {Object} params - Query parameters
 * @param {string} params.tenantId - Optional tenant ID
 * @param {string} params.startTime - Start time ISO string
 * @param {string} params.endTime - End time ISO string
 * @param {string} params.interval - Data aggregation interval (e.g., '5m', '1h', '1d')
 * @returns {Promise<Object>} - Historical data
 */
export const getHistoricalData = async ({
  tenantId = null,
  startTime,
  endTime,
  interval = "5m",
} = {}) => {
  try {
    const params = new URLSearchParams();

    if (tenantId) params.append("tenant_id", tenantId);
    if (startTime) params.append("start_time", startTime);
    if (endTime) params.append("end_time", endTime);
    if (interval) params.append("interval", interval);

    const url = `${API_BASE_URL}/api/v1/scada/historical-data?${params.toString()}`;
    const response = await apiGetJson(url);

    return {
      success: true,
      data: response.data || response,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to fetch historical data",
      data: null,
    };
  }
};

/**
 * Get protocol status information
 * @param {string} tenantId - Optional tenant ID for filtering
 * @returns {Promise<Object>} - Protocol status data
 */
export const getProtocolStatus = async (tenantId = null) => {
  try {
    const url = tenantId
      ? `${API_BASE_URL}/api/v1/protocols/status?tenant_id=${tenantId}`
      : `${API_BASE_URL}/api/v1/protocols/status`;

    const response = await apiGetJson(url);

    return {
      success: true,
      data: response.data || response,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to fetch protocol status",
      data: null,
    };
  }
};

/**
 * Get device status information
 * @param {string} tenantId - Optional tenant ID for filtering
 * @returns {Promise<Object>} - Device status data
 */
export const getDeviceStatus = async (tenantId = null) => {
  try {
    const url = tenantId
      ? `${API_BASE_URL}/api/v1/scada/devices/status?tenant_id=${tenantId}`
      : `${API_BASE_URL}/api/v1/scada/devices/status`;

    const response = await apiGetJson(url);

    return {
      success: true,
      data: response.data || response,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to fetch device status",
      data: null,
    };
  }
};

/**
 * Get SCADA system status
 * @returns {Promise<Object>} - System status data
 */
export const getScadaStatus = async () => {
  try {
    const url = `${API_BASE_URL}/api/v1/scada/status`;
    const response = await apiGetJson(url);

    return {
      success: true,
      data: response.data || response,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to fetch SCADA status",
      data: null,
    };
  }
};

/**
 * Mock data generator for development/testing
 * Generates realistic SCADA metrics when backend is unavailable
 */
export const generateMockMetrics = () => {
  const activeUnits =
    Math.floor(Math.random() * ACTIVE_UNITS_RANGE) + MIN_ACTIVE_UNITS;
  const totalUnits = TOTAL_UNITS;
  const dataPoints =
    Math.floor(Math.random() * DATA_POINTS_RANGE) + MIN_DATA_POINTS;
  const dataQuality =
    Math.floor(Math.random() * DATA_QUALITY_RANGE) + MIN_DATA_QUALITY;

  return {
    activeUnits: {
      value: activeUnits,
      total: totalUnits,
      percentage: ((activeUnits / totalUnits) * 100).toFixed(1),
      trend: Math.random() > 0.5 ? "up" : "stable",
    },
    temperature: {
      current: (Math.random() * TEMPERATURE_RANGE + MIN_TEMPERATURE).toFixed(1),
      min: 62.3,
      max: 78.9,
      unit: "°C",
      trend: Math.random() > 0.5 ? "up" : "down",
    },
    pressure: {
      current: (Math.random() * PRESSURE_RANGE + MIN_PRESSURE).toFixed(1),
      min: 95.2,
      max: 112.4,
      unit: "PSI",
      trend: Math.random() > 0.5 ? "up" : "down",
    },
    dataPoints: {
      count: dataPoints,
      rate: Math.floor(Math.random() * DATA_RATE_RANGE) + MIN_DATA_RATE,
      trend: "up",
    },
    dataQuality: {
      score: dataQuality,
      issues: dataQuality < 95 ? Math.floor((100 - dataQuality) / 2) : 0,
      status:
        dataQuality >= 95 ? "excellent" : dataQuality >= 85 ? "good" : "fair",
    },
  };
};

/**
 * Generate mock historical data for charts
 */
export const generateMockHistoricalData = (hours = 24) => {
  const data = [];
  const now = Date.now();
  const interval = (hours * 60 * 60 * 1000) / HISTORICAL_DATA_POINTS;

  for (let i = 0; i < HISTORICAL_DATA_POINTS; i++) {
    const timestamp = new Date(
      now - (HISTORICAL_DATA_POINTS - 1 - i) * interval,
    );
    data.push({
      timestamp: timestamp.toISOString(),
      temperature: (
        Math.random() * TEMPERATURE_RANGE +
        MIN_TEMPERATURE
      ).toFixed(1),
      pressure: (Math.random() * PRESSURE_RANGE + MIN_PRESSURE).toFixed(1),
      dataPoints:
        Math.floor(Math.random() * HISTORICAL_DATA_POINTS_RANGE) +
        MIN_HISTORICAL_DATA_POINTS_VALUE,
      activeUnits:
        Math.floor(Math.random() * ACTIVE_UNITS_RANGE) + MIN_ACTIVE_UNITS,
    });
  }

  return data;
};

/**
 * Generate mock protocol status
 */
export const generateMockProtocolStatus = () => {
  const protocols = ["Modbus", "DNP3", "OPC-UA", "MQTT"];

  return protocols.map((protocol) => ({
    name: protocol,
    status: Math.random() > 0.1 ? "connected" : "disconnected",
    devices:
      Math.floor(Math.random() * PROTOCOL_DEVICES_RANGE) + MIN_PROTOCOL_DEVICES,
    lastUpdate: new Date(Date.now() - Math.random() * 60000).toISOString(),
    dataRate:
      Math.floor(Math.random() * PROTOCOL_DATA_RATE_RANGE) +
      MIN_PROTOCOL_DATA_RATE,
  }));
};

export default {
  getCurrentMetrics,
  getHistoricalData,
  getProtocolStatus,
  getDeviceStatus,
  getScadaStatus,
  generateMockMetrics,
  generateMockHistoricalData,
  generateMockProtocolStatus,
};
