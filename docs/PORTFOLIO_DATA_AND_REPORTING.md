# Portfolio data, analytics and reporting

## Shared portfolio

`UnitProvider` is the source for dashboard counts, grids, unit deep links, controls, alerts, notifications, telemetry, analytics and reports. `AnalyticsProvider` shares assumptions between analytics and reports, with separate session overrides per user/tenant selection.

Ownership is identifier based:

- System administrators can select all tenants or one tenant.
- Client administrators can select only tenants belonging to their `client_id`.
- Operators and viewers see only their assigned `tenant_id`.
- Unassigned accounts receive an empty portfolio. Unit order, names and email domains never grant ownership.
- Unassigned units remain visible to system administrators; assign their actual tenant in the database rather than mapping them to an arbitrary customer.

Login and `/auth/me` supply the authoritative role and ownership. Restored sessions are revalidated. API responses, commands and Socket.IO deliveries enforce ownership independently of browser filtering. Changing users clears the old portfolio immediately; delayed responses cannot restore it. Selected tenant filters that are invalid or outside a client's ownership return no units.

## Demo and live modes

Set `VITE_DATA_MODE=demo` or `VITE_DATA_MODE=live` at build time. Demo is the default for Demo-App. The older `VITE_MOCK_MODE=false` also selects live mode if `VITE_DATA_MODE` is absent.

Demo mode uses the twenty fixtures in `src/data/mockUnits.js`, with explicit fictional ownership in `src/data/demoPortfolio.js`. Authenticated API units take precedence for identity and ownership. Demonstration daily records are deterministic, span the latest 90 days, and are labelled as estimates. Controls update shared demo session state and action history; they do not contact devices.

Live mode uses `VITE_API_BASE_URL` for all relative API calls and Socket.IO's `/socket.io` transport. It never falls back to generated metrics on a network error. The frontend refreshes snapshots on telemetry events and polls every 30 seconds. Missing history, unconfigured controls and unavailable readings are visible as such.

Use the single-worker threaded Gunicorn command in `render.yaml`; Socket.IO client authorization/subscription state is process-local. Scale-out needs a shared message/authorization architecture before increasing workers. The service uses JWT auth payloads, rejects refresh/expired/inactive sessions and rechecks ownership at delivery time. No tenant-specific alerts are globally broadcast.

## Recorded telemetry contract

`GET /api/v1/portfolio/history` defaults to the latest 90 days. `from` and `to` accept UTC `YYYY-MM-DD` dates, inclusive; one request supports up to 366 days. Reports fetch their selected live date range rather than relying on the dashboard cache.

The endpoint integrates adjacent GOOD rate measurements using the trapezoidal rule, splits intervals at UTC midnight, and ignores gaps greater than 900 seconds. `TELEMETRY_MAX_GAP_SECONDS` can be set in Flask config. Invalid, negative, duplicate-time and unknown-unit readings are not extrapolated. Only the first configured active meter for a unit/channel is used; configure one authoritative meter per channel.

| Sensor type | Accepted measurement units | Daily output |
|---|---|---|
| `power` or `current_power` | kW, W | `grossKWh` |
| `parasitic_load` | kW, W | `parasiticKWh` |
| `user_load` | kW, W | `selfConsumedKWh` |
| `export_power` | kW, W | `exportedKWh` |
| `water_flow` | L/h, L/min, m3/h | `waterLitres` |

Missing channels remain null, not zero. Net benefit is unavailable without complete energy channels covering matching intervals and readings for every selected unit on each recorded day. API snapshot power/load fields update from newest GOOD measurements; older readings remain in history without replacing the current snapshot. The legacy unit pressure field is expressed in hPa and converted to bar for display; ingestion honors the configured pressure sensor unit. Battery voltage and percentage are not interchangeable.

Meter names and units must match the deployed installation. Existing historical readings are not rewritten or reassigned by this change. No failures/repair hours are invented when maintenance records are absent.

## Calculations

All currency inputs use AUD. Defaults are illustrative editable assumptions, not tariff advice or certified emissions factors.

