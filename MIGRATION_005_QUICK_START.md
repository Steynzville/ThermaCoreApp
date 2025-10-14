# Migration 005 - Quick Start Guide

## 🚀 Quick Deployment (5 Minutes)

### Prerequisites
- [ ] DATABASE_URL from Render dashboard
- [ ] PostgreSQL client (`psql`) installed

### Step 1: Set Environment Variable
```bash
export DATABASE_URL="postgresql://user:pass@host:port/database"
```

### Step 2: Navigate to Backend
```bash
cd /home/runner/work/ThermaCoreApp/ThermaCoreApp/backend
```

### Step 3: Run Deployment Script
```bash
bash deploy_migration_005.sh
```

The script will:
- ✅ Check database connectivity
- ✅ Verify current state
- ✅ Apply migration 005 (if needed)
- ✅ Verify the migration
- ✅ Test password hash functionality

### Step 4: Test Authentication
```bash
# Test at: https://thermacoreapp.netlify.app
# Username: Steyn_Admin
# Password: password
```

---

## ✅ Success Indicators

You should see:
```
✅ Migration 005 applied
✅ password_hash is now TEXT
✅ Migration recorded in migration_history
✅ Python verification passed
```

---

## 🐛 Quick Troubleshooting

### Problem: "DATABASE_URL not set"
```bash
export DATABASE_URL="postgresql://..."
```

### Problem: "Cannot connect to database"
- Check DATABASE_URL is correct
- Verify network connectivity
- Ensure database is running

### Problem: "users table does not exist"
```bash
bash apply_migrations.sh  # Apply all migrations
```

---

## 📚 Detailed Guides

For more information, see:
- **Full Deployment Guide:** [MIGRATION_005_PRODUCTION_DEPLOYMENT.md](MIGRATION_005_PRODUCTION_DEPLOYMENT.md)
- **Original Documentation:** [PASSWORD_HASH_MIGRATION_FIX.md](PASSWORD_HASH_MIGRATION_FIX.md)
- **Production Setup:** [PRODUCTION_DATABASE_SETUP.md](PRODUCTION_DATABASE_SETUP.md)

---

## 🧪 Testing Before Production

Want to test first? Run:
```bash
python backend/test_migration_005.py
```

This validates:
- Scripts exist and are syntactically correct
- Database connectivity works
- Current database state
- Migration is ready to apply

---

## ⏱️ Timeline

- **Pre-checks:** 1 minute
- **Migration:** 1 minute
- **Verification:** 2 minutes
- **Testing:** 1 minute
- **Total:** ~5 minutes

---

## 📞 Need Help?

1. Check logs: `bash deploy_migration_005.sh`
2. Run tests: `python test_migration_005.py`
3. Verify manually: `python verify_password_hash_migration.py`
4. Review troubleshooting in main guide

---

**Last Updated:** 2025-10-14
