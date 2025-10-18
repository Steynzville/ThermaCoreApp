// Unit Service Module
// This service encapsulates all unit-related data operations
// Currently uses mock data but designed to be easily swappable with actual API calls

import { units as mockUnits } from "../data/mockUnits";
import {
  mockEventHistory,
  mockRecentActions,
  mockUnitDetails,
} from "../mockData";

/**
 * Get all units
 * @returns {Array} Array of unit objects
 */
export const getAllUnits = () => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/units`).then(response => response.json());
  return Promise.resolve(mockUnits);
};

/**
 * Get a specific unit by ID
 * @param {number|string} unitId - The unit ID
 * @returns {Object|null} Unit object or null if not found
 */
export const getUnitById = (unitId) => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/units/${unitId}`).then(response => response.json());
  const unit = mockUnits.find((u) => u.id === unitId);
  return Promise.resolve(unit || null);
};

/**
 * Get detailed information for a specific unit
 * @param {number|string} unitId - The unit ID
 * @returns {Object|null} Unit details object or null if not found
 */
export const getUnitDetails = (unitId) => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/units/${unitId}/details`).then(response => response.json());
  const details = mockUnitDetails[unitId];
  return Promise.resolve(details || null);
};

/**
 * Get alerts for a specific unit
 * @param {number|string} unitId - The unit ID
 * @returns {Array} Array of alert objects
 */
export const getUnitAlerts = (unitId) => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/units/${unitId}/alerts`).then(response => response.json());
  const details = mockUnitDetails[unitId];
  return Promise.resolve(details?.alerts || []);
};

/**
 * Get all alerts from all units
 * @returns {Array} Array of all alert objects
 */
export const getAllAlerts = () => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/alerts`).then(response => response.json());
  const allAlerts = Object.values(mockUnitDetails).flatMap(
    (details) => details.alerts || [],
  );
  return Promise.resolve(allAlerts);
};

/**
 * Search units by name or location
 * @param {string} query - Search query
 * @returns {Array} Array of matching unit objects
 */
export const searchUnits = (query) => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/units/search?q=${encodeURIComponent(query)}`).then(response => response.json());
  if (!query) return Promise.resolve([]);

  const filtered = mockUnits.filter(
    (unit) =>
      unit.name.toLowerCase().includes(query.toLowerCase()) ||
      unit.location.toLowerCase().includes(query.toLowerCase()),
  );
  return Promise.resolve(filtered);
};

/**
 * Update unit control settings
 * @param {number|string} unitId - The unit ID
 * @param {Object} controls - Control settings object
 * @returns {Object} Updated unit details
 */
export const updateUnitControls = (unitId, controls) => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/units/${unitId}/controls`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(controls)
  // }).then(response => response.json());

  // For now, update the mock data
  if (mockUnitDetails[unitId]) {
    mockUnitDetails[unitId].controls = {
      ...mockUnitDetails[unitId].controls,
      ...controls,
    };
  }
  return Promise.resolve(mockUnitDetails[unitId]);
};

/**
 * Get event history
 * @returns {Array} Array of event history objects
 */
export const getEventHistory = () => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/events/history`).then(response => response.json());
  return Promise.resolve(mockEventHistory);
};

/**
 * Get recent control actions
 * @returns {Array} Array of recent action objects
 */
export const getRecentActions = () => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/actions/recent`).then(response => response.json());
  return Promise.resolve(mockRecentActions);
};

/**
 * Get units with alarms (Critical status)
 * @returns {Array} Array of units with alarms
 */
export const getUnitsWithAlarms = () => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/units/alarms`).then(response => response.json());
  const unitsWithAlarms = mockUnits.filter((unit) => unit.hasAlarm);
  return Promise.resolve(unitsWithAlarms);
};

/**
 * Get units with alerts (Warning status)
 * @returns {Array} Array of units with alerts
 */
export const getUnitsWithAlerts = () => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/units/alerts`).then(response => response.json());
  const unitsWithAlerts = mockUnits.filter(
    (unit) => unit.alerts && unit.alerts.length > 0,
  );
  return Promise.resolve(unitsWithAlerts);
};

/**
 * Update unit name
 * @param {number|string} unitId - The unit ID
 * @param {string} newName - The new unit name
 * @returns {Object} Updated unit object
 */
export const updateUnitName = (unitId, newName) => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/units/${unitId}/name`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ name: newName })
  // }).then(response => response.json());

  // For now, update the mock data
  const unit = mockUnits.find((u) => u.id === unitId);
  if (unit) {
    unit.name = newName;
  }
  return Promise.resolve(unit);
};

/**
 * Update unit location
 * @param {number|string} unitId - The unit ID
 * @param {string} newLocation - The new unit location
 * @returns {Object} Updated unit object
 */
export const updateUnitLocation = (unitId, newLocation) => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/units/${unitId}/location`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ location: newLocation })
  // }).then(response => response.json());

  // For now, update the mock data
  const unit = mockUnits.find((u) => u.id === unitId);
  if (unit) {
    unit.location = newLocation;
  }
  return Promise.resolve(unit);
};

/**
 * Update unit GPS coordinates
 * @param {number|string} unitId - The unit ID
 * @param {string} newGPS - The new GPS coordinates
 * @returns {Object} Updated unit object
 */
export const updateUnitGPS = (unitId, newGPS) => {
  // In the future, this would be replaced with:
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  // return fetch(`${API_BASE_URL}/units/${unitId}/gps`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ gpsCoordinates: newGPS })
  // }).then(response => response.json());

  // For now, update the mock data
  const unit = mockUnits.find((u) => u.id === unitId);
  if (unit) {
    unit.gpsCoordinates = newGPS;
  }
  return Promise.resolve(unit);
};
