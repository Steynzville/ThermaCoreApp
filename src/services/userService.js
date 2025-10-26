// User Service Module
// This service handles admin user management operations

import { apiGet, apiPost } from "../utils/apiFetch";

/**
 * Get all pending users awaiting approval
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Pending users list
 */
export const getPendingUsers = async (params = {}) => {
  const { page = 1, per_page = 50 } = params;

  try {
    const result = await apiGet("/users/pending", {
      page,
      per_page,
    });

    return {
      success: true,
      data: result.data || [],
      pagination: {
        page: result.page || 1,
        per_page: result.per_page || 50,
        total: result.total || 0,
        pages: result.pages || 0,
        has_next: result.has_next || false,
        has_prev: result.has_prev || false,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to fetch pending users",
      data: [],
    };
  }
};

/**
 * Approve a pending user registration
 * @param {number} userId - User ID to approve
 * @param {number} roleId - Optional role ID to assign during approval
 * @returns {Promise<Object>} Approval result
 */
export const approveUser = async (userId, roleId = null) => {
  try {
    // First approve the user
    const approvalResult = await apiPost(`/users/${userId}/approve`, {});

    if (!approvalResult || !approvalResult.user) {
      throw new Error("Approval failed");
    }

    // If roleId is provided and different from current, update the role
    if (roleId && approvalResult.user.role?.id !== roleId) {
      try {
        // Update user role
        const updateResult = await apiPost(`/users/${userId}`, {
          role_id: roleId,
        });

        return {
          success: true,
          message: "User approved and role updated successfully",
          user: updateResult.user || approvalResult.user,
        };
      } catch (_roleError) {
        // Return success with approval but note role update failed
        return {
          success: true,
          message: "User approved successfully (role update pending)",
          user: approvalResult.user,
        };
      }
    }

    return {
      success: true,
      message: "User approved successfully",
      user: approvalResult.user,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to approve user",
    };
  }
};

/**
 * Reject a pending user registration
 * @param {number} userId - User ID to reject
 * @param {string} reason - Reason for rejection
 * @returns {Promise<Object>} Rejection result
 */
export const rejectUser = async (userId, reason = "") => {
  try {
    const result = await apiPost(`/users/${userId}/reject`, {
      reason: reason || "No reason provided",
    });

    return {
      success: true,
      message: "User registration rejected",
      user: result.user,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to reject user",
    };
  }
};

/**
 * Get all available roles
 * @returns {Promise<Object>} Roles list
 */
export const getRoles = async () => {
  try {
    const result = await apiGet("/roles");

    return {
      success: true,
      data: result.data || result || [],
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to fetch roles",
      data: [],
    };
  }
};
