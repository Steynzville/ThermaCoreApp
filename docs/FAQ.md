# Frequently asked questions

**Is Demo-App connected to real generators?** Its default portfolio/telemetry is explicitly simulated, with deterministic history and local demo controls. It still uses real authentication and tenant isolation. main defaults to real API data and never fills a failed live request with fictional telemetry.

**Why is my account pending or my portfolio empty?** Registration does not grant approval or unit ownership. An administrator must approve the account and assign its real tenant/client. A viewer/operator sees only its tenant; a client administrator sees only its client's tenants.

**Why does an installed output icon remain off?** Capability is different from activity. Online status, a positive useful-output reading, GOOD quality and freshness are required. Water tank level is not water production; hot/cold temperature is not useful thermal power.

**Does low pressure prove an ammonia leak?** No. The NH3 alarm uses detector/event evidence. Read the actual condition cause and follow site safety procedures. The web UI does not guarantee pressure-triggered automatic shutdown.

**Does acknowledging clear an alarm?** It records acknowledgement, not physical resolution. An active acknowledged alarm remains until its underlying condition resolves.

**Do I need premium SCADA for history?** No. Unit History includes ordinary machine metrics and power/heat/chill/water history, selectable up to ten years per bounded query. Premium SCADA adds its separate advanced views and finer bounded queries, subject to entitlement.

**Does Remote Management guarantee a physical change?** It requires a matching gateway acknowledgement. Actual telemetry confirms physical state separately. A timeout can have an unknown outcome; check the device before retrying. Hardware interlocks and authenticated gateways must be commissioned externally.

**Can I export just one unit?** Yes. Select the unit and Excel, Word or PDF. Every report collection/calculation follows the permitted selection. Current snapshots and historical periods are labelled separately; missing data is not fabricated.

**Will scheduled reports be emailed while I am offline?** No. Schedules persist, but downloads run while the Reports page is open and signed in. There is no unattended email report worker.

**How do Google, Apple and biometrics work?** Configure providers and link your existing approved account in Settings with password confirmation. Passkeys use browser WebAuthn and a registered authenticator. Biometric/private key material stays with the authenticator. Missing configuration is an error, not a demo sign-in.

**How do I reset my password?** Use Forgot Password. Delivery requires SendGrid credentials, a verified sender and the correct frontend link origin. Administrators have separate managed-account capabilities. Own password changes are in Settings.

**What account settings persist?** Username/name/display fields, a validated avatar and sound, volume, temperature, theme and polling preferences persist through own-account APIs. Roles, tenant assignment and managed email are not personal preferences.

**Are Sales, Analytics and SCADA the same page?** No. Sales shows commercial records; ordinary Analytics summarizes the permitted operating portfolio; premium SCADA provides advanced unit views. Current Sales navigation is system-admin-only.

**Are efficiency gains, regulatory compliance or uptime guaranteed?** No. Financial assumptions and trend projections are explicitly limited by recorded data. Repository tests do not establish field performance, certification or an SLA. See the [feature matrix](FEATURE_COMPARISON_MATRIX.md) and [security guide](SECURITY_INCIDENT_RESPONSE.md).
