// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPanel from "../components/AdminPanel";

// 1. Force environment variable for tests
vi.stubEnv('VITE_API_BASE_URL', 'https://test-api.com');

// 2. Define mocks using vi.hoisted to ensure they are available to the factory
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

// 3. Mock external dependencies
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "1", username: "admin", role: "admin" },
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

describe("AdminPanel User Creation Form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful response
    mockGetAllUsers.mockResolvedValue({ data: [] });
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

    // Wrapped render to ensure mount
    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    // Wait for the async effect that fetches users
    await waitFor(() => expect(mockGetAllUsers).toHaveBeenCalled());

    // Use await findBy to ensure element exists before interaction
    const addButton = await screen.findByRole("button", { name: /add user/i });
    fireEvent.click(addButton);

    // Use findBy for the modal element to ensure it rendered
    const select = await screen.findByRole("combobox", { id: "user-role-select" });
    expect(select).toBeInTheDocument();

    const options = select.querySelectorAll("option");
    expect(options.length).toBe(4); // 1 placeholder + 3 roles
    expect(options[1].textContent).toMatch(/admin/i);
  });

  it("should show error message when roles API fails", async () => {
    // Mock failure
    mockApiGet.mockResolvedValue({
      ok: false,
    });

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    const addButton = await screen.findByRole("button", { name: /add user/i });
    fireEvent.click(addButton);

    // Wait for the error state to trigger in the modal
    const errorMessage = await screen.findByText(/Unable to load roles/i);
    expect(errorMessage).toBeInTheDocument();
  });
});
