/**
 * Tests for AdminPanel Component
 *
 * Coverage includes:
 * - Tab rendering (Users, Password Management, Settings)
 * - Password reset functionality
 * - Password visibility toggle
 * - Password validation (length, matching)
 * - User management
 * - Settings management
 */

import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { afterAll, vi, beforeEach, describe, it, expect } from "vitest";

import AdminPanel from "../components/AdminPanel";
import * as AuthContext from "../context/AuthContext.jsx";
import { SettingsProvider } from "../context/SettingsContext.jsx";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock ThemeContext
vi.mock("../context/ThemeContext.jsx", () => ({
  ThemeProvider: ({ children }) => <>{children}</>,
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

vi.mock("../context/ThemeContext", () => ({
  ThemeProvider: ({ children }) => <>{children}</>,
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

// Mock PageHeader
vi.mock("../components/PageHeader", () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

// Mock UserApprovalPanel
vi.mock("../components/UserApprovalPanel", () => ({
  default: () => <div data-testid="user-approval-panel">User Approvals</div>,
}));

// Mock Button
vi.mock("../components/ui/button", () => ({
  Button: ({ children, onClick, className }) => (
    <button data-testid="button" className={className} onClick={onClick}>
      {children}
    </button>
  ),
}));

// Mock Card components
vi.mock("../components/ui/card", () => ({
  Card: ({ children, className }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}));

// Mock lucide-react icons with click handlers
vi.mock("lucide-react", () => ({
  Database: () => <span data-testid="icon-database">Database</span>,
  Users: () => <span data-testid="icon-users">Users</span>,
  Shield: () => <span data-testid="icon-shield">Shield</span>,
  Settings: () => <span data-testid="icon-settings">Settings</span>,
  Plus: () => <span data-testid="icon-plus">Plus</span>,
  Edit: () => <span data-testid="icon-edit">Edit</span>,
  Trash2: () => <span data-testid="icon-trash">Trash</span>,
  Key: () => <span data-testid="icon-key">Key</span>,
  Lock: () => <span data-testid="icon-lock">Lock</span>,
  Eye: ({ onClick, ...props }) => (
    <button 
      data-testid="eye-icon" 
      onClick={onClick} 
      aria-label="Show password"
      {...props}
    >
      Eye
    </button>
  ),
  EyeOff: ({ onClick, ...props }) => (
    <button 
      data-testid="eye-off-icon" 
      onClick={onClick} 
      aria-label="Hide password"
      {...props}
    >
      EyeOff
    </button>
  ),
  UserCheck: () => <span data-testid="icon-user-check">UserCheck</span>,
}));

// Mock apiFetch
vi.mock("../utils/apiFetch", () => ({
  apiGet: vi.fn(() => Promise.resolve({ data: [] })),
  apiPost: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })),
  apiPut: vi.fn(() => Promise.resolve({ data: {} })),
  apiDelete: vi.fn(() => Promise.resolve({ data: {} })),
}));

// Mock usersAPI
vi.mock("../services/usersAPI", () => ({
  getAllUsers: vi.fn(() =>
    Promise.resolve({
      data: [
        {
          id: 1,
          username: "john_doe",
          email: "john@thermacore.com",
          first_name: "John",
          last_name: "Doe",
          role: { name: "admin" },
          is_active: true,
        },
        {
          id: 2,
          username: "jane_smith",
          email: "jane@thermacore.com",
          first_name: "Jane",
          last_name: "Smith",
          role: { name: "operator" },
          is_active: true,
        },
      ],
      page: 1,
      per_page: 100,
      total: 2,
    })
  ),
  deleteUser: vi.fn(() => Promise.resolve({ ok: true, status: 204 })),
}));

const mockUser = {
  id: 1,
  username: "admin",
  role: "admin",
  email: "admin@thermacore.com",
  firstName: "Admin",
  lastName: "User",
};

const originalLocalStorage = window.localStorage;

// Create a proper storage mock
const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => {
      if (key === "thermacore_user") return JSON.stringify(mockUser);
      if (key === "thermacore_role") return "admin";
      if (key === "thermacore_token") return "fake-token";
      if (key === "thermacore_settings" || key === "thermacore-settings") {
        return JSON.stringify({
          soundEnabled: true,
          volume: 0.35,
          refreshInterval: 5000,
          temperatureUnit: "celsius",
          theme: "dark",
        });
      }
      return key in store ? store[key] : null;
    },
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
};

const renderWithProviders = (component) => {
  // Mock localStorage
  const storageMock = createStorageMock();
  Object.defineProperty(window, "localStorage", {
    value: storageMock,
    writable: true,
    configurable: true,
  });

  // Mock useAuth - use spyOn to ensure it's properly mocked
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({
    user: mockUser,
    userRole: "admin",
    isAuthenticated: true,
    isLoading: false,
    backendRole: "admin",
  });

  // Mock window.confirm for delete operations
  window.confirm = vi.fn(() => true);

  return render(
    <SettingsProvider>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </SettingsProvider>
  );
};

describe("AdminPanel Component", () => {
  afterAll(() => {
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    
    // Reset useAuth mock before each test
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: mockUser,
      userRole: "admin",
      isAuthenticated: true,
      isLoading: false,
      backendRole: "admin",
    });
  });

  it("should render all three tabs: Users, Password Management, and Settings", async () => {
    renderWithProviders(<AdminPanel />);

    await waitFor(() => {
      const usersElements = screen.getAllByText("Users");
      expect(usersElements.length).toBeGreaterThan(0);
      
      const passwordElements = screen.getAllByText("Password Management");
      expect(passwordElements.length).toBeGreaterThan(0);
      
      const settingsElements = screen.getAllByText("Settings");
      expect(settingsElements.length).toBeGreaterThan(0);
    });
  });

  it("should display Password Management tab when clicked", async () => {
    renderWithProviders(<AdminPanel />);

    const passwordElements = screen.getAllByText("Password Management");
    expect(passwordElements.length).toBeGreaterThan(0);
    const passwordTab = passwordElements[0];
    fireEvent.click(passwordTab);

    await waitFor(() => {
      const changePasswordElements = screen.getAllByText("Change My Password");
      expect(changePasswordElements.length).toBeGreaterThan(0);
    });
  });

  it("should open password reset modal when 'Change My Password' is clicked", async () => {
    renderWithProviders(<AdminPanel />);

    const passwordElements = screen.getAllByText("Password Management");
    expect(passwordElements.length).toBeGreaterThan(0);
    const passwordTab = passwordElements[0];
    fireEvent.click(passwordTab);

    await waitFor(() => {
      const changePasswordElements = screen.getAllByText("Change My Password");
      expect(changePasswordElements.length).toBeGreaterThan(0);
      const changePasswordButton = changePasswordElements[0];
      fireEvent.click(changePasswordButton);
    });

    await waitFor(() => {
      const modals = screen.getAllByTestId("password-reset-modal");
      expect(modals.length).toBeGreaterThan(0);
    });
  });

  it("should show password visibility toggle buttons", async () => {
    renderWithProviders(<AdminPanel />);

    const passwordElements = screen.getAllByText("Password Management");
    expect(passwordElements.length).toBeGreaterThan(0);
    const passwordTab = passwordElements[0];
    fireEvent.click(passwordTab);

    await waitFor(() => {
      const changePasswordElements = screen.getAllByText("Change My Password");
      expect(changePasswordElements.length).toBeGreaterThan(0);
      const changePasswordButton = changePasswordElements[0];
      fireEvent.click(changePasswordButton);
    });

    await waitFor(() => {
      const modals = screen.getAllByTestId("password-reset-modal");
      expect(modals.length).toBeGreaterThan(0);
    });

    // Look for the Eye/EyeOff icons which indicate toggle buttons
    // Use getAllByTestId to find the eye icons
    const eyeIcons = screen.getAllByTestId("eye-icon");
    const eyeOffIcons = screen.getAllByTestId("eye-off-icon");
    // There should be at least 2 toggle buttons (new password and confirm password)
    // They could be either Eye or EyeOff depending on state
    expect(eyeIcons.length + eyeOffIcons.length).toBeGreaterThanOrEqual(2);
  });

  it("should validate password matching", async () => {
    renderWithProviders(<AdminPanel />);

    const passwordElements = screen.getAllByText("Password Management");
    expect(passwordElements.length).toBeGreaterThan(0);
    const passwordTab = passwordElements[0];
    fireEvent.click(passwordTab);

    await waitFor(() => {
      const changePasswordElements = screen.getAllByText("Change My Password");
      expect(changePasswordElements.length).toBeGreaterThan(0);
      const changePasswordButton = changePasswordElements[0];
      fireEvent.click(changePasswordButton);
    });

    await waitFor(() => {
      const newPasswordInputs = screen.getAllByPlaceholderText("Enter new password");
      const confirmPasswordInputs = screen.getAllByPlaceholderText("Confirm new password");
      expect(newPasswordInputs.length).toBeGreaterThan(0);
      expect(confirmPasswordInputs.length).toBeGreaterThan(0);
      
      fireEvent.change(newPasswordInputs[0], { target: { value: "password123" } });
      fireEvent.change(confirmPasswordInputs[0], { target: { value: "password456" } });
    });

    await waitFor(() => {
      const errorElements = screen.getAllByText(/Passwords do not match/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it("should validate minimum password length", async () => {
    renderWithProviders(<AdminPanel />);

    const passwordElements = screen.getAllByText("Password Management");
    expect(passwordElements.length).toBeGreaterThan(0);
    const passwordTab = passwordElements[0];
    fireEvent.click(passwordTab);

    await waitFor(() => {
      const changePasswordElements = screen.getAllByText("Change My Password");
      expect(changePasswordElements.length).toBeGreaterThan(0);
      const changePasswordButton = changePasswordElements[0];
      fireEvent.click(changePasswordButton);
    });

    await waitFor(() => {
      const newPasswordInputs = screen.getAllByPlaceholderText("Enter new password");
      expect(newPasswordInputs.length).toBeGreaterThan(0);
      
      fireEvent.change(newPasswordInputs[0], { target: { value: "12345" } });
    });

    await waitFor(() => {
      const errorElements = screen.getAllByText(/Password must be at least 6 characters long/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it("should toggle password visibility in password reset modal", async () => {
    renderWithProviders(<AdminPanel />);

    const passwordElements = screen.getAllByText("Password Management");
    expect(passwordElements.length).toBeGreaterThan(0);
    const passwordTab = passwordElements[0];
    fireEvent.click(passwordTab);

    await waitFor(() => {
      const changePasswordElements = screen.getAllByText("Change My Password");
      expect(changePasswordElements.length).toBeGreaterThan(0);
      const changePasswordButton = changePasswordElements[0];
      fireEvent.click(changePasswordButton);
    });

    await waitFor(() => {
      const modals = screen.getAllByTestId("password-reset-modal");
      expect(modals.length).toBeGreaterThan(0);
    });

    const newPasswordInputs = await screen.findAllByPlaceholderText("Enter new password");
    expect(newPasswordInputs.length).toBeGreaterThan(0);
    expect(newPasswordInputs[0]).toHaveAttribute("type", "password");

    // Find toggle button for the new password field using testid
    const toggleButtons = screen.getAllByTestId(/eye-icon|eye-off-icon/);
    expect(toggleButtons.length).toBeGreaterThan(0);
    
    // Click the first toggle button (should be for new password)
    fireEvent.click(toggleButtons[0]);
    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText("Enter new password");
      expect(inputs[0]).toHaveAttribute("type", "text");
    });
    
    fireEvent.click(toggleButtons[0]);
    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText("Enter new password");
      expect(inputs[0]).toHaveAttribute("type", "password");
    });
  });

  it("should show Users tab content by default", async () => {
    renderWithProviders(<AdminPanel />);

    await waitFor(() => {
      const userManagementElements = screen.getAllByText("User Management");
      expect(userManagementElements.length).toBeGreaterThan(0);
      
      const addUserElements = screen.getAllByText("Add User");
      expect(addUserElements.length).toBeGreaterThan(0);
    });
  });

  it("should render system stats", async () => {
    renderWithProviders(<AdminPanel />);

    await waitFor(() => {
      const statElements = screen.getAllByText(/Total Devices|Active Users|System Uptime|Data Points/i);
      expect(statElements.length).toBeGreaterThan(0);
    });
  });
});
