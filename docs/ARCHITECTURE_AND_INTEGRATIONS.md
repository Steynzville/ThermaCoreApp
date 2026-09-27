# Architecture and integration boundaries

## Shared application and tenant isolation

React uses AuthContext for the server-validated identity, TenantContext for the permitted selection, and UnitContext for the shared portfolio. Dashboard, Units, Notifications, Alerts, Alarms, ordinary Analytics and Reports consume this shared data instead of independent screen fixtures. Backend SQLAlchemy queries and Socket.IO delivery enforce ownership independently of browser filtering.

| Identity | Data scope and capabilities |
|---|---|
| System administrator | All tenants; system administration and cross-portfolio selection |
| Client administrator | Tenants whose `client_id` matches the account; selection never expands beyond that client |
| Operator | Assigned `tenant_id`; read access and `remote_control` permission |
| Viewer | Assigned `tenant_id`; read-only operational access |
| Unassigned non-admin | Empty portfolio; no name-based or fictional ownership fallback |

Roles and permissions are distinct checks. Current `/admin/users`, Sales `/analytics`, `/system-health` and `/protocol-manager` frontend routes are system-admin-only. Client administrators can select their client portfolio but must not be promised the global user-management panel. Backend APIs apply their own role/permission restrictions; for example the scoped Sales read API permits admin and client_admin while creating sales requires admin.

Premium SCADA is a separate account entitlement, checked by protected navigation/routes and backend premium APIs against current database state. Active system administrators have access. An administrator can grant/revoke `premium_scada`; ordinary Unit History does not require it. Installation/protocol administration is a different system-admin capability.

## Demo versus live

`VITE_DATA_MODE` explicitly overrides `src/config/deployment.json`; only `demo` and `live` are accepted. Demo-App's branch configuration and Netlify settings select demo; main selects live. Missing configuration defaults to live. Development mode does not activate demo data, and `VITE_MOCK_MODE` is not the current mode switch.

Demo portfolio identities and deterministic readings are in `src/data/demoPortfolio.js` and `mockUnits.js`. Demo history, sales and simulated controls are deliberately identified as demonstration data; controls do not contact physical equipment. Demo maintenance is browser-persisted and scoped by account, tenant and unit. Both modes use real authentication and preserve tenant filtering.

Live mode loads authenticated API snapshots, recorded history/events and persisted schedules. Empty or failed API responses remain empty/errors; they do not generate fictional tenants or telemetry. `DEMO_DATA_ENABLED` is a separate backend opt-in, false by default and in Render configuration. Historical protocol simulators are unavailable in live mode. Demo account seeding additionally requires `DEMO_CLIENT_ADMIN_PASSWORD` of at least 12 characters.

## Four useful outputs

Outputs are electrical `power` (kW), useful `heat` (kWth), useful `chill` (kWth) and AWG `water` (L/h). Each includes capability, measured value, quality, freshness/timestamp and activity. Activity requires an online/operational unit, installed capability, positive finite reading, GOOD quality and a non-stale measurement. Capability alone never illuminates an active output. Tank level is not water production; temperature is not useful heating/chilling power.

The API models and `unit_outputs.py` normalize these channels; `unitOutputs.js` renders the same contract. Configure real sensors and units. Missing data stays unavailable, rather than inferring useful output from installed capacity.

## Live ingestion and delivery

MQTT and OPC-UA adapters require deployment-specific endpoints, credentials, certificates and sensor mapping. Recorded readings feed current GOOD snapshots, condition episodes and historical aggregation. Optional legacy Modbus/DNP3/protocol simulators are demonstration code, not commissioned production fieldbus integrations.

Socket.IO uses the API origin and `/socket.io`, with access JWT and optional `tenant_id` in the handshake. The server verifies current ownership at subscription and delivery, and rejects expired/refresh tokens or inactive accounts. The frontend refreshes shared snapshots on events and also polls at the saved account interval. A connected socket alone does not prove fresh hardware data.

Deploy the current single-worker threaded Gunicorn topology. Subscription/authorization state is process-local; adding workers requires a designed shared-state/message architecture, not simply increasing the worker count.

## Hardware, cameras and process topology

Controls use a server-configured HTTPS gateway per unit. The application validates permission, tenant, allowed fields, device limits and mode, then requires a matching command ID, explicit acknowledgement and exact accepted controls. Only acknowledged commands are recorded. A timeout leaves an unknown physical outcome and is not automatically retried. See the [API](API_REFERENCE.md) and [deployment](DEPLOYMENT_GUIDE.md) guides.

Gateways must implement device authentication, interlocks, idempotency and physical protocol adaptation. Configure a server-side bearer token and require it at the gateway; the application currently supports a gateway token but does not require the token field in code. Do not expose an unauthenticated gateway. The web application does not implement two-person approval, physical emergency-stop certification or automatic pressure-triggered shutdown.

`UNIT_CAMERA_FEEDS` exposes only selected public camera fields with HTTPS URLs and no URL credentials. Camera authorization, browser-compatible streaming, CORS and any expiring access URLs are deployment responsibilities. No configured feed means no pretend video.

`UNIT_PROCESS_DIAGRAMS` provides validated per-unit topology for premium SCADA. Demo topology is illustrative; live topology must be configured and cannot be inferred from a generic unit drawing.

## Accounts and external providers

Google/Apple OAuth verifies signed provider identities, state, nonce and single-use browser-bound exchange. Link an existing approved account in Settings using its current password. Matching email alone never links or elevates an account. Missing provider configuration returns a configuration error. WebAuthn verifies real registration/assertion challenges, RP/origin, user verification and counters. Settings persist own profile/preferences in the backend; avatar images are decoded, constrained and re-encoded. See [Deployment](DEPLOYMENT_GUIDE.md) for exact configuration and [Security](SECURITY_INCIDENT_RESPONSE.md) for limitations.
