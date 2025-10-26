/**
 * Authentication Test Fixtures
 *
 * Provides mock authentication data and utilities for testing:
 * - User objects with different roles
 * - Authentication state configurations
 * - Token and session data
 * - Login/logout scenarios
 */

import { vi } from "vitest";

/**
 * Generate mock user object
 */
export function createMockUser(overrides = {}) {
  const defaults = {
    id: "user-123",
    username: "testuser",
    email: "testuser@example.com",
    role: "admin",
    firstName: "Test",
    lastName: "User",
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    permissions: ["read", "write", "delete"],
    tenant: "tenant-1",
  };

  return { ...defaults, ...overrides };
}

/**
 * Generate mock authentication context value
 */
export function createMockAuthContext(overrides = {}) {
  const defaults = {
    user: createMockUser(),
    isAuthenticated: true,
    isLoading: false,
    isLoggingOut: false,
    login: vi.fn().mockResolvedValue({ success: true }),
    logout: vi.fn().mockResolvedValue({ success: true }),
    updateUser: vi.fn(),
    checkAuth: vi.fn().mockResolvedValue(true),
  };

  return { ...defaults, ...overrides };
}

/**
 * Generate mock auth token
 */
export function createMockAuthToken(overrides = {}) {
  const defaults = {
    access_token: "mock-access-token-123456",
    refresh_token: "mock-refresh-token-123456",
    token_type: "Bearer",
    expires_in: 3600,
    issued_at: Date.now(),
  };

  return { ...defaults, ...overrides };
}

/**
 * Generate mock login response
 */
export function createMockLoginResponse(success = true, overrides = {}) {
  if (success) {
    return {
      success: true,
      user: createMockUser(),
      token: createMockAuthToken(),
      ...overrides,
    };
  }

  return {
    success: false,
    error: "Invalid credentials",
    message: "Username or password is incorrect",
    ...overrides,
  };
}

/**
 * Generate mock logout response
 */
export function createMockLogoutResponse(success = true) {
  return {
    success,
    message: success ? "Logged out successfully" : "Logout failed",
  };
}

/**
 * Fixture: Admin user context
 */
export const adminUserContextFixture = createMockAuthContext({
  user: createMockUser({ role: "admin", username: "admin" }),
  isAuthenticated: true,
});

/**
 * Fixture: Regular user context
 */
export const regularUserContextFixture = createMockAuthContext({
  user: createMockUser({ role: "user", username: "regularuser" }),
  isAuthenticated: true,
});

/**
 * Fixture: Unauthenticated context
 */
export const unauthenticatedContextFixture = createMockAuthContext({
  user: null,
  isAuthenticated: false,
});

/**
 * Fixture: Loading authentication context
 */
export const loadingAuthContextFixture = createMockAuthContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
});

/**
 * Fixture: Logging out context
 */
export const loggingOutContextFixture = createMockAuthContext({
  user: createMockUser(),
  isAuthenticated: true,
  isLoggingOut: true,
});

export default {
  createMockUser,
  createMockAuthContext,
  createMockAuthToken,
  createMockLoginResponse,
  createMockLogoutResponse,
  adminUserContextFixture,
  regularUserContextFixture,
  unauthenticatedContextFixture,
  loadingAuthContextFixture,
  loggingOutContextFixture,
};
