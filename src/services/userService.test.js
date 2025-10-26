import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveUser,
  getPendingUsers,
  getRoles,
  rejectUser,
} from "./userService";

// Mock the apiFetch module
vi.mock("../utils/apiFetch", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

import { apiGet, apiPost } from "../utils/apiFetch";

describe("userService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPendingUsers", () => {
    it("should fetch pending users successfully", async () => {
      const mockResponse = {
        data: [
          { id: 1, name: "User 1", email: "user1@example.com" },
          { id: 2, name: "User 2", email: "user2@example.com" },
        ],
        page: 1,
        per_page: 50,
        total: 2,
        pages: 1,
        has_next: false,
        has_prev: false,
      };
      apiGet.mockResolvedValue(mockResponse);

      const result = await getPendingUsers();

      expect(apiGet).toHaveBeenCalledWith("/users/pending", {
        page: 1,
        per_page: 50,
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
    });

    it("should handle custom pagination params", async () => {
      const mockResponse = {
        data: [],
        page: 2,
        per_page: 10,
        total: 0,
        pages: 0,
      };
      apiGet.mockResolvedValue(mockResponse);

      await getPendingUsers({ page: 2, per_page: 10 });

      expect(apiGet).toHaveBeenCalledWith("/users/pending", {
        page: 2,
        per_page: 10,
      });
    });

    it("should handle API errors", async () => {
      apiGet.mockRejectedValue(new Error("Network error"));

      const result = await getPendingUsers();

      expect(result.success).toBe(false);
      expect(result.message).toBe("Network error");
      expect(result.data).toEqual([]);
    });

    it("should provide default pagination values when missing", async () => {
      apiGet.mockResolvedValue({ data: [] });

      const result = await getPendingUsers();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.per_page).toBe(50);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.pages).toBe(0);
      expect(result.pagination.has_next).toBe(false);
      expect(result.pagination.has_prev).toBe(false);
    });

    it("should handle empty params object", async () => {
      apiGet.mockResolvedValue({ data: [] });

      await getPendingUsers({});

      expect(apiGet).toHaveBeenCalledWith("/users/pending", {
        page: 1,
        per_page: 50,
      });
    });
  });

  describe("approveUser", () => {
    it("should approve user successfully without role change", async () => {
      const mockUser = { id: 1, name: "User 1", role: { id: 2 } };
      apiPost.mockResolvedValue({ user: mockUser });

      const result = await approveUser(1);

      expect(apiPost).toHaveBeenCalledWith("/users/1/approve", {});
      expect(result.success).toBe(true);
      expect(result.message).toBe("User approved successfully");
      expect(result.user).toEqual(mockUser);
    });

    it("should approve user and update role when roleId provided", async () => {
      const mockUser = { id: 1, name: "User 1", role: { id: 2 } };
      const updatedUser = { id: 1, name: "User 1", role: { id: 3 } };

      apiPost
        .mockResolvedValueOnce({ user: mockUser })
        .mockResolvedValueOnce({ user: updatedUser });

      const result = await approveUser(1, 3);

      expect(apiPost).toHaveBeenCalledWith("/users/1/approve", {});
      expect(apiPost).toHaveBeenCalledWith("/users/1", { role_id: 3 });
      expect(result.success).toBe(true);
      expect(result.message).toBe(
        "User approved and role updated successfully",
      );
      expect(result.user).toEqual(updatedUser);
    });

    it("should not update role if roleId matches current role", async () => {
      const mockUser = { id: 1, name: "User 1", role: { id: 2 } };
      apiPost.mockResolvedValue({ user: mockUser });

      const result = await approveUser(1, 2);

      expect(apiPost).toHaveBeenCalledTimes(1);
      expect(apiPost).toHaveBeenCalledWith("/users/1/approve", {});
      expect(result.success).toBe(true);
    });

    it("should handle approval with null roleId", async () => {
      const mockUser = { id: 1, name: "User 1" };
      apiPost.mockResolvedValue({ user: mockUser });

      const result = await approveUser(1, null);

      expect(apiPost).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
    });

    it("should handle role update failure gracefully", async () => {
      const mockUser = { id: 1, name: "User 1", role: { id: 2 } };

      apiPost
        .mockResolvedValueOnce({ user: mockUser })
        .mockRejectedValueOnce(new Error("Role update failed"));

      const result = await approveUser(1, 3);

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        "User approved successfully (role update pending)",
      );
      expect(result.user).toEqual(mockUser);
    });

    it("should handle approval failure", async () => {
      apiPost.mockRejectedValue(new Error("Approval failed"));

      const result = await approveUser(1);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Approval failed");
    });

    it("should handle missing user in approval response", async () => {
      apiPost.mockResolvedValue({});

      const result = await approveUser(1);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Approval failed");
    });

    it("should handle null approval response", async () => {
      apiPost.mockResolvedValue(null);

      const result = await approveUser(1);

      expect(result.success).toBe(false);
    });
  });

  describe("rejectUser", () => {
    it("should reject user successfully with reason", async () => {
      const mockUser = { id: 1, name: "User 1" };
      apiPost.mockResolvedValue({ user: mockUser });

      const result = await rejectUser(1, "Invalid credentials");

      expect(apiPost).toHaveBeenCalledWith("/users/1/reject", {
        reason: "Invalid credentials",
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe("User registration rejected");
      expect(result.user).toEqual(mockUser);
    });

    it("should use default reason when reason not provided", async () => {
      const mockUser = { id: 1, name: "User 1" };
      apiPost.mockResolvedValue({ user: mockUser });

      await rejectUser(1);

      expect(apiPost).toHaveBeenCalledWith("/users/1/reject", {
        reason: "No reason provided",
      });
    });

    it("should use default reason when empty string provided", async () => {
      const mockUser = { id: 1, name: "User 1" };
      apiPost.mockResolvedValue({ user: mockUser });

      await rejectUser(1, "");

      expect(apiPost).toHaveBeenCalledWith("/users/1/reject", {
        reason: "No reason provided",
      });
    });

    it("should handle rejection failure", async () => {
      apiPost.mockRejectedValue(new Error("Rejection failed"));

      const result = await rejectUser(1, "test");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Rejection failed");
    });

    it("should handle network errors", async () => {
      apiPost.mockRejectedValue(new Error("Network error"));

      const result = await rejectUser(1);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Network error");
    });
  });

  describe("getRoles", () => {
    it("should fetch roles successfully", async () => {
      const mockRoles = [
        { id: 1, name: "Admin" },
        { id: 2, name: "User" },
        { id: 3, name: "Technician" },
      ];
      apiGet.mockResolvedValue({ data: mockRoles });

      const result = await getRoles();

      expect(apiGet).toHaveBeenCalledWith("/roles");
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRoles);
    });

    it("should handle roles returned without data wrapper", async () => {
      const mockRoles = [
        { id: 1, name: "Admin" },
        { id: 2, name: "User" },
      ];
      apiGet.mockResolvedValue(mockRoles);

      const result = await getRoles();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRoles);
    });

    it("should handle API errors", async () => {
      apiGet.mockRejectedValue(new Error("Failed to fetch roles"));

      const result = await getRoles();

      expect(result.success).toBe(false);
      expect(result.message).toBe("Failed to fetch roles");
      expect(result.data).toEqual([]);
    });

    it("should handle network errors", async () => {
      apiGet.mockRejectedValue(new Error("Network timeout"));

      const result = await getRoles();

      expect(result.success).toBe(false);
      expect(result.message).toBe("Network timeout");
    });

    it("should provide empty array on error", async () => {
      apiGet.mockRejectedValue(new Error("Error"));

      const result = await getRoles();

      expect(result.data).toEqual([]);
    });
  });
});
