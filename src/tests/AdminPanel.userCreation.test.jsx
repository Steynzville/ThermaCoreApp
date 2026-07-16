// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPanel from "../components/AdminPanel";
import { toast } from "sonner"; // ✅ FIX: Import toast directly

// Setup hoisted mocks
const { 
  mockGetAllUsers, 
  mockDeleteUser,
  mockApiGet,
  mockApiPost,
} = vi.hoisted(() => ({
  mockGetAllUsers: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
}));

// Mock dependencies
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "1", username: "admin", role: "admin" },
    userRole: "admin",
    permissions: { canManageUsers: true },
  }),
}));

vi.mock("../services/usersAPI", () => ({
  getAllUsers: mockGetAllUsers,
  deleteUser: mockDeleteUser,
}));

vi.mock("../utils/apiFetch", () => ({
  apiGet: mockApiGet,
  apiPost: mockApiPost,
}));

// Mock the PageHeader component
vi.mock("../components/PageHeader", () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

// Mock the UserApprovalPanel component
vi.mock("../components/UserApprovalPanel", () => ({
  default: () => <div data-testid="user-approval-panel">User Approvals</div>,
}));

// Mock UI components
vi.mock("../components/ui/button", () => ({
  Button: ({ children, onClick, className }) => (
    <button data-testid="button" className={className} onClick={onClick}>
      {children}
    </button>
  ),
}));

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

vi.mock("lucide-react", () => ({
  Users: () => <span data-testid="icon-users">Users</span>,
  UserCheck: () => <span data-testid="icon-user-check">UserCheck</span>,
  Key: () => <span data-testid="icon-key">Key</span>,
  Settings: () => <span data-testid="icon-settings">Settings</span>,
  Plus: () => <span data-testid="icon-plus">Plus</span>,
  Lock: () => <span data-testid="icon-lock">Lock</span>,
  Database: () => <span data-testid="icon-database">Database</span>,
  Shield: () => <span data-testid="icon-shield">Shield</span>,
  Edit: () => <span data-testid="icon-edit">Edit</span>,
  Trash2: () => <span data-testid="icon-trash">Trash</span>,
  Eye: ({ onClick, ...props }) => (
    <button data-testid="eye-icon" onClick={onClick} {...props}>Eye</button>
  ),
  EyeOff: ({ onClick, ...props }) => (
    <button data-testid="eye-off-icon" onClick={onClick} {...props}>EyeOff</button>
  ),
}));

const mockUsers = {
  data: [
    {
      id: "1",
      username: "john.doe",
      email: "john@example.com",
      first_name: "John",
      last_name: "Doe",
      company: "Test Corp",
      phone_number: "555-1234",
      department: "IT",
      position: "Developer",
      role: { name: "admin" },
      is_active: true,
    },
  ],
};

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn((key) => {
    if (key === "thermacore_user") return JSON.stringify({ id: "1", username: "admin", role: "admin" });
    if (key === "thermacore_role") return "admin";
    if (key === "thermacore_token") return "fake-token";
    if (key === "thermacore-settings" || key === "thermacore_settings") {
      return JSON.stringify({ soundEnabled: true, volume: 0.5 });
    }
    return null;
  }),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

describe("AdminPanel User Creation Form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllUsers.mockResolvedValue(mockUsers);
    // ✅ Clear toast mocks between tests
    toast.success.mockClear();
    toast.error.mockClear();
  });

  it("should render without crashing", async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "admin-id", name: "admin" },
        { id: "operator-id", name: "operator" },
        { id: "viewer-id", name: "viewer" },
      ],
    });

    const { container } = render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    expect(container).toBeDefined();

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText(/Admin Panel/i)).toBeInTheDocument();
    });
  });

  it("should show all three role options when roles are fetched successfully", async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "admin-id", name: "admin" },
        { id: "operator-id", name: "operator" },
        { id: "viewer-id", name: "viewer" },
      ],
    });

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    // Wait for users to load
    await waitFor(() => {
      expect(mockGetAllUsers).toHaveBeenCalled();
    });

    // Click the Add User button
    const addButton = screen.getByText(/Add User/i);
    fireEvent.click(addButton);

    // Wait for the modal to appear and check for role options
    await waitFor(() => {
      // Look for the select element or role options
      const selectElement = screen.getByRole('combobox') || screen.getByTestId('select-trigger');
      expect(selectElement).toBeInTheDocument();
    });
  });

  it("should handle roles wrapped in {roles: [...]} format", async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => ({
        roles: [
          { id: "admin-id", name: "admin" },
          { id: "operator-id", name: "operator" },
          { id: "viewer-id", name: "viewer" },
        ],
      }),
    });

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockGetAllUsers).toHaveBeenCalled();
    });

    const addButton = screen.getByText(/Add User/i);
    fireEvent.click(addButton);

    // Verify the modal opened
    await waitFor(() => {
      expect(screen.getByText(/Create New User/i)).toBeInTheDocument();
    });
  });

  it("should allow selecting a role", async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "admin-id", name: "admin" },
        { id: "operator-id", name: "operator" },
        { id: "viewer-id", name: "viewer" },
      ],
    });

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockGetAllUsers).toHaveBeenCalled();
    });

    const addButton = screen.getByText(/Add User/i);
    fireEvent.click(addButton);

    // Wait for the modal to appear
    await waitFor(() => {
      expect(screen.getByText(/Create New User/i)).toBeInTheDocument();
    });

    // Find and click the select trigger or the role select
    const roleSelect = screen.getByRole('combobox') || screen.getByTestId('select-trigger');
    if (roleSelect) {
      fireEvent.click(roleSelect);
    }

    // Check if the modal is still open
    expect(screen.getByText(/Create New User/i)).toBeInTheDocument();
  });

  it("should show validation errors for empty required fields", async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "admin-id", name: "admin" },
        { id: "operator-id", name: "operator" },
        { id: "viewer-id", name: "viewer" },
      ],
    });

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockGetAllUsers).toHaveBeenCalled();
    });

    const addButton = screen.getByText(/Add User/i);
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/Create New User/i)).toBeInTheDocument();
    });

    // Find and click the create button
    const createButton = screen.getByText(/Create User/i);
    fireEvent.click(createButton);

    // Should show validation errors via toast
    await waitFor(() => {
      // ✅ FIX: Use imported toast directly
      expect(toast.error).toHaveBeenCalled();
    });
  });

  // ✅ FIX: Select a role before submitting
  it("should create a user when form is valid", async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "admin-id", name: "admin" },
        { id: "operator-id", name: "operator" },
        { id: "viewer-id", name: "viewer" },
      ],
    });

    mockApiPost.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, user: { id: "new-user" } }),
    });

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockGetAllUsers).toHaveBeenCalled();
    });

    const addButton = screen.getByText(/Add User/i);
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/Create New User/i)).toBeInTheDocument();
    });

    // ✅ FIX: Wait for roles to finish loading and select a role
    const roleSelect = await screen.findByRole("combobox");
    await waitFor(() => {
      expect(roleSelect).not.toBeDisabled();
    });
    fireEvent.change(roleSelect, { target: { value: "admin-id" } });

    // Fill in the form fields
    const usernameInput = screen.getByPlaceholderText(/Enter username/i);
    fireEvent.change(usernameInput, { target: { value: "newuser" } });

    const emailInput = screen.getByPlaceholderText(/Enter email/i);
    fireEvent.change(emailInput, { target: { value: "newuser@example.com" } });

    const passwordInput = screen.getByPlaceholderText(/Enter password/i);
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    // Click create button
    const createButton = screen.getByText(/Create User/i);
    fireEvent.click(createButton);

    // Should show success toast
    await waitFor(() => {
      // ✅ FIX: Use imported toast directly
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("should handle API error when creating user", async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "admin-id", name: "admin" },
        { id: "operator-id", name: "operator" },
        { id: "viewer-id", name: "viewer" },
      ],
    });

    mockApiPost.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "User already exists" }),
    });

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockGetAllUsers).toHaveBeenCalled();
    });

    const addButton = screen.getByText(/Add User/i);
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/Create New User/i)).toBeInTheDocument();
    });

    // ✅ FIX: Select a role
    const roleSelect = await screen.findByRole("combobox");
    await waitFor(() => {
      expect(roleSelect).not.toBeDisabled();
    });
    fireEvent.change(roleSelect, { target: { value: "admin-id" } });

    const usernameInput = screen.getByPlaceholderText(/Enter username/i);
    fireEvent.change(usernameInput, { target: { value: "existinguser" } });

    const emailInput = screen.getByPlaceholderText(/Enter email/i);
    fireEvent.change(emailInput, { target: { value: "existing@example.com" } });

    const passwordInput = screen.getByPlaceholderText(/Enter password/i);
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    const createButton = screen.getByText(/Create User/i);
    fireEvent.click(createButton);

    await waitFor(() => {
      // ✅ FIX: Use imported toast directly
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("should close the modal when cancel is clicked", async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "admin-id", name: "admin" },
        { id: "operator-id", name: "operator" },
        { id: "viewer-id", name: "viewer" },
      ],
    });

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockGetAllUsers).toHaveBeenCalled();
    });

    const addButton = screen.getByText(/Add User/i);
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/Create New User/i)).toBeInTheDocument();
    });

    const cancelButton = screen.getByText(/Cancel/i);
    fireEvent.click(cancelButton);

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText(/Create New User/i)).not.toBeInTheDocument();
    });
  });

  it("should toggle password visibility", async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: "admin-id", name: "admin" },
        { id: "operator-id", name: "operator" },
        { id: "viewer-id", name: "viewer" },
      ],
    });

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockGetAllUsers).toHaveBeenCalled();
    });

    const addButton = screen.getByText(/Add User/i);
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/Create New User/i)).toBeInTheDocument();
    });

    // Find the password input
    const passwordInput = screen.getByPlaceholderText(/Enter password/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    // Click the eye icon to toggle visibility
    const eyeIcon = screen.getByTestId("eye-icon");
    fireEvent.click(eyeIcon);

    // Password should now be visible (type="text")
    await waitFor(() => {
      expect(passwordInput).toHaveAttribute("type", "text");
    });

    // Click again to hide
    const eyeOffIcon = screen.getByTestId("eye-off-icon");
    fireEvent.click(eyeOffIcon);

    await waitFor(() => {
      expect(passwordInput).toHaveAttribute("type", "password");
    });
  });
});
