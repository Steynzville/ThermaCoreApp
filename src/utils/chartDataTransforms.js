/**
 * Chart Data Transformation Utilities
 *
 * Utilities for transforming data for visualization components.
 * Separates data transformation logic from rendering components.
 */

/**
 * Generate time-series data for different timeframes
 */
export const generateTimeSeriesData = (timeframe, dataGenerator) => {
  const config = getTimeframeConfig(timeframe);
  const data = [];
  const now = Date.now();

  for (let i = 0; i < config.points; i++) {
    const timestamp = now - (config.points - 1 - i) * config.interval;
    const point = dataGenerator
      ? dataGenerator(timestamp, i)
      : generateDefaultDataPoint(timestamp);
    data.push(point);
  }

  return data;
};

/**
 * Get configuration for different timeframes
 *
 * Note: Monthly and longer timeframes use a 30-day approximation for simplicity.
 * This will cause minor drift for months with different day counts (28-31 days).
 * For precise historical analysis, consider using actual calendar calculations.
 */
export const getTimeframeConfig = (timeframe) => {
  const configs = {
    day: {
      points: 24, // 24 hours
      interval: 60 * 60 * 1000, // 1 hour
      label: "Day View (Hourly)",
    },
    month: {
      points: 30, // 30 days
      interval: 24 * 60 * 60 * 1000, // 1 day
      label: "Month View (Daily)",
    },
    year: {
      points: 12, // 12 months
      interval: 30 * 24 * 60 * 60 * 1000, // 1 month (30-day approximation)
      label: "Year View (Monthly)",
    },
    "3year": {
      points: 36, // 36 months
      interval: 30 * 24 * 60 * 60 * 1000, // 1 month (30-day approximation)
      label: "3 Year View",
    },
    "5year": {
      points: 60, // 60 months
      interval: 30 * 24 * 60 * 60 * 1000, // 1 month (30-day approximation)
      label: "5 Year View",
    },
    "10year": {
      points: 120, // 120 months
      interval: 30 * 24 * 60 * 60 * 1000, // 1 month (30-day approximation)
      label: "10 Year View",
    },
    alltime: {
      points: 200, // More points for all time
      interval: 60 * 24 * 60 * 60 * 1000, // 2 months (60-day approximation)
      label: "All Time View",
    },
  };

  return (
    configs[timeframe] || {
      points: 24,
      interval: 60 * 60 * 1000,
      label: "Day View",
    }
  );
};

/**
 * Generate default data point for vital signs
 */
const generateDefaultDataPoint = (timestamp) => ({
  time: new Date(timestamp).toLocaleString(),
  timestamp,
  power: parseFloat((Math.random() * 5 + 1).toFixed(2)),
  tempIn: parseFloat((Math.random() * 20 + 15).toFixed(2)),
  tempOut: parseFloat((Math.random() * 20 + 20).toFixed(2)),
  pressure: parseFloat((Math.random() * 5 + 10).toFixed(2)),
  waterLevel: parseFloat((Math.random() * 50 + 50).toFixed(2)),
});

/**
 * Transform raw SCADA data to chart-ready format
 */
export const transformScadaData = (rawData, metrics = []) => {
  if (!rawData || !Array.isArray(rawData)) {
    return [];
  }

  return rawData.map((point) => {
    const transformed = {
      time: point.timestamp ? new Date(point.timestamp).toLocaleString() : "",
      timestamp: point.timestamp,
    };

    // Add requested metrics
    metrics.forEach((metric) => {
      if (point[metric] !== undefined) {
        transformed[metric] = point[metric];
      }
    });

    return transformed;
  });
};

/**
 * Aggregate data for different time intervals
 */
export const aggregateDataByInterval = (data, interval, aggregationFn) => {
  if (!data || data.length === 0) {
    return [];
  }

  const grouped = {};

  data.forEach((point) => {
    const bucket = Math.floor(point.timestamp / interval) * interval;
    if (!grouped[bucket]) {
      grouped[bucket] = [];
    }
    grouped[bucket].push(point);
  });

  return Object.entries(grouped).map(([timestamp, points]) => ({
    time: new Date(Number(timestamp)).toLocaleString(),
    timestamp: Number(timestamp),
    ...aggregationFn(points),
  }));
};

