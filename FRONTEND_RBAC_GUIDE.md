# Frontend RBAC Implementation Guide

## Overview

The frontend has been enhanced to support the backend's 3-role system (admin, operator, viewer) while maintaining a simple admin/user UI concept. This document explains how the RBAC system works and how to use it.

## Role Architecture

### Backend Roles
The backend defines three distinct roles:
- **admin**: Full system access (ThermaCore staff only)
- **operator**: Remote control + operational access (client power users)
- **viewer**: Read-only access (client read-only users)

### Frontend Roles
The frontend maintains a simple two-role concept for UI consistency:
- **admin**: Administrator users (maps to backend admin role)
- **user**: Regular users (maps to backend operator OR viewer roles)

### How It Works

The frontend stores both the frontend role (admin/user) and the backend role (admin/operator/viewer). Permission checks use the backend role to determine what a user can do, while the frontend role is used for UI layout decisions.

```javascript
// Example user context structure
{
  user: {
    username: 'john.doe',
    role: 'user',           // Frontend role (admin or user)
    backendRole: 'operator', // Backend role (admin, operator, or viewer)
    email: 'john@example.com'
  },
  permissions: {
    canControlUnits: true,      // Operator can control units
    canViewSales: false,         // Operator cannot view sales
    canViewAllUnits: false,      // Operator sees limited units
    canManageUsers: false,       // Only admin can manage users
    canAccessAdminPanel: false,  // Only admin can access admin panel
    // ... more permissions
  }
}
```

## Permission Functions

All permission checks should use the centralized functions in `src/utils/permissions.js`:

### Available Permission Functions

```javascript
import {
  canControlUnits,      // Check if user can remotely control units
  canViewSales,         // Check if user can view sales/analytics
  canViewAllUnits,      // Check if user can see all units vs limited
  canManageUnits,       // Check if user can create/modify/delete units
  canManageUsers,       // Check if user can create/modify/delete users
  canAccessAdminPanel,  // Check if user can access admin panel
  canViewUnits,         // Check if user can view units (all roles)
  canViewUsers,         // Check if user can view user info (all roles)
  isViewerOnly,         // Check if user has viewer-only access
  getPermissions,       // Get all permissions for a role
  getFrontendRole,      // Convert backend role to frontend role
  getRoleDisplayName    // Get user-friendly role name
} from '../utils/permissions';
```

### Using Permissions in Components

#### Example 1: Conditional Rendering Based on Permissions

```javascript
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { permissions } = useAuth();

  return (
    <div>
      {/* Show admin panel link only if user has access */}
      {permissions?.canAccessAdminPanel && (
        <Link to="/admin">Admin Panel</Link>
      )}

      {/* Show remote control only if user can control units */}
      {permissions?.canControlUnits && (
        <RemoteControlButton unitId={unitId} />
      )}

      {/* Show sales analytics only to admins */}
      {permissions?.canViewSales && (
        <Link to="/analytics">Sales Analytics</Link>
      )}
    </div>
  );
};
```

#### Example 2: Filtering Data Based on Permissions

```javascript
import { useAuth } from '../context/AuthContext';

const UnitsList = () => {
  const { permissions } = useAuth();
  const { units } = useUnits();

  // Admins see all units, others see limited units
  const visibleUnits = useMemo(() => {
    return permissions?.canViewAllUnits 
      ? units 
      : units.slice(0, 6);
  }, [units, permissions]);

  return (
    <div>
      {visibleUnits.map(unit => (
        <UnitCard key={unit.id} unit={unit} />
      ))}
    </div>
  );
};
```

#### Example 3: Using Permission Functions Directly

```javascript
import { canControlUnits } from '../utils/permissions';

const handleRemoteControl = (backendRole) => {
  if (!canControlUnits(backendRole)) {
    toast.error('You do not have permission to control units');
    return;
  }
  
  // Proceed with remote control
  performRemoteControl();
};
```

## Permission Matrix

| Permission | Admin | Operator | Viewer | Description |
|-----------|-------|----------|--------|-------------|
| `canControlUnits` | ✓ | ✓ | ✗ | Remote control unit operations |
| `canViewSales` | ✓ | ✗ | ✗ | View sales data and analytics |
| `canViewAllUnits` | ✓ | ✗ | ✗ | View all units vs limited set |
| `canManageUnits` | ✓ | ✗ | ✗ | Create, modify, delete units |
| `canManageUsers` | ✓ | ✗ | ✗ | Create, modify, delete users |
| `canAccessAdminPanel` | ✓ | ✗ | ✗ | Access admin panel |
| `canViewUnits` | ✓ | ✓ | ✓ | View unit information |
| `canViewUsers` | ✓ | ✓ | ✓ | View user information |
| `isViewerOnly` | ✗ | ✗ | ✓ | Read-only access |

## AuthContext API

The `AuthContext` provides the following values:

```javascript
const {
  user,           // User object with profile information
  userRole,       // Frontend role: 'admin' or 'user'
  backendRole,    // Backend role: 'admin', 'operator', or 'viewer'
  permissions,    // Object with all permission flags
  login,          // Login function
  logout,         // Logout function
  isAuthenticated, // Boolean indicating if user is logged in
  isLoading,      // Boolean indicating if auth state is loading
  isLoggingOut    // Boolean indicating if logout is in progress
} = useAuth();
```

