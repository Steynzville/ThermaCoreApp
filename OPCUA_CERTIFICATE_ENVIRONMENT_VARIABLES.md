# OPC UA Certificate Environment Variables Documentation

## Overview
This document describes the exact OPC UA certificate environment variable names required by the ThermaCoreApp application when security is enabled in production environments.

## Critical Error Message
When OPC UA security is enabled in production without proper certificate configuration, the application raises:
```
ValueError: OPC UA certificate paths must be set in environment variables when security is enabled
```

This error is raised in `backend/config.py` at line 219 in the `ProductionConfig.__init__()` method.

## Required Environment Variables

### Certificate Path Variables (Required for Production Security)

When `OPCUA_SECURITY_POLICY` and `OPCUA_SECURITY_MODE` are not "None", the following three environment variables **MUST** be set:

#### 1. OPCUA_CERT_FILE
- **Purpose**: Path to the client certificate file
- **Description**: This is the X.509 certificate used to authenticate the OPC UA client to the server
- **Format**: Path to a PEM or DER format certificate file
- **Example**: `/etc/opcua/certs/client_cert.pem`
- **Required**: Yes (when security is enabled)
- **Validation**: Must be set in `os.environ` when `OPCUA_SECURITY_POLICY != "None"` and `OPCUA_SECURITY_MODE != "None"`

#### 2. OPCUA_PRIVATE_KEY_FILE
- **Purpose**: Path to the client's private key file
- **Description**: The private key corresponding to the client certificate used for cryptographic operations
- **Format**: Path to a PEM or DER format private key file
- **Example**: `/etc/opcua/certs/client_key.pem`
- **Required**: Yes (when security is enabled)
- **Validation**: Must be set in `os.environ` when `OPCUA_SECURITY_POLICY != "None"` and `OPCUA_SECURITY_MODE != "None"`

#### 3. OPCUA_TRUST_CERT_FILE
- **Purpose**: Path to the server certificate to trust
- **Description**: The OPC UA server's certificate that the client should trust (similar to a CA certificate)
- **Format**: Path to a PEM or DER format certificate file
- **Example**: `/etc/opcua/certs/server_trust_cert.pem`
- **Required**: Yes (when security is enabled)
- **Validation**: Must be set in `os.environ` when `OPCUA_SECURITY_POLICY != "None"` and `OPCUA_SECURITY_MODE != "None"`

## Additional OPC UA Configuration Variables

### Connection Configuration

#### OPCUA_SERVER_URL
- **Purpose**: The OPC UA server endpoint URL
- **Default**: `opc.tcp://localhost:4840`
- **Example**: `opc.tcp://plc.example.com:4840`
- **Required**: No (has default value)

#### OPCUA_USERNAME
- **Purpose**: Username for OPC UA authentication
- **Default**: None
- **Required**: Yes (in production)
- **Note**: Production environments require authentication

#### OPCUA_PASSWORD
- **Purpose**: Password for OPC UA authentication
- **Default**: None
- **Required**: Yes (in production)
- **Note**: Production environments require authentication

#### OPCUA_TIMEOUT
- **Purpose**: Connection timeout in seconds
- **Default**: 30
- **Example**: `60`
- **Required**: No (has default value)

### Security Configuration

#### OPCUA_SECURITY_POLICY
- **Purpose**: The security policy to use for OPC UA communication
- **Default**: `None` (insecure)
- **Production Default**: `Basic256Sha256` (auto-set if not specified)
- **Valid Values**:
  - `None` - No security (not allowed in production)
  - `Basic128Rsa15` - Weak security
  - `Basic256` - Weak security
  - `Basic256Sha256` - Strong security (recommended)
  - `Aes256_Sha256_RsaPss` - Strong security
- **Required**: Yes (production enforces non-None value)

#### OPCUA_SECURITY_MODE
- **Purpose**: The security mode for OPC UA communication
- **Default**: `None` (insecure)
- **Production Default**: `SignAndEncrypt` (auto-set if not specified)
- **Valid Values**:
  - `None` - No security (not allowed in production)
  - `Sign` - Sign messages only
  - `SignAndEncrypt` - Sign and encrypt messages (recommended)
- **Required**: Yes (production enforces non-None value)

#### OPCUA_ALLOW_INSECURE_FALLBACK
- **Purpose**: Allow fallback to insecure connection in development when certificates are not available
- **Default**: `false`
- **Valid Values**: `true`, `false`
- **Environment**: Development only (ignored in production)
- **Required**: No

## Configuration Validation Logic

The validation occurs in `backend/config.py` in the `ProductionConfig.__init__()` method:

```python
# Lines 204-219 in backend/config.py
# Enforce OPC UA security in production
if not os.environ.get("OPCUA_SECURITY_POLICY") or os.environ.get("OPCUA_SECURITY_POLICY") == "None":
    self.OPCUA_SECURITY_POLICY = "Basic256Sha256"
else:
    self.OPCUA_SECURITY_POLICY = os.environ.get("OPCUA_SECURITY_POLICY")
    
if not os.environ.get("OPCUA_SECURITY_MODE") or os.environ.get("OPCUA_SECURITY_MODE") == "None":
    self.OPCUA_SECURITY_MODE = "SignAndEncrypt"
else:
    self.OPCUA_SECURITY_MODE = os.environ.get("OPCUA_SECURITY_MODE")

# Ensure certificate paths are correctly set if security is enabled
if self.OPCUA_SECURITY_POLICY != "None" and self.OPCUA_SECURITY_MODE != "None":
    if not (os.environ.get("OPCUA_CERT_FILE") and os.environ.get("OPCUA_PRIVATE_KEY_FILE") and os.environ.get("OPCUA_TRUST_CERT_FILE")):
        raise ValueError("OPC UA certificate paths must be set in environment variables when security is enabled")
```

