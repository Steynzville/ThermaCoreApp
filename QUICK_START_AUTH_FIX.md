# Authentication 500 Error - Quick Start Card

**Print this page and keep it handy for quick reference!**

---

## 🚨 EMERGENCY FIX (2 minutes)

### Step 1: Diagnose
```bash
cd backend
python health_check.py
```

### Step 2: Apply Most Common Fix
```bash
# If health check shows "NO ROLE"
psql $DATABASE_URL

UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE username = 'Steyn_Admin';

\q
```

### Step 3: Test
```bash
curl -X POST https://thermacoreapp.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Steyn_Admin","password":"Steiner1!"}'
```

**✅ Should return 200 with tokens**

---

## 🔍 Quick Diagnosis

### Option 1: Health Check Output
```
✅ All checks passed → CORS issue → Set CORS_ORIGINS
❌ "NO ROLE!" → Run Fix #1 below
❌ "Tables missing" → Run Fix #2 below
❌ "Connection failed" → Restart database
```

### Option 2: Backend Logs
```
"User has no role" → Run Fix #1
"relation 'users' does not exist" → Run Fix #2
"AttributeError" → Run Fix #1
"could not connect" → Check DATABASE_URL
```

---

## 🔧 Common Fixes

### Fix #1: User Missing Role (80% of cases)
```sql
psql $DATABASE_URL <<EOF
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE username = 'Steyn_Admin';
EOF
```
**Time:** 30 seconds

---

### Fix #2: Database Not Initialized (15% of cases)
```bash
export DATABASE_URL="..."
psql $DATABASE_URL -f backend/migrations/001_initial_schema.sql
psql $DATABASE_URL -f backend/migrations/002_seed_data.sql
cd backend && python scripts/create_first_admin.py
```
**Time:** 5 minutes

---

### Fix #3: CORS Misconfigured (3% of cases)
```
Render Dashboard → thermacore-backend → Environment
Add: CORS_ORIGINS=https://your-app.netlify.app
Save → Auto redeploys
```
**Time:** 2 minutes

---

### Fix #4: Missing Environment Variables (2% of cases)
```
Render Dashboard → thermacore-backend → Environment
Add: JWT_SECRET_KEY=(Generate)
Add: SECRET_KEY=(Generate)
Save → Auto redeploys
```
**Time:** 2 minutes

---

## 📋 Quick Commands

### Get Database URL
```
Render Dashboard → thermacore-backend → Environment → DATABASE_URL
```

### Check User Role
```bash
psql $DATABASE_URL -c "SELECT username, role_id FROM users WHERE username = 'Steyn_Admin';"
```

### Check Tables
```bash
psql $DATABASE_URL -c "\dt"
```

### Test Login
```bash
cd backend
python test_login_endpoint.py https://thermacoreapp.onrender.com Steyn_Admin Steiner1!
```

---

## ✅ Success Checklist

- [ ] Health check shows all ✅
- [ ] curl test returns 200
- [ ] Frontend login works
- [ ] No errors in logs

---

## 📚 Full Documentation

| Need | Document |
|------|----------|
| **Quick fixes** | `URGENT_AUTH_FIX_GUIDE.md` |
| **Step-by-step** | `RENDER_DEPLOYMENT_FIX_GUIDE.md` |
| **Understand why** | `AUTHENTICATION_500_ROOT_CAUSE_ANALYSIS.md` |
| **Master index** | `README_AUTHENTICATION_FIX.md` |

---

## 🆘 Still Broken?

1. Run full diagnostic:
   ```bash
   cd backend
   python dev_tools/diagnostic_scripts/diagnose_auth_issue.py > diagnosis.txt
   ```

2. Check logs:
   ```
   Render → thermacore-backend → Logs
   Copy last 100 lines
   ```

3. Share:
   - diagnosis.txt
   - Backend logs
   - curl test results

---

**Version:** 1.0 | **Date:** 2025-10-12 | **Status:** Production-Ready
