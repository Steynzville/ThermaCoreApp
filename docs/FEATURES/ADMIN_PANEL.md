# Admin Panel Guide

> **Last Updated**: October 2024  
> **Status**: Production-Ready

Complete guide to the ThermaCoreApp administrative interface for system management and configuration.

## Table of Contents

1. [Overview](#overview)
2. [Accessing Admin Panel](#accessing-admin-panel)
3. [User Management](#user-management)
4. [Role & Permission Management](#role--permission-management)
5. [System Configuration](#system-configuration)
6. [Monitoring & Logs](#monitoring--logs)
7. [Maintenance Operations](#maintenance-operations)

---

## Overview

The Admin Panel provides comprehensive system administration capabilities:

- **User Management** - Create, edit, approve, and manage user accounts
- **Role Management** - Configure roles and permissions
- **Unit Management** - Add and configure industrial units
- **System Monitoring** - View logs, metrics, and system health
- **Configuration** - Manage system settings and protocols
- **Audit Logs** - Review system activity and security events

---

## Accessing Admin Panel

### Requirements

- **Role**: Admin
- **Permissions**: `admin_panel` permission
- **Login**: Valid admin credentials

### Access URL

**Development**: `http://localhost:5173/admin`  
**Production**: `https://yourdomain.com/admin`

### Navigation

```
Dashboard
├── Users
│   ├── All Users
│   ├── Pending Approvals
│   ├── Create New User
│   └── Roles & Permissions
├── Units
│   ├── All Units
│   ├── Add Unit
│   └── Protocol Configuration
├── System
│   ├── Settings
│   ├── Health Status
│   ├── Audit Logs
│   └── Maintenance
└── Analytics
    ├── User Statistics
    ├── Unit Performance
    └── System Metrics
```

---

## User Management

### View All Users

**Location**: Admin Panel → Users → All Users

**Features**:
- Searchable/filterable user list
- Sort by name, role, company, status
- Quick actions (edit, activate/deactivate, delete)
- Bulk operations

**Filters**:
- **Role**: Admin, Operator, Viewer
- **Status**: Active, Inactive, Pending
- **Company**: Filter by company name
- **Date Range**: Registration date

### Create New User

**Location**: Admin Panel → Users → Create New User

**Form Fields**:

```
┌─────────────────────────────────────────┐
│ Create New User                         │
├─────────────────────────────────────────┤
│ Username*          [____________]       │
│ Email*             [____________]       │
│ Temporary Password [____________]       │
│                                         │
│ First Name         [____________]       │
│ Last Name          [____________]       │
│ Phone Number       [____________]       │
│                                         │
│ Company            [____________]       │
│ Department         [____________]       │
│ Position           [____________]       │
│                                         │
│ Role*              [▼ Operator   ]      │
│                                         │
│ □ Require password change on first login│
│ ☑ Send welcome email                   │
│ ☑ Activate immediately                 │
│                                         │
│ [Cancel]                    [Create User]│
└─────────────────────────────────────────┘
```

**Validation**:
- Username: Unique, 3-80 characters
- Email: Valid format, unique
- Password: Meets security requirements
- Role: Must select valid role

**API Call**:
```javascript
const createUser = async (userData) => {
  const response = await fetch('/api/v1/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      first_name: userData.firstName,
      last_name: userData.lastName,
      phone_number: userData.phoneNumber,
      company: userData.company,
      department: userData.department,
      position: userData.position,
      role_id: userData.roleId,
      is_active: userData.activateImmediately
    })
  });

  return await response.json();
};
```

### Edit User

**Location**: Click "Edit" on user row

**Editable Fields**:
- Personal information (name, phone, email)
- Company information
- Role assignment
- Active status
- Password reset

**Prohibited Changes**:
- Cannot change own role (prevents privilege escalation)
- Cannot deactivate last admin account
- Cannot delete emergency admin

### Approve Pending Users

**Location**: Admin Panel → Users → Pending Approvals

**Process**:
1. Review user registration details
2. Verify company/department information
3. Assign appropriate role
4. Approve or reject

**Bulk Approval**:
```javascript
const approveBulk = async (userIds, roleId) => {
  await fetch('/api/v1/users/batch/approve', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_ids: userIds,
      role_id: roleId,
      send_email: true
    })
  });
};
```

### Deactivate/Delete Users

**Deactivate**:
- Sets `is_active = false`
- User cannot login
- Data retained
- Can be reactivated

**Delete** (Soft Delete):
- Marks as deleted
- Data retained for audit
- Cannot login
- Irreversible without database access

**Bulk Operations**:
```javascript
// Deactivate multiple users
const deactivateUsers = async (userIds) => {
  await fetch('/api/v1/users/batch/deactivate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ user_ids: userIds })
  });
};
```

---

## Role & Permission Management

### View Roles

**Location**: Admin Panel → Users → Roles & Permissions

**Default Roles**:

| Role | Description | User Count | Actions |
|------|-------------|------------|---------|
| Admin | Full system access | 5 | Edit |
| Operator | Operational access | 45 | Edit |
| Viewer | Read-only access | 20 | Edit |

### Edit Role Permissions

**Location**: Click "Edit" on role

**Permission Categories**:

```
┌─────────────────────────────────────────┐
│ Edit Role: Operator                     │
├─────────────────────────────────────────┤
│ Basic Information                       │
│ Name:        [Operator          ]       │
│ Description: [Operational access]       │
│                                         │
│ Permissions:                            │
│                                         │
│ Units & Sensors                         │
│ ☑ Read units                            │
│ ☑ Write units                           │
│ ☑ Control units                         │
│ ☑ Read sensors                          │
│ ☑ Write sensors                         │
│                                         │
│ Analytics                               │
│ ☑ Read analytics                        │
│ □ Export data                           │
│                                         │
│ User Management                         │
│ □ Read users                            │
│ □ Write users                           │
│ □ Delete users                          │
│                                         │
│ Administration                          │
│ □ Admin panel access                    │
│ □ System settings                       │
│ □ View audit logs                       │
│                                         │
│ [Cancel]                   [Save Changes]│
└─────────────────────────────────────────┘
```

### Create Custom Role

**Steps**:
1. Click "Create New Role"
2. Enter role name and description
3. Select permissions from checklist
4. Save role
5. Assign users to new role

**Example - Custom Role "Field Engineer"**:
```json
{
  "name": "field_engineer",
  "description": "Field engineers with limited admin access",
  "permissions": [
    "read_units",
    "write_units",
    "control_units",
    "read_sensors",
    "write_sensors",
    "read_analytics",
    "acknowledge_alarms"
  ]
}
```

---

## System Configuration

### General Settings

**Location**: Admin Panel → System → Settings

**Configurable Options**:

```
┌─────────────────────────────────────────┐
│ System Settings                         │
├─────────────────────────────────────────┤
│ Application Settings                    │
│ Site Name:     [ThermaCore SCADA]       │
│ Contact Email: [admin@thermacore.com]   │
│ Timezone:      [▼ UTC              ]    │
│                                         │
│ Security Settings                       │
│ Session Timeout: [15] minutes           │
│ Max Login Attempts: [5]                 │
│ Password Expiry: [90] days              │
│ □ Require 2FA for admins                │
│ ☑ Enable audit logging                  │
│                                         │
│ Registration Settings                   │
│ ☑ Allow self-registration               │
│ ☑ Require admin approval                │
│ Default Role: [▼ Viewer           ]     │
│                                         │
│ Email Settings                          │
│ SMTP Server:   [smtp.gmail.com    ]     │
│ SMTP Port:     [587               ]     │
│ ☑ Use TLS                               │
│ From Address:  [noreply@...]       │
│                                         │
│ [Test Email] [Reset to Defaults] [Save] │
└─────────────────────────────────────────┘
```

### Protocol Configuration

**MQTT Settings**:
```
Broker Host:     [broker.example.com]
Port:            [8883]
☑ Use TLS
Username:        [thermacore_mqtt]
Password:        [●●●●●●●●●●●●]
Client ID:       [thermacore_client]
```

**OPC UA Settings**:
```
Server URL:      [opc.tcp://192.168.1.50:4840]
Security Policy: [▼ Basic256Sha256]
Certificate:     [📄 cert.pem] [Upload]
Private Key:     [📄 key.pem] [Upload]
```

---

## Monitoring & Logs

### System Health Dashboard

**Location**: Admin Panel → System → Health Status

**Metrics**:
```
┌─────────────────────────────────────────┐
│ System Health                           │
├─────────────────────────────────────────┤
│ Status: 🟢 Healthy                      │
│ Uptime: 15 days 6 hours 23 minutes      │
│                                         │
│ Services:                               │
│ ✅ Database         Connected           │
│ ✅ MQTT Broker      Connected (15 msg/s)│
│ ✅ OPC UA Server    Connected           │
│ ✅ WebSocket        23 clients connected│
│ ⚠️  Modbus RTU      Disconnected        │
│                                         │
│ Resources:                              │
│ CPU Usage:    [████░░░░░░] 45%          │
│ Memory Usage: [██████░░░░] 62%          │
│ Disk Usage:   [███░░░░░░░] 34%          │
│                                         │
│ Active Users: 15                        │
│ Active Units: 23 / 25                   │
│ Alerts:       3 active                  │
└─────────────────────────────────────────┘
```

### Audit Logs

**Location**: Admin Panel → System → Audit Logs

**Filterable Events**:
- User login/logout
- User creation/modification
- Permission changes
- Unit configuration changes
- System setting modifications
- Failed login attempts
- API access

**Log Entry Example**:
```
┌──────────────────────────────────────────────────┐
│ 2024-10-23 10:30:15 | INFO | LOGIN_SUCCESS      │
├──────────────────────────────────────────────────┤
│ User:       john.doe (ID: 15)                    │
│ Action:     Successful login                     │
│ IP Address: 192.168.1.105                        │
│ User Agent: Mozilla/5.0...                       │
│ Location:   New York, US                         │
│ Details:    First login from this IP             │
└──────────────────────────────────────────────────┘
```

**Export Logs**:
```javascript
// Export audit logs to CSV
const exportLogs = async (startDate, endDate) => {
  const response = await fetch(
    `/api/v1/admin/audit-logs/export?start=${startDate}&end=${endDate}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-logs-${startDate}-${endDate}.csv`;
  a.click();
};
```

---

## Maintenance Operations

### Database Maintenance

**Location**: Admin Panel → System → Maintenance

**Operations**:

1. **Backup Database**
   ```
   [Backup Now] Last backup: 2024-10-22 02:00:00
   □ Include user data
   □ Include sensor readings (large)
   ☑ Compress backup
   ```

2. **Optimize Database**
   ```
   [Optimize] Last optimized: 2024-10-20 03:00:00
   - Rebuild indexes
   - Vacuum tables
   - Update statistics
   ```

3. **Clean Old Data**
   ```
   Delete sensor readings older than: [90] days
   Delete audit logs older than: [180] days
   [Clean Now]
   ```

### System Updates

**Check for Updates**:
```
Current Version: v2.5.1
Latest Version:  v2.5.3 (New features available!)

[View Changelog] [Update Now]
```

### Emergency Operations

**Reset Admin Password**:
```
Emergency Admin Username: [emergency_admin]
New Password: [●●●●●●●●●●●●]
[Reset Password]
```

**Clear All Sessions**:
```
⚠️  This will log out all users
[Clear All Sessions]
```

**Restart Services**:
```
Select service to restart:
□ MQTT Service
□ OPC UA Service
□ WebSocket Service
□ All Services

[Restart Selected]
```

---

**Related Documentation:**
- [User Management](USER_MANAGEMENT.md)
- [Authentication](AUTHENTICATION.md)
- [API Reference](../DEVELOPMENT/API_REFERENCE.md)

*Last Updated: October 2024*
