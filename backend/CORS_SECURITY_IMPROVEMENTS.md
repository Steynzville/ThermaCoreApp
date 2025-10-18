# CORS Security Configuration Improvements

## Overview

This document describes the security enhancements made to the CORS (Cross-Origin Resource Sharing) configuration in the ThermaCoreApp backend to ensure production environments enforce strict security policies.

## Problem Statement

The original implementation allowed potentially insecure CORS configurations in production:
- Wildcard (`*`) CORS origins could be set via environment variables
- HTTP (non-HTTPS) origins were not explicitly rejected
- No validation ensured HTTPS-only origins in production

This created security risks where a misconfigured production environment could accept cross-origin requests from any domain or over insecure HTTP connections.

## Solution

### Configuration Changes

#### `backend/config.py`

Enhanced `ProductionConfig.__init__()` with strict CORS validation:

```python
# Validate no wildcard in production
if '*' in origins:
    raise ValueError("Wildcard CORS origins ('*') are not allowed in production")

# Validate all origins use HTTPS in production
for origin in origins:
    if not origin.startswith('https://'):
        raise ValueError(f"Production CORS origins must use HTTPS. Invalid origin: {origin}")
```

**Features:**
- Strips whitespace from origins and filters empty values
- Rejects wildcard (`*`) CORS origins
- Enforces HTTPS-only origins
- Provides clear error messages when validation fails
- Uses secure default (`https://yourdomain.com`) when not explicitly set

### Test Changes

#### `backend/app/tests/test_scada_security.py`

Enhanced `test_development_vs_production_security_configs()` with explicit HTTPS checks:

```python
# Production must use HTTPS only
assert all(origin.startswith('https://') for origin in prod_origins), \
    "Production CORS origins must use HTTPS only"

# Development can use HTTP, production cannot
assert any(origin.startswith('http://') and not origin.startswith('https://') 
          for origin in dev_origins), \
    "Development should allow HTTP origins"
```

**Benefits:**
- Explicitly validates HTTPS-only requirement for production
- Verifies development allows HTTP for local development
- Ensures clear separation between dev and prod security policies
- Provides descriptive error messages for test failures

#### `backend/app/tests/test_production_config_validation.py`

Added comprehensive test coverage for security validation:

1. **`test_production_config_rejects_wildcard_cors()`**
   - Verifies wildcard (`*`) is rejected
   - Tests: `WEBSOCKET_CORS_ORIGINS=*`

2. **`test_production_config_rejects_http_cors()`**
   - Verifies HTTP origins are rejected
   - Tests: `WEBSOCKET_CORS_ORIGINS=http://app.example.com`

3. **`test_production_config_rejects_mixed_http_https_cors()`**
   - Verifies mixed HTTP/HTTPS origins are rejected
   - Tests: `WEBSOCKET_CORS_ORIGINS=https://app.example.com,http://admin.example.com`

## Security Guarantees

### Production Environment
✅ **Cannot use wildcard CORS** - All requests from any domain are rejected  
✅ **Must use HTTPS-only origins** - Prevents man-in-the-middle attacks  
✅ **Clear error messages** - Configuration errors are caught at startup  
✅ **Secure defaults** - Falls back to `https://yourdomain.com` if not set  
✅ **Validation at initialization** - Fails fast with clear error messages

### Development Environment
✅ **Allows HTTP origins** - Enables local development (localhost:3000, localhost:5173)  
✅ **Flexible configuration** - Can be customized via environment variables  
✅ **Separate security policies** - Different from production

### Testing Environment
✅ **Permissive CORS** - Allows wildcard for comprehensive testing  
✅ **No validation overhead** - Tests can run without complex setup

## Configuration Examples

### Production (Secure)

```bash
# Single HTTPS origin
WEBSOCKET_CORS_ORIGINS=https://app.example.com

# Multiple HTTPS origins
WEBSOCKET_CORS_ORIGINS=https://app.example.com,https://admin.example.com

# Not set - uses secure default
# WEBSOCKET_CORS_ORIGINS not set → ['https://yourdomain.com']
```

### Production (Rejected)

