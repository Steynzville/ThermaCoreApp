# Production Database Setup & Migration Guide

## 🎯 Overview

This guide provides step-by-step instructions for setting up and maintaining the ThermaCore production database, including all necessary migrations.

---

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] PostgreSQL database instance (with TimescaleDB extension)
- [ ] Database connection URL (DATABASE_URL)
- [ ] `psql` client installed
- [ ] Access to the backend codebase

---

## 🚀 Initial Database Setup (New Deployments)

### Step 1: Set Environment Variables

```bash
# Required for all operations
export DATABASE_URL="postgresql://user:password@host:port/database"

# Required for admin user creation
export JWT_SECRET_KEY="your-jwt-secret-key"
export SECRET_KEY="your-secret-key"
```

### Step 2: Apply All Migrations

**Option A: Use Migration Script (Recommended)**

```bash
cd backend
bash apply_migrations.sh
```

The script will:
- ✅ Create migration tracking table
- ✅ Apply all 5 migrations in correct order
- ✅ Verify critical schema changes
- ✅ Provide detailed output

**Option B: Manual Application**

```bash
cd backend/migrations

# Apply migrations in order
psql $DATABASE_URL -f 001_initial_schema.sql
psql $DATABASE_URL -f 002_seed_data.sql
psql $DATABASE_URL -f 003_update_rbac_security.sql
psql $DATABASE_URL -f 004_fix_null_roles.sql
psql $DATABASE_URL -f 005_fix_password_hash_length.sql
```

### Step 3: Create Admin User

```bash
cd backend
python scripts/create_first_admin.py
```

Default credentials:
- Username: `Steyn_Admin`
- Password: `Steiner1!`

**⚠️ Change the password after first login!**

### Step 4: Verify Setup

```bash
cd backend
python verify_password_hash_migration.py
```

Expected output:
```
✅ SUCCESS: password_hash is correctly set to TEXT
✅ Password hash stored successfully without truncation
✅ Password verification works correctly
```

---

## 🔄 Existing Database Migration (Production Fix)

If your production database is already running but missing migrations:

### Step 1: Check Current State

```bash
# Connect to database
psql $DATABASE_URL

-- Check users table
\d users

-- Look at password_hash column
-- If it shows VARCHAR(128) → Migration 005 NOT applied
-- If it shows TEXT → Migration 005 already applied
```

### Step 2: Apply Missing Migrations

```bash
cd backend
bash apply_migrations.sh
```

The script automatically detects and applies only missing migrations.

### Step 3: Verify Fix

```bash
python verify_password_hash_migration.py
```

---

## 📊 Migration Details

### Migration 001: Initial Schema
**File:** `001_initial_schema.sql`  
**Purpose:** Creates all tables and TimescaleDB hypertable

Creates:
- `permissions` table
- `roles` table
- `role_permissions` junction table
- `users` table (⚠️ with VARCHAR(128) password_hash)
- `units` table
- `sensors` table
- `sensor_readings` table (TimescaleDB hypertable)
- Indexes and triggers

### Migration 002: Seed Data
**File:** `002_seed_data.sql`  
**Purpose:** Populates default roles and permissions

Adds:
- 3 roles (admin, operator, viewer)
- 8 permissions (read_units, write_units, etc.)
- Role-permission mappings

### Migration 003: Update RBAC Security
**File:** `003_update_rbac_security.sql`  
**Purpose:** Updates role-based access control

Updates:
- Role descriptions
- Permission assignments

### Migration 004: Fix NULL Roles
**File:** `004_fix_null_roles.sql`  
**Purpose:** Fixes users with NULL role_id

Ensures:
- All users have a valid role assigned
- Fixes historical data issues

### Migration 005: Fix Password Hash Length
**File:** `005_fix_password_hash_length.sql`  
**Purpose:** **CRITICAL** - Changes password_hash to TEXT

Changes:
```sql
ALTER TABLE users ALTER COLUMN password_hash TYPE TEXT;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
```

**Why it's needed:**
- Werkzeug/scrypt generates ~162 character hashes
- Original VARCHAR(128) truncates hashes
- Truncated hashes cause authentication failures

**Error when missing:**
```
value too long for type character varying(128)
```

---

## 🔍 Verification Procedures

### Check Migration History

```bash
psql $DATABASE_URL -c "SELECT * FROM migration_history ORDER BY applied_at;"
```

Expected output:
```
                migration_name               |         applied_at         
---------------------------------------------+----------------------------
 001_initial_schema.sql                      | 2024-10-14 10:00:00
 002_seed_data.sql                           | 2024-10-14 10:00:01
 003_update_rbac_security.sql                | 2024-10-14 10:00:02
 004_fix_null_roles.sql                      | 2024-10-14 10:00:03
 005_fix_password_hash_length.sql            | 2024-10-14 10:00:04
```

