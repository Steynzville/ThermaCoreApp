# ThermaCore Integrated SCADA: Data Backup & Recovery Guide
## Disaster Recovery, Timeseries Preservation, and Database Restoration Manual

This guide describes backup schedules, verification checks, and step-by-step restoration procedures to ensure data integrity and continuous availability of the ThermaCore SCADA database.

---

## 1. Backup Strategies & Scheduling

ThermaCore uses a combination of automated daily snapshots and point-in-time recovery (PITR) to secure historical time-series data.

```
                         BACKUP COLD & HOT PIPELINE
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│  Neon Daily Snapshots   │ ──► │  S3 Offsite Cold Store  │ ──► │  Continuous PITR (WAL)  │
│  - Automated at 02:00   │     │  - Compressed Tarballs  │     │  - Up to 14 days back   │
│  - 30-day retention     │     │  - Encrypted (AES-256)  │     │  - Sub-minute precision │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

### Backup Inventory Configuration

| Storage Type | Frequency | Retention Policy | Storage Location |
| :--- | :--- | :--- | :--- |
| **Hot Snapshot** | Daily at 02:00 UTC | 30 Days | Neon Cloud Native Snapshots |
| **PITR Log Files** | Continuous WAL archiving | 14 Days | Neon Serverless Storage |
| **Cold Archive** | Weekly on Sundays | 365 Days | AWS S3 Bucket (Region: ap-southeast-2) |

---

## 2. Automated Snapshot Verification

To ensure backups are functional and free from physical corruption, automated validation tests execute on a separate isolated staging database container:
1. Every Tuesday, an automated GitHub Action boots a staging container and restores the Sunday snapshot.
2. The staging script runs query integrity tests:
   ```sql
   -- Verify row counts on critical timeseries tables are non-zero
   SELECT COUNT(*) FROM telemetry_readings WHERE timestamp > NOW() - INTERVAL '7 days';
   ```
3. If the staging verify script encounters tables with zero values or corruption, it alerts the on-duty database administrator.

---

## 3. Step-by-Step Restoration Protocol

Follow these steps to restore the database in the event of a catastrophic regional failure:

### Step 1: Put the Backend API in Maintenance Mode
Prevent users from sending updates during restoration:
```bash
# Render Service CLI
render service scale web-api=0
```

### Step 2: Restore Neon via SQL Dump
If rebuilding a specific system database from a Sunday cold-store dump, run:
```bash
# Uncompress the archive
tar -xzvf thermacore-backup-2026-06-21.sql.tar.gz

# Execute restore query
psql -h pg-thermacore.neon.tech -U admin -d main_db -f thermacore-backup-2026-06-21.sql
```

### Step 3: Run Post-Restoration Diagnostics
Run the following validation scripts before reopening the frontend interface to operators:
* Confirm database connectivity.
* Verify user list integrity.
* Verify timeseries table indices are fully rebuilt.

### Step 4: Re-enable the Backend API
```bash
render service scale web-api=1
```

---

## 4. Multi-Tenant Backup Considerations

ThermaCore SCADA supports multi-tenant operations where each tenant's data must be isolated and recoverable independently.

### 4.1 Tenant Data Isolation

* Each tenant's data is stored with a `tenant_id` foreign key in all relevant tables
* Backups include all tenant data in a single database snapshot
* Restoration preserves all tenant boundaries

### 4.2 Tenant-Specific Recovery

In the event of data corruption affecting a single tenant:

1. Identify the affected tenant ID
2. Restore from the most recent backup to a staging environment
3. Export only the data for the affected tenant
4. Import the tenant data back into production

### 4.3 Admin Account Recovery

* Admin accounts are not tenant-specific and are stored separately
* Admin account data is included in all full system backups

---

## 5. Disaster Recovery (DR) Audits & Testing Schedule

* **Frequency**: DR drills are conducted **bi-annually** (Q2 and Q4).
* **Objective**: Complete a full restore of the active timeseries dataset from raw cold-store snapshots to an isolated database region.
* **Target Recovery Time Objective (RTO)**: $< 4$ Hours.
* **Target Recovery Point Objective (RPO)**: $< 15$ Minutes (WAL logs must be successfully replayed).
