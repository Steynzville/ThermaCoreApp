import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { useUserManagement } from "./useUserManagement";
import { deleteUser, getAllUsers } from "../services/usersAPI";
import { apiGet, apiPost } from "../utils/apiFetch";

// Mock dependencies
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("../services/usersAPI", () => ({
  deleteUser: vi.fn(),
  getAllUsers: vi.fn(),
}));

vi.mock("../utils/apiFetch", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("../utils/userUtils", () => ({
  formatRoleName: (role) => role?.name || "Unknown",
  formatUserName: (user) => `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username,
}));

describe("useUserManagement", () => {
  const mockUsers = {
    data: [
      {
        id: 1,
        username: "john_doe",
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com",
        company: "ThermaCore",
        phone_number: "123-456-7890",
        department: "Engineering",
        position: "Developer",
        role: { name: "Admin" },
        is_active: true,
      },
      {
        id: 2,
        username: "jane_smith",
        first_name: "Jane",
        last_name: "Smith",
        email: "jane@example.com",
        company: "ThermaCore",
        phone_number: "098-765-4321",
        department: "Operations",
        position: "Manager",
        role: { name: "User" },
        is_active: false,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getAllUsers.mockResolvedValue(mockUsers);
  });

  describe("Initial State", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useUserManagement());

      expect(result.current.users).toEqual([]);
      expect(result.current.isLoadingUsers).toBe(true); // Loading initially
      expect(result.current.usersError).toBe(null);
      expect(result.current.editingUser).toBe(null);
      expect(result.current.createUserModal).toBe(false);
      expect(result.current.showCreatePassword).toBe(false);
      expect(result.current.isCreatingUser).toBe(false);
    });

    it("should have initial form data with empty fields", () => {
      const { result } = renderHook(() => useUserManagement());

      expect(result.current.newUserFormData).toEqual({
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phoneNumber: "",
        company: "",
        department: "",
        position: "",
        roleId: "",
      });
    });
  });

  describe("fetchUsers", () => {
    it("should fetch and map users on mount", async () => {
      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.isLoadingUsers).toBe(false);
      });

      expect(getAllUsers).toHaveBeenCalledWith({ per_page: 100 });
      expect(result.current.users).toHaveLength(2);
      expect(result.current.users[0]).toMatchObject({
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        company: "ThermaCore",
        role: "Admin",
        status: "Active",
      });
    });

    it("should handle fetch error", async () => {
      getAllUsers.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.isLoadingUsers).toBe(false);
      });

      expect(result.current.usersError).toBe("Failed to load users. Please try again.");
      expect(toast.error).toHaveBeenCalledWith("Failed to load users");
    });

    it("should map users with N/A for missing fields", async () => {
      getAllUsers.mockResolvedValueOnce({
        data: [
          {
            id: 1,
            username: "test",
            email: "test@example.com",
            role: { name: "User" },
            is_active: true,
          },
        ],
      });

      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.users[0]).toMatchObject({
          company: "N/A",
          phone: "N/A",
          department: "N/A",
          position: "N/A",
        });
      });
    });
  });

  describe("handleAddUser", () => {
    it("should open create user modal with reset form", async () => {
      apiGet.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ roles: [{ id: 1, name: "Admin" }] }),
      });

      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.isLoadingUsers).toBe(false);
      });

      result.current.handleAddUser();

      await waitFor(() => {
        expect(result.current.createUserModal).toBe(true);
        expect(result.current.showCreatePassword).toBe(false);
        expect(result.current.newUserFormData.username).toBe("");
      });
    });

    it("should fetch roles when opening modal", async () => {
      apiGet.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ roles: [{ id: 1, name: "Admin" }, { id: 2, name: "User" }] }),
      });

      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.isLoadingUsers).toBe(false);
      });

      result.current.handleAddUser();

      await waitFor(() => {
        expect(apiGet).toHaveBeenCalled();
        expect(result.current.availableRoles).toHaveLength(2);
        expect(result.current.rolesLoadError).toBe(false);
      });
    });

    it("should handle roles fetch error", async () => {
      apiGet.mockResolvedValueOnce({
        ok: false,
      });

      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.isLoadingUsers).toBe(false);
      });

      result.current.handleAddUser();

      await waitFor(() => {
        expect(result.current.rolesLoadError).toBe(true);
        expect(result.current.availableRoles).toEqual([]);
      });
    });
  });

  describe("handleCreateUser", () => {
    it("should validate required username", async () => {
      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.isLoadingUsers).toBe(false);
      });

      await result.current.handleCreateUser();

      expect(toast.error).toHaveBeenCalledWith("Username is required");
    });

    it("should validate required email", async () => {
      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.isLoadingUsers).toBe(false);
      });

      result.current.newUserFormData.username = "test";
      await result.current.handleCreateUser();

      expect(toast.error).toHaveBeenCalledWith("Email is required");
    });

    it("should validate required password", async () => {
      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.isLoadingUsers).toBe(false);
      });

      result.current.newUserFormData.username = "test";
      result.current.newUserFormData.email = "test@example.com";
      await result.current.handleCreateUser();

      expect(toast.error).toHaveBeenCalledWith("Password is required");
    });

    it("should validate password length", async () => {
      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.isLoadingUsers).toBe(false);
      });

      result.current.newUserFormData.username = "test";
      result.current.newUserFormData.email = "test@example.com";
      result.current.newUserFormData.password = "123";
      result.current.newUserFormData.roleId = "1"; // Add roleId to pass that check
      await result.current.handleCreateUser();

      expect(toast.error).toHaveBeenCalledWith("Password must be at least 6 characters long");
    });

    it("should validate required role", async () => {
      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.isLoadingUsers).toBe(false);
      });

      result.current.newUserFormData.username = "test";
      result.current.newUserFormData.email = "test@example.com";
      result.current.newUserFormData.password = "password123";
      await result.current.handleCreateUser();

      expect(toast.error).toHaveBeenCalledWith("Role is required");
    });

    it("should successfully create user", async () => {
      apiPost.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 3, username: "newuser" }),
      });

      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.isLoadingUsers).toBe(false);
      });

      result.current.newUserFormData.username = "newuser";
      result.current.newUserFormData.email = "newuser@example.com";
      result.current.newUserFormData.password = "password123";
      result.current.newUserFormData.firstName = "New";
      result.current.newUserFormData.lastName = "User";
      result.current.newUserFormData.phoneNumber = "555-1234";
      result.current.newUserFormData.company = "TestCo";
      result.current.newUserFormData.department = "IT";
      result.current.newUserFormData.position = "Developer";
      result.current.newUserFormData.roleId = "1";

      await result.current.handleCreateUser();

      await waitFor(() => {
        expect(apiPost).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("User newuser created successfully");
        expect(result.current.createUserModal).toBe(false);
      });
    });

    it("should handle create user error", async () => {
      apiPost.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Username already exists" }),
      });

      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.isLoadingUsers).toBe(false);
      });

      result.current.newUserFormData.username = "duplicate";
      result.current.newUserFormData.email = "dup@example.com";
      result.current.newUserFormData.password = "password123";
      result.current.newUserFormData.roleId = "1";

      await result.current.handleCreateUser();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Username already exists");
      });
    });
  });

  describe("handleEditUser", () => {
    it("should set editing user", async () => {
      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.users).toHaveLength(2);
      });

      const user = result.current.users[0];
      
      act(() => {
        result.current.handleEditUser(user);
      });

      expect(result.current.editingUser).toEqual(user);
    });
  });

  describe("handleSaveUser", () => {
    it("should update user in list", async () => {
      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.users).toHaveLength(2);
      });

      const updatedUser = { ...result.current.users[0], name: "Updated Name" };
      
      act(() => {
        result.current.handleSaveUser(updatedUser);
      });

      expect(result.current.users[0].name).toBe("Updated Name");
      expect(result.current.editingUser).toBe(null);
    });
  });

  describe("handleDeleteUser", () => {
    beforeEach(() => {
      global.confirm = vi.fn();
    });

    it("should delete user when confirmed", async () => {
      global.confirm.mockReturnValueOnce(true);
      deleteUser.mockResolvedValueOnce({});

      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.users).toHaveLength(2);
      });

      await result.current.handleDeleteUser(1);

      await waitFor(() => {
        expect(deleteUser).toHaveBeenCalledWith(1);
        expect(toast.success).toHaveBeenCalledWith("User deleted successfully");
        expect(getAllUsers).toHaveBeenCalledTimes(2); // Initial + after delete
      });
    });

    it("should not delete user when cancelled", async () => {
      global.confirm.mockReturnValueOnce(false);

      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.users).toHaveLength(2);
      });

      await result.current.handleDeleteUser(1);

      expect(deleteUser).not.toHaveBeenCalled();
    });

    it("should handle delete error", async () => {
      global.confirm.mockReturnValueOnce(true);
      deleteUser.mockRejectedValueOnce(new Error("Delete failed"));

      const { result } = renderHook(() => useUserManagement());

      await waitFor(() => {
        expect(result.current.users).toHaveLength(2);
      });

      await result.current.handleDeleteUser(1);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete user");
      });
    });
  });
});