## Production Requirements

In production environments (`FLASK_ENV=production`):

1. **Authentication is REQUIRED**:
   - `OPCUA_USERNAME` must be set
   - `OPCUA_PASSWORD` must be set

2. **Security is ENFORCED**:
   - If `OPCUA_SECURITY_POLICY` is not set or is "None", it defaults to `Basic256Sha256`
   - If `OPCUA_SECURITY_MODE` is not set or is "None", it defaults to `SignAndEncrypt`

3. **Certificates are MANDATORY** (when security is enabled):
   - `OPCUA_CERT_FILE` must be set
   - `OPCUA_PRIVATE_KEY_FILE` must be set
   - `OPCUA_TRUST_CERT_FILE` must be set

## Example Production Configuration

### Minimum Required Environment Variables for Production
```bash
# Authentication
OPCUA_USERNAME=production_user
OPCUA_PASSWORD=secure_password_here

# Connection
OPCUA_SERVER_URL=opc.tcp://production-plc.example.com:4840

# Security (these will auto-default to secure values if not set)
OPCUA_SECURITY_POLICY=Basic256Sha256
OPCUA_SECURITY_MODE=SignAndEncrypt

# Certificates (REQUIRED when security is enabled)
OPCUA_CERT_FILE=/etc/opcua/certs/client_cert.pem
OPCUA_PRIVATE_KEY_FILE=/etc/opcua/certs/client_key.pem
OPCUA_TRUST_CERT_FILE=/etc/opcua/certs/server_trust_cert.pem
```

### Development Configuration (Insecure - Testing Only)
```bash
# Basic connection
OPCUA_SERVER_URL=opc.tcp://localhost:4840
OPCUA_USERNAME=dev_user
OPCUA_PASSWORD=dev_password

# Disable security for local testing
OPCUA_SECURITY_POLICY=None
OPCUA_SECURITY_MODE=None

# Optional: Allow fallback if certificates are configured but invalid
OPCUA_ALLOW_INSECURE_FALLBACK=true
```

## Certificate Format Requirements

### Supported Certificate Formats
Both PEM and DER formats are supported for all certificate files.

### Certificate Validation
The application performs the following validations on certificates:

1. **File Existence**: Certificate files must exist at the specified paths
2. **Format Validation**: Certificates must be valid X.509 certificates
3. **Expiry Validation**: Certificates must not be expired
4. **Not-Yet-Valid**: Certificates must be currently valid (not future-dated)

### Generating Test Certificates
For testing purposes, you can generate self-signed certificates using OpenSSL:

```bash
# Generate private key
openssl genrsa -out client_key.pem 2048

# Generate certificate signing request
openssl req -new -key client_key.pem -out client_csr.pem

# Generate self-signed certificate (valid for 365 days)
openssl x509 -req -days 365 -in client_csr.pem -signkey client_key.pem -out client_cert.pem

# For server trust certificate, obtain it from your OPC UA server administrator
```

## Troubleshooting

### Error: "OPC UA certificate paths must be set in environment variables when security is enabled"
**Cause**: One or more of the three required certificate path environment variables is not set.

**Solution**: Ensure all three variables are set:
- `OPCUA_CERT_FILE`
- `OPCUA_PRIVATE_KEY_FILE`
- `OPCUA_TRUST_CERT_FILE`

### Error: "OPC UA security policy 'X' requires client certificates in production"
**Cause**: Security policy is set but certificate files are not provided.

**Solution**: Either:
1. Provide the required certificate files, OR
2. Set `OPCUA_SECURITY_POLICY=None` and `OPCUA_SECURITY_MODE=None` (only in development)

### Error: "OPC UA trust certificate file does not exist"
**Cause**: The path specified in `OPCUA_TRUST_CERT_FILE` does not exist.

**Solution**: Verify the file path and ensure the file exists and is readable by the application.

### Error: "Invalid certificate format"
**Cause**: Certificate file is not a valid X.509 certificate in PEM or DER format.

**Solution**: Verify the certificate file format using:
```bash
openssl x509 -in certificate_file -text -noout
```

### Error: "Server certificate has expired"
**Cause**: The trust certificate has passed its expiration date.

**Solution**: Obtain a new valid certificate from your OPC UA server administrator.

## Related Files

- **Configuration**: `backend/config.py` (lines 96-108, 216-219)
- **Service Implementation**: `backend/app/services/opcua_service.py`
- **Certificate Loading**: `backend/app/services/opcua_service.py` (`_load_trust_certificate` method)
- **Environment Example**: `.env.example`
- **Tests**: `backend/app/tests/test_reviewer_batch_1_3_improvements.py` (certificate loading tests)

## Security Best Practices

1. **Never commit certificates** to version control
2. **Use strong security policies** in production (Basic256Sha256 or higher)
3. **Always use SignAndEncrypt mode** in production
4. **Regularly rotate certificates** before expiration
5. **Store certificates securely** with appropriate file permissions (600 or 400)
6. **Use different certificates** for different environments (dev, staging, production)
7. **Monitor certificate expiration dates** and renew proactively

## References

- OPC UA Security: https://opcfoundation.org/developer-tools/specifications-unified-architecture/part-6-mappings/
- Certificate Management: See `OPCUA_SECURITY_IMPLEMENTATION.md`
- Production Configuration: See `backend/PRODUCTION_CONFIG_REFACTORING.md`
