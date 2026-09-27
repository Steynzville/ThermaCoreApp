# Troubleshooting

Diagnose the failing boundary before changing data mode. A live outage must remain an outage; enabling demo data is not a repair.

| Symptom | Check and next action |
|---|---|
| Empty portfolio | Confirm `/auth/me`, active account, role, `tenant_id` or `client_id`, unit ownership and current selection. Unassigned non-admin accounts legitimately see no units. Do not grant ownership by unit name or client email. |
| HTTP 401/403 | Check token expiry and current database permission/approval/entitlement. Re-authenticate; never edit stored roles to bypass a guard. |
| Client admin cannot open User Management or Sales screen | These frontend routes currently require system admin. Client portfolio selection is a separate capability. |
| Google/Apple unavailable | Check exact client ID/secret/callback and `AUTH_FRONTEND_URL`. Apple needs a valid signed client-secret JWT and form-post callback. Link an existing approved account in Settings first; email matching does not automatically link. |
| OAuth completion rejected | Start again in the same browser tab; the verifier/ticket is single-use and expires. Check origin, provider nonce/state and clock. Do not paste JWTs into URLs. |
| Passkey failure | Check HTTPS, browser/device support, exact `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN`, credential registration and user verification. Cancellation is not successful login. |
| Reset email unavailable | Configure `SENDGRID_API_KEY`, verified `EMAIL_FROM`, and `FRONTEND_URL`; inspect delivery logs without exposing reset tokens. SMTP fields do not configure the current reset route. |
| Socket disconnected | API and Socket.IO share `VITE_API_BASE_URL`; verify `/socket.io`, proxy upgrade/polling support, exact CORS origins and access JWT. Keep the one-worker threaded deployment. There is no current `VITE_WS_URL` switch or supported `window.socket` console API. |
| Connected but old readings | Socket connectivity does not prove fresh hardware data. Check broker/server ingestion, sensor IDs, GOOD quality and measurement timestamps. Stale outputs must remain inactive. |
| Missing historical totals | Verify sensor type/units and selected UTC range. Energy integration rejects bad samples and gaps over the configured maximum; missing channels stay null. Unit History supports longer daily queries independently of premium SCADA. |
| Premium SCADA denied | Have a system admin verify current `premium_scada` entitlement; navigation hiding is not the only enforcement. Ordinary Unit History remains available with read permission. |
| Process diagram/camera absent | Configure per-unit `UNIT_PROCESS_DIAGRAMS`/`UNIT_CAMERA_FEEDS`. Check HTTPS playback authorization/CORS and browser format. No actual topology or stream is synthesized in live mode. |
| Gateway 503 | Configure an HTTPS `UNIT_CONTROL_GATEWAYS` entry, authenticated gateway endpoint, mode names and limits for this exact unit. |
| Gateway 502/timeout | Inspect the physical device before retrying. An unknown outcome must not be reported as success; require exact command ID, acknowledgement and accepted controls. |
| Maintenance rejected | Use a future timezone-aware date and 3–2000 character description; check owning unit and `remote_control` permission. A failed save is not persisted. |
| Report generation fails | Choose permitted units and a format; validate date range, subset assumptions, API availability and PDF font loading. Never broaden the scope to make generation succeed. |
| Scheduled report does not run | Reports must be open and signed in. Check due time, pause/failure/claim status, browser download restrictions and current unit permissions. There is no background email worker. |
| Avatar rejected | PNG/JPEG/WebP only, ≤2 MB and ≤4 MP; also check deployment request-size limits. SVG/arbitrary files are not accepted profile images. |
| Startup/database failure | Check PostgreSQL credentials/TLS, migration logs and expected tables. Rehearse additive startup migrations in staging. Do not blindly run historical seed/fix scripts on a live database. |
| CI install fails | Use pinned pnpm 11.25.0 and frozen lockfile. Keep explicit esbuild/core-js build policy. Do not bypass the lockfile/security gate. |

Collect the failing request path, status, sanitized response, timestamp, commit and affected unit/tenant IDs. Never include passwords, bearer tokens, provider secrets or camera credentials in an issue. `/health` checks web-service reachability; it does not certify live telemetry, gateways or current test coverage. See [Deployment](DEPLOYMENT_GUIDE.md), [Testing](TESTING.md) and [Security](SECURITY_INCIDENT_RESPONSE.md).
