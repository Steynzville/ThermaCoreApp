"""
Centralized SQL definitions for migrations to prevent drift.

This module contains shared SQL column definitions used by both
auto-migration and standalone migration scripts. Centralizing these
definitions ensures consistency across all migration implementations.
"""

# User approval workflow columns
# Format: (column_name, postgresql_definition, sqlite_definition)
USER_APPROVAL_COLUMNS = [
    (
        'registration_status',
        "VARCHAR(20) DEFAULT 'pending' NOT NULL",
        "VARCHAR(20) DEFAULT 'pending' NOT NULL"
    ),
    (
        'approved_by',
        "INTEGER REFERENCES users(id)",
        "INTEGER REFERENCES users(id)"
    ),
    (
        'approved_at',
        "TIMESTAMP WITH TIME ZONE",
        "TIMESTAMP"
    ),
    (
        'rejection_reason',
        "TEXT",
        "TEXT"
    ),
    (
        'registration_notes',
        "TEXT",
        "TEXT"
    ),
]

# Index name for registration_status
USER_APPROVAL_INDEX = 'idx_users_registration_status'

# Columns to remove in reverse order for downgrade
USER_APPROVAL_COLUMNS_REVERSE = [
    'registration_notes',
    'rejection_reason',
    'approved_at',
    'approved_by',
    'registration_status',
]
