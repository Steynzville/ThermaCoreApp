/**
 * Mock data utility functions for generating test data and mock timestamps
 * These utilities are specifically designed for creating realistic mock data
 * and should not be used for production date handling.
 */

/**
 * Generates a timestamp for mock data with a given offset from now.
 * Creates timestamps in the past by subtracting the offset from current time.
 * For chronological ordering in mock data, use smaller offsets for newer events.
 * 
 * @param {number} offsetMs - Offset in milliseconds from current time (positive values go into the past)
 * @returns {string} ISO timestamp string
 * 
 * @example
 * // Generate timestamps for chronological event history (oldest to newest)
 * generateTimestamp((totalEvents - i) * TIME_CONSTANTS.DAY) // where i starts from 0
 */
export function generateTimestamp(offsetMs = 0) {
  return new Date(Date.now() - offsetMs).toISOString();
}