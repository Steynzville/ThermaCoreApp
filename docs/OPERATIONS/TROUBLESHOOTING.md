# Troubleshooting Guide

> **Last Updated**: October 2024  
> **Status**: Production-Ready

Comprehensive troubleshooting guide for common issues in ThermaCoreApp.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Authentication Issues](#authentication-issues)
3. [Database Problems](#database-problems)
4. [Connection Issues](#connection-issues)
5. [Performance Problems](#performance-problems)
6. [Deployment Issues](#deployment-issues)
7. [Getting Help](#getting-help)

---

## Quick Diagnostics

### Health Check Script

Run this first to identify issues:

```bash
cd backend
python health_check.py
```

**Output Interpretation**:
```
✅ Database: Connected
✅ MQTT: Connected
✅ OPC UA: Connected
❌ Modbus: Connection timeout
⚠️  WebSocket: High latency (250ms)

Recommendations:
1. Check Modbus device connectivity
2. Investigate WebSocket performance
```

### System Status Check

```bash
# Backend health
curl https://api.yourdomain.com/api/v1/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-10-23T10:45:00Z"
}
```

---

## Authentication Issues

### Problem: Cannot Login - "Invalid Credentials"

**Symptoms**:
- Correct password rejected
- Error: "Invalid username or password"

**Diagnosis**:
```bash
# Check user exists and is active
psql $DATABASE_URL -c "
SELECT id, username, is_active, is_locked, role_id 
FROM users 
WHERE username = 'your_username';
"
```

**Possible Causes & Solutions**:

1. **Account Inactive**
   ```sql
   -- Activate account
   UPDATE users SET is_active = true WHERE username = 'your_username';
   ```

2. **Account Locked**
   ```sql
   -- Unlock account
   UPDATE users SET is_locked = false, locked_until = NULL 
   WHERE username = 'your_username';
   ```

3. **Wrong Password**
   ```bash
   # Reset password
   cd backend
   python scripts/reset_user_password.py your_username NewPassword123!
   ```

4. **No Role Assigned**
   ```sql
   -- Assign role
   UPDATE users SET role_id = 2 WHERE username = 'your_username';
   -- 1 = admin, 2 = operator, 3 = viewer
   ```

### Problem: "Token Expired" Error

**Symptoms**:
- API returns 401 after some time
- "Token expired" message

**Solution**:
```javascript
// Implement automatic token refresh
async function apiCall(endpoint, options = {}) {
  let response = await fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${getAccessToken()}`
    }
  });

  // If token expired, refresh and retry
  if (response.status === 401) {
    await refreshToken();
    response = await fetch(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${getAccessToken()}`
      }
    });
  }

  return response;
}
```

### Problem: "Insufficient Permissions"

**Symptoms**:
- Error: "You don't have permission to access this resource"
- 403 Forbidden

**Diagnosis**:
```sql
-- Check user's role and permissions
SELECT u.username, r.name as role, r.permissions
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.username = 'your_username';
```

**Solution**:
```sql
-- Update user role
UPDATE users SET role_id = 1 WHERE username = 'your_username';

-- Or add permission to role
-- Contact admin to modify role permissions
```

### Problem: Login Page Blank/White Screen

**Symptoms**:
- Login page doesn't load
- White screen or spinner
- Console errors

**Diagnosis**:
```javascript
// Check browser console (F12)
// Look for errors like:

// CORS error
"Access to fetch at 'https://api.example.com' from origin 
'https://app.example.com' has been blocked by CORS policy"

// Network error
"Failed to fetch"

// JavaScript error
"Uncaught TypeError: Cannot read property..."
```

**Solutions**:

1. **CORS Error**
   ```python
   # Backend: Update CORS_ORIGINS
   CORS_ORIGINS = [
       'http://localhost:5173',
       'https://your-frontend.netlify.app'
   ]
   ```

2. **API URL Misconfigured**
   ```env
   # Frontend .env
   VITE_API_BASE_URL=https://your-backend.onrender.com
   ```

3. **Backend Not Running**
   ```bash
   # Check backend status
   curl https://api.yourdomain.com/api/v1/health
   ```

---

## Database Problems

### Problem: "Connection to Database Failed"

**Symptoms**:
- Backend won't start
- Error: "could not connect to server"

**Diagnosis**:
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection string format
echo $DATABASE_URL
# Should be: postgresql://user:password@host:5432/database
```

**Solutions**:

1. **Database Not Running**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Start if stopped
   sudo systemctl start postgresql
   
   # For Docker
   docker-compose ps db
   docker-compose up -d db
   ```

2. **Wrong Credentials**
   ```bash
   # Verify credentials
   psql -h host -U username -d database
   # Enter password when prompted
   
   # Update DATABASE_URL if incorrect
   export DATABASE_URL="postgresql://correct_user:correct_pass@host:5432/db"
   ```

3. **Firewall Blocking**
   ```bash
   # Check if port 5432 is accessible
   telnet db-host 5432
   
   # Allow PostgreSQL through firewall
   sudo ufw allow 5432/tcp
   ```

### Problem: "Table Does Not Exist"

**Symptoms**:
- Error: "relation 'users' does not exist"
- API fails with database errors

**Solution**:
```bash
# Run database initialization
cd backend
flask init-db

# Or apply migrations manually
psql $DATABASE_URL -f migrations/001_initial_schema.sql
psql $DATABASE_URL -f migrations/002_seed_data.sql
# ... apply all migrations in order
```

### Problem: "Value Too Long for Type"

**Symptoms**:
- Error: "value too long for type character varying(128)"
- Password hash errors

**Solution**:
```bash
# Apply password hash length migration
cd backend
psql $DATABASE_URL -f migrations/005_fix_password_hash_length.sql
```

### Problem: Database Performance Slow

**Symptoms**:
- Slow query responses
- High database CPU usage
- Timeouts

**Diagnosis**:
```sql
-- Check slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY duration DESC;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solutions**:

1. **Add Indexes**
   ```sql
   -- Create index on commonly queried columns
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_sensors_unit_id ON sensors(unit_id);
   CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings(timestamp);
   ```

2. **Vacuum Database**
   ```sql
   VACUUM ANALYZE;
   ```

3. **Clean Old Data**
   ```sql
   -- Delete old sensor readings (older than 90 days)
   DELETE FROM sensor_readings 
   WHERE timestamp < NOW() - INTERVAL '90 days';
   ```

### Problem: Neon Database Connection Issues

**Symptoms**:
- Error: "SSL connection required"
- Error: "connection timeout"
- Error: "database does not exist"

**Neon-Specific Diagnosis**:

```bash
# 1. Verify connection string format
echo $DATABASE_URL
# Should include ?sslmode=require for Neon:
# postgres://user:pass@endpoint.ap-southeast-2.aws.neon.tech/dbname?sslmode=require

# 2. Test Neon connection
psql "$DATABASE_URL" -c "SELECT version();"
```

**Solutions**:

1. **Missing SSL Mode**
   ```bash
   # Neon requires SSL - ensure sslmode=require is set
   export DATABASE_URL="postgres://user:pass@endpoint.neon.tech/db?sslmode=require"
   ```

2. **Connection Limit Reached**
   ```bash
   # Check active connections in Neon dashboard
   # Free tier: limited connections
   # Solution: Close idle connections or upgrade tier
   
   # View active connections
   psql "$DATABASE_URL" -c "
   SELECT count(*) as connections, 
          max(backend_start) as oldest_connection
   FROM pg_stat_activity;
   "
   ```

3. **Database Auto-Suspended (Free Tier)**
   ```bash
   # Neon free tier auto-suspends after inactivity
   # First query after suspend may be slow (cold start)
   # This is normal - subsequent queries will be fast
   
   # To minimize impact:
   # - Implement connection retry logic
   # - Add health check endpoint that keeps DB active
   # - Consider upgrading to paid tier for always-on
   ```

4. **Wrong Region/Endpoint**
   ```bash
   # Ensure using correct Neon endpoint
   # Sydney region should contain: .ap-southeast-2.aws.neon.tech
   # Example: ep-cool-darkness-123456.ap-southeast-2.aws.neon.tech
   
   # Verify in Neon dashboard: Project → Connection Details
   ```

5. **Network/Firewall Issues**
   ```bash
   # Test connectivity to Neon endpoint
   nc -zv ep-cool-darkness-123456.ap-southeast-2.aws.neon.tech 5432
   
   # Neon uses port 5432 over SSL
   # Ensure outbound connections to Neon are allowed
   ```

**Neon Performance Tips**:

1. **Connection Pooling**
   - Neon has built-in connection pooling
   - Use pooled connection string for better performance
   - Available in Neon dashboard: Connection Details → Pooled connection

2. **Monitoring**
   - Check Neon dashboard for query performance
   - Monitor connection usage
   - Review storage and compute usage

3. **Branching for Testing**
   - Use Neon database branches for dev/staging
   - Test migrations on branches before production
   - Instant branch creation - no data copy needed

---

## Connection Issues

### Problem: WebSocket Connection Fails

**Symptoms**:
- Real-time updates not working
- Console: "WebSocket connection failed"

**Diagnosis**:
```javascript
// Check WebSocket connection
const socket = io(WS_URL, {
  transports: ['websocket', 'polling']
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

**Solutions**:

1. **Wrong WebSocket URL**
   ```javascript
   // Production must use wss:// (not ws://)
   const WS_URL = 'wss://api.yourdomain.com';
   ```

2. **CORS Issue**
   ```python
   # Backend: Allow WebSocket origin
   from flask_socketio import SocketIO
   
   socketio = SocketIO(app, cors_allowed_origins=[
       'http://localhost:5173',
       'https://your-frontend.netlify.app'
   ])
   ```

3. **Nginx Configuration** (for VPS deployments)
   ```nginx
   location /socket.io {
       proxy_pass http://127.0.0.1:5000/socket.io;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

### Problem: MQTT Not Receiving Messages

**Symptoms**:
- No real-time sensor data
- MQTT status shows disconnected

**Diagnosis**:
```bash
# Test MQTT connection
mosquitto_sub -h broker.example.com -p 1883 -t "scada/#" -v

# Check backend MQTT logs
tail -f logs/mqtt_service.log
```

**Solutions**:

1. **Broker Not Running**
   ```bash
   # Check MQTT broker status
   sudo systemctl status mosquitto
   
   # Start if stopped
   sudo systemctl start mosquitto
   ```

2. **Wrong Credentials**
   ```python
   # Backend config.py
   MQTT_BROKER_HOST = "correct_broker_host"
   MQTT_USERNAME = "correct_username"
   MQTT_PASSWORD = "correct_password"
   ```

3. **Firewall Blocking**
   ```bash
   # Allow MQTT port
   sudo ufw allow 1883/tcp
   sudo ufw allow 8883/tcp  # For TLS
   ```

---

## Performance Problems

### Problem: Slow API Response Times

**Symptoms**:
- API calls take > 2 seconds
- Frontend feels sluggish

**Diagnosis**:
```bash
# Test API response time
time curl https://api.yourdomain.com/api/v1/units

# Check backend logs for slow queries
grep "took.*ms" logs/app.log | sort -t: -k3 -n
```

**Solutions**:

1. **Enable Caching**
   ```python
   from flask_caching import Cache
   
   cache = Cache(app, config={
       'CACHE_TYPE': 'redis',
       'CACHE_REDIS_URL': 'redis://localhost:6379/0'
   })
   
   @cache.cached(timeout=60)
   def get_units():
       return Unit.query.all()
   ```

2. **Optimize Queries**
   ```python
   # Bad: N+1 query problem
   units = Unit.query.all()
   for unit in units:
       sensors = unit.sensors  # Separate query for each unit
   
   # Good: Eager loading
   units = Unit.query.options(joinedload(Unit.sensors)).all()
   ```

3. **Add Pagination**
   ```python
   # Limit results
   @app.route('/api/v1/sensor-readings')
   def get_readings():
       page = request.args.get('page', 1, type=int)
       per_page = request.args.get('per_page', 20, type=int)
       
       readings = SensorReading.query.paginate(
           page=page,
           per_page=per_page,
           error_out=False
       )
       return jsonify(readings.items)
   ```

### Problem: High Memory Usage

**Symptoms**:
- Backend crashes with OOM
- System becomes unresponsive

**Diagnosis**:
```bash
# Check memory usage
free -h

# Check process memory
ps aux | grep gunicorn | awk '{print $6}'

# Monitor in real-time
htop
```

**Solutions**:

1. **Reduce Worker Processes**
   ```bash
   # gunicorn with fewer workers
   gunicorn --workers 2 run:app
   ```

2. **Limit Query Results**
   ```python
   # Add LIMIT to queries
   recent_readings = SensorReading.query\
       .order_by(SensorReading.timestamp.desc())\
       .limit(1000)\
       .all()
   ```

3. **Clear Old Data**
   ```sql
   DELETE FROM sensor_readings 
   WHERE timestamp < NOW() - INTERVAL '30 days';
   ```

---

## Deployment Issues

### Problem: Build Fails on Render/Netlify

**Symptoms**:
- Deployment fails during build
- "Module not found" errors

**Solutions**:

1. **Missing Dependencies**
   ```bash
   # Ensure all dependencies in requirements.txt
   pip freeze > requirements.txt
   
   # Ensure all frontend deps in package.json
   pnpm install
   ```

2. **Wrong Node Version**
   ```toml
   # netlify.toml
   [build.environment]
   NODE_VERSION = "18"
   ```

3. **Build Command Incorrect**
   ```toml
   # netlify.toml
   [build]
   command = "pnpm install && pnpm run build"
   publish = "dist"
   ```

### Problem: Environment Variables Not Set

**Symptoms**:
- App works locally but not in production
- "Configuration error" messages

**Solution**:
```bash
# Render: Dashboard → Service → Environment
# Add missing variables:
DATABASE_URL=...
SECRET_KEY=...
JWT_SECRET_KEY=...
CORS_ORIGINS=...

# Netlify: Site Settings → Build & Deploy → Environment
VITE_API_BASE_URL=...
VITE_WS_URL=...
```

---

## Getting Help

### Information to Collect

Before requesting help, gather:

1. **Error Messages** (exact text)
2. **Browser Console Logs** (F12 → Console)
3. **Backend Logs** (from Render/server)
4. **Steps to Reproduce**
5. **Environment** (dev/prod, browser, OS)

### Useful Commands

```bash
# Collect system info
cd backend
python scripts/collect_debug_info.py > debug_info.txt

# Export recent logs
tail -n 200 logs/app.log > recent_logs.txt

# Database schema
pg_dump --schema-only $DATABASE_URL > schema.sql
```

### Support Channels

1. Check existing GitHub issues
2. Review documentation
3. Contact development team
4. Create new GitHub issue with collected information

---

**Related Documentation:**
- [Setup Guide](../DEVELOPMENT/SETUP_GUIDE.md)
- [Deployment Guide](../DEVELOPMENT/DEPLOYMENT.md)
- [API Reference](../DEVELOPMENT/API_REFERENCE.md)

*Last Updated: October 2024*
