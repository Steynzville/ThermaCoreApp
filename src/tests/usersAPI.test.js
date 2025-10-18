import { beforeEach,describe, expect, it, vi } from 'vitest';

import { deleteUser, getAllUsers } from '../services/usersAPI';
import * as apiFetch from '../utils/apiFetch';

// Mock the apiFetch module
vi.mock('../utils/apiFetch', () => ({
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
}));

describe('usersAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should fetch all users with default pagination', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              username: 'admin',
              email: 'admin@thermacore.com',
              first_name: 'Admin',
              last_name: 'User',
              role: { name: 'admin' },
              is_active: true,
            },
          ],
          page: 1,
          per_page: 100,
          total: 1,
        }),
      };

      vi.spyOn(apiFetch, 'apiGet').mockResolvedValue(mockResponse);

      const result = await getAllUsers();

      expect(apiFetch.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/users?page=1&per_page=100'),
        expect.objectContaining({
          showToastOnError: true,
          retries: 2,
          retryDelay: 1000,
        })
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].username).toBe('admin');
    });

    it('should fetch users with custom pagination', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [],
          page: 2,
          per_page: 50,
          total: 0,
        }),
      };

      vi.spyOn(apiFetch, 'apiGet').mockResolvedValue(mockResponse);

      await getAllUsers({ page: 2, per_page: 50 });

      expect(apiFetch.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('page=2&per_page=50'),
        expect.any(Object)
      );
    });

    it('should include role filter when provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [] }),
      };

      vi.spyOn(apiFetch, 'apiGet').mockResolvedValue(mockResponse);

      await getAllUsers({ role: 'admin' });

      expect(apiFetch.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('role=admin'),
        expect.any(Object)
      );
    });

    it('should include search filter when provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [] }),
      };

      vi.spyOn(apiFetch, 'apiGet').mockResolvedValue(mockResponse);

      await getAllUsers({ search: 'john' });

      expect(apiFetch.apiGet).toHaveBeenCalledWith(
        expect.stringContaining('search=john'),
        expect.any(Object)
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete a user by ID', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
      };

      vi.spyOn(apiFetch, 'apiDelete').mockResolvedValue(mockResponse);

      const result = await deleteUser(123);

      expect(apiFetch.apiDelete).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/users/123'),
        expect.objectContaining({
          showToastOnError: true,
          retries: 1,
          retryDelay: 1000,
        })
      );

      expect(result.ok).toBe(true);
      expect(result.status).toBe(204);
    });

    it('should handle errors when deleting a user', async () => {
      vi.spyOn(apiFetch, 'apiDelete').mockRejectedValue(
        new Error('Failed to delete user')
      );

      await expect(deleteUser(123)).rejects.toThrow('Failed to delete user');
    });
  });
});
