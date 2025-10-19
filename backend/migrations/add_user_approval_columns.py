"""
Migration: Add user approval workflow columns to users table.

This migration adds columns to support admin approval workflow for user registrations:
- registration_status: User registration approval status (pending, approved, rejected, invited)
- approved_by: User ID of the admin who approved this registration
- approved_at: Timestamp when the registration was approved
- rejection_reason: Reason provided when registration was rejected
- registration_notes: Admin notes about the registration approval/rejection

Date: 2025-10-18
"""

import logging
import sys
import os
from sqlalchemy import text, inspect

# Add parent directory to path to allow imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import centralized constants to prevent drift
from app.utils.migration_constants import (
    USER_APPROVAL_COLUMNS,
    USER_APPROVAL_INDEX,
    USER_APPROVAL_COLUMNS_REVERSE
)

logger = logging.getLogger(__name__)


def column_exists(engine, table_name, column_name):
    """Check if a column exists in a table.
    
    Args:
        engine: SQLAlchemy engine instance
        table_name: Name of the table to check
        column_name: Name of the column to check
        
    Returns:
        bool: True if column exists, False otherwise
    """
    try:
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        return column_name in columns
    except Exception as e:
        logger.error(f"Error checking if column exists: {e}", exc_info=True)
        return False


def upgrade(engine):
    """Apply migration - add user approval workflow columns.
    
    Args:
        engine: SQLAlchemy engine instance
        
    Returns:
        bool: True if migration succeeded, False otherwise
    """
    try:
        logger.info("Starting migration: add_user_approval_columns")
        columns_added = []
        existing_columns = []
        
        # Get list of existing columns
        inspector = inspect(engine)
        current_columns = [col['name'] for col in inspector.get_columns('users')]
        
        # Add each column if it doesn't exist, using centralized definitions
        for column_name, pg_def, sqlite_def in USER_APPROVAL_COLUMNS:
            if column_name not in current_columns:
                logger.info(f"Adding column '{column_name}' to users table...")
                with engine.begin() as conn:
                    if engine.dialect.name == "postgresql":
                        column_def = pg_def
                        conn.execute(text(
                            f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {column_name} {column_def}"
                        ))
                    elif engine.dialect.name == "sqlite":
                        column_def = sqlite_def
                        conn.execute(text(
                            f"ALTER TABLE users ADD COLUMN {column_name} {column_def}"
                        ))
                    else:
                        logger.error(f"Unsupported database dialect: {engine.dialect.name}")
                        return False
                columns_added.append(column_name)
                logger.info(f"✓ Column '{column_name}' added successfully")
            else:
                existing_columns.append(column_name)
                logger.info(f"✓ Column '{column_name}' already exists, skipping")
        
        # Create index for faster pending user queries
        try:
            with engine.begin() as conn:
                if engine.dialect.name == "postgresql":
                    result = conn.execute(text(
                        f"SELECT 1 FROM pg_indexes WHERE indexname = '{USER_APPROVAL_INDEX}'"
                    ))
                    index_exists = result.fetchone() is not None
                else:  # sqlite
                    result = conn.execute(text(
                        f"SELECT name FROM sqlite_master WHERE type='index' AND name = '{USER_APPROVAL_INDEX}'"
                    ))
                    index_exists = result.fetchone() is not None
                
                if not index_exists:
                    logger.info(f"Creating index '{USER_APPROVAL_INDEX}'...")
                    conn.execute(text(
                        f"CREATE INDEX IF NOT EXISTS {USER_APPROVAL_INDEX} ON users(registration_status)"
                    ))
                    logger.info("✓ Index created successfully")
                else:
                    logger.info("✓ Index already exists")
        except Exception as idx_error:
            logger.warning(f"Could not create index: {idx_error}")
        
        # IMPROVED BACKFILL: Always backfill when column exists with NULL/empty values
        # regardless of whether it was just created or already existed
        if 'registration_status' in columns_added or 'registration_status' in existing_columns:
            try:
                with engine.begin() as conn:
                    logger.info("Backfilling existing users with 'approved' status...")
                    result = conn.execute(text(
                        "UPDATE users SET registration_status = 'approved' WHERE registration_status IS NULL OR registration_status = ''"
                    ))
                    if result.rowcount > 0:
                        logger.info(f"✓ Backfilled {result.rowcount} users to 'approved' status")
                    else:
                        logger.info("✓ No users needed backfilling")
            except Exception as update_error:
                logger.warning(f"Could not backfill existing users: {update_error}")
        
        logger.info("Migration add_user_approval_columns completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)
        return False


def downgrade(engine):
    """Revert migration - remove user approval workflow columns.
    
    Args:
        engine: SQLAlchemy engine instance
        
    Returns:
        bool: True if downgrade succeeded, False otherwise
    """
    try:
        logger.info("Starting downgrade: remove user approval workflow columns")
        
        # Drop index first
        try:
            with engine.begin() as conn:
                logger.info(f"Dropping index {USER_APPROVAL_INDEX}...")
                if engine.dialect.name == "postgresql":
                    conn.execute(text(
                        f"DROP INDEX IF EXISTS {USER_APPROVAL_INDEX}"
                    ))
                elif engine.dialect.name == "sqlite":
                    # SQLite doesn't support IF EXISTS in older versions
                    try:
                        conn.execute(text(
                            f"DROP INDEX {USER_APPROVAL_INDEX}"
                        ))
                    except Exception:
                        # Index might not exist, that's ok
                        pass
                logger.info("✓ Index dropped successfully")
        except Exception as idx_error:
            logger.warning(f"Could not drop index: {idx_error}")
        
        # Drop columns in reverse order using centralized list
        for column_name in USER_APPROVAL_COLUMNS_REVERSE:
            if column_exists(engine, 'users', column_name):
                logger.info(f"Dropping column '{column_name}' from users table...")
                try:
                    with engine.begin() as conn:
                        if engine.dialect.name == "postgresql":
                            # PostgreSQL supports IF EXISTS
                            conn.execute(text(
                                f"ALTER TABLE users DROP COLUMN IF EXISTS {column_name}"
                            ))
                        elif engine.dialect.name == "sqlite":
                            # SQLite 3.35.0+ supports DROP COLUMN
                            # For older versions, this will fail gracefully
                            try:
                                conn.execute(text(
                                    f"ALTER TABLE users DROP COLUMN {column_name}"
                                ))
                            except Exception as e:
                                logger.warning(f"Could not drop column {column_name} in SQLite: {e}")
                                logger.info("Note: SQLite < 3.35.0 doesn't support DROP COLUMN")
                                continue
                    logger.info(f"✓ Column '{column_name}' dropped successfully")
                except Exception as col_error:
                    logger.warning(f"Could not drop column '{column_name}': {col_error}")
            else:
                logger.info(f"✓ Column '{column_name}' does not exist, skipping")
        
        logger.info("Downgrade completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Downgrade failed: {e}", exc_info=True)
        return False


def main():
    """Run migration when executed as a script."""
    from app import create_app, db
    
    app = create_app()
    with app.app_context():
        if len(sys.argv) > 1 and sys.argv[1] == 'downgrade':
            success = downgrade(db.engine)
        else:
            success = upgrade(db.engine)
        
        if success:
            logger.info("Migration completed successfully")
            sys.exit(0)
        else:
            logger.error("Migration failed")
            sys.exit(1)


if __name__ == '__main__':
    main()
