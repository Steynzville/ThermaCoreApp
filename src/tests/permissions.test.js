import { describe, expect,it } from 'vitest';

import {
  canAccessAdminPanel,
  canControlUnits,
  canManageUnits,
  canManageUsers,
  canViewAllUnits,
  canViewAnalytics,
  canViewProtocols,
  canViewSales,
  canViewUnits,
  canViewUsers,
  getFrontendRole,
  getPermissions,
  getRoleDisplayName,
  isViewerOnly,
} from '../utils/permissions';

describe('Permission Helper Functions', () => {
  describe('canControlUnits', () => {
    it('should allow admin to control units', () => {
      expect(canControlUnits('admin')).toBe(true);
    });

    it('should allow operator to control units', () => {
      expect(canControlUnits('operator')).toBe(true);
    });

    it('should not allow viewer to control units', () => {
      expect(canControlUnits('viewer')).toBe(false);
    });
  });

  describe('canViewSales', () => {
    it('should allow admin to view sales', () => {
      expect(canViewSales('admin')).toBe(true);
    });

    it('should not allow operator to view sales', () => {
      expect(canViewSales('operator')).toBe(false);
    });

    it('should not allow viewer to view sales', () => {
      expect(canViewSales('viewer')).toBe(false);
    });
  });

  describe('canViewAllUnits', () => {
    it('should allow admin to view all units', () => {
      expect(canViewAllUnits('admin')).toBe(true);
    });

    it('should not allow operator to view all units', () => {
      expect(canViewAllUnits('operator')).toBe(false);
    });

    it('should not allow viewer to view all units', () => {
      expect(canViewAllUnits('viewer')).toBe(false);
    });
  });

  describe('canManageUnits', () => {
    it('should allow admin to manage units', () => {
      expect(canManageUnits('admin')).toBe(true);
    });

    it('should not allow operator to manage units', () => {
      expect(canManageUnits('operator')).toBe(false);
    });

    it('should not allow viewer to manage units', () => {
      expect(canManageUnits('viewer')).toBe(false);
    });
  });

  describe('canManageUsers', () => {
    it('should allow admin to manage users', () => {
      expect(canManageUsers('admin')).toBe(true);
    });

    it('should not allow operator to manage users', () => {
      expect(canManageUsers('operator')).toBe(false);
    });

    it('should not allow viewer to manage users', () => {
      expect(canManageUsers('viewer')).toBe(false);
    });
  });

  describe('canAccessAdminPanel', () => {
    it('should allow admin to access admin panel', () => {
      expect(canAccessAdminPanel('admin')).toBe(true);
    });

    it('should not allow operator to access admin panel', () => {
      expect(canAccessAdminPanel('operator')).toBe(false);
    });

    it('should not allow viewer to access admin panel', () => {
      expect(canAccessAdminPanel('viewer')).toBe(false);
    });
  });

  describe('canViewUnits', () => {
    it('should allow all roles to view units', () => {
      expect(canViewUnits('admin')).toBe(true);
      expect(canViewUnits('operator')).toBe(true);
      expect(canViewUnits('viewer')).toBe(true);
    });
  });

  describe('canViewUsers', () => {
    it('should allow all roles to view users', () => {
      expect(canViewUsers('admin')).toBe(true);
      expect(canViewUsers('operator')).toBe(true);
      expect(canViewUsers('viewer')).toBe(true);
    });
  });

  describe('isViewerOnly', () => {
    it('should return true for viewer role', () => {
      expect(isViewerOnly('viewer')).toBe(true);
    });

    it('should return false for admin role', () => {
      expect(isViewerOnly('admin')).toBe(false);
    });

    it('should return false for operator role', () => {
      expect(isViewerOnly('operator')).toBe(false);
    });
  });

  describe('canViewAnalytics', () => {
    it('should allow all roles to view analytics', () => {
      expect(canViewAnalytics('admin')).toBe(true);
      expect(canViewAnalytics('operator')).toBe(true);
      expect(canViewAnalytics('viewer')).toBe(true);
    });
  });

  describe('canViewProtocols', () => {
    it('should allow all roles to view protocols', () => {
      expect(canViewProtocols('admin')).toBe(true);
      expect(canViewProtocols('operator')).toBe(true);
      expect(canViewProtocols('viewer')).toBe(true);
    });
  });

  describe('getPermissions', () => {
    it('should return all permissions for admin role', () => {
      const permissions = getPermissions('admin');
      expect(permissions).toEqual({
        canControlUnits: true,
        canViewSales: true,
        canViewAllUnits: true,
        canManageUnits: true,
        canManageUsers: true,
        canAccessAdminPanel: true,
        canViewUnits: true,
        canViewUsers: true,
        isViewerOnly: false,
        canViewAnalytics: true,
        canViewProtocols: true,
      });
    });

    it('should return correct permissions for operator role', () => {
      const permissions = getPermissions('operator');
      expect(permissions).toEqual({
        canControlUnits: true,
        canViewSales: false,
        canViewAllUnits: false,
        canManageUnits: false,
        canManageUsers: false,
        canAccessAdminPanel: false,
        canViewUnits: true,
        canViewUsers: true,
        isViewerOnly: false,
        canViewAnalytics: true,
        canViewProtocols: true,
      });
    });

    it('should return correct permissions for viewer role', () => {
      const permissions = getPermissions('viewer');
      expect(permissions).toEqual({
        canControlUnits: false,
        canViewSales: false,
        canViewAllUnits: false,
        canManageUnits: false,
        canManageUsers: false,
        canAccessAdminPanel: false,
        canViewUnits: true,
        canViewUsers: true,
        isViewerOnly: true,
        canViewAnalytics: true,
        canViewProtocols: true,
      });
    });
  });

  describe('getFrontendRole', () => {
    it('should map admin backend role to admin frontend role', () => {
      expect(getFrontendRole('admin')).toBe('admin');
    });

    it('should map operator backend role to user frontend role', () => {
      expect(getFrontendRole('operator')).toBe('user');
    });

    it('should map viewer backend role to user frontend role', () => {
      expect(getFrontendRole('viewer')).toBe('user');
    });
  });

  describe('getRoleDisplayName', () => {
    it('should return correct display names for roles', () => {
      expect(getRoleDisplayName('admin')).toBe('Administrator');
      expect(getRoleDisplayName('operator')).toBe('Operator');
      expect(getRoleDisplayName('viewer')).toBe('Viewer');
    });

    it('should return the role itself for unknown roles', () => {
      expect(getRoleDisplayName('unknown')).toBe('unknown');
    });
  });
});
