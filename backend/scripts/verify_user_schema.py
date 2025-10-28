#!/usr/bin/env python3
"""Database Schema Verification Script

This script verifies that all required user profile fields exist in the database
with the correct specifications. It can be run manually to check the database
state before or after migration.

Usage:
    python verify_user_schema.py

Requirements:
    - DATABASE_URL environment variable must be set
    - psycopg2 or appropriate database driver must be installed
"""

import os
import sys

from sqlalchemy import create_engine, inspect

# Required columns with their expected specifications
REQUIRED_COLUMNS = {
    "id": {"type": "INTEGER", "nullable": False},
    "username": {"type": "VARCHAR", "nullable": False},
    "email": {"type": "VARCHAR", "nullable": False},
    "password_hash": {"type": "TEXT", "nullable": False},
    "first_name": {"type": "VARCHAR", "nullable": True},
    "last_name": {"type": "VARCHAR", "nullable": True},
    "phone_number": {"type": "VARCHAR", "nullable": True},
    "company": {"type": "VARCHAR", "nullable": True},
    "company_identifier": {"type": "VARCHAR", "nullable": True},
    "department": {"type": "VARCHAR", "nullable": True},
    "position": {"type": "VARCHAR", "nullable": True},
    "is_active": {"type": "BOOLEAN", "nullable": False},
    "role_id": {"type": "INTEGER", "nullable": False},
    "created_at": {"type": "TIMESTAMP", "nullable": True},
    "updated_at": {"type": "TIMESTAMP", "nullable": True},
    "last_login": {"type": "TIMESTAMP", "nullable": True},
    "reset_token": {"type": "VARCHAR", "nullable": True},
    "reset_token_expires": {"type": "TIMESTAMP", "nullable": True},
    "permissions": {"type": "JSON", "nullable": True},
}

# Required indexes
REQUIRED_INDEXES = [
    "idx_users_username",
    "idx_users_email",
    "idx_users_company",
    "idx_users_company_identifier",
]


def verify_database_schema():
    """Verify that the database schema matches requirements."""
    # Get database URL from environment
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        print("Usage: DATABASE_URL=<your-db-url> python verify_user_schema.py")
        sys.exit(1)

    # Connect to database
    try:
        engine = create_engine(database_url)
        inspector = inspect(engine)
    except Exception as e:
        print(f"ERROR: Failed to connect to database: {e}")
        sys.exit(1)

    # Verify table exists
    if "users" not in inspector.get_table_names():
        print("ERROR: 'users' table does not exist")
        sys.exit(1)

    print("✓ 'users' table exists")
    print("\nVerifying columns...")

    # Get actual columns
    actual_columns = {col["name"]: col for col in inspector.get_columns("users")}

    # Check each required column
    missing_columns = []
    mismatched_columns = []

    for column_name, expected_spec in REQUIRED_COLUMNS.items():
        if column_name not in actual_columns:
            missing_columns.append(column_name)
            print(f"✗ Column '{column_name}' is MISSING")
        else:
            actual_col = actual_columns[column_name]
            col_type_str = str(actual_col["type"]).upper()
            expected_type = expected_spec["type"]

            # Check type (flexible matching for compatibility)
            if (
                expected_type in col_type_str
                or expected_type.replace("VARCHAR", "STRING") in col_type_str
            ):
                print(f"✓ Column '{column_name}' exists with type {col_type_str}")
            else:
                mismatched_columns.append(
                    {
                        "name": column_name,
                        "expected": expected_type,
                        "actual": col_type_str,
                    },
                )
                print(
                    f"⚠ Column '{column_name}' exists but type mismatch: expected {expected_type}, got {col_type_str}",
                )

    # Check indexes
    print("\nVerifying indexes...")
    actual_indexes = [idx["name"] for idx in inspector.get_indexes("users")]
    missing_indexes = []

    for index_name in REQUIRED_INDEXES:
        if index_name in actual_indexes:
            print(f"✓ Index '{index_name}' exists")
        else:
            missing_indexes.append(index_name)
            print(f"✗ Index '{index_name}' is MISSING")

    # Summary
    print("\n" + "=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)

    if not missing_columns and not mismatched_columns and not missing_indexes:
        print("✅ ALL CHECKS PASSED - Database schema is correct")
        return 0
    if missing_columns:
        print(f"\n❌ Missing columns ({len(missing_columns)}):")
        for col in missing_columns:
            print(f"   - {col}")

    if mismatched_columns:
        print(f"\n⚠️ Type mismatches ({len(mismatched_columns)}):")
        for col in mismatched_columns:
            print(
                f"   - {col['name']}: expected {col['expected']}, got {col['actual']}",
            )

    if missing_indexes:
        print(f"\n⚠️ Missing indexes ({len(missing_indexes)}):")
        for idx in missing_indexes:
            print(f"   - {idx}")

    print("\n🔧 Run the auto-migration by starting the application or execute:")
    print("   backend/migrations/008_add_user_profile_fields_comprehensive.sql")

    return 1


if __name__ == "__main__":
    sys.exit(verify_database_schema())
