# Historical restoration record

This is the chronological implementation log for the restoration delivered in merged PR #268 (Demo-App) and #269 (main). Statements such as “remaining”, “next” or “pending” below describe that checkpoint, not the current product. Old validation figures are historical, not current coverage evidence. Start with the [Operator manual](OPERATOR_MANUAL.md), [Architecture](ARCHITECTURE_AND_INTEGRATIONS.md), [Deployment](DEPLOYMENT_GUIDE.md) and [Testing](TESTING.md) for present behavior.

# Post-267 restoration recovery

Baseline: `eb5b69d9aa346d5e7d207636d22c2bbc19d2e7a6` immediately before PR #267.
Architecture retained from Demo-App `db9f3a2`: shared portfolio, identifier-based ownership, backend tenant checks, acknowledged hardware control, real report exporters and live integrations.

## Completed checkpoint 1: notifications and conditions screens

- NotificationBell, AlertsView and AlarmsView presentation recovered directly from baseline source; obsolete independent fixtures and name-based authorization removed.
- Shared UnitContext is the sole data source. Alarm category is distinct from severity: explicitly classified critical alerts remain alerts.
- Notifications navigate to `/alerts?unit=...&event=...` or `/alarms?...`; destination scopes the list and highlights the originating event.
- Original orange alert markers and red alarm markers/backgrounds restored. Viewing notifications does not acknowledge or resolve hardware conditions.
- Condition cards support keyboard activation and retain original summary/filter/cards layout.
- Validation: 8 targeted frontend tests pass, including notification routing/category/color/context and existing portfolio isolation tests. Final integrated visual/build/full-suite validation remains pending.

## Remaining stages

Four outputs and historical metrics; unit warning/NH3/history/maintenance; remote UI; reports UI/subset isolation; advanced premium SCADA; commercial Sales; real authentication/account settings; explicit demo/live separation including legacy protocol adapters; dependency/security checks; complete validation and Demo-App PR; then separate live-default main synchronization PR. No branch is to be merged automatically.

Checkpoint commits are published after each validated stage. This document tracks completed work, not promises of completed functionality.

## Completed checkpoint 2: first-class useful outputs

- Four output channels include capability, measured rate, units, quality, timestamp, freshness and active state. Live state uses each channel's latest sensor record (15-minute freshness); installation or water-tank content alone never activates an output.
- Electrical kW, useful heating/chilling kWth and AWG L/h are separate. Backend model/migration, serializer and ingestion contracts extended. Sensor channel names: current_power/power, useful_heat_kw, useful_chill_kw, water_flow.
- Original green power and blue water artwork retained; labelled red heating and cyan snowflake chilling added. First five demo units demonstrate all outputs, including chilling without AWG.
- Removed unused independent GridView condition fixtures. Demo control snapshots preserve local acknowledged simulation state without server controls overwriting it.
- Corrected pressure contract: atmospheric pressure cannot substitute for machine differential pressure.
- Validation: 37 targeted frontend tests, 18 backend tests and production build passed. New tests cover output quality/age, offline/inactive/capability distinctions and demo configurations.

## Completed checkpoint 3: unit history, maintenance and exact-unit routing

- Restored the eleven original machine-history graphs by reading pre-267 UnitHistoryTab; added useful heat, chilling and AWG rate graphs. Daily good-quality measurements, explicit units, UTC periods, 7/30 days, 1/5 years and custom dates (up to ten years per query). SQL aggregates per channel rather than returning unlimited raw readings. Ordinary readers retain access independently of SCADA.
- Portfolio history supports selected unit IDs and frontend annual chunks for long ranges; demo history is deterministic for the requested dates.
- Original red animated alarm and yellow warning card presentation restored, using shared descriptions. NH3 leaks require an explicit detector/event; differential pressure alone cannot prove ammonia leakage, and UI does not claim automatic hardware shutdown.
- Schedule Maintenance creates a database record (operator control permission, ownership checked); demo mode explicitly persists locally per account/tenant/unit. Errors never show success.
- Manage Remotely supplies an exact unit query parameter, resolved against the permitted portfolio. Foreign route state cannot grant access.
- Validation: 12 frontend tests and 18 backend tests pass, including five-year history, all 14 graphs, maintenance persistence/errors/permissions and foreign-unit rejection. Production build passes.

