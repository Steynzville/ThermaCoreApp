# Security considerations and incident response

## Implemented boundaries

Authentication uses hashed passwords and bearer JWTs, current-account validation, approval checks, rate limiting and role/permission middleware. Browser session/persistent token storage exists; this is not a cookie-only design and does not eliminate XSS risk. Do not claim logout is a global persistent revocation system or that all tokens are short-lived: inspect actual authentication flow lifetimes.

Tenant ownership is enforced in backend queries and Socket.IO subscriptions/delivery as well as shared frontend filtering. Premium SCADA entitlement is checked against current database state. Account settings cannot modify roles or tenant IDs. Google/Apple linking requires current-password confirmation and verified stable provider identity, state/nonce and browser-bound one-use exchange. Passkeys validate origin/RP, challenge, user verification, signatures and counters. Avatar files are decoded, size/pixel constrained, stripped and re-encoded rather than served from user paths.

Remote control requires permission and owning unit before dispatch, configured HTTPS limits/modes and matching acknowledgement. Configure a bearer token and require authentication at the gateway; the token field is currently optional in application configuration. Acknowledgement does not establish physical state. No two-person approval, cryptographically immutable compliance ledger or certified emergency-stop controller is implemented. MQTT/OPC-UA security depends on provisioned certificates, trusted peers and installation configuration. Demo simulators are blocked in live mode.

## Known dependency and quality limitations

The optional `opcua==0.98.13` dependency has the outstanding **CVE-2022-25304 / PYSEC-2026-888** unbounded received-chunk denial-of-service advisory. The restoration checkpoint audit listed no patched release. Re-run `pip-audit` for current evidence; do not suppress this finding or claim zero vulnerabilities. Restrict direct OPC-UA peers/network access and resources, or use the supported MQTT/authenticated gateway path where appropriate. Disabling optional integration exposure is not the same as patching its installed dependency.

The Python quality workflow reports some checks without failing the job and can auto-format on protected-branch pushes. A green workflow is not proof of zero lint/security warnings. The prior checkpoint had one low-severity Bandit try/except/continue finding and legacy style debt. Use fresh artifacts, not stale counts. Build artifact scanning is heuristic; tests/coverage do not certify IEC 62443, NERC CIP or any legal compliance.

Audit the bootstrap `DEFAULT_ADMIN_PASSWORD`, legacy SQL seeds/diagnostic scripts and emergency-admin recovery mechanism as privileged deployment surfaces. Do not expose recovery credentials or enable historical default accounts. Browser camera URLs are public metadata to permitted users; protect their access at the stream provider and avoid embedded credentials. Backups hold cross-tenant data and credential material and require restricted access.

## Incident handling

Before deployment, assign verified incident commander, OT/site safety lead, engineering/security lead and communications/legal contacts. No contact addresses or response SLAs are provisioned by this repository.

1. **Identify:** record timestamps, request/command IDs, affected account/client/tenant/unit and observed physical state. Preserve sanitized application, gateway and database evidence; do not export unrelated tenant data unnecessarily.
2. **Contain:** use site-approved physical safety procedures and gateway/network controls when hardware is at risk. Disable compromised accounts/credentials using authorized administration. Revoke provider/passkey access as appropriate. Rotating the signing key invalidates signed sessions across the deployment and requires coordinated rollout. Do not rely solely on hiding a tenant/menu item, or invent a `tenant_isolation_flag` that does not exist.
3. **Investigate:** establish the entry point and scope; inspect ownership changes, account approvals/entitlements, attempted/acknowledged commands and telemetry provenance. A timed-out command may still have affected a device.
4. **Recover:** restore verified code/configuration and data using [Backup and recovery](BACKUP_RECOVERY.md), rotate affected secrets, validate tenant denial and actual gateway authentication, then deliberately reconnect hardware. Do not replay commands from restored logs.
5. **Review:** document root cause, actual impact, communication decisions and owned remediation actions. Determine contractual/regulatory notification requirements with responsible counsel; this repository does not establish a universal notification deadline.

Use trusted communication channels. Restrict evidence access, retain original logs and document integrity/chain of custody where required. Re-run full suites, builds, dependency/static scans and the relevant real integration checks before closure; do not equate a percentage with absence of security defects.
