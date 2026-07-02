// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPanel from "../components/AdminPanel";

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

describe("AdminPanel User Creation Form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllUsers.mockResolvedValue(mockUsers);
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

    await waitFor(() => {
      expect(screen.getByText(/Add User/i)).toBeInTheDocument();
    }, { timeout: 3000 });
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

    await waitFor(() => {
      expect(mockGetAllUsers).toHaveBeenCalled();
    }, { timeout: 3000 });

    const addButton = screen.getByText(/Add User/i);
    fireEvent.click(addButton);

    await waitFor(() => {
      // Use within the form or more specific selector
      const roleOptions = screen.getAllByRole('option');
      expect(roleOptions.some(option => /admin/i.test(option.textContent))).toBe(true);
      expect(roleOptions.some(option => /operator/i.test(option.textContent))).toBe(true);
      expect(roleOptions.some(option => /viewer/i.test(option.textContent))).toBe(true);
    }, { timeout: 5000 });
  });

  // ... (keep the other tests the same, but update similar queries)

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

    await waitFor(() => expect(mockGetAllUsers).toHaveBeenCalled(), { timeout: 3000 });

    const addButton = screen.getByText(/Add User/i);
    fireEvent.click(addButton);

    await waitFor(() => {
      const roleOptions = screen.getAllByRole('option');
      expect(roleOptions.some(option => /admin/i.test(option.textContent))).toBe(true);
    }, { timeout: 3000 });
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

    await waitFor(() => expect(mockGetAllUsers).toHaveBeenCalled(), { timeout: 3000 });

    const addButton = screen.getByText(/Add User/i);
    fireEvent.click(addButton);

    await waitFor(() => {
      const operatorOption = screen.getByText(/Operator/i);
      fireEvent.click(operatorOption);
    }, { timeout: 3000 });
  });

  // Keep the remaining tests as they are or apply similar fixes if they fail
});
