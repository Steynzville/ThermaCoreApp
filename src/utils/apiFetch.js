// PR1a: Enhanced API fetch utility with 401 handling and toast notifications
import { toast } from 'sonner';

/**
 * Enhanced fetch wrapper with automatic token handling and error responses
 * 
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {boolean} showToastOnError - Show toast notification on error (default: true)
 * @returns {Promise<Response>} - Fetch response
 */
export const apiFetch = async (url, options = {}, showToastOnError = true) => {
  // Get token from localStorage
  const token = localStorage.getItem('token');
  
  // Default headers
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  // Add authorization header if token exists
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  // Merge headers
  const headers = {
    ...defaultHeaders,
    ...options.headers,
  };
  
  // Add timeout support
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      if (showToastOnError) {
        toast.error('Session expired. Please log in again.');
      }
      
      // Clear stored token
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      
      throw new Error('Unauthorized');
    }
    
    // Handle other error status codes
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // Unable to parse error response, use default message
      }
      
      if (showToastOnError) {
        toast.error(errorMessage);
      }
      
      throw new Error(errorMessage);
    }
    
    return response;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      const timeoutMessage = 'Request timeout. Please try again.';
      if (showToastOnError) {
        toast.error(timeoutMessage);
      }
      throw new Error(timeoutMessage);
    }
    
    // Re-throw other errors
    throw error;
  }
};

/**
 * Convenience method for GET requests
 */
export const apiGet = (url, options = {}) => {
  return apiFetch(url, { ...options, method: 'GET' });
};

/**
 * Convenience method for POST requests
 */
export const apiPost = (url, data, options = {}) => {
  return apiFetch(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Convenience method for PUT requests
 */
export const apiPut = (url, data, options = {}) => {
  return apiFetch(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * Convenience method for DELETE requests
 */
export const apiDelete = (url, options = {}) => {
  return apiFetch(url, { ...options, method: 'DELETE' });
};

export default apiFetch;