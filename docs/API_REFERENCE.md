# API reference

The Flask blueprints are registered under `/api/v1`. `/health` is a separate deployment health endpoint. Requests normally use JSON and `Authorization: Bearer <access-token>`; avatar upload is multipart and OAuth callbacks also support provider form data. Response shapes differ between legacy and current endpoints: do not assume a universal `success/error_code` envelope. Inspect HTTP status and the returned `error`/`message` or validation details.

This reference describes implemented application contracts. Route decorators and schemas in `backend/app/routes/` and `backend/app/utils/schemas.py` remain the detailed source for administrative CRUD fields.

## Authentication and account

| Method/path (after `/api/v1`) | Contract |
|---|---|
| POST `/auth/login` | `{username, password, keep_me_signed_in?}`; returns `access_token`, `refresh_token`, `expires_in`, `user` after active/approval checks |
| POST `/auth/self-register` | Validated registration; creates a pending account, not automatic privileged access |
| POST `/auth/register` | Protected administrative registration; see route permissions/schema |
| GET `/auth/me` | Current server-validated account, ownership, permissions and entitlement |
| POST `/auth/refresh` | Requires a refresh JWT, not an access JWT; bearer transport, not a documented cookie-only flow |
| POST `/auth/logout` | Application logout endpoint; do not assume this implements a persistent global token-revocation registry |
| POST `/auth/change-password` | Current password and validated new password |
| POST `/auth/forgot-password` | Registered email; SendGrid delivery when configured; generic configured response avoids account enumeration |
| POST `/auth/reset-password` | Valid reset token and new password; expiration/validation enforced |
| POST `/auth/oauth/{google,apple}/start` | `{challenge, link, password}`; browser challenge required; authenticated password confirmation for linking; returns provider `url` |
| GET/POST `/auth/oauth/{provider}/callback` | Provider code/state callback; Apple form POST supported; validates provider identity and redirects to frontend with one-use exchange ticket |
| POST `/auth/oauth/exchange` | `{code, verifier}`; returns application session or `{linked: true}` |
| GET `/auth/oauth/identities` | Current account's linked provider list |
| POST `/auth/passkeys/register/options` | Current account/password; returns `transaction` and WebAuthn creation `options` |
| POST `/auth/passkeys/register/verify` | `{transaction, name, credential}`; verifies authenticator registration |
| POST `/auth/passkeys/login/options` | Returns discoverable-authentication challenge/options |
| POST `/auth/passkeys/login/verify` | `{transaction, credential}`; verified assertion yields application session |
| GET `/auth/passkeys` | Own credential metadata in `data` |
| DELETE `/auth/passkeys/{credential_id}` | Own credential deletion with `{password}` |
| GET/PUT `/account/settings` | Own `{profile, preferences}`; no target user ID or role/tenant updates |
| POST/DELETE `/account/avatar` | Multipart `avatar` upload or remove; returns updated settings |

Settings profile fields: `username`, `firstName`, `lastName`, `displayName`; email is returned but not editable here. Preferences: boolean `soundEnabled`, finite `volume` 0–1, `refreshInterval` 5000/15000/30000/60000 milliseconds, `temperatureUnit` celsius/fahrenheit, `theme` light/dark/auto. Username is 3–80 letters, digits, dots, hyphens or underscores. Avatar input is PNG/JPEG/WebP, at most 2 MB and four megapixels; the server decodes and stores a metadata-free PNG thumbnail up to 256×256. A lower deployment request-size limit may also apply.

Google/Apple linking uses stable provider subjects, not email matching. Passkeys require secure origin/RP configuration and actual WebAuthn support. Missing providers/email return explicit configuration failures; no demo authentication substitutes exist. See [Deployment](DEPLOYMENT_GUIDE.md).

## Units and recorded data

| Method/path | Scope and purpose |
|---|---|
| GET `/units`, `/units/{id}`, `/units/stats` | Permitted tenant-owned units; listing supports route-defined filters/pagination |
| POST/PUT/DELETE `/units[/{id}]` | Administrative asset operations with route permission/role checks |
| GET/POST `/units/{id}/sensors` | Scoped sensor metadata; creation requires write permission |
| GET `/units/{id}/readings` | Scoped recorded sensor readings; filters/pagination in `units.py` |
| PATCH `/units/{id}/status` | Protected unit status management; not a replacement for acknowledged physical control |
| GET `/units/{id}/history?from=YYYY-MM-DD&to=YYYY-MM-DD` | Ordinary daily GOOD metric means; UTC inclusive dates, at most 3660 days/query; `{data, aggregation, timezone}` |
| GET `/units/{id}/scada-history?from=ISO&to=ISO&resolution=hour` | Premium entitlement plus tenant/read permission; timezone-aware timestamps; minute ≤2 days, hour ≤366 days, day ≤3660 days |
| GET `/portfolio/history?unit_ids=A,B&from=YYYY-MM-DD&to=YYYY-MM-DD` | Permitted subset, integrated daily production; default latest 90 days, maximum 366 days/query |
| GET `/portfolio/events` | Acknowledged command history; optional `unit_ids`, UTC `from/to`, page; `{data, has_next}` with 250 rows/page |
| GET `/portfolio/conditions` | Condition episodes with the same subset/date/pagination parameters |
| POST `/units/{id}/conditions/{condition_id}/acknowledge` | `remote_control` permission, owning unit, `{notes}` up to 2000 characters; does not resolve the underlying condition |
| GET/POST `/units/{id}/maintenance` | Read schedules or create with `remote_control`; `{scheduledAt, description}` future timezone-aware timestamp and 3–2000 character description; creation 201 |

