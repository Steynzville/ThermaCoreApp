/**
 * Date utility functions for consistent date handling across the application.
 * These are generic utilities for production use in the application.
 * For mock data generation, see mockDataUtils.js
 */

/**
 * Formats a date for user display
 * @param {string|Date} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export function formatDisplayDate(date, options = {}) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

/**
 * Gets current timestamp in ISO format
 * @returns {string} Current timestamp
 */
export function getCurrentTimestamp() {
  return new Date().toISOString();
}