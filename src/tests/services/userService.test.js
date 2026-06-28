import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getPendingUsers,
  approveUser,
  rejectUser,
  getRoles,
} from "../../services/userService";
import { apiGet, apiPost } from "../../utils/apiFetch";

// Mock the API fetch utilities
vi.mock("../../utils/apiFetch", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

describe("User Service - /src/services/userService.js", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPendingUsers", () => {
    it("should fetch pending users and map pagination correctly on success", async () => {
      const mockResult = {
        data: [{ id: 1, name: "Pending User A" }],
        page: 1,
        per_page: 50,
        total: 10,
        pages: 1,
        has_next: false,
        has_prev: false,
      };

      vi.mocked(apiGet).mockResolvedValue(mockResult);

      const result = await getPendingUsers({ page: 2, per_page: 10 });

      expect(apiGet).toHaveBeenCalledWith("/users/pending", {
        page: 2,
        per_page: 10,
      });

      expect(result).toEqual({
        success: true,
        data: mockResult.data,
        pagination: {
          page: 1,
          per_page: 50,
          total: 10,
          pages: 1,
          has_next: false,
          has_prev: false,
        },
      });
    });

    it("should fall back to defaults if pagination details are missing in response", async () => {
      vi.mocked(apiGet).mockResolvedValue({});

      const result = await getPendingUsers();

      expect(apiGet).toHaveBeenCalledWith("/users/pending", {
        page: 1,
        per_page: 50,
      });

      expect(result).toEqual({
        success: true,
        data: [],
        pagination: {
          page: 1,
          per_page: 50,
          total: 0,
          pages: 0,
          has_next: false,
          has_prev: false,
        },
      });
    });

    it("should catch errors and return a failed success indicator with error message", async () => {
      vi.mocked(apiGet).mockRejectedValue(new Error("Database timeout"));

      const result = await getPendingUsers();

      expect(result).toEqual({
        success: false,
        message: "Database timeout",
        data: [],
      });
    });

    it("should return a generic error message if error message is not present", async () => {
      vi.mocked(apiGet).mockRejectedValue({});

      const result = await getPendingUsers();

      expect(result.success).toBe(false);
      expect(result.message).toBe("Failed to fetch pending users");
    });
  });

  describe("approveUser", () => {
    const mockUser = {
      id: 5,
      username: "john_doe",
      role: { id: 2, name: "operator" },
    };

    it("should approve user successfully without role update if role is not supplied", async () => {
      vi.mocked(apiPost).mockResolvedValue({ user: mockUser });

      const result = await approveUser(5);

      expect(apiPost).toHaveBeenCalledWith("/users/5/approve", {});
      expect(result).toEqual({
        success: true,
        message: "User approved successfully",
        user: mockUser,
      });
    });

    it("should approve user successfully without role update if role matches current role", async () => {
      vi.mocked(apiPost).mockResolvedValue({ user: mockUser });

      const result = await approveUser(5, 2); // roleId = 2 matches mockUser.role.id = 2

      expect(apiPost).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.message).toBe("User approved successfully");
    });

    it("should approve user and update role if roleId is provided and different", async () => {
      const updatedUser = { ...mockUser, role: { id: 1, name: "admin" } };

      vi.mocked(apiPost)
        .mockResolvedValueOnce({ user: mockUser }) // Approve call
        .mockResolvedValueOnce({ user: updatedUser }); // Role update call

      const result = await approveUser(5, 1); // 1 is different from 2

      expect(apiPost).toHaveBeenNthCalledWith(1, "/users/5/approve", {});
      expect(apiPost).toHaveBeenNthCalledWith(2, "/users/5", { role_id: 1 });

      expect(result).toEqual({
        success: true,
        message: "User approved and role updated successfully",
        user: updatedUser,
      });
    });

    it("should approve user but return partial success if role update fails", async () => {
      vi.mocked(apiPost)
        .mockResolvedValueOnce({ user: mockUser }) // Approve call
        .mockRejectedValueOnce(new Error("Role update endpoint offline")); // Role update call fails

      const result = await approveUser(5, 1);

      expect(result).toEqual({
        success: true,
        message: "User approved successfully (role update pending)",
        user: mockUser,
      });
    });

    it("should reject with failure if the primary approval request throws", async () => {
      vi.mocked(apiPost).mockRejectedValue(new Error("User not found"));

      const result = await approveUser(5);

      expect(result).toEqual({
        success: false,
        message: "User not found",
      });
    });

    it("should throw a default message if primary approval fails without an explicit error message", async () => {
      vi.mocked(apiPost).mockRejectedValue({});

      const result = await approveUser(5);

      expect(result).toEqual({
        success: false,
        message: "Failed to approve user",
      });
    });

    it("should throw if response is valid but does not contain user object", async () => {
      vi.mocked(apiPost).mockResolvedValue({ success: true }); // No user property

      const result = await approveUser(5);

      expect(result).toEqual({
        success: false,
        message: "Approval failed",
      });
    });
  });

  describe("rejectUser", () => {
    it("should reject user successfully with provided reason", async () => {
      const mockResult = { user: { id: 10, status: "rejected" } };
      vi.mocked(apiPost).mockResolvedValue(mockResult);

      const result = await rejectUser(10, "Invalid credentials");

      expect(apiPost).toHaveBeenCalledWith("/users/10/reject", {
        reason: "Invalid credentials",
      });
      expect(result).toEqual({
        success: true,
        message: "User registration rejected",
        user: mockResult.user,
      });
    });

    it("should reject user with default reason if none provided", async () => {
      const mockResult = { user: { id: 10, status: "rejected" } };
      vi.mocked(apiPost).mockResolvedValue(mockResult);

      await rejectUser(10);

      expect(apiPost).toHaveBeenCalledWith("/users/10/reject", {
        reason: "No reason provided",
      });
    });

    it("should handle failure when rejectUser apiPost fails", async () => {
      vi.mocked(apiPost).mockRejectedValue(new Error("Connection lost"));

      const result = await rejectUser(10);

      expect(result).toEqual({
        success: false,
        message: "Connection lost",
      });
    });
  });

  describe("getRoles", () => {
    it("should fetch roles list successfully (where roles is in 'data' field)", async () => {
      const mockRoles = [{ id: 1, name: "admin" }];
      vi.mocked(apiGet).mockResolvedValue({ data: mockRoles });

      const result = await getRoles();

      expect(apiGet).toHaveBeenCalledWith("/roles");
      expect(result).toEqual({
        success: true,
        data: mockRoles,
      });
    });

    it("should fetch roles list successfully (where response is the array itself)", async () => {
      const mockRoles = [{ id: 1, name: "admin" }];
      vi.mocked(apiGet).mockResolvedValue(mockRoles);

      const result = await getRoles();

      expect(result).toEqual({
        success: true,
        data: mockRoles,
      });
    });

    it("should return empty array on failure", async () => {
      vi.mocked(apiGet).mockRejectedValue(new Error("Unauthorized"));

      const result = await getRoles();

      expect(result).toEqual({
        success: false,
        message: "Unauthorized",
        data: [],
      });
    });
  });
});