The four output channels are power kW, useful heat/chill kWth and water L/h, with capability, value, quality, measured timestamp, freshness and activity. Only GOOD fresh positive readings on an online capable unit are active. Other historical metrics include temperatures, humidity, tank level, voltage, differential pressure and loop flows. NH3 conditions derive from configured ammonia detector measurements; pressure alone is not proof of a leak. See [Portfolio data](PORTFOLIO_DATA_AND_REPORTING.md) for integrations and calculation rules.

## Controls, reporting and commercial records

`POST /remote-control/units/{id}/controls` accepts supported fields: boolean `machinePower`, `waterProductionOn`, `autoSwitchEnabled`; finite nonnegative `powerSetpoint` (kW), `waterSetpoint` (L/h); configured `operationMode`. Positive setpoints require gateway limits. Offline production changes are rejected until machine power is enabled; powering down also disables production/setpoints. Tenant/permission checks occur before dispatch.

The server sends `{command_id, unit_id, controls}` to the configured HTTPS gateway with `Idempotency-Key` and configured bearer credential. Success requires the exact command ID, `acknowledged: true` and exact accepted controls. Acknowledged commands persist without overwriting measured telemetry. Missing gateway is 503; unavailable/mismatching acknowledgement is 502. Never automatically retry an unknown-outcome command. Related compatibility endpoints are POST `/remote-control/units/{id}/power` (`power_on`), POST `/remote-control/units/{id}/water-production` (`water_production_on`), GET `/remote-control/units/{id}/status` and GET `/remote-control/permissions`.

Report files are generated in the browser by `portfolioReportService`, `reportModel` and `reportExportService`, using real ExcelJS/docx/jsPDF serializers. There is no generic server `/reports/generate` endpoint. Selected permitted unit IDs constrain queries **before** generation and are rechecked across every report section. Files are genuine XLSX, DOCX or PDF.

| Method/path | Contract |
|---|---|
| GET/POST `/portfolio/report-schedules` | Own schedules; create `{scheduledAt, config}` with explicit permitted `selectedUnits` and `outputFormat` pdf/xlsx/docx |
| PATCH `/portfolio/report-schedules/{id}` | Own `{status}` transition; atomic due claim into processing, then completed/failed; paused/failed can resume; stale processing claims expire after ten minutes |
| GET `/portfolio/sales` | Admin/client_admin permitted-unit records, optional `unit_ids` |
| POST `/portfolio/sales` | Admin only; exact fields `{unitId, date, revenue, productLine, reference}`; nonnegative finite AUD revenue, nonfuture date, unique reference |
| PUT `/users/{id}/entitlements/premium-scada` | System admin, `{enabled: boolean}`; current database entitlement controls premium APIs |

Scheduled reports execute while the authenticated Reports page is open. They are not an unattended email/export worker. Current permissions are checked again before execution.

Administrative user/tenant/client APIs remain in `users.py`, `tenants.py` and `clients.py`. Installation `/scada` and `/protocols` APIs are system-admin restricted; live mode blocks simulator-only operations. Do not infer permission from a visible menu alone.

## Socket.IO

Connect to the API origin at `/socket.io` using `auth: {token: accessJWT, tenant_id: optionalTenantId}`. The server initially subscribes the session to its permitted units. Client events are `subscribe_unit`/`unsubscribe_unit` with `{unit_id}`, and `get_status`; arbitrary `join_room` is not the implemented contract.

Replies include `connection_confirmed`, `subscription_confirmed`, `unsubscription_confirmed`, `status_response` and scoped errors. Recorded changes are delivered through sensor/unit/alert event methods in `websocket_service.py`; ownership and token validity are rechecked on delivery. The frontend uses events to refresh API snapshots. Tenant events are not globally broadcast. Demo mode reports demo connection state without pretending to connect to equipment.
