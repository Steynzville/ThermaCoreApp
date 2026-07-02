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
      // More specific queries to avoid matching the "Admin Panel" heading
      expect(screen.getByText(/admin/i, { selector: 'option, label, span' })).toBeInTheDocument();
      expect(screen.getByText(/operator/i, { selector: 'option, label, span' })).toBeInTheDocument();
      expect(screen.getByText(/viewer/i, { selector: 'option, label, span' })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("should show error message when roles API fails", async () => {
    mockApiGet.mockRejectedValue(new Error("API network error"));

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    await waitFor(() => expect(mockGetAllUsers).toHaveBeenCalled(), { timeout: 3000 });

    const addButton = screen.getByText(/Add User/i);
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.queryByText(/Unable to load roles/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("should show error message when API returns non-ok response", async () => {
    mockApiGet.mockResolvedValue({ ok: false });

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    await waitFor(() => expect(mockGetAllUsers).toHaveBeenCalled(), { timeout: 3000 });

    const addButton = screen.getByText(/Add User/i);
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.queryByText(/Unable to load roles/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("should show error message when API returns empty array", async () => {
    mockApiGet.mockResolvedValue({
      ok: true,
      json: async () => [],
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
      expect(screen.queryByText(/Unable to load roles/i)).toBeInTheDocument();
    }, { timeout: 3000 });
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

    await waitFor(() => expect(mockGetAllUsers).toHaveBeenCalled(), { timeout: 3000 });

    const addButton = screen.getByText(/Add User/i);
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/admin/i, { selector: 'option, label' })).toBeInTheDocument();
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
      expect(operatorOption).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("should show user management table", async () => {
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
      expect(screen.queryByText(/john.doe/i) || screen.queryByText(/Users/i)).toBeTruthy();
    }, { timeout: 3000 });
  });
});
