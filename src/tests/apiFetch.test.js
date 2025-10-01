import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch } from '../utils/apiFetch';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

describe('apiFetch network error retry logic', () => {
  beforeEach(() => {
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should retry on actual network errors (TypeError from fetch)', async () => {
    // Simulate a network error that would come from fetch
    const networkError = new TypeError('Failed to fetch');
    
    let attempts = 0;
    global.fetch = vi.fn(() => {
      attempts++;
      if (attempts < 2) {
        return Promise.reject(networkError);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'success' }),
      });
    });

    const response = await apiFetch('/api/test', { 
      retries: 2,
      retryDelay: 10,
      showToastOnError: false 
    });

    expect(attempts).toBe(2);
    expect(response.ok).toBe(true);
  });

  it('should NOT retry on JSON parsing errors', async () => {
    const jsonError = new TypeError('Unexpected token in JSON');
    
    let attempts = 0;
    global.fetch = vi.fn(() => {
      attempts++;
      return Promise.reject(jsonError);
    });

    await expect(
      apiFetch('/api/test', { 
        retries: 2,
        retryDelay: 10,
        showToastOnError: false 
      })
    ).rejects.toThrow('Unexpected token in JSON');

    // Should only attempt once, not retry
    expect(attempts).toBe(1);
  });

  it('should NOT retry on programming errors (undefined)', async () => {
    const programmingError = new TypeError('Cannot read property of undefined');
    
    let attempts = 0;
    global.fetch = vi.fn(() => {
      attempts++;
      return Promise.reject(programmingError);
    });

    await expect(
      apiFetch('/api/test', { 
        retries: 2,
        retryDelay: 10,
        showToastOnError: false 
      })
    ).rejects.toThrow('Cannot read property of undefined');

    // Should only attempt once, not retry
    expect(attempts).toBe(1);
  });

  it('should NOT retry on null reference errors', async () => {
    const nullError = new TypeError('Cannot read property of null');
    
    let attempts = 0;
    global.fetch = vi.fn(() => {
      attempts++;
      return Promise.reject(nullError);
    });

    await expect(
      apiFetch('/api/test', { 
        retries: 2,
        retryDelay: 10,
        showToastOnError: false 
      })
    ).rejects.toThrow('Cannot read property of null');

    // Should only attempt once, not retry
    expect(attempts).toBe(1);
  });

  it('should NOT retry on function errors', async () => {
    const functionError = new TypeError('x is not a function');
    
    let attempts = 0;
    global.fetch = vi.fn(() => {
      attempts++;
      return Promise.reject(functionError);
    });

    await expect(
      apiFetch('/api/test', { 
        retries: 2,
        retryDelay: 10,
        showToastOnError: false 
      })
    ).rejects.toThrow('x is not a function');

    // Should only attempt once, not retry
    expect(attempts).toBe(1);
  });

  it('should retry on network connection errors (cross-browser)', async () => {
    // Test various network error messages from different browsers
    const networkErrors = [
      new TypeError('Network request failed'), // React Native
      new TypeError('Failed to fetch'), // Chrome/Firefox
      new TypeError('NetworkError when attempting to fetch resource'), // Safari
      new TypeError('Load failed'), // Safari
    ];

    for (const error of networkErrors) {
      let attempts = 0;
      global.fetch = vi.fn(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject(error);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'success' }),
        });
      });

      const response = await apiFetch('/api/test', { 
        retries: 2,
        retryDelay: 10,
        showToastOnError: false 
      });

      expect(attempts).toBe(2);
      expect(response.ok).toBe(true);
    }
  });

  it('should handle AbortError without retry', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    
    let attempts = 0;
    global.fetch = vi.fn(() => {
      attempts++;
      return Promise.reject(abortError);
    });

    await expect(
      apiFetch('/api/test', { 
        retries: 2,
        retryDelay: 10,
        showToastOnError: false 
      })
    ).rejects.toThrow('Request timeout');

    // Should only attempt once, not retry (AbortError is timeout)
    expect(attempts).toBe(1);
  });

  it('should retry server errors (500+)', async () => {
    let attempts = 0;
    global.fetch = vi.fn(() => {
      attempts++;
      if (attempts < 2) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: 'Server error' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'success' }),
      });
    });

    const response = await apiFetch('/api/test', { 
      retries: 2,
      retryDelay: 10,
      showToastOnError: false 
    });

    expect(attempts).toBe(2);
    expect(response.ok).toBe(true);
  });
});