## Migration Guide

### Before (Direct Role Checks)

```javascript
// ❌ Old way - direct role comparison
const Dashboard = ({ userRole }) => {
  const quickActions = [
    { name: "Sales", link: "/analytics" },
    { name: "Admin", link: "/admin", adminOnly: true }
  ];

  return (
    <div>
      {quickActions.map(action => {
        if (action.adminOnly && userRole !== 'admin') {
          return null;
        }
        return <ActionTile key={action.name} action={action} />;
      })}
    </div>
  );
};
```

### After (Permission-Based Checks)

```javascript
// ✅ New way - permission-based
const Dashboard = () => {
  const { permissions } = useAuth();
  
  const quickActions = [
    { name: "Sales", link: "/analytics", requiresSales: true },
    { name: "Admin", link: "/admin", requiresAdminPanel: true }
  ];

  return (
    <div>
      {quickActions.map(action => {
        if (action.requiresSales && !permissions?.canViewSales) {
          return null;
        }
        if (action.requiresAdminPanel && !permissions?.canAccessAdminPanel) {
          return null;
        }
        return <ActionTile key={action.name} action={action} />;
      })}
    </div>
  );
};
```

## Backend Integration

### Login Response

When a user logs in, the backend returns their role:

```javascript
{
  "success": true,
  "data": {
    "access_token": "...",
    "user": {
      "id": 1,
      "username": "john.doe",
      "email": "john@example.com",
      "role": "operator",  // Backend role (admin/operator/viewer)
      "first_name": "John",
      "last_name": "Doe"
    }
  }
}
```

The frontend automatically:
1. Extracts the backend role (`operator`)
2. Maps it to frontend role (`user`)
3. Computes permissions based on backend role
4. Stores everything in context and localStorage

### API Endpoints

The backend enforces RBAC through decorators:

```python
# Backend permission enforcement
@jwt_required()
@permission_required('remote_control')
def control_unit_power():
    # Only admin and operator can access this endpoint
    pass
```

The frontend should still check permissions for better UX, but the backend is the source of truth for security.

## Testing

### Unit Tests

Test permission functions:

```javascript
import { canControlUnits, getPermissions } from '../utils/permissions';

describe('Permission Functions', () => {
  it('should allow admin to control units', () => {
    expect(canControlUnits('admin')).toBe(true);
  });

  it('should allow operator to control units', () => {
    expect(canControlUnits('operator')).toBe(true);
  });

  it('should not allow viewer to control units', () => {
    expect(canControlUnits('viewer')).toBe(false);
  });

  it('should return correct permissions for operator', () => {
    const permissions = getPermissions('operator');
    expect(permissions.canControlUnits).toBe(true);
    expect(permissions.canViewSales).toBe(false);
  });
});
```

### Integration Tests

Test components with different roles:

```javascript
import { render } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext';

// Mock auth context with specific role
const mockAuthContext = (backendRole) => ({
  user: { username: 'test', backendRole },
  permissions: getPermissions(backendRole),
  // ... other context values
});

it('should show remote control for operator', () => {
  const { getByText } = render(
    <AuthProvider value={mockAuthContext('operator')}>
      <RemoteControlPanel />
    </AuthProvider>
  );
  
  expect(getByText('Remote Control')).toBeInTheDocument();
});
```

## Best Practices

1. **Always use permission functions** instead of direct role comparisons
2. **Use `permissions` from context** rather than checking `backendRole` directly
3. **Maintain backward compatibility** with `userRole` for existing code
4. **Check permissions in UI** for better UX, but trust backend for security
5. **Use descriptive permission names** that clearly indicate what they control
6. **Handle null/undefined permissions** gracefully with optional chaining

## Troubleshooting

### Issue: Permissions not updating after login

**Solution**: Ensure you're using the latest auth context values:

```javascript
const { permissions, backendRole } = useAuth();

// Permissions should automatically update when backendRole changes
useEffect(() => {
  console.log('Current permissions:', permissions);
}, [permissions]);
```

### Issue: User sees features they shouldn't have access to

**Solution**: Check that:
1. The backend role is correctly set in the login response
2. Permission functions are being used correctly
3. Backend endpoints have proper authorization decorators

### Issue: Tests failing after RBAC update

**Solution**: Update tests to provide permissions:

```javascript
// Old test
const { result } = renderHook(() => useAuth(), {
  wrapper: AuthProvider
});

// New test - provide permissions
const mockPermissions = getPermissions('operator');
const { result } = renderHook(() => useAuth(), {
  wrapper: ({ children }) => (
    <AuthProvider value={{ permissions: mockPermissions }}>
      {children}
    </AuthProvider>
  )
});
```

## Summary

The RBAC system provides:
- ✅ Granular permission control based on backend roles
- ✅ Simple admin/user UI concept maintained
- ✅ Centralized permission logic
- ✅ Full backward compatibility
- ✅ Consistent permission checking across components
- ✅ Type-safe permission functions
- ✅ Comprehensive test coverage

For questions or issues, refer to the backend RBAC documentation at `backend/RBAC_COVERAGE_DOCUMENTATION.md`.