## Completed checkpoint 4: Remote Management

Original pre-267 RemoteControl presentation restored: switches and confirmation dialogs, mode/setpoint cards, automatic control, camera panel/fullscreen and control history. Commands retain tenant-scoped gateway acknowledgements; live controls never fabricate success. Setpoints are kW and L/h, not invented percentages. Configure allowed operation_modes and limits in UNIT_CONTROL_GATEWAYS. Only public capabilities are serialized, not gateway URLs/tokens. UNIT_CAMERA_FEEDS maps unit IDs to HTTPS browser-playable descriptors (id/name/url and optional resolution/fps); credential-bearing URLs are rejected. RTSP requires a browser media gateway. Camera status becomes active only after media loads.

Validation: 11 frontend behavior tests and 18 backend tests; production build. This checkpoint was reconstructed after the unpublished local checkpoint was lost during the usage-limit interruption. The first three remotely published checkpoints were recovered intact. Final integrated visual and full-suite validation remains pending.

## Completed checkpoint 5: Reports UI and strict export scoping

Recovered the original Reports cards, scopes, date popovers, section toggles and action layout from pre-267 source. Added matching Excel/Word/PDF choices; success sound follows actual exporter success. The real XLSX/DOCX/PDF engine remains intact. Scope is validated before querying; only selected permitted IDs are queried and all report collections are filtered again. Subset calculations use selected-unit costs, with unconfigured costs documented as assumptions. Machine history, useful heat/chilling totals, maintenance records and explicit unavailable compliance evidence are supported.

Schedules persist per authenticated account, recheck unit access at execution, support pause/resume and atomic processing claims. Processing claims expire to failed after ten minutes. Browser downloads execute while the authenticated Reports page is open; unattended email is not configured or simulated.

Validation: 15 frontend report tests pass. Actual files are parsed (ExcelJS, DOCX XML, PDF pdftotext) for one-unit and multi-unit isolation across every format, including histories, alerts, events, maintenance and commercial collections. Backend schedule tests cover ownership, permission, claims and foreign unit rejection. Production build passes. CI installs poppler-utils for real PDF content regression tests.

## Completed checkpoint 6: distinct commercial Sales

Restored ViewAnalytics from the pre-267 Sales source, retaining its summary cards and product/monthly/distribution charts. Removed independent fictional arrays; demo commercial records derive from the shared permitted units. Live SaleRecord records persist via admin POST /portfolio/sales and are read by admins/client admins with tenant and requested-unit scope. Ordinary operators/viewers cannot read commercial records. Sales reports use this same source. Monthly series is cumulative as described by the original UI; growth compares consecutive recorded months and otherwise remains unavailable. Currency is AUD.

Validation: 11 frontend calculation/export tests, 3 backend feature tests and production build pass.

## Completed checkpoint 7: premium access boundary

Added persistent account-level SCADA entitlements, administrator-only grant/revoke endpoint, current-database checks on advanced analytics API access, navigation and protected-route enforcement. Installation-wide SCADA protocol administration remains administrator-only even for premium viewers. User serialization includes the current entitlement. Ordinary unit history is unaffected. Advanced SCADA screen restoration is the next stage, not yet complete.

Validation: 19 protected-route tests and 2 backend entitlement tests pass, including grant/revoke with the same JWT, unauthorized grants and installation access denial.

## Completed checkpoint 8: bounded premium trend data

Added tenant-scoped /units/:id/scada-history with minute (up to two days), hourly (up to one year) and daily (up to ten years) good-quality SQL aggregation. Entitlements are enforced independently from ordinary history. UTC timestamps, canonical sensor selection and sample counts are retained. The frontend service uses the exact selected unit and explicit demo configuration; live failures propagate without synthetic data. Added missing shared normalization aliases for hot outlet, battery and flow measurements.

Validation: 21 backend portfolio/SCADA tests and 3 frontend service tests pass, covering quality filtering, ownership, revocation, query bounds and no live fallback. Advanced view restoration remains in progress.

## Completed checkpoint 9: original advanced visualization components

