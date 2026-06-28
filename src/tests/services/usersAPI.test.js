import { describe, it, expect, beforeEach, vi } from "vitest";
import { getAllUsers, deleteUser } from "../../services/usersAPI";
import { apiGet, apiDelete } from "../../utils/apiFetch";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://thermacoreapp.onrender.com";

// Mock the API fetch utilities
vi.mock("../../utils/apiFetch", () => ({
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
}));

describe("Users API Service - /src/services/usersAPI.js", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllUsers", () => {
    it("should fetch all users with default pagination options", async () => {
      const mockUsersData = {
        data: [
          { id: 1, username: "admin", email: "admin@thermacore.com" },
          { id: 2, username: "operator", email: "operator@thermacore.com" },
        ],
        page: 1,
        per_page: 100,
        total: 2,
      };

      const mockResponse = {
        json: vi.fn().mockResolvedValue(mockUsersData),
      };

      vi.mocked(apiGet).mockResolvedValue(mockResponse);

      const result = await getAllUsers();

      expect(apiGet).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/v1/users?page=1&per_page=100`,
        {
          showToastOnError: true,
          retries: 2,
          retryDelay: 1000,
        }
      );
      expect(mockResponse.json).toHaveBeenCalled();
      expect(result).toEqual(mockUsersData);
    });

    it("should append optional filters (role, active, search) to the request URL", async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({ data: [] }),
      };

      vi.mocked(apiGet).mockResolvedValue(mockResponse);

      await getAllUsers({
        page: 2,
        per_page: 25,
        role: "operator",
        active: true,
        search: "John",
      });

      expect(apiGet).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/v1/users?page=2&per_page=25&role=operator&active=true&search=John`,
        expect.any(Object)
      );
    });

    it("should handle false value for active status correctly", async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({ data: [] }),
      };

      vi.mocked(apiGet).mockResolvedValue(mockResponse);

      await getAllUsers({
        active: false,
      });

      expect(apiGet).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/v1/users?page=1&per_page=100&active=false`,
        expect.any(Object)
      );
    });

    it("should propagate errors if the fetch fails", async () => {
      const networkError = new Error("Network latency/timeout");
      vi.mocked(apiGet).mockRejectedValue(networkError);

      await expect(getAllUsers()).rejects.toThrow("Network latency/timeout");
    });
  });

  describe("deleteUser", () => {
    it("should successfully trigger user deletion by ID", async () => {
      const mockResponse = {
        status: 200,
        ok: true,
      };

      vi.mocked(apiDelete).mockResolvedValue(mockResponse);

      const result = await deleteUser(42);

      expect(apiDelete).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/v1/users/42`,
        {
          showToastOnError: true,
          retries: 1,
          retryDelay: 1000,
        }
      );
      expect(result).toBe(mockResponse);
    });

    it("should propagate errors when deletion fails", async () => {
      const authError = new Error("Unauthorized to delete users");
      vi.mocked(apiDelete).mockRejectedValue(authError);

      await expect(deleteUser(123)).rejects.toThrow("Unauthorized to delete users");
    });
  });
});
