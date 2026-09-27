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
