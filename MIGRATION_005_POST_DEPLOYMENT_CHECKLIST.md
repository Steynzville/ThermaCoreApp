# Migration 005 - Post-Deployment Checklist

## 📋 Immediate Verification (Within 5 minutes)

### Database Verification
- [ ] **Verify Column Type**
  ```bash
  psql "$DATABASE_URL" -c "SELECT data_type FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash';"
  ```
  Expected: `text`

- [ ] **Check Migration History**
  ```bash
  psql "$DATABASE_URL" -c "SELECT * FROM migration_history WHERE migration_name='005_fix_password_hash_length.sql';"
  ```
  Expected: One row with migration name and timestamp

- [ ] **Verify No Constraints Violated**
  ```bash
  psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users WHERE password_hash IS NULL;"
  ```
  Expected: `0` (no NULL password hashes)

### Application Verification
- [ ] **Run Verification Script**
  ```bash
  cd backend
  python verify_password_hash_migration.py
  ```
  Expected: All green checkmarks

- [ ] **Run Health Check**
  ```bash
  cd backend
  python health_check.py
  ```
  Expected: All checks pass

### Admin User Verification
- [ ] **Test Admin User Creation** (if no admin exists)
  ```bash
  cd backend
  export JWT_SECRET_KEY="your-jwt-secret"
  export SECRET_KEY="your-secret-key"
  python scripts/create_first_admin.py
  ```
  Expected: Admin user created successfully OR "Admin user already exists"

- [ ] **Test Admin Login via Frontend**
  1. Go to https://thermacoreapp.netlify.app
  2. Click Login
  3. Enter:
     - Username: `Steyn_Admin`
     - Password: `password` (or your actual password)
  4. Click Submit
  
  Expected: ✅ Login successful, redirected to dashboard

- [ ] **Test Admin Login via API**
  ```bash
  curl -X POST https://your-app.onrender.com/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"Steyn_Admin","password":"password"}'
  ```
  Expected: 200 OK with access_token and refresh_token

---

## 📊 Ongoing Monitoring (First 15 minutes)

### Error Log Monitoring
- [ ] **Check Application Logs on Render**
  1. Go to Render dashboard
  2. Open your backend service
  3. Click on "Logs" tab
  4. Monitor for errors

- [ ] **Check for Truncation Errors**
  Look for: `value too long for type character varying`
  Expected: ❌ No such errors (issue should be resolved)

- [ ] **Check for Authentication Errors**
  Look for: `Invalid password`, `User not found`, `Authentication failed`
  Expected: Only normal authentication failures (wrong passwords)

### Database Monitoring
- [ ] **Check Active Connections**
  ```bash
  psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();"
  ```
  Expected: Normal connection count (should not spike)

- [ ] **Check for Long-Running Queries**
  ```bash
  psql "$DATABASE_URL" -c "SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '30 seconds';"
  ```
  Expected: No queries related to password_hash or users table

---

## 🧪 Functional Testing (First 30 minutes)

### User Authentication Testing
- [ ] **Test Multiple User Logins**
  - Test with admin user
  - Test with regular users (if any)
  - Test with invalid credentials (should fail gracefully)

- [ ] **Test Password Reset** (if feature exists)
  - Initiate password reset
  - Complete password reset
  - Login with new password

### New User Creation Testing
- [ ] **Create New User**
  ```bash
  cd backend
  # Use your user creation script or API
  ```
  Expected: User created without truncation errors

- [ ] **Verify New User Can Login**
  - Login with newly created credentials
  Expected: Login successful

### Password Hash Length Verification
- [ ] **Check Password Hash Lengths**
  ```bash
  psql "$DATABASE_URL" -c "SELECT username, LENGTH(password_hash) as hash_length FROM users ORDER BY created_at DESC LIMIT 10;"
  ```
  Expected: All hashes should be ~162 characters (or whatever your hash algorithm produces)

---

## 📈 Extended Monitoring (First 24 hours)

### Metrics to Track
- [ ] **Login Success Rate**
  - Track login attempts vs. successes
  - Expected: Same or improved success rate

