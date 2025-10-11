# OPC UA Environment Variables Investigation Summary

## Task Overview
Investigated and documented the exact OPC UA environment variable names required by the ThermaCoreApp application when security is enabled.

## Problem Statement
The application was raising an error:
```
ValueError: OPC UA certificate paths must be set in environment variables when security is enabled
```

This error appears in `backend/config.py` at line 219, but the error message didn't specify which exact variables needed to be set.

## Investigation Findings

### Location of Error
- **File**: `backend/config.py`
- **Line**: 219
- **Context**: `ProductionConfig.__init__()` method
- **Condition**: Raised when `OPCUA_SECURITY_POLICY != "None"` and `OPCUA_SECURITY_MODE != "None"`

### Exact Variable Names Required

When OPC UA security is enabled, three environment variables **MUST** be set:

1. **OPCUA_CERT_FILE**
   - Purpose: Path to client certificate file
   - Usage: Authentication of the OPC UA client to the server
   - Line in config.py: 102, 218

2. **OPCUA_PRIVATE_KEY_FILE**
   - Purpose: Path to client private key file
   - Usage: Cryptographic operations with the client certificate
   - Line in config.py: 103, 218

3. **OPCUA_TRUST_CERT_FILE**
   - Purpose: Path to server certificate to trust
   - Usage: Trusting the OPC UA server's certificate (like a CA cert)
   - Line in config.py: 104, 218

### Validation Logic

```python
# Lines 217-219 in backend/config.py
if self.OPCUA_SECURITY_POLICY != "None" and self.OPCUA_SECURITY_MODE != "None":
    if not (os.environ.get("OPCUA_CERT_FILE") and os.environ.get("OPCUA_PRIVATE_KEY_FILE") and os.environ.get("OPCUA_TRUST_CERT_FILE")):
        raise ValueError("OPC UA certificate paths must be set in environment variables when security is enabled")
```

### Production Behavior

In production environments:
- If `OPCUA_SECURITY_POLICY` is not set or is "None", it defaults to `Basic256Sha256`
- If `OPCUA_SECURITY_MODE` is not set or is "None", it defaults to `SignAndEncrypt`
- This means **certificates are required by default in production**

### Complete OPC UA Environment Variables

The application uses the following OPC UA environment variables:

**Connection Settings:**
- `OPCUA_SERVER_URL` - Server endpoint (default: `opc.tcp://localhost:4840`)
- `OPCUA_USERNAME` - Authentication username (required in production)
- `OPCUA_PASSWORD` - Authentication password (required in production)
- `OPCUA_TIMEOUT` - Connection timeout in seconds (default: 30)

**Security Settings:**
- `OPCUA_SECURITY_POLICY` - Security policy (default: `None`, production: `Basic256Sha256`)
- `OPCUA_SECURITY_MODE` - Security mode (default: `None`, production: `SignAndEncrypt`)

**Certificate Paths (Required when security is enabled):**
- `OPCUA_CERT_FILE` - Client certificate path
- `OPCUA_PRIVATE_KEY_FILE` - Client private key path
- `OPCUA_TRUST_CERT_FILE` - Server trust certificate path

**Development Options:**
- `OPCUA_ALLOW_INSECURE_FALLBACK` - Allow insecure fallback in development (default: `false`)

## Documentation Delivered

### 1. Comprehensive Documentation
**File**: `OPCUA_CERTIFICATE_ENVIRONMENT_VARIABLES.md`
- Complete reference for all OPC UA environment variables
- Detailed description of each certificate variable
- Production requirements and validation logic
- Example configurations for production and development
- Certificate format requirements and validation details
- Troubleshooting guide for common errors
- Security best practices
- 10,403 characters, 348 lines

### 2. Quick Reference Guide
**File**: `OPCUA_CERTIFICATES_QUICK_REFERENCE.md`
- Concise single-page reference
- Three required certificate variables highlighted
- Error message and location
- Production defaults explained
- Link to full documentation
- 1,316 characters, 44 lines

### 3. Updated .env.example
**File**: `.env.example`
- Added commented examples for all three certificate paths
- Included note about production requirement
- Provided example path formats
- Added OPCUA_ALLOW_INSECURE_FALLBACK option

### 4. Updated Deployment Documentation
**File**: `RENDER_DEPLOYMENT.md`
- Added section on required production environment variables
- Listed OPC UA certificate paths
- Included MQTT certificate paths
- Documented other required production variables
- Links to detailed certificate documentation

## Verification

All documentation has been verified for accuracy:

✓ All three certificate variable names are documented
✓ Error message matches the actual code
✓ Line numbers are accurate (line 219)
✓ Variable purposes are correctly described
✓ Example paths are provided
✓ Production defaults are accurately documented
✓ Links between documents are correct
✓ .env.example includes all variables

## Testing

The investigation verified:
- Existing tests in `test_production_config_validation.py` confirm the behavior
- Test on line 49 checks for the exact error message
- Test on lines 64-66 confirms all three variables are required
- Test on lines 52-73 confirms successful validation when all are set

## Usage Examples

### Production Configuration
```bash
OPCUA_CERT_FILE=/etc/opcua/certs/client_cert.pem
OPCUA_PRIVATE_KEY_FILE=/etc/opcua/certs/client_key.pem
OPCUA_TRUST_CERT_FILE=/etc/opcua/certs/server_trust_cert.pem
OPCUA_SECURITY_POLICY=Basic256Sha256
OPCUA_SECURITY_MODE=SignAndEncrypt
```

### Development Configuration (Insecure)
```bash
OPCUA_SECURITY_POLICY=None
OPCUA_SECURITY_MODE=None
# No certificates needed when security is disabled
```

## Related Files

- `backend/config.py` - Configuration and validation logic
- `backend/app/services/opcua_service.py` - OPC UA client implementation
- `backend/app/tests/test_production_config_validation.py` - Tests confirming behavior
- `backend/app/tests/test_reviewer_batch_1_3_improvements.py` - Certificate loading tests

## Resolution

The issue is now fully documented with:
1. Exact variable names identified: `OPCUA_CERT_FILE`, `OPCUA_PRIVATE_KEY_FILE`, `OPCUA_TRUST_CERT_FILE`
2. Clear documentation of when they are required (security enabled)
3. Production defaults explained (security is enabled by default)
4. Examples provided for both production and development
5. Troubleshooting guide for common errors
6. Updated .env.example with examples
7. Updated deployment documentation

Users can now:
- Understand exactly which variables to set
- Know what values to provide (certificate paths)
- Configure production environments correctly
- Troubleshoot certificate-related errors
- Reference quick guide or detailed documentation as needed

## Next Steps

For deployment:
1. Generate or obtain OPC UA certificates
2. Store certificates securely on the server
3. Set the three environment variables in Render dashboard
4. Verify paths are correct and files are readable
5. Monitor application logs for certificate validation errors

For development:
1. Either obtain development certificates, OR
2. Set `OPCUA_SECURITY_POLICY=None` and `OPCUA_SECURITY_MODE=None` to disable security
3. Optional: Set `OPCUA_ALLOW_INSECURE_FALLBACK=true` for flexible development
