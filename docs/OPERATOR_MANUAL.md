# Operator manual

## Sign in and choose scope

Use an approved account. Google or Apple works after the provider is configured and linked to your existing account in Settings. The biometric option uses a registered passkey, not a simulated fingerprint. Forgot Password requires configured email delivery. If an option reports missing configuration, contact the deployment administrator.

System administrators select any tenant or all tenants. Client administrators select only facilities belonging to their client. Operators/viewers see their assigned tenant. An empty or unassigned portfolio is not permission to substitute another tenant. The current account and backend ownership determine access; the tenant picker is only a view filter.

Check the data mode: **Demo-App contains labelled fictional demonstration readings and simulated controls**. **main defaults to recorded live data**, including honest empty/offline states. Both modes authenticate users and enforce scope.

## Dashboard, notifications and conditions

Dashboard summarizes the current permitted portfolio and provides tabs for ordinary Analytics and other operational views. Switching tenant also changes analytics totals and assumptions context.

Notifications preserve separate alert/alarm presentation and colors. An alert opens Alerts; an alarm opens Alarms, carrying unit/event context. Review the actual cause and measured value. An NH3 alarm represents detector evidence, not an inference from differential pressure. Acknowledgement records operator action; it does not prove the physical cause is cleared, and an acknowledged active alarm remains an alarm until resolved by the condition lifecycle.

Alerts and Alarms provide their respective filtering/details and unit context. Use acknowledgement only when authorized and record useful investigation notes. Follow installation-specific safety procedures outside the web application; it does not replace physical interlocks or guarantee automatic shutdown.

## Units and Unit Details

Units Overview exposes four possible useful outputs:

| Output | Active indication | Meaning |
|---|---|---|
| Electrical power | Green | Positive electrical production |
| AWG potable water | Blue | Positive water production where AWG is fitted |
| Useful chilling | Cooling/chilling icon | Positive useful cooling delivery |
| Useful heat | Red | Positive useful heat delivery |

Activity also requires online status, installed capability and fresh GOOD readings. Installed equipment can be inactive. Tank level, temperature and setpoint are not proof of delivered output.

Open a unit to inspect vitals, warnings with causes, NH3 alarm information and History. History is available without premium SCADA and offers 7-day, 30-day, one-year, five-year and custom periods, with up to ten years per query. Graphs include ambient temperature/humidity, inlet/hot/chill temperatures, electrical power, AWG level where applicable, differential pressure, voltage, loop flows and useful heat/chill/water production. Live history is aggregated from recorded GOOD samples; missing periods are not filled with fictional readings. Longer range does not imply data was retained before installation.

**Schedule Maintenance** requires control permission. Choose a future date and meaningful description; live mode persists the record through the API and displays errors if it fails. Demo mode stores clearly scoped local demonstration schedules. **Manage Remotely** opens Remote Management already scoped to that unit.

## Remote Management

Check the unit identity, status and configured limits. Authorized operators/admins can use machine power, water production, automatic switching, permitted modes and output setpoints. Setpoints use kW and L/h, not universal percentage scales. The selected installation determines available modes/limits.

A live action succeeds only after the gateway acknowledges the exact command. A configured gateway label is not proof of connectivity. Readings remain measured telemetry, not simulated confirmation of the requested action. If acknowledgement times out, inspect physical state before retrying. No web two-person approval or certified emergency-stop workflow is implemented. Camera panels require configured, authorized compatible feeds; absence is not replaced with pretend video.

## Analytics, premium SCADA and Sales

Ordinary Analytics summarizes the selected portfolio, recorded coverage and editable financial assumptions. AUD tariffs, costs, diesel/emissions equivalents and investment assumptions are estimates; missing coverage makes unsupported ROI/payback unavailable. See [Portfolio methodology](PORTFOLIO_DATA_AND_REPORTING.md).

Premium SCADA is distinct and requires entitlement. Select a permitted unit, then use Visualization (Overview, Gauges, Trends, Process Flow), Alerts, or Analytics (Performance, Equipment Health, Energy, Predictive). Live process diagrams require configured actual topology. Production availability uses operating/observed hours; coverage uses observed/calendar hours. Unsupported efficiency, quality, health scores and remaining lifetime show unavailable. Supported threshold trend projections are advisory, not a validated remaining-life prediction.

Sales is a separate commercial screen for system administrators, backed by recorded sale dates, product lines, units and AUD revenue. Demo commercial records are illustrative. Sales is not operational energy Analytics and does not establish booked customer revenue from telemetry.

## Reports

Choose a report type, scope (one unit, selected units, permitted client or master), date range, sections and **Excel, Word or PDF**. No format is silently chosen. Generate & Download creates a real XLSX/DOCX/PDF and plays the configured success sound only after successful generation. Errors remain visible and retryable.

Every section follows the selected permitted units: inventory, calculations, charts/tables, historical metrics, events/alerts, maintenance and sales. A one-unit selection never means the whole portfolio. Current snapshots are distinguished from date-filtered records. Subset calculations use selected-unit operating/installed costs, with unconfigured values disclosed as assumptions; portfolio fixed costs are not silently assigned in full to every unit.

Scheduling persists a future report configuration. Execution occurs while Reports remains open and signed in, with permissions rechecked; there is no unattended email delivery. Pause/resume controls affect schedules. Browser download policy may require user interaction.

## Settings and administration

Settings saves your own username, display/name fields, avatar, sound/volume, temperature display, theme and polling interval. Profile images must be PNG/JPEG/WebP, ≤2 MB and ≤4 megapixels; the server re-encodes a thumbnail. Email/roles/tenant assignment are not editable account preferences. Connected accounts and passkeys require password confirmation. Password changes use your current password.

User Management remains a separate system-admin function for account approval and administrative changes. A client administrator's tenant access does not grant the global User Management screen. Premium entitlement is separately administered. If access changes, reload/re-authenticate as directed; do not alter browser storage to bypass a server permission decision.
