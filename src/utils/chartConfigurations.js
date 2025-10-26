/**
 * Chart Configuration Utilities
 *
 * Provides standardized configurations for different chart types.
 * Separates chart configuration from component rendering logic.
 */

/**
 * Default color palette for charts
 */
export const chartColors = {
  primary: "#3b82f6",
  secondary: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
  success: "#22c55e",
  purple: "#a855f7",
  pink: "#ec4899",
};

/**
 * Dark mode color palette
 */
export const chartColorsDark = {
  primary: "#60a5fa",
  secondary: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
  info: "#22d3ee",
  success: "#4ade80",
  purple: "#c084fc",
  pink: "#f472b6",
};

/**
 * Get chart configuration for line charts
 */
export const getLineChartConfig = (options = {}) => {
  const {
    showGrid = true,
    showTooltip = true,
    strokeWidth = 2,
    dot = false,
    smooth = true,
    animationDuration = 300,
  } = options;

  return {
    showGrid,
    showTooltip,
    strokeWidth,
    dot,
    smooth,
    animationDuration,
    cartesianGrid: showGrid
      ? {
          strokeDasharray: "3 3",
          stroke: "#e5e7eb",
          strokeOpacity: 0.5,
        }
      : null,
    tooltip: showTooltip
      ? {
          contentStyle: {
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "12px",
          },
          labelStyle: {
            color: "#374151",
            fontWeight: "600",
          },
          itemStyle: {
            color: "#6b7280",
          },
        }
      : null,
    line: {
      type: smooth ? "monotone" : "linear",
      strokeWidth,
      dot,
      activeDot: { r: 6 },
    },
  };
};

/**
 * Get chart configuration for bar charts
 */
export const getBarChartConfig = (options = {}) => {
  const {
    showGrid = true,
    showTooltip = true,
    barSize = 40,
    radius = [8, 8, 0, 0],
    animationDuration = 300,
  } = options;

  return {
    showGrid,
    showTooltip,
    barSize,
    radius,
    animationDuration,
    cartesianGrid: showGrid
      ? {
          strokeDasharray: "3 3",
          stroke: "#e5e7eb",
          strokeOpacity: 0.5,
        }
      : null,
    tooltip: showTooltip
      ? {
          contentStyle: {
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "12px",
          },
        }
      : null,
  };
};

/**
 * Get chart configuration for area charts
 */
export const getAreaChartConfig = (options = {}) => {
  const {
    showGrid = true,
    showTooltip = true,
    fillOpacity = 0.2,
    strokeWidth = 2,
    smooth = true,
    animationDuration = 300,
  } = options;

  return {
    showGrid,
    showTooltip,
    fillOpacity,
    strokeWidth,
    smooth,
    animationDuration,
    cartesianGrid: showGrid
      ? {
          strokeDasharray: "3 3",
          stroke: "#e5e7eb",
          strokeOpacity: 0.5,
        }
      : null,
    tooltip: showTooltip
      ? {
          contentStyle: {
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "12px",
          },
        }
      : null,
    area: {
      type: smooth ? "monotone" : "linear",
      fillOpacity,
      strokeWidth,
    },
  };
};

/**
 * Get axis configuration
 */
export const getAxisConfig = (type = "x", options = {}) => {
  const {
    dataKey,
    label,
    tickFormatter,
    domain,
    allowDataOverflow = false,
  } = options;

  const baseConfig = {
    dataKey,
    label: label
      ? {
          value: label,
          position: type === "x" ? "insideBottom" : "insideLeft",
          offset: type === "x" ? -5 : 0,
        }
      : undefined,
    tickFormatter,
    domain,
    allowDataOverflow,
    stroke: "#9ca3af",
    tick: {
      fill: "#6b7280",
      fontSize: 12,
    },
  };

  if (type === "x") {
    return {
      ...baseConfig,
      height: 60,
    };
  }

  return {
    ...baseConfig,
    width: 80,
  };
};

/**
 * Get responsive container configuration
 */
export const getResponsiveContainerConfig = (options = {}) => {
  const { width = "100%", height = 300, minHeight = 200 } = options;

  return {
    width,
    height,
    minHeight,
  };
};

/**
 * Get legend configuration
 */
export const getLegendConfig = (options = {}) => {
  const {
    verticalAlign = "top",
    height = 36,
    iconType = "line",
    wrapperStyle = {},
  } = options;

  return {
    verticalAlign,
    height,
    iconType,
    wrapperStyle: {
      paddingTop: "10px",
      ...wrapperStyle,
    },
  };
};

/**
 * Get common chart metrics configurations
 */
export const metricConfigurations = {
  temperature: {
    label: "Temperature (°C)",
    color: chartColors.danger,
    unit: "°C",
    domain: [0, 50],
  },
  pressure: {
    label: "Pressure (PSI)",
    color: chartColors.info,
    unit: "PSI",
    domain: [0, 100],
  },
  power: {
    label: "Power (kW)",
    color: chartColors.primary,
    unit: "kW",
    domain: [0, 10],
  },
  waterLevel: {
    label: "Water Level (%)",
    color: chartColors.secondary,
    unit: "%",
    domain: [0, 100],
  },
  flowRate: {
    label: "Flow Rate (L/min)",
    color: chartColors.purple,
    unit: "L/min",
    domain: [0, 100],
  },
  efficiency: {
    label: "Efficiency (%)",
    color: chartColors.success,
    unit: "%",
    domain: [0, 100],
  },
};

/**
 * Create a complete chart configuration
 */
export const createChartConfig = (chartType, metrics, options = {}) => {
  let chartConfig;

  switch (chartType) {
    case "line":
      chartConfig = getLineChartConfig(options);
      break;
    case "bar":
      chartConfig = getBarChartConfig(options);
      break;
    case "area":
      chartConfig = getAreaChartConfig(options);
      break;
    default:
      chartConfig = getLineChartConfig(options);
  }

  // Add metric-specific configurations
  const metricConfigs = metrics.map((metric) => {
    const config = metricConfigurations[metric] || {
      label: metric,
      color: chartColors.primary,
    };
    return {
      key: metric,
      ...config,
    };
  });

  return {
    ...chartConfig,
    metrics: metricConfigs,
  };
};

/**
 * Format tick values for different data types
 */
export const tickFormatters = {
  number: (value) => value.toLocaleString(),
  percentage: (value) => `${value}%`,
  currency: (value) => `$${value.toLocaleString()}`,
  temperature: (value) => `${value}°C`,
  time: (value) => new Date(value).toLocaleTimeString(),
  date: (value) => new Date(value).toLocaleDateString(),
  datetime: (value) => new Date(value).toLocaleString(),
  compact: (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  },
};

/**
 * Get timeframe selector options
 */
export const getTimeframeOptions = () => [
  { value: "day", label: "Day View (Hourly)" },
  { value: "month", label: "Month View (Daily)" },
  { value: "year", label: "Year View (Monthly)" },
  { value: "3year", label: "3 Year View" },
  { value: "5year", label: "5 Year View" },
  { value: "10year", label: "10 Year View" },
  { value: "alltime", label: "All Time View" },
];

export default {
  chartColors,
  chartColorsDark,
  getLineChartConfig,
  getBarChartConfig,
  getAreaChartConfig,
  getAxisConfig,
  getResponsiveContainerConfig,
  getLegendConfig,
  metricConfigurations,
  createChartConfig,
  tickFormatters,
  getTimeframeOptions,
};
