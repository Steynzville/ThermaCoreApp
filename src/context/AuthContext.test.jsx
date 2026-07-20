// src/context/AuthContext.test.jsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// ✅ Updated import for co-located test file
import { AuthProvider, useAuth } from "./AuthContext";
import * as authService from "../services/authService";
import * as permissions from "../utils/permissions";

// Mock external dependencies
vi.mock("../services/authService");
vi.mock("../utils/permissions");

// ---- storage mocks ----
function makeStorageMock() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
}

// ---- test consumer component ----
const TestConsumer = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="user">{auth.user ? auth.user.username : "none"}</div>
      <div data-testid="role">{auth.userRole || "none"}</div>
      <div data-testid="backendRole">{auth.backendRole || "none"}</div>
      <div data-testid="loading">{auth.isLoading ? "loading" : "loaded"}</div>
      <div data-testid="authed">{auth.isAuthenticated ? "yes" : "no"}</div>
      <div data-testid="loggingout">{auth.isLoggingOut ? "yes" : "no"}</div>
      <div data-testid="permissions">{auth.permissions ? JSON.stringify(auth.permissions) : "none"}</div>
      <button onClick={() => auth.login("u", "p", true)}>login-keep</button>
      <button onClick={() => auth.login("u", "p", false)}>login-session</button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
};

// ---- component to capture login result ----
const CaptureConsumer = ({ onResult }) => {
  const auth = useAuth();
  const handleLogin = async () => {
    const result = await auth.login("u", "p");
    onResult(result);
  };
  return <button onClick={handleLogin}>login-capture</button>;
};

describe("AuthContext", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: makeStorageMock(), writable: true });
    Object.defineProperty(window, "sessionStorage", { value: makeStorageMock(), writable: true });
    vi.clearAllMocks();
    
    // Default mock implementations
    permissions.getFrontendRole.mockImplementation((r) => (r === "admin" ? "admin" : "user"));
    permissions.getPermissions.mockImplementation((r) => ({ 
      role: r,
      canEdit: r === "admin",
      canView: true,
      canDelete: r === "admin",
    }));
  });

  // ... rest of tests remain exactly the same ...
  
  // [All existing test code stays the same]
});
