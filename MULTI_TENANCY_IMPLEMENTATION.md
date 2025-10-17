# Multi-Tenancy Implementation for ThermaCore SCADA

This document describes the multi-tenancy (client-based data isolation) feature implemented for the ThermaCore SCADA platform.

## Overview

The system now supports multiple client organizations with data isolation. Users can only access data (units and users) from their assigned client, except for admin users who have access to all data.

## Key Features

### 1. Client Model
- New `Client` model representing client organizations
- Fields: name, description, contact info, is_active, timestamps
- Accessible via `/api/v1/clients` endpoints (admin only)

### 2. User-Client Association
- Users have a `client_id` field (nullable)
- Admin users: `client_id = NULL` → can see all data
- Client users: `client_id = <client_id>` → can only see their client's data
- New helper method: `user.is_admin()` checks if user is admin

### 3. Unit-Client Association
- Units have a required `client_id` field
- Each unit belongs to exactly one client
- Client users can only see/modify units from their client
- Admin users can see/modify all units

### 4. Data Isolation Middleware
- `apply_client_filter(query, model_class)` - automatically filters queries by client
- `get_current_user()` - retrieves current authenticated user
- `check_client_access(client_id)` - verifies if user can access a client's data

## API Changes

### Client Management Endpoints (Admin Only)
```
GET    /api/v1/clients           - List all clients
GET    /api/v1/clients/:id       - Get client details
POST   /api/v1/clients           - Create new client
PUT    /api/v1/clients/:id       - Update client
DELETE /api/v1/clients/:id       - Deactivate client
```

### Updated Endpoints
All endpoints now respect client isolation:
- `/api/v1/units` - Returns only units from user's client (or all for admin)
- `/api/v1/users` - Returns only users from user's client (or all for admin)
- `/api/v1/units/:id` - Returns 403 if unit belongs to different client
- `/api/v1/users/:id` - Returns 403 if user belongs to different client

### User Creation
The `/api/v1/auth/register` endpoint now accepts `client_id`:
```json
{
  "username": "operator1",
  "email": "operator@client.com",
  "password": "password123",
  "role_id": 2,
  "client_id": 1  // Required for non-admin users, null for admin
}
```

## Permission Matrix

| Action           | ThermaCore Admin | Client Operator | Client Viewer |
|------------------|------------------|-----------------|---------------|
| View units       | All clients      | Own client only | Own client only |
| Modify units     | All clients      | Own client only | ❌            |
| View users       | All clients      | Own client only | Own client only |
| Manage users     | All clients      | ❌              | ❌            |
| Manage clients   | ✅               | ❌              | ❌            |
| Remote control   | All clients      | Own client only | ❌            |

## Frontend Changes

### User Creation Form
- New client dropdown appears when creating non-admin users
- Admin users don't get assigned a client
- Client selection is mandatory for operator/viewer roles
- Clear info message explains admin user privileges

### User Display
- User list shows client information (if applicable)
- Client users only see other users from their client
- Admin users see all users

## Database Schema

### New Table: clients
```sql
CREATE TABLE clients (
    id INTEGER PRIMARY KEY,
    name VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    contact_name VARCHAR(200),
    contact_email VARCHAR(120),
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Updated Table: users
```sql
ALTER TABLE users ADD COLUMN client_id INTEGER REFERENCES clients(id);
-- NULL for admin users, required for client users
```

### Updated Table: units
```sql
ALTER TABLE units ADD COLUMN client_id INTEGER NOT NULL REFERENCES clients(id);
-- Required for all units
```

## Testing

New test suite: `test_client_isolation.py` with 10 tests covering:
- Admin can see all data
- Client users can only see their client's data
- Client CRUD operations
- User-client assignment during creation
- Permission checks for cross-client access

Run tests:
```bash
pytest app/tests/test_client_isolation.py -v
```

## Migration Notes

For existing deployments:

1. **Create default client**: Create a "Default Client" for existing data
2. **Assign existing units**: Update all units to have `client_id`
3. **Assign existing users**: 
   - Admin users: keep `client_id = NULL`
   - Other users: assign to default client
4. **Test isolation**: Verify data isolation works correctly

## Security Considerations

1. **SQL Injection**: All client_id parameters are validated and parameterized
2. **Authorization**: Every endpoint checks both role permissions and client access
3. **Admin Bypass**: Admin users (client_id=NULL) explicitly bypass filters
4. **Audit Trail**: All client-related operations are logged via audit middleware

## Future Enhancements

1. **Multi-client users**: Allow users to belong to multiple clients
2. **Client hierarchies**: Support parent-child client relationships
3. **Cross-client reporting**: Admin dashboard with multi-client analytics
4. **Client-specific configs**: Per-client settings and customizations
5. **Billing integration**: Track usage per client for billing purposes
