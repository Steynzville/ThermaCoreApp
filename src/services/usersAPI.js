/**
 * Users API Service
 * Handles all user-related API calls for the admin panel
 */

import { apiDelete, apiGet } from '../utils/apiFetch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://thermacoreapp.onrender.com';

/**
 * Fetch all users from the backend API
 * @param {Object} options - Optional query parameters for filtering and pagination
 * @param {number} [options.page=1] - Page number for pagination
 * @param {number} [options.per_page=100] - Number of results per page (max 100)
 * @param {string} [options.role] - Filter by role name (e.g., 'admin', 'operator', 'viewer')
 * @param {boolean} [options.active] - Filter by active status (true/false)
 * @param {string} [options.search] - Search query for username, email, first_name, or last_name
 * @returns {Promise<Object>} Response with users data including pagination info
 */
export const getAllUsers = async (options = {}) => {
  const { page = 1, per_page = 100, role, active, search } = options;
  
  // Build query string
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('per_page', per_page);
  
  if (role) params.append('role', role);
  if (active !== undefined) params.append('active', active);
  if (search) params.append('search', search);
  
  const response = await apiGet(
    `${API_BASE_URL}/api/v1/users?${params.toString()}`,
    {
      showToastOnError: true,
      retries: 2,
      retryDelay: 1000,
    }
  );
  
  const result = await response.json();
  return result;
};

/**
 * Delete a user by ID
 * @param {number} userId - The ID of the user to delete
 * @returns {Promise<Response>} Response from the API
 */
export const deleteUser = async (userId) => {
  const response = await apiDelete(
    `${API_BASE_URL}/api/v1/users/${userId}`,
    {
      showToastOnError: true,
      retries: 1,
      retryDelay: 1000,
    }
  );
  
  return response;
};
