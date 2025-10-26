# Authentication System

> **Last Updated**: October 2024  
> **Status**: Production-Ready

Complete guide to authentication, authorization, and session management in ThermaCoreApp.

## Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [JWT Token System](#jwt-token-system)
4. [Login Process](#login-process)
5. [Password Management](#password-management)
6. [Session Management](#session-management)
7. [Security Features](#security-features)
8. [Troubleshooting](#troubleshooting)

---

## Overview

ThermaCoreApp uses a modern JWT (JSON Web Token) based authentication system with the following features:

- **Token-Based Authentication** - Stateless, scalable authentication
- **Refresh Token Rotation** - Enhanced security with short-lived access tokens
- **Role-Based Authorization** - Granular permission control
- **Password Security** - Bcrypt hashing with salt
- **Account Security** - Login attempt tracking, account lockout
- **Audit Logging** - Complete authentication event tracking

### Security Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. POST /auth/login {username, password}
       │
       ▼
┌─────────────────────────────────────────┐
│           Backend API                   │
│  ┌───────────────────────────────────┐  │
│  │  1. Validate credentials          │  │
│  │  2. Check account status          │  │
│  │  3. Verify permissions            │  │
│  │  4. Generate JWT tokens           │  │
│  │  5. Log authentication event      │  │
│  └───────────────────────────────────┘  │
└──────┬──────────────────────────────────┘
       │
       │ 2. Response: {access_token, refresh_token, user}
       │
       ▼
┌─────────────┐
│   Client    │
│  Store tokens│
│  in memory  │
└─────────────┘
       │
       │ 3. Subsequent requests
       │    Authorization: Bearer <access_token>
       │
       ▼
┌─────────────────────────────────────────┐
│           Backend API                   │
│  ┌───────────────────────────────────┐  │
│  │  1. Verify JWT signature          │  │
│  │  2. Check token expiration        │  │
│  │  3. Extract user identity         │  │
│  │  4. Check permissions             │  │
│  │  5. Process request               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## Authentication Flow

### Complete Authentication Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    User Journey                              │
└─────────────────────────────────────────────────────────────┘

1. User Registration
   ↓
   [User submits registration form]
   ↓
   [Backend validates input]
   ↓
   [Password hashed with bcrypt]
   ↓
   [User created with is_active=false]
   ↓
   [Admin approval required]

2. Admin Approval
   ↓
   [Admin reviews registration]
   ↓
   [Admin sets role and activates account]
   ↓
   [User notified via email]

3. First Login
   ↓
   [User enters credentials]
   ↓
   [Backend validates]
   ↓
   [Access + Refresh tokens generated]
   ↓
   [User object returned]
   ↓
   [Frontend stores tokens in memory]

4. Authenticated Session
   ↓
   [Client includes token in requests]
   ↓
   [Backend validates on each request]
   ↓
   [Request processed if valid]

5. Token Refresh (every 15 minutes)
   ↓
   [Access token expires]
   ↓
   [Client uses refresh token]
   ↓
   [New access token issued]
   ↓
   [Old refresh token rotated]

6. Logout
   ↓
   [Client discards tokens]
   ↓
   [Backend logs event]
   ↓
   [Session ended]
```

---

## JWT Token System

### Token Types

#### 1. Access Token
**Purpose**: Short-lived token for API access

**Properties**:
- **Lifetime**: 15 minutes
- **Storage**: Memory only (not localStorage)
- **Contains**: User ID, username, role, permissions
- **Used for**: API requests

**Structure**:
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": 15,              // User ID
    "username": "john.doe",
    "role": "operator",
    "permissions": ["read_units", "write_units"],
    "iat": 1698067200,      // Issued at
    "exp": 1698068100       // Expires at (15 min later)
  },
  "signature": "..."
}
```

#### 2. Refresh Token
**Purpose**: Long-lived token for obtaining new access tokens

**Properties**:
- **Lifetime**: 7 days
- **Storage**: HttpOnly cookie (recommended) or memory
- **Contains**: User ID, token family ID
- **Used for**: Refreshing access token

**Structure**:
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": 15,              // User ID
    "family": "abc123",     // Token family for rotation
    "iat": 1698067200,
    "exp": 1698672000       // Expires at (7 days later)
  },
  "signature": "..."
}
```

### Token Refresh Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ API Request with expired access token
     │
     ▼
┌─────────────────┐
│  Backend API    │  → Returns 401 Unauthorized
└────┬────────────┘     {"error": "Token expired"}
     │
     ▼
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ POST /auth/refresh
     │ Authorization: Bearer <refresh_token>
     │
     ▼
┌─────────────────┐
│  Backend API    │
│                 │
│  1. Verify refresh token signature
│  2. Check token not expired
│  3. Verify token family (detect reuse)
│  4. Generate new access token
│  5. Rotate refresh token (new family)
│
└────┬────────────┘
     │
     │ Returns: {access_token, refresh_token}
     │
     ▼
┌──────────┐
│  Client  │  → Stores new tokens
│          │  → Retries original request
└──────────┘
```

---

## Login Process

### Standard Login

**Endpoint**: `POST /api/v1/auth/login`

**Request**:
```json
{
  "username": "john.doe",
  "password": "SecurePass123!"
}
```

**Success Response (200)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 900,
  "user": {
    "id": 15,
    "username": "john.doe",
    "email": "john@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": {
      "id": 2,
      "name": "operator",
      "permissions": ["read_units", "write_units"]
    }
  }
}
```

**Error Responses**:

```json
// Invalid credentials (401)
{
  "error": "Invalid username or password",
  "code": "INVALID_CREDENTIALS"
}

// Account inactive (403)
{
  "error": "Account is inactive. Contact administrator.",
  "code": "ACCOUNT_INACTIVE"
}

// Account locked (403)
{
  "error": "Account locked due to too many failed login attempts",
  "code": "ACCOUNT_LOCKED",
  "retry_after": 1800
}
```

### Frontend Implementation

**React Example**:
```javascript
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function LoginForm() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await login(credentials.username, credentials.password);
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      // Display error message
      console.error('Login failed:', error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={credentials.username}
        onChange={(e) => setCredentials({
          ...credentials,
          username: e.target.value
        })}
        placeholder="Username"
      />
      <input
        type="password"
        value={credentials.password}
        onChange={(e) => setCredentials({
          ...credentials,
          password: e.target.value
        })}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

**Auth Service**:
```javascript
// src/services/authService.js
export const authService = {
  login: async (username, password) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    
    // Store tokens (in memory, not localStorage for security)
    sessionStorage.setItem('access_token', data.access_token);
    sessionStorage.setItem('refresh_token', data.refresh_token);
    
    return data.user;
  }
};
```

---

## Password Management

### Password Requirements

**Minimum Requirements**:
- Length: 12 characters minimum
- Must contain:
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one digit (0-9)
  - At least one special character (!@#$%^&*)

**Password Hashing**:
```python
from werkzeug.security import generate_password_hash, check_password_hash

# On registration/password change
hashed = generate_password_hash(
    password,
    method='bcrypt',
    salt_length=16
)

# On login
is_valid = check_password_hash(stored_hash, provided_password)
```

### Change Password

**Endpoint**: `POST /api/v1/auth/change-password`

**Request**:
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewSecurePass456!"
}
```

**Validation**:
1. Verify current password is correct
2. Ensure new password meets requirements
3. Check new password != current password
4. Hash and store new password
5. Invalidate all existing tokens (force re-login)

### Password Reset

#### Step 1: Request Reset

**Endpoint**: `POST /api/v1/auth/password-reset-request`

**Request**:
```json
{
  "email": "john@company.com"
}
```

**Process**:
1. Verify email exists in system
2. Generate secure reset token (valid 1 hour)
3. Send email with reset link
4. Return success (even if email not found - security)

#### Step 2: Reset Password

**Endpoint**: `POST /api/v1/auth/password-reset`

**Request**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "new_password": "NewSecurePass789!"
}
```

**Process**:
1. Verify reset token valid and not expired
2. Validate new password requirements
3. Hash and update password
4. Invalidate reset token
5. Send confirmation email

---

## Session Management

### Token Storage

**Security Best Practices**:

❌ **DON'T**: Store tokens in localStorage
```javascript
// INSECURE - vulnerable to XSS attacks
localStorage.setItem('token', accessToken);
```

✅ **DO**: Store in memory or sessionStorage
```javascript
// SECURE - cleared on browser close
sessionStorage.setItem('access_token', accessToken);

// BETTER - In-memory only (React context)
const [token, setToken] = useState(null);
```

✅ **BEST**: HttpOnly cookies (backend-managed)
```python
# Backend sets cookie
response.set_cookie(
    'refresh_token',
    value=refresh_token,
    httponly=True,
    secure=True,      # HTTPS only
    samesite='Strict',
    max_age=7*24*60*60  # 7 days
)
```

### Logout

**Endpoint**: `POST /api/v1/auth/logout`

**Client-Side**:
```javascript
const logout = () => {
  // Clear tokens
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
  
  // Clear user state
  setUser(null);
  
  // Call logout endpoint (for logging)
  fetch('/api/v1/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  // Redirect to login
  navigate('/login');
};
```

**Backend Logging**:
```python
@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    user_id = get_jwt_identity()
    
    # Log logout event
    log_audit_event(
        user_id=user_id,
        action='logout',
        ip_address=request.remote_addr
    )
    
    return jsonify({'message': 'Logout successful'}), 200
```

---

## Security Features

### 1. Account Lockout

**Policy**:
- 5 failed login attempts → account locked
- Lock duration: 30 minutes
- Admin can unlock manually

**Implementation**:
```python
def check_login_attempts(user):
    # Get failed attempts in last 30 minutes
    recent_failures = get_failed_logins(
        user_id=user.id,
        since=datetime.utcnow() - timedelta(minutes=30)
    )
    
    if len(recent_failures) >= 5:
        user.is_locked = True
        user.locked_until = datetime.utcnow() + timedelta(minutes=30)
        db.session.commit()
        raise AccountLocked()
```

### 2. Audit Logging

**Logged Events**:
- Login attempts (success/failure)
- Password changes
- Account lockouts
- Token refreshes
- Logout events
- Permission changes

**Example Log Entry**:
```json
{
  "id": 12345,
  "user_id": 15,
  "username": "john.doe",
  "action": "login_success",
  "ip_address": "192.168.1.105",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2024-10-23T10:30:15Z",
  "details": {
    "role": "operator",
    "login_method": "password"
  }
}
```

### 3. CSRF Protection

**Double Submit Cookie Pattern**:
```python
# Backend generates CSRF token
csrf_token = secrets.token_urlsafe(32)

response.set_cookie(
    'csrf_token',
    value=csrf_token,
    httponly=False,  # Needs to be readable by JS
    secure=True,
    samesite='Strict'
)
```

**Frontend includes in requests**:
```javascript
fetch('/api/v1/units', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': getCookie('csrf_token'),
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify(data)
});
```

### 4. Rate Limiting

**Login Endpoint**:
- 10 attempts per IP per minute
- 100 attempts per IP per hour

**API Endpoints**:
- 100 requests per user per minute
- 1000 requests per user per hour

---

## Troubleshooting

### Common Issues

#### 1. "Token expired" Error

**Symptom**: API returns 401 with "Token expired"

**Solution**:
```javascript
// Implement automatic token refresh
async function refreshToken() {
  const refreshToken = sessionStorage.getItem('refresh_token');
  
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${refreshToken}`
    }
  });
  
  const data = await response.json();
  sessionStorage.setItem('access_token', data.access_token);
  sessionStorage.setItem('refresh_token', data.refresh_token);
  
  return data.access_token;
}
```

#### 2. "Invalid credentials" Despite Correct Password

**Possible Causes**:
1. Account inactive
2. Account locked
3. Password recently changed
4. Username case-sensitive mismatch

**Debug Steps**:
```bash
# Check user in database
psql $DATABASE_URL
SELECT id, username, is_active, is_locked 
FROM users 
WHERE username = 'john.doe';
```

#### 3. CORS Errors on Login

**Symptom**: Browser console shows CORS error

**Solution**:
```python
# Backend: Update CORS_ORIGINS
CORS_ORIGINS = [
    'http://localhost:5173',
    'https://your-frontend.netlify.app'
]
```

#### 4. WebSocket Authentication Fails

**Symptom**: WebSocket connection rejected

**Solution**:
```javascript
// Include token in WebSocket connection
const socket = io(WS_URL, {
  auth: {
    token: sessionStorage.getItem('access_token')
  }
});
```

---

**Related Documentation:**
- [User Management](USER_MANAGEMENT.md)
- [Admin Panel](ADMIN_PANEL.md)
- [Troubleshooting](../OPERATIONS/TROUBLESHOOTING.md)

*Last Updated: October 2024*