### Check Column Types

```bash
psql $DATABASE_URL << 'EOF'
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
EOF
```

Verify `password_hash` shows `text` (not `character varying`).

### Check Roles and Permissions

```bash
psql $DATABASE_URL << 'EOF'
-- Check roles exist
SELECT id, name, description FROM roles;

-- Check admin role has all permissions
SELECT COUNT(*) as permission_count 
FROM role_permissions 
WHERE role_id = (SELECT id FROM roles WHERE name = 'admin');
-- Expected: 8 permissions
EOF
```

### Test User Creation

```bash
cd backend
python verify_password_hash_migration.py
```

This creates a test user, verifies the hash length, and confirms authentication works.

---

## 🛠️ Troubleshooting

### Issue: "DATABASE_URL environment variable not set"

**Solution:**
```bash
export DATABASE_URL="postgresql://user:pass@host:port/dbname"
```

### Issue: "migration_history table does not exist"

**Solution:**
The migration script creates this automatically. If running manual migrations:
```bash
psql $DATABASE_URL << 'EOF'
CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF
```

### Issue: "relation 'users' does not exist"

**Solution:**
Database not initialized. Run all migrations:
```bash
bash backend/apply_migrations.sh
```

### Issue: "password_hash still VARCHAR(128) after migration"

**Possible causes:**
1. Connected to wrong database
2. Migration 005 failed silently
3. Multiple database instances

**Solution:**
```bash
# Verify current database
psql $DATABASE_URL -c "SELECT current_database();"

# Check migration history
psql $DATABASE_URL -c "SELECT * FROM migration_history WHERE migration_name = '005_fix_password_hash_length.sql';"

# If not present, apply manually
psql $DATABASE_URL -f backend/migrations/005_fix_password_hash_length.sql

# Verify fix
psql $DATABASE_URL -c "SELECT data_type FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash';"
```

### Issue: "value too long for type character varying(128)"

**Solution:**
Migration 005 not applied. See [PASSWORD_HASH_MIGRATION_FIX.md](PASSWORD_HASH_MIGRATION_FIX.md) for detailed fix.

Quick fix:
```bash
psql $DATABASE_URL -f backend/migrations/005_fix_password_hash_length.sql
```

---

## 🔐 Security Considerations

### Secure Password Storage

With migration 005 applied:
- ✅ Password hashes use scrypt (via Werkzeug)
- ✅ Hashes are ~162 characters
- ✅ No truncation occurs
- ✅ Authentication works reliably

### Admin User Security

After initial setup:
1. Change default admin password immediately
2. Use strong passwords (12+ characters, mixed case, numbers, symbols)
3. Disable or delete unused admin accounts
4. Review user roles and permissions regularly

### Database Access

1. Use strong database passwords
2. Restrict database access by IP
3. Use SSL/TLS for database connections
4. Regular security audits

---

## 📈 Monitoring

### Regular Health Checks

```bash
# Check database connection
cd backend
python health_check.py

# Verify critical tables
psql $DATABASE_URL -c "\dt"

# Check admin users
psql $DATABASE_URL -c "SELECT username, is_active, role_id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin');"
```

### Migration Status

```bash
# Check applied migrations
psql $DATABASE_URL -c "SELECT migration_name, applied_at FROM migration_history ORDER BY applied_at;"
```

---

## 📞 Support

### Quick Commands Reference

```bash
# Apply all migrations
bash backend/apply_migrations.sh

# Verify password_hash fix
python backend/verify_password_hash_migration.py

# Check database health
python backend/health_check.py

# Create admin user
python backend/scripts/create_first_admin.py
```

### Related Documentation

- [PASSWORD_HASH_MIGRATION_FIX.md](PASSWORD_HASH_MIGRATION_FIX.md) - Detailed password hash fix
- [RENDER_DEPLOYMENT_FIX_GUIDE.md](RENDER_DEPLOYMENT_FIX_GUIDE.md) - Render-specific deployment
- [PRODUCTION_DEPLOYMENT_VERIFICATION.md](PRODUCTION_DEPLOYMENT_VERIFICATION.md) - Verification checklist
- [backend/README.md](backend/README.md) - Backend documentation

---

## ✅ Success Checklist

Before considering your database setup complete:

- [ ] All 5 migrations applied successfully
- [ ] `migration_history` table shows all migrations
- [ ] `password_hash` column is TEXT type
- [ ] Admin user created and can login
- [ ] Verification script passes all checks
- [ ] Health check script shows all green
- [ ] Default admin password changed
- [ ] Database backups configured

---

**Last Updated:** 2025-10-14  
**Version:** 1.0