- Self-use value = recorded self-consumed kWh × avoided grid tariff.
- Export revenue = recorded exported kWh × feed-in tariff.
- Incentive = recorded self-consumed kWh × incentive per kWh.
- Operating cost = monthly portfolio cost × 12 / 365 × observed calendar-day coverage (a partial day is prorated once, not once per unit).
- Net benefit = self-use value + export revenue + incentive − operating cost. Negative results stay negative.
- Annual net benefit uses only fully observed portfolio days in the last 30 completed UTC days. Today's partial day is excluded. Missing coverage gives no ROI estimate.
- Simple annual ROI = annual net benefit / installed cost × 100. Payback = installed cost / positive annual benefit. Both require a positive entered/known installed cost.
- Diesel equivalent = self-consumed kWh × diesel displacement share × L/kWh. Fuel-cost and combustion-CO2 equivalents use their respective editable factors. These comparisons are not added to grid-based savings.
- Production availability = producing unit-hours / observed unit-hours. This is not inferred machine-health uptime. MTTR needs recorded repair hours and failures.

Recorded totals describe available history, not lifetime production. Forecasts exclude financing, tax and degradation. Current export balance is calculated per unit after its own parasitic/user load; it is distinct from recorded metered export energy. Individual unit analytics have separate editable operating/installed costs; a multi-unit portfolio's fixed costs are not assigned in full to each unit.

## Reports

Open Reports, select the tenant portfolio, units, UTC date range, sections and **Excel, Word or PDF**. The format has no implicit default. Generation downloads a real `.xlsx`, `.docx` or `.pdf`; errors are shown and retryable. Switching portfolio/unmounting the page cancels a pending download.

Every report includes scope, generation time, source, period summary, assumptions and methodology. Optional sections include current unit inventory/readings, daily production, current alerts and recorded controls. Current snapshots are labelled separately from date-filtered history. Last-maintenance dates are supplied where available; unrecorded repair histories are not manufactured. There is no pretend scheduling or completion dialog.

Subset reports require an explicit operating-cost input for the selected units; fleet costs are not silently apportioned. PDF fonts are embedded, Word tables repeat headers across pages, and Excel uses numeric cells, filters, frozen headers and formatted sheets. Export libraries/fonts load only when requested.

## Live controls

`POST /api/v1/remote-control/units/<id>/controls` accepts `machinePower`, `waterProductionOn`, `autoSwitchEnabled`, `powerSetpoint` (kW) and `waterSetpoint` (L/h). Numeric values must be finite and non-negative; positive setpoints require a configured device limit. Viewers cannot issue commands. Tenant checks happen before dispatch.

Configure `UNIT_CONTROL_GATEWAYS` as a server-side environment JSON object (or Flask configuration dictionary), for example:

```json
{
  "TC001": {
    "url": "https://your-device-gateway.example/commands",
    "token": "server-side-gateway-secret",
    "limits": { "powerSetpoint": 25, "waterSetpoint": 10 }
  }
}
```

The gateway must adapt these controls to the actual device protocol and enforce its device interlocks. ThermaCore sends `{command_id, unit_id, controls}` with an `Idempotency-Key` header and expects `{command_id, acknowledged: true, controls}` containing the matching command ID and accepted controls. No redirects are followed and no automatic command retries occur. A timeout has an unknown device outcome: inspect current device state before retrying.

Only acknowledged commands are persisted in the additive `unit_commands` table and exposed through tenant-scoped `/portfolio/events`. The startup auto-migration creates this table idempotently. Telemetry is never overwritten to pretend that a command has already taken physical effect. If the gateway is absent, the API returns 503 and the UI reports the error. Camera links appear only when a unit has an explicitly configured camera URL.

## Validation

Frontend: `pnpm test`, `pnpm exec vitest run --coverage --coverage.thresholds.lines=60`, `pnpm run build`.

Backend: from `backend`, install `requirements.txt` into a virtual environment and run `python -m pytest app/tests`. The tests create isolated fixtures; they do not contact a physical gateway. Regression coverage includes tenant switching, unassigned accounts, cross-tenant reads/commands/streams, stale requests after logout, financial edge cases and actual OOXML/PDF output.

Deployment still requires the installation's real ownership assignments, meter configuration, CORS origins, tariffs and device gateway. Physical hardware behavior cannot be certified by mocked gateway tests.