Recovered the pre-267 IndustrialGauge, MultiTimeframeTrendChart, ProcessFlowDiagram and ComprehensiveVisualizationDashboard source and reconnected visualization to a shared selected-unit SCADA context. Preserved gauges, chart types, exports, zoom/pan and topology rendering. Added heat/chill/water/power gauges; missing values are unavailable, not plausible defaults. Trend selection fetches the requested period and selects a metric to avoid mixing measurement units on one axis. Delayed responses cannot repopulate a different unit/tenant. Original decorative mock pipeline values are removed; demo topology is explicitly illustrative and live UNIT_PROCESS_DIAGRAMS configuration only exposes allowlisted public node/connection fields. No live flow is inferred from static plumbing.

Validation: production build, 4 frontend service/context tests and 4 backend entitlement/topology tests pass. Full original SCADA page navigation, advanced alert management and performance/health/predictive views remain the next restoration stages; ordinary Analytics has not been repurposed as a replacement.

## Completed checkpoint 10: persisted conditions and advanced Alerts

Restored pre-267 AdvancedAlertDashboard cards, severity/status/search filters, alert detail and acknowledgement dialog. It uses the selected shared SCADA unit, not independent mock arrays. Sensor ingestion records threshold episodes with actual measurements/thresholds and meaningful messages. NH3 alarms require an ammonia detector channel and configured threshold; pressure excursions remain ordinary alerts. Good newer readings resolve episodes; late/bad readings do not. Acknowledgements persist with current user and notes, require control permission and tenant ownership, and never clear an active hazard or claim hardware shutdown. Condition history is available to ordinary readers and included in shared events/reports. Gateway flags lacking details are explicitly described as missing cause evidence, not invented diagnoses.

Validation: 20 backend condition/portfolio tests, 2 frontend acknowledgement/calculation tests and production build pass. Tests include foreign-unit denial, viewer denial, retained acknowledgement notes, repeat episodes, quality/ordering and non-NH3 pressure warnings.

## Completed checkpoint 11: original SCADA advanced views and navigation

Restored the original pre-267 ScadaMainPage navigation/layout and PerformanceAnalyticsDashboard source, including Performance, Equipment Health, Energy and Predictive panels. They remain separate from ordinary Analytics. Selected-unit recorded interval totals drive production/coverage statistics, maintenance comes from persisted schedules, and exports use the real selected-unit report engine. Unsupported efficiency, sensor-quality, health-score and remaining-life calculations are explicitly unavailable rather than invented. Removed the hardcoded TC003 vibration prediction. The predictive view can show advisory linear threshold projections only for configured matching-unit sensors, sufficient observations and strong fit; it does not assert a validated remaining-life model. Original consumption labels now correctly describe this generator's electrical production.

Validation: production build and 3 calculation regression tests pass, including date/unit isolation, partial measurement coverage, missing metrics and bounded threshold projections. Full integrated visual comparison and suite validation remain outstanding.

## Integrated validation follow-up

The first full frontend run passed 1,772 tests and found 21 failures in three files. Seventeen were an outdated icon mock after the four-output addition; navigation assertions needed the explicit premium permission. Fixed a real integration issue: fresh-login mapping dropped premium_scada, while logout should retain the original null-permissions state. All 77 tests in the three affected files now pass. No tests were removed or meaningful assertions weakened.

## Completed checkpoint 12: Google and Apple authentication

Replaced Google/Apple placeholder dialogs with real OIDC authorization-code flows. Backend verifies provider signature, issuer, audience, expiry, nonce and authorized party; state and browser-PKCE handoffs are single-use. JWTs never appear in redirect URLs. Existing active/approved-account rules apply. Providers are linked to a stable subject through Settings after current-password confirmation, rather than trusting an email coincidence. Login visuals/buttons remain unchanged. Biometric/passkey integration is the next auth stage.

Required external configuration (not supplied or fabricated): AUTH_FRONTEND_URL (frontend origin), OAUTH_GOOGLE_CLIENT_ID, OAUTH_GOOGLE_CLIENT_SECRET, OAUTH_GOOGLE_REDIRECT_URI; OAUTH_APPLE_CLIENT_ID (Services ID), OAUTH_APPLE_CLIENT_SECRET (Apple developer-signed client-secret JWT, rotated before expiry), OAUTH_APPLE_REDIRECT_URI. Register callbacks exactly as https://BACKEND/api/v1/auth/oauth/google/callback and .../apple/callback with the corresponding provider. Apple uses form_post. Use HTTPS; localhost HTTP is permitted only for local development. First link a provider in Settings, then use it on Login. An unconfigured provider reports the exact missing configuration keys, never mock success.