- [ ] **Error Rate**
  - Monitor application error logs
  - Expected: Reduced errors (no more truncation errors)

- [ ] **User Creation Rate**
  - Track new user registrations
  - Expected: Successful user creation without errors

### Performance Monitoring
- [ ] **Database Performance**
  - Monitor query performance on users table
  - Expected: No degradation (TEXT type should be similar or faster than VARCHAR)

- [ ] **API Response Times**
  - Monitor /auth/login endpoint response time
  - Expected: No significant change

---

## 🎉 Success Criteria

All of the following should be true:

### Database State
- ✅ password_hash column is TEXT type
- ✅ Migration 005 recorded in migration_history
- ✅ No NULL password_hash values
- ✅ All password hashes are ~162 characters (not truncated to 128)

### Application State
- ✅ verify_password_hash_migration.py passes all checks
- ✅ health_check.py passes all checks
- ✅ No "value too long" errors in logs
- ✅ Authentication works for all users

### User Experience
- ✅ Admin can login via frontend
- ✅ Admin can login via API
- ✅ New users can be created
- ✅ New users can login
- ✅ Password reset works (if feature exists)

---

## 🚨 Rollback Criteria

Consider rollback ONLY if:

1. **Critical Authentication Failure**
   - Admin cannot login
   - Multiple users cannot login
   - Authentication completely broken

2. **Database Corruption**
   - Users table corrupted
   - Password hashes lost or corrupted
   - Data integrity issues

3. **Performance Degradation**
   - Severe performance issues (10x+ slower)
   - Database becomes unresponsive
   - Application crashes

**Note:** The migration is designed to be safe and non-breaking. Rollback should be extremely rare.

---

## 📝 Post-Deployment Report Template

```
# Migration 005 Deployment Report

## Deployment Details
- **Date/Time:** [YYYY-MM-DD HH:MM UTC]
- **Performed by:** [Name]
- **Database:** [Database name from Render]
- **Duration:** [X minutes]

## Pre-Deployment State
- password_hash type: VARCHAR(128) / TEXT
- Migration 005 status: Applied / Not Applied
- Active users: [count]

## Deployment Process
- Migration script used: ✅ / ❌
- Errors encountered: None / [description]
- Rollback needed: No / Yes

## Post-Deployment State
- password_hash type: TEXT ✅
- Migration 005 recorded: ✅
- Verification passed: ✅
- Health check passed: ✅

## Testing Results
- Admin login (frontend): ✅ / ❌
- Admin login (API): ✅ / ❌
- New user creation: ✅ / ❌ / N/A
- Error logs: Clean / [issues]

## Issues & Resolutions
- Issue 1: [description]
  - Resolution: [how it was fixed]

## Monitoring Plan
- Logs monitored for: [duration]
- Follow-up check scheduled: [date/time]

## Sign-off
- Deployment successful: ✅
- Ready for production use: ✅
- Team notified: ✅

---
Completed by: [Name]
Date: [YYYY-MM-DD]
```

---

## 📞 Support & Escalation

### If Issues Occur

1. **Check Logs First**
   ```bash
   # Application logs
   # Check Render dashboard → Logs

   # Database logs
   psql "$DATABASE_URL" -c "SELECT * FROM migration_history ORDER BY applied_at DESC LIMIT 5;"
   ```

2. **Run Diagnostics**
   ```bash
   cd backend
   python verify_password_hash_migration.py
   python health_check.py
   ```

3. **Review Documentation**
   - [MIGRATION_005_PRODUCTION_DEPLOYMENT.md](MIGRATION_005_PRODUCTION_DEPLOYMENT.md)
   - [PASSWORD_HASH_MIGRATION_FIX.md](PASSWORD_HASH_MIGRATION_FIX.md)
   - [PRODUCTION_DATABASE_SETUP.md](PRODUCTION_DATABASE_SETUP.md)

4. **Escalation Path**
   - Level 1: Check troubleshooting sections in documentation
   - Level 2: Review database state and logs
   - Level 3: Contact database administrator
   - Level 4: Consider rollback (use rollback procedure in deployment guide)

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-14
