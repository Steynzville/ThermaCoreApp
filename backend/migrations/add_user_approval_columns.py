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
from sqlalchemy import text, inspect

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
        
        # Define columns based on database dialect
        if engine.dialect.name == "postgresql":
            columns_to_add = [
                ('registration_status', "VARCHAR(20) DEFAULT 'pending' NOT NULL"),
                ('approved_by', "INTEGER REFERENCES users(id)"),
                ('approved_at', "TIMESTAMP WITH TIME ZONE"),
                ('rejection_reason', "TEXT"),
                ('registration_notes', "TEXT"),
            ]
        elif engine.dialect.name == "sqlite":
            columns_to_add = [
                ('registration_status', "VARCHAR(20) DEFAULT 'pending' NOT NULL"),
                ('approved_by', "INTEGER REFERENCES users(id)"),
                ('approved_at', "TIMESTAMP"),
                ('rejection_reason', "TEXT"),
                ('registration_notes', "TEXT"),
            ]
        else:
            logger.error(f"Unsupported database dialect: {engine.dialect.name}")
            return False
        
        # Add each column if it doesn't exist
        for column_name, column_def in columns_to_add:
            if not column_exists(engine, 'users', column_name):
                logger.info(f"Adding column '{column_name}' to users table...")
                with engine.begin() as conn:
                    if engine.dialect.name == "postgresql":
                        conn.execute(text(
                            f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {column_name} {column_def}"
                        ))
                    else:  # sqlite
                        conn.execute(text(
                            f"ALTER TABLE users ADD COLUMN {column_name} {column_def}"
                        ))
                columns_added.append(column_name)
                logger.info(f"✓ Column '{column_name}' added successfully")
            else:
                logger.info(f"✓ Column '{column_name}' already exists, skipping")
        
        # Create index for faster pending user queries
        try:
            with engine.begin() as conn:
                if engine.dialect.name == "postgresql":
                    result = conn.execute(text(
                        "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_registration_status'"
                    ))
                    index_exists = result.fetchone() is not None
                else:  # sqlite
                    result = conn.execute(text(
                        "SELECT name FROM sqlite_master WHERE type='index' AND name = 'idx_users_registration_status'"
                    ))
                    index_exists = result.fetchone() is not None
                
                if not index_exists:
                    logger.info("Creating index on registration_status...")
                    conn.execute(text(
                        "CREATE INDEX IF NOT EXISTS idx_users_registration_status ON users(registration_status)"
                    ))
                    logger.info("✓ Index created successfully")
                else:
                    logger.info("✓ Index already exists")
        except Exception as idx_error:
            logger.warning(f"Could not create index: {idx_error}")
        
        # Update existing users to 'approved' status
        if 'registration_status' in columns_added:
            try:
                with engine.begin() as conn:
                    logger.info("Updating existing users to 'approved' status...")
                    result = conn.execute(text(
                        "UPDATE users SET registration_status = 'approved' WHERE registration_status IS NULL OR registration_status = ''"
                    ))
                    logger.info(f"✓ Updated {result.rowcount} users to 'approved' status")
            except Exception as update_error:
                logger.warning(f"Could not update existing users: {update_error}")
        
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
        
        columns_to_remove = [
            'registration_notes',
            'rejection_reason',
            'approved_at',
            'approved_by',
            'registration_status',
        ]
        
        # Drop index first
        try:
            with engine.begin() as conn:
                logger.info("Dropping index idx_users_registration_status...")
                conn.execute(text(
                    "DROP INDEX IF EXISTS idx_users_registration_status"
                ))
                logger.info("✓ Index dropped successfully")
        except Exception as idx_error:
            logger.warning(f"Could not drop index: {idx_error}")
        
        # Drop columns in reverse order
        for column_name in columns_to_remove:
            if column_exists(engine, 'users', column_name):
                logger.info(f"Dropping column '{column_name}' from users table...")
                with engine.begin() as conn:
                    conn.execute(text(
                        f"ALTER TABLE users DROP COLUMN IF EXISTS {column_name}"
                    ))
                logger.info(f"✓ Column '{column_name}' dropped successfully")
            else:
                logger.info(f"✓ Column '{column_name}' does not exist, skipping")
        
        logger.info("Downgrade completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Downgrade failed: {e}", exc_info=True)
        return False


def main():
    """Run migration when executed as a script."""
    import sys
    import os
    
    # Add parent directory to path to allow imports
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
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