Primary provider references: https://developers.google.com/identity/openid-connect/openid-connect ; https://developers.google.com/identity/gsi/web/guides/verify-google-id-token ; https://developer.apple.com/documentation/signinwithapple/verifying-a-user .

Validation: production build, 33 Login tests and 4 backend OAuth tests pass. Tests verify both provider flows, real RSA JWT claim/signature validation, wrong browser verifier, state/ticket replay, required password for linking and missing configuration. Real provider end-to-end sign-in requires the above deployment credentials.

## Completed checkpoint 13: real passkey / biometric sign-in

The existing fingerprint control invokes navigator.credentials.get with mandatory user verification; the browser can use biometrics, device PIN or a security key. Settings registers discoverable passkeys through navigator.credentials.create after password confirmation, lists persisted keys and removes them securely. The backend uses py_webauthn 2.7.1 for origin/RP, challenge, signature and counter verification. Challenges are persisted, expiring and single-use; keys belong to the current account. Revoked keys cannot authenticate. Biometric templates/private keys never reach the application.

Deployment requires WEBAUTHN_RP_ID (frontend relying-party domain, no scheme/path) and WEBAUTHN_ORIGIN (exact frontend HTTPS origin). localhost HTTP is supported for development. A physical browser/device credential ceremony is required for end-to-end deployment validation; no credential or success is simulated when unavailable.

Validation: production build, 33 Login tests and 2 backend integration tests pass. Backend tests construct real ES256 registration/assertion data and verify successful login plus wrong-origin, missing-user-verification, challenge replay, cloned-counter and removed-key rejection. Library reference: https://duo-labs.github.io/py_webauthn/authentication.html .

## Completed checkpoint 14: persisted own-account settings and cleanup

Settings retains its card/style language and now loads/saves username, names/display name, avatar and actual application preferences through current-account-only APIs. Images are limited to 2 MB/four megapixels, decoded as PNG/JPEG/WebP, resized to 256 pixels and re-encoded to metadata-free PNG stored in the database; user filenames are never used as paths. Theme, temperature, sound/volume and polling interval persist per account and are applied on login; live socket events continue independently. Own-password changes use the current-password endpoint in Settings, while User Management retains administrative resets.

Removed User Management's duplicate Settings tab and nonfunctional personal email/SMS/backup/retention controls rather than pretending those deployment services exist. Removed the now-unused AlertSettings, NotificationSettings, DataRefreshSettings and FormFieldGroup components. Tests specifically for their removed placeholder controls were replaced with backend persistence/authorization and frontend successful/failed save tests; retained Display tests and administrative password-validation tests (now enter through a managed user's reset action).

Validation: 112 related frontend tests plus the new own-password test, 2 account backend tests, and production build pass. The first full backend run passed 1,392 tests and exposed six order-dependent failures from leaked rate-limit test configuration/buckets. Test-only isolation now resets limiter state per test; rate-limit tests explicitly enable it and still assert blocking/headers. All 82 affected backend tests pass; production rate limiting was not relaxed.

## Completed checkpoint 15: explicit demo/live deployment boundary

Shared runtime code reads an explicit branch deployment data mode; Demo-App declares demo, and main synchronization will declare live. Environment overrides must be either demo or live. Development mode no longer enables demonstration telemetry implicitly. Backend legacy Modbus/DNP3 drivers and protocol simulators are unavailable unless DEMO_DATA_ENABLED=true, including when a service is attached accidentally. Production uses real MQTT/OPC UA telemetry and acknowledged HTTP control gateways. Demo database seeding is opt-in and requires a deployment-supplied password of at least 12 characters; no default fictional client/account is seeded into live installations.

Device history now queries persisted conditions instead of returning fabricated status changes. MQTT connection initiation reports connecting until its broker acknowledgement arrives. Remote Management labels a configured gateway accurately and correctly displays a zero water level. Demo machine/water controls update all actual output states while retaining nominal rates for historical demonstrations.

