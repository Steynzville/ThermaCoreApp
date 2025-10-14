# 🚨 QUICK FIX: Password Hash Truncation Error

## Error You're Seeing

```
value too long for type character varying(128)
```

OR

- Admin user creation fails
- User authentication fails randomly
- Login works for some users but not others

---

## 5-Minute Fix

### 1. Get Your DATABASE_URL
From Render dashboard → Your Service → Environment tab → Copy DATABASE_URL

### 2. Run Migration
```bash
export DATABASE_URL="postgresql://..."  # Paste your URL here

cd backend
bash apply_migrations.sh
```

### 3. Verify
```bash
python verify_password_hash_migration.py
```

Expected: ✅ All checks pass

---

## Alternative: Manual Fix

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://..."

# Apply migration 005
psql $DATABASE_URL -f backend/migrations/005_fix_password_hash_length.sql

# Verify
psql $DATABASE_URL -c "SELECT data_type FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash';"
```

Expected output: `text`

---

## What This Does

Changes `users.password_hash` from VARCHAR(128) to TEXT, allowing password hashes of any length (scrypt generates ~162 chars).

---

## Still Having Issues?

See [PASSWORD_HASH_MIGRATION_FIX.md](PASSWORD_HASH_MIGRATION_FIX.md) for detailed troubleshooting.
