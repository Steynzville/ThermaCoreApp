# Sales demonstration script

## Prepare

Use the Demo-App deployment with an approved demonstration account and appropriate tenant/SCADA permissions. Confirm the visible source is demo and explain that the portfolio, production and commercial records are fictional examples. Authentication remains real; configure external providers before demonstrating provider login. Do not connect a sales demonstration to physical controls accidentally.

## Walkthrough

1. **Portfolio and permissions:** select a permitted tenant, show the dashboard, then change tenant and observe Units/Analytics update together. Explain client administrators see only their client and viewers/operators their assigned tenant. Do not promise the global User Management screen to client administrators.
2. **Four outputs:** show electrical power (green), useful heat (red), useful chilling and AWG water (blue). Compare fitted-but-inactive and actively producing units, including chilling without AWG. Explain that live icons require actual fresh GOOD measurements.
3. **Conditions:** open an orange alert and a red alarm notification. Show the correct destination with unit/event context, meaningful cause and acknowledgement behavior. NH3 comes from detector evidence, not pressure alone.
4. **Unit Details:** open ordinary History and longer/custom ranges, including thermal/water/electrical metrics. Schedule an explicitly local demo maintenance record. Use Manage Remotely to keep the exact unit selected.
5. **Remote Management:** demonstrate simulated demo controls and their shared state. Explain that live actions instead require an authenticated configured gateway and matching acknowledgement; telemetry confirms actual effect separately. Do not claim two-person approval, emergency-stop certification or a real camera feed without commissioning.
6. **Ordinary Analytics:** explain measured coverage versus financial assumptions. Change tariffs/cost assumptions and show the selected portfolio. Do not present illustrative ROI, emissions equivalents or missing-data forecasts as guaranteed outcomes.
7. **Premium SCADA:** show its distinct Overview/Gauges/Trends/Process Flow, Alerts and Performance/Equipment Health/Energy/Predictive views. Explain entitlement enforcement and explicitly illustrative demo topology. Unsupported health/efficiency/lifetime claims remain unavailable.
8. **Sales:** with system-admin access, show commercial records and product/monthly trends separately from operational Analytics. These demo records are not evidence of actual revenue.
9. **Reports:** select one unit and Excel, Word or PDF. Download/open the real file and verify only that unit appears. Explain date-filtered history versus current snapshots and the open-page requirement for scheduled downloads.
10. **Settings:** show saved account/profile/preferences and password-confirmed provider/passkey linking. Missing external configuration is reported honestly.

## Questions to answer accurately

| Question | Answer |
|---|---|
| Does it work without hardware for a demo? | Yes, the explicit demo mode supplies deterministic examples while retaining authentication and tenant architecture. |
| What is needed for live operation? | Recorded telemetry, ownership/sensors, secured broker/server, authenticated hardware gateway, provider/email credentials, camera/topology configuration as applicable. |
| What if connectivity fails? | The UI shows missing/offline/error states. Edge buffering/replay must be implemented and commissioned by the gateway; this repository does not guarantee it. |
| Are savings or uptime proven? | The code provides calculations and tests, not field evidence or guaranteed efficiency/downtime improvement. Validate any commercial claim separately. |
| Is premium access implemented? | Yes, premium SCADA entitlement is enforced. Pricing, subscription billing and support promises are commercial arrangements, not inferred from UI flags. |
| What security warning remains? | The optional OPC-UA dependency advisory is documented; deployments must address its exposure and track updates. |

Use fresh PR workflow results for test/coverage claims. Never reuse old 5,504-test or 91.78% coverage figures as current evidence. See [Testing](TESTING.md) and the [feature matrix](FEATURE_COMPARISON_MATRIX.md).