Validation: build/security bundle check, 67 backend boundary/adapter/security regressions, 53 protocol/history frontend tests, a four-output control regression and 62 application/login tests pass. Adapter tests explicitly opt into demo mode; separate production-boundary tests prove live rejection. Full-suite validation continues separately.

## Checkpoint 16: dependency security and visual/integration validation

Updated dependencies and both frontend lockfiles to resolve the published frontend advisories (React Router, Axios, transitive archives/globs/UUID and the test runner). Vitest 4 uses maxWorkers in CI; the 60% coverage threshold remains, and coverage explicitly includes application source rather than accepting the new loaded-files-only default. Test browser constructors/geometry/storage mocks were corrected for the upgraded libraries. Unit-test HTTP defaults now reject unconfigured requests locally instead of contacting the deployed API.

Backend Pillow, Click, cryptography and pyOpenSSL were updated to compatible patched versions. Ruff formatting and safe fixes were applied to the recovery files. The remaining dependency audit finding is opcua 0.98.13 / CVE-2022-25304 (unbounded received chunks); no patched release is listed. Treat direct OPC UA peers as trusted and isolate this optional adapter behind network/resource limits; MQTT or an authenticated telemetry gateway avoids exposing that parser to untrusted peers. This finding is not suppressed or described as fixed. Bandit reports one existing low-severity try/except/continue in branch_reduction.py, with no medium/high findings. Broad legacy style lint remains non-clean; existing quality rules were not weakened.

Browser review used the actual pre-267 commit eb5b69d and the corrected application at 1440×1100. Login, Reports, Alerts, Alarms, Sales, Unit Details/History, Remote Management and SCADA were rendered from both revisions. The original layouts/cards/colours are retained; changes are scoped data, truthful values/configuration states and the requested controls. Clicking Unit 002 in the overview, opening History, and choosing Manage Remotely retained Unit 002 throughout. Original History rendered 11 graphs; the corrected unit adds supported output history. All eight advanced SCADA subviews rendered without JavaScript errors. A real five-page single-unit PDF was generated, rendered and checked for foreign unit identifiers. The existing file-parsing regressions also cover single/multi-unit XLSX, DOCX and PDF.

Visual review caught and corrected Sales' inherited mixed-unit axis/clipped currency labels and the sidebar counting alarms as ordinary alerts. The sales layout remains unchanged, with separate unit/revenue axes. Alert counts now use explicit category and resolution state; acknowledging an alarm does not falsely clear it.

External deployment requirements remain real: Google/Apple OAuth configuration, WebAuthn origin/RP, authenticated gateway endpoints/secrets and hardware mappings, actual telemetry brokers/servers, camera feeds, and process topology. No provider credential, hardware acknowledgement, camera playback or production telemetry is fabricated. Scheduled report downloads require an open Reports page as explicitly described in that UI.

Login audit also identified a missing SendGrid installation for password-reset delivery. The dependency is now pinned; SENDGRID_API_KEY, verified EMAIL_FROM and FRONTEND_URL are required. Missing configuration returns the same explicit 503 for known/unknown email addresses, preserving account-enumeration protection. Actual email delivery requires those external credentials.

Final full frontend validation at this checkpoint: 1,725 tests pass, with all-source line coverage 65.07% (required 60%). Full backend after dependency/format updates: 1,401 pass, 12 skipped, coverage 86.76%; the additional password-reset configuration regression is validated separately. Production build and bundle security check pass. Frontend dependency audit: zero findings. Backend dependency audit: only the explicitly documented unpatched OPC UA advisory.
The final authentication/email/output-contract regression run passes all 74 tests, including the new configuration failure case. Frozen frontend dependency installation passes.

GitHub PR validation exposed the old CI pnpm 10.4.1 ignoring workspace overrides written by pnpm 11. The package manager is now pinned to 11.25.0 in package.json and CI, preserving frozen-lockfile installation and security overrides rather than bypassing that gate. Node minimum reflects the upgraded toolchain.
The clean GitHub install additionally required an explicit pnpm 11 build-script policy. Only esbuild's platform-binary installation is allowed; core-js's optional postinstall is explicitly disabled. No blanket build-script permission or frozen-install bypass was added.