/**
 * Common aggregation functions
 */
export const aggregationFunctions = {
  average: (points, keys) => {
    const result = {};
    keys.forEach((key) => {
      const values = points.map((p) => p[key]).filter((v) => v !== undefined);
      result[key] =
        values.length > 0
          ? values.reduce((sum, v) => sum + v, 0) / values.length
          : 0;
    });
    return result;
  },

  max: (points, keys) => {
    const result = {};
    keys.forEach((key) => {
      const values = points.map((p) => p[key]).filter((v) => v !== undefined);
      result[key] = values.length > 0 ? Math.max(...values) : 0;
    });
    return result;
  },

  min: (points, keys) => {
    const result = {};
    keys.forEach((key) => {
      const values = points.map((p) => p[key]).filter((v) => v !== undefined);
      result[key] = values.length > 0 ? Math.min(...values) : 0;
    });
    return result;
  },

  sum: (points, keys) => {
    const result = {};
    keys.forEach((key) => {
      const values = points.map((p) => p[key]).filter((v) => v !== undefined);
      result[key] =
        values.length > 0 ? values.reduce((sum, v) => sum + v, 0) : 0;
    });
    return result;
  },
};

/**
 * Normalize data to a specific range
 */
export const normalizeData = (data, key, min = 0, max = 100) => {
  if (!data || data.length === 0) {
    return data;
  }

  const values = data.map((d) => d[key]).filter((v) => v !== undefined);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const range = dataMax - dataMin;

  if (range === 0) {
    return data;
  }

  return data.map((point) => ({
    ...point,
    [`${key}_normalized`]: ((point[key] - dataMin) / range) * (max - min) + min,
  }));
};

/**
 * Calculate moving average for data smoothing
 */
export const calculateMovingAverage = (data, key, window = 5) => {
  if (!data || data.length < window) {
    return data;
  }

  return data.map((point, index) => {
    if (index < window - 1) {
      return { ...point, [`${key}_ma`]: point[key] };
    }

    const windowData = data.slice(index - window + 1, index + 1);
    const sum = windowData.reduce((acc, p) => acc + (p[key] || 0), 0);
    return {
      ...point,
      [`${key}_ma`]: sum / window,
    };
  });
};

/**
 * Fill gaps in time-series data
 *
 * @param {Array} data - Array of data points with timestamp property
 * @param {number} maxGapMs - Maximum allowed gap in milliseconds between consecutive points
 * @param {*} fillValue - Value to use for filled points, or null to interpolate
 * @returns {Array} Data array with gaps filled
 */
export const fillDataGaps = (data, maxGapMs, fillValue = null) => {
  if (!data || data.length < 2) {
    return data;
  }

  const filled = [data[0]];

  for (let i = 1; i < data.length; i++) {
    const gap = data[i].timestamp - data[i - 1].timestamp;

    if (gap > maxGapMs) {
      // Insert interpolated point
      const midPoint = {
        timestamp: data[i - 1].timestamp + gap / 2,
        time: new Date(data[i - 1].timestamp + gap / 2).toLocaleString(),
      };

      // Copy keys and use fill value or interpolate
      Object.keys(data[i]).forEach((key) => {
        if (key !== "time" && key !== "timestamp") {
          midPoint[key] =
            fillValue !== null
              ? fillValue
              : (data[i - 1][key] + data[i][key]) / 2;
        }
      });

      filled.push(midPoint);
    }

    filled.push(data[i]);
  }

  return filled;
};

export default {
  generateTimeSeriesData,
  getTimeframeConfig,
  transformScadaData,
  aggregateDataByInterval,
  aggregationFunctions,
  normalizeData,
  calculateMovingAverage,
  fillDataGaps,
};
