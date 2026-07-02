// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPanel from "../components/AdminPanel";

// Setup hoisted mocks for dependencies to prevent runtime reference errors
const { 
  mockGetAllUsers, 
  mockDeleteUser,
  mockApiGet,
  mockApiPost,
  mockFormatRoleName,
  mockFormatUserName,
} = vi.hoisted(() => ({
  mockGetAllUsers: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
  mockFormatRoleName: vi.fn((role) => {
    if (!role) return "";
    if (typeof role === "string") return role;
    return role.name || "";
  }),
  mockFormatUserName: vi.fn((user) => {
    if (!user) return "";
    return `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "";
  }),
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

vi.mock("../utils/userUtils", () => ({
  formatRoleName: mockFormatRoleName,
  formatUserName: mockFormatUserName,
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

  it("should show all three role options (admin, operator, viewer) in the dropdown when roles are fetched successfully", async () => {
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

    const addButton = screen.getByText("Add User");
    fireEvent.click(addButton);

    await waitFor(() => {
      const select = document.getElementById("user-role-select");
      expect(select).toBeInTheDocument();
      expect(select).not.toBeDisabled();
    });

    const select = document.getElementById("user-role-select");
    const options = select.querySelectorAll("option");
    
    expect(options.length).toBe(4);
    expect(options[1].textContent).toBe("Admin");
    expect(options[1].value).toBe("admin-id");
    expect(options[2].textContent).toBe("Operator");
    expect(options[2].value).toBe("operator-id");
    expect(options[3].textContent).toBe("Viewer");
    expect(options[3].value).toBe("viewer-id");
  });

  it("should show error message when roles API fails", async () => {
    mockApiGet.mockRejectedValue(new Error("API network error"));

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockGetAllUsers).toHaveBeenCalled();
    });

    const addButton = screen.getByText("Add User");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Unable to load roles. Please refresh the page.")).toBeInTheDocument();
    });
  });

  it("should show error message when API returns non-ok response", async () => {
    mockApiGet.mockResolvedValue({ ok: false });

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockGetAllUsers).toHaveBeenCalled();
    });

    const addButton = screen.getByText("Add User");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Unable to load roles. Please refresh the page.")).toBeInTheDocument();
    });
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

    await waitFor(() => {
      expect(mockGetAllUsers).toHaveBeenCalled();
    });

    const addButton = screen.getByText("Add User");
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Unable to load roles. Please refresh the page.")).toBeInTheDocument();
    });
  });

  it("should allow selecting operator role", async () => {
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

    const addButton = screen.getByText("Add User");
    fireEvent.click(addButton);

    await waitFor(() => {
      const select = document.getElementById("user-role-select");
      expect(select).toBeInTheDocument();
    });

    const select = document.getElementById("user-role-select");
    fireEvent.change(select, { target: { value: "operator-id" } });
    expect(select.value).toBe("operator-id");
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

    const addButton = screen.getByText("Add User");
    fireEvent.click(addButton);

    await waitFor(() => {
      const select = document.getElementById("user-role-select");
      expect(select).toBeInTheDocument();
      expect(select).not.toBeDisabled();
    });

    const select = document.getElementById("user-role-select");
    const options = select.querySelectorAll("option");
    expect(options.length).toBe(4);
    expect(options[1].textContent).toBe("Admin");
    expect(options[1].value).toBe("admin-id");
    expect(options[2].textContent).toBe("Operator");
    expect(options[2].value).toBe("operator-id");
    expect(options[3].textContent).toBe("Viewer");
    expect(options[3].value).toBe("viewer-id");
  });
});