```bash
# ❌ Wildcard - REJECTED
WEBSOCKET_CORS_ORIGINS=*
# Error: Wildcard CORS origins ('*') are not allowed in production

# ❌ HTTP origin - REJECTED
WEBSOCKET_CORS_ORIGINS=http://app.example.com
# Error: Production CORS origins must use HTTPS. Invalid origin: http://app.example.com

# ❌ Mixed HTTP/HTTPS - REJECTED
WEBSOCKET_CORS_ORIGINS=https://app.example.com,http://admin.example.com
# Error: Production CORS origins must use HTTPS. Invalid origin: http://admin.example.com
```

### Development (Permissive)

```bash
# HTTP origins allowed for local development
WEBSOCKET_CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Testing

### Run All CORS Security Tests

```bash
# Test the specific failing test
python -m pytest app/tests/test_scada_security.py::TestScadaSecurityIntegration::test_development_vs_production_security_configs -v

# Test all production config validation
python -m pytest app/tests/test_production_config_validation.py -v

# Test all SCADA security tests
python -m pytest app/tests/test_scada_security.py -v
```

### Expected Results

All tests should pass:
- ✅ `test_development_vs_production_security_configs` - Validates dev vs prod differences
- ✅ `test_production_config_websocket_cors_from_env` - Validates custom HTTPS origins
- ✅ `test_production_config_websocket_cors_default` - Validates secure default
- ✅ `test_production_config_rejects_wildcard_cors` - Validates wildcard rejection
- ✅ `test_production_config_rejects_http_cors` - Validates HTTP rejection
- ✅ `test_production_config_rejects_mixed_http_https_cors` - Validates mixed rejection

## Impact

### Security Improvements
1. **Prevents wildcard CORS in production** - Eliminates risk of accepting requests from any domain
2. **Enforces HTTPS-only origins** - Protects against man-in-the-middle attacks
3. **Fails fast with clear errors** - Configuration issues are caught at startup, not runtime
4. **Separation of concerns** - Development and production have distinct security policies

### Backward Compatibility
- ✅ **Existing valid configurations work** - HTTPS origins continue to work
- ✅ **Secure defaults** - Environments without WEBSOCKET_CORS_ORIGINS get secure default
- ✅ **Development unchanged** - Development and testing environments remain flexible
- ⚠️ **Breaking change** - Production environments with wildcard or HTTP origins will fail at startup (intentional security improvement)

## Best Practices

### For Production Deployments

1. **Always set WEBSOCKET_CORS_ORIGINS** explicitly with HTTPS origins
   ```bash
   WEBSOCKET_CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
   ```

2. **Use environment-specific values**
   - Staging: `https://staging.yourdomain.com`
   - Production: `https://yourdomain.com,https://app.yourdomain.com`

3. **Never use wildcards** in production
   ```bash
   # ❌ NEVER DO THIS IN PRODUCTION
   WEBSOCKET_CORS_ORIGINS=*
   ```

4. **Monitor configuration errors** - Failed startup indicates misconfiguration

### For Development

1. **Use HTTP for local development**
   ```bash
   WEBSOCKET_CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

2. **Test with production-like HTTPS** in pre-production environments
   ```bash
   WEBSOCKET_CORS_ORIGINS=https://dev.yourdomain.com
   ```

## Files Changed

- `backend/config.py` - Added CORS validation to ProductionConfig
- `backend/app/tests/test_scada_security.py` - Enhanced HTTPS validation in tests
- `backend/app/tests/test_production_config_validation.py` - Added comprehensive security tests
- `backend/CORS_SECURITY_IMPROVEMENTS.md` - This documentation

## Related Documentation

- [SECURITY_BEST_PRACTICES.md](SECURITY_BEST_PRACTICES.md) - General security guidelines
- [PRODUCTION_CONFIG_REFACTORING.md](PRODUCTION_CONFIG_REFACTORING.md) - ProductionConfig design
- [README.md](README.md) - General application documentation

## Support

For questions or issues related to CORS security configuration:
1. Check this documentation first
2. Review test cases in `app/tests/test_production_config_validation.py`
3. Examine error messages - they provide specific guidance
4. Consult [SECURITY_BEST_PRACTICES.md](SECURITY_BEST_PRACTICES.md)
