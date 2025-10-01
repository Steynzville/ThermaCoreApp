// Enhanced API fetch utility with 401 handling, toast notifications, and improved error/redirect handling
import { toast } from 'sonner';

// Global redirect guard to prevent multiple simultaneous redirects
let isRedirecting = false;

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
  
  // Retry logic wrapper with per-attempt timeout
  const attemptFetch = async (attemptsLeft, retryCount = 0) => {
    // Create new controller and timeout for each attempt
    const controller = new AbortController();
    const timeout = fetchOptions.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
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
        
        // Enhanced redirect handling with guard to prevent multiple simultaneous redirects
        if (optionsRedirect && !isRedirecting && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/auth')) {
          isRedirecting = true;
          
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
          
          // Reset redirect guard after a delay
          setTimeout(() => { isRedirecting = false; }, 1000);
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
      
      // Handle 429 Too Many Requests with retry
      if (response.status === 429 && attemptsLeft > 0) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * Math.pow(2, retryCount);
        if (optionsToast) {
          toast.warning(`Rate limited. Retrying in ${delay / 1000} seconds...`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptFetch(attemptsLeft - 1, retryCount + 1);
      }
      
      // Handle 500+ Server Errors with retry and exponential backoff
      if (response.status >= 500 && attemptsLeft > 0) {
        const delay = retryDelay * Math.pow(2, retryCount);
        if (optionsToast) {
          toast.warning(`Server error. Retrying in ${delay / 1000} seconds... (${attemptsLeft} attempts left)`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptFetch(attemptsLeft - 1, retryCount + 1);
      }
      
      // Handle other error status codes (4xx errors should not retry)
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
      
      // Handle timeout errors
      if (error.name === 'AbortError') {
        if (attemptsLeft > 0) {
          const delay = retryDelay * Math.pow(2, retryCount);
          if (optionsToast) {
            toast.warning(`Request timeout. Retrying in ${delay / 1000} seconds... (${attemptsLeft} attempts left)`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptFetch(attemptsLeft - 1, retryCount + 1);
        }
        
        const timeoutMessage = 'Request timeout. Please try again.';
        if (optionsToast) {
          toast.error(timeoutMessage);
        }
        throw new Error(timeoutMessage);
      }
      
      // Network errors with retry logic and exponential backoff
      if ((error.message.includes('fetch') || error.message.includes('Failed to fetch') || 
           error.message.includes('NetworkError') || error.message.includes('Network request failed')) 
          && attemptsLeft > 0) {
        const delay = retryDelay * Math.pow(2, retryCount);
        if (optionsToast) {
          toast.warning(`Network error. Retrying in ${delay / 1000} seconds... (${attemptsLeft} attempts left)`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptFetch(attemptsLeft - 1, retryCount + 1);
      }
      
      // Re-throw other errors (no retry for non-network errors)
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