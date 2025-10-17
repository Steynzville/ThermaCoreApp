"""Auto-migration utility for Render free plan without shell access.

This module provides automatic schema migration capabilities for environments
where shell access is not available (e.g., Render free plan). It checks for
missing columns and creates them via raw SQL when needed.
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


def add_password_reset_columns(engine):
    """Add password reset columns to users table if they don't exist.
    
    This function adds:
    - reset_token: VARCHAR(255) for storing password reset tokens
    - reset_token_expires: TIMESTAMPTZ for token expiration
    - Index on reset_token for faster lookups
    
    Args:
        engine: SQLAlchemy engine instance
        
    Returns:
        bool: True if columns were added or already exist, False on error
    """
    try:
        table_name = 'users'
        columns_added = []
        
        # Check and add reset_token column
        if not column_exists(engine, table_name, 'reset_token'):
            logger.info(f"Column 'reset_token' not found in '{table_name}' table. Adding...")
            with engine.begin() as conn:
                # PostgreSQL syntax with IF NOT EXISTS for safety
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)"
                ))
            columns_added.append('reset_token')
            logger.info("✓ Column 'reset_token' added successfully")
        else:
            logger.info("✓ Column 'reset_token' already exists")
        
        # Check and add reset_token_expires column
        if not column_exists(engine, table_name, 'reset_token_expires'):
            logger.info(f"Column 'reset_token_expires' not found in '{table_name}' table. Adding...")
            with engine.begin() as conn:
                # Use TIMESTAMPTZ for PostgreSQL (timezone-aware)
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ"
                ))
            columns_added.append('reset_token_expires')
            logger.info("✓ Column 'reset_token_expires' added successfully")
        else:
            logger.info("✓ Column 'reset_token_expires' already exists")
        
        # Check and create index on reset_token if it doesn't exist
        # Note: We check index existence via a query rather than inspector
        # because index inspection can be database-specific
        try:
            with engine.begin() as conn:
                # Check if index exists (PostgreSQL syntax)
                result = conn.execute(text(
                    "SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_reset_token'"
                ))
                index_exists = result.fetchone() is not None
                
                if not index_exists:
                    logger.info("Creating index 'idx_users_reset_token'...")
                    conn.execute(text(
                        "CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token)"
                    ))
                    logger.info("✓ Index 'idx_users_reset_token' created successfully")
                else:
                    logger.info("✓ Index 'idx_users_reset_token' already exists")
        except Exception as idx_error:
            # Index creation is not critical - log warning but continue
            logger.warning(f"Could not create/verify index: {idx_error}")
        
        if columns_added:
            logger.info(f"Auto-migration complete: Added columns {columns_added}")
        else:
            logger.info("Auto-migration complete: All required columns already exist")
        
        return True
        
    except Exception as e:
        logger.error(f"Error during auto-migration: {e}", exc_info=True)
        return False


def add_permissions_column(engine):
    """Add permissions column to users table if it doesn't exist.
    
    This function adds:
    - permissions: JSON column for storing direct user permissions
    
    Args:
        engine: SQLAlchemy engine instance
        
    Returns:
        bool: True if column was added or already exists, False on error
    """
    try:
        table_name = 'users'
        
        # Check and add permissions column
        if not column_exists(engine, table_name, 'permissions'):
            logger.info(f"Column 'permissions' not found in '{table_name}' table. Adding...")
            with engine.begin() as conn:
                # Add JSON column for PostgreSQL, TEXT for SQLite compatibility
                # PostgreSQL will use JSONB for better performance
                if engine.dialect.name == "postgresql":
                    conn.execute(text(
                        "ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB"
                    ))
                elif engine.dialect.name == "sqlite":
                    conn.execute(text(
                        "ALTER TABLE users ADD COLUMN permissions TEXT"
                    ))
                else:
                    logger.error(f"Unsupported database dialect: {engine.dialect.name}")
                    return False
            logger.info("✓ Column 'permissions' added successfully")
        else:
            logger.info("✓ Column 'permissions' already exists")
        
        return True
        
    except Exception as e:
        logger.error(f"Error adding permissions column: {e}", exc_info=True)
        return False


def update_emergency_admin_permissions(engine):
    """Update emergency_admin user with comprehensive permissions.
    
    This ensures the emergency_admin has all necessary permissions for
    full administrative access, including user creation.
    
    Args:
        engine: SQLAlchemy engine instance
        
    Returns:
        bool: True if update successful or user doesn't exist, False on error
    """
    try:
        import json
        # Import centralized permissions constant from models
        from app.models import EMERGENCY_ADMIN_PERMISSIONS
        
        # Use centralized emergency admin permissions constant
        # Ensures consistency across auth endpoint, auto-migration, and permission checks
        emergency_permissions = json.dumps(EMERGENCY_ADMIN_PERMISSIONS)
        
        with engine.begin() as conn:
            # Check if emergency_admin user exists
            result = conn.execute(text(
                "SELECT id FROM users WHERE username = 'emergency_admin'"
            ))
            existing_user = result.fetchone()
            
            if existing_user:
                logger.info("Updating emergency_admin user with comprehensive permissions")
                conn.execute(text(
                    """
                    UPDATE users 
                    SET permissions = :permissions,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE username = 'emergency_admin'
                    """
                ), {
                    "permissions": emergency_permissions
                })
                logger.info("✓ Emergency admin permissions updated successfully")
            else:
                logger.info("✓ Emergency admin user does not exist yet (will be created when needed)")
        
        return True
        
    except Exception as e:
        logger.error(f"Error updating emergency admin permissions: {e}", exc_info=True)
        return False


def run_auto_migrations(app):
    """Run all auto-migrations needed for the application.
    
    This function is called during app initialization to ensure the database
    schema is up to date, even without shell access for running migrations.
    
    Args:
        app: Flask application instance
        
    Returns:
        bool: True if migrations successful, False otherwise
    """
    try:
        logger.info("Starting auto-migration checks...")
        
        # Get database engine from SQLAlchemy
        # Use app.extensions to get the SQLAlchemy instance directly
        from app import db
        
        # Get engine within app context
        with app.app_context():
            engine = db.engine
            
            # Run password reset columns migration
            success = add_password_reset_columns(engine)
            
            # Run permissions column migration
            permissions_success = add_permissions_column(engine)
            success = success and permissions_success
            
            # Update emergency_admin with comprehensive permissions
            emergency_admin_success = update_emergency_admin_permissions(engine)
            success = success and emergency_admin_success
        
        if success:
            logger.info("All auto-migrations completed successfully")
        else:
            logger.warning("Some auto-migrations failed - check logs for details")
        
        return success
        
    except Exception as e:
        logger.error(f"Error running auto-migrations: {e}", exc_info=True)
        # Don't crash the app if migrations fail - just log the error
        return False
