/**
 * Permission Helper Functions for RBAC
 *
 * This module provides a centralized way to check user permissions based on backend roles.
 * It bridges the frontend's role concept with the backend's granular
 * admin/client_admin/operator/viewer role system.
 *
 * Backend Role Definitions:
 * - admin: Full access (ThermaCore staff only, cross-tenant)
 * - client_admin: Access to all facilities/tenants under their assigned client
 * - operator: Remote control + assigned units (client power users)
 * - viewer: Read-only access (client read-only users)
 */

/**
 * Check if user can control units remotely (power, water production, settings)
 * @param {string} backendRole - Backend role
 * @returns {boolean} True if user can control units
 */
export const canControlUnits = (backendRole) => {
  return ["admin", "client_admin", "operator"].includes(backendRole);
};

/**
 * Check if user can view sales data and analytics
 * @param {string} backendRole - Backend role
 * @returns {boolean} True if user can view sales
 */
export const canViewSales = (backendRole) => {
  return ["admin", "client_admin"].includes(backendRole);
};

/**
 * Check if user can view all units (vs only assigned units)
 * @param {string} backendRole - Backend role
 * @returns {boolean} True if user can view all units
 */
export const canViewAllUnits = (backendRole) => {
  return ["admin", "client_admin"].includes(backendRole);
};

/**
 * Check if user can create, modify, or delete units
 * @param {string} backendRole - Backend role
 * @returns {boolean} True if user can manage units
 */
export const canManageUnits = (backendRole) => {
  return ["admin", "client_admin"].includes(backendRole);
};

/**
 * Check if user can create, modify, or delete users
 * @param {string} backendRole - Backend role
 * @returns {boolean} True if user can manage users
 */
export const canManageUsers = (backendRole) => {
  return ["admin", "client_admin"].includes(backendRole);
};

/**
 * Check if user can access admin panel
 * @param {string} backendRole - Backend role
 * @returns {boolean} True if user can access admin panel
 */
export const canAccessAdminPanel = (backendRole) => {
  return ["admin", "client_admin"].includes(backendRole);
};

/**
 * Check if user can view unit information
 * @param {string} backendRole - Backend role
 * @returns {boolean} True if user can view units
 */
export const canViewUnits = (backendRole) => {
  return ["admin", "client_admin", "operator", "viewer"].includes(backendRole);
};

/**
 * Check if user can view user information
 * @param {string} backendRole - Backend role
 * @returns {boolean} True if user can view users
 */
export const canViewUsers = (backendRole) => {
  return ["admin", "client_admin", "operator", "viewer"].includes(backendRole);
};

/**
 * Check if user has viewer-only access (read-only)
 * @param {string} backendRole - Backend role
 * @returns {boolean} True if user is a viewer
 */
export const isViewerOnly = (backendRole) => {
  return backendRole === "viewer";
};

/**
 * Check if user can view advanced analytics and SCADA analytics
 * @param {string} backendRole - Backend role
 * @returns {boolean} True if user can view analytics
 */
export const canViewAnalytics = (backendRole) => {
  return ["admin", "client_admin", "operator", "viewer"].includes(backendRole);
};

/**
 * Check if user can view protocol manager
 * @param {string} backendRole - Backend role
 * @returns {boolean} True if user can view protocols
 */
export const canViewProtocols = (backendRole) => {
  return ["admin", "client_admin"].includes(backendRole);
};

/**
 * Get all permissions for a given backend role
 * @param {string} backendRole - Backend role
 * @returns {Object} Object containing all permission flags
 */
export const getPermissions = (backendRole) => {
  return {
    canControlUnits: canControlUnits(backendRole),
    canViewSales: canViewSales(backendRole),
    canViewAllUnits: canViewAllUnits(backendRole),
    canManageUnits: canManageUnits(backendRole),
    canManageUsers: canManageUsers(backendRole),
    canAccessAdminPanel: canAccessAdminPanel(backendRole),
    canViewUnits: canViewUnits(backendRole),
    canViewUsers: canViewUsers(backendRole),
    isViewerOnly: isViewerOnly(backendRole),
    canViewAnalytics: canViewAnalytics(backendRole),
    canViewProtocols: canViewProtocols(backendRole),
  };
};

/**
 * Map backend role to frontend role for UI display / route checks
 * @param {string} backendRole - Backend role
 * @returns {string} Frontend role (admin, client_admin, or user)
 */
export const getFrontendRole = (backendRole) => {
  if (backendRole === "admin") return "admin";
  if (backendRole === "client_admin") return "client_admin";
  return "user";
};

/**
 * Get user-friendly role display name
 * @param {string} backendRole - Backend role
 * @returns {string} Display name for the role
 */
export const getRoleDisplayName = (backendRole) => {
  const roleNames = {
    admin: "Administrator",
    client_admin: "Client Admin",
    operator: "Operator",
    viewer: "Viewer",
  };
  return roleNames[backendRole] || backendRole;
};
