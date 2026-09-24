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
