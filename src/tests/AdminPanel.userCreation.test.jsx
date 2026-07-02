// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPanel from "../components/AdminPanel";

// Force environment variable for tests to prevent runtime crashes
vi.stubEnv('VITE_API_BASE_URL', 'https://test-api.com');

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

// Mock external dependencies
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

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    await waitFor(() => expect(mockGetAllUsers).toHaveBeenCalled());

    const addButton = screen.getByRole("button", { name: /add user/i });
    fireEvent.click(addButton);

    const select = await screen.findByRole("combobox", { id: "user-role-select" });
    expect(select).toBeInTheDocument();

    const options = select.querySelectorAll("option");
    expect(options.length).toBe(4);
    expect(options[1].textContent).toBe("Admin");
  });

  it("should show error message when roles API fails", async () => {
    mockApiGet.mockRejectedValue(new Error("API network error"));

    render(
      <BrowserRouter>
        <AdminPanel />
      </BrowserRouter>
    );

    const addButton = screen.getByRole("button", { name: /add user/i });
    fireEvent.click(addButton);

    expect(await screen.findByText(/Unable to load roles/i)).toBeInTheDocument();
  });
});
