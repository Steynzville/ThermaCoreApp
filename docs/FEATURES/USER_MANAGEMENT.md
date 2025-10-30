# User Management & RBAC

> **Last Updated**: October 2024  
> **Status**: Production-Ready

Complete guide to user management, authentication, and role-based access control (RBAC) in ThermaCoreApp.

## Table of Contents

1. [Overview](#overview)
2. [User Model](#user-model)
3. [Roles & Permissions](#roles--permissions)
4. [User Registration](#user-registration)
5. [User Management Operations](#user-management-operations)
6. [Company Identifier System](#company-identifier-system)
7. [Batch Operations](#batch-operations)
8. [Emergency Admin Access](#emergency-admin-access)
9. [Best Practices](#best-practices)

---

## Overview

ThermaCoreApp implements a comprehensive user management system with:

- **Role-Based Access Control (RBAC)** - Granular permissions per resource
- **Multi-Tenancy Support** - Company-based user segregation
- **User Profiles** - Complete user information including company details
- **Batch Operations** - Bulk user management capabilities
- **Audit Logging** - Complete tracking of user actions
- **Emergency Admin** - System recovery access

---

## User Model

### User Fields

| Field | Type | Description | Required | Indexed |
|-------|------|-------------|----------|---------|
| `id` | Integer | Primary key | Auto | Yes |
| `username` | String(80) | Unique username | Yes | Yes |
| `email` | String(120) | Unique email address | Yes | Yes |
| `password_hash` | Text | Bcrypt hashed password | Yes | No |
| `first_name` | String(100) | User's first name | No | No |
| `last_name` | String(100) | User's last name | No | No |
| `phone_number` | String(50) | Contact phone number | No | No |
| `company` | String(200) | Company/organization name | No | Yes |
| `company_identifier` | String(100) | Auto-generated company ID | No | Yes |
| `department` | String(100) | Department/division | No | No |
| `position` | String(100) | Job title/position | No | No |
| `is_active` | Boolean | Account active status | Yes | No |
| `role_id` | Integer | Foreign key to roles | Yes | Yes |
| `created_at` | Timestamp | Account creation time | Auto | No |
| `updated_at` | Timestamp | Last modification time | Auto | No |
| `last_login` | Timestamp | Last successful login | No | No |

### User Object Example

```json
{
  "id": 15,
  "username": "john.doe",
  "email": "john@abbgroup.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1234567890",
  "company": "ABB Group",
  "company_identifier": "ABBGROUP-A1B2C3D4",
  "department": "Engineering",
  "position": "Senior Engineer",
  "is_active": true,
  "role": {
    "id": 2,
    "name": "operator",
    "permissions": ["read_units", "write_units", "read_sensors"]
  },
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-10-23T09:30:00Z",
  "last_login": "2024-10-23T09:15:00Z"
}
```

---

## Roles & Permissions

### Available Roles

#### 1. Admin
**Description**: Full system access and administrative capabilities

**Permissions**:
- `read_all` - Read access to all resources
- `write_all` - Write access to all resources
- `delete_all` - Delete access to all resources
- `admin_panel` - Access to admin panel
- `manage_users` - Create, update, delete users
- `manage_roles` - Manage roles and permissions
- `view_audit_logs` - View system audit logs
- `system_settings` - Modify system settings

**Typical Users**: System administrators, IT managers

#### 2. Operator
**Description**: Operational access to manage units and sensors

**Permissions**:
- `read_units` - View unit information
- `write_units` - Modify unit configurations
- `control_units` - Send control commands
- `read_sensors` - View sensor data
- `write_sensors` - Configure sensors
- `read_analytics` - View analytics dashboards
- `acknowledge_alarms` - Acknowledge system alarms

**Typical Users**: Plant operators, field engineers

#### 3. Viewer
**Description**: Read-only access for monitoring

**Permissions**:
- `read_units` - View unit information
- `read_sensors` - View sensor data
- `read_analytics` - View analytics dashboards

**Typical Users**: Managers, stakeholders, auditors

**Note**: Viewer role users can view remote control status and unit information but cannot execute control commands such as toggling machine power, water production, or automatic controls.

### Permission Matrix

| Resource | Admin | Operator | Viewer |
|----------|-------|----------|--------|
| View Units | ✅ | ✅ | ✅ |
| Edit Units | ✅ | ✅ | ❌ |
| Delete Units | ✅ | ❌ | ❌ |
| Remote Control (Power, Water, Auto) | ✅ | ✅ | ❌ |
| View Remote Control Status | ✅ | ✅ | ✅ |
| View Sensors | ✅ | ✅ | ✅ |
| Edit Sensors | ✅ | ✅ | ❌ |
| View Analytics | ✅ | ✅ | ✅ |
| Manage Users | ✅ | ❌ | ❌ |
| Admin Panel | ✅ | ❌ | ❌ |
| Audit Logs | ✅ | ❌ | ❌ |

### Checking Permissions

**Backend (Python)**:
```python
from app.decorators import permission_required

@app.route('/api/v1/units/<int:id>', methods=['PUT'])
@jwt_required()
@permission_required('write_units')
def update_unit(id):
    # Only users with 'write_units' permission can access
    pass
```

**Frontend (JavaScript)**:
```javascript
import { useAuth } from "../context/AuthContext";
import { canControlUnits } from "../utils/permissions";

const { backendRole } = useAuth();

// Check if user can control units (machine power, water production, etc.)
const hasControlPermission = canControlUnits(backendRole);

// In component
{hasControlPermission ? (
  <AlertDialog>
    <Switch checked={powerOn} onCheckedChange={handleToggle} />
    {/* Confirmation dialog */}
  </AlertDialog>
) : (
  <Switch checked={powerOn} disabled={true} />
)}
```

### Remote Control Permissions

Remote control features (machine power, water production, automatic controls) are restricted based on user roles to ensure operational safety.

**Access Control**:
- **Admin** ✅ - Full remote control access
- **Operator** ✅ - Full remote control access
- **Viewer** ❌ - Read-only access (controls disabled)

**Implementation**:
The `canControlUnits()` permission helper function checks the user's backend role and returns `true` for Admin and Operator roles, `false` for Viewer role.

```javascript
// Located in: src/utils/permissions.js
export const canControlUnits = (backendRole) => {
  return backendRole === "admin" || backendRole === "operator";
};
```

**UI Behavior**:
- **Authorized users** (Admin/Operator): See interactive switches with confirmation dialogs
- **Unauthorized users** (Viewer): See disabled switches with current state visible

**Security**:
Permission checks occur at the component level before any control action is permitted. All control switches are disabled for Viewer role users, preventing unauthorized toggle attempts.

---

## User Registration

### Self-Registration

Users can register themselves (if enabled):

**API Endpoint**: `POST /api/v1/auth/register`

**Request**:
```json
{
  "username": "newuser",
  "email": "newuser@company.com",
  "password": "SecurePass123!",
  "first_name": "Jane",
  "last_name": "Smith",
  "phone_number": "+1234567890",
  "company": "TechCorp Inc",
  "department": "Engineering",
  "position": "Developer"
}
```

**Response**:
```json
{
  "id": 25,
  "username": "newuser",
  "company_identifier": "TECHCORPINC-X9Y8Z7W6",
  "approval_required": true,
  "message": "Registration successful. Awaiting admin approval."
}
```

**Note**: New users default to inactive status and require admin approval.

### Admin-Created Users

Admins can create users directly through the admin panel:

**API Endpoint**: `POST /api/v1/users`

**Request**:
```json
{
  "username": "operator5",
  "email": "operator5@abbgroup.com",
  "password": "TempPass123!",
  "first_name": "Mike",
  "last_name": "Johnson",
  "company": "ABB Group",
  "role_id": 2,
  "is_active": true
}
```

**Response**:
```json
{
  "id": 26,
  "message": "User created successfully",
  "temp_password": "TempPass123!",
  "password_reset_required": true
}
```

---

## User Management Operations

### List Users

**API**: `GET /api/v1/users`

**Query Parameters**:
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 20)
- `role` - Filter by role name
- `company` - Filter by company
- `is_active` - Filter by active status
- `search` - Search username/email

**Example**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/v1/users?company=ABB&is_active=true&page=1"
```

### Update User

**API**: `PUT /api/v1/users/{id}`

**Example - Update Profile**:
```bash
curl -X PUT https://api.example.com/api/v1/users/15 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+1555123456",
    "position": "Lead Engineer"
  }'
```

### Activate/Deactivate User

**Activate**:
```bash
curl -X POST https://api.example.com/api/v1/users/15/activate \
  -H "Authorization: Bearer $TOKEN"
```

**Deactivate**:
```bash
curl -X POST https://api.example.com/api/v1/users/15/deactivate \
  -H "Authorization: Bearer $TOKEN"
```

### Delete User

**API**: `DELETE /api/v1/users/{id}`

**Note**: Soft delete - sets `is_active=false` rather than removing record.

```bash
curl -X DELETE https://api.example.com/api/v1/users/15 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Company Identifier System

### Overview

Each user with a company name gets an auto-generated unique identifier for multi-tenancy support.

### Format

```
COMPANYNAME-HASH
```

Example: `ABBGROUP-A1B2C3D4`

### Generation Logic

```python
from app.utils.company_identifier import CompanyIdentifier

# Auto-generated on user creation
identifier = CompanyIdentifier.generate("ABB Group", "user@abb.com")
# Returns: "ABBGROUP-A1B2C3D4"
```

**Components**:
1. **Prefix**: Company name, uppercased, non-alphanumeric removed
2. **Hash**: First 8 chars of SHA256 hash of company+email

### Usage

**Filter users by company**:
```python
users = User.query.filter_by(company="ABB Group").all()
```

**Get users by company prefix**:
```python
users = User.query.filter(
    User.company_identifier.like("ABBGROUP%")
).all()
```

**Company statistics**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/v1/users/companies/stats
```

---

## Batch Operations

### Batch Activate Users

**API**: `POST /api/v1/users/batch/activate`

**Request**:
```json
{
  "user_ids": [15, 16, 17, 18, 19]
}
```

**Response**:
```json
{
  "activated": 5,
  "failed": [],
  "message": "5 users activated successfully"
}
```

### Batch Deactivate Users

**API**: `POST /api/v1/users/batch/deactivate`

**Request**:
```json
{
  "user_ids": [20, 21, 22]
}
```

### Batch Update Roles

**API**: `POST /api/v1/users/batch/update-role`

**Request**:
```json
{
  "user_ids": [15, 16, 17],
  "role_id": 2
}
```

**Response**:
```json
{
  "updated": 3,
  "message": "3 users updated to role 'operator'"
}
```

### Get Users by Company

**API**: `GET /api/v1/users?company=ABB Group`

**Python Helper**:
```python
from app.utils.user_batch_manager import UserBatchManager

# Get all ABB users
abb_users = UserBatchManager.get_users_by_company("ABB Group")
```

---

## Emergency Admin Access

### Overview

Emergency admin access allows system recovery when all admin accounts are locked or deleted.

### Setup Emergency Admin

**Environment Variable**:
```env
EMERGENCY_ADMIN_USERNAME=emergency_admin
EMERGENCY_ADMIN_EMAIL=emergency@thermacore.com
EMERGENCY_ADMIN_PASSWORD=ComplexPassword123!
```

**On Application Startup**:
```python
# Automatically creates/updates emergency admin
# Located in: app/utils/auto_migration.py
```

### Using Emergency Admin

1. Login with emergency admin credentials
2. Perform recovery actions:
   - Reset user passwords
   - Restore admin accounts
   - Fix permission issues
3. Deactivate emergency admin when done

**Important**: Change emergency admin password immediately after use!

---

## Best Practices

### Security

1. **Strong Passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Regular password rotation

2. **Account Lockout**
   - 5 failed login attempts → account locked
   - Requires admin reset

3. **Session Management**
   - JWT token expiry: 15 minutes (access), 7 days (refresh)
   - Token rotation on refresh
   - Logout invalidates tokens

4. **Audit Logging**
   - All user actions logged
   - Login attempts tracked
   - Permission changes recorded

### User Lifecycle

```
Registration → Approval → Activation → Active Use → Deactivation
     ↓            ↓            ↓             ↓            ↓
  (Pending)   (Inactive)   (Active)      (Active)    (Inactive)
```

### Company Management

1. **Consistent Naming**: Use standard company names
2. **Company Hierarchy**: Consider department-based organization
3. **Bulk Operations**: Use batch APIs for efficiency
4. **Regular Audits**: Review user lists monthly

### Role Assignment

1. **Principle of Least Privilege**: Assign minimum necessary permissions
2. **Role Review**: Audit roles quarterly
3. **Temporary Access**: Use time-limited role assignments when needed
4. **Documentation**: Document role assignments and reasons

---

**Related Documentation:**
- [Authentication Guide](AUTHENTICATION.md)
- [Admin Panel Guide](ADMIN_PANEL.md)
- [API Reference](../DEVELOPMENT/API_REFERENCE.md)

*Last Updated: October 2024*
