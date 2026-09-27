# Backup and recovery

Backups are an operator-owned deployment requirement. This repository does **not** provision nightly cloud snapshots, S3 archives, a PITR retention policy or a scheduled restore-validation workflow. Choose and document an RPO, RTO, retention, encryption, access controls and restore-drill schedule for the deployed database/provider.

## Preserve a consistent system

Back up PostgreSQL with a supported provider snapshot/PITR facility or `pg_dump` consistent snapshot. Include users/roles/permissions, clients/tenants/units, sensors/readings, conditions and acknowledgements, control history, maintenance, sales, report schedules, account profiles/avatars, OAuth identity mappings and passkey credentials. Protect backups as sensitive cross-tenant data. Provider and gateway private secrets/certificates need a separate controlled backup/rotation process; never put them in the frontend or repository.

Example for a database administrator with an authorized connection environment:

```bash
pg_dump --format=custom --file=thermacore-backup.dump "$DATABASE_URL"
# Restore into an isolated, empty, explicitly selected staging database:
pg_restore --no-owner --dbname="$RESTORE_DATABASE_URL" thermacore-backup.dump
```

Use secure connection handling and do not publish environment values. Test tool/server version compatibility and provider extension availability. Timescale-specific installations need their extension's supported restore procedure. The application does not guarantee a provider includes TimescaleDB.

## Recovery procedure

1. Stop writes and disable outbound hardware dispatch/email in the recovery environment using deployment controls. Preserve incident evidence first when relevant.
2. Restore to an isolated database; never rehearse against live equipment. Keep `DEMO_DATA_ENABLED=false` for a live recovery.
3. Deploy the matching application commit and inspect additive migration logs before reopening service. Do not run historical demo/default-user seed scripts.
4. Validate relationships from clients → tenants → units → sensors/readings and account ownership/permissions. Verify conditions, acknowledgements, maintenance, sale references, schedules and avatar/profile data.
5. Test separate viewer/operator/client-admin accounts, cross-tenant denial, premium grant/revoke, long-range history and one-unit reports. Compare record counts/time bounds against the backup manifest.
6. Rotate compromised secrets if applicable. OAuth/passkey origins and provider callbacks must match the restored deployment; changing RP identity can prevent existing passkey use.
7. Reconcile device physical state and prior acknowledged commands. **Do not replay historical controls.** Review due report schedules before opening Reports so old downloads do not unexpectedly execute.
8. Restore traffic and authorized integrations deliberately; document actual data loss, restore duration and outstanding gaps.

Tenant-specific recovery requires an isolated full restore followed by a reviewed relational import, preserving foreign keys and avoiding duplicate sale/event records. It is not a simple copy of `tenant_id` rows: telemetry belongs through units/sensors, and some account records are user-owned. Administrators live in the same account model, not a separate backup store.

Demo browser-local maintenance/schedules are not included in backend backups. They are illustrative state and must not be presented as durable production maintenance history. Downloaded reports also require the user's chosen document-retention policy.
