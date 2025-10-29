/**
 * Centralized logging utility for application-wide logging
 * Use this instead of console.* methods for better error handling and CI compliance
 */

export const logger = {
  error: (message, error) => {
    if (import.meta.env.DEV) {
      // biome-ignore lint/suspicious/noConsole: Allowed in logger utility
      console.error("🔴 [Error]", message, error);
    }
    // In production, this would send to error tracking service (Sentry/DataDog/etc.)
  },

  warn: (message, data) => {
    if (import.meta.env.DEV) {
      // biome-ignore lint/suspicious/noConsole: Allowed in logger utility
      console.warn("🟡 [Warning]", message, data);
    }
  },

  info: (message, data) => {
    if (import.meta.env.DEV) {
      // biome-ignore lint/suspicious/noConsole: Allowed in logger utility
      console.info("🔵 [Info]", message, data);
    }
  },

  debug: (message, data) => {
    if (import.meta.env.DEV) {
      // biome-ignore lint/suspicious/noConsole: Allowed in logger utility
      console.debug("🟣 [Debug]", message, data);
    }
  },
};
