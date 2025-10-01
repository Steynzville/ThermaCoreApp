// Enhanced API fetch utility with 401 handling, toast notifications, and improved error/redirect handling
import { toast } from 'sonner';

// Pre-convert network error patterns to lowercase for performance optimization
// This avoids repeated toLowerCase() calls during error checking
const NETWORK_ERROR_PATTERNS = [
  'failed to fetch',                                    // Chrome/Firefox
  'network request failed',                              // React Native
  'networkerror when attempting to fetch resource',      // Safari
  'load failed',                                         // Safari
  'network error',                                       // Generic network errors
  'fetch failed',                                        // Generic fetch failures
];

/**
 * Enhanced fetch wrapper with automatic token handling and error responses
 * 
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {boolean} showToastOnError - Show toast notification on error (default: true)
 * @param {boolean} redirectOn401 - Redirect to login on 401 (default: true)
 * @returns {Promise<Response>} - Fetch response
 */
export const apiFetch = async (url, options = {}, showToastOnError = true, redirectOn401 = true) => {
  // Extract custom options
  const { 
    showToastOnError: optionsToast = showToastOnError,
    redirectOn401: optionsRedirect = redirectOn401,
    retries = 0,
    retryDelay = 1000,
    ...fetchOptions 
  } = options;

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
    ...fetchOptions.headers,
  };
  
  // Add timeout support with better default
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), fetchOptions.timeout || 30000);
  
  // Retry logic wrapper
  const attemptFetch = async (attemptsLeft) => {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Handle 401 Unauthorized with improved redirect logic
      if (response.status === 401) {
        if (optionsToast) {
          toast.error('Session expired. Please log in again.');
        }
        
        // Clear stored tokens
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        
        // Enhanced redirect handling - check for login page and avoid redirect loops
        if (optionsRedirect && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/auth')) {
          // Store current location for post-login redirect
          const currentPath = window.location.pathname + window.location.search;
          if (currentPath !== '/login' && currentPath !== '/') {
            localStorage.setItem('redirectAfterLogin', currentPath);
          }
          
          // Use history API if available, fallback to location.href
          if (window.history && window.history.pushState) {
            window.history.pushState(null, '', '/login');
            // Dispatch popstate to trigger router updates
            window.dispatchEvent(new PopStateEvent('popstate'));
          } else {
            window.location.href = '/login';
          }
        }
        
        throw new Error('Unauthorized');
      }
      
      // Handle 403 Forbidden
      if (response.status === 403) {
        const forbiddenMessage = 'You do not have permission to perform this action.';
        if (optionsToast) {
          toast.error(forbiddenMessage);
        }
        throw new Error(forbiddenMessage);
      }
      
      // Handle 500 Server Error with retry logic
      if (response.status >= 500 && attemptsLeft > 0) {
        if (optionsToast) {
          toast.warning(`Server error. Retrying in ${retryDelay / 1000} seconds... (${attemptsLeft} attempts left)`);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attemptFetch(attemptsLeft - 1);
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
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (e) {
          // Unable to parse error response, use default message
        }
        
        if (optionsToast) {
          toast.error(errorMessage);
        }
        
        throw new Error(errorMessage);
      }
      
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        const timeoutMessage = 'Request timeout. Please try again.';
        if (optionsToast) {
          toast.error(timeoutMessage);
        }
        throw new Error(timeoutMessage);
      }
      
      // Network errors with retry logic
      // Detect actual network failures using a whitelist of known network error messages
      // This ensures retries only occur for genuine network failures, not programming errors
      // Safely convert error.message to string to handle edge cases where it might be undefined, null, or non-string
      const errorMessage = String(error.message || '').toLowerCase();
      const isNetworkError = error instanceof TypeError && 
        NETWORK_ERROR_PATTERNS.some(pattern => 
          errorMessage.includes(pattern)
        );
      
      if (isNetworkError && attemptsLeft > 0) {
        if (optionsToast) {
          toast.warning(`Network error. Retrying in ${retryDelay / 1000} seconds... (${attemptsLeft} attempts left)`);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attemptFetch(attemptsLeft - 1);
      }
      
      // Re-throw other errors
      throw error;
    }
  };

  return attemptFetch(retries);
};

/**
 * Convenience method for GET requests with enhanced options
 */
export const apiGet = (url, options = {}) => {
  return apiFetch(url, { ...options, method: 'GET' });
};

/**
 * Convenience method for POST requests with enhanced options
 */
export const apiPost = (url, data, options = {}) => {
  return apiFetch(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
};

/**
 * Convenience method for PUT requests with enhanced options
 */
export const apiPut = (url, data, options = {}) => {
  return apiFetch(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
};

/**
 * Convenience method for PATCH requests
 */
export const apiPatch = (url, data, options = {}) => {
  return apiFetch(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
};

/**
 * Convenience method for DELETE requests with enhanced options
 */
export const apiDelete = (url, options = {}) => {
  return apiFetch(url, { ...options, method: 'DELETE' });
};

/**
 * Convenience method for file uploads
 */
export const apiUpload = (url, formData, options = {}) => {
  // Remove Content-Type header for FormData to let browser set it with boundary
  const { headers = {}, ...restOptions } = options;
  const { 'Content-Type': _, ...headersWithoutContentType } = headers;
  
  return apiFetch(url, {
    ...restOptions,
    method: 'POST',
    headers: headersWithoutContentType,
    body: formData,
  });
};

/**
 * Enhanced method for JSON responses with built-in error handling
 */
export const apiGetJson = async (url, options = {}) => {
  const response = await apiGet(url, options);
  return await response.json();
};

export const apiPostJson = async (url, data, options = {}) => {
  const response = await apiPost(url, data, options);
  return await response.json();
};

export const apiPutJson = async (url, data, options = {}) => {
  const response = await apiPut(url, data, options);
  return await response.json();
};

export default apiFetch;